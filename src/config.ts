/**
 * Configuração da API
 */

const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:3001');

export const config = {
  apiUrl: API_URL,
  endpoints: {
    auth: {
      setupOwner: `${API_URL}/api/auth/setup-owner`,
      invite: `${API_URL}/api/auth/invite`,
      resendInvite: `${API_URL}/api/auth/resend-invite`,
      me: `${API_URL}/api/auth/me`,
    },
    activity: {
      list: `${API_URL}/api/activity`,
    },
    vendas: {
      upload: `${API_URL}/api/vendas/upload`,
      historico: `${API_URL}/api/vendas/historico`,
      getUpload: (id: string) => `${API_URL}/api/vendas/upload/${id}`,
    },
    cadastros: {
      ingredientes: `${API_URL}/api/cadastros/ingredientes`,
      ingrediente: (id: string) => `${API_URL}/api/cadastros/ingredientes/${id}`,
      fornecedores: `${API_URL}/api/cadastros/fornecedores`,
      fornecedor: (id: string) => `${API_URL}/api/cadastros/fornecedores/${id}`,
      fichas: `${API_URL}/api/cadastros/fichas`,
      ficha: (id: string) => `${API_URL}/api/cadastros/fichas/${id}`,
      createFicha: `${API_URL}/api/cadastros/fichas`,
      fichasTecnicas: `${API_URL}/api/cadastros/fichas-tecnicas`,
      fichaTecnica: (id: string) => `${API_URL}/api/cadastros/fichas-tecnicas/${id}`,
      equipe: `${API_URL}/api/cadastros/equipe`,
      membro: (id: string) => `${API_URL}/api/cadastros/equipe/${id}`,
      storageCenters: `${API_URL}/api/cadastros/storage-centers`,
    },
    mapeamentos: {
      list: `${API_URL}/api/mapeamentos`,
      stats: `${API_URL}/api/mapeamentos/stats`,
      bySku: (sku: string) => `${API_URL}/api/mapeamentos/sku/${sku}`,
      update: (sku: string) => `${API_URL}/api/mapeamentos/${sku}`,
    },
    alertas: {
      list: `${API_URL}/api/alertas`,
      stats: `${API_URL}/api/alertas/stats`,
      detalhe: (id: string) => `${API_URL}/api/alertas/${id}`,
      create: `${API_URL}/api/alertas`,
    },
    dashboard: {
      resumo: `${API_URL}/api/dashboard/resumo`,
      ingredientesAbaixoMinimo: `${API_URL}/api/dashboard/ingredientes-abaixo-minimo`,
      receitaDiaria: `${API_URL}/api/dashboard/receita-diaria`,
    },
    checklists: {
      tasks: `${API_URL}/api/checklists/tasks`,
      task: (id: string) => `${API_URL}/api/checklists/tasks/${id}`,
      applyTemplate: `${API_URL}/api/checklists/tasks/apply-template`,
      templates: `${API_URL}/api/checklists/templates`,
    },
    relatorios: {
      vendasPorProduto: `${API_URL}/api/relatorios/vendas-por-produto`,
      estoqueValor: `${API_URL}/api/relatorios/estoque-valor`,
    },
    operacoes: {
      // Purchases (Pedidos)
      purchases: `${API_URL}/api/operacoes/purchases`,
      purchase: (id: string) => `${API_URL}/api/operacoes/purchases/${id}`,

      // Receivings (Recebimentos)
      receivings: `${API_URL}/api/operacoes/receivings`,
      receiving: (id: string) => `${API_URL}/api/operacoes/receivings/${id}`,
      uploadReceivingPhoto: (id: string) => `${API_URL}/api/operacoes/receivings/${id}/upload-photo`,
      updateChecklistItem: (id: string, itemIndex: number) =>
        `${API_URL}/api/operacoes/receivings/${id}/checklist/${itemIndex}`,
      completeReceiving: (id: string) => `${API_URL}/api/operacoes/receivings/${id}/complete`,

      // Inventory Counts (Contagens de Inventário)
      inventoryCounts: `${API_URL}/api/operacoes/inventory-counts`,
      inventoryCount: (id: string) => `${API_URL}/api/operacoes/inventory-counts/${id}`,
      completeInventoryCount: (id: string) =>
        `${API_URL}/api/operacoes/inventory-counts/${id}/complete`,

      // Stock Movements (Movimentações de Estoque - Audit Trail)
      stockMovements: `${API_URL}/api/operacoes/stock-movements`,
    },
    estoque: {
      // Current Stock View
      current: `${API_URL}/api/estoque/current`,
      ingredientMovements: (id: string) => `${API_URL}/api/estoque/ingredients/${id}/movements`,
      adjustStock: (id: string) => `${API_URL}/api/estoque/ingredients/${id}/adjust`,

      // Draft Orders (Rascunhos)
      draftOrders: `${API_URL}/api/estoque/draft-orders`,
      draftOrder: (id: string) => `${API_URL}/api/estoque/draft-orders/${id}`,
      finalizeDraft: (id: string) => `${API_URL}/api/estoque/draft-orders/${id}/finalize`,
    },
  },
};
