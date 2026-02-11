import os
import secrets
import csv
import io
from datetime import datetime, timedelta

from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity,
)
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from werkzeug.security import generate_password_hash, check_password_hash
from cryptography.fernet import Fernet
from dotenv import load_dotenv
import mercadopago

load_dotenv()

app = Flask(__name__)

# Token encryption for Mercado Pago credentials
encryption_key = os.getenv("ENCRYPTION_KEY") or None

if not encryption_key:
    print("⚠️  ENCRYPTION_KEY não configurada. Gerando nova chave...")
    encryption_key = Fernet.generate_key().decode()
    print(f"⚠️  Adicione ao .env: ENCRYPTION_KEY={encryption_key}")

cipher = Fernet(encryption_key.encode() if isinstance(encryption_key, str) else encryption_key)


def encrypt_mp_token(token: str) -> str:
    return cipher.encrypt(token.encode()).decode()


def decrypt_mp_token(encrypted_token: str) -> str:
    try:
        return cipher.decrypt(encrypted_token.encode()).decode()
    except Exception as e:
        raise ValueError(f"Erro ao descriptografar token: {str(e)}")

# CORS restricted to trusted origin (or * in debug)
frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173").strip()
allowed_origins = ["*"] if app.debug else [frontend_url]

CORS(
    app,
    resources={r"/api/*": {"origins": allowed_origins}},
    supports_credentials=True,
    allow_headers=["Content-Type", "Authorization"]
)

# Database: PostgreSQL in production, SQLite locally
db_url = os.getenv("DATABASE_URL") or "sqlite:///pixflow.db"

if "sqlite" in db_url:
    print("⚠️  SQLite detected - use PostgreSQL in production")
else:
    print("✅ PostgreSQL configured")

app.config["SQLALCHEMY_DATABASE_URI"] = db_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

jwt_secret = os.getenv("JWT_SECRET") or "devsecret"
app.config["JWT_SECRET_KEY"] = jwt_secret

db = SQLAlchemy(app)
jwt = JWTManager(app)

# Rate limiting (global: 200/day, 50/hour)
limiter = Limiter(
    app=app,
    key_func=get_remote_address,
    default_limits=["200 per day", "50 per hour"],
    storage_uri="memory://"  # TODO: Use Redis in production
)

limiter.request_loaders_base = []


# ============ MODELS ============
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    email = db.Column(db.String(255), unique=True, nullable=False)
    name = db.Column(db.String(255), nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)

    pix = db.Column(db.String(255), nullable=True)
    mp_token_encrypted = db.Column(db.Text, nullable=True)  # Encrypted Mercado Pago token

    role = db.Column(db.String(50), default="user")
    active = db.Column(db.Boolean, default=True)
    must_change_password = db.Column(db.Boolean, default=False)  # Force change on first login

    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class Charge(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)  # dono (multi-tenant)

    client = db.Column(db.String(255), nullable=False)
    value = db.Column(db.String(50), nullable=False)
    message = db.Column(db.Text, nullable=True)

    status = db.Column(db.String(50), default="pending")  # pending/paid/canceled
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


