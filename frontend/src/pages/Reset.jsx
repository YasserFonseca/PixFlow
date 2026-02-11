import React, { useState } from "react";
import { apiFetch } from "../api.js";
import { Toast } from "../ui.jsx";

export default function Reset() {
  const [password, setPassword] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token") || "";

  async function submit() {
    setToast("");
    if (!token) return setToast("Token não encontrado na URL.");
    if (password.length !== 8) return setToast("Senha precisa ter EXATAMENTE 8 caracteres.");

    setBusy(true);
    try {
      await apiFetch("/reset", { method: "POST", body: { token, password } });
      setToast("Senha atualizada! Agora tu pode voltar e logar.");
    } catch (e) {
      setToast("Erro: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
      <div className="h1">Reset de senha</div>
      <div className="h2">cole o link que o admin te passou</div>

      <div className="toast">
        URL correta: <b>/reset?token=SEU_TOKEN</b>
      </div>

      <div className="label">Nova senha</div>
      <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="********" />

      <div style={{ marginTop: 12 }}>
        <button className="btn green" onClick={submit} disabled={busy} style={{ width: "100%" }}>
          {busy ? "Salvando..." : "Salvar nova senha"}
        </button>
      </div>

      <Toast>{toast}</Toast>
    </div>
  );
}
