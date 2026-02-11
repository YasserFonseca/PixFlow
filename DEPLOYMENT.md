# 🚀 PIXFLOW - Production Deployment Guide

Guia passo-a-passo para fazer deploy do PixFlow em Render.com (Backend) e Vercel (Frontend).

---

## 📋 Pré-requisitos

- [x] Conta Render.com (free / startup tier)
- [x] Conta Vercel (free)
- [x] Repository GitHub com ambos os folders (backend/ e frontend/)
- [x] PostgreSQL database (Render fornece ou use ElephantSQL)

---

## PARTE 1: Backend no Render.com

### 1.1 Criar Web Service no Render

1. Acesse [https://dashboard.render.com](https://dashboard.render.com)
2. Clique em "New +" → "Web Service"
3. Conecte seu repositório GitHub
4. Configure:
   - **Name**: `pixflow-api` (ou seu nome)
   - **Environment**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn --workers 4 --worker-class sync --bind 0.0.0.0:$PORT --timeout 30 app:app`
   - **Plan**: Free ou Starter

### 1.2 Configurar Variáveis de Ambiente

No dashboard do seu Web Service, vá para **Environment**:

```bash
DATABASE_URL = postgresql://user:password@host:5432/pixflow
JWT_SECRET = <gere com: openssl rand -hex 32>
ENCRYPTION_KEY = <gere com: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())">
FRONTEND_URL = https://pixflow.vercel.app  # Seu domínio Vercel (depois de deploy)
ADMIN_EMAIL = seu-email@example.com
ADMIN_PASSWORD = SenhaTemporaria123!Mude
FLASK_ENV = production
```

### 1.3 Database Setup

**Opção A: PostgreSQL no Render**
1. Na dashboard, crie um "PostgreSQL Database" no Render
2. Render fornecerá `DATABASE_URL` automático → copie para Web Service env vars

**Opção B: ElephantSQL (Free Tier)**
1. Acesse [https://www.elephantsql.com](https://www.elephantsql.com)
2. Crie instância PostgreSQL (free tier = 20MB)
3. Copie connection string → `DATABASE_URL`

### 1.4 Deploy Backend

1. Commit e push para GitHub (branch main ou production)
2. Render auto-detecta `backend/Procfile` e inicia deploy
3. Espere "Deploy successful" ✅
4. Copie sua URL: `https://pixflow-api.onrender.com`

---

## PARTE 2: Frontend no Vercel

### 2.1 Deploy do Frontend

