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
