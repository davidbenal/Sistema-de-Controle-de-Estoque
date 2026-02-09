# Backlog MVP - Sistema de Controle de Estoque Montuvia

**Criado:** 2026-02-07
**Ultima atualizacao:** 2026-02-08
**Status geral:** MVP COMPLETO (Todas as etapas concluidas)

---

## Resumo de Progresso

| Etapa | Descricao | Status | Itens | Concluidos |
|-------|-----------|--------|-------|------------|
| 1 | Crashes e erros de runtime | Concluido | 7 | 7 |
| 2 | Recebimento de pedido | Concluido | 3 | 3 |
| 3 | Inventario / Conferencia fisica | Concluido | 4 | 4 |
| 4 | Pedidos de compra | Concluido | 2 | 2 |
| 5 | Cadastros (UX) | Concluido | 3 | 3 |
| 6 | Checklists | Concluido | 5 | 5 |
| 7 | Importacao de vendas | Concluido | 3 | 3 |
| 8 | Dashboard link inventario | Concluido | 1 | 1 |
| 9 | Estoque - Fixes criticos | Concluido | 3 | 3 |
| 10 | Centros de armazenamento | Concluido | 4 | 4 |

---

## ETAPA 1: Crashes e Erros de Runtime
> **Prioridade:** MAXIMA
> **Objetivo:** Eliminar todos os crashes que impedem navegacao basica
> **Teste de validacao:** Navegar por todas as telas sem erros no console. Abrir detalhes de pedidos, recebimentos e importacoes sem crash.

### 1.1 PurchaseOrderDetails.tsx - toFixed() em undefined
**Arquivo:** `src/components/operacoes/PurchaseOrderDetails.tsx`
**Erro:** `Cannot read properties of undefined (reading 'toFixed')`

- [x] Linha 68: `data.total.toFixed(2)` -> fallback seguro com `(data.total ?? data.total_value ?? 0).toFixed(2)`
- [x] Linha 97: `item.unitPrice.toFixed(2)` -> fallback com `(item.unitPrice ?? item.unit_price ?? 0).toFixed(2)`
- [x] Linha 98: calculo `quantity * unitPrice` com fallback
- [x] Linha 106: `data.total.toFixed(2)` -> mesmo fix da 68
- [x] Linha 35: `new Date(data.date)` -> safe parse com `data.date || data.order_date` + Firestore timestamp handling
- [x] Linha 58: `new Date(data.expectedDelivery)` -> safe parse com `data.expectedDelivery || data.expected_delivery` + Firestore timestamp handling

### 1.2 ImportDetails.tsx - toLocaleString() em undefined
**Arquivo:** `src/components/vendas/ImportDetails.tsx`
**Erro:** `Cannot read properties of undefined (reading 'toLocaleString')`

- [x] Linha 69: `data.total.toLocaleString()` -> `(data.total ?? 0).toLocaleString('pt-BR', ...)`

### 1.3 Operacoes.tsx - toFixed() sem optional chaining
**Arquivo:** `src/pages/Operacoes.tsx`

- [x] Linha 854: `receipt.adjustment_value.toFixed(2)` -> `(receipt.adjustment_value ?? 0).toFixed(2)`

### 1.4 Auditoria global de numeric formatting
- [x] Buscar todos os `.toFixed(` e `.toLocaleString(` em `src/` e garantir safe access
- [x] Arquivos corrigidos: DraftOrderCard, Cadastros (ingredient.price, recipe.suggestedPrice), ReceivingChecklist, RecipeDetails (7 campos)

### 1.5 Dashboard - purchases endpoint retornando 500
**Arquivos:** `backend/src/services/operacoes.ts`, `src/components/Dashboard.tsx`

- [x] Movido filtro de status para client-side no `listPurchases()` (evita composite index Firestore)
- [x] Dashboard: `safeFetch()` wrapper em ambos ManagerDashboard e OperationsDashboard para nao quebrar se um endpoint falhar

### Notas da sessao:
- Sessao 2: Todos os 7 itens corrigidos. Build limpo (vite build OK).
- PurchaseOrderDetails: safe date parse com Firestore timestamp support + dual-case fallbacks em todos campos numericos
- Auditoria global: 12+ arquivos verificados, 10 correcoes em DraftOrderCard, Cadastros, ReceivingChecklist, RecipeDetails
- Dashboard: safeFetch wrapper isola falhas individuais de endpoint - sem mais crash no carregamento
- Backend listPurchases: filtro de status movido para client-side (evita necessidade de composite index no Firestore)

