import React, { useEffect, useState } from "react";
import { apiFetch } from "../api.js";
import { Toast } from "../ui.jsx";

export default function Charges({ token, me, setError }) {
  const [list, setList] = useState([]);
  const [client, setClient] = useState("");
  const [value, setValue] = useState("");
  const [toast, setToast] = useState("");
  const [finalMsg, setFinalMsg] = useState("");

  const [template, setTemplate] = useState(
`Oi {nome}! 😊
Segue o Pix de R$ {valor} pra confirmar:

Chave Pix: {pix}

Quando pagar me manda o comprovante por aqui 🙏
— PixFlow`
  );

  async function load() {
    setError("");
    try {
      const data = await apiFetch("/charges", { token });
      // Se a API retornar objeto com items (paginado), usa items, senão usa o array direto (compatibilidade)
      setList(Array.isArray(data) ? data : (data.items || []));
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  function buildMessage() {
    const msg = template
      .split("{nome}").join(client || "cliente")
      .split("{valor}").join(value || "0")
      .split("{pix}").join(me?.pix || "(sua chave pix)");
    setFinalMsg(msg);
  }

  async function createCharge() {
    setToast("");
    setError("");
    if (!client || !value) return setToast("Preenche cliente e valor.");

    const message = template
      .split("{nome}").join(client)
      .split("{valor}").join(value)
      .split("{pix}").join(me?.pix || "");

    try {
      await apiFetch("/charges", { token, method: "POST", body: { client, value, message } });
      setClient(""); setValue("");
      await load();
      setToast("Cobrança criada!");
    } catch (e) {
      setError(e.message);
      setToast("Erro: " + e.message);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(finalMsg);
      setToast("Copiado! Cola no WhatsApp.");
    } catch {
      setToast("Não consegui copiar. Copia manual.");
    }
  }

  async function setStatus(id, status) {
    setToast("");
    setError("");
    try {
      await apiFetch(`/charges/${id}`, { token, method: "PATCH", body: { status } });
      await load();
    } catch (e) {
      setError(e.message);
      setToast("Erro: " + e.message);
    }
  }

  return (
    <div className="grid">
      <div className="card">
        <div className="h1">Nova cobrança</div>
        <div className="h2">mensagem pronta + histórico</div>

        <div className="label">Cliente</div>
        <input className="input" value={client} onChange={(e) => setClient(e.target.value)} placeholder="Ex: João" />

        <div className="label">Valor</div>
        <input className="input" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Ex: 50" />

        <div className="label">Template (editável)</div>
        <textarea className="input" rows="7" value={template} onChange={(e) => setTemplate(e.target.value)} />

        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn secondary" onClick={buildMessage}>Gerar mensagem</button>
          <button className="btn green" onClick={createCharge}>Salvar cobrança</button>
        </div>

        <div className="label">Mensagem final</div>
        <textarea className="input" rows="6" value={finalMsg} onChange={(e) => setFinalMsg(e.target.value)} />

        <div className="row" style={{ marginTop: 12 }}>
          <button className="btn" onClick={copy}>Copiar</button>
          <a className="btn secondary" href="http://localhost:5000/api/export/charges.csv" target="_blank" rel="noreferrer">
            Baixar CSV
          </a>
        </div>

        <Toast>{toast}</Toast>
      </div>

      <div className="card">
        <div className="h1">Cobranças</div>
        <div className="h2">pendentes / pagas</div>

        <table className="table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Valor</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {list && list.length > 0 ? (
              list.map((c) => (
                <tr key={c.id}>
                  <td>{c.client}</td>
                  <td>R$ {c.value}</td>
                  <td><span className={"badge " + c.status}>{c.status}</span></td>
                  <td>
                    <div className="row">
                      <button className="btn secondary" onClick={() => setStatus(c.id, "pending")}>Pendente</button>
                      <button className="btn green" onClick={() => setStatus(c.id, "paid")}>Pago</button>
                      <button className="btn red" onClick={() => setStatus(c.id, "canceled")}>Cancelar</button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" style={{ textAlign: "center", padding: 20 }}>
                  Nenhuma cobrança encontrada.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="toast">Se estiver vazio, cria uma cobrança ao lado.</div>
      </div>
    </div>
  );
}
