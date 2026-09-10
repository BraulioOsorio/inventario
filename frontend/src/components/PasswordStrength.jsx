import { PASSWORD_RULES } from "../utils/userDisplay";

function strengthLevel(passed, total) {
  if (passed === 0) return { label: "Muy débil", className: "weak" };
  if (passed <= 2) return { label: "Débil", className: "weak" };
  if (passed <= 4) return { label: "Aceptable", className: "fair" };
  return { label: "Fuerte", className: "strong" };
}

export default function PasswordStrength({ password = "", title = "Fortaleza de la contraseña" }) {
  const results = PASSWORD_RULES.map((rule) => ({
    ...rule,
    ok: rule.test(password),
  }));
  const passed = results.filter((r) => r.ok).length;
  const pct = Math.round((passed / PASSWORD_RULES.length) * 100);
  const level = strengthLevel(passed, PASSWORD_RULES.length);

  return (
    <div className="password-strength glass-panel" aria-live="polite">
      <div className="password-strength-head">
        <strong>{title}</strong>
        <span className={`password-strength-tag ${level.className}`}>{level.label}</span>
      </div>
      <div className="password-strength-bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <span className={`password-strength-fill ${level.className}`} style={{ width: `${pct}%` }} />
      </div>
      <ul className="password-strength-rules">
        {results.map((rule) => (
          <li key={rule.id} className={rule.ok ? "ok" : "fail"}>
            <span className="password-rule-icon" aria-hidden>
              {rule.ok ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              )}
            </span>
            {rule.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
