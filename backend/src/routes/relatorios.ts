import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { RelatoriosService } from '../services/relatorios';

export async function relatoriosRoutes(fastify: FastifyInstance) {
  const service = new RelatoriosService(fastify);

  fastify.get('/vendas-por-produto', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { days } = request.query as { days?: string };
      const result = await service.getVendasPorProduto(days ? parseInt(days, 10) : 7);
      return reply.code(200).send(result);
    } catch (error: any) {
      return reply.code(500).send({ success: false, error: error.message });
    }
  });

  fastify.get('/estoque-valor', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const result = await service.getEstoqueValor();
      return reply.code(200).send(result);
    } catch (error: any) {
      return reply.code(500).send({ success: false, error: error.message });
    }
  });
}
