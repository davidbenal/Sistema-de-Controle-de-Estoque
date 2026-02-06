import { FastifyInstance } from 'fastify';
import { CadastrosService } from '../services/cadastros';

export async function cadastrosRoutes(fastify: FastifyInstance) {
  const cadastrosService = new CadastrosService(fastify);

  /**
   * GET /api/cadastros/ingredientes
   * Lista todos os ingredientes com filtros opcionais
   */
  fastify.get('/ingredientes', async (request, reply) => {
    try {
      const { category, search } = request.query as {
        category?: string;
        search?: string;
      };

      const result = await cadastrosService.listIngredientes({ category, search });
      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro na rota GET /cadastros/ingredientes:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /api/cadastros/ingredientes/:id
   * Busca ingrediente específico por ID
   */
  fastify.get('/ingredientes/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await cadastrosService.getIngrediente(id);

      if (!result.success) {
        return reply.code(404).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro na rota GET /cadastros/ingredientes/:id:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /api/cadastros/fornecedores
   * Lista todos os fornecedores
   */
  fastify.get('/fornecedores', async (request, reply) => {
    try {
      const result = await cadastrosService.listFornecedores();
      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro na rota GET /cadastros/fornecedores:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /api/cadastros/fornecedores/:id
   * Busca fornecedor específico por ID
   */
  fastify.get('/fornecedores/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await cadastrosService.getFornecedor(id);

      if (!result.success) {
        return reply.code(404).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro na rota GET /cadastros/fornecedores/:id:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /api/cadastros/fornecedores
   * Cria novo fornecedor
   */
  fastify.post('/fornecedores', async (request, reply) => {
    try {
      const data = request.body as any;
      const result = await cadastrosService.createFornecedor(data);
      return reply.code(201).send(result);
    } catch (error: any) {
      fastify.log.error('Erro ao criar fornecedor:', error);
      return reply.code(400).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * PUT /api/cadastros/fornecedores/:id
   * Atualiza fornecedor existente
   */
  fastify.put('/fornecedores/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as any;
      const result = await cadastrosService.updateFornecedor(id, data);
      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro ao atualizar fornecedor:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 400;
      return reply.code(statusCode).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * DELETE /api/cadastros/fornecedores/:id
   * Deleta fornecedor (com verificação de relacionamentos)
   */
  fastify.delete('/fornecedores/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await cadastrosService.deleteFornecedor(id);
      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro ao deletar fornecedor:', error);
      const statusCode = error.message.includes('ingredientes') ? 409 : 404;
      return reply.code(statusCode).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /api/cadastros/fichas
   * Lista todas as fichas técnicas (receitas)
   */
  fastify.get('/fichas', async (request, reply) => {
    try {
      const { category, search } = request.query as {
        category?: string;
        search?: string;
      };

      const result = await cadastrosService.listFichas({ category, search });
      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro na rota GET /cadastros/fichas:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /api/cadastros/fichas/:id
   * Busca ficha técnica específica por ID
   */
  fastify.get('/fichas/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await cadastrosService.getFicha(id);

      if (!result.success) {
        return reply.code(404).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro na rota GET /cadastros/fichas/:id:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /api/cadastros/equipe
   * Lista todos os membros da equipe
   */
  fastify.get('/equipe', async (request, reply) => {
    try {
      const result = await cadastrosService.listEquipe();
      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro na rota GET /cadastros/equipe:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * GET /api/cadastros/equipe/:id
   * Busca membro da equipe específico por ID
   */
  fastify.get('/equipe/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await cadastrosService.getMembroEquipe(id);

      if (!result.success) {
        return reply.code(404).send(result);
      }

      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro na rota GET /cadastros/equipe/:id:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /api/cadastros/equipe
   * Cria novo membro da equipe
   */
  fastify.post('/equipe', async (request, reply) => {
    try {
      const data = request.body as any;
      const result = await cadastrosService.createMembroEquipe(data);
      return reply.code(201).send(result);
    } catch (error: any) {
      fastify.log.error('Erro ao criar membro da equipe:', error);
      return reply.code(400).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * PUT /api/cadastros/equipe/:id
   * Atualiza membro da equipe existente
   */
  fastify.put('/equipe/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as any;
      const result = await cadastrosService.updateMembroEquipe(id, data);
      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro ao atualizar membro da equipe:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 400;
      return reply.code(statusCode).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * DELETE /api/cadastros/equipe/:id
   * Remove membro da equipe (soft delete)
   */
  fastify.delete('/equipe/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await cadastrosService.deleteMembroEquipe(id);
      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro ao deletar membro da equipe:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 400;
      return reply.code(statusCode).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /api/cadastros/ingredientes
   * Cria novo ingrediente
   */
  fastify.post('/ingredientes', async (request, reply) => {
    try {
      const data = request.body as any;
      const result = await cadastrosService.createIngredient(data);
      return reply.code(201).send(result);
    } catch (error: any) {
      fastify.log.error('Erro ao criar ingrediente:', error);
      return reply.code(400).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * PUT /api/cadastros/ingredientes/:id
   * Atualiza ingrediente existente
   */
  fastify.put('/ingredientes/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as any;
      const result = await cadastrosService.updateIngredient(id, data);
      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro ao atualizar ingrediente:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 400;
      return reply.code(statusCode).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * DELETE /api/cadastros/ingredientes/:id
   * Remove ingrediente (soft delete)
   */
  fastify.delete('/ingredientes/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await cadastrosService.deleteIngredient(id);
      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro ao deletar ingrediente:', error);
      const statusCode = error.message.includes('não encontrado') ? 404 : 400;
      return reply.code(statusCode).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /api/cadastros/fichas
   * Cria receita mínima (usado em mapeamentos)
   */
  fastify.post('/fichas', async (request, reply) => {
    try {
      const { name, createdFrom } = request.body as { name: string; createdFrom?: string };

      if (!name || name.trim() === '') {
        return reply.code(400).send({
          success: false,
          error: 'Nome da receita é obrigatório'
        });
      }

      const result = await cadastrosService.createRecipe({ name, createdFrom });
      return reply.code(201).send(result);
    } catch (error: any) {
      fastify.log.error('Erro na rota POST /cadastros/fichas:', error);
      return reply.code(500).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * POST /api/cadastros/fichas-tecnicas
   * Cria ficha técnica completa
   */
  fastify.post('/fichas-tecnicas', async (request, reply) => {
    try {
      const data = request.body as any;
      const result = await cadastrosService.createFichaTecnica(data);
      return reply.code(201).send(result);
    } catch (error: any) {
      fastify.log.error('Erro ao criar ficha técnica:', error);
      return reply.code(400).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * PUT /api/cadastros/fichas-tecnicas/:id
   * Atualiza ficha técnica existente
   */
  fastify.put('/fichas-tecnicas/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const data = request.body as any;
      const result = await cadastrosService.updateFichaTecnica(id, data);
      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro ao atualizar ficha técnica:', error);
      const statusCode = error.message.includes('não encontrada') ? 404 : 400;
      return reply.code(statusCode).send({
        success: false,
        error: error.message,
      });
    }
  });

  /**
   * DELETE /api/cadastros/fichas-tecnicas/:id
   * Remove ficha técnica (soft delete)
   */
  fastify.delete('/fichas-tecnicas/:id', async (request, reply) => {
    try {
      const { id } = request.params as { id: string };
      const result = await cadastrosService.deleteFichaTecnica(id);
      return reply.code(200).send(result);
    } catch (error: any) {
      fastify.log.error('Erro ao deletar ficha técnica:', error);
      const statusCode = error.message.includes('não encontrada') ? 404 : 400;
      return reply.code(statusCode).send({
        success: false,
        error: error.message,
      });
    }
  });
}
