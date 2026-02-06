# Workflow: Processar Upload XLSX do PDV Zig

## Objetivo
Importar vendas do arquivo Excel (XLSX/XLS/CSV) exportado do sistema PDV Zig, validar dados, decrementar estoque dos ingredientes baseado nas fichas técnicas, e gerar log completo da operação.

## Contexto
O restaurante Montuvia usa o sistema PDV Zig para registrar vendas. O Zig exporta relatórios em Excel com formato:
- **Colunas**: id, SKU, Nome do Produto, Categoria, Valor Unitário, Quantidade, Vendedor, Cliente, Data, Bar
- **Formato**: Arquivo XLSX, XLS ou CSV
- **Volume típico**: 500-1000 vendas por mês

Cada SKU do Zig precisa estar mapeado para uma receita (ficha técnica) no sistema para que o estoque dos ingredientes seja decrementado corretamente.

## Inputs
- **xlsx_file**: Arquivo Excel (XLSX/XLS/CSV) exportado do Zig
- **upload_id**: ID único gerado pelo backend para rastrear este upload
- **user_id**: ID do usuário que fez upload (para auditoria)

## Outputs
- **Vendas salvas**: Documentos criados na collection `vendas` do Firestore
- **Estoque atualizado**: Campo `currentStock` decrementado em cada ingrediente
- **Log de importação**: Documento criado na collection `sales_uploads` com estatísticas
- **Alertas**: Gerados automaticamente se estoque ficar abaixo do mínimo

## Tools (em ordem de execução)

### 1. Parse do Arquivo Excel
**Tool**: `tools/vendas/parse_sales_file.py`

**Função**: Ler arquivo Excel e converter para estrutura JSON padronizada

**Input**:
- Caminho do arquivo Excel
- Formato detectado automaticamente (XLSX, XLS, CSV)

**Output**: JSON estruturado
```json
{
  "sales": [
    {
      "zigSaleId": "123",
      "sku": "X",
      "productNameZig": "TAMARINDO",
      "category": "Bebidas",
      "unitPrice": 28.0,
      "quantity": 1,
      "seller": "João",
      "customer": "Mesa 5",
      "saleDate": "2024-01-15T19:30:00",
      "bar": "Principal"
    }
  ],
  "totalRows": 1007,
  "parseErrors": []
}
```

**Validações**:
- Arquivo existe e é legível
- Possui colunas obrigatórias (SKU, Nome do Produto, Quantidade, Data)
- Datas estão em formato válido
- Valores numéricos são válidos

**Erros tratados**:
- Arquivo corrompido → retorna erro claro
- Colunas faltando → retorna lista de colunas esperadas
- Linhas com dados incompletos → pula e registra em parseErrors

---

### 2. Validação e Enriquecimento com Mapeamentos
**Tool**: `tools/vendas/validate_sales_data.py`

**Função**: Validar dados e enriquecer com informações de mapeamento SKU → Receita

**Input**: JSON do parse

**Output**: JSON enriquecido
```json
{
  "validSales": [
    {
      "zigSaleId": "123",
      "sku": "X",
      "productNameZig": "TAMARINDO",
      "quantity": 1,
      "saleDate": "2024-01-15T19:30:00",
      "recipeId": "rec_abc123",
      "recipeName": "Tamarindo Sour",
      "mappingConfidence": 1.0,
      "isValid": true
    }
  ],
  "invalidSales": [
    {
      "zigSaleId": "456",
      "sku": "Z",
      "productNameZig": "PRODUTO NOVO",
      "quantity": 1,
      "saleDate": "2024-01-15",
      "error": "SKU não mapeado para receita",
      "isValid": false
    }
  ],
  "stats": {
    "total": 1007,
    "valid": 1000,
    "invalid": 7,
    "unmappedSkus": ["Z", "Y"]
  }
}
```

**Processo**:
1. Buscar todos os mapeamentos da collection `product_mappings`
2. Para cada venda:
   - Verificar se SKU existe em `product_mappings`
   - Se existe: enriquecer com recipe_id, recipe_name, confidence
   - Se não existe: marcar como inválida, adicionar erro
3. Validar dados básicos:
   - quantity > 0
   - saleDate é válida
   - SKU não está vazio

**Decisões**:
- Vendas com SKU não mapeado → **não são importadas** (ficam em invalidSales)
- Receita sem ingredientes → venda importada mas **não decrementa estoque**
- Quantidade negativa → marcada como inválida

---

### 3. Atualização de Estoque
**Tool**: `tools/vendas/update_stock_from_sales.py`

**Função**: Decrementar estoque dos ingredientes baseado nas fichas técnicas

**Input**:
- Lista de vendas válidas (validSales)
- upload_id para rastreamento

