import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { FieldValue } from 'firebase-admin/firestore';
import { resolveUser } from '../utils/resolveUser';
import crypto from 'crypto';

export async function authRoutes(fastify: FastifyInstance) {

  // POST /api/auth/setup-owner - Bootstrap: create the first admin/owner account
  // No auth required. Only works if zero active admins exist.
  fastify.post('/setup-owner', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { email, password, name } = request.body as {
        email: string;
        password: string;
        name: string;
      };

      if (!email || !password || !name) {
        return reply.code(400).send({ success: false, error: 'email, password e name sao obrigatorios' });
      }

      if (password.length < 6) {
        return reply.code(400).send({ success: false, error: 'Senha deve ter pelo menos 6 caracteres' });
      }

      // Check if any active admin already exists
      const adminsSnap = await fastify.db.collection('users')
        .where('role', '==', 'administrador')
        .where('status', '==', 'active')
        .limit(1)
        .get();

      if (!adminsSnap.empty) {
        return reply.code(409).send({
          success: false,
          error: 'Ja existe um administrador cadastrado. Use o fluxo de convite para adicionar novos usuarios.',
        });
      }

      // Create Firebase Auth user
      const authUser = await fastify.auth.createUser({
        email,
        password,
        displayName: name,
      });

      // Create Firestore user doc
      const userData = {
        name,
        email,
        role: 'administrador',
        sector: 'admin',
        position: 'Proprietario',
        shift: 'integral',
        status: 'active',
        auth_uid: authUser.uid,
        is_owner: true,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      };

      const userRef = await fastify.db.collection('users').add(userData);

      return reply.code(201).send({
        success: true,
        user: {
          id: userRef.id,
          ...userData,
          auth_uid: authUser.uid,
        },
        message: 'Conta de proprietario criada com sucesso. Faca login com seu email e senha.',
      });
    } catch (error: any) {
      fastify.log.error('Error in setup-owner:', error);

      if (error.code === 'auth/email-already-exists') {
        return reply.code(409).send({ success: false, error: 'Este email ja possui uma conta Firebase Auth.' });
      }
      if (error.code === 'auth/invalid-email') {
        return reply.code(400).send({ success: false, error: 'Email invalido.' });
      }

      return reply.code(500).send({ success: false, error: error.message || 'Erro ao criar conta' });
    }
  });

  // POST /api/auth/invite - Admin invites a new team member
  // Requires auth. Only admins can invite.
  fastify.post('/invite', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.authUser) {
        return reply.code(401).send({ success: false, error: 'Nao autenticado' });
      }

      // Resolve requesting user and check admin role
      const requestingUser = await resolveUser(fastify.db, request.authUser.uid);
      if (!requestingUser || requestingUser.role !== 'administrador') {
        return reply.code(403).send({ success: false, error: 'Apenas administradores podem convidar membros' });
      }

      const { email, name, role, sector, position, shift } = request.body as {
        email: string;
        name: string;
        role: string;
        sector?: string;
        position?: string;
        shift?: string;
      };

      if (!email || !name || !role) {
        return reply.code(400).send({ success: false, error: 'email, name e role sao obrigatorios' });
      }

      // Check email uniqueness in Firestore
      const existingSnap = await fastify.db.collection('users')
        .where('email', '==', email)
        .where('status', '==', 'active')
        .limit(1)
        .get();

      if (!existingSnap.empty) {
        return reply.code(409).send({ success: false, error: 'Ja existe um membro com este email' });
      }

      // Create Firebase Auth user with random temp password
      const tempPassword = crypto.randomBytes(16).toString('hex');
      const authUser = await fastify.auth.createUser({
        email,
        password: tempPassword,
        displayName: name,
      });

      // Generate password reset link (acts as invite)
      const inviteLink = await fastify.auth.generatePasswordResetLink(email);

      // Create Firestore user doc
      const userData = {
        name,
        email,
        role,
        sector: sector || '',
        position: position || '',
        shift: shift || '',
        status: 'active',
        auth_uid: authUser.uid,
        is_owner: false,
        invited_by: requestingUser.id,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      };

      const userRef = await fastify.db.collection('users').add(userData);

      return reply.code(201).send({
        success: true,
        user: {
          id: userRef.id,
          ...userData,
        },
        inviteLink,
        message: `Convite criado para ${name}. Compartilhe o link para que defina sua senha.`,
      });
    } catch (error: any) {
      fastify.log.error('Error in invite:', error);

      if (error.code === 'auth/email-already-exists') {
        return reply.code(409).send({ success: false, error: 'Este email ja possui uma conta Firebase Auth.' });
      }
      if (error.code === 'auth/invalid-email') {
        return reply.code(400).send({ success: false, error: 'Email invalido.' });
      }

      return reply.code(500).send({ success: false, error: error.message || 'Erro ao criar convite' });
    }
  });

  // POST /api/auth/resend-invite - Resend invite link for an existing user
  fastify.post('/resend-invite', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.authUser) {
        return reply.code(401).send({ success: false, error: 'Nao autenticado' });
      }

      const requestingUser = await resolveUser(fastify.db, request.authUser.uid);
      if (!requestingUser || requestingUser.role !== 'administrador') {
        return reply.code(403).send({ success: false, error: 'Apenas administradores podem reenviar convites' });
      }

      const { email } = request.body as { email: string };
      if (!email) {
        return reply.code(400).send({ success: false, error: 'email e obrigatorio' });
      }

      const inviteLink = await fastify.auth.generatePasswordResetLink(email);

      return reply.code(200).send({
        success: true,
        inviteLink,
        message: 'Link de convite regenerado.',
      });
    } catch (error: any) {
      fastify.log.error('Error in resend-invite:', error);
      return reply.code(500).send({ success: false, error: error.message || 'Erro ao reenviar convite' });
    }
  });

  // GET /api/auth/me - Returns the current user's Firestore profile
  fastify.get('/me', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      if (!request.authUser) {
        return reply.code(401).send({ success: false, error: 'Nao autenticado' });
      }

      const user = await resolveUser(fastify.db, request.authUser.uid, request.authUser.email);
      if (!user) {
        return reply.code(404).send({
          success: false,
          error: 'Perfil nao encontrado. Sua conta pode nao ter sido configurada corretamente.',
        });
      }

      return reply.code(200).send({
        success: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          sector: user.sector,
        },
      });
    } catch (error: any) {
      fastify.log.error('Error in /me:', error);
      return reply.code(500).send({ success: false, error: error.message || 'Erro ao buscar perfil' });
    }
  });
}
