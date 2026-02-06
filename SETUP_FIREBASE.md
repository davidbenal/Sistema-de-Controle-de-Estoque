# Setup Firebase - Sistema de Controle de Estoque Montuvia

## Passo 1: Criar Projeto Firebase

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Clique em "Adicionar projeto" ou "Add project"
3. Nome do projeto: **`montuvia-estoque`**
4. Desabilite Google Analytics (não é necessário para MVP)
5. Clique em "Criar projeto"

## Passo 2: Habilitar Firestore Database

1. No menu lateral, clique em **"Build" → "Firestore Database"**
2. Clique em "Criar banco de dados" ou "Create database"
3. **Modo de produção** (vamos configurar regras depois)
4. **Localização**: escolha `southamerica-east1` (São Paulo) para menor latência
5. Aguarde a criação (1-2 minutos)

## Passo 3: Habilitar Storage

1. No menu lateral, clique em **"Build" → "Storage"**
2. Clique em "Começar" ou "Get started"
3. **Modo de produção**
4. **Localização**: `southamerica-east1` (São Paulo)
5. Confirmar

## Passo 4: Habilitar Authentication

1. No menu lateral, clique em **"Build" → "Authentication"**
2. Clique em "Começar" ou "Get started"
3. Na aba "Sign-in method", habilitar:
   - **Email/Password** → Ativar
4. Salvar

## Passo 5: Gerar Service Account (Credenciais para Backend)

1. No menu lateral, clique no ícone de **engrenagem ⚙️** → "Configurações do projeto" / "Project settings"
2. Vá para a aba **"Service accounts"**
3. Clique em **"Gerar nova chave privada"** / **"Generate new private key"**
4. Clique em **"Gerar chave"** / **"Generate key"**
5. Um arquivo JSON será baixado (ex: `montuvia-estoque-firebase-adminsdk-xxxxx.json`)
6. **IMPORTANTE**: Renomeie para `firebase-credentials.json` e mova para a raiz do projeto

## Passo 6: Copiar Configurações

### Config para Backend (Node.js)

No mesmo lugar (Service accounts), copie os valores:
- **Project ID**: `montuvia-estoque` (ou similar)
- **Client Email**: `firebase-adminsdk-xxxxx@montuvia-estoque.iam.gserviceaccount.com`

### Config para Frontend (Web App)

1. Volte para **"Configurações do projeto"**
2. Role até **"Seus apps"** / **"Your apps"**
3. Clique no ícone **</>** (Web)
4. Apelido do app: `Montuvia Web`
5. **NÃO** marcar "Also set up Firebase Hosting" (faremos no Vercel)
6. Registrar app
7. Copie o objeto `firebaseConfig` que aparece:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "montuvia-estoque.firebaseapp.com",
  projectId: "montuvia-estoque",
  storageBucket: "montuvia-estoque.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

## Passo 7: Configurar .env

Depois de gerar as credenciais, execute o próximo comando que vou fornecer e eu criarei o arquivo `.env` automaticamente.

## Próximos Passos

Após completar esses passos:
1. Me informe que terminou
2. Me forneça:
   - Project ID
   - Caminho do arquivo `firebase-credentials.json` baixado
   - Confirme que está na raiz do projeto

Eu vou:
✅ Criar o arquivo `.env` com as credenciais
✅ Configurar o backend Node.js
✅ Criar o script de migração dos dados do Excel
✅ Popular o Firebase automaticamente

---

**Tempo estimado**: 5-10 minutos

Se tiver qualquer dúvida, me chame!