**Output**: Resultado da atualização
```json
{
  "salesCreated": 1000,
  "ingredientsUpdated": 85,
  "stockDecrements": {
    "ing_limao": -150.5,
    "ing_acucar": -75.2
  },
  "errors": [],
  "warnings": [
    {
      "ingredientId": "ing_limao",
      "ingredientName": "Limão",
      "newStock": -5.5,
      "message": "Estoque ficou negativo (indica necessidade de compra)"
    }
  ]
}
```

**Processo**:
1. Agrupar vendas por receita para otimizar queries
2. Para cada receita vendida:
   - Buscar documento da receita
   - Calcular porções vendidas: `quantity / recipe.portions`
   - Para cada ingrediente na receita:
     - Calcular quantidade consumida: `portions * ingredient.quantity`
     - Acumular decremento total
3. Aplicar decrementos usando Firestore transactions (evitar race conditions)
4. Criar documento em `vendas` para cada venda processada
5. Salvar estatísticas no documento `sales_uploads`

**Otimizações**:
- Batches de 500 operações (limite do Firestore)
- Usar transactions para operações atômicas
- Cache de receitas em memória durante processamento

**Alertas automáticos**:
- Se `currentStock < minStock` após decremento → criar alerta
- Se `currentStock < 0` → alerta de alta prioridade (produto em falta)

---

### 4. Verificação de Níveis de Estoque
**Tool**: `tools/alerts/check_stock_levels.py`

**Função**: Verificar ingredientes com estoque baixo e criar alertas

**Input**:
- Lista de ingredientes atualizados
- Limites configurados (minStock, maxStock)

**Output**: Alertas criados
```json
{
  "alertsCreated": 3,
  "alerts": [
    {
      "type": "low_stock",
      "priority": "high",
      "ingredientId": "ing_limao",
      "ingredientName": "Limão",
      "currentStock": -5.5,
      "minStock": 10,
      "message": "Estoque de Limão está em -5.5kg (mínimo: 10kg)"
    }
  ]
}
```

**Regras de prioridade**:
- `currentStock < 0` → **high** (produto em falta, bloqueia produção)
- `currentStock < minStock` → **medium** (precisa comprar em breve)
- `currentStock > maxStock` → **low** (excesso de estoque, risco de perda)

---

## Fluxo Completo (End-to-End)

```
1. User → Frontend → POST /api/vendas/upload (arquivo XLSX)
   ↓
2. Backend (Fastify) → Recebe multipart file
   ↓
3. Backend → Salva em .tmp/uploads/{uploadId}.xlsx
   ↓
4. Backend → Upload para Firebase Storage (sales-uploads/{uploadId}/)
   ↓
5. Backend → Cria documento sales_uploads (status: "processing")
   ↓
6. Backend → Executa Python orchestrator
   ↓
7. Python → parse_sales_file.py (XLSX → JSON)
   ↓
8. Python → validate_sales_data.py (enriquecer com mappings)
   ↓
9. Python → update_stock_from_sales.py (decrementar estoque)
   ↓
10. Python → check_stock_levels.py (gerar alertas)
   ↓
11. Python → Atualizar sales_uploads (status: "completed")
   ↓
12. Backend → Limpar arquivo temporário
   ↓
13. Backend → Retornar resultado para frontend
```

---

## Estrutura de Dados Firestore

### Collection: `sales_uploads`
Rastreia cada upload de arquivo

```typescript
{
  id: string                    // Gerado automaticamente
  filename: string              // "vendas_janeiro.xlsx"
  uploadedAt: Timestamp         // Data/hora do upload
  uploadedBy: string            // user_id
  status: "processing" | "completed" | "failed"
  storageUrl: string            // URL no Firebase Storage

  processingResults: {
    totalRows: number           // 1007
    validRows: number           // 1000
    invalidRows: number         // 7
    skippedRows: number         // 0
    stockUpdated: boolean       // true
  }

  salesCreated: number          // 1000
  ingredientsUpdated: number    // 85
  alertsCreated: number         // 3

  errors: Array<{
    row: number
    sku: string
    error: string
  }>

  completedAt?: Timestamp
  processingTimeMs?: number
}
```

### Collection: `vendas`
Cada venda individual importada

```typescript
{
  id: string                    // Gerado automaticamente
  uploadId: string              // Referência ao sales_uploads

  // Dados originais do Zig
  zigSaleId: string
  sku: string
  productNameZig: string
  category: string
  unitPrice: number
  quantity: number
  seller: string
  customer: string
  saleDate: Timestamp
  bar: string

  // Dados enriquecidos
  recipeId: string              // Referência à receita
  recipeName: string
  mappingConfidence: number     // 0-1

  // Controle
  stockDecremented: boolean     // true se decrementou estoque
  createdAt: Timestamp
}
```

---

## Edge Cases e Tratamentos

### Caso 1: SKU não mapeado
**Situação**: Venda de produto novo que ainda não tem ficha técnica

**Tratamento**:
- Venda marcada como inválida
- Não é importada para collection `vendas`
- Aparece em `errors` do `sales_uploads`
- Backend retorna lista de SKUs não mapeados
- Frontend sugere criar mapeamento manualmente

