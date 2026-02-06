import { FastifyInstance } from 'fastify';
import { AlertasService } from '../services/alertas';

export async function alertasRoutes(fastify: FastifyInstance) {
  const alertasService = new AlertasService(fastify);

  /**
   * GET /api/alertas
   * Lista alertas com filtros opcionais
   * Query params: status, priority, type, limit
   */
  fastify.get('/', async (request, reply) => {
    try {
      const { status, priority, type, limit } = request.query as {
        status?: 'pending' | 'resolved';
        priority?: 'high' | 'medium' | 'low';
        type?: string;
        limit?: string;
      };

      const result = await alertasService.listAlertas({
        status,
        priority,
        type,
        limit: limit ? parseInt(limit, 10) : undefined,
      });

      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro na rota GET /alertas:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /api/alertas/stats
   * Retorna estatísticas dos alertas
   */
  fastify.get('/stats', async (request, reply) => {
    try {
      const result = await alertasService.getAlertaStats();
      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro na rota GET /alertas/stats:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /api/alertas/:id
   * Busca um alerta específico
   */
  fastify.get('/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await alertasService.getAlerta(id);

      if (!result.success) {
        return reply.code(404).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro na rota GET /alertas/:id:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /api/alertas
   * Cria novo alerta
   */
  fastify.post('/', async (request, reply) => {
    try {
      const { type, priority, title, message, relatedId } = request.body as {
        type: string;
        priority: string;
        title: string;
        message: string;
        relatedId?: string;
      };

      if (!type || !priority || !title || !message) {
        return reply.code(400).send({
          success: false,
          error: 'Campos obrigatórios: type, priority, title, message'
        });
      }

      const result = await alertasService.createAlert({
        type,
        priority,
        title,
        message,
        relatedId
      });

      return reply.code(201).send(result);
    } catch (error: any) {
      fastify.log.error('Erro na rota POST /alertas:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  });
}
