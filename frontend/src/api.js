const API_URL = import.meta.env.VITE_API_URL || "";

async function request(path, { method = "GET", body, token } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  let data = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { detail: text };
    }
  }

  if (!res.ok) {
    const detail = data?.detail;
    const message = Array.isArray(detail)
      ? detail.map((d) => d.msg).join(", ")
      : detail || "Error en la solicitud";
    throw new Error(message);
  }
  return data;
}

export const api = {
  register: (payload) => request("/api/auth/register", { method: "POST", body: payload }),
  login: (payload) => request("/api/auth/login", { method: "POST", body: payload }),
  me: (token) => request("/api/auth/me", { token }),
  listProducts: (token, params = {}) => {
    const q = new URLSearchParams();
    if (params.context_type) q.set("context_type", params.context_type);
    if (params.q) q.set("q", params.q);
    const qs = q.toString();
    return request(`/api/products${qs ? `?${qs}` : ""}`, { token });
  },
  createProduct: (token, payload) =>
    request("/api/products", { method: "POST", body: payload, token }),
  updateProduct: (token, id, payload) =>
    request(`/api/products/${id}`, { method: "PUT", body: payload, token }),
  deleteProduct: (token, id) => request(`/api/products/${id}`, { method: "DELETE", token }),
  listCategories: (token) => request("/api/categories", { token }),
  createCategory: (token, payload) =>
    request("/api/categories", { method: "POST", body: payload, token }),
  listMovements: (token) => request("/api/movements", { token }),
  createMovement: (token, payload) =>
    request("/api/movements", { method: "POST", body: payload, token }),
  listUsers: (token) => request("/api/users", { token }),
  createUser: (token, payload) =>
    request("/api/users", { method: "POST", body: payload, token }),
  updateUser: (token, id, payload) =>
    request(`/api/users/${id}`, { method: "PUT", body: payload, token }),
};