**Exemplo**:
```json
{
  "row": 45,
  "sku": "Z",
  "productNameZig": "PRODUTO NOVO",
  "error": "SKU não mapeado para receita. Crie o mapeamento em Mapeamentos > Revisar"
}
```

### Caso 2: Receita sem ingredientes
**Situação**: Produto mapeado mas ficha técnica ainda não preenchida (draft)

**Tratamento**:
- Venda é importada normalmente
- Estoque **não** é decrementado (ingredients array vazio)
- Adiciona warning em `processingResults`
- Alerta existente de "ficha técnica incompleta" permanece

**Exemplo**:
```json
{
  "warning": "Receita 'Pina Colada' vendida mas não tem ingredientes. Estoque não foi atualizado."
}
```

### Caso 3: Estoque insuficiente (negativo)
**Situação**: Venda consumiu mais ingrediente do que havia em estoque

**Tratamento**:
- Decremento é aplicado normalmente (permite negativo)
- Gera alerta de alta prioridade
- Estoque negativo indica **dívida** (já usou ingrediente que precisa comprar)

**Exemplo**:
```json
{
  "alert": {
    "type": "negative_stock",
    "priority": "high",
    "ingredient": "Limão",
    "currentStock": -5.5,
    "message": "Estoque negativo indica que o ingrediente foi usado mas não estava registrado. Regularize com recebimento."
  }
}
```

### Caso 4: Formato Excel diferente
**Situação**: Zig mudou formato do relatório (colunas diferentes)

**Tratamento**:
- parse_sales_file.py tenta mapear colunas flexivelmente
- Se falhar, retorna erro claro com colunas encontradas vs esperadas
- Upload marca como "failed"
- Frontend exibe mensagem clara para usuário ajustar

**Exemplo**:
```json
{
  "error": "Formato de arquivo não reconhecido",
  "expectedColumns": ["SKU", "Nome do Produto", "Quantidade", "Data"],
  "foundColumns": ["Código", "Produto", "Qtd", "Data Venda"],
  "suggestion": "Verifique se exportou o relatório correto do Zig"
}
```

### Caso 5: Upload duplicado (mesmo arquivo 2x)
**Situação**: Usuário faz upload do mesmo arquivo de vendas duas vezes

**Tratamento**:
- **Permite** upload duplicado (cada upload é independente)
- Sistema **não detecta** duplicação automaticamente (complexo e pode ter falsos positivos)
- Usuário pode ver histórico e deletar uploads incorretos manualmente
- Estoque seria decrementado 2x → usuário precisa ajustar manualmente via inventário

**Justificativa**: MVP prioriza simplicidade. Detecção de duplicatas pode vir em iteração futura.

### Caso 6: Arquivo muito grande (>1MB, 5000+ vendas)
**Situação**: Upload de 3 meses de vendas de uma vez

**Tratamento**:
- Backend aceita até 10MB (configurado em @fastify/multipart)
- Python processa em batches de 500 operações
- Pode levar 30-60 segundos
- Frontend mostra loading spinner
- Se timeout (>2 min), marca como "processing" e processa em background

**Otimização futura**: Fila assíncrona (Cloud Tasks) para arquivos grandes

---

## Performance Targets

- **Parse**: < 5 segundos para 1000 vendas
- **Validação**: < 3 segundos para 1000 vendas
- **Update estoque**: < 20 segundos para 1000 vendas (queries + transactions)
- **Total end-to-end**: < 30 segundos para arquivo típico (500-1000 vendas)

---

## Logs e Auditoria

Todos os passos são logados:

1. **Backend logs** (Fastify/Pino):
   - Upload recebido (filename, size, user)
   - Python scripts executados
   - Erros/exceções

2. **Python logs** (print statements):
   - Linhas processadas
   - Vendas válidas vs inválidas
   - Ingredientes atualizados
   - Alertas criados

3. **Firestore audit trail**:
   - sales_uploads com timestamp completo
   - vendas com uploadId para rastreabilidade
   - Alertas com referência ao ingrediente

---

## Próximos Passos (Após Upload Bem-Sucedido)

1. **Dashboard atualiza automaticamente** (frontend consulta Firestore)
2. **Alertas aparecem** se houver estoque baixo
3. **Usuário pode revisar** vendas importadas em Vendas > Histórico
4. **Gerente verifica** mapeamentos não resolvidos e completa manualmente
5. **Sistema está pronto** para próximo upload (mensal ou semanal)

---

## Melhorias Futuras (Pós-MVP)

- [ ] Detecção de uploads duplicados (hash do arquivo)
- [ ] Preview antes de importar (mostrar primeiras 10 linhas)
- [ ] Rollback de importação (desfazer se detectar erro)
- [ ] Sugestões de mapeamento via IA (Gemini)
- [ ] Importação incremental (apenas vendas novas)
- [ ] Exportar relatório de erros em Excel
- [ ] Webhook do Zig para importação automática diária