---

## ETAPA 2: Tela de Recebimento de Pedido
> **Prioridade:** Alta
> **Objetivo:** Fluxo de recebimento funcional sem erros
> **Teste de validacao:** Criar pedido -> abrir recebimento -> conferir itens -> foto opcional -> completar sem erros

### 2.1 Upload de foto NF retornando 500
**Arquivos:** `backend/src/routes/operacoes.ts` (~linha 195), `backend/src/services/operacoes.ts`

- [x] Investigar causa do 500 no `POST /api/operacoes/receivings/:id/upload-photo`
- [x] Possiveis causas: Firebase Storage bucket nao configurado, permissoes, path incorreto
- [x] Se Storage nao configurado: implementar fallback ou skip gracioso

### 2.2 Foto da NF nao obrigatoria + alerta automatico
**Arquivos:** `backend/src/services/operacoes.ts`, `src/components/operacoes/ReceiptDetails.tsx`

- [x] Permitir `completeReceiving` sem foto (nao bloquear)
- [x] Se completar sem foto: criar alerta `nota_fiscal_pendente` para gerente
- [x] Sugerir tarefa no Checklists para inclusao da foto depois

### 2.3 Checkbox de itens recebidos desmarcavel
**Arquivo:** `src/components/operacoes/ReceivingChecklist.tsx`

- [x] Verificar se checkbox permite toggle bidirecional (checked <-> unchecked)
- [x] Se nao permite, adicionar logica para desfazer conferencia do item

### Notas da sessao:
- Sessao 3: Todos os 3 itens concluidos. Build limpo (vite build OK).
- 2.1: uploadInvoicePhoto agora detecta Storage nao configurado e retorna erro claro em vez de 500 generico
- 2.2: Backend completeReceiving removeu exigencia de foto. Se completar sem foto, cria alerta `nota_fiscal_pendente` automatico na collection `alerts`. Frontend atualizado: texto "Recomendado (opcional)", botao "Completar" habilitado sem foto, toast informativo
- 2.3: Botao "Editar" adicionado em itens ja conferidos no ReceivingChecklist, permitindo reabrir formulario e alterar conferencia

---

## ETAPA 3: Tela de Inventario / Conferencia Fisica
> **Prioridade:** Media
> **Objetivo:** Formulario simplificado com busca, filtros e ordenacao
> **Teste de validacao:** Abrir inventario -> buscar item por nome -> filtrar por categoria -> ordenar -> submeter contagem

### 3.1 Remover distincao de tipo de contagem
**Arquivo:** `src/components/operacoes/StartInventoryCountForm.tsx` (linhas 146-167)

- [x] Remover RadioGroup de tipo (full/partial/spot)
- [x] Definir `countType = 'full'` fixo no handleSubmit

### 3.2 Barra de pesquisa na lista de itens
**Arquivo:** `src/components/operacoes/StartInventoryCountForm.tsx`

- [x] Adicionar `Input` de busca antes da tabela
- [x] Filtrar `items` por `ingredientName` em tempo real

### 3.3 Botao de filtro
**Arquivo:** `src/components/operacoes/StartInventoryCountForm.tsx`

- [x] Filtros: categoria, status de divergencia (todos / com falta / com sobra / sem divergencia)

### 3.4 Botao de ordenacao
**Arquivo:** `src/components/operacoes/StartInventoryCountForm.tsx`

- [x] Opcoes: nome (A-Z, Z-A), quantidade sistema, diferenca (maior/menor)

### Notas da sessao:
- Sessao 8: Todos os 4 itens concluidos. Build limpo.
- 3.1: RadioGroup removido, countType='full' fixo no handleSubmit
- 3.2: Input de busca com icone Search, filtragem client-side por ingredientName
- 3.3: Select de categoria (derivado dos itens) + Select de divergencia (todos/com falta/com sobra/sem divergencia)
- 3.4: Select de ordenacao com 5 opcoes: nome A-Z, nome Z-A, qtd sistema, maior diferenca, menor diferenca
- Stats grid adicionado: total itens, contados, com falta, com sobra, total diferencas

