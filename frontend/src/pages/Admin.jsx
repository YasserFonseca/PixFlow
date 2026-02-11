import React, { useEffect, useState } from "react";
import { apiFetch } from "../api.js";
import { Toast } from "../ui.jsx";

export default function Admin({ token, setError }) {
  const [users, setUsers] = useState([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [toast, setToast] = useState("");

  async function load() {
    setError("");
    try {
      const data = await apiFetch("/admin/users", { token });
      setUsers(Array.isArray(data) ? data : (data.items || []));
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  async function invite() {
    setToast("");
    setError("");
    if (!email) return setToast("Preenche o email do cliente.");
    try {
      const r = await apiFetch("/admin/invite", { token, method: "POST", body: { email, name } });
      setToast(`Cliente criado! Senha temporária: ${r.temp_password}`);
      setEmail(""); setName("");
      await load();
    } catch (e) {
      setError(e.message);
      setToast("Erro: " + e.message);
    }
  }

  async function toggle(u) {
    setToast("");
    setError("");
    try {
      await apiFetch(`/admin/users/${u.id}/toggle`, { token, method: "PATCH" });
      await load();
    } catch (e) {
      setError(e.message);
      setToast("Erro: " + e.message);
    }
  }

  async function resetLink(uEmail) {
    setToast("");
    setError("");
    try {
      const r = await apiFetch("/admin/reset-link", { token, method: "POST", body: { email: uEmail } });
      await navigator.clipboard.writeText(r.link);
      setToast("Link de reset copiado! Cola no WhatsApp do cliente.");
    } catch (e) {
      setError(e.message);
      setToast("Erro: " + e.message);
    }
  }

  async function removeUser(u) {
    const ok = confirm(`Tem certeza que quer REMOVER ${u.email}? Isso apaga tudo desse cliente.`);
    if (!ok) return;

    setToast("");
    setError("");
    try {
      await apiFetch(`/admin/users/${u.id}`, { token, method: "DELETE" });
      setToast("Conta removida!");
      await load();
    } catch (e) {
      setError(e.message);
      setToast("Erro: " + e.message);
    }
  }

  return (
    <div className="grid">
      <div className="card">
        <div className="h1">Criar cliente</div>
        <div className="h2">contas separadas</div>

        <div className="label">Email</div>
        <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="cliente@email.com" />

        <div className="label">Nome (opcional)</div>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Loja do João" />

        <div style={{ marginTop: 12 }}>
          <button className="btn green" onClick={invite} style={{ width: "100%" }}>
            Criar + gerar senha
          </button>
        </div>

        <Toast>{toast}</Toast>

        <div className="toast">
          Se o cliente parar de pagar, tu bloqueia aqui. Reset de senha tu manda o link.
        </div>
      </div>

      <div className="card">
        <div className="h1">Usuários</div>
        <div className="h2">bloquear / resetar</div>

        <table className="table">
          <thead>
            <tr>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users && users.length > 0 ? (
              users.map((u) => (
                <tr key={u.id}>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>
                    <span className={"badge " + (u.active ? "paid" : "canceled")}>
                      {u.active ? "ativo" : "bloqueado"}
                    </span>
                  </td>
                  <td>
                    <div className="row">
                      {u.role !== "admin" ? (
                        <button className="btn red" onClick={() => toggle(u)}>
                          {u.active ? "Bloquear" : "Reativar"}
                        </button>
                      ) : null}
                      <button className="btn secondary" onClick={() => resetLink(u.email)}>
                        Reset link
                      </button>
                      <button className="btn red" onClick={() => removeUser(u)}>
                        Remover
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="4" style={{ textAlign: "center", padding: 20 }}>
                  Nenhum usuário encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="toast">Admin não dá pra bloquear pelo sistema (proteção).</div>
      </div>
    </div>
  );
}
