import {
  Ingredient,
  Supplier,
  Recipe,
  PurchaseOrder,
  Receipt,
  InventoryCount,
  Checklist,
  Alert,
  SalesReport,
  WasteReport,
} from '../types';

// Usuários e Equipe
export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'administrador' | 'gerencia' | 'operacao';
  sector: 'cozinha' | 'bar' | 'salao' | 'admin';
  position: string; // ex: Chef, Garçom, Barman
  shift: 'manha' | 'noite' | 'integral';
  status: 'ativo' | 'inativo' | 'ferias';
  admissionDate: string;
}

export const teamMembers: TeamMember[] = [
  {
    id: 'u1',
    name: 'João Silva',
    email: 'admin@restaurante.com',
    role: 'administrador',
    sector: 'admin',
    position: 'Sócio Proprietário',
    shift: 'integral',
    status: 'ativo',
    admissionDate: '2024-01-15',
  },
  {
    id: 'u2',
    name: 'Maria Santos',
    email: 'gerente@restaurante.com',
    role: 'gerencia',
    sector: 'admin',
    position: 'Gerente Geral',
    shift: 'integral',
    status: 'ativo',
    admissionDate: '2024-03-10',
  },
  {
    id: 'u3',
    name: 'Pedro Costa',
    email: 'cozinha@restaurante.com',
    role: 'operacao',
    sector: 'cozinha',
    position: 'Chef de Cozinha',
    shift: 'noite',
    status: 'ativo',
    admissionDate: '2024-05-20',
  },
  {
    id: 'u4',
    name: 'Ana Lima',
    email: 'bar@restaurante.com',
    role: 'operacao',
    sector: 'bar',
    position: 'Bartender Líder',
    shift: 'noite',
    status: 'ativo',
    admissionDate: '2024-06-01',
  },
  {
    id: 'u5',
    name: 'Carlos Oliveira',
    email: 'salao@restaurante.com',
    role: 'operacao',
    sector: 'salao',
    position: 'Garçom',
    shift: 'manha',
    status: 'ferias',
    admissionDate: '2024-08-15',
  },
];

// Fornecedores
export const suppliers: Supplier[] = [
  {
    id: 'f1',
    name: 'Hortifruti São José',
    contact: '(11) 98765-4321',
    deliveryTime: 1,
    paymentTerms: 'À vista',
  },
  {
    id: 'f2',
    name: 'Distribuidora Carnes Premium',
    contact: '(11) 97654-3210',
    deliveryTime: 2,
    paymentTerms: '7 dias',
  },
  {
    id: 'f3',
    name: 'Bebidas & Cia',
    contact: '(11) 96543-2109',
    deliveryTime: 1,
    paymentTerms: '14 dias',
  },
  {
    id: 'f4',
    name: 'Empório Temperos',
    contact: '(11) 95432-1098',
    deliveryTime: 3,
    paymentTerms: 'À vista',
  },
];

