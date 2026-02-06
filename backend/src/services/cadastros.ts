import { FastifyInstance } from 'fastify';

export class CadastrosService {
  private fastify: FastifyInstance;

  constructor(fastify: FastifyInstance) {
    this.fastify = fastify;
  }

  /**
   * Lista ingredientes do Firestore
   */
  async listIngredientes(filters?: { category?: string; search?: string }) {
    try {
      let query = this.fastify.db.collection('ingredients').orderBy('name', 'asc');

      // Aplicar filtro de categoria se fornecido
      if (filters?.category) {
        query = query.where('category', '==', filters.category);
      }

      const snapshot = await query.get();

      let ingredientes = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Filtro de busca (client-side já que Firestore não suporta LIKE)
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        ingredientes = ingredientes.filter(ing =>
          ing.name?.toLowerCase().includes(searchLower)
        );
      }

      return {
        success: true,
        ingredientes,
        total: ingredientes.length,
      };
    } catch (error: any) {
      this.fastify.log.error('Erro ao listar ingredientes:', error);
      throw new Error(`Erro ao listar ingredientes: ${error.message}`);
    }
  }

  /**
   * Busca ingrediente por ID
   */
  async getIngrediente(id: string) {
    try {
      const doc = await this.fastify.db
        .collection('ingredients')
        .doc(id)
        .get();

      if (!doc.exists) {
        return {
          success: false,
          error: 'Ingrediente não encontrado',
        };
      }

      return {
        success: true,
        ingrediente: {
          id: doc.id,
          ...doc.data(),
        },
      };
    } catch (error: any) {
      this.fastify.log.error('Erro ao buscar ingrediente:', error);
      throw new Error(`Erro ao buscar ingrediente: ${error.message}`);
    }
  }

  /**
   * Lista fornecedores do Firestore
   */
  async listFornecedores() {
    try {
      const snapshot = await this.fastify.db
        .collection('suppliers')
        .orderBy('name', 'asc')
        .get();

      const fornecedores = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      return {
        success: true,
        fornecedores,
        total: fornecedores.length,
      };
    } catch (error: any) {
      this.fastify.log.error('Erro ao listar fornecedores:', error);
      throw new Error(`Erro ao listar fornecedores: ${error.message}`);
    }
  }

  /**
   * Busca fornecedor por ID
   */
  async getFornecedor(id: string) {
    try {
      const doc = await this.fastify.db
        .collection('suppliers')
        .doc(id)
        .get();

      if (!doc.exists) {
        return {
          success: false,
          error: 'Fornecedor não encontrado',
        };
      }

      return {
        success: true,
        fornecedor: {
          id: doc.id,
          ...doc.data(),
        },
      };
    } catch (error: any) {
      this.fastify.log.error('Erro ao buscar fornecedor:', error);
      throw new Error(`Erro ao buscar fornecedor: ${error.message}`);
    }
  }

  /**
   * Cria novo fornecedor
   */
  async createFornecedor(data: {
    name: string;
    contact: string;
    deliveryTime: number;
    paymentTerms: string;
  }) {
    try {
      // Validar campos obrigatórios
      if (!data.name || !data.contact || data.deliveryTime === undefined || !data.paymentTerms) {
        throw new Error('Campos obrigatórios não preenchidos');
      }

      // Validar tempo de entrega
      if (data.deliveryTime < 0) {
        throw new Error('Tempo de entrega deve ser maior ou igual a zero');
      }

      const fornecedor = {
        name: data.name,
        contact: data.contact,
        delivery_time: data.deliveryTime,
        payment_terms: data.paymentTerms,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const docRef = await this.fastify.db.collection('suppliers').add(fornecedor);

      return {
        success: true,
        fornecedor: {
          id: docRef.id,
          ...fornecedor,
        },
      };
    } catch (error: any) {
      this.fastify.log.error('Erro ao criar fornecedor:', error);
      throw new Error(`Erro ao criar fornecedor: ${error.message}`);
    }
  }

  /**
   * Atualiza fornecedor existente
   */
  async updateFornecedor(id: string, data: any) {
    try {
      const docRef = this.fastify.db.collection('suppliers').doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error('Fornecedor não encontrado');
      }

      // Validar tempo de entrega se fornecido
      if (data.deliveryTime !== undefined && data.deliveryTime < 0) {
        throw new Error('Tempo de entrega deve ser maior ou igual a zero');
      }

      // Mapear campos camelCase para snake_case
      const updateData: any = {
        updated_at: new Date(),
      };

      if (data.name !== undefined) updateData.name = data.name;
      if (data.contact !== undefined) updateData.contact = data.contact;
      if (data.deliveryTime !== undefined) updateData.delivery_time = data.deliveryTime;
      if (data.paymentTerms !== undefined) updateData.payment_terms = data.paymentTerms;

      await docRef.update(updateData);

      return {
        success: true,
        fornecedor: {
          id,
          ...updateData,
        },
      };
    } catch (error: any) {
      this.fastify.log.error('Erro ao atualizar fornecedor:', error);
      throw new Error(`Erro ao atualizar fornecedor: ${error.message}`);
    }
  }

  /**
   * Deleta fornecedor (com verificação de relacionamentos)
   */
  async deleteFornecedor(id: string) {
    try {
      // Verificar se fornecedor existe
      const doc = await this.fastify.db.collection('suppliers').doc(id).get();

      if (!doc.exists) {
        throw new Error('Fornecedor não encontrado');
      }

      // Verificar se tem ingredientes usando este fornecedor
      const ingredientsSnapshot = await this.fastify.db
        .collection('ingredients')
        .where('supplier_id', '==', id)
        .get();

      if (!ingredientsSnapshot.empty) {
        throw new Error(
          `Não é possível deletar. ${ingredientsSnapshot.size} ingredientes usam este fornecedor.`
        );
      }

      // Deletar fornecedor
      await this.fastify.db.collection('suppliers').doc(id).delete();

      return {
        success: true,
        message: 'Fornecedor deletado com sucesso',
      };
    } catch (error: any) {
      this.fastify.log.error('Erro ao deletar fornecedor:', error);
      throw new Error(`Erro ao deletar fornecedor: ${error.message}`);
    }
  }

  /**
   * Lista fichas técnicas (receitas) do Firestore
   */
  async listFichas(filters?: { category?: string; search?: string }) {
    try {
      let query = this.fastify.db.collection('recipes').orderBy('name', 'asc');

      // Aplicar filtro de categoria se fornecido
      if (filters?.category) {
        query = query.where('category', '==', filters.category);
      }

      const snapshot = await query.get();

      let fichas = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Filtro de busca (client-side)
      if (filters?.search) {
        const searchLower = filters.search.toLowerCase();
        fichas = fichas.filter(ficha =>
          ficha.name?.toLowerCase().includes(searchLower)
        );
      }

      return {
        success: true,
        fichas,
        total: fichas.length,
      };
    } catch (error: any) {
      this.fastify.log.error('Erro ao listar fichas técnicas:', error);
      throw new Error(`Erro ao listar fichas: ${error.message}`);
    }
  }

  /**
   * Busca ficha técnica por ID
   */
  async getFicha(id: string) {
    try {
      const doc = await this.fastify.db
        .collection('recipes')
        .doc(id)
        .get();

      if (!doc.exists) {
        return {
          success: false,
          error: 'Ficha técnica não encontrada',
        };
      }

      return {
        success: true,
        ficha: {
          id: doc.id,
          ...doc.data(),
        },
      };
    } catch (error: any) {
      this.fastify.log.error('Erro ao buscar ficha técnica:', error);
      throw new Error(`Erro ao buscar ficha: ${error.message}`);
    }
  }

  /**
   * Lista membros da equipe (users) do Firestore
   */
  async listEquipe() {
    try {
      const snapshot = await this.fastify.db
        .collection('users')
        .orderBy('name', 'asc')
        .get();

      const equipe = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));

      return {
        success: true,
        equipe,
        total: equipe.length,
      };
    } catch (error: any) {
      this.fastify.log.error('Erro ao listar equipe:', error);
      throw new Error(`Erro ao listar equipe: ${error.message}`);
    }
  }

  /**
   * Busca membro da equipe por ID
   */
  async getMembroEquipe(id: string) {
    try {
      const doc = await this.fastify.db
        .collection('users')
        .doc(id)
        .get();

      if (!doc.exists) {
        return {
          success: false,
          error: 'Membro da equipe não encontrado',
        };
      }

      return {
        success: true,
        membro: {
          id: doc.id,
          ...doc.data(),
        },
      };
    } catch (error: any) {
      this.fastify.log.error('Erro ao buscar membro da equipe:', error);
      throw new Error(`Erro ao buscar membro: ${error.message}`);
    }
  }

  /**
   * Cria receita mínima (apenas nome)
   * Usada quando mapeando produto sem receita existente
   */
  async createRecipe(data: { name: string; createdFrom?: string }) {
    try {
      const recipe = {
        name: data.name,
        category: 'Não categorizado',
        portions: 1,
        ingredients: [],
        totalCost: 0,
        costPerPortion: 0,
        suggestedPrice: 0,
        notes: data.createdFrom || 'Criado a partir de mapeamento. Preencher ficha técnica.',
        createdAt: new Date(),
        needsCompletion: true // Flag para indicar que falta preencher
      };

      const docRef = await this.fastify.db.collection('recipes').add(recipe);

      return {
        success: true,
        ficha: {
          id: docRef.id,
          ...recipe
        }
      };
    } catch (error: any) {
      this.fastify.log.error('Erro ao criar receita:', error);
      throw new Error(`Erro ao criar receita: ${error.message}`);
    }
  }

  /**
   * Cria ficha técnica completa
   */
  async createFichaTecnica(data: {
    name: string;
    category: string;
    portions: number;
    ingredients: Array<{ id: string; quantity: number }>;
    laborCost?: number;
    equipmentCost?: number;
    suggestedPrice: number;
    instructions?: string;
  }) {
    try {
      // Validar campos obrigatórios
      if (!data.name || !data.category || !data.portions || !data.suggestedPrice) {
        throw new Error('Campos obrigatórios não preenchidos');
      }

      if (!data.ingredients || data.ingredients.length === 0) {
        throw new Error('Adicione pelo menos um ingrediente');
      }

      // Validar valores numéricos
      if (data.portions <= 0 || data.suggestedPrice <= 0) {
        throw new Error('Valores numéricos inválidos');
      }

      // Calcular custo total dos ingredientes
      let ingredientsCost = 0;
      const enrichedIngredients = [];

      for (const item of data.ingredients) {
        const ingredientDoc = await this.fastify.db
          .collection('ingredients')
          .doc(item.id)
          .get();

        if (ingredientDoc.exists) {
          const ingredientData = ingredientDoc.data();
          const unitCost = ingredientData?.price / ingredientData?.net_qty || 0;
          const itemCost = unitCost * item.quantity;

          enrichedIngredients.push({
            id: item.id,
            name: ingredientData?.name,
            quantity: item.quantity,
            unit: ingredientData?.unit,
            unit_cost: unitCost,
            total_cost: itemCost,
          });

          ingredientsCost += itemCost;
        }
      }

      const laborCost = data.laborCost || 0;
      const equipmentCost = data.equipmentCost || 0;
      const totalCost = ingredientsCost + laborCost + equipmentCost;
      const costPerPortion = totalCost / data.portions;

      const ficha = {
        name: data.name,
        category: data.category,
        portions: data.portions,
        ingredients: enrichedIngredients,
        ingredients_cost: ingredientsCost,
        labor_cost: laborCost,
        equipment_cost: equipmentCost,
        total_cost: totalCost,
        cost_per_portion: costPerPortion,
        suggested_price: data.suggestedPrice,
        instructions: data.instructions || '',
        status: 'active',
        needs_completion: false,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const docRef = await this.fastify.db.collection('recipes').add(ficha);

      return {
        success: true,
        ficha: {
          id: docRef.id,
          ...ficha,
        },
      };
    } catch (error: any) {
      this.fastify.log.error('Erro ao criar ficha técnica:', error);
      throw new Error(`Erro ao criar ficha técnica: ${error.message}`);
    }
  }

  /**
   * Atualiza ficha técnica existente
   */
  async updateFichaTecnica(id: string, data: any) {
    try {
      const docRef = this.fastify.db.collection('recipes').doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error('Ficha técnica não encontrada');
      }

      const currentData = doc.data();
      const updateData: any = {
        updated_at: new Date(),
      };

      // Atualizar campos simples
      if (data.name !== undefined) updateData.name = data.name;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.portions !== undefined) {
        if (data.portions <= 0) throw new Error('Número de porções deve ser maior que zero');
        updateData.portions = data.portions;
      }
      if (data.suggestedPrice !== undefined) {
        if (data.suggestedPrice <= 0) throw new Error('Preço sugerido deve ser maior que zero');
        updateData.suggested_price = data.suggestedPrice;
      }
      if (data.instructions !== undefined) updateData.instructions = data.instructions;
      if (data.laborCost !== undefined) updateData.labor_cost = data.laborCost;
      if (data.equipmentCost !== undefined) updateData.equipment_cost = data.equipmentCost;

      // Se ingredientes foram atualizados, recalcular custos
      if (data.ingredients && Array.isArray(data.ingredients)) {
        let ingredientsCost = 0;
        const enrichedIngredients = [];

        for (const item of data.ingredients) {
          const ingredientDoc = await this.fastify.db
            .collection('ingredients')
            .doc(item.id)
            .get();

          if (ingredientDoc.exists) {
            const ingredientData = ingredientDoc.data();
            const unitCost = ingredientData?.price / ingredientData?.net_qty || 0;
            const itemCost = unitCost * item.quantity;

            enrichedIngredients.push({
              id: item.id,
              name: ingredientData?.name,
              quantity: item.quantity,
              unit: ingredientData?.unit,
              unit_cost: unitCost,
              total_cost: itemCost,
            });

            ingredientsCost += itemCost;
          }
        }

        updateData.ingredients = enrichedIngredients;
        updateData.ingredients_cost = ingredientsCost;
      }

      // Recalcular custos totais se houver mudanças relevantes
      const newIngredientsCost = updateData.ingredients_cost !== undefined
        ? updateData.ingredients_cost
        : currentData?.ingredients_cost || 0;
      const newLaborCost = updateData.labor_cost !== undefined
        ? updateData.labor_cost
        : currentData?.labor_cost || 0;
      const newEquipmentCost = updateData.equipment_cost !== undefined
        ? updateData.equipment_cost
        : currentData?.equipment_cost || 0;
      const newPortions = updateData.portions !== undefined
        ? updateData.portions
        : currentData?.portions || 1;

      const totalCost = newIngredientsCost + newLaborCost + newEquipmentCost;
      updateData.total_cost = totalCost;
      updateData.cost_per_portion = totalCost / newPortions;
      updateData.needs_completion = false;

      await docRef.update(updateData);

      return {
        success: true,
        ficha: {
          id,
          ...updateData,
        },
      };
    } catch (error: any) {
      this.fastify.log.error('Erro ao atualizar ficha técnica:', error);
      throw new Error(`Erro ao atualizar ficha técnica: ${error.message}`);
    }
  }

  /**
   * Remove ficha técnica (soft delete para manter auditoria)
   */
  async deleteFichaTecnica(id: string) {
    try {
      const docRef = this.fastify.db.collection('recipes').doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error('Ficha técnica não encontrada');
      }

      // Soft delete: marcar como deletado ao invés de remover
      await docRef.update({
        status: 'deleted',
        deleted_at: new Date(),
        updated_at: new Date(),
      });

      return {
        success: true,
        message: 'Ficha técnica removida',
      };
    } catch (error: any) {
      this.fastify.log.error('Erro ao deletar ficha técnica:', error);
      throw new Error(`Erro ao deletar ficha técnica: ${error.message}`);
    }
  }

  /**
   * Cria novo membro da equipe
   */
  async createMembroEquipe(data: {
    name: string;
    email: string;
    role: string;
    sector: string;
    position: string;
    shift: string;
  }) {
    try {
      // Validar campos obrigatórios
      if (!data.name || !data.email || !data.role || !data.sector || !data.position || !data.shift) {
        throw new Error('Campos obrigatórios não preenchidos');
      }

      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.email)) {
        throw new Error('Email inválido');
      }

      // Verificar se email já existe (excluindo registros deletados)
      const existingSnapshot = await this.fastify.db
        .collection('users')
        .where('email', '==', data.email)
        .get();

      const activeExists = existingSnapshot.docs.some(doc => {
        const docData = doc.data();
        return docData.status !== 'deleted';
      });

      if (activeExists) {
        throw new Error('Email já cadastrado no sistema');
      }

      const membro = {
        name: data.name,
        email: data.email,
        role: data.role,
        sector: data.sector,
        position: data.position,
        shift: data.shift,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const docRef = await this.fastify.db.collection('users').add(membro);

      return {
        success: true,
        membro: {
          id: docRef.id,
          ...membro,
        },
      };
    } catch (error: any) {
      this.fastify.log.error('Erro ao criar membro da equipe:', error);
      throw new Error(`Erro ao criar membro: ${error.message}`);
    }
  }

  /**
   * Atualiza membro da equipe existente
   */
  async updateMembroEquipe(id: string, data: any) {
    try {
      const docRef = this.fastify.db.collection('users').doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error('Membro da equipe não encontrado');
      }

      // Se email está sendo alterado, validar formato e unicidade
      if (data.email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(data.email)) {
          throw new Error('Email inválido');
        }

        // Verificar se o novo email já existe (excluindo o próprio usuário e deletados)
        const existingSnapshot = await this.fastify.db
          .collection('users')
          .where('email', '==', data.email)
          .get();

        const duplicateExists = existingSnapshot.docs.some(d => {
          const docData = d.data();
          return d.id !== id && docData.status !== 'deleted';
        });

        if (duplicateExists) {
          throw new Error('Email já cadastrado no sistema');
        }
      }

      // Mapear campos camelCase para snake_case
      const updateData: any = {
        updated_at: new Date(),
      };

      if (data.name !== undefined) updateData.name = data.name;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.role !== undefined) updateData.role = data.role;
      if (data.sector !== undefined) updateData.sector = data.sector;
      if (data.position !== undefined) updateData.position = data.position;
      if (data.shift !== undefined) updateData.shift = data.shift;

      await docRef.update(updateData);

      return {
        success: true,
        membro: {
          id,
          ...updateData,
        },
      };
    } catch (error: any) {
      this.fastify.log.error('Erro ao atualizar membro da equipe:', error);
      throw new Error(`Erro ao atualizar membro: ${error.message}`);
    }
  }

  /**
   * Remove membro da equipe (soft delete para manter auditoria)
   */
  async deleteMembroEquipe(id: string) {
    try {
      const docRef = this.fastify.db.collection('users').doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error('Membro da equipe não encontrado');
      }

      // Soft delete: marcar como deletado ao invés de remover
      await docRef.update({
        status: 'deleted',
        deleted_at: new Date(),
        updated_at: new Date(),
      });

      return {
        success: true,
        message: 'Membro removido da equipe',
      };
    } catch (error: any) {
      this.fastify.log.error('Erro ao deletar membro da equipe:', error);
      throw new Error(`Erro ao deletar membro: ${error.message}`);
    }
  }

  /**
   * Cria novo ingrediente
   */
  async createIngredient(data: {
    name: string;
    category: string;
    unit: string;
    supplierId: string;
    grossQty: number;
    netQty: number;
    price: number;
    purchaseDate: string;
    minStock: number;
    maxStock: number;
    storageCenter: string;
    expiryDate?: string;
  }) {
    try {
      // Validar campos obrigatórios
      const requiredFields = ['name', 'category', 'unit', 'supplierId', 'grossQty', 'netQty', 'price', 'purchaseDate', 'minStock', 'maxStock', 'storageCenter'];
      for (const field of requiredFields) {
        if (!data[field as keyof typeof data]) {
          throw new Error(`Campo obrigatório não preenchido: ${field}`);
        }
      }

      // Validar valores numéricos
      if (data.grossQty <= 0 || data.netQty <= 0 || data.price <= 0 || data.minStock < 0 || data.maxStock < 0) {
        throw new Error('Valores numéricos inválidos');
      }

      // Validar que netQty não é maior que grossQty
      if (data.netQty > data.grossQty) {
        throw new Error('Quantidade líquida não pode ser maior que quantidade bruta');
      }

      // Validar que maxStock não é menor que minStock
      if (data.maxStock < data.minStock) {
        throw new Error('Estoque máximo não pode ser menor que estoque mínimo');
      }

      // Calcular rendimento
      const yieldFactor = data.netQty / data.grossQty;

      const ingredient = {
        name: data.name,
        category: data.category,
        unit: data.unit,
        supplier_id: data.supplierId,
        gross_qty: data.grossQty,
        net_qty: data.netQty,
        yield_factor: yieldFactor,
        price: data.price,
        purchase_date: data.purchaseDate,
        min_stock: data.minStock,
        max_stock: data.maxStock,
        storage_center: data.storageCenter,
        expiry_date: data.expiryDate || null,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      };

      const docRef = await this.fastify.db.collection('ingredients').add(ingredient);

      return {
        success: true,
        ingredient: {
          id: docRef.id,
          ...ingredient,
        },
      };
    } catch (error: any) {
      this.fastify.log.error('Erro ao criar ingrediente:', error);
      throw new Error(`Erro ao criar ingrediente: ${error.message}`);
    }
  }

  /**
   * Atualiza ingrediente existente
   */
  async updateIngredient(id: string, data: any) {
    try {
      const docRef = this.fastify.db.collection('ingredients').doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error('Ingrediente não encontrado');
      }

      // Validar valores numéricos se fornecidos
      if (data.grossQty !== undefined && data.grossQty <= 0) {
        throw new Error('Quantidade bruta deve ser maior que zero');
      }
      if (data.netQty !== undefined && data.netQty <= 0) {
        throw new Error('Quantidade líquida deve ser maior que zero');
      }
      if (data.price !== undefined && data.price <= 0) {
        throw new Error('Preço deve ser maior que zero');
      }
      if (data.minStock !== undefined && data.minStock < 0) {
        throw new Error('Estoque mínimo não pode ser negativo');
      }
      if (data.maxStock !== undefined && data.maxStock < 0) {
        throw new Error('Estoque máximo não pode ser negativo');
      }

      const updateData: any = {
        updated_at: new Date(),
      };

      if (data.name !== undefined) updateData.name = data.name;
      if (data.category !== undefined) updateData.category = data.category;
      if (data.unit !== undefined) updateData.unit = data.unit;
      if (data.supplierId !== undefined) updateData.supplier_id = data.supplierId;
      if (data.grossQty !== undefined) updateData.gross_qty = data.grossQty;
      if (data.netQty !== undefined) updateData.net_qty = data.netQty;
      if (data.price !== undefined) updateData.price = data.price;
      if (data.purchaseDate !== undefined) updateData.purchase_date = data.purchaseDate;
      if (data.minStock !== undefined) updateData.min_stock = data.minStock;
      if (data.maxStock !== undefined) updateData.max_stock = data.maxStock;
      if (data.storageCenter !== undefined) updateData.storage_center = data.storageCenter;
      if (data.expiryDate !== undefined) updateData.expiry_date = data.expiryDate;

      // Recalcular rendimento se grossQty ou netQty mudaram
      const currentData = doc.data();
      const newGrossQty = updateData.gross_qty || currentData?.gross_qty;
      const newNetQty = updateData.net_qty || currentData?.net_qty;

      if (updateData.gross_qty !== undefined || updateData.net_qty !== undefined) {
        if (newNetQty > newGrossQty) {
          throw new Error('Quantidade líquida não pode ser maior que quantidade bruta');
        }
        updateData.yield_factor = newNetQty / newGrossQty;
      }

      // Validar minStock vs maxStock
      const newMinStock = updateData.min_stock !== undefined ? updateData.min_stock : currentData?.min_stock;
      const newMaxStock = updateData.max_stock !== undefined ? updateData.max_stock : currentData?.max_stock;

      if (newMaxStock < newMinStock) {
        throw new Error('Estoque máximo não pode ser menor que estoque mínimo');
      }

      await docRef.update(updateData);

      return {
        success: true,
        ingredient: {
          id,
          ...updateData,
        },
      };
    } catch (error: any) {
      this.fastify.log.error('Erro ao atualizar ingrediente:', error);
      throw new Error(`Erro ao atualizar ingrediente: ${error.message}`);
    }
  }

  /**
   * Remove ingrediente (soft delete para manter auditoria)
   */
  async deleteIngredient(id: string) {
    try {
      const docRef = this.fastify.db.collection('ingredients').doc(id);
      const doc = await docRef.get();

      if (!doc.exists) {
        throw new Error('Ingrediente não encontrado');
      }

      // Soft delete: marcar como deletado ao invés de remover
      await docRef.update({
        status: 'deleted',
        deleted_at: new Date(),
        updated_at: new Date(),
      });

      return {
        success: true,
        message: 'Ingrediente removido',
      };
    } catch (error: any) {
      this.fastify.log.error('Erro ao deletar ingrediente:', error);
      throw new Error(`Erro ao deletar ingrediente: ${error.message}`);
    }
  }
}
