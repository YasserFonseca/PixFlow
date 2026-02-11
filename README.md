# 🚀 PixFlow - SaaS Payment Collection Platform

Plataforma segura, multi-tenant para coleta de pagamentos via Mercado Pago.

---

## 📦 Estrutura do Projeto

```
pixflow/
├── backend/           # Flask API (Python)
│   ├── app.py        # Aplicação principal com endpoints
│   ├── Procfile      # Configuração Gunicorn para Render ✅
│   └── requirements.txt
├── frontend/          # React UI (JavaScript)
│   ├── src/
│   ├── vite.config.js # Build config com proxy dev ✅
│   ├── vercel.json    # Configuração Vercel para SPA + API ✅
│   ├── package.json
│   └── index.html
├── .env.example       # Template de variáveis ✅
├── DEPLOYMENT.md      # Guia completo deployment ✅
└── generate_env.py    # Script gerar variáveis seguras ✅
```

---

## 🎯 Status Atual

| Componente | Status | Notas |
|-----------|--------|-------|
| Backend Flask | ✅ Pronto | PostgreSQL, JWT, Rate Limiting, Multi-tenant |
| Frontend React | ✅ Pronto | Mobile-first, Cashier UI, Dashboard Analytics |
| Procfile | ✅ Criado | Gunicorn 4 workers, timeout 30s |
| vercel.json | ✅ Criado | SPA rewrites + API proxy |
| Variáveis Env | ✅ Documentado | .env.example + generate_env.py |
| Deployment Guide | ✅ Completo | DEPLOYMENT.md com passo-a-passo |

---

## 🚀 Deploy em 10 Minutos

### 1️⃣ Gerar Variáveis Seguras

```bash
cd pixflow
python generate_env.py
```

Seguir instruções e copiar JWT_SECRET e ENCRYPTION_KEY.

### 2️⃣ Backend no Render

1. Acesse [https://render.com](https://render.com)
2. **New Web Service**
3. Conecte repo GitHub
4. Configure:
   ```
   Name: pixflow-api
   Build: pip install -r requirements.txt
   Start: [Render auto-detecta Procfile] ✅
   Plan: Free
   ```
5. **Environment**: Adicione 7 variáveis (copie de generate_env.py)
6. **Deploy** ✅

### 3️⃣ Frontend no Vercel

1. Acesse [https://vercel.com](https://vercel.com)
2. **New Project** → GitHub
3. Configure:
   ```
   Framework: Vite
   Root: frontend
   Build: npm run build
   Output: dist
   ```
4. **Environment**: VITE_API_BASE = https://seu-backend-render.onrender.com
5. **Deploy** ✅

### 4️⃣ Testar

```bash
# Backend health
curl https://seu-backend.onrender.com/api/health

# Frontend
https://seu-frontend.vercel.app
```

---

## 📚 Documentação

### Para Desenvolvimento Local

1. Backend:
   ```bash
   cd backend
   pip install -r requirements.txt
   python app.py  # Roda em http://localhost:5000
   ```

2. Frontend:
   ```bash
   cd frontend
   npm install
   npm run dev  # Roda em http://localhost:5173
   # Proxy automático para /api via vite.config.js
   ```

### Para Produção

📖 Veja [DEPLOYMENT.md](DEPLOYMENT.md) para:
- Passo-a-passo detalhado Render + Vercel
- Configuração PostgreSQL (Render ou ElephantSQL)
- Troubleshooting (502 errors, CORS issues, etc)
- Segurança pós-deployment
- Escalabilidade

### Variáveis de Ambiente

`.env.example` contém template com todas as variáveis necessárias.

**Importante**: Nunca commitar `.env` com valores reais!

---

## 🔑 Funcionalidades

### Backend (Flask)

- ✅ **Autenticação JWT** - Login com email/senha
- ✅ **Multi-tenant** - Cada usuário com seu token MP criptografado
- ✅ **Rate Limiting** - Proteção contra brute-force
- ✅ **Mercado Pago Integration** - Criar cobranças, refundar
- ✅ **Analytics** - Dashboard 7 dias com crescimento
- ✅ **Admin Panel** - Gerenciar usuários e convites

### Frontend (React)

- ✅ **Cashier UI** - Teclado numérico, QR code, som
- ✅ **Dashboard** - Gráfico 7 dias, métricas, settings
- ✅ **Mobile-First** - Responsive design
- ✅ **SPA Routing** - React Router com rewrites Vercel

---

## 🔐 Segurança

| Aspecto | Implementação |
|--------|---------------|
| **Banco de Dados** | PostgreSQL (não SQLite em prod) |
| **Senhas** | Werkzeug hashing com salt |
| **API Auth** | JWT com 12h expiration |
| **Token MP** | Encrypted Fernet (não plain text) |
| **CORS** | Restrito a FRONTEND_URL |
| **Rate Limiting** | 200/dia global, 50/hora login |
| **HTTPS** | Automático (Render + Vercel) |

---

## 🐛 Troubleshooting

### Erro ao fazer deploy?

```bash
# 1. Verifique requirements.txt
pip install -r backend/requirements.txt

# 2. Verifique Procfile existe
ls backend/Procfile

# 3. Verifique vercel.json existe
ls frontend/vercel.json

# 4. Teste backend local
cd backend && python app.py

# 5. Teste frontend local
cd frontend && npm run dev
```

### "502 Bad Gateway" do Render?

Ver **DEPLOYMENT.md → Troubleshooting** para diagnostic steps.

### "CORS error" no frontend?

Verifique:
- `FRONTEND_URL` variável no Render
- Matches seu domínio Vercel real
- Redeploy do backend

---

## 📞 Suporte

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Flask Docs**: https://flask.palletsprojects.com
- **React Docs**: https://react.dev

---

## 📄 Licença

Proprietary - Cliente PixFlow
