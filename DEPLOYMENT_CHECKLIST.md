# ✅ PixFlow - Pre-Deployment Checklist

Use este checklist para garantir tudo está pronto antes de fazer deploy.

---

## 🔧 CONFIGURAÇÃO LOCAL

### Backend

- [ ] `backend/requirements.txt` contém todas as dependências (11 packages)
- [ ] `backend/Procfile` existe com comando gunicorn correto
- [ ] `backend/app.py` executa sem erros: `python app.py`
- [ ] Endpoints testados localmente via Postman/curl
- [ ] SQLite funcionando para testes: `sqlite:///pixflow.db`

### Frontend

- [ ] `frontend/package.json` contém scripts build e dev
- [ ] `frontend/vite.config.js` existe com proxy /api
- [ ] `frontend/vercel.json` existe com rewrites e headers
- [ ] `npm run dev` funciona sem erros na porta 5173
- [ ] `npm run build` gera `dist/` sem warnings

### Variáveis de Ambiente

- [ ] `.env.example` criado com todos os campos
- [ ] `generate_env.py` funciona: `python generate_env.py`
- [ ] JWT_SECRET e ENCRYPTION_KEY gerados e guardados (seguro!)
- [ ] DATABASE_URL obtida (Render PostgreSQL ou ElephantSQL)

---

## 🌐 PREPARAÇÃO RENDER (Backend)

### Conta & Repositório

- [ ] Criada conta Render.com (free tier ok para MVP)
- [ ] GitHub repo contém pasta `backend/` com código
- [ ] Conectado repo GitHub ao Render

### Web Service Configuration

- [ ] **Name**: pixflow-api ✓
- [ ] **Language**: Python 3 ✓
- [ ] **Build Command**: `pip install -r requirements.txt` ✓
- [ ] **Start Command**: Auto-detecta Procfile ✓
- [ ] **Plan**: Free (depois escalável)

### Environment Variables

- [ ] DATABASE_URL = `postgresql://...` (Render DB ou ElephantSQL)
- [ ] JWT_SECRET = `[gerado por generate_env.py]`
- [ ] ENCRYPTION_KEY = `[gerado por generate_env.py]`
- [ ] FRONTEND_URL = `https://pixflow.vercel.app` (depois do deploy Vercel)
- [ ] ADMIN_EMAIL = `admin@pixflow.local`
- [ ] ADMIN_PASSWORD = `SenhaTemporaria123!` (MUDE após login)
- [ ] FLASK_ENV = `production`

### Database

- [ ] PostgreSQL criado (Render Database OU ElephantSQL)
- [ ] CONNECTION STRING testada: `psql postgresql://...`
- [ ] Banco está vazio (primeira inicialização)

---

## 🌐 PREPARAÇÃO VERCEL (Frontend)

### Conta & Repositório

- [ ] Criada conta Vercel (free tier ok)
- [ ] GitHub repo contém pasta `frontend/` com código
- [ ] Conectado repo GitHub ao Vercel

### Project Configuration

- [ ] **Framework**: Vite ✓
- [ ] **Root Directory**: `frontend` ✓
- [ ] **Build Command**: `npm run build` ✓
- [ ] **Output Directory**: `dist` ✓

### Environment Variables

- [ ] VITE_API_BASE = `https://pixflow-api.onrender.com`
  - (Mude para seu domínio Render real)

### Vercel.json

- [ ] Existe `frontend/vercel.json` com:
  - buildCommand
  - outputDirectory
  - rewrites (SPA + /api proxy)
  - headers (cache + CORS)

---

## 🚀 DEPLOYMENT SEQUÊNCIA

### 1º - Deploy Backend

- [ ] Fazer push para GitHub (branch main)
- [ ] Aguardar Render build (3-5 min)
- [ ] Deploy "Ready" ✓
- [ ] URL Backend: `https://pixflow-api.onrender.com` (ou sua URL)
- [ ] Test: `curl https://seu-backend/api/health`

### 2º - Atualizar Frontend Variável

- [ ] Copiar URL real do backend: `https://pixflow-api.xxxxx.onrender.com`
- [ ] Vercel Dashboard → Variables → VITE_API_BASE = [sua URL]
- [ ] Salvar mudanças

### 3º - Deploy Frontend

- [ ] Fazer push para GitHub
- [ ] Vercel auto-redeploy
- [ ] Deploy "Ready" ✓
- [ ] URL Frontend: `https://pixflow.vercel.app` (ou sua URL)
- [ ] Test: `curl https://seu-frontend`

### 4º - Verificação Cruzada

- [ ] Abrir Frontend → deve conectar ao Backend ✓
- [ ] Fazer Login com admin@pixflow.local
- [ ] Redefinir senha do admin (IMPORTANTE!)
- [ ] Adicionar token Mercado Pago via Settings
- [ ] Testar criação de cobrança

---

## 🔐 PÓS-DEPLOYMENT SEGURANÇA

### Admin Account

- [ ] Senha admin alterada (não usar "SenhaTemporaria123!")
- [ ] Email admin verificado
- [ ] 2FA considerado (opcional mas recomendado)

### Database

- [ ] PostgreSQL tem backup automático (Render ou ElephantSQL)
- [ ] Conexão é SSL/TLS criptografada
- [ ] Credenciais banco guardadas em local seguro

### API

- [ ] CORS restrito a seu domínio Vercel
- [ ] Rate limiting ativo (200/dia global)
- [ ] Logs monitorados (Render Dashboard)
- [ ] HTTPS obrigatório (automático)

### Secrets

- [ ] JWT_SECRET nunca commitado em Git (em .gitignore)
- [ ] ENCRYPTION_KEY nunca commitado em Git
- [ ] .env nunca commitado (apenas .env.example)
- [ ] Backups locais de chaves em local seguro

---

## 📊 MONITORAMENTO

### Render Dashboard

- [ ] Criar alertas para 500 errors
- [ ] Monitorar CPU e Memoria
- [ ] Logs sem "ModuleNotFoundError"
- [ ] Redeploy automático em push (ativado)

### Vercel Dashboard

- [ ] Check analytics página
- [ ] Nenhum 404 em / (SPA rewrite funcionando)
- [ ] Performance > 90 score

### Tests Manuais

- [ ] Login funciona
- [ ] Criar cobrança retorna QR code
- [ ] Dashboard carrega stats
- [ ] Refund processa sem erro
- [ ] Admin panel acessa users

---

## 🎯 PRÓXIMOS PASSOS

Após deployment bem-sucedido:

1. **Customizar Domínio** (opcional)
   - Compre domínio
   - Configure DNS em Vercel + Render
   - SSL automático

2. **Backup Database**
   - Configure backup automático (Render ou ElephantSQL)
   - Teste restore procedure

3. **Escalabilidade** (se crescimento)
   - Upgrade Render para plano pago (multi-worker)
   - Considere Redis para cache/rate-limiting

4. **Monitoramento**
   - Configure alertas email para erros
   - Log centralizadoem (sentry, datadog)

5. **CI/CD**
   - GitHub Actions para testes automáticos
   - Deploy automático ao PR merge

---

## ❓ Precisa de ajuda?

```bash
# Testar Backend local
cd backend && python app.py

# Testar Frontend local
cd frontend && npm run dev

# Verificar dependências instaladas
cd backend && pip list
cd frontend && npm list

# Limpar cache Vercel
# Vercel Dashboard → Project Settings → Advanced → Clear Build Cache
```

---

**Status**: 🟡 Pronto para deploy
**Última verificação**: [DATE]
**Próximo**: Executar deployment em sequência acima ✅
