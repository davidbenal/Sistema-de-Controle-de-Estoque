import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { OperacoesService } from '../services/operacoes';

export async function operacoesRoutes(fastify: FastifyInstance) {
  const operacoesService = new OperacoesService(fastify);

  // ==================== PEDIDOS (PURCHASES) ====================

  /**
   * GET /api/operacoes/purchases
   * Lista todos os pedidos com filtros opcionais
   */
  fastify.get('/purchases', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { status, supplierId, dateFrom, dateTo } = request.query as {
        status?: string;
        supplierId?: string;
        dateFrom?: string;
        dateTo?: string;
      };

      const result = await operacoesService.listPurchases({
        status,
        supplierId,
        dateFrom,
        dateTo,
      });

      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro na rota GET /operacoes/purchases:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /api/operacoes/purchases/:id
   * Busca pedido específico por ID
   */
  fastify.get('/purchases/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await operacoesService.getPurchase(id);

      if (!result.success) {
        return reply.code(404).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro na rota GET /operacoes/purchases/:id:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /api/operacoes/purchases
   * Cria novo pedido e automaticamente cria o recebimento vinculado
   */
  fastify.post('/purchases', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = request.body as any;
      const result = await operacoesService.createPurchase(data);

      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(201).send(result);
    } catch (error: any) {
      fastify.log.error('Erro ao criar pedido:', error);
      return reply.code(400).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * PUT /api/operacoes/purchases/:id
   * Atualiza pedido existente
   */
  fastify.put('/purchases/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as any;
      const result = await operacoesService.updatePurchase(id, data);

      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro ao atualizar pedido:', error);
      const statusCode = error.message?.includes('não encontrado') ? 404 : 400;
      return reply.code(statusCode).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * DELETE /api/operacoes/purchases/:id
   * Cancela pedido (soft delete com motivo)
   */
  fastify.delete('/purchases/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const { reason } = request.body as { reason?: string };

      const result = await operacoesService.cancelPurchase(id, reason || 'Cancelado sem motivo informado');

      if (!result.success) {
        return reply.code(404).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro ao cancelar pedido:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 400;
      return reply.code(statusCode).send({
        success: false,
        error: error.message,
      });
    }
  });

  // ==================== RECEBIMENTOS (RECEIVINGS) ====================

  /**
   * GET /api/operacoes/receivings
   * Lista todos os recebimentos com filtros opcionais
   */
  fastify.get('/receivings', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { status, supplierId, dateFrom, dateTo } = request.query as {
        status?: string;
        supplierId?: string;
        dateFrom?: string;
        dateTo?: string;
      };

      const result = await operacoesService.listReceivings({
        status,
        supplierId,
        dateFrom,
        dateTo,
      });

      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro na rota GET /operacoes/receivings:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /api/operacoes/receivings/:id
   * Busca recebimento específico por ID
   */
  fastify.get('/receivings/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await operacoesService.getReceiving(id);

      if (!result.success) {
        return reply.code(404).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro na rota GET /operacoes/receivings/:id:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /api/operacoes/receivings/:id/upload-photo
   * Upload de foto da nota fiscal/ordem de pedido (multipart)
   */
  fastify.post('/receivings/:id/upload-photo', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };

      // Receber arquivo multipart
      const data = await request.file();

      if (!data) {
        return reply.code(400).send({
          success: false,
          error: 'Nenhum arquivo enviado',
          message: 'Por favor, envie uma foto da nota fiscal (JPG, PNG ou WebP)',
        });
      }

      // Validar tipo de arquivo
      const allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/webp',
      ];

      if (!allowedMimeTypes.includes(data.mimetype)) {
        return reply.code(400).send({
          success: false,
          error: 'Tipo de arquivo não suportado',
          message: 'Por favor, envie uma imagem JPG, PNG ou WebP',
          receivedType: data.mimetype,
        });
      }

      // Validar tamanho (max 10MB)
      const fileBuffer = await data.toBuffer();
      const maxSize = 10 * 1024 * 1024; // 10MB

      if (fileBuffer.length > maxSize) {
        return reply.code(400).send({
          success: false,
          error: 'Arquivo muito grande',
          message: 'O tamanho máximo permitido é 10MB',
          receivedSize: `${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB`,
        });
      }

      fastify.log.info(`Upload de foto para recebimento ${id}: ${data.filename} (${fileBuffer.length} bytes)`);

      // Fazer upload para Firebase Storage
      const photoUrl = await operacoesService.uploadInvoicePhoto(id, fileBuffer, data.mimetype);

      return reply.code(200).send({
        success: true,
        photoUrl,
        message: 'Foto da nota fiscal enviada com sucesso',
      });

    } catch (error: any) {
      fastify.log.error('Erro ao fazer upload de foto:', error);
      return reply.code(500).send({
        success: false,
        error: 'Erro ao processar upload',
        message: error.message,
      });
    }
  });

  /**
   * PUT /api/operacoes/receivings/:id/checklist/:itemIndex
   * Atualiza item específico do checklist durante conferência
   */
  fastify.put('/receivings/:id/checklist/:itemIndex', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id, itemIndex } = request.params as { id: string; itemIndex: string };
      const data = request.body as {
        receivedQty: number;
        isReceived: boolean;
        missingReason?: string;
        notes?: string;
        expiryDate?: string;
        batchNumber?: string;
        storageCenter: string;
        userId: string;
      };

      const index = parseInt(itemIndex, 10);
      if (isNaN(index) || index < 0) {
        return reply.code(400).send({
          success: false,
          error: 'Índice do item inválido',
        });
      }

      const result = await operacoesService.updateChecklistItem(id, index, data);

      if (!result.success) {
        return reply.code(404).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro ao atualizar item do checklist:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 400;
      return reply.code(statusCode).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /api/operacoes/receivings/:id/complete
   * Completa recebimento após conferência (atualiza estoque)
   */
  fastify.post('/receivings/:id/complete', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const { userId, generalNotes } = request.body as {
        userId: string;
        generalNotes?: string;
      };

      if (!userId) {
        return reply.code(400).send({
          success: false,
          error: 'ID do usuário é obrigatório',
        });
      }

      const result = await operacoesService.completeReceiving(id, userId, generalNotes);

      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro ao completar recebimento:', error);
      return reply.code(400).send({
        success: false,
        error: error.message,
      });
    }
  });

  // ==================== INVENTÁRIO (INVENTORY COUNTS) ====================

  /**
   * GET /api/operacoes/inventory-counts
   * Lista todas as contagens de inventário
   */
  fastify.get('/inventory-counts', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { status, storageCenter, dateFrom, dateTo } = request.query as {
        status?: string;
        storageCenter?: string;
        dateFrom?: string;
        dateTo?: string;
      };

      const result = await operacoesService.listInventoryCounts({
        status,
        storageCenter,
        dateFrom,
        dateTo,
      });

      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro na rota GET /operacoes/inventory-counts:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /api/operacoes/inventory-counts/:id
   * Busca contagem de inventário específica por ID
   */
  fastify.get('/inventory-counts/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await operacoesService.getInventoryCount(id);

      if (!result.success) {
        return reply.code(404).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro na rota GET /operacoes/inventory-counts/:id:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /api/operacoes/inventory-counts
   * Inicia nova contagem de inventário
   */
  fastify.post('/inventory-counts', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const data = request.body as any;
      const result = await operacoesService.startInventoryCount(data);

      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(201).send(result);
    } catch (error: any) {
      fastify.log.error('Erro ao iniciar contagem de inventário:', error);
      return reply.code(400).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * PUT /api/operacoes/inventory-counts/:id
   * Atualiza contagem de inventário em andamento
   */
  fastify.put('/inventory-counts/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as any;
      const result = await operacoesService.updateInventoryCount(id, data);

      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro ao atualizar contagem de inventário:', error);
      const statusCode = error.message?.includes('não encontrada') ? 404 : 400;
      return reply.code(statusCode).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /api/operacoes/inventory-counts/:id/complete
   * Completa contagem de inventário (ajusta estoque)
   */
  fastify.post('/inventory-counts/:id/complete', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const { approvedBy } = request.body as { approvedBy?: string };

      const result = await operacoesService.completeInventoryCount(id, approvedBy || 'anonymous');

      if (!result.success) {
        return reply.code(400).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro ao completar contagem de inventário:', error);
      return reply.code(400).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * DELETE /api/operacoes/inventory-counts/:id
   * Cancela contagem de inventário
   */
  fastify.delete('/inventory-counts/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { id } = request.params as { id: string };
      const { reason } = request.body as { reason?: string };

      const result = await operacoesService.cancelInventoryCount(id, reason || 'Cancelado sem motivo informado');

      if (!result.success) {
        return reply.code(404).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro ao cancelar contagem de inventário:', error);
      const statusCode = error.message.includes('não encontrada') ? 404 : 400;
      return reply.code(statusCode).send({
        success: false,
        error: error.message,
      });
    }
  });

  // ==================== MOVIMENTAÇÕES DE ESTOQUE (STOCK MOVEMENTS) ====================

  /**
   * GET /api/operacoes/stock-movements
   * Lista movimentações de estoque (audit trail)
   */
  fastify.get('/stock-movements', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const { ingredientId, movementType, dateFrom, dateTo, limit } = request.query as {
        ingredientId?: string;
        movementType?: string;
        dateFrom?: string;
        dateTo?: string;
        limit?: string;
      };

      const result = await operacoesService.listStockMovements({
        ingredientId,
        movementType,
        dateFrom,
        dateTo,
        limit: limit ? parseInt(limit, 10) : undefined,
      });

      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro na rota GET /operacoes/stock-movements:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  });
}
