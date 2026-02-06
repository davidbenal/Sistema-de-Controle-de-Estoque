# Sistema de Controle de Estoque Montuvia

Sistema completo de gestão de estoque para restaurantes com automação AI, seguindo framework WAT (Workflows, Agents, Tools).

**Design original**: [Figma](https://www.figma.com/design/kJ4U0hje8onA7Qs4H6GARC/Sistema-de-Controle-de-Estoque)

## 🚀 Quick Start

### 1. Setup Firebase (5-10 min)
Siga as instruções em **[SETUP_FIREBASE.md](SETUP_FIREBASE.md)** para criar o projeto Firebase e gerar credenciais.

### 2. Instalar Dependências

**Backend (Node.js)**:
```bash
cd backend
npm install
```

**Tools (Python)**:
```bash
pip3 install -r requirements.txt
```

**Frontend** (já configurado):
```bash
npm install
```

### 3. Popular Firebase com Dados Reais

Após completar o setup Firebase, execute o script de migração:

```bash
python3 tools/migrations/import_montuvia_initial_data.py
```

Este script vai:
- ✅ Importar 236 ingredientes do Excel
- ✅ Importar ~100 produtos/receitas
- ✅ Criar mapeamentos SKU Zig → Receitas (~87% automático)
- ✅ Gerar relatório de migração

**Tempo estimado**: 2-3 minutos

### 4. Iniciar Desenvolvimento

**Terminal 1 - Backend**:
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend**:
```bash
npm run dev
```

**Acessar**: http://localhost:3000

---

## 📁 Estrutura do Projeto

```
Sistema de Controle de Estoque/
├── src/                    # Frontend React 19 + TypeScript
│   ├── components/         # Componentes shadcn/ui
│   ├── pages/              # Páginas principais
│   └── types/              # TypeScript types
├── backend/                # API Node.js + Fastify
│   └── src/
│       ├── routes/         # Endpoints REST
│       ├── services/       # Business logic
│       └── middleware/     # Auth, validation
├── tools/                  # Scripts Python (determinísticos)
│   ├── vendas/             # Processar uploads Zig
│   ├── migrations/         # Importar dados
│   ├── calculations/       # CMV, custos
│   └── alerts/             # Alertas automáticos
├── workflows/              # Workflows em Markdown (SOPs)
│   ├── vendas/
│   ├── operacoes/
│   └── relatorios/
└── .tmp/                   # Arquivos temporários
```

---

## 🔥 Stack Tecnológica

- **Frontend**: React 19, TypeScript, Vite, Tailwind, shadcn/ui
- **Backend**: Node.js, Fastify, TypeScript
- **Database**: Firebase Firestore + Storage
- **Tools**: Python 3.11+ (pandas, firebase-admin)
- **Deploy**: Google Cloud Run + Vercel

---

## 📱 Mobile-First

Todo o sistema é otimizado para uso mobile:
- Botões grandes (min 44x44px)
- Layouts verticais (cards stacked)
- Upload de fotos via câmera nativa
- Teclado numérico para contagens
- Performance otimizada (Lighthouse > 80)

**Teste em**: Chrome DevTools → iPhone 14 (375px)

---

## 📋 Workflow de Desenvolvimento

1. **Checkpoint 1** (Dia 1): Infraestrutura + População de dados ← **VOCÊ ESTÁ AQUI**
2. **Checkpoint 2** (Dia 2): Upload XLSX funcionando
3. **Checkpoint 3** (Dia 3): Frontend conectado + Mapeamentos
4. **Checkpoint 4** (Dia 4): Cadastros persistidos
5. **Checkpoint 5** (Dia 5): Sistema de alertas
6. **Checkpoint 6** (Dia 6): Operações + Inventário
7. **Checkpoint 7** (Dia 7): Deploy + Testes finais

**Plano completo**: [.claude/plans/lucky-fluttering-firefly.md](.claude/plans/lucky-fluttering-firefly.md)

---

## 🔒 Segurança

**NUNCA commitar**:
- `.env`
- `firebase-credentials.json`
- Qualquer arquivo `*-firebase-adminsdk-*.json`

Esses arquivos já estão no `.gitignore`.

---

## 📚 Documentação

- **[SETUP_FIREBASE.md](SETUP_FIREBASE.md)** - Setup inicial Firebase
- **[CLAUDE.md](CLAUDE.md)** - Framework WAT e instruções do agente
- **[PRD.md](src/PRD.md)** - Product Requirements Document
- **[Plano de Implementação](.claude/plans/lucky-fluttering-firefly.md)** - Timeline completa

---

## 🐛 Reportar Bugs

[Criar issue no GitHub] ou falar com David diretamente.

---

## 👥 Time

- **David Benalcázar Chang** - Founder & Product
- **Bento** - Operations Manager
- **Carol** - Revenue
- **Arena** - Production Lead

---

**Desenvolvido com Claude Code** 🤖
