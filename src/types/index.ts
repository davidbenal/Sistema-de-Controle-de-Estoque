// Tipos de usuário e permissões
export type UserRole = 'administrador' | 'gerencia' | 'operacao';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

// Insumos
export interface Supplier {
  id: string;
  name: string;
  contact: string;
  deliveryTime: number; // dias
  paymentTerms: string;
}

export interface Ingredient {
  id: string;
  name: string;
  category: 'perecivel' | 'nao-perecivel' | 'bebida' | 'limpeza' | 'descartavel';
  unit: string;
  grossQuantity: number;
  netQuantity: number;
  yieldFactor: number;
  price: number;
  supplierId: string;
  purchaseDate: string;
  minStock: number;
  maxStock: number;
  currentStock: number;
  expiryDate?: string;
  storageCenter: string;
}

// Fichas técnicas
export interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
  unit: string;
}

export interface Recipe {
  id: string;
  name: string;
  category: string;
  portions: number;
  ingredients: RecipeIngredient[];
  totalCost: number;
  costPerPortion: number;
  suggestedPrice: number;
  laborCost?: number;
  equipmentCost?: number;
  instructions?: string;
}

// Pedidos e recebimentos
export interface PurchaseOrder {
  id: string;
  supplierId: string;
  date: string;
  expectedDelivery: string;
  status: 'pendente' | 'parcial' | 'recebido' | 'cancelado';
  items: {
    ingredientId: string;
    quantity: number;
    unitPrice: number;
  }[];
  total: number;
}

export interface Receipt {
  id: string;
  purchaseOrderId?: string;
  supplierId: string;
  date: string;
  items: {
    ingredientId: string;
    quantityOrdered: number;
    quantityReceived: number;
    condition: 'ok' | 'danificado' | 'vencido';
    expiryDate?: string;
  }[];
  images: string[];
  receiptImage?: string;
  registeredBy: string;
  validatedBy?: string;
  status: 'pendente' | 'aprovado' | 'rejeitado';
}

// Inventário
export interface InventoryCount {
  id: string;
  date: string;
  storageCenter: string;
  items: {
    ingredientId: string;
    theoreticalStock: number;
    countedStock: number;
    variance: number;
    variancePercentage: number;
  }[];
  countedBy: string;
  validatedBy?: string;
  status: 'pendente' | 'validado' | 'revisao';
}

// Checklists
export interface ChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  completedBy?: string;
  completedAt?: string;
}

export interface Checklist {
  id: string;
  name: string;
  area: 'cozinha-quente' | 'cozinha-fria' | 'bar' | 'salao';
  date: string;
  items: ChecklistItem[];
  status: 'pendente' | 'em-progresso' | 'concluido';
}

// Alertas
export interface Alert {
  id: string;
  type: 'estoque-minimo' | 'validade-proxima' | 'divergencia-inventario' | 'pedido-atrasado';
  severity: 'baixa' | 'media' | 'alta';
  message: string;
  ingredientId?: string;
  date: string;
  resolved: boolean;
}

// Relatórios
export interface SalesReport {
  date: string;
  recipeId: string;
  quantity: number;
}

export interface WasteReport {
  date: string;
  ingredientId: string;
  quantity: number;
  reason: string;
}