class ResetToken(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, nullable=False)

    secret = db.Column(db.String(255), nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def password_is_valid(pw: str) -> bool:
    return isinstance(pw, str) and len(pw) == 8  # Exactly 8 chars


def get_current_user():
    uid = get_jwt_identity()
    return User.query.get(int(uid)) if uid else None


def require_admin():
    u = get_current_user()
    if not u or u.role != "admin":
        return None
    return u


def make_reset_link(rt_id: int, secret: str) -> str:
    frontend = os.getenv("FRONTEND_URL") or "http://localhost:5173"
    return f"{frontend}/reset?token={rt_id}.{secret}"


# Initialize database and admin user
with app.app_context():
    db.create_all()

    admin_email = normalize_email(os.getenv("ADMIN_EMAIL") or "admin@pixflow.local")
    admin_password = os.getenv("ADMIN_PASSWORD") or "admin1234"
    if len(admin_password) != 8:
        admin_password = "admin1234"

    if not User.query.filter_by(email=admin_email).first():
        db.session.add(
            User(
                email=admin_email,
                name="Admin PixFlow",
                password_hash=generate_password_hash(admin_password),
                role="admin",
                active=True,
                must_change_password=False,
            )
        )
        db.session.commit()


@app.get("/")
def home():
    return jsonify({"status": "PixFlow API", "hint": "/api/*"}), 200


# AUTH ENDPOINTS
@app.post("/api/login")
@limiter.limit("5 per 15 minutes")  # Brute-force protection
def login():
    data = request.get_json(force=True) or {}
    email = normalize_email(data.get("email"))
    password = data.get("password") or ""

    u = User.query.filter_by(email=email).first()

    if not u or not check_password_hash(u.password_hash, password):
        return jsonify({"error": "Credenciais inválidas"}), 401
    if not u.active:
        return jsonify({"error": "Conta desativada"}), 403

    token = create_access_token(identity=str(u.id), expires_delta=timedelta(hours=12))

    return jsonify(
        {"token": token, "must_change_password": bool(u.must_change_password)}
    )


@app.get("/api/me")
@jwt_required()
@limiter.limit("60 per hour")
def me():
    u = get_current_user()
    return jsonify(
        {
            "id": u.id,
            "email": u.email,
            "name": u.name,
            "role": u.role,
            "active": u.active,
            "pix": u.pix,
            "has_mp_token": bool(u.mp_token_encrypted),
            "must_change_password": bool(u.must_change_password),
        }
    )


@app.post("/api/change-password")
@jwt_required()
@limiter.limit("3 per hour")
def change_password():
    u = get_current_user()
    data = request.get_json(force=True) or {}
    new_pw = data.get("password") or ""

    if not password_is_valid(new_pw):
        return jsonify({"error": "Senha deve ter EXATAMENTE 8 caracteres"}), 400

    u.password_hash = generate_password_hash(new_pw)
    u.must_change_password = False
    db.session.commit()
    return jsonify({"ok": True})


@app.post("/api/pix")
@jwt_required()
@limiter.limit("10 per hour")
def set_pix():
    u = get_current_user()
    data = request.get_json(force=True) or {}
    pix = (data.get("pix") or "").strip()

    u.pix = pix if pix else None
    db.session.commit()
    return jsonify({"ok": True})


# MERCADO PAGO - Multi-tenant (each user has own token)
@app.post("/api/settings/mp")
@jwt_required()
@limiter.limit("5 per hour")
def set_mp_token():
    u = get_current_user()
    data = request.get_json(force=True) or {}
    mp_token = (data.get("mp_token") or "").strip()

    if not mp_token:
        return jsonify({"error": "Token do Mercado Pago é obrigatório"}), 400

    # Validar formato básico do token (Mercado Pago tokens são longos)
    if len(mp_token) < 20:
        return jsonify({"error": "Token inválido"}), 400

    try:
        encrypted_token = encrypt_mp_token(mp_token)
        u.mp_token_encrypted = encrypted_token
        db.session.commit()

        return jsonify({
            "ok": True,
            "message": "Token do Mercado Pago configurado com sucesso"
        })
    except Exception as e:
        return jsonify({"error": f"Erro ao salvar token: {str(e)}"}), 500


@app.get("/api/settings/mp")
@jwt_required()
@limiter.limit("10 per hour")
def get_mp_token():
    u = get_current_user()
    has_token = bool(u.mp_token_encrypted)
    
    return jsonify({
        "has_mp_token": has_token
    })


@app.post("/api/charges")
@jwt_required()
@limiter.limit("30 per hour")
def create_charge():
    u = get_current_user()
    
    if not u.mp_token_encrypted:
        return jsonify({
            "error": "Token do Mercado Pago não configurado",
            "hint": "Configure seu token em POST /api/settings/mp"
        }), 400
    
    data = request.get_json(force=True) or {}

    client = (data.get("client") or "").strip()
    value = (data.get("value") or "").strip()
    message = (data.get("message") or "").strip()

    if not client or not value:
        return jsonify({"error": "Cliente e valor são obrigatórios"}), 400

    try:
        mp_user_token = decrypt_mp_token(u.mp_token_encrypted)
    except ValueError as e:
        return jsonify({"error": f"Erro ao acessar credenciais: {str(e)}"}), 500

    try:
        mercadopago.Configuration.access_token = mp_user_token
        
        # TODO: Integrate real Mercado Pago payment creation
        c = Charge(
            user_id=u.id,
            client=client,
            value=value,
            message=message,
            status="pending",
            # mp_payment_id=mp_payment_id,  # Campo futuro
        )
        db.session.add(c)
        db.session.commit()

        return jsonify({"ok": True, "id": c.id})

    except Exception as e:
        return jsonify({
            "error": f"Erro ao processar cobrança: {str(e)}"
        }), 400


@app.get("/api/charges")
@jwt_required()
@limiter.limit("30 per hour")
def list_charges():
    u = get_current_user()

    rows = (
        Charge.query.filter_by(user_id=u.id)
        .order_by(Charge.created_at.desc())
        .all()
    )

    return jsonify(
        [
            {
                "id": r.id,
                "client": r.client,
                "value": r.value,
                "message": r.message,
                "status": r.status,
                "created_at": r.created_at.isoformat(),
            }
            for r in rows
        ]
    )


@app.patch("/api/charges/<int:charge_id>")
@jwt_required()
@limiter.limit("30 per hour")
def update_charge(charge_id: int):
    u = get_current_user()
    r = Charge.query.get(charge_id)

    if not r or r.user_id != u.id:
        return jsonify({"error": "Não encontrado"}), 404

    data = request.get_json(force=True) or {}
    status = data.get("status")

    if status not in ("pending", "paid", "canceled"):
        return jsonify({"error": "status inválido"}), 400

    r.status = status
    db.session.commit()
    return jsonify({"ok": True})


@app.get("/api/export/charges.csv")
@jwt_required()
@limiter.limit("10 per hour")  # Exportação é recurso-intensiva
def export_csv():
    u = get_current_user()
    rows = (
        Charge.query.filter_by(user_id=u.id)
        .order_by(Charge.created_at.desc())
        .all()
    )

    output = io.StringIO()
    w = csv.writer(output)
    w.writerow(["id", "client", "value", "status", "created_at"])

    for r in rows:
        w.writerow([r.id, r.client, r.value, r.status, r.created_at.isoformat()])

    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=charges.csv"},
    )