---

## ETAPA 4: Tela de Pedidos de Compra
> **Prioridade:** Media
> **Objetivo:** Filtros funcionais e formulario com addicao inline de itens
> **Teste de validacao:** Filtrar por "recebidos" e nao ver pendentes. Criar pedido preenchendo itens inline sem usar botao "adicionar".

### 4.1 Filtro "recebidos" exibindo pedidos pendentes
**Arquivo:** `src/pages/Operacoes.tsx` (linhas 711-767)

- [x] O `statusFilter` e local mas nao filtra o array `purchases`
- [x] Implementar filtro client-side: `filteredPurchases` computed com mapeamento de status
- [x] Garantir mapeamento correto: `pending` -> status Firestore `pending`, `received` -> `completed`/`received`

### 4.2 Remover botao "Adicionar Item" -> linha inline
**Arquivo:** `src/components/operacoes/PurchaseOrderForm.tsx` (linhas 196-209)

- [x] Remover botao `<Button onClick={addItem}>Adicionar Item</Button>`
- [x] Manter sempre uma linha vazia no final com placeholder "Selecione um ingrediente..."
- [x] Quando ultima linha for preenchida (ingrediente selecionado), auto-adicionar nova linha vazia

### Notas da sessao:
- Sessao 10: Todos os 2 itens concluidos. Build limpo (vite build OK).
- 4.1: `filteredPurchases` computed variable adicionada em Operacoes.tsx. Filtra por status: `pending` mapeia para status Firestore `pending`, `received` mapeia para `completed` ou `received`. CardDescription e lista de pedidos usam `filteredPurchases` em vez de `purchases`.
- 4.2: Botao "Adicionar Item" removido do PurchaseOrderForm. handleIngredientChange auto-adiciona linha vazia quando ultima linha e preenchida. removeItem garante que sempre sobra pelo menos uma linha vazia. Placeholder atualizado para "Selecione um ingrediente...".

---

## ETAPA 5: Tela de Cadastros
> **Prioridade:** Media
> **Objetivo:** Visualizacao lista como padrao, cliques consistentes, ficha de insumo acessivel
> **Teste de validacao:** Abrir cadastros -> ver em lista -> clicar nome de qualquer item -> abrir ficha de detalhes

### 5.1 View mode padrao = lista
**Arquivo:** `src/pages/Cadastros.tsx` (linha 45)

- [x] Mudar `useState<'cards' | 'list'>('cards')` para `useState<'cards' | 'list'>('list')`

### 5.2 Click handler nas linhas da tabela (todas as abas)
**Arquivo:** `src/pages/Cadastros.tsx`

- [x] Insumos: adicionar `onClick` e `cursor-pointer` na `<tr>`, `stopPropagation` nos botoes
- [x] Fornecedores: mesmo padrao
- [x] Fichas tecnicas: mesmo padrao
- [x] Equipe: mesmo padrao

### 5.3 Selecionar insumos fornecidos na ficha de fornecedor
**Arquivos:** `src/components/cadastros/SupplierDetails.tsx`, `src/pages/Cadastros.tsx`

- [x] Multi-select de ingredientes com checkbox na tela de detalhes do fornecedor
- [x] Busca por nome de insumo no multi-select
- [x] Ao salvar, atualiza `supplier_id` nos ingredientes via PUT API
- [x] Refresh automatico da lista apos salvar

### Notas da sessao:
- Sessao 4: Todos os 3 itens concluidos. Build limpo (vite build OK).
- 5.1: Alterado default de viewMode para 'list'
- 5.2: 4 tabelas (insumos, fornecedores, fichas, equipe) com onClick na tr + cursor-pointer + stopPropagation nos botoes de acao
- 5.3: SupplierDetails reescrito com modo de edicao de insumos (checkbox list com busca). Ingredientes carregados tambem na aba fornecedores. Callback de refresh atualiza lista apos salvar.
- Tambem corrigido: SupplierDetails com dual-case fallbacks (delivery_time/deliveryTime, payment_terms/paymentTerms)
- Sessao 5: Correcoes adicionais pos-teste:
  - RecipeDetails layout reescrito (grid responsivo, texto menor, sem overflow no modal)
  - Bug critico corrigido: `result.data` -> `result.fornecedor` em handleViewIngredient (fornecedor nunca carregava)
  - Migracao multi-fornecedor: `supplier_id: string` -> `supplier_ids: string[]`
    - Backend: listIngredientes normaliza dados antigos, createIngredient/updateIngredient aceitam array, deleteFornecedor usa array-contains
    - IngredientForm: multi-select com checkboxes em vez de select unico
    - IngredientDetails: mostra multiplos cards de fornecedores
    - SupplierDetails: handleSaveIngredients trabalha com array supplier_ids
    - Cadastros: handleViewIngredient carrega multiplos fornecedores em paralelo, handleViewSupplier filtra por supplier_ids.includes()
  - Relacao bidirecional: insumo -> fornecedores e fornecedor -> insumos funcional nos dois sentidos

