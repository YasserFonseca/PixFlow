import React, { useState } from "react";
import { apiFetch } from "../api.js";
import { Toast } from "../ui.jsx";

export default function Dashboard({ me, token, setError, setMe }) {
  const [pix, setPix] = useState(me?.pix || "");
  const [toast, setToast] = useState("");

  async function savePix() {
    setToast("");
    setError("");
    try {
      await apiFetch("/pix", { token, method: "POST", body: { pix } });
      const fresh = await apiFetch("/me", { token });
      setMe(fresh);
      setToast("Chave Pix salva!");
    } catch (e) {
      setError(e.message);
      setToast("Erro: " + e.message);
    }
  }

  return (
    <div className="grid">
      <div className="card">
        <div className="h1">Conta</div>
        <div className="h2">{me?.email}</div>

        <div className="label">Chave Pix</div>
        <input className="input" value={pix} onChange={(e) => setPix(e.target.value)} placeholder="CPF/CNPJ, email, telefone..." />

        <div style={{ marginTop: 12 }}>
          <button className="btn green" onClick={savePix} style={{ width: "100%" }}>Salvar Pix</button>
        </div>

        <Toast>{toast}</Toast>
      </div>

      <div className="card">
        <div className="h1">Atalhos</div>
        <div className="h2">dia a dia</div>

        <div className="row">
          <a className="btn secondary" href="http://localhost:5000/api/export/charges.csv" target="_blank" rel="noreferrer">
            Baixar CSV
          </a>
          <a className="btn secondary" href="/charges" onClick={(e)=>{e.preventDefault(); window.history.pushState({}, "", "/charges"); window.dispatchEvent(new Event("popstate"));}}>
            Ir para Cobranças
          </a>
        </div>

        <div className="toast">
          Fluxo: cria cobrança → gera mensagem → copia → WhatsApp → marca pago. <b>— PixFlow</b>
        </div>
      </div>
    </div>
  );
}
