import { FastifyInstance } from 'fastify';
import { Firestore, FieldValue, Timestamp } from 'firebase-admin/firestore';
import { Storage } from 'firebase-admin/storage';

export class OperacoesService {
  private fastify: FastifyInstance;
  private db: Firestore;
  private storage: Storage;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
    this.db = fastify.db;
    this.storage = fastify.storage;
  }

  // ==================== PEDIDOS (PURCHASES) ====================

  async listPurchases(filters: {
    status?: string;
    supplierId?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  } = {}) {
    try {
      let query: any = this.db.collection('purchases');

      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }
      if (filters.supplierId) {
        query = query.where('supplier_id', '==', filters.supplierId);
      }

      query = query.orderBy('created_at', 'desc');

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const snapshot = await query.get();
      const purchases = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return { success: true, purchases };
    } catch (error: any) {
      this.fastify.log.error('Error listing purchases:', error);
      throw new Error('Erro ao listar pedidos');
    }
  }

  async getPurchase(id: string) {
    try {
      const doc = await this.db.collection('purchases').doc(id).get();

      if (!doc.exists) {
        throw new Error('Pedido não encontrado');
      }

      return { success: true, purchase: { id: doc.id, ...doc.data() } };
    } catch (error: any) {
      this.fastify.log.error('Error getting purchase:', error);
      throw error;
    }
  }

  async createPurchase(data: {
    supplierId: string;
    supplierName: string;
    orderDate: string;
    expectedDelivery: string;
    items: Array<{
      ingredientId: string;
      ingredientName: string;
      quantity: number;
      unit: string;
      unitPrice: number;
    }>;
    notes?: string;
    createdBy: string;
  }) {
    try {
      // Validações
      if (!data.supplierId || !data.supplierName) {
        throw new Error('Fornecedor é obrigatório');
      }
      if (!data.items || data.items.length === 0) {
        throw new Error('Pedido deve ter pelo menos 1 item');
      }

      // Validar fornecedor existe
      const supplierDoc = await this.db.collection('suppliers').doc(data.supplierId).get();
      if (!supplierDoc.exists) {
        throw new Error('Fornecedor não encontrado');
      }

      // Validar todos ingredientes existem
      for (const item of data.items) {
        const ingredientDoc = await this.db.collection('ingredients').doc(item.ingredientId).get();
        if (!ingredientDoc.exists) {
          throw new Error(`Ingrediente ${item.ingredientName} não encontrado`);
        }
      }

      // Gerar order_number único
      const orderNumber = await this.generateOrderNumber();

      // Calcular valores
      const purchaseItems = data.items.map(item => ({
        ingredient_id: item.ingredientId,
        ingredient_name: item.ingredientName,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unitPrice,
        total_price: item.quantity * item.unitPrice,
      }));

      const totalValue = purchaseItems.reduce((sum, item) => sum + item.total_price, 0);

      // CRIAR PEDIDO (salvar primeiro para ter o ID)
      const purchaseData = {
        supplier_id: data.supplierId,
        supplier_name: data.supplierName,
        order_number: orderNumber,
        order_date: new Date(data.orderDate),
        expected_delivery: new Date(data.expectedDelivery),
        status: 'pending',
        items: purchaseItems,
        total_value: totalValue,
        notes: data.notes || '',
        created_by: data.createdBy,
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      };

      const purchaseRef = await this.db.collection('purchases').add(purchaseData);
      const purchaseId = purchaseRef.id;

      // ⭐ CRIAR RECEBIMENTO AUTOMATICAMENTE
      const receivingId = await this.createAutoReceiving({
        purchaseId,
        supplierId: data.supplierId,
        supplierName: data.supplierName,
        items: data.items,
        expectedDelivery: data.expectedDelivery,
        createdBy: data.createdBy,
      });

      // Atualizar pedido com receiving_id
      await purchaseRef.update({
        receiving_id: receivingId,
      });

      const purchase = { id: purchaseId, ...purchaseData, receiving_id: receivingId };

      this.fastify.log.info(`Purchase created: ${purchaseId}, Receiving created: ${receivingId}`);

      return { success: true, purchase, receivingId };
    } catch (error: any) {
      this.fastify.log.error('Error creating purchase:', error);
      throw error;
    }
  }

  async updatePurchase(id: string, data: any) {
    try {
      const doc = await this.db.collection('purchases').doc(id).get();
      if (!doc.exists) {
        throw new Error('Pedido não encontrado');
      }

      const updateData = {
        ...data,
        updated_at: FieldValue.serverTimestamp(),
      };

      await this.db.collection('purchases').doc(id).update(updateData);

      return { success: true };
    } catch (error: any) {
      this.fastify.log.error('Error updating purchase:', error);
      throw error;
    }
  }

  async cancelPurchase(id: string, reason: string) {
    try {
      const doc = await this.db.collection('purchases').doc(id).get();
      if (!doc.exists) {
        throw new Error('Pedido não encontrado');
      }

      await this.db.collection('purchases').doc(id).update({
        status: 'cancelled',
        cancel_reason: reason,
        updated_at: FieldValue.serverTimestamp(),
      });

      // Cancelar recebimento vinculado também
      const purchaseData = doc.data();
      if (purchaseData?.receiving_id) {
        await this.db.collection('receivings').doc(purchaseData.receiving_id).update({
          status: 'cancelled',
          updated_at: FieldValue.serverTimestamp(),
        });
      }

      return { success: true };
    } catch (error: any) {
      this.fastify.log.error('Error cancelling purchase:', error);
      throw error;
    }
  }

  // ==================== RECEBIMENTOS (RECEIVINGS) ====================

  private async createAutoReceiving(data: {
    purchaseId: string;
    supplierId: string;
    supplierName: string;
    items: Array<{
      ingredientId: string;
      ingredientName: string;
      quantity: number;
      unit: string;
      unitPrice: number;
    }>;
    expectedDelivery: string;
    createdBy: string;
  }): Promise<string> {
    try {
      // Criar checklist com base nos itens do pedido
      const checklist = data.items.map(item => ({
        ingredient_id: item.ingredientId,
        ingredient_name: item.ingredientName,
        ordered_qty: item.quantity,
        received_qty: 0,
        unit: item.unit,
        unit_price: item.unitPrice,
        is_checked: false,
        is_received: false,
        missing_reason: '',
        notes: '',
        expiry_date: null,
        batch_number: '',
        storage_center: '',
        checked_at: null,
        checked_by: '',
      }));

      const orderedTotalValue = data.items.reduce((sum, item) =>
        sum + (item.quantity * item.unitPrice), 0
      );

      const receivingData = {
        purchase_id: data.purchaseId,
        supplier_id: data.supplierId,
        supplier_name: data.supplierName,
        receiving_date: new Date(data.expectedDelivery),
        invoice_number: '',
        invoice_photo_url: '',
        invoice_photo_uploaded_at: null,
        status: 'awaiting_delivery',
        checklist,
        ordered_total_value: orderedTotalValue,
        received_total_value: 0,
        adjustment_value: 0,
        general_notes: '',
        created_by: data.createdBy,
        completed_by: '',
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
        completed_at: null,
      };

      const receivingRef = await this.db.collection('receivings').add(receivingData);

      return receivingRef.id;
    } catch (error: any) {
      this.fastify.log.error('Error creating auto receiving:', error);
      throw new Error('Erro ao criar recebimento automático');
    }
  }

  async listReceivings(filters: {
    purchaseId?: string;
    supplierId?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  } = {}) {
    try {
      let query: any = this.db.collection('receivings');

      if (filters.purchaseId) {
        query = query.where('purchase_id', '==', filters.purchaseId);
      }
      if (filters.supplierId) {
        query = query.where('supplier_id', '==', filters.supplierId);
      }
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      query = query.orderBy('created_at', 'desc');

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const snapshot = await query.get();
      const receivings = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return { success: true, receivings };
    } catch (error: any) {
      this.fastify.log.error('Error listing receivings:', error);
      throw new Error('Erro ao listar recebimentos');
    }
  }

  async getReceiving(id: string) {
    try {
      const doc = await this.db.collection('receivings').doc(id).get();

      if (!doc.exists) {
        throw new Error('Recebimento não encontrado');
      }

      return { success: true, data: { id: doc.id, ...doc.data() } };
    } catch (error: any) {
      this.fastify.log.error('Error getting receiving:', error);
      throw error;
    }
  }

  async uploadInvoicePhoto(
    receivingId: string,
    photoBuffer: Buffer,
    mimetype: string
  ): Promise<string> {
    try {
      // Validar mimetype
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(mimetype)) {
        throw new Error('Apenas imagens JPG, PNG ou WebP são permitidas');
      }

      // Validar tamanho (max 10MB)
      if (photoBuffer.length > 10 * 1024 * 1024) {
        throw new Error('Imagem muito grande (máximo 10MB)');
      }

      const bucket = this.storage.bucket();
      const filename = `${receivingId}-${Date.now()}.jpg`;
      const filePath = `receipt-photos/${receivingId}/${filename}`;
      const file = bucket.file(filePath);

      await file.save(photoBuffer, {
        metadata: {
          contentType: mimetype,
        },
      });

      // Tornar público
      await file.makePublic();

      const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

      // Atualizar documento do recebimento
      await this.db.collection('receivings').doc(receivingId).update({
        invoice_photo_url: publicUrl,
        invoice_photo_uploaded_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });

      this.fastify.log.info(`Photo uploaded for receiving ${receivingId}: ${publicUrl}`);

      return publicUrl;
    } catch (error: any) {
      this.fastify.log.error('Error uploading invoice photo:', error);
      throw error;
    }
  }

  async updateChecklistItem(
    receivingId: string,
    itemIndex: number,
    data: {
      receivedQty: number;
      isReceived: boolean;
      missingReason?: string;
      notes?: string;
      expiryDate?: string;
      batchNumber?: string;
      storageCenter: string;
      userId: string;
    }
  ) {
    try {
      const receivingDoc = await this.db.collection('receivings').doc(receivingId).get();

      if (!receivingDoc.exists) {
        throw new Error('Recebimento não encontrado');
      }

      const receivingData = receivingDoc.data() as any;
      const checklist = receivingData.checklist;

      if (itemIndex < 0 || itemIndex >= checklist.length) {
        throw new Error('Item do checklist inválido');
      }

      // Atualizar item do checklist
      checklist[itemIndex] = {
        ...checklist[itemIndex],
        received_qty: data.isReceived ? data.receivedQty : 0,
        is_checked: true,
        is_received: data.isReceived,
        missing_reason: data.missingReason || '',
        notes: data.notes || '',
        expiry_date: data.expiryDate ? new Date(data.expiryDate) : null,
        batch_number: data.batchNumber || '',
        storage_center: data.storageCenter,
        checked_at: Timestamp.now(), // Não pode usar FieldValue.serverTimestamp() dentro de array
        checked_by: data.userId,
      };

      // Recalcular valores
      const receivedTotalValue = checklist.reduce((sum: number, item: any) =>
        sum + (item.received_qty * item.unit_price), 0
      );
      const adjustmentValue = receivingData.ordered_total_value - receivedTotalValue;

      // Atualizar documento
      await this.db.collection('receivings').doc(receivingId).update({
        checklist,
        received_total_value: receivedTotalValue,
        adjustment_value: adjustmentValue,
        status: 'in_progress',
        updated_at: FieldValue.serverTimestamp(),
      });

      this.fastify.log.info(`Checklist item ${itemIndex} updated for receiving ${receivingId}`);

      return { success: true };
    } catch (error: any) {
      this.fastify.log.error('Error updating checklist item:', error);
      throw error;
    }
  }

  async completeReceiving(receivingId: string, userId: string, generalNotes?: string) {
    try {
      const receivingDoc = await this.db.collection('receivings').doc(receivingId).get();

      if (!receivingDoc.exists) {
        throw new Error('Recebimento não encontrado');
      }

      const receivingData = receivingDoc.data() as any;

      // Validação 1: Foto obrigatória
      if (!receivingData.invoice_photo_url) {
        throw new Error('Foto da nota fiscal é obrigatória');
      }

      // Validação 2: Todos itens devem estar conferidos
      const allChecked = receivingData.checklist.every((item: any) => item.is_checked);
      if (!allChecked) {
        throw new Error('Todos os itens devem ser conferidos antes de completar o recebimento');
      }

      // Atualizar estoque para itens recebidos
      for (const item of receivingData.checklist) {
        if (item.is_received && item.received_qty > 0) {
          // Atualizar estoque do ingrediente com data de pedido
          await this.updateIngredientStock(
            item.ingredient_id,
            item.received_qty,
            {
              lastOrderDate: receivingData.receiving_date,
              lastOrderSupplier: receivingData.supplier_id,
            }
          );

          // Criar movimentação de estoque
          await this.createStockMovement({
            ingredientId: item.ingredient_id,
            ingredientName: item.ingredient_name,
            movementType: 'receiving',
            quantity: item.received_qty,
            unit: item.unit,
            referenceType: 'receiving',
            referenceId: receivingId,
            storageCenter: item.storage_center,
            userId,
          });
        }
      }

      // Atualizar status do recebimento
      await this.db.collection('receivings').doc(receivingId).update({
        status: 'completed',
        completed_by: userId,
        completed_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
        ...(generalNotes && { general_notes: generalNotes }),
      });

      // Atualizar status do pedido
      await this.updatePurchaseStatus(receivingData.purchase_id, receivingData.checklist);

      this.fastify.log.info(`Receiving ${receivingId} completed`);

      return { success: true };
    } catch (error: any) {
      this.fastify.log.error('Error completing receiving:', error);
      throw error;
    }
  }

  // ==================== INVENTÁRIO (INVENTORY COUNTS) ====================

  async listInventoryCounts(filters: {
    storageCenter?: string;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  } = {}) {
    try {
      let query: any = this.db.collection('inventory_counts');

      if (filters.storageCenter) {
        query = query.where('storage_center', '==', filters.storageCenter);
      }
      if (filters.status) {
        query = query.where('status', '==', filters.status);
      }

      query = query.orderBy('created_at', 'desc');

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const snapshot = await query.get();
      const counts = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return { success: true, inventoryCounts: counts };
    } catch (error: any) {
      this.fastify.log.error('Error listing inventory counts:', error);
      throw new Error('Erro ao listar contagens');
    }
  }

  async getInventoryCount(id: string) {
    try {
      const doc = await this.db.collection('inventory_counts').doc(id).get();

      if (!doc.exists) {
        throw new Error('Contagem não encontrada');
      }

      return { success: true, inventoryCount: { id: doc.id, ...doc.data() } };
    } catch (error: any) {
      this.fastify.log.error('Error getting inventory count:', error);
      throw error;
    }
  }

  async startInventoryCount(data: {
    countDate: string;
    countType: string;
    storageCenter: string;
    items: Array<{
      ingredientId: string;
      ingredientName: string;
      systemQty: number;
      countedQty: number;
      unit: string;
      notes?: string;
    }>;
    countedBy: string;
    notes?: string;
  }) {
    try {
      const items = data.items.map(item => ({
        ingredient_id: item.ingredientId,
        ingredient_name: item.ingredientName,
        system_qty: item.systemQty,
        counted_qty: item.countedQty,
        difference: item.countedQty - item.systemQty,
        unit: item.unit,
        notes: item.notes || '',
      }));

      const totalDifferences = items.reduce((sum, item) =>
        sum + Math.abs(item.difference), 0
      );

      const countData = {
        count_date: new Date(data.countDate),
        count_type: data.countType,
        storage_center: data.storageCenter,
        status: 'in_progress',
        items,
        total_differences: totalDifferences,
        counted_by: data.countedBy,
        approved_by: '',
        notes: data.notes || '',
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      };

      const countRef = await this.db.collection('inventory_counts').add(countData);

      return { success: true, inventoryCount: { id: countRef.id, ...countData } };
    } catch (error: any) {
      this.fastify.log.error('Error starting inventory count:', error);
      throw error;
    }
  }

  async updateInventoryCount(id: string, data: any) {
    try {
      const doc = await this.db.collection('inventory_counts').doc(id).get();
      if (!doc.exists) {
        throw new Error('Contagem não encontrada');
      }

      await this.db.collection('inventory_counts').doc(id).update({
        ...data,
        updated_at: FieldValue.serverTimestamp(),
      });

      return { success: true };
    } catch (error: any) {
      this.fastify.log.error('Error updating inventory count:', error);
      throw error;
    }
  }

  async completeInventoryCount(id: string, userId: string) {
    try {
      const countDoc = await this.db.collection('inventory_counts').doc(id).get();

      if (!countDoc.exists) {
        throw new Error('Contagem não encontrada');
      }

      const countData = countDoc.data() as any;

      // Ajustar estoque para itens com diferença
      for (const item of countData.items) {
        if (item.difference !== 0) {
          // Atualizar para quantidade contada
          const ingredientDoc = await this.db.collection('ingredients').doc(item.ingredient_id).get();
          if (ingredientDoc.exists) {
            await this.db.collection('ingredients').doc(item.ingredient_id).update({
              current_stock: item.counted_qty,
              updated_at: FieldValue.serverTimestamp(),
            });

            // Criar movimentação
            await this.createStockMovement({
              ingredientId: item.ingredient_id,
              ingredientName: item.ingredient_name,
              movementType: 'adjustment',
              quantity: item.difference,
              unit: item.unit,
              referenceType: 'inventory_count',
              referenceId: id,
              storageCenter: countData.storage_center,
              userId,
            });
          }
        }
      }

      // Marcar como completo
      await this.db.collection('inventory_counts').doc(id).update({
        status: 'completed',
        approved_by: userId,
        updated_at: FieldValue.serverTimestamp(),
      });

      return { success: true };
    } catch (error: any) {
      this.fastify.log.error('Error completing inventory count:', error);
      throw error;
    }
  }

  async cancelInventoryCount(id: string, reason: string) {
    try {
      const doc = await this.db.collection('inventory_counts').doc(id).get();
      if (!doc.exists) {
        throw new Error('Contagem não encontrada');
      }

      await this.db.collection('inventory_counts').doc(id).update({
        status: 'cancelled',
        cancel_reason: reason,
        updated_at: FieldValue.serverTimestamp(),
      });

      return { success: true };
    } catch (error: any) {
      this.fastify.log.error('Error cancelling inventory count:', error);
      throw error;
    }
  }

  // ==================== MOVIMENTAÇÕES (STOCK MOVEMENTS) ====================

  async listStockMovements(filters: {
    ingredientId?: string;
    movementType?: string;
    dateFrom?: string;
    dateTo?: string;
    limit?: number;
  } = {}) {
    try {
      let query: any = this.db.collection('stock_movements');

      if (filters.ingredientId) {
        query = query.where('ingredient_id', '==', filters.ingredientId);
      }
      if (filters.movementType) {
        query = query.where('movement_type', '==', filters.movementType);
      }

      query = query.orderBy('created_at', 'desc');

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const snapshot = await query.get();
      const movements = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return { success: true, stockMovements: movements };
    } catch (error: any) {
      this.fastify.log.error('Error listing stock movements:', error);
      throw new Error('Erro ao listar movimentações');
    }
  }

  // ==================== HELPERS ====================

  private async updateIngredientStock(
    ingredientId: string,
    quantityToAdd: number,
    additionalFields?: {
      lastOrderDate?: any;
      lastOrderSupplier?: string;
    }
  ) {
    try {
      const ingredientDoc = await this.db.collection('ingredients').doc(ingredientId).get();

      if (!ingredientDoc.exists) {
        throw new Error('Ingrediente não encontrado');
      }

      const ingredientData = ingredientDoc.data() as any;
      const currentStock = ingredientData.current_stock || 0;
      const newStock = currentStock + quantityToAdd;

      const updateData: any = {
        current_stock: newStock,
        last_stock_update: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      };

      // Adicionar campos opcionais se fornecidos
      if (additionalFields?.lastOrderDate) {
        updateData.last_order_date = additionalFields.lastOrderDate;
      }
      if (additionalFields?.lastOrderSupplier) {
        updateData.last_order_supplier = additionalFields.lastOrderSupplier;
      }

      await this.db.collection('ingredients').doc(ingredientId).update(updateData);

      this.fastify.log.info(`Stock updated for ingredient ${ingredientId}: ${currentStock} → ${newStock}`);
    } catch (error: any) {
      this.fastify.log.error('Error updating ingredient stock:', error);
      throw error;
    }
  }

  private async createStockMovement(data: {
    ingredientId: string;
    ingredientName: string;
    movementType: string;
    quantity: number;
    unit: string;
    referenceType?: string;
    referenceId?: string;
    storageCenter: string;
    userId: string;
    notes?: string;
  }) {
    try {
      // Buscar estoque atual
      const ingredientDoc = await this.db.collection('ingredients').doc(data.ingredientId).get();
      const ingredientData = ingredientDoc.data() as any;
      const previousStock = ingredientData?.current_stock || 0;
      const newStock = previousStock + data.quantity;

      const movementData = {
        ingredient_id: data.ingredientId,
        ingredient_name: data.ingredientName,
        movement_type: data.movementType,
        quantity: data.quantity,
        unit: data.unit,
        previous_stock: previousStock,
        new_stock: newStock,
        reference_type: data.referenceType || '',
        reference_id: data.referenceId || '',
        storage_center: data.storageCenter,
        notes: data.notes || '',
        created_by: data.userId,
        created_at: FieldValue.serverTimestamp(),
      };

      await this.db.collection('stock_movements').add(movementData);

      this.fastify.log.info(`Stock movement created: ${data.movementType} ${data.quantity} ${data.unit}`);
    } catch (error: any) {
      this.fastify.log.error('Error creating stock movement:', error);
      throw error;
    }
  }

  private async updatePurchaseStatus(purchaseId: string, checklist: any[]) {
    try {
      // Verificar se todos itens foram 100% recebidos
      const allFullyReceived = checklist.every((item: any) =>
        item.is_received && item.received_qty === item.ordered_qty
      );

      // Verificar se pelo menos algum item foi recebido
      const someReceived = checklist.some((item: any) => item.is_received);

      let newStatus = 'pending';
      if (allFullyReceived) {
        newStatus = 'received';
      } else if (someReceived) {
        newStatus = 'partial';
      }

      await this.db.collection('purchases').doc(purchaseId).update({
        status: newStatus,
        updated_at: FieldValue.serverTimestamp(),
      });

      this.fastify.log.info(`Purchase ${purchaseId} status updated to: ${newStatus}`);
    } catch (error: any) {
      this.fastify.log.error('Error updating purchase status:', error);
      throw error;
    }
  }

  private async generateOrderNumber(): Promise<string> {
    try {
      const year = new Date().getFullYear();

      // Buscar último order_number do ano atual
      const snapshot = await this.db.collection('purchases')
        .where('order_number', '>=', `PED-${year}-000`)
        .where('order_number', '<=', `PED-${year}-999`)
        .orderBy('order_number', 'desc')
        .limit(1)
        .get();

      let nextNumber = 1;

      if (!snapshot.empty) {
        const lastOrderNumber = snapshot.docs[0].data().order_number;
        const lastNumber = parseInt(lastOrderNumber.split('-')[2]);
        nextNumber = lastNumber + 1;
      }

      const orderNumber = `PED-${year}-${String(nextNumber).padStart(3, '0')}`;
      return orderNumber;
    } catch (error: any) {
      this.fastify.log.error('Error generating order number:', error);
      // Fallback: usar timestamp
      return `PED-${Date.now()}`;
    }
  }
}