---

## ETAPA 6: Tela de Checklists
> **Prioridade:** Media-Alta
> **Objetivo:** Agrupamento por role, visao diferenciada por perfil, templates gerenciaveis
> **Teste de validacao:** Login como admin/gerente/operacao e verificar agrupamento correto de tarefas

### 6.1 Visao do Administrador
**Arquivo:** `src/pages/Checklists.tsx`

- [x] Agrupar em 3 secoes: "Minhas Tarefas", "Gerencia", "Operacao"
- [x] Minhas Tarefas: `assigned_to === user.id`
- [x] Gerencia: tarefas de membros com role `gerencia`
- [x] Operacao: tarefas de membros com role `operacao` (manter accordion por pessoa)
- [x] Apos secoes: Tarefas Recomendadas (alertas ativos)
- [x] Final: Templates

### 6.2 Visao do Gerente
**Arquivo:** `src/pages/Checklists.tsx`

- [x] 3 grupos: "Minhas Tarefas", "Gerencia e Administracao", "Operacao"
- [x] Mesma estrutura mas com agrupamento diferente dos roles

### 6.3 Visao da Operacao
**Arquivo:** `src/pages/Checklists.tsx`

- [x] Focar em: tarefas delegadas (`assigned_to === user.id`) + lista de tarefas recomendadas
- [x] Recomendadas baseadas em alertas ativos
- [x] Sem funcionalidades de gestao (delegacao, templates)

### 6.4 Botao para adicionar templates
**Arquivo:** `src/pages/Checklists.tsx`

- [x] Botao "Novo Template" na secao de templates
- [x] Dialog: nome do template, lista de tarefas (add/remove), setor alvo
- [x] Chamar `POST /api/checklists/templates`

### 6.5 Backend - endpoints funcionando
**Arquivos:** `backend/src/index.ts`, `backend/src/routes/checklists.ts`

- [x] Testar `GET /api/checklists/tasks` (responde ou 404?)
- [x] Testar `GET /api/checklists/templates` (responde ou 404?)
- [x] Se 404: verificar registro de rotas no index.ts (deve estar na linha ~119)

### Notas da sessao:
- Sessao 6: Todos os 5 itens concluidos. Build limpo (vite build OK).
- 6.5: Backend ja estava correto - rotas registradas em index.ts:119, CRUD completo de tasks + templates + apply-template
- 6.1: Admin ve 3 secoes: "Minhas Tarefas" (assigned_to === user.id), "Gerencia" (membros com role gerencia em accordion), "Operacao" (membros operacao em accordion) + Tarefas Recomendadas + Templates
- 6.2: Gerente ve: "Minhas Tarefas", "Gerencia e Administracao" (admin + gerencia excluindo self), "Operacao" + Recomendadas + Templates
- 6.3: Operacao ve apenas "Minhas Tarefas" + "Tarefas Recomendadas" (alertas ativos com botao de auto-adicionar). Sem delegacao, sem templates
- 6.4: Botao "Novo Template" com dialog completo: nome, setor alvo (select), lista de tarefas (add/remove com Enter ou botao +). POST /api/checklists/templates
- Alertas agora carregados para TODOS os roles (operacao tambem ve tarefas recomendadas)

---

## ETAPA 7: Sistema de Importacao de Vendas
> **Prioridade:** Media
> **Objetivo:** Upload funcional que registra dados de vendas para relatorios
> **Teste de validacao:** Upload Excel -> dados salvos no Firestore -> aparecem no relatorio de vendas por produto

