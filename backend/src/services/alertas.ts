import { FastifyInstance } from 'fastify';

interface Alert {
  id: string;
  type: 'stock_low' | 'stock_critical' | 'product_unmapped' | 'sale_error' | string;
  priority: 'high' | 'medium' | 'low';
  status: 'pending' | 'resolved' | string;
  title?: string;
  message: string;
  ingredientId?: string;
  ingredientName?: string;
  currentStock?: number;
  minStock?: number;
  createdAt: { seconds: number } | { _seconds: number };
  resolvedAt?: { seconds: number } | { _seconds: number };
}

interface AlertFilters {
  status?: 'pending' | 'resolved';
  priority?: 'high' | 'medium' | 'low';
  type?: string;
  limit?: number;
}

export class AlertasService {
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  /**
   * Lista alertas do Firestore com filtros opcionais
   * Nota: Firestore requer índices compostos para where + orderBy em campos diferentes
   * Por simplicidade, pegamos todos e filtramos em memória
   */
  async listAlertas(filters: AlertFilters = {}) {
    try {
      const {
        status,
        priority,
        type,
        limit = 50
      } = filters;

      // Buscar todos os alertas (ou filtrar apenas por status se fornecido)
      let query = this.fastify.db.collection('alerts');

      const snapshot = await query.get();

      let alertas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Alert[];

      // Aplicar filtros client-side
      if (status) {
        alertas = alertas.filter(a => a.status === status);
      }

      if (priority) {
        alertas = alertas.filter(a => a.priority === priority);
      }

      if (type) {
        alertas = alertas.filter(a => a.type === type);
      }

      // Ordenar por data (mais recentes primeiro)
      alertas.sort((a, b) => {
        const timeA = (a.createdAt as any)._seconds || (a.createdAt as any).seconds || 0;
        const timeB = (b.createdAt as any)._seconds || (b.createdAt as any).seconds || 0;
        return timeB - timeA;
      });

      // Limitar resultados
      alertas = alertas.slice(0, limit);

      return {
        success: true,
        alertas,
        total: alertas.length,
      };
    } catch (error: any) {
      this.fastify.log.error('Erro ao listar alertas:', error);
      throw new Error(`Erro ao listar alertas: ${error.message}`);
    }
  }

  /**
   * Busca um alerta específico por ID
   */
  async getAlerta(alertaId: string) {
    try {
      const doc = await this.fastify.db
        .collection('alerts')
        .doc(alertaId)
        .get();

      if (!doc.exists) {
        return {
          success: false,
          error: 'Alerta não encontrado',
        };
      }

      return {
        success: true,
        alerta: {
          id: doc.id,
          ...doc.data(),
        },
      };
    } catch (error: any) {
      this.fastify.log.error('Erro ao buscar alerta:', error);
      throw new Error(`Erro ao buscar alerta: ${error.message}`);
    }
  }

  /**
   * Retorna estatísticas dos alertas
   */
  async getAlertaStats() {
    try {
      const snapshot = await this.fastify.db
        .collection('alerts')
        .get();

      const alertas = snapshot.docs.map(doc => doc.data());

      // Filtrar apenas pending
      const pending = alertas.filter(a => a.status === 'pending');

      const stats = {
        total: pending.length,
        byPriority: {
          high: pending.filter(a => a.priority === 'high').length,
          medium: pending.filter(a => a.priority === 'medium').length,
          low: pending.filter(a => a.priority === 'low').length,
        },
        byType: {
          stock_low: pending.filter(a => a.type === 'stock_low').length,
          stock_critical: pending.filter(a => a.type === 'stock_critical').length,
          product_unmapped: pending.filter(a => a.type === 'product_unmapped').length,
          incomplete_recipe: pending.filter(a => a.type === 'incomplete_recipe').length,
          sale_error: pending.filter(a => a.type === 'sale_error').length,
        },
      };

      return {
        success: true,
        stats,
      };
    } catch (error: any) {
      this.fastify.log.error('Erro ao buscar estatísticas de alertas:', error);
      throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
    }
  }

  /**
   * Cria novo alerta no Firestore
   */
  async createAlert(data: {
    type: string;
    priority: string;
    title: string;
    message: string;
    relatedId?: string;
  }) {
    try {
      const alert = {
        type: data.type,
        priority: data.priority,
        title: data.title,
        message: data.message,
        relatedId: data.relatedId || null,
        status: 'pending',
        createdAt: new Date()
      };

      const docRef = await this.fastify.db.collection('alerts').add(alert);

      return {
        success: true,
        alert: {
          id: docRef.id,
          ...alert
        }
      };
    } catch (error: any) {
      this.fastify.log.error('Erro ao criar alerta:', error);
      throw new Error(`Erro ao criar alerta: ${error.message}`);
    }
  }
}
