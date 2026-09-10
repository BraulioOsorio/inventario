export function getInitials(name) {
  const parts = (name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export function avatarHue(name) {
  let hash = 0;
  const text = name || "user";
  for (let i = 0; i < text.length; i += 1) {
    hash = text.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

export const PASSWORD_RULES = [
  { id: "len", label: "Mínimo 8 caracteres", test: (p) => p.length >= 8 },
  { id: "upper", label: "Debe contener mayúscula", test: (p) => /[A-Z]/.test(p) },
  { id: "lower", label: "Debe contener minúscula", test: (p) => /[a-z]/.test(p) },
  { id: "digit", label: "Debe contener número", test: (p) => /\d/.test(p) },
  { id: "symbol", label: "Debe contener símbolo", test: (p) => /[^\w\s]/.test(p) },
];

export function isStrongPassword(password) {
  return PASSWORD_RULES.every((rule) => rule.test(password));
}
