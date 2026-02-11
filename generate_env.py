#!/usr/bin/env python3
"""
Generate secure environment variables for PixFlow production deployment.
Usage: python generate_env.py
"""

import os
import secrets
from cryptography.fernet import Fernet


def print_header(title):
    """Print formatted section header."""
    print(f"\n{'=' * 70}")
    print(f"  {title}")
    print(f"{'=' * 70}\n")


def generate_jwt_secret():
    """Generate a secure JWT secret."""
    return secrets.token_hex(32)


def generate_encryption_key():
    """Generate a Fernet encryption key."""
    return Fernet.generate_key().decode()


def main():
    print_header("🔐 PixFlow Environment Variables Generator")

    print("Esta ferramenta gera variáveis seguras para produção.\n")

    # JWT Secret
    print("1️⃣  JWT_SECRET (para asinar tokens)")
    jwt_secret = generate_jwt_secret()
    print(f"   Valor: {jwt_secret}")
    print(f"   ✅ Copie acima para Render Dashboard → Environment\n")

    # Encryption Key
    print("2️⃣  ENCRYPTION_KEY (para criptografia Fernet)")
    encryption_key = generate_encryption_key()
    print(f"   Valor: {encryption_key}")
    print(f"   ✅ Copie acima para Render Dashboard → Environment\n")

    # Database URL
    print("3️⃣  DATABASE_URL (PostgreSQL)")
    print("   Você tem 2 opções:")
    print("   A) Render Database (automático ao criar)")
    print("   B) ElephantSQL (https://www.elephantsql.com)")
    print("\n   Formato: postgresql://user:password@host:5432/database\n")

    # Frontend URL
    print("4️⃣  FRONTEND_URL (seu domínio Vercel)")
    print("   Exemplo: https://pixflow.vercel.app")
    print("   OU: https://seu-dominio.com\n")

    # Admin credentials
    print("5️⃣  ADMIN_EMAIL e ADMIN_PASSWORD (usuário inicial)")
    print("   Email: admin@pixflow.local")
    print("   Password: SenhaTemporaria123! (MUDE APÓS LOGIN)\n")

    # Summary
    print_header("📋 Resumo - Copie para Render Dashboard")
    print(f"""
DATABASE_URL = [PostgreSQL connection string]
JWT_SECRET = {jwt_secret}
ENCRYPTION_KEY = {encryption_key}
FRONTEND_URL = https://seu-dominio-vercel.vercel.app
ADMIN_EMAIL = admin@pixflow.local
ADMIN_PASSWORD = SenhaTemporaria123!
FLASK_ENV = production
    """)

    print_header("🔗 Próximos Passos")
    print("""
1. Copie JWT_SECRET e ENCRYPTION_KEY acima
2. Acesse https://dashboard.render.com
3. Vá para seu Web Service → Settings → Environment
4. Adicione as 7 variáveis acima
5. Clique "Save Changes" e espere redeploy
6. Faça o mesmo para VITE_API_BASE no Vercel
7. Teste: https://seu-dominio.vercel.app

Documentação detalhada: veja DEPLOYMENT.md
    """)


if __name__ == "__main__":
    main()
