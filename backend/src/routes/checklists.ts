import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ChecklistsService } from '../services/checklists';
import { resolveUser } from '../utils/resolveUser';
import { logActivity } from '../utils/activityLogger';

export async function checklistsRoutes(fastify: FastifyInstance) {
  const service = new ChecklistsService(fastify);

  fastify.get('/tasks', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { assignedTo, completed, dueDate } = request.query as any;
      const result = await service.listTasks({ assignedTo, completed, dueDate });
      return reply.code(200).send(result);
    } catch (error: any) {
      return reply.code(500).send({ success: false, error: error.message });
    }
  });

  fastify.post('/tasks', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = request.body as any;
      // Override createdBy from auth token
      const authUser = await resolveUser(fastify.db, request.authUser!.uid);
      if (authUser) {
        data.createdBy = authUser.id;
      }
      const result = await service.createTask(data);
      return reply.code(201).send(result);
    } catch (error: any) {
      return reply.code(400).send({ success: false, error: error.message });
    }
  });

  fastify.put('/tasks/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as any;
      let authUser: any = null;
      // Add completedBy from auth token when completing
      if (data.completed === true) {
        authUser = await resolveUser(fastify.db, request.authUser!.uid);
        if (authUser) {
          data.completedBy = authUser.id;
        }
      }
      const result = await service.updateTask(id, data);

      // Fire-and-forget activity log when task is completed
      if (data.completed === true) {
        logActivity(fastify.db, {
          action: 'task_completed',
          actorId: authUser?.id || 'unknown',
          actorName: authUser?.name || 'Unknown',
          entityType: 'task',
          entityId: id,
          summary: `${authUser?.name || 'Usuario'} completou tarefa`,
        });
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      const code = error.message?.includes('não encontrada') ? 404 : 400;
      return reply.code(code).send({ success: false, error: error.message });
    }
  });

  fastify.delete('/tasks/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await service.deleteTask(id);
      return reply.code(200).send(result);
    } catch (error: any) {
      const code = error.message?.includes('não encontrada') ? 404 : 400;
      return reply.code(code).send({ success: false, error: error.message });
    }
  });

  fastify.post('/tasks/apply-template', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { templateId, userId } = request.body as any;
      if (!templateId || !userId) {
        return reply.code(400).send({ success: false, error: 'templateId e userId são obrigatórios' });
      }
      // Get createdBy from auth token
      const authUser = await resolveUser(fastify.db, request.authUser!.uid);
      const createdBy = authUser?.id || userId;
      const result = await service.applyTemplate(templateId, userId, createdBy);
      return reply.code(201).send(result);
    } catch (error: any) {
      return reply.code(400).send({ success: false, error: error.message });
    }
  });

  fastify.get('/templates', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await service.listTemplates();
      return reply.code(200).send(result);
    } catch (error: any) {
      return reply.code(500).send({ success: false, error: error.message });
    }
  });

  fastify.post('/templates', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = request.body as any;
      if (!data.name || !data.tasks?.length) {
        return reply.code(400).send({ success: false, error: 'name e tasks são obrigatórios' });
      }
      const result = await service.createTemplate(data);
      return reply.code(201).send(result);
    } catch (error: any) {
      return reply.code(400).send({ success: false, error: error.message });
    }
  });
}