### 7.1 Erro "Failed to fetch" no upload
**Arquivos:** `src/pages/Vendas.tsx`, `backend/src/routes/vendas.ts`, `backend/src/services/vendas.ts`

- [x] Verificar backend rodando na porta correta (3001)
- [x] Verificar endpoint `POST /api/vendas/upload` registrado
- [x] Verificar Python 3 disponivel no sistema (pipeline depende de `tools/vendas/process_sales_upload.py`)
- [x] Melhorar error handling no frontend

### 7.2 ImportDetails usando mock data
**Arquivo:** `src/components/vendas/ImportDetails.tsx`

- [x] Remover mock items (linhas 15-20)
- [x] Exibir dados reais: salesCreated, errors, warnings, processingTimeMs
- [x] Adaptar tabela para resumo real dos produtos processados

### 7.3 Dados de vendas alimentando relatorios
**Arquivos:** `tools/vendas/process_sales_upload.py`, `backend/src/services/relatorios.ts`

- [x] Verificar que pipeline Python grava na collection `vendas` com campos corretos
- [x] Verificar que `relatorios/vendas-por-produto` le dessa collection
- [x] Campos necessarios: productName/sku, unitPrice, quantity, saleDate

### Notas da sessao:
- Sessao 7: Todos os 3 itens concluidos. Build limpo (vite build OK).
- 7.1: Backend routes e multipart ja estavam corretos e registrados. Frontend: separacao de erros de rede (backend offline) vs erros de resposta invalida vs erros de processamento. Backend: adicionado checkPythonAvailability() que verifica python3 e deps (pandas, firebase_admin, google-cloud-firestore) antes de executar pipeline. Timeout de 2min adicionado. Script path verificado com fs.existsSync.
- 7.2: ImportDetails totalmente reescrito - removido mock data. Agora exibe dados reais do Firestore: salesCreated, ingredientsUpdated, processingTimeMs, processingResults (totalRows/validRows/invalidRows/skippedRows). Erros e warnings renderizados com detalhes (step, message, SKUs nao mapeados, ingredientes negativos). Status handling cobre completed/failed/processing.
- 7.3: Bug critico corrigido em relatorios.ts: campo `productName` nao existe nos docs de venda (Python grava `productNameZig` e `recipeName`). Fix: prioridade `recipeName || productNameZig || productName || sku`. Query Firestore movida para client-side filter (evita composite index em saleDate).
- Pos-teste: Bug critico encontrado - coluna "Valor Unitáro" (typo do Zig, falta 'i') nao era reconhecida pelo parser. unitPrice=0 em todas as vendas. Fix: adicionado "Valor Unitáro" ao mapping em parse_sales_file.py. Tambem adicionados: "Valor total", "Valor de Desconto", "Data do Evento" ao mapping. Campos totalValue e discountValue agora gravados nos docs de venda.
- Problemas de DADOS pendentes (nao sao bugs de codigo): 98/100 receitas sem ingredientes (fichas tecnicas precisam ser populadas), product_mappings com muitos "low confidence" incorretos (revisao manual necessaria).

---

## ETAPA 8: Dashboard - Link Inventario
> **Prioridade:** Baixa
> **Objetivo:** Links do dashboard navegando para destinos corretos
> **Teste de validacao:** Clicar em "inventario" no dashboard e abrir formulario de conferencia fisica

### 8.1 Link inventario abre conferencia fisica
**Arquivos:** `src/components/Dashboard.tsx`, `src/pages/Operacoes.tsx`

- [x] Adicionar link/botao de inventario no Dashboard (se nao existe, criar card)
- [x] Navegar para `/operacoes?tab=estoque&action=inventory`
- [x] No Operacoes.tsx, tratar query param `action=inventory` para auto-abrir dialog de contagem

### Notas da sessao:
- Sessao 11: Item 8.1 concluido. Build limpo (vite build OK).
- ManagerDashboard: Card "Desperdicio" (placeholder desabilitado) substituido por card "Inventario" clicavel com Link para `/operacoes?tab=estoque&action=inventory`
- OperationsDashboard: Card "Inventario" adicionado como 4o card. Grid ajustado para `md:grid-cols-2 lg:grid-cols-4`
- Operacoes.tsx: useEffect de searchParams agora detecta `action=inventory` e auto-abre `showStartInventoryDialog` com delay de 300ms. Param `action` removido da URL apos uso (replace: true)