# ANALYTICS
@app.get("/api/dashboard/stats")
@jwt_required()
@limiter.limit("20 per hour")
def dashboard_stats():
    u = get_current_user()
    
    today = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    seven_days_ago = today - timedelta(days=7)
    
    charges_7days = Charge.query.filter(
        Charge.user_id == u.id,
        Charge.status.in_(["approved", "paid"]),
        Charge.created_at >= seven_days_ago,
        Charge.created_at < today + timedelta(days=1)
    ).all()
    
    daily_revenue = {}
    for i in range(7):
        day = today - timedelta(days=6-i)
        daily_revenue[day.strftime("%Y-%m-%d")] = 0.0
    
    for charge in charges_7days:
        day_key = charge.created_at.strftime("%Y-%m-%d")
        if day_key in daily_revenue:
            try:
                daily_revenue[day_key] += float(charge.value)
            except (ValueError, TypeError):
                pass
    
    total_7days = sum(daily_revenue.values())
    count_7days = len(charges_7days)
    average_ticket = round(total_7days / count_7days, 2) if count_7days > 0 else 0.0
    
    today_start = today
    today_end = today + timedelta(days=1)
    charges_today = Charge.query.filter(
        Charge.user_id == u.id,
        Charge.status.in_(["approved", "paid"]),
        Charge.created_at >= today_start,
        Charge.created_at < today_end
    ).all()
    
    total_today = sum(float(c.value) for c in charges_today if c.value)
    count_today = len(charges_today)
    
    yesterday_start = today - timedelta(days=1)
    yesterday_end = today
    charges_yesterday = Charge.query.filter(
        Charge.user_id == u.id,
        Charge.status.in_(["approved", "paid"]),
        Charge.created_at >= yesterday_start,
        Charge.created_at < yesterday_end
    ).all()
    
    total_yesterday = sum(float(c.value) for c in charges_yesterday if c.value)
    count_yesterday = len(charges_yesterday)
    
    if total_yesterday > 0:
        revenue_growth = round(((total_today - total_yesterday) / total_yesterday) * 100, 1)
    else:
        revenue_growth = 100.0 if total_today > 0 else 0.0
    
    if count_yesterday > 0:
        sales_growth = round(((count_today - count_yesterday) / count_yesterday) * 100, 1)
    else:
        sales_growth = 100.0 if count_today > 0 else 0.0
    
    return jsonify({
        "revenue_by_day": [
            {
                "date": date_str,
                "day_name": datetime.strptime(date_str, "%Y-%m-%d").strftime("%a"),
                "revenue": round(daily_revenue[date_str], 2)
            }
            for date_str in sorted(daily_revenue.keys())
        ],
        "total_7days": round(total_7days, 2),
        "count_7days": count_7days,
        "average_ticket": average_ticket,
        "today": {
            "revenue": round(total_today, 2),
            "sales_count": count_today,
            "revenue_growth_percent": revenue_growth,
            "sales_growth_percent": sales_growth
        },
        "yesterday": {
            "revenue": round(total_yesterday, 2),
            "sales_count": count_yesterday
        }
    })


