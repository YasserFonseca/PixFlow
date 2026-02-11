const API = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

/**
 * Wrapper para fetch com tratamento de erro e tokens
 * @param {string} path
 * @param {object} options
 */
export async function apiFetch(path, { token, method = "GET", body, params } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = "Bearer " + token;

  let url = API + path;
  if (params) {
    const qs = new URLSearchParams(params).toString();
    url += (url.includes("?") ? "&" : "?") + qs;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });

  const text = await res.text();
  let data = null;

  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const msg =
  data && (data.error || data.message || data.msg)
    ? (data.error || data.message || data.msg)
    : `Erro ${res.status}`;

    throw new Error(msg);
  }

  return data;
}

export function setTokenLocal(token) {
  localStorage.setItem("pixflow_token", token);
}

export function getTokenLocal() {
  return localStorage.getItem("pixflow_token") || "";
}

export function clearTokenLocal() {
  localStorage.removeItem("pixflow_token");
}
