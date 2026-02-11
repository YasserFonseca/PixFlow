import React from "react";

export function Brand() {
  return (
    <div className="brand">
      <div className="logo" />
      <div>
        <div className="brandTitle">PixFlow</div>
        <div className="small">cobrança pix + mensagens prontas</div>
      </div>
    </div>
  );
}

export function Topbar({ right }) {
  return (
    <div className="topbar">
      <Brand />
      <div className="row">{right}</div>
    </div>
  );
}

export function Card({ title, subtitle, children }) {
  return (
    <div className="card">
      <div className="h1">{title}</div>
      {subtitle ? <div className="h2">{subtitle}</div> : null}
      <div style={{ marginTop: 12 }}>{children}</div>
    </div>
  );
}

export function Toast({ children }) {
  if (!children) return null;
  return <div className="toast">{children}</div>;
}

export function Badge({ status }) {
  return <span className={"badge " + status}>{status}</span>;
}
