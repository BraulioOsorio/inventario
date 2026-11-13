const API_URL = import.meta.env.VITE_API_URL || "";

export function clientLocalDate() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

async function request(path, { method = "GET", body, token, clientDate } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (clientDate) headers["X-Client-Date"] = clientDate;

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

async function requestBinary(path, { token } = {}) {
  const headers = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${API_URL}${path}`, { headers });
  if (!res.ok) {
    throw new Error("No se pudo cargar la imagen");
  }
  return res.blob();
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export const api = {
  requestAccess: (payload) => request("/api/auth/request-access", { method: "POST", body: payload }),
  register: (payload) => request("/api/auth/register", { method: "POST", body: payload }),
  login: (payload) => request("/api/auth/login", { method: "POST", body: payload }),
  me: (token) => request("/api/auth/me", { token }),
  updateProfile: (token, payload) =>
    request("/api/auth/me", { method: "PUT", body: payload, token }),
  updateAvatar: (token, payload) =>
    request("/api/auth/me/avatar", { method: "PUT", body: payload, token }),
  changePassword: (token, payload) =>
    request("/api/auth/me/password", { method: "PUT", body: payload, token }),
  listProducts: (token, params = {}) => {
    const q = new URLSearchParams();
    if (params.context_type) q.set("context_type", params.context_type);
    if (params.q) q.set("q", params.q);
    if (params.active_only === false) q.set("active_only", "false");
    if (params.include_images) q.set("include_images", "true");
    const qs = q.toString();
    return request(`/api/products${qs ? `?${qs}` : ""}`, { token });
  },
  createProduct: (token, payload) =>
    request("/api/products", { method: "POST", body: payload, token }),
  updateProduct: (token, id, payload) =>
    request(`/api/products/${id}`, { method: "PUT", body: payload, token }),
  deleteProduct: (token, id) => request(`/api/products/${id}`, { method: "DELETE", token }),
  fetchProductImageDataUrl: async (token, productId) => {
    const blob = await requestBinary(`/api/media/products/${productId}/image`, { token });
    return blobToDataUrl(blob);
  },
  fetchMyAvatarBlob: (token) => requestBinary("/api/media/me/avatar", { token }),
  listCategories: (token) => request("/api/categories", { token }),
  createCategory: (token, payload) =>
    request("/api/categories", { method: "POST", body: payload, token }),
  listMovements: (token, params = {}) => {
    const q = new URLSearchParams();
    if (params.page) q.set("page", String(params.page));
    if (params.page_size) q.set("page_size", String(params.page_size));
    const qs = q.toString();
    return request(`/api/movements${qs ? `?${qs}` : ""}`, { token });
  },
  revertMovement: (token, movementId) =>
    request(`/api/movements/${movementId}/revert`, {
      method: "POST",
      token,
      clientDate: clientLocalDate(),
    }),
  createMovement: (token, payload) =>
    request("/api/movements", {
      method: "POST",
      body: payload,
      token,
      clientDate: clientLocalDate(),
    }),
  businessDayStatus: (token) =>
    request("/api/business-days/status", { token, clientDate: clientLocalDate() }),
  openBusinessDay: (token) =>
    request("/api/business-days/open", {
      method: "POST",
      body: { client_date: clientLocalDate() },
      token,
    }),
  closeBusinessDay: (token) =>
    request("/api/business-days/close", {
      method: "POST",
      token,
      clientDate: clientLocalDate(),
    }),
  rolloverBusinessDay: (token) =>
    request("/api/business-days/rollover", {
      method: "POST",
      body: { client_date: clientLocalDate() },
      token,
    }),
  listUsers: (token) => request("/api/users", { token }),
  createUser: (token, payload) =>
    request("/api/users", { method: "POST", body: payload, token }),
  updateUser: (token, id, payload) =>
    request(`/api/users/${id}`, { method: "PUT", body: payload, token }),
  forgotPassword: (email) =>
    request("/api/auth/forgot-password", { method: "POST", body: { email } }),
  resetPassword: (token, new_password) =>
    request("/api/auth/reset-password", { method: "POST", body: { token, new_password } }),
  // Clientes
  listCustomers: (token, params = {}) => {
    const q = new URLSearchParams();
    if (params.q) q.set("q", params.q);
    const qs = q.toString();
    return request(`/api/customers${qs ? `?${qs}` : ""}`, { token });
  },
  createCustomer: (token, payload) =>
    request("/api/customers", { method: "POST", body: payload, token }),
  updateCustomer: (token, id, payload) =>
    request(`/api/customers/${id}`, { method: "PUT", body: payload, token }),
  deleteCustomer: (token, id) =>
    request(`/api/customers/${id}`, { method: "DELETE", token }),
  // Pedidos
  listOrders: (token, params = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    if (params.q) q.set("q", params.q);
    const qs = q.toString();
    return request(`/api/orders${qs ? `?${qs}` : ""}`, { token });
  },
  createOrder: (token, payload) =>
    request("/api/orders", { method: "POST", body: payload, token }),
  updateOrder: (token, id, payload) =>
    request(`/api/orders/${id}`, { method: "PUT", body: payload, token }),
  deleteOrder: (token, id) =>
    request(`/api/orders/${id}`, { method: "DELETE", token }),
  // Préstamos
  listLoans: (token, params = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    if (params.product_id) q.set("product_id", params.product_id);
    const qs = q.toString();
    return request(`/api/loans${qs ? `?${qs}` : ""}`, { token });
  },
  createLoan: (token, payload) =>
    request("/api/loans", { method: "POST", body: payload, token }),
  updateLoan: (token, id, payload) =>
    request(`/api/loans/${id}`, { method: "PUT", body: payload, token }),
  returnLoan: (token, id, payload) =>
    request(`/api/loans/${id}/return`, { method: "POST", body: payload, token }),
  deleteLoan: (token, id) =>
    request(`/api/loans/${id}`, { method: "DELETE", token }),
  listCreditAccounts: (token, params = {}) => {
    const q = new URLSearchParams();
    if (params.status) q.set("status", params.status);
    const qs = q.toString();
    return request(`/api/credit-accounts${qs ? `?${qs}` : ""}`, { token });
  },
  creditAccountsSummary: (token) => request("/api/credit-accounts/summary", { token }),
  getCreditAccount: (token, id) => request(`/api/credit-accounts/${id}`, { token }),
  updateCreditAccount: (token, id, payload) =>
    request(`/api/credit-accounts/${id}`, { method: "PUT", body: payload, token }),
  chargeCredit: (token, payload) =>
    request("/api/credit-accounts/charge", {
      method: "POST",
      body: payload,
      token,
      clientDate: clientLocalDate(),
    }),
  payCredit: (token, id, payload) =>
    request(`/api/credit-accounts/${id}/payments`, { method: "POST", body: payload, token }),
  updateCreditPayment: (token, accountId, paymentId, payload) =>
    request(`/api/credit-accounts/${accountId}/payments/${paymentId}`, {
      method: "PUT",
      body: payload,
      token,
    }),
  listPaymentMethods: (token) => request("/api/payment-methods", { token }),
  createPaymentMethod: (token, payload) =>
    request("/api/payment-methods", { method: "POST", body: payload, token }),
  updatePaymentMethod: (token, id, payload) =>
    request(`/api/payment-methods/${id}`, { method: "PUT", body: payload, token }),
  deletePaymentMethod: (token, id) =>
    request(`/api/payment-methods/${id}`, { method: "DELETE", token }),
  // Notificaciones / Campanita
  getNotifications: (token) =>
    request("/api/notifications", { token }),
  downloadReportPdf: async (token, reportKey, params = {}) => {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") q.set(k, String(v));
    });
    const qs = q.toString();
    const res = await fetch(`${API_URL}/api/reports/${reportKey}/pdf${qs ? `?${qs}` : ""}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) {
      const text = await res.text();
      let message = "No se pudo generar el reporte";
      try {
        const data = JSON.parse(text);
        message = data.detail || message;
      } catch {
        if (text) message = text;
      }
      throw new Error(message);
    }
    return res.blob();
  },
};
