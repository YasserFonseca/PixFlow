PIXFLOW — BACKEND (Windows / PowerShell)

1) INSTALAR PYTHON (se precisar):
   - Abra PowerShell como Admin:
     winget install -e --id Python.Python.3.12

   Depois feche e reabra o terminal.

   Teste:
     py --version

2) ENTRAR NA PASTA backend:
   cd backend

3) CRIAR e ATIVAR VENV:
   py -m venv venv
   .\venv\Scripts\activate

4) INSTALAR DEPENDÊNCIAS:
   py -m pip install -r requirements.txt

5) CRIAR .env:
   copy .env.example .env

6) RODAR API:
   py app.py

API sobe em:
   http://localhost:5000

Testar no navegador:
   http://localhost:5000/  (deve aparecer "PixFlow API rodando")

Rotas principais:
- POST /api/login
- GET  /api/me
- POST /api/pix
- POST /api/charges
- GET  /api/charges
- PATCH /api/charges/<id>
- GET /api/export/charges.csv

Admin:
- GET  /api/admin/users
- POST /api/admin/invite
- PATCH /api/admin/users/<id>/toggle
- POST /api/admin/reset-link
- POST /api/reset