// Insumos
export const ingredients: Ingredient[] = [
  {
    id: 'i1',
    name: 'Tomate',
    category: 'perecivel',
    unit: 'kg',
    grossQuantity: 10,
    netQuantity: 8.5,
    yieldFactor: 0.85,
    price: 45.0,
    supplierId: 'f1',
    purchaseDate: '2026-01-28',
    minStock: 5,
    maxStock: 20,
    currentStock: 4.2,
    expiryDate: '2026-02-05',
    storageCenter: 'cozinha',
  },
  {
    id: 'i2',
    name: 'Alface Americana',
    category: 'perecivel',
    unit: 'unidade',
    grossQuantity: 24,
    netQuantity: 20,
    yieldFactor: 0.83,
    price: 72.0,
    supplierId: 'f1',
    purchaseDate: '2026-01-29',
    minStock: 10,
    maxStock: 40,
    currentStock: 8,
    expiryDate: '2026-02-03',
    storageCenter: 'cozinha-fria',
  },
  {
    id: 'i3',
    name: 'Filé Mignon',
    category: 'perecivel',
    unit: 'kg',
    grossQuantity: 5,
    netQuantity: 4.8,
    yieldFactor: 0.96,
    price: 349.0,
    supplierId: 'f2',
    purchaseDate: '2026-01-27',
    minStock: 3,
    maxStock: 10,
    currentStock: 6.5,
    expiryDate: '2026-02-08',
    storageCenter: 'cozinha',
  },
  {
    id: 'i4',
    name: 'Cerveja Pilsen 350ml',
    category: 'bebida',
    unit: 'unidade',
    grossQuantity: 120,
    netQuantity: 120,
    yieldFactor: 1.0,
    price: 240.0,
    supplierId: 'f3',
    purchaseDate: '2026-01-30',
    minStock: 50,
    maxStock: 200,
    currentStock: 145,
    expiryDate: '2026-07-15',
    storageCenter: 'bar',
  },
  {
    id: 'i5',
    name: 'Azeite Extra Virgem',
    category: 'nao-perecivel',
    unit: 'litro',
    grossQuantity: 3,
    netQuantity: 3,
    yieldFactor: 1.0,
    price: 89.7,
    supplierId: 'f4',
    purchaseDate: '2026-01-25',
    minStock: 2,
    maxStock: 8,
    currentStock: 4.5,
    storageCenter: 'despensa',
  },
  {
    id: 'i6',
    name: 'Sal Grosso',
    category: 'nao-perecivel',
    unit: 'kg',
    grossQuantity: 5,
    netQuantity: 5,
    yieldFactor: 1.0,
    price: 15.0,
    supplierId: 'f4',
    purchaseDate: '2026-01-20',
    minStock: 3,
    maxStock: 10,
    currentStock: 7.2,
    storageCenter: 'despensa',
  },
  {
    id: 'i7',
    name: 'Batata Inglesa',
    category: 'perecivel',
    unit: 'kg',
    grossQuantity: 20,
    netQuantity: 18,
    yieldFactor: 0.9,
    price: 60.0,
    supplierId: 'f1',
    purchaseDate: '2026-01-29',
    minStock: 10,
    maxStock: 30,
    currentStock: 12.5,
    expiryDate: '2026-02-12',
    storageCenter: 'despensa',
  },
  {
    id: 'i8',
    name: 'Cebola',
    category: 'perecivel',
    unit: 'kg',
    grossQuantity: 8,
    netQuantity: 7.2,
    yieldFactor: 0.9,
    price: 24.0,
    supplierId: 'f1',
    purchaseDate: '2026-01-28',
    minStock: 5,
    maxStock: 15,
    currentStock: 3.8,
    expiryDate: '2026-02-15',
    storageCenter: 'despensa',
  },
];

// Fichas técnicas
export const recipes: Recipe[] = [
  {
    id: 'p1',
    name: 'Filé ao Molho Madeira',
    category: 'Pratos Principais',
    portions: 1,
    ingredients: [
      { ingredientId: 'i3', quantity: 0.25, unit: 'kg' },
      { ingredientId: 'i8', quantity: 0.05, unit: 'kg' },
      { ingredientId: 'i5', quantity: 0.02, unit: 'litro' },
      { ingredientId: 'i6', quantity: 0.005, unit: 'kg' },
    ],
    totalCost: 19.85,
    costPerPortion: 19.85,
    suggestedPrice: 65.0,
    laborCost: 5.0,
    equipmentCost: 2.0,
  },
  {
    id: 'p2',
    name: 'Salada Caesar',
    category: 'Entradas',
    portions: 1,
    ingredients: [
      { ingredientId: 'i2', quantity: 0.2, unit: 'unidade' },
      { ingredientId: 'i1', quantity: 0.05, unit: 'kg' },
      { ingredientId: 'i5', quantity: 0.015, unit: 'litro' },
    ],
    totalCost: 4.28,
    costPerPortion: 4.28,
    suggestedPrice: 22.0,
    laborCost: 2.5,
  },
  {
    id: 'p3',
    name: 'Batatas Rústicas',
    category: 'Acompanhamentos',
    portions: 1,
    ingredients: [
      { ingredientId: 'i7', quantity: 0.3, unit: 'kg' },
      { ingredientId: 'i5', quantity: 0.02, unit: 'litro' },
      { ingredientId: 'i6', quantity: 0.005, unit: 'kg' },
    ],
    totalCost: 1.6,
    costPerPortion: 1.6,
    suggestedPrice: 12.0,
    laborCost: 1.5,
  },
];