@app.get("/api/report/today")
@jwt_required()
@limiter.limit("30 per hour")
def report_today():
    u = get_current_user()
    
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    approved_charges = Charge.query.filter(
        Charge.user_id == u.id,
        Charge.status == "approved",
        Charge.created_at >= today_start,
        Charge.created_at < today_end
    ).all()
    
    total = 0.0
    for charge in approved_charges:
        try:
            total += float(charge.value)
        except (ValueError, TypeError):
            pass
    
    return jsonify({
        "total": round(total, 2),
        "count": len(approved_charges),
        "date": today_start.date().isoformat()
    })


@app.post("/api/refund/<int:charge_id>")
@jwt_required()
@limiter.limit("10 per hour")
def refund_charge(charge_id: int):
    u = get_current_user()
    
    charge = Charge.query.get(charge_id)
    if not charge or charge.user_id != u.id:
        return jsonify({"error": "Cobrança não encontrada"}), 404
    
    if not u.mp_token_encrypted:
        return jsonify({
            "error": "Token do Mercado Pago não configurado"
        }), 400
    
    if charge.status != "approved":
        return jsonify({
            "error": f"Só pode estornar cobranças 'approved'. Status: {charge.status}"
        }), 400
    
    try:
        mp_user_token = decrypt_mp_token(u.mp_token_encrypted)
    except ValueError as e:
        return jsonify({"error": f"Erro ao acessar credenciais: {str(e)}"}), 500
    
    try:
        mercadopago.Configuration.access_token = mp_user_token
        refund = mercadopago.payment.refund(charge_id)
        refund_result = refund.get_response()
        
        if refund_result.get("status") != 200:
            error_msg = refund_result.get("message", "Erro desconhecido")
            return jsonify({"error": f"Mercado Pago: {error_msg}"}), 400
        
        charge.status = "refunded"
        db.session.commit()
        
        return jsonify({
            "ok": True,
            "message": "Estorno solicitado com sucesso",
            "charge_id": charge_id,
            "new_status": "refunded"
        })
    
    except Exception as e:
        error_message = str(e)
        
        if "already refunded" in error_message.lower():
            return jsonify({
                "error": "Este pagamento já foi estornado"
            }), 400
        elif "timeout" in error_message.lower():
            return jsonify({
                "error": "Prazo para estorno expirou (máx 90 dias)"
            }), 400
        else:
            return jsonify({
                "error": f"Erro ao processar estorno: {error_message}"
            }), 400


@app.get("/api/admin/users")
@jwt_required()
@limiter.limit("20 per hour")
def admin_users():
    if not require_admin():
        return jsonify({"error": "Sem permissão"}), 403

    users = User.query.order_by(User.created_at.desc()).all()
    return jsonify(
        [
            {
                "id": u.id,
                "email": u.email,
                "name": u.name,
                "role": u.role,
                "active": u.active,
                "must_change_password": bool(u.must_change_password),
                "created_at": u.created_at.isoformat(),
            }
            for u in users
        ]
    )


