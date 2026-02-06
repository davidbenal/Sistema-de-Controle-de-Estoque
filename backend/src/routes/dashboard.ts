import { FastifyInstance } from 'fastify';
import { DashboardService } from '../services/dashboard';

export async function dashboardRoutes(fastify: FastifyInstance) {
  const dashboardService = new DashboardService(fastify);

  /**
   * GET /api/dashboard/resumo
   * Retorna estatísticas agregadas do dashboard
   */
  fastify.get('/resumo', async (request, reply) => {
    try {
      const result = await dashboardService.getResumo();
      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro na rota GET /dashboard/resumo:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /api/dashboard/ingredientes-abaixo-minimo
   * Retorna lista de ingredientes com estoque abaixo do mínimo
   */
  fastify.get('/ingredientes-abaixo-minimo', async (request, reply) => {
    try {
      const result = await dashboardService.getIngredientesAbaixoMinimo();
      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro na rota GET /dashboard/ingredientes-abaixo-minimo:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  });
}
