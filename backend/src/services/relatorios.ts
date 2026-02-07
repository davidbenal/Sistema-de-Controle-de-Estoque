import { FastifyInstance } from 'fastify';

export class RelatoriosService {
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  async getVendasPorProduto(days: number = 7) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const startStr = startDate.toISOString().split('T')[0];

      const snapshot = await this.fastify.db.collection('vendas')
        .where('saleDate', '>=', startStr)
        .orderBy('saleDate', 'asc')
        .get();

      const vendas = snapshot.docs.map(doc => doc.data() as any);

      const byProduct: Record<string, { name: string; quantity: number; revenue: number }> = {};

      for (const v of vendas) {
        const name = v.productName || v.sku || 'Produto desconhecido';
        const revenue = (v.unitPrice || 0) * (v.quantity || 0);

        if (!byProduct[name]) {
          byProduct[name] = { name, quantity: 0, revenue: 0 };
        }
        byProduct[name].quantity += (v.quantity || 0);
        byProduct[name].revenue += revenue;
      }

      const products = Object.values(byProduct)
        .sort((a, b) => b.revenue - a.revenue);

      return {
        success: true,
        products,
        totalProducts: products.length,
        totalRevenue: products.reduce((s, p) => s + p.revenue, 0),
        totalQuantity: products.reduce((s, p) => s + p.quantity, 0),
      };
    } catch (error: any) {
      this.fastify.log.error('Error getting vendas por produto:', error);
      throw new Error('Erro ao buscar vendas por produto');
    }
  }

  async getEstoqueValor() {
    try {
      const snapshot = await this.fastify.db.collection('ingredients').get();
      const ingredients = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as any));

      const byCategory: Record<string, number> = {};
      let totalValue = 0;

      for (const ing of ingredients) {
        const stock = ing.currentStock || ing.current_stock || 0;
        const price = ing.price || 0;
        const grossQty = ing.grossQuantity || ing.gross_quantity || 1;
        const unitPrice = grossQty > 0 ? price / grossQty : 0;
        const value = stock * unitPrice;

        totalValue += value;
        const cat = ing.category || 'outros';
        byCategory[cat] = (byCategory[cat] || 0) + value;
      }

      const categories = Object.entries(byCategory).map(([category, value]) => {
        const labels: Record<string, string> = {
          perecivel: 'Perecivel',
          'nao-perecivel': 'Nao Perecivel',
          bebida: 'Bebida',
          limpeza: 'Limpeza',
        };
        return { name: labels[category] || category, value };
      });

      return {
        success: true,
        totalValue,
        categories,
        totalIngredients: ingredients.length,
      };
    } catch (error: any) {
      this.fastify.log.error('Error getting estoque valor:', error);
      throw new Error('Erro ao calcular valor de estoque');
    }
  }
}
