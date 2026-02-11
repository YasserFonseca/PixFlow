import React, { useEffect, useMemo, useState } from "react";
import { apiFetch, clearTokenLocal, getTokenLocal, setTokenLocal } from "./api.js";
import { Topbar, Toast } from "./ui.jsx";
import FirstPassword from "./pages/FirstPassword.jsx";

import Login from "./pages/Login.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Cashier from "./pages/Cashier.jsx";
import Charges from "./pages/Charges.jsx";
import Admin from "./pages/Admin.jsx";
import Reset from "./pages/Reset.jsx";

export default function App() {
  const [token, setToken] = useState(getTokenLocal());
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");

  const path = useMemo(() => window.location.pathname || "/", []);

  async function loadMe(t = token) {
    const data = await apiFetch("/me", { token: t });
    setMe(data);
    return data;
  }

  useEffect(() => {
    if (!token) return;
    loadMe().catch((e) => {
      setError(e.message);
      clearTokenLocal();
      setToken("");
      setMe(null);
    });
    // eslint-disable-next-line
  }, []);

  async function doLogin(email, password) {
    setError("");
    const r = await apiFetch("/login", { method: "POST", body: { email, password } });
    setTokenLocal(r.token);
    
    if (r.must_change_password) {
      localStorage.setItem("pixflow_force_pw", "1");
    } else {
      localStorage.removeItem("pixflow_force_pw");
    }

    setToken(r.token);
    await loadMe(r.token);
  }

  function logout() {
    clearTokenLocal();
    setToken("");
    setMe(null);
  }

  const forcePw = localStorage.getItem("pixflow_force_pw") === "1";

  if (token && forcePw) {
    return (
      <div className="container">
        <Topbar
          right={
            <button className="btn secondary" onClick={logout}>
              Sair
            </button>
          }
        />
        <FirstPassword
          token={token}
          onDone={async () => {
            localStorage.removeItem("pixflow_force_pw");
            const fresh = await loadMe(token);
            setMe(fresh);
            window.history.pushState({}, "", "/");
            window.dispatchEvent(new Event("popstate"));
          }}
        />
      </div>
    );
  }

  // rota de reset dentro do React: /reset?token=...
  if (path === "/reset") {
    return (
      <div className="container">
        <Topbar right={<a className="btn secondary" href="/">Voltar</a>} />
        <Reset />
      </div>
    );
  }

  if (!token) {
    return (
      <div className="container">
        <Topbar />
        <Login onLogin={doLogin} error={error} />
      </div>
    );
  }

  return (
    <div className="container">
      <Topbar
        right={
          <>
            <Nav me={me} />
            <button className="btn" onClick={logout}>Sair</button>
          </>
        }
      />
      <Toast>{error}</Toast>

      <Shell me={me} token={token} setError={setError} setMe={setMe} />
    </div>
  );
}

function Nav({ me }) {
  const go = (to) => {
    window.history.pushState({}, "", to);
    window.dispatchEvent(new Event("popstate"));
  };

  return (
    <>
      <button className="btn secondary" onClick={() => go("/")}>Dashboard</button>
      <button className="btn secondary" onClick={() => go("/cashier")}>Caixa</button>
      <button className="btn secondary" onClick={() => go("/charges")}>Cobranças</button>
      {me?.role === "admin" ? (
        <button className="btn secondary" onClick={() => go("/admin")}>Admin</button>
      ) : null}
    </>
  );
}

function Shell({ me, token, setError, setMe }) {
  const [route, setRoute] = useState(window.location.pathname || "/");

  useEffect(() => {
    const fn = () => setRoute(window.location.pathname || "/");
    window.addEventListener("popstate", fn);
    return () => window.removeEventListener("popstate", fn);
  }, []);

  if (route === "/cashier") return <Cashier me={me} token={token} setError={setError} />;
  if (route === "/charges") return <Charges me={me} token={token} setError={setError} />;
  if (route === "/admin") return me?.role === "admin" ? <Admin token={token} setError={setError} /> : <Dashboard me={me} token={token} setError={setError} setMe={setMe} />;
  return <Dashboard me={me} token={token} setError={setError} setMe={setMe} />;
}
