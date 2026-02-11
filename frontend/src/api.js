const API = import.meta.env.VITE_API_URL || "http://localhost:5000";

/**
 * Fetch wrapper com autenticação
 * @param {string} path
 * @param {object} options
 */
export async function apiFetch(path, { token, method = "GET", body, params } = {}) {
  const headers = {};
  if (body) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = "Bearer " + token;

  let url = API + "/api" + path;
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
