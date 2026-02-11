#!/bin/bash
# PixFlow - Quick Commands Reference
# Use estes comandos para agilizar desenvolvimento e deployment

# ============================================================================
# 🔧 DESENVOLVIMENTO LOCAL
# ============================================================================

# Backend (Terminal 1)
# cd backend && python app.py
# Runs on http://localhost:5000

# Frontend (Terminal 2)
# cd frontend && npm run dev
# Runs on http://localhost:5173
# Note: vite.config.js proxies /api to http://localhost:5000

# Install dependencies (first time)
# Backend:
#   cd backend && pip install -r requirements.txt

# Frontend:
#   cd frontend && npm install


# ============================================================================
# 📝 GERAR VARIÁVEIS SEGURAS
# ============================================================================

# JWT Secret (copia e cola para Render env):
# python -c "import secrets; print('JWT_SECRET=', secrets.token_hex(32))"

# Encryption Key (Fernet para MP tokens):
# python -c "from cryptography.fernet import Fernet; print('ENCRYPTION_KEY=', Fernet.generate_key().decode())"

# OU use o script interativo:
# cd pixflow && python generate_env.py


# ============================================================================
# 🗄️  DATABASE COMMANDS
# ============================================================================

# Connect to PostgreSQL database:
# psql postgresql://username:password@host:5432/database_name

# Common commands inside psql:
# \dt                    - List all tables
# SELECT * FROM users;  - View users
# SELECT * FROM charges; - View charges
# \du                    - List database users
# \q                     - Exit


# ============================================================================
# 🌐 DEPLOYMENT - RENDER (Backend)
# ============================================================================

# 1. Create Web Service on Render
#    - New → Web Service
#    - Connect GitHub repo
#    - Build: pip install -r requirements.txt
#    - Start: gunicorn (auto-detect from Procfile)

# 2. Set Environment Variables
#    Dashboard → Environment
#    DATABASE_URL=postgresql://...
#    JWT_SECRET=[from generate_env.py]
#    ENCRYPTION_KEY=[from generate_env.py]
#    FRONTEND_URL=https://pixflow.vercel.app
#    ADMIN_EMAIL=admin@pixflow.local
#    ADMIN_PASSWORD=Temp123!
#    FLASK_ENV=production

# 3. Monitor logs
#    Dashboard → Logs (tail live output)

# 4. Test health
#    curl https://pixflow-api.onrender.com/api/health

# View logs from terminal:
# curl -s https://your-service.onrender.com/api/health | jq .


# ============================================================================
# 🌐 DEPLOYMENT - VERCEL (Frontend)
# ============================================================================

# 1. Create Project on Vercel
#    - New Project → GitHub → frontend repo
#    - Framework: Vite
#    - Root: frontend
#    - Build: npm run build
#    - Output: dist

# 2. Set Environment Variables
#    Settings → Environment Variables
#    VITE_API_BASE=https://pixflow-api.onrender.com

# 3. Redeploy after env changes
#    Dashboard → Deployments → Redeploy

# Rebuild frontend (clears cache):
# Vercel Dashboard → Settings → Advanced → Clear Build Cache → Redeploy


# ============================================================================
# 🧪 TESTING ENDPOINTS
# ============================================================================

# Health check:
curl -X GET https://pixflow-api.onrender.com/api/health

# Login:
curl -X POST https://pixflow-api.onrender.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@pixflow.local","password":"Temp123!"}'

# Create charge (requiresauth):
curl -X POST https://pixflow-api.onrender.com/api/charges \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"amount":50.00}'

# Get dashboard stats:
curl https://pixflow-api.onrender.com/api/dashboard/stats \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"


# ============================================================================
# 🔄 GIT COMMANDS
# ============================================================================

# Make changes and push:
git add .
git commit -m "Update environment variables"
git push origin main

# Render auto-deploys on push ✓
# Vercel auto-deploys on push ✓

