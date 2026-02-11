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
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ============ CONFIG ============
db_url = os.getenv("DATABASE_URL") or "sqlite:///pixflow.db"
jwt_secret = os.getenv("JWT_SECRET") or "devsecret"

app.config["SQLALCHEMY_DATABASE_URI"] = db_url
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = jwt_secret

db = SQLAlchemy(app)
jwt = JWTManager(app)


# ============ MODELS ============
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)

    email = db.Column(db.String(255), unique=True, nullable=False)
    name = db.Column(db.String(255), nullable=True)
    password_hash = db.Column(db.String(255), nullable=False)

    pix = db.Column(db.String(255), nullable=True)

    role = db.Column(db.String(50), default="user")  # admin/user
    active = db.Column(db.Boolean, default=True)

    # ✅ primeiro acesso: força troca de senha
    must_change_password = db.Column(db.Boolean, default=False)

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


# ============ HELPERS ============
def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def password_is_valid(pw: str) -> bool:
    # EXATAMENTE 8 chars (como tu pediu)
    return isinstance(pw, str) and len(pw) == 8


def get_current_user():
    uid = get_jwt_identity()
    if not uid:
        return None
    # ✅ JWT identity como string pra evitar 422
    return User.query.get(int(uid))


def require_admin():
    u = get_current_user()
    if not u or u.role != "admin":
        return None
    return u


def make_reset_link(rt_id: int, secret: str) -> str:
    frontend = os.getenv("FRONTEND_URL") or "http://localhost:5173"
    return f"{frontend}/reset?token={rt_id}.{secret}"


# ============ INIT DB + ADMIN ============
with app.app_context():
    db.create_all()

    admin_email = normalize_email(os.getenv("ADMIN_EMAIL") or "admin@pixflow.local")
    admin_password = os.getenv("ADMIN_PASSWORD") or "admin1234"
    if len(admin_password) != 8:
        admin_password = "admin1234"

    exists = User.query.filter_by(email=admin_email).first()
    if not exists:
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


# ============ ROUTES ============
@app.get("/")
def home():
    return jsonify({"status": "PixFlow API rodando", "hint": "/api/*"}), 200


# ---------- AUTH ----------
@app.post("/api/login")
def login():
    data = request.get_json(force=True) or {}
    email = normalize_email(data.get("email"))
    password = data.get("password") or ""

    u = User.query.filter_by(email=email).first()

    if not u or not check_password_hash(u.password_hash, password):
        return jsonify({"error": "Credenciais inválidas"}), 401

    if not u.active:
        return jsonify({"error": "Conta desativada. Fale com o suporte."}), 403

    # ✅ identity string pra evitar 422
    token = create_access_token(identity=str(u.id), expires_delta=timedelta(hours=12))

    return jsonify(
        {"token": token, "must_change_password": bool(u.must_change_password)}
    )


@app.get("/api/me")
@jwt_required()
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
            "must_change_password": bool(u.must_change_password),
        }
    )


# ✅ Troca de senha obrigatória (primeiro acesso)
@app.post("/api/change-password")
@jwt_required()
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


# ---------- USER PANEL ----------
@app.post("/api/pix")
@jwt_required()
def set_pix():
    u = get_current_user()
    data = request.get_json(force=True) or {}
    pix = (data.get("pix") or "").strip()

    u.pix = pix if pix else None
    db.session.commit()
    return jsonify({"ok": True})


@app.post("/api/charges")
@jwt_required()
def create_charge():
    u = get_current_user()
    data = request.get_json(force=True) or {}

    client = (data.get("client") or "").strip()
    value = (data.get("value") or "").strip()
    message = (data.get("message") or "").strip()

    if not client or not value:
        return jsonify({"error": "Cliente e valor são obrigatórios"}), 400

    c = Charge(
        user_id=u.id,
        client=client,
        value=value,
        message=message,
        status="pending",
    )
    db.session.add(c)
    db.session.commit()

    return jsonify({"ok": True, "id": c.id})


@app.get("/api/charges")
@jwt_required()
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


# ---------- ADMIN MASTER ----------
@app.get("/api/admin/users")
@jwt_required()
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

    # senha temporária EXATAMENTE 8 chars
    temp_pw = secrets.token_urlsafe(10).replace("-", "").replace("_", "")[:8]
    if len(temp_pw) != 8:
        temp_pw = "temp1234"

    u = User(
        email=email,
        name=name or email,
        password_hash=generate_password_hash(temp_pw),
        role="user",
        active=True,
        must_change_password=True,  # ✅ força troca no primeiro login
    )
    db.session.add(u)
    db.session.commit()

    return jsonify({"ok": True, "temp_password": temp_pw})


@app.patch("/api/admin/users/<int:user_id>/toggle")
@jwt_required()
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
def admin_delete_user(user_id: int):
    if not require_admin():
        return jsonify({"error": "Sem permissão"}), 403

    u = User.query.get(user_id)
    if not u:
        return jsonify({"error": "Não encontrado"}), 404

    if u.role == "admin":
        return jsonify({"error": "Não pode remover admin"}), 400

    # apaga tudo do usuário (multi-tenant)
    Charge.query.filter_by(user_id=u.id).delete()
    ResetToken.query.filter_by(user_id=u.id).delete()

    db.session.delete(u)
    db.session.commit()

    return jsonify({"ok": True})


@app.post("/api/admin/reset-link")
@jwt_required()
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
    u.must_change_password = False  # ✅ reset também limpa a exigência
    db.session.delete(rt)
    db.session.commit()

    return jsonify({"ok": True})


# ============ RUN ============
if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
