import { FastifyInstance } from 'fastify';

export class DashboardService {
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  /**
   * Retorna resumo do dashboard com estatísticas agregadas
   */
  async getResumo() {
    try {
      // Buscar dados em paralelo
      const [
        ingredientsSnapshot,
        alertsSnapshot,
        vendasSnapshot,
        uploadsSnapshot,
      ] = await Promise.all([
        this.fastify.db.collection('ingredients').get(),
        this.fastify.db.collection('alerts').where('status', '==', 'pending').get(),
        this.fastify.db.collection('vendas').orderBy('saleDate', 'desc').limit(100).get(),
        this.fastify.db.collection('sales_uploads').orderBy('uploadedAt', 'desc').limit(10).get(),
      ]);

      // Processar ingredientes
      const ingredients = ingredientsSnapshot.docs.map(doc => doc.data());
      const ingredientsBelowMin = ingredients.filter(ing =>
        ing.currentStock !== undefined &&
        ing.minStock !== undefined &&
        ing.currentStock < ing.minStock
      );

      // Processar alertas
      const alertas = alertsSnapshot.docs.map(doc => doc.data());
      const alertasCriticos = alertas.filter(a => a.priority === 'high');

      // Processar vendas (últimos 7 dias)
      const vendas = vendasSnapshot.docs.map(doc => doc.data());
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const vendasRecentes = vendas.filter(v => {
        if (!v.saleDate) return false;
        const saleDate = new Date(v.saleDate);
        return saleDate >= sevenDaysAgo;
      });

      // Calcular total de vendas
      const totalVendasCount = vendasRecentes.length;

      // Processar uploads
      const uploads = uploadsSnapshot.docs.map(doc => doc.data());
      const ultimoUpload = uploads.length > 0 ? uploads[0] : null;

      // Calcular percentual de produtos mapeados
      const mappingsSnapshot = await this.fastify.db.collection('product_mappings').get();
      const mappings = mappingsSnapshot.docs.map(doc => doc.data());
      const mapeadosComConfianca = mappings.filter(m =>
        m.confidence && (m.confidence === 'auto-high' || m.confidence === 'manual')
      );
      const percentualMapeado = mappings.length > 0
        ? Math.round((mapeadosComConfianca.length / mappings.length) * 100)
        : 0;

      const resumo = {
        ingredientes: {
          total: ingredients.length,
          abaixoMinimo: ingredientsBelowMin.length,
          percentualAbaixoMinimo: ingredients.length > 0
            ? Math.round((ingredientsBelowMin.length / ingredients.length) * 100)
            : 0,
        },
        alertas: {
          total: alertas.length,
          criticos: alertasCriticos.length,
        },
        vendas: {
          ultimos7Dias: totalVendasCount,
          ultimoUpload: ultimoUpload ? {
            filename: ultimoUpload.filename,
            uploadedAt: ultimoUpload.uploadedAt,
            salesCreated: ultimoUpload.salesCreated || 0,
          } : null,
        },
        mapeamentos: {
          total: mappings.length,
          mapeados: mapeadosComConfianca.length,
          percentual: percentualMapeado,
        },
        statusSistema: {
          operacional: true,
          ultimaSincronizacao: ultimoUpload?.uploadedAt || null,
        },
      };

      return {
        success: true,
        resumo,
      };
    } catch (error: any) {
      this.fastify.log.error('Erro ao buscar resumo do dashboard:', error);
      throw new Error(`Erro ao buscar resumo: ${error.message}`);
    }
  }

  /**
   * Retorna ingredientes abaixo do estoque mínimo
   */
  async getIngredientesAbaixoMinimo() {
    try {
      const snapshot = await this.fastify.db.collection('ingredients').get();
      const ingredients = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      const abaixoMinimo = ingredients.filter(ing =>
        ing.currentStock !== undefined &&
        ing.minStock !== undefined &&
        ing.currentStock < ing.minStock
      ).sort((a, b) => {
        // Ordenar por criticidade (quanto menor o percentual, mais crítico)
        const percA = a.minStock > 0 ? (a.currentStock / a.minStock) * 100 : 0;
        const percB = b.minStock > 0 ? (b.currentStock / b.minStock) * 100 : 0;
        return percA - percB;
      });

      return {
        success: true,
        ingredientes: abaixoMinimo,
        total: abaixoMinimo.length,
      };
    } catch (error: any) {
      this.fastify.log.error('Erro ao buscar ingredientes abaixo do mínimo:', error);
      throw new Error(`Erro ao buscar ingredientes: ${error.message}`);
    }
  }
}
