import React, { useState } from "react";
import { apiFetch } from "../api.js";
import { Toast } from "../ui.jsx";

export default function FirstPassword({ token, onDone }) {
  const [pw, setPw] = useState("");
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);

  async function save() {
    setToast("");

    setBusy(true);
    try {
      await apiFetch("/change-password", { token, method: "POST", body: { password: pw } });
      localStorage.removeItem("pixflow_force_pw");
      setToast("Senha criada! Entrando no painel...");
      setTimeout(() => onDone?.(), 400);
    } catch (e) {
      setToast("Erro: " + e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ maxWidth: 520, margin: "0 auto" }}>
      <div className="h1">Crie sua senha</div>
      <div className="h2">primeiro acesso (obrigatório)</div>

      <div className="label">Nova senha</div>
      <input
        className="input"
        type="password"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
        placeholder="********"
      />

      <div style={{ marginTop: 12 }}>
        <button className="btn green" onClick={save} disabled={busy} style={{ width: "100%" }}>
          {busy ? "Salvando..." : "Salvar senha"}
        </button>
      </div>

      <Toast>{toast}</Toast>
      <div className="toast">
        Dica: Escolha uma senha segura e fácil de lembrar.
      </div>
    </div>
  );
}