// Pedidos de compra
export const purchaseOrders: PurchaseOrder[] = [
  {
    id: 'po1',
    supplierId: 'f1',
    date: '2026-01-30',
    expectedDelivery: '2026-02-01',
    status: 'pendente',
    items: [
      { ingredientId: 'i1', quantity: 15, unitPrice: 4.5 },
      { ingredientId: 'i2', quantity: 30, unitPrice: 3.0 },
      { ingredientId: 'i8', quantity: 10, unitPrice: 3.0 },
    ],
    total: 165.0,
  },
  {
    id: 'po2',
    supplierId: 'f2',
    date: '2026-01-29',
    expectedDelivery: '2026-01-31',
    status: 'recebido',
    items: [{ ingredientId: 'i3', quantity: 5, unitPrice: 69.8 }],
    total: 349.0,
  },
];

// Recebimentos
export const receipts: Receipt[] = [
  {
    id: 'r1',
    purchaseOrderId: 'po2',
    supplierId: 'f2',
    date: '2026-01-31',
    items: [
      {
        ingredientId: 'i3',
        quantityOrdered: 5,
        quantityReceived: 5,
        condition: 'ok',
        expiryDate: '2026-02-08',
      },
    ],
    images: [],
    registeredBy: 'Pedro Costa',
    validatedBy: 'Maria Santos',
    status: 'aprovado',
  },
];

// Inventários
export const inventoryCounts: InventoryCount[] = [
  {
    id: 'inv1',
    date: '2026-02-01',
    storageCenter: 'cozinha',
    items: [
      {
        ingredientId: 'i1',
        theoreticalStock: 5.0,
        countedStock: 4.2,
        variance: -0.8,
        variancePercentage: -16.0,
      },
      {
        ingredientId: 'i3',
        theoreticalStock: 6.5,
        countedStock: 6.5,
        variance: 0,
        variancePercentage: 0,
      },
    ],
    countedBy: 'Pedro Costa',
    validatedBy: 'Maria Santos',
    status: 'validado',
  },
  {
    id: 'inv2',
    date: '2026-02-01',
    storageCenter: 'bar',
    items: [
      {
        ingredientId: 'i4',
        theoreticalStock: 150,
        countedStock: 145,
        variance: -5,
        variancePercentage: -3.33,
      },
    ],
    countedBy: 'Ana Lima',
    status: 'pendente',
  },
];

// Checklists
export interface Task {
  id: string;
  title: string;
  completed: boolean;
  assignedTo: string; // ID do usuário
  dueDate: string;
  origin: 'manual' | 'template' | 'ia';
  templateId?: string;
  completedAt?: string;
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  role: string; // 'cozinha', 'bar', etc
  tasks: string[];
}

export const tasks: Task[] = [
  // Pedro Costa (Cozinha - u3)
  {
    id: 't1',
    title: 'Verificar temperatura dos refrigeradores',
    completed: true,
    assignedTo: 'u3',
    dueDate: '2026-02-01',
    origin: 'template',
    completedAt: '2026-02-01T08:30:00',
  },
  {
    id: 't2',
    title: 'Organizar mise en place para jantar',
    completed: false,
    assignedTo: 'u3',
    dueDate: '2026-02-01',
    origin: 'manual',
  },
  // Ana Lima (Bar - u4)
  {
    id: 't3',
    title: 'Contagem de garrafas abertas',
    completed: false,
    assignedTo: 'u4',
    dueDate: '2026-02-01',
    origin: 'template',
  },
  {
    id: 't4',
    title: 'Repor limão e gelo',
    completed: true,
    assignedTo: 'u4',
    dueDate: '2026-02-01',
    origin: 'manual',
    completedAt: '2026-02-01T18:00:00',
  },
];

