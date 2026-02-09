import { FastifyPluginAsync } from 'fastify';
import { EstoqueService } from '../services/estoque';
import { resolveUser } from '../utils/resolveUser';
import { logActivity } from '../utils/activityLogger';

export const estoqueRoutes: FastifyPluginAsync = async (fastify) => {
  const estoqueService = new EstoqueService(fastify.db);

  // GET /api/estoque/current - Lista completa de estoque
  fastify.get('/current', async (request, reply) => {
    try {
      const { storage_center, category, status, supplier_id } = request.query as {
        storage_center?: string;
        category?: string;
        status?: string;
        supplier_id?: string;
      };

      const result = await estoqueService.getCurrentStock({
        storageCenter: storage_center,
        category,
        status,
        supplierId: supplier_id,
      });

      return { success: true, data: result };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // GET /api/estoque/ingredients/:id/movements - Histórico de movimentos
  fastify.get('/ingredients/:id/movements', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { limit = 50, offset = 0 } = request.query as { limit?: number; offset?: number };

      const movements = await estoqueService.getIngredientMovements(id, {
        limit: Number(limit),
        offset: Number(offset)
      });

      return { success: true, data: movements };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // POST /api/estoque/ingredients/:id/adjust - Ajuste manual
  fastify.post('/ingredients/:id/adjust', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { new_quantity, reason, notes } = request.body as {
        new_quantity: number;
        reason: string;
        notes?: string;
      };

      // Get user from auth token
      const authUser = await resolveUser(fastify.db, request.authUser!.uid);
      const userId = authUser?.id || 'anonymous';

      const result = await estoqueService.adjustStock({
        ingredientId: id,
        newQuantity: new_quantity,
        reason,
        notes,
        userId,
      });

      // Fire-and-forget activity log
      logActivity(fastify.db, {
        action: 'stock_adjusted',
        actorId: authUser?.id || 'unknown',
        actorName: authUser?.name || 'Unknown',
        entityType: 'ingredient',
        entityId: id,
        summary: `${authUser?.name} ajustou estoque de ingrediente`,
        details: { newQuantity: new_quantity, reason },
      });

      return { success: true, data: result };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // POST /api/estoque/draft-orders - Criar ou atualizar rascunho
  fastify.post('/draft-orders', async (request, reply) => {
    try {
      const {
        supplier_id,
        supplier_name,
        ingredient_id,
        ingredient_name,
        quantity,
        unit,
        unit_price,
        notes,
      } = request.body as {
        supplier_id: string;
        supplier_name: string;
        ingredient_id: string;
        ingredient_name: string;
        quantity: number;
        unit: string;
        unit_price?: number;
        notes?: string;
      };

      // Get user from auth token
      const authUser = await resolveUser(fastify.db, request.authUser!.uid);
      const userId = authUser?.id || 'anonymous';

      // Verificar se já existe rascunho para este fornecedor
      const existingDraft = await estoqueService.findDraftBySupplier(supplier_id, userId);

      if (existingDraft) {
        // Adicionar item ao rascunho existente
        await estoqueService.addItemToDraft(existingDraft.id, {
          ingredient_id,
          ingredient_name,
          quantity,
          unit,
          unit_price,
          notes,
        });
        return { success: true, data: { draft_id: existingDraft.id, action: 'updated' } };
      } else {
        // Criar novo rascunho
        const newDraft = await estoqueService.createDraft({
          supplier_id,
          supplier_name,
          items: [{
            ingredient_id,
            ingredient_name,
            quantity,
            unit,
            unit_price,
            notes,
          }],
          created_by: userId,
        });
        return { success: true, data: { draft_id: newDraft.id, action: 'created' } };
      }
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // GET /api/estoque/draft-orders - Listar rascunhos
  fastify.get('/draft-orders', async (request, reply) => {
    try {
      // Get user from auth token
      const authUser = await resolveUser(fastify.db, request.authUser!.uid);
      const userId = authUser?.id || 'anonymous';

      const drafts = await estoqueService.getUserDrafts(userId);

      return { success: true, data: drafts };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // PUT /api/estoque/draft-orders/:id - Atualizar rascunho
  fastify.put('/draft-orders/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { items, notes } = request.body as { items: any[]; notes?: string };

      await estoqueService.updateDraft(id, { items, notes });

      return { success: true };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // DELETE /api/estoque/draft-orders/:id - Deletar rascunho
  fastify.delete('/draft-orders/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };

      await estoqueService.deleteDraft(id);

      return { success: true };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: error.message });
    }
  });

  // POST /api/estoque/draft-orders/:id/finalize - Finalizar rascunho
  fastify.post('/draft-orders/:id/finalize', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const { order_date, expected_delivery, notes, items } = request.body as {
        order_date: string;
        expected_delivery: string;
        notes?: string;
        items?: any[];
      };

      // Get user from auth token
      const authUser = await resolveUser(fastify.db, request.authUser!.uid);
      const userId = authUser?.id || 'anonymous';

      const result = await estoqueService.finalizeDraft({
        draftId: id,
        orderDate: order_date,
        expectedDelivery: expected_delivery,
        notes,
        userId,
        items,
      });

      // Fire-and-forget activity log
      logActivity(fastify.db, {
        action: 'draft_finalized',
        actorId: authUser?.id || 'unknown',
        actorName: authUser?.name || 'Unknown',
        entityType: 'draft_order',
        entityId: id,
        summary: `${authUser?.name} finalizou rascunho de pedido`,
        details: { purchaseId: result.purchaseId, receivingId: result.receivingId },
      });

      return {
        success: true,
        data: {
          purchase_id: result.purchaseId,
          receiving_id: result.receivingId,
          supplier_message: result.supplierMessage,
        },
      };
    } catch (error: any) {
      fastify.log.error(error);
      return reply.status(500).send({ success: false, error: error.message });
    }
  });
};

export default estoqueRoutes;