@app.post("/api/admin/invite")
@jwt_required()
@limiter.limit("10 per hour")
def admin_invite():
    if not require_admin():
        return jsonify({"error": "Sem permissão"}), 403

    data = request.get_json(force=True) or {}
    email = normalize_email(data.get("email"))
    name = (data.get("name") or "").strip()

    if not email:
        return jsonify({"error": "email obrigatório"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "email já existe"}), 409

    temp_pw = secrets.token_urlsafe(10).replace("-", "").replace("_", "")[:8]
    if len(temp_pw) != 8:
        temp_pw = "temp1234"

    u = User(
        email=email,
        name=name or email,
        password_hash=generate_password_hash(temp_pw),
        role="user",
        active=True,
        must_change_password=True,
    )
    db.session.add(u)
    db.session.commit()

    return jsonify({"ok": True, "temp_password": temp_pw})


@app.patch("/api/admin/users/<int:user_id>/toggle")
@jwt_required()
@limiter.limit("10 per hour")
def admin_toggle(user_id: int):
    if not require_admin():
        return jsonify({"error": "Sem permissão"}), 403

    u = User.query.get(user_id)
    if not u:
        return jsonify({"error": "Não encontrado"}), 404

    if u.role == "admin":
        return jsonify({"error": "Não pode desativar admin"}), 400

    u.active = not u.active
    db.session.commit()
    return jsonify({"ok": True, "active": u.active})


@app.delete("/api/admin/users/<int:user_id>")
@jwt_required()
@limiter.limit("5 per hour")
def admin_delete_user(user_id: int):
    if not require_admin():
        return jsonify({"error": "Sem permissão"}), 403

    u = User.query.get(user_id)
    if not u:
        return jsonify({"error": "Não encontrado"}), 404

    if u.role == "admin":
        return jsonify({"error": "Não pode remover admin"}), 400

    Charge.query.filter_by(user_id=u.id).delete()
    ResetToken.query.filter_by(user_id=u.id).delete()

    db.session.delete(u)
    db.session.commit()

    return jsonify({"ok": True})


@app.post("/api/admin/reset-link")
@jwt_required()
@limiter.limit("10 per hour")
def admin_reset_link():
    if not require_admin():
        return jsonify({"error": "Sem permissão"}), 403

    data = request.get_json(force=True) or {}
    email = normalize_email(data.get("email"))

    u = User.query.filter_by(email=email).first()
    if not u:
        return jsonify({"error": "Usuário não encontrado"}), 404

    secret = secrets.token_urlsafe(16)
    rt = ResetToken(
        user_id=u.id,
        secret=secret,
        expires_at=datetime.utcnow() + timedelta(minutes=20),
    )
    db.session.add(rt)
    db.session.commit()

    link = make_reset_link(rt.id, secret)
    return jsonify({"ok": True, "link": link})


@app.post("/api/reset")
@limiter.limit("3 per hour")
def reset_password():
    data = request.get_json(force=True) or {}
    token = data.get("token") or ""
    new_pw = data.get("password") or ""

    if not password_is_valid(new_pw):
        return jsonify({"error": "Senha deve ter EXATAMENTE 8 caracteres"}), 400

    try:
        rid_str, secret = token.split(".", 1)
        rid = int(rid_str)
    except Exception:
        return jsonify({"error": "Token inválido"}), 400

    rt = ResetToken.query.get(rid)
    if not rt:
        return jsonify({"error": "Token inválido/expirado"}), 400

    if rt.secret != secret:
        return jsonify({"error": "Token inválido/expirado"}), 400

    if datetime.utcnow() > rt.expires_at:
        db.session.delete(rt)
        db.session.commit()
        return jsonify({"error": "Token inválido/expirado"}), 400

    u = User.query.get(rt.user_id)
    if not u:
        db.session.delete(rt)
        db.session.commit()
        return jsonify({"error": "Usuário não encontrado"}), 404

    u.password_hash = generate_password_hash(new_pw)
    u.must_change_password = False
    db.session.delete(rt)
    db.session.commit()

    return jsonify({"ok": True})


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