---

## ETAPA 9: Estoque - Fixes Criticos
> **Prioridade:** MAXIMA
> **Objetivo:** Corrigir bugs bloqueantes na aba de estoque
> **Teste de validacao:** Estoque soma corretamente ao receber, selects nao crasham, ajuste manual funcional

### 9.1 Select.Item com valor vazio crashava (Radix UI)
**Arquivos:** `src/pages/Operacoes.tsx`, `src/components/operacoes/StockFilters.tsx`

- [x] `<SelectItem value="">` invalido no Radix UI causava crash
- [x] Substituido por sentinel `"all"` + conversao no handler (`value === 'all' ? '' : value`)

### 9.2 Estoque nao somava ao receber pedido
**Arquivo:** `backend/src/services/operacoes.ts`

- [x] `updateIngredientStock` fazia read-add-write manual (race condition)
- [x] Substituido por `FieldValue.increment(quantityToAdd)` para soma atomica

### 9.3 UI de ajuste manual de estoque
**Arquivos:** `src/pages/Operacoes.tsx`, `src/components/operacoes/StockTable.tsx`

- [x] Dialog com campo de nova quantidade, motivo (select: contagem/dano/vencido/correcao/outro), observacoes
- [x] Chama `PUT /api/estoque/ingredients/:id/adjust`
- [x] `onAdjustStock` prop passada ao StockTable, aparece no dropdown de acoes

### Notas da sessao:
- Sessao 8: Todos os 3 itens concluidos. Build limpo.
- 9.1: Radix UI Select nao aceita `value=""`. Todos os selects de filtro agora usam "all" como sentinel
- 9.2: Race condition corrigida com FieldValue.increment() - soma atomica no Firestore
- 9.3: Dialog de ajuste manual com Select de motivo (5 opcoes), Input de quantidade, Textarea de notas. Integrado ao StockTable via prop onAdjustStock

---

## ETAPA 10: Padronizacao de Centros de Armazenamento
> **Prioridade:** Alta
> **Objetivo:** Unica fonte de dados para centros de estoque em todo o sistema
> **Teste de validacao:** Todos os selects mostram mesma lista. Criar novo centro aparece em todos os componentes. Tabs de estoque mostram todos os centros.

### 10.1 Backend: Collection + CRUD API
**Arquivos:** `backend/src/services/cadastros.ts`, `backend/src/routes/cadastros.ts`

- [x] Collection `storage_centers` no Firestore (value, label, order, created_at)
- [x] `GET /api/cadastros/storage-centers` - lista todos ordenados por `order`
- [x] `POST /api/cadastros/storage-centers` - cria novo (valida duplicata por `value`)
- [x] Seed script com 7 centros iniciais: cozinha, cozinha-fria, bar, despensa, estoque-geral, refrigerado, congelado

### 10.2 Frontend: Hook compartilhado
**Arquivo:** `src/hooks/useStorageCenters.ts` (NOVO)

- [x] Hook com cache em modulo (evita re-fetch por componente)
- [x] Exporta: `centers`, `isLoading`, `refetch()`, `getLabel(value)`
- [x] Endpoint adicionado em `src/config.ts`

### 10.3 Substituicao de listas hardcoded em 8+ arquivos
**Arquivos:** IngredientForm, StockFilters, ReceivingChecklist, StartInventoryCountForm, StockTable, Operacoes, IngredientDetails, InventoryDetails

- [x] Todos os SelectItems hardcoded substituidos por `centers.map()`
- [x] Todos os mapas de labels inline substituidos por `getLabel()` do hook
- [x] Backend `operacoes.ts`: mapa hardcoded substituido por lookup Firestore
- [x] Backend `estoque.ts`: normaliza `storage_center || storageCenter` para cobrir docs antigos com campo camelCase

### 10.4 UI "Novo Centro" + Layout mobile
**Arquivo:** `src/pages/Operacoes.tsx`, `src/components/operacoes/StockTable.tsx`

- [x] Botao "Novo Centro" no header da aba Estoque com dialog (nome -> slug automatico)
- [x] StockTable mostra abas de TODOS os centros cadastrados (mesmo sem ingredientes)
- [x] Default tab: primeiro centro com itens
- [x] Tabs responsivas: flex-wrap em mobile, scroll horizontal
- [x] Tabela responsiva: colunas secundarias hidden em mobile (md/lg/xl breakpoints)
- [x] Stats grid compacto em mobile (text-[10px], gap-1, p-2)

