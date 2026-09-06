/** Etiquetas en español para la UI */

export const MOVEMENT_TYPES = {
  in: { label: "Entrada", className: "in" },
  out: { label: "Salida", className: "out" },
  adjust: { label: "Ajuste", className: "adjust" },
};

export function movementTypeLabel(type) {
  return MOVEMENT_TYPES[type]?.label || type;
}

export const CONTEXT_TYPES = {
  general: "General",
  tienda: "Tienda",
  papeleria: "Papelería",
  personal: "Personal",
};

export function contextTypeLabel(type) {
  return CONTEXT_TYPES[type] || type;
}

export function formatMoney(value) {
  return Number(value || 0).toLocaleString("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  });
}

export const ORDER_STATUS = {
  pendiente: { label: "Pendiente", className: "pill-warn" },
  solicitado: { label: "Solicitado", className: "pill-blue" },
  recibido: { label: "Recibido", className: "pill-in" },
  cancelado: { label: "Cancelado", className: "pill-danger" },
};

export function orderStatusLabel(status) {
  return ORDER_STATUS[status]?.label || status;
}

export const LOAN_STATUS = {
  activo: { label: "En préstamo", className: "pill-warn" },
  devuelto: { label: "Devuelto", className: "pill-in" },
  vencido: { label: "Vencido", className: "pill-danger" },
};

export function loanStatusLabel(status) {
  return LOAN_STATUS[status]?.label || status;
}
