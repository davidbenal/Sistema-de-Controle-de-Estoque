import { FastifyRequest, FastifyReply } from 'fastify';

// Routes that don't require authentication
const PUBLIC_ROUTES = [
  '/',
  '/health',
  '/api/auth/setup-owner',
];

export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  // Skip auth for public routes
  if (PUBLIC_ROUTES.some(route => request.url === route || request.url.startsWith(route + '?'))) {
    return;
  }

  const authHeader = request.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return reply.code(401).send({ success: false, error: 'Token de autenticacao ausente' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decoded = await request.server.auth.verifyIdToken(token);
    request.authUser = {
      uid: decoded.uid,
      email: decoded.email || '',
    };
  } catch (error) {
    return reply.code(401).send({ success: false, error: 'Token invalido ou expirado' });
  }
}