1. Acesse [https://vercel.com](https://vercel.com)
2. Clique "New Project"
3. Importe seu repositório GitHub
4. Configure:
   - **Framework**: Vite
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

### 2.2 Configurar Variáveis de Ambiente

Na dashboard do proj Vercel, vá para **Settings** → **Environment Variables**:

```bash
VITE_API_BASE = https://pixflow-api.onrender.com  # URL do seu backend
```

### 2.3 Deploy

1. Vercel auto-detecta `frontend/vercel.json` com rewrites para SPA
2. Clique "Deploy"
3. Espere "Ready" ✅
4. Seu site estará em: `https://pixflow.vercel.app` (ou domínio customizado)

---

## PARTE 3: Post-Deployment Checklist

### Teste Backend

```bash
curl https://pixflow-api.onrender.com/api/health

# Resposta esperada:
# {"status": "ok"}
```

### Teste Login

1. Acesse seu frontend: `https://pixflow.vercel.app`
2. Login com:
   - Email: `admin@pixflow.local` (ou qual configurou)
   - Password: `ChangeMe123!` (a temporária configurada)

### Criar Primeiro Usuário do Mercado Pago

1. Faça login como admin
2. Vá para Configurações → Adicionar Token MP
3. Cole seu **Access Token** do Mercado Pago
4. Teste criando uma cobrança

### Monitorar Logs

**Backend (Render)**:
```
Dashboard → Seu Web Service → Logs
```

**Frontend (Vercel)**:
```
Dashboard → Seu Projeto → Deployments → Logs
```

---

## PARTE 4: Variáveis de Ambiente Detalhadas

### DATABASE_URL

**PostgreSQL (Render)**:
```
postgresql://username:password@hostname:5432/database_name
```
[Render fornece automaticamente ao criar Database]

**PostgreSQL (ElephantSQL)**:
```
postgresql://username:password@host.db.elephantsql.com:5432/database_name
```

### JWT_SECRET

Gere uma string criptográfica segura:
```bash
# No macOS/Linux:
openssl rand -hex 32

# No Python:
python -c "import secrets; print(secrets.token_hex(32))"

# Exemplo: a1f2b3c4d5e6f7g8h9i0j1k2l3m4n5o6
```

### ENCRYPTION_KEY

Gere chave Fernet para criptografia:
```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# Exemplo: 5mHf8KrYz-9jLpQwXyZ0aB1cD2eF3gH4iJ5kL6mN7oP8qR9sTu0vW1xY2zA3b=
```

### FRONTEND_URL

URL pública do seu frontend (para CORS):
```
https://pixflow.vercel.app
# OU seu domínio customizado
https://seu-dominio.com
```

### MERCADO_PAGO_ACCESS_TOKEN

**⚠️ DEPRECATED** - Agora cada usuário configura seu próprio token via `/api/settings/mp`

Deixe vazio ou remova esta variável. Mantém compatibilidade para fallback apenas.

---

## PARTE 5: Troubleshooting

### ❌ "502 Bad Gateway" no Render

**Causa**: Procfile incorreto ou erro no app.py

**Solução**:
```bash
# No Render dashboard → Logs
# Procure por erro de startup
# Verifique se Procfile existe em backend/
# Verifique se requirements.txt tem todas as dependências
```

### ❌ "CORS error" no Frontend

**Causa**: `FRONTEND_URL` não coincide com domínio real

**Solução**:
```bash
# Render Dashboard → Environment
# DATABASE_URL = https://seu-dominio-vercel.vercel.app
# Redeploy
```

### ❌ "ModuleNotFoundError: No module named 'xxx'"

**Causa**: Falta dependência em requirements.txt

**Solução**:
```bash
# Adicione a dependência em backend/requirements.txt
# Commit e push
# Render auto-redeploy
```

### ❌ "Invalid DATABASE_URL"

**Causa**: String de conexão malformada

**Solução**:
```bash
# Verifique formato:
postgresql://user:pass@host:5432/dbname
# Especiais na senha? URL-encode: @ → %40, : → %3A, etc.
```

---

## PARTE 6: Segurança em Produção

### Mudar Senha Admin

1. Faça login como admin
2. Menu → Trocar Senha
3. Salve a nova senha em local seguro

### Remover Dados de Teste

```bash
# Conectar ao banco PostgreSQL production:
psql postgresql://user:pass@host:5432/pixflow

# Deletar testes:
DELETE FROM charges WHERE user_id IN (SELECT id FROM users WHERE email LIKE '%test%');
DELETE FROM users WHERE email LIKE '%test%';
```

### Ativar HTTPS

- ✅ Render: Automático com certificado SSL
- ✅ Vercel: Automático com certificado SSL
- ✅ Domínio customizado: Configurar DNS no seu registrador

### Monitorar Taxa de Erro

**Render**:
- Dashboard → Seu Web Service → Metrics
- Monitore: Response time, Error rate, CPU

**Vercel**:
- Dashboard → Seu Projeto → Analytics
- Monitore: Performance, Errors

---

## PARTE 7: Escalabilidade Futura

### Se precisar de Multi-Worker (mais tráfego)

**Render**: Upgrade para plano pago (Starter ou superior)

**Vercel**: Continua serverless (escala automaticamente)

### Se precisar de Cache (Redis)

Adicione Redis no Render:
```bash
# Render Dashboard → New → Redis
# Crie instância
# Render fornece: REDIS_URL
# backend/requirements.txt: adicione redis==5.0.0
# app.py: use Redis ao invés de memory para rate limiting
```

---

## Próximos Passos

1. ✅ Criar repositório GitHub com backend/ e frontend/
2. ✅ Gerar variáveis seguras (JWT_SECRET, ENCRYPTION_KEY)
3. ✅ Fazer deploy Backend no Render
4. ✅ Fazer deploy Frontend no Vercel
5. ✅ Configurar domínio customizado (opcional)
6. ✅ Backup automático do banco (Render Database ou ElephantSQL)

---

**Suporte**:
- Render Docs: https://render.com/docs
- Vercel Docs: https://vercel.com/docs
- PostgreSQL Docs: https://www.postgresql.org/docs
