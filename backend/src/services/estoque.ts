import * as admin from 'firebase-admin';

interface StockFilters {
  storageCenter?: string;
  category?: string;
  status?: string;
  supplierId?: string;
}

interface AdjustStockData {
  ingredientId: string;
  newQuantity: number;
  reason: string;
  notes?: string;
  userId: string;
}

interface CreateDraftData {
  supplier_id: string;
  supplier_name: string;
  items: DraftItem[];
  created_by: string;
}

interface DraftItem {
  ingredient_id: string;
  ingredient_name: string;
  quantity: number;
  unit: string;
  unit_price?: number;
  notes?: string;
}

interface FinalizeDraftData {
  draftId: string;
  orderDate: string;
  expectedDelivery: string;
  notes?: string;
  userId: string;
  items?: DraftItem[];
}

export class EstoqueService {
  private db: admin.firestore.Firestore;

  constructor(db: admin.firestore.Firestore) {
    this.db = db;
  }

  async getCurrentStock(filters: StockFilters) {
    // 1. Query ingredientes ativos (sem filtro de storage_center no Firestore
    //    porque docs antigos podem ter o campo em camelCase)
    const query: admin.firestore.Query = this.db.collection('ingredients')
      .where('status', '==', 'active');

    const snapshot = await query.get();
    // Normalizar: garantir que storage_center sempre exista (snake_case prioritário)
    let ingredients = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        storage_center: data.storage_center || data.storageCenter || 'sem-centro',
      };
    });

    // Filtro de storage_center em código (cobre docs com campo em qualquer casing)
    if (filters.storageCenter) {
      ingredients = ingredients.filter((ing: any) => ing.storage_center === filters.storageCenter);
    }

    // 2. Para cada ingrediente, enriquecer com dados calculados
    const enriched = await Promise.all(
      ingredients.map(async (ing: any) => {
        const supplier = ing.supplier_id ? await this.getSupplier(ing.supplier_id) : null;
        const lastOrder = await this.getLastOrderDate(ing.id);
        const reorderDate = this.calculateReorderDate(ing, supplier);
        const stockStatus = this.getStockStatus(ing);

        return {
          ...ing,
          supplier_name: supplier?.name || 'Sem fornecedor',
          last_order_date: lastOrder,
          recommended_reorder_date: reorderDate,
          stock_status: stockStatus,
        };
      })
    );

    // 3. Agrupar por storage center
    const grouped = this.groupByStorageCenter(enriched);

    // 4. Calcular estatísticas
    const summary = this.calculateSummary(enriched);

    return {
      by_storage_center: grouped,
      all_ingredients: enriched,
      summary,
    };
  }

  async getSupplier(supplierId: string) {
    try {
      const doc = await this.db.collection('suppliers').doc(supplierId).get();
      if (doc.exists) {
        return { id: doc.id, ...(doc.data() as any) };
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar fornecedor:', error);
      return null;
    }
  }

  async getLastOrderDate(ingredientId: string): Promise<string | null> {
    try {
      // Query purchases que contêm este ingrediente nos items
      const snapshot = await this.db.collection('purchases')
        .orderBy('order_date', 'desc')
        .limit(100) // Buscar as últimas 100 compras
        .get();

      // Filtrar as que contêm este ingrediente
      for (const doc of snapshot.docs) {
        const purchase = doc.data();
        if (purchase.items && Array.isArray(purchase.items)) {
          const hasIngredient = purchase.items.some((item: any) => item.ingredient_id === ingredientId);
          if (hasIngredient && purchase.order_date) {
            return purchase.order_date.toDate().toISOString();
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Erro ao buscar última data de pedido:', error);
      return null;
    }
  }

  calculateReorderDate(ingredient: any, supplier: any): string | null {
    if (!ingredient.avg_daily_consumption || ingredient.avg_daily_consumption === 0) {
      return null;
    }

    const currentStock = ingredient.current_stock || 0;
    const minStock = ingredient.min_stock || 0;
    const safetyBuffer = 3; // dias de segurança
    const deliveryTime = supplier?.delivery_time || 7;

    // Dias até atingir estoque mínimo
    const daysToMin = (currentStock - minStock) / ingredient.avg_daily_consumption;

    // Deve pedir antes de atingir o mínimo, considerando tempo de entrega
    const reorderInDays = Math.max(0, daysToMin - deliveryTime - safetyBuffer);

    const reorderDate = new Date();
    reorderDate.setDate(reorderDate.getDate() + Math.floor(reorderInDays));

    return reorderDate.toISOString();
  }

  getStockStatus(ingredient: any): 'ok' | 'low' | 'critical' | 'excess' {
    const current = ingredient.current_stock || 0;
    const min = ingredient.min_stock || 0;
    const max = ingredient.max_stock || Infinity;

    if (current > max) return 'excess';
    if (current < min * 0.5) return 'critical';
    if (current < min) return 'low';
    return 'ok';
  }

  groupByStorageCenter(ingredients: any[]) {
    const grouped: { [key: string]: any[] } = {};

    ingredients.forEach(ing => {
      const center = ing.storage_center || 'sem-centro';
      if (!grouped[center]) {
        grouped[center] = [];
      }
      grouped[center].push(ing);
    });

    return grouped;
  }

  calculateSummary(ingredients: any[]) {
    const total = ingredients.length;
    const ok = ingredients.filter(i => i.stock_status === 'ok').length;
    const low = ingredients.filter(i => i.stock_status === 'low').length;
    const critical = ingredients.filter(i => i.stock_status === 'critical').length;
    const excess = ingredients.filter(i => i.stock_status === 'excess').length;

    return {
      total_ingredients: total,
      ok_count: ok,
      low_count: low,
      critical_count: critical,
      excess_count: excess,
    };
  }

  async getIngredientMovements(ingredientId: string, options: { limit: number; offset: number }) {
    try {
      const snapshot = await this.db.collection('stock_movements')
        .where('ingredient_id', '==', ingredientId)
        .orderBy('created_at', 'desc')
        .limit(options.limit)
        .offset(options.offset)
        .get();

      return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Erro ao buscar movimentos:', error);
      return [];
    }
  }

  async adjustStock(data: AdjustStockData) {
    const { ingredientId, newQuantity, reason, notes, userId } = data;

    // Transaction para garantir atomicidade
    return this.db.runTransaction(async (transaction) => {
      const ingredientRef = this.db.collection('ingredients').doc(ingredientId);
      const ingredientDoc = await transaction.get(ingredientRef);

      if (!ingredientDoc.exists) {
        throw new Error('Ingrediente não encontrado');
      }

      const ingredient = ingredientDoc.data()!;
      const previousStock = ingredient.current_stock || 0;
      const difference = newQuantity - previousStock;

      // Atualizar estoque no ingrediente
      transaction.update(ingredientRef, {
        current_stock: newQuantity,
        last_stock_update: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Criar movimento de estoque
      const movementRef = this.db.collection('stock_movements').doc();
      transaction.set(movementRef, {
        ingredient_id: ingredientId,
        ingredient_name: ingredient.name,
        movement_type: 'adjustment',
        quantity: difference,
        previous_stock: previousStock,
        new_stock: newQuantity,
        storage_center: ingredient.storage_center,
        reference_type: 'manual',
        reason,
        notes,
        created_by: userId,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        previous_stock: previousStock,
        new_stock: newQuantity,
        difference,
        movement_id: movementRef.id,
      };
    });
  }

  // Draft Orders Methods

  // Helper para limpar campos undefined de um item
  private cleanDraftItem(item: DraftItem): any {
    const cleaned: any = {
      ingredient_id: item.ingredient_id,
      ingredient_name: item.ingredient_name,
      quantity: item.quantity,
      unit: item.unit,
    };

    // Adicionar apenas campos opcionais que têm valor
    if (item.unit_price !== undefined && item.unit_price !== null) {
      cleaned.unit_price = item.unit_price;
    }
    if (item.notes) {
      cleaned.notes = item.notes;
    }

    return cleaned;
  }

  async findDraftBySupplier(supplierId: string, userId: string) {
    try {
      const snapshot = await this.db.collection('draft_orders')
        .where('supplier_id', '==', supplierId)
        .where('created_by', '==', userId)
        .where('status', '==', 'draft')
        .limit(1)
        .get();

      if (snapshot.empty) {
        return null;
      }

      return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
    } catch (error) {
      console.error('Erro ao buscar rascunho:', error);
      return null;
    }
  }

  async createDraft(data: CreateDraftData) {
    // Limpar items removendo campos undefined
    const cleanedItems = data.items.map(item => this.cleanDraftItem(item));

    const draftData = {
      supplier_id: data.supplier_id,
      supplier_name: data.supplier_name,
      created_by: data.created_by,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
      last_modified: admin.firestore.FieldValue.serverTimestamp(),
      status: 'draft',
      items: cleanedItems,
      total_value: this.calculateDraftTotal(data.items),
    };

    const docRef = await this.db.collection('draft_orders').add(draftData);
    return { id: docRef.id, ...draftData };
  }

  async addItemToDraft(draftId: string, item: DraftItem) {
    const draftRef = this.db.collection('draft_orders').doc(draftId);
    const draftDoc = await draftRef.get();

    if (!draftDoc.exists) {
      throw new Error('Rascunho não encontrado');
    }

    const draft = draftDoc.data()!;
    // Limpar o novo item antes de adicionar
    const cleanedItem = this.cleanDraftItem(item);
    const updatedItems = [...(draft.items || []), cleanedItem];

    await draftRef.update({
      items: updatedItems,
      total_value: this.calculateDraftTotal(updatedItems),
      last_modified: admin.firestore.FieldValue.serverTimestamp(),
    });
  }

  async getUserDrafts(userId: string) {
    try {
      const snapshot = await this.db.collection('draft_orders')
        .where('created_by', '==', userId)
        .where('status', '==', 'draft')
        .get();

      // Ordenar no lado do cliente para evitar necessidade de índice composto
      const drafts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      return drafts.sort((a: any, b: any) => {
        const dateA = a.created_at?.toDate?.() || new Date(0);
        const dateB = b.created_at?.toDate?.() || new Date(0);
        return dateB.getTime() - dateA.getTime();
      });
    } catch (error) {
      console.error('Erro ao buscar rascunhos:', error);
      return [];
    }
  }

  async updateDraft(draftId: string, updates: { items?: any[]; notes?: string }) {
    const draftRef = this.db.collection('draft_orders').doc(draftId);

    const updateData: any = {
      last_modified: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (updates.items) {
      updateData.items = updates.items;
      updateData.total_value = this.calculateDraftTotal(updates.items);
    }

    if (updates.notes !== undefined) {
      updateData.notes = updates.notes;
    }

    await draftRef.update(updateData);
  }

  async deleteDraft(draftId: string) {
    await this.db.collection('draft_orders').doc(draftId).delete();
  }

  async finalizeDraft(data: FinalizeDraftData) {
    const { draftId, orderDate, expectedDelivery, notes, userId, items: updatedItems } = data;

    return this.db.runTransaction(async (transaction) => {
      // 1. Pegar rascunho
      const draftRef = this.db.collection('draft_orders').doc(draftId);
      const draftDoc = await transaction.get(draftRef);

      if (!draftDoc.exists) {
        throw new Error('Rascunho não encontrado');
      }

      const draft = draftDoc.data()!;

      // Usar items atualizados se fornecidos, caso contrário usar do draft
      const itemsToUse = updatedItems || draft.items;

      // 2. Validar que todos os preços estão preenchidos
      const missingPrices = itemsToUse.filter((item: any) => !item.unit_price || item.unit_price === 0);
      if (missingPrices.length > 0) {
        throw new Error('Todos os itens devem ter preço unitário definido');
      }

      // 3. Criar Purchase
      const purchaseRef = this.db.collection('purchases').doc();
      const orderNumber = await this.generateOrderNumber();
      const totalValue = itemsToUse.reduce((sum: number, item: any) =>
        sum + (item.quantity * item.unit_price), 0);

      const purchaseData: any = {
        supplier_id: draft.supplier_id,
        supplier_name: draft.supplier_name,
        order_number: orderNumber,
        order_date: admin.firestore.Timestamp.fromDate(new Date(orderDate)),
        expected_delivery: admin.firestore.Timestamp.fromDate(new Date(expectedDelivery)),
        status: 'pending',
        items: itemsToUse.map((item: any) => ({
          ingredient_id: item.ingredient_id,
          ingredient_name: item.ingredient_name,
          quantity: item.quantity,
          unit: item.unit,
          unit_price: item.unit_price,
          total_price: item.quantity * item.unit_price,
        })),
        total_value: totalValue,
        created_by: userId,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
        updated_at: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Adicionar notes apenas se tiver valor
      const finalNotes = notes || draft.notes;
      if (finalNotes) {
        purchaseData.notes = finalNotes;
      }

      transaction.set(purchaseRef, purchaseData);

      // 4. Criar Receiving automaticamente
      const receivingRef = this.db.collection('receivings').doc();
      const receivingData = {
        purchase_id: purchaseRef.id,
        supplier_id: draft.supplier_id,
        supplier_name: draft.supplier_name,
        receiving_date: admin.firestore.Timestamp.fromDate(new Date(expectedDelivery)),
        status: 'awaiting_delivery',
        checklist: itemsToUse.map((item: any) => ({
          ingredient_id: item.ingredient_id,
          ingredient_name: item.ingredient_name,
          ordered_qty: item.quantity,
          received_qty: 0,
          unit: item.unit,
          unit_price: item.unit_price,
          is_checked: false,
          is_received: false,
        })),
        ordered_total_value: totalValue,
        received_total_value: 0,
        adjustment_value: 0,
        created_at: admin.firestore.FieldValue.serverTimestamp(),
      };

      transaction.set(receivingRef, receivingData);

      // 5. Atualizar Purchase com receiving_id
      transaction.update(purchaseRef, { receiving_id: receivingRef.id });

      // 6. Deletar rascunho
      transaction.delete(draftRef);

      // 7. Gerar texto para fornecedor
      const supplierMessage = this.generateSupplierMessage(purchaseData, draft.supplier_name);

      return {
        purchaseId: purchaseRef.id,
        receivingId: receivingRef.id,
        supplierMessage,
      };
    });
  }

  calculateDraftTotal(items: DraftItem[]): number {
    return items.reduce((sum, item) => {
      if (item.unit_price) {
        return sum + (item.quantity * item.unit_price);
      }
      return sum;
    }, 0);
  }

  async generateOrderNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const snapshot = await this.db.collection('purchases')
      .where('order_number', '>=', `PED-${year}-`)
      .where('order_number', '<=', `PED-${year}-9999`)
      .orderBy('order_number', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return `PED-${year}-001`;
    }

    const lastOrder = snapshot.docs[0].data();
    const lastNumber = parseInt(lastOrder.order_number.split('-')[2]);
    const nextNumber = lastNumber + 1;

    return `PED-${year}-${String(nextNumber).padStart(3, '0')}`;
  }

  generateSupplierMessage(purchase: any, supplierName: string): string {
    const orderDate = purchase.order_date.toDate().toLocaleDateString('pt-BR');
    const deliveryDate = purchase.expected_delivery.toDate().toLocaleDateString('pt-BR');

    let message = `Pedido Restaurante Montuvia\n`;
    message += `Data: ${orderDate}\n\n`;
    message += `Fornecedor: ${supplierName}\n`;
    message += `Número do Pedido: ${purchase.order_number}\n`;
    message += `Prazo de Entrega: ${deliveryDate}\n\n`;
    message += `ITENS SOLICITADOS:\n`;

    purchase.items.forEach((item: any) => {
      const subtotal = item.quantity * item.unit_price;
      message += `• ${item.ingredient_name} - ${item.quantity} ${item.unit} × R$ ${item.unit_price.toFixed(2)} = R$ ${subtotal.toFixed(2)}\n`;
    });

    message += `\nVALOR TOTAL: R$ ${purchase.total_value.toFixed(2)}\n\n`;

    if (purchase.notes) {
      message += `Observações: ${purchase.notes}\n\n`;
    }

    message += `Aguardamos confirmação.\n`;
    message += `Att,\nEquipe Montuvia`;

    return message;
  }
}