export const checklistTemplates: ChecklistTemplate[] = [
  {
    id: 'tpl1',
    name: 'Abertura de Cozinha',
    role: 'cozinha',
    tasks: ['Ligar fornos e chapas', 'Sanitizar bancadas', 'Verificar validade de molhos'],
  },
  {
    id: 'tpl2',
    name: 'Fechamento de Bar',
    role: 'bar',
    tasks: ['Lavar tapetes de borracha', 'Lacrar garrafas', 'Limpar máquina de café'],
  },
  {
    id: 'tpl3',
    name: 'Freelancer - Extra Jantar',
    role: 'cozinha',
    tasks: ['Apoiar na praça de saladas', 'Lavar louça acumulada', 'Organizar estoque seco'],
  },
];

export const checklists: any[] = []; // Deprecated in favor of tasks


// Alertas
export const alerts: Alert[] = [
  {
    id: 'a1',
    type: 'estoque-minimo',
    severity: 'alta',
    message: 'Tomate abaixo do estoque mínimo (4.2kg / mín. 5kg)',
    ingredientId: 'i1',
    date: '2026-02-01',
    resolved: false,
  },
  {
    id: 'a2',
    type: 'estoque-minimo',
    severity: 'alta',
    message: 'Alface Americana abaixo do estoque mínimo (8 unidades / mín. 10)',
    ingredientId: 'i2',
    date: '2026-02-01',
    resolved: false,
  },
  {
    id: 'a3',
    type: 'validade-proxima',
    severity: 'media',
    message: 'Alface Americana vence em 2 dias (03/02/2026)',
    ingredientId: 'i2',
    date: '2026-02-01',
    resolved: false,
  },
  {
    id: 'a4',
    type: 'divergencia-inventario',
    severity: 'media',
    message: 'Divergência de 16% no inventário de Tomate',
    ingredientId: 'i1',
    date: '2026-02-01',
    resolved: false,
  },
  {
    id: 'a5',
    type: 'estoque-minimo',
    severity: 'alta',
    message: 'Cebola abaixo do estoque mínimo (3.8kg / mín. 5kg)',
    ingredientId: 'i8',
    date: '2026-02-01',
    resolved: false,
  },
];

// Vendas (para relatórios)
export const salesData: SalesReport[] = [
  { date: '2026-01-25', recipeId: 'p1', quantity: 12 },
  { date: '2026-01-25', recipeId: 'p2', quantity: 8 },
  { date: '2026-01-25', recipeId: 'p3', quantity: 15 },
  { date: '2026-01-26', recipeId: 'p1', quantity: 15 },
  { date: '2026-01-26', recipeId: 'p2', quantity: 10 },
  { date: '2026-01-26', recipeId: 'p3', quantity: 18 },
  { date: '2026-01-27', recipeId: 'p1', quantity: 10 },
  { date: '2026-01-27', recipeId: 'p2', quantity: 6 },
  { date: '2026-01-27', recipeId: 'p3', quantity: 12 },
  { date: '2026-01-28', recipeId: 'p1', quantity: 8 },
  { date: '2026-01-28', recipeId: 'p2', quantity: 5 },
  { date: '2026-01-28', recipeId: 'p3', quantity: 10 },
  { date: '2026-01-29', recipeId: 'p1', quantity: 14 },
  { date: '2026-01-29', recipeId: 'p2', quantity: 9 },
  { date: '2026-01-29', recipeId: 'p3', quantity: 16 },
  { date: '2026-01-30', recipeId: 'p1', quantity: 18 },
  { date: '2026-01-30', recipeId: 'p2', quantity: 12 },
  { date: '2026-01-30', recipeId: 'p3', quantity: 20 },
  { date: '2026-01-31', recipeId: 'p1', quantity: 20 },
  { date: '2026-01-31', recipeId: 'p2', quantity: 14 },
  { date: '2026-01-31', recipeId: 'p3', quantity: 22 },
];

// Desperdício
export const wasteData: WasteReport[] = [
  {
    date: '2026-01-28',
    ingredientId: 'i2',
    quantity: 2,
    reason: 'Folhas murchas',
  },
  {
    date: '2026-01-29',
    ingredientId: 'i1',
    quantity: 0.5,
    reason: 'Tomates amassados',
  },
  {
    date: '2026-01-30',
    ingredientId: 'i2',
    quantity: 1.5,
    reason: 'Oxidação',
  },
];
