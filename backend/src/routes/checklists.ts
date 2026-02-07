import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ChecklistsService } from '../services/checklists';

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
      const result = await service.updateTask(id, data);
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
      const { templateId, userId, createdBy } = request.body as any;
      if (!templateId || !userId) {
        return reply.code(400).send({ success: false, error: 'templateId e userId são obrigatórios' });
      }
      const result = await service.applyTemplate(templateId, userId, createdBy || userId);
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
