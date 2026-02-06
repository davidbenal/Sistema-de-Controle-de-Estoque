# Product Requirements Document (PRD) - Sistema de Gestão de Restaurantes

## 1. Visão Geral
Sistema web para gestão integral de restaurantes, focado em controle de custos, estoque, operações e vendas. A aplicação visa centralizar informações de diferentes setores (Administrativo, Operacional e Gerencial) para facilitar a tomada de decisão.

## 2. Tecnologias
- **Frontend:** React, TypeScript
- **UI Kit:** Radix UI (Shadcn UI), Tailwind CSS
- **Ícones:** Lucide React
- **Navegação:** React Router

## 3. Módulos e Funcionalidades

### 3.1. Dashboard
- Visão geral de indicadores de desempenho (KPIs).
- Atalhos para funcionalidades principais.

### 3.2. Cadastros (Backoffice)
Gerenciamento das entidades base do sistema.
- **Entidades:**
  - **Insumos:** Cadastro de matérias-primas com unidades de medida e preços.
  - **Fornecedores:** Gestão de parceiros comerciais.
  - **Fichas Técnicas:** Composição de pratos e custos teóricos.
  - **Equipe:** Cadastro de colaboradores e permissões.
- **Funcionalidades:**
  - Listagem com filtros.
  - **Criação/Edição:** Formulários dedicados via Modal.
  - **Visualização de Detalhes (Novo):** Modais "somente leitura" para consulta segura de histórico de preços, composição e dados cadastrais sem risco de edição acidental.

### 3.3. Operações
Controle do fluxo diário de insumos e mercadorias.
- **Pedidos de Compra:**
  - Criação de pedidos para fornecedores.
  - **Visualização de Detalhes:** Consulta completa do pedido, status e totais.
- **Recebimentos:**
  - Conferência de mercadoria na chegada (Cega ou com base em pedido).
  - Upload de fotos de notas fiscais e itens danificados.
  - **Visualização de Detalhes:** Conferência visual de itens aceitos, recusados e validações.
- **Inventário:**
  - Contagem física de estoque (Cozinha, Bar, etc.).
  - **Visualização de Detalhes:** Comparativo entre Estoque Sistema vs. Contagem Física com cálculo de divergências.

### 3.4. Vendas (Integração)
Conciliação de vendas importadas do PDV (ex: Zig).
- **Importação:** Upload de arquivos CSV/Excel de vendas.
- **Histórico:** Log de importações realizadas.
- **Visualização de Detalhes (Novo):** Detalhamento do arquivo processado, com resumo financeiro, status de sucesso/erro e amostra dos itens importados.

### 3.5. Checklists e Relatórios
- **Checklists:** Rotinas de verificação (abertura, fechamento, limpeza).
- **Relatórios:** DRE gerencial, Curva ABC, CMV teórico vs. Real.

## 4. Requisitos Não Funcionais
- **Usabilidade:** Interface limpa e responsiva.
- **Acessibilidade:** Componentes compatíveis com leitores de tela (uso correto de DialogTitles e roles).
- **Segurança:** Segregação de funcionalidades por perfil (Admin, Gerente, Operação) - *Em implementação*.

## 5. Histórico de Atualizações Recentes
- **[Feature] Detalhes em Cadastros:** Implementação de visualização "Read-Only" para Insumos, Fornecedores, Fichas e Equipe.
- **[Feature] Detalhes em Operações:** Modais de consulta para Pedidos, Recebimentos e Inventários.
- **[Feature] Detalhes em Vendas:** Visualização detalhada de logs de importação de vendas.
- **[Fix] Acessibilidade:** Correção de avisos do Radix UI (`DialogContent` requires `DialogTitle`) em todos os modais.