### Notas da sessao:
- Sessoes 8-9: Todos os 4 itens concluidos. Build limpo.
- Inconsistencia encontrada: 8 arquivos tinham listas diferentes (4 a 7 opcoes cada)
- Dual-case field bug: Firestore docs antigos com `storageCenter` (camelCase) eram invisiveis para queries em `storage_center` (snake_case). Fix: normalizacao no backend antes de filtrar/agrupar
- StockTable: inicializa grupos com todos os centros do hook, nao apenas os que tem ingredientes
- Mobile: tabs com flex-wrap, tabela com progressive disclosure (3 colunas mobile -> 9 desktop)

---

## Padroes Globais de UX

Estes padroes devem ser aplicados consistentemente em TODO o sistema:

1. **Safe number formatting:** `(value ?? 0).toFixed(2)` em vez de `value.toFixed(2)`
2. **Dual case handling:** `data.storage_center || data.storageCenter` (snake_case PRIMEIRO)
3. **Click em linhas de tabela:** Toda `<tr>` de listagem deve ter `onClick` + `cursor-pointer`
4. **View mode padrao:** Iniciar em `'list'` em todas as telas com toggle
5. **Fallback em datas:** `parseDate(val)` com tratamento de Firestore timestamps
6. **Select sentinel value:** Usar `"all"` em vez de `""` para valor default (Radix UI nao aceita string vazia)
7. **Centros de armazenamento:** SEMPRE usar `useStorageCenters()` hook - NUNCA hardcodar lista
8. **Estoque atomico:** Usar `FieldValue.increment()` para somas - NUNCA read-add-write manual
9. **Layout responsivo:** Tabelas com `hidden md:table-cell` para colunas secundarias, info condensada em subtitulo mobile

---

## Historico de Sessoes

### Sessao 1 - 2026-02-07
- Analise completa do codebase
- Identificacao de todos os erros reportados
- Criacao do plano e backlog

### Sessao 2 - 2026-02-07
- O que foi feito: Etapa 1 completa (7/7 itens)
- Arquivos modificados: PurchaseOrderDetails, ImportDetails, Operacoes, Cadastros, DraftOrderCard, ReceivingChecklist, RecipeDetails, Dashboard, backend/operacoes.ts
- Problemas encontrados: Firestore composite index ausente causava 500 em listPurchases com filtro status
- Ajustes no plano: Nenhum
- **Proximo passo:** Iniciar Etapa 2 (Recebimento de Pedido)

### Sessao 3 - 2026-02-07
- O que foi feito: Etapa 2 completa (3/3 itens)
- Arquivos modificados: backend/src/services/operacoes.ts, src/components/operacoes/ReceiptDetails.tsx, src/components/operacoes/ReceivingChecklist.tsx
- Problemas encontrados: Firebase Storage potencialmente nao configurado causava 500 no upload. Foto era bloqueante para completar recebimento.
- Ajustes no plano: Nenhum
- **Proximo passo:** Iniciar Etapa 3 (Inventario / Conferencia Fisica)

### Sessao 4 - 2026-02-07
- O que foi feito: Etapa 5 completa (3/3 itens)
- Arquivos modificados: src/pages/Cadastros.tsx, src/components/cadastros/SupplierDetails.tsx
- Problemas encontrados: Nenhum
- Ajustes no plano: Nenhum
- **Proximo passo:** Correcoes pos-teste + multi-fornecedor

### Sessao 5 - 2026-02-07
- O que foi feito: Correcoes pos-teste etapa 5 + migracao multi-fornecedor (supplier_id -> supplier_ids)
- Arquivos modificados: backend/src/services/cadastros.ts, src/pages/Cadastros.tsx, src/components/cadastros/IngredientForm.tsx, src/components/cadastros/IngredientDetails.tsx, src/components/cadastros/SupplierDetails.tsx, src/components/cadastros/RecipeDetails.tsx
- Problemas encontrados: Bug critico em handleViewIngredient (result.data em vez de result.fornecedor). RecipeDetails com layout quebrado no modal.
- Ajustes no plano: Adicionada migracao de modelo de dados (supplier_id string -> supplier_ids array) com backward compat
- **Proximo passo:** Iniciar Etapa 3 (Inventario / Conferencia Fisica)

