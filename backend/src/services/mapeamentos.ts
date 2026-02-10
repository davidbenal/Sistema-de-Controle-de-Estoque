import { FastifyInstance } from 'fastify';

interface MapeamentoFilters {
  needsReview?: boolean;
  confidence?: string;
  sku?: string;
}

export class MapeamentosService {
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  /**
   * Lista mapeamentos SKU → Receita com filtros opcionais
   */
  async listMapeamentos(filters: MapeamentoFilters = {}) {
    try {
      let query = this.fastify.db.collection('product_mappings').orderBy('sku', 'asc');

      // Aplicar filtro needsReview
      if (filters.needsReview !== undefined) {
        query = query.where('needs_review', '==', filters.needsReview);
      }

      // Buscar dados
      const snapshot = await query.get();

      let mapeamentos: any[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...(doc.data() as any),
      }));

      // Filtro de confidence (client-side pois pode ser string ou objeto complexo)
      if (filters.confidence) {
        mapeamentos = mapeamentos.filter(m =>
          m.confidence === filters.confidence ||
          (typeof m.confidence === 'object' && m.confidence?.level === filters.confidence)
        );
      }

      // Filtro de SKU específico
      if (filters.sku) {
        mapeamentos = mapeamentos.filter(m => m.sku === filters.sku);
      }

      // Enriquecer com dados da receita (se recipe_id existe)
      const enrichedMapeamentos = await Promise.all(
        mapeamentos.map(async (mapping) => {
          const recipeId = mapping.recipe_id || mapping.recipeId;
          if (recipeId) {
            try {
              const recipeDoc = await this.fastify.db
                .collection('recipes')
                .doc(recipeId)
                .get();

              if (recipeDoc.exists) {
                const recipeData = recipeDoc.data();
                return {
                  ...mapping,
                  recipe_name: recipeData?.name || mapping.recipe_name || mapping.recipeName,
                  recipe_category: recipeData?.category,
                };
              }
            } catch (err) {
              this.fastify.log.warn(`Erro ao buscar receita ${recipeId}: ${err}`);
            }
          }
          return mapping;
        })
      );

      return {
        success: true,
        mapeamentos: enrichedMapeamentos,
        total: enrichedMapeamentos.length,
        stats: {
          total: enrichedMapeamentos.length,
          needsReview: enrichedMapeamentos.filter(m => m.needs_review === true).length,
          highConfidence: enrichedMapeamentos.filter(m =>
            m.confidence === 'auto-high' || m.confidence === 'manual'
          ).length,
        },
      };
    } catch (error: any) {
      this.fastify.log.error('Erro ao listar mapeamentos:', error);
      throw new Error(`Erro ao listar mapeamentos: ${error.message}`);
    }
  }

  /**
   * Busca mapeamento por SKU
   */
  async getMapeamentoBySku(sku: string) {
    try {
      const snapshot = await this.fastify.db
        .collection('product_mappings')
        .where('sku', '==', sku)
        .limit(1)
        .get();

      if (snapshot.empty) {
        return {
          success: false,
          error: 'Mapeamento não encontrado',
        };
      }

      const doc = snapshot.docs[0];
      const mapping: any = {
        id: doc.id,
        ...(doc.data() as any),
      };

      // Enriquecer com dados da receita
      const recipeId = mapping.recipe_id || mapping.recipeId;
      if (recipeId) {
        try {
          const recipeDoc = await this.fastify.db
            .collection('recipes')
            .doc(recipeId)
            .get();

          if (recipeDoc.exists) {
            const recipeData = recipeDoc.data();
            mapping.recipe_name = recipeData?.name || mapping.recipe_name || mapping.recipeName;
            mapping.recipe_category = recipeData?.category;
          }
        } catch (err) {
          this.fastify.log.warn(`Erro ao buscar receita ${recipeId}: ${err}`);
        }
      }

      return {
        success: true,
        mapeamento: mapping,
      };
    } catch (error: any) {
      this.fastify.log.error('Erro ao buscar mapeamento:', error);
      throw new Error(`Erro ao buscar mapeamento: ${error.message}`);
    }
  }

  /**
   * Retorna estatísticas dos mapeamentos
   */
  async getMapeamentosStats() {
    try {
      const snapshot = await this.fastify.db
        .collection('product_mappings')
        .get();

      const mapeamentos: any[] = snapshot.docs.map(doc => doc.data() as any);

      const stats = {
        total: mapeamentos.length,
        needsReview: mapeamentos.filter(m => m.needs_review === true).length,
        highConfidence: mapeamentos.filter(m =>
          m.confidence === 'auto-high' || m.confidence === 'manual'
        ).length,
        lowConfidence: mapeamentos.filter(m =>
          m.confidence === 'low' || m.confidence === 'auto-low'
        ).length,
        unmapped: mapeamentos.filter(m => !m.recipe_id).length,
        percentComplete: 0,
      };

      // Calcular percentual completo (mapeamentos confirmados / total)
      stats.percentComplete = stats.total > 0
        ? Math.round((stats.highConfidence / stats.total) * 100)
        : 0;

      return {
        success: true,
        stats,
      };
    } catch (error: any) {
      this.fastify.log.error('Erro ao buscar estatísticas de mapeamentos:', error);
      throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
    }
  }

  /**
   * Atualiza um mapeamento SKU → Receita
   */
  async updateMapeamento(sku: string, updates: {
    recipeId: string | null;
    confidence: string;
    needsReview: boolean;
  }) {
    try {
      // Buscar mapeamento por SKU
      const snapshot = await this.fastify.db
        .collection('product_mappings')
        .where('sku', '==', sku)
        .limit(1)
        .get();

      if (snapshot.empty) {
        throw new Error('Mapeamento não encontrado');
      }

      // Validar receita se recipeId fornecido
      if (updates.recipeId) {
        const recipeDoc = await this.fastify.db
          .collection('recipes')
          .doc(updates.recipeId)
          .get();

        if (!recipeDoc.exists) {
          throw new Error('Receita não encontrada');
        }
      }

      // Atualizar documento
      const docId = snapshot.docs[0].id;
      await this.fastify.db
        .collection('product_mappings')
        .doc(docId)
        .update({
          recipe_id: updates.recipeId,
          confidence: updates.confidence,
          needs_review: updates.needsReview,
          last_updated: new Date()
        });

      // Retornar mapeamento atualizado
      return this.getMapeamentoBySku(sku);
    } catch (error: any) {
      this.fastify.log.error('Erro ao atualizar mapeamento:', error);
      throw new Error(`Erro ao atualizar mapeamento: ${error.message}`);
    }
  }
}
