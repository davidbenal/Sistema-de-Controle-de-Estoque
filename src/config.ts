/**
 * Configuração da API
 */

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const config = {
  apiUrl: API_URL,
  endpoints: {
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
    },
  },
};
