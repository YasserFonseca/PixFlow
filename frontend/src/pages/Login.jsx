import React, { useState } from "react";
import { Toast } from "../ui.jsx";

export default function Login({ onLogin, error }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [localErr, setLocalErr] = useState("");

  async function submit() {
    setLocalErr("");
    if (!email || !password) return setLocalErr("Preenche email e senha.");
    setBusy(true);
    try {
      await onLogin(email, password);
    } catch (e) {
      setLocalErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
      <div className="h1">Entrar</div>
      <div className="h2">Acesse seu painel</div>

      <div className="label">Email</div>
      <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@..." />

      <div className="label">Senha</div>
      <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" />

      <div style={{ marginTop: 14 }}>
        <button className="btn" onClick={submit} disabled={busy} style={{ width: "100%" }}>
          {busy ? "Entrando..." : "Entrar"}
        </button>
      </div>

      <Toast>{localErr || error}</Toast>

      <div className="toast">
        Reset de senha: o admin gera um link que abre <b>/reset?token=...</b>
      </div>
    </div>
  );
}
