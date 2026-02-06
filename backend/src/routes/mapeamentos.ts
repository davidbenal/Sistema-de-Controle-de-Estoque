import { FastifyInstance } from 'fastify';
import { MapeamentosService } from '../services/mapeamentos';

export async function mapeamentosRoutes(fastify: FastifyInstance) {
  const mapeamentosService = new MapeamentosService(fastify);

  /**
   * GET /api/mapeamentos
   * Lista mapeamentos SKU → Receita com filtros opcionais
   * Query params: needsReview (boolean), confidence (string), sku (string)
   */
  fastify.get('/', async (request, reply) => {
    try {
      const { needsReview, confidence, sku } = request.query as {
        needsReview?: string;
        confidence?: string;
        sku?: string;
      };

      const filters = {
        needsReview: needsReview === 'true' ? true : needsReview === 'false' ? false : undefined,
        confidence,
        sku,
      };

      const result = await mapeamentosService.listMapeamentos(filters);
      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro na rota GET /mapeamentos:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /api/mapeamentos/stats
   * Retorna estatísticas dos mapeamentos
   */
  fastify.get('/stats', async (request, reply) => {
    try {
      const result = await mapeamentosService.getMapeamentosStats();
      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro na rota GET /mapeamentos/stats:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /api/mapeamentos/sku/:sku
   * Busca mapeamento por SKU específico
   */
  fastify.get('/sku/:sku', async (request, reply) => {
    try {
      const { sku } = request.params as { sku: string };
      const result = await mapeamentosService.getMapeamentoBySku(sku);

      if (!result.success) {
        return reply.code(404).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro na rota GET /mapeamentos/sku/:sku:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * PUT /api/mapeamentos/:sku
   * Atualiza mapeamento SKU → Receita
   */
  fastify.put('/:sku', async (request, reply) => {
    try {
      const { sku } = request.params as { sku: string };
      const { recipeId, confidence, needsReview } = request.body as {
        recipeId: string | null;
        confidence: string;
        needsReview: boolean;
      };

      const result = await mapeamentosService.updateMapeamento(sku, {
        recipeId,
        confidence,
        needsReview
      });

      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro na rota PUT /mapeamentos/:sku:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 500;
      return reply.code(statusCode).send({
        success: false,
        error: error.message,
      });
    }
  });
}