### Sessao 6 - 2026-02-07
- O que foi feito: Etapa 6 completa (5/5 itens)
- Arquivos modificados: src/pages/Checklists.tsx
- Problemas encontrados: Nenhum. Backend ja estava funcional.
- Ajustes no plano: Nenhum
- **Proximo passo:** Iniciar Etapa 3 (Inventario / Conferencia Fisica) ou Etapa 7 (Importacao de vendas)

### Sessao 7 - 2026-02-07
- O que foi feito: Etapa 7 completa (3/3 itens)
- Arquivos modificados: src/pages/Vendas.tsx, src/components/vendas/ImportDetails.tsx, backend/src/services/vendas.ts, backend/src/services/relatorios.ts
- Problemas encontrados: Bug critico em relatorios.ts - campo productName nao existe nos docs de venda (Python grava productNameZig/recipeName). Query com composite index em saleDate potencialmente problematica.
- Ajustes no plano: Nenhum
- **Proximo passo:** Iniciar Etapa 3 (Inventario / Conferencia Fisica) ou Etapa 4 (Pedidos de Compra) ou Etapa 8 (Dashboard link inventario)

### Sessao 8 - 2026-02-07
- O que foi feito: Etapas 3, 9 completas (7/7 itens). Inicio da Etapa 10.
- Arquivos modificados: StartInventoryCountForm.tsx (busca/filtro/sort), Operacoes.tsx (ajuste estoque dialog, Select sentinel fix), StockTable.tsx, backend/operacoes.ts (FieldValue.increment), backend/cadastros.ts (storage centers CRUD), backend/routes/cadastros.ts (rotas)
- Problemas encontrados: Radix UI Select crash com value="". Race condition em stock update. Centros de armazenamento hardcoded em 8+ arquivos com listas inconsistentes (4 a 7 opcoes).
- Ajustes no plano: Adicionadas Etapas 9 e 10 ao backlog
- **Proximo passo:** Completar Etapa 10

### Sessao 9 - 2026-02-08
- O que foi feito: Etapa 10 completa (4/4 itens)
- Arquivos modificados: backend/services/estoque.ts (normalizacao dual-case), backend/services/operacoes.ts (label lookup Firestore), src/hooks/useStorageCenters.ts (NOVO), src/config.ts, IngredientForm.tsx, StockFilters.tsx, ReceivingChecklist.tsx, StartInventoryCountForm.tsx, StockTable.tsx (all centers + mobile responsive), Operacoes.tsx (Novo Centro dialog), IngredientDetails.tsx, InventoryDetails.tsx, backend/scripts/seed-storage-centers.ts (NOVO)
- Problemas encontrados: Dual-case field bug - docs antigos com `storageCenter` (camelCase) invisiveis para queries Firestore em `storage_center`. StockTable so mostrava centros com ingredientes, nao todos os cadastrados.
- Ajustes no plano: Nenhum
- **Proximo passo:** Etapa 4 (Pedidos de Compra) ou Etapa 8 (Dashboard link inventario)

### Sessao 10 - 2026-02-08
- O que foi feito: Etapa 4 completa (2/2 itens)
- Arquivos modificados: src/pages/Operacoes.tsx (filteredPurchases), src/components/operacoes/PurchaseOrderForm.tsx (inline add, remove button cleanup)
- Problemas encontrados: Nenhum
- Ajustes no plano: Nenhum
- **Proximo passo:** Etapa 8 (Dashboard link inventario) - unica etapa pendente

### Sessao 11 - 2026-02-08
- O que foi feito: Etapa 8 completa (1/1 item). TODAS as etapas do MVP concluidas.
- Arquivos modificados: src/components/Dashboard.tsx, src/pages/Operacoes.tsx
- Problemas encontrados: Nenhum
- Ajustes no plano: Nenhum
- **Proximo passo:** MVP completo. Proximos passos: testes end-to-end, deploy, features deferred (auth real, relatorios, etc.)

<!-- Template para novas sessoes:
### Sessao N - YYYY-MM-DD
- O que foi feito:
- Problemas encontrados:
- Ajustes no plano:
- Proximo passo:
-->