# View commit history:
git log --oneline

# Undo last commit (before push):
git reset HEAD~1

# Stash changes (safe for later):
git stash
git stash pop  # restore

# Create new branch for feature:
git checkout -b feature/my-feature
git push origin feature/my-feature


# ============================================================================
# 📦 DEPENDENCY MANAGEMENT
# ============================================================================

# Install new package (backend):
cd backend
pip install new-package-name
pip freeze > requirements.txt  # update requirements.txt

# Install new package (frontend):
cd frontend
npm install new-package-name

# Check outdated packages:
pip list --outdated       # backend
npm outdated              # frontend


# ============================================================================
# 🔍 DEBUGGING
# ============================================================================

# Check Flask app syntax:
python -m py_compile backend/app.py

# Run Flask development server with debug:
export FLASK_ENV=development
python backend/app.py  # Debug mode ON, auto-reload ON

# Check if port is in use:
lsof -i :5000  # port 5000
lsof -i :5173  # port 5173

# Kill process on port:
kill -9 $(lsof -t -i :5000)

# Check Python version:
python --version
python3 --version

# Validate JSON:
curl ... | python -m json.tool


# ============================================================================
# 🔐 SECURITY CHECKS
# ============================================================================

# Scan requirements.txt for vulnerabilities:
pip install safety
safety check -r backend/requirements.txt

# Check Node dependencies:
npm audit

# Never commit secrets:
echo ".env" >> .gitignore
git rm --cached .env  # remove if already committed

# View sensitive files in git history:
git log --all --full-history -- .env


# ============================================================================
# 📊 MONITORING
# ============================================================================

# Watch Render logs live:
# Render Dashboard → Your Service → Logs (Auto-tail)

# Watch Vercel build:
# Vercel Dashboard → Deployments → Click build (View logs)

# Monitor CPU/Memory (Render):
# Render Dashboard → Metrics

# Monitor performance (Vercel):
# Vercel Dashboard → Analytics


# ============================================================================
# 💾 BACKUP & RESTORE
# ============================================================================

# Backup PostgreSQL (local or remote):
pg_dump postgresql://user:pass@host:5432/db > backup.sql

# Restore PostgreSQL:
psql postgresql://user:pass@host:5432/db < backup.sql

# Export Charges to CSV (via endpoint):
# GET /api/charges/export → downloads CSV

# Manual database export (direct query):
psql postgresql://... << EOF
\copy (SELECT * FROM charges) To '/tmp/charges.csv' With CSV HEADER;
EOF


# ============================================================================
# 🚀 FULL DEPLOYMENT WORKFLOW
# ============================================================================

# 1. Generate secure secrets
python generate_env.py

# 2. Update Render environment (copy values from step 1)
# [Manual in Render Dashboard]

# 3. Verify backend local
cd backend && python app.py
# curl localhost:5000/api/health

# 4. Push to GitHub
git add .
git commit -m "Ready for deployment"
git push origin main

# 5. Wait for Render deploy (3-5 min)
# [Monitor in Render Dashboard]

# 6. Get real backend URL and update Vercel
# [Manual in Vercel Dashboard → VITE_API_BASE]

# 7. Vercel auto-deploys
# [Monitor in Vercel Dashboard]

# 8. Test production URLs
curl https://your-backend.onrender.com/api/health
open https://your-frontend.vercel.app

# 9. Change admin password in app
# Login → Settings → Change Password

# Done! 🎉


# ============================================================================
# 📞 QUICK HELP
# ============================================================================

# View this file:
cat QUICK_COMMANDS.md

# More info:
cat README.md                    # Project overview
cat DEPLOYMENT.md               # Detailed deployment guide
cat DEPLOYMENT_CHECKLIST.md     # Checklist before deploying
cat .env.example               # Environment variables template

# Health check endpoint (no auth required):
GET /api/health
# Response: {"status": "ok"}
