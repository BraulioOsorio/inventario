import { useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { Alert, FormField } from "../components/ui";

const FEATURES = [
  { icon: "📦", text: "Catálogo y stock en tiempo real" },
  { icon: "🛒", text: "Punto de venta con cálculo de cambio" },
  { icon: "🔔", text: "Alertas de inventario bajo y pedidos" },
  { icon: "🤝", text: "Control de clientes y préstamos" },
];

export default function LoginPage() {
  const { token, login, register } = useAuth();
  const [mode, setMode] = useState("login"); // login | register | forgot
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [okMessage, setOkMessage] = useState("");
  const [resetLink, setResetLink] = useState("");
  const [busy, setBusy] = useState(false);

  if (token) return <Navigate to="/" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setOkMessage("");
    setResetLink("");
    setBusy(true);

    try {
      if (mode === "login") {
        await login(email, password);
      } else if (mode === "register") {
        await register(fullName, email, password);
      } else if (mode === "forgot") {
        const res = await api.forgotPassword(email);
        setOkMessage(
          res.message || "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña."
        );
        if (res.reset_link) {
          setResetLink(res.reset_link);
        }
      }
    } catch (err) {
      setError(err.message || "No se pudo completar la operación");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-shell auth-glass">
      <div className="auth-orbs" aria-hidden>
        <span className="orb orb-1" />
        <span className="orb orb-2" />
        <span className="orb orb-3" />
      </div>

      <section className="auth-hero glass-hero">
        <div className="auth-logo">
          <span className="brand-mark auth-mark"><span /></span>
          <div>
            <p className="eyebrow">Cloud · Multi-uso</p>
            <h1>Inventario Modular</h1>
          </div>
        </div>
        <p className="lede">
          Gestiona tu negocio con un panel moderno: productos, ventas, alertas,
          pedidos a proveedores y préstamos en un solo lugar.
        </p>
        <ul className="auth-features">
          {FEATURES.map((f) => (
            <li key={f.text}>
              <span className="auth-feature-icon">{f.icon}</span>
              {f.text}
            </li>
          ))}
        </ul>
      </section>

      <form className="auth-card glass-auth-card form-card" onSubmit={onSubmit}>
        <div className="form-card-head auth-form-head">
          <h2>
            {mode === "login"
              ? "Bienvenido de nuevo"
              : mode === "register"
              ? "Crea tu cuenta"
              : "Recuperar contraseña"}
          </h2>
          <p>
            {mode === "login"
              ? "Ingresa para continuar"
              : mode === "register"
              ? "Empieza a organizar tu inventario"
              : "Te enviaremos las instrucciones a tu correo"}
          </p>
        </div>

        {mode !== "forgot" ? (
          <div className="tabs glass-tabs-auth">
            <button
              type="button"
              className={mode === "login" ? "active" : ""}
              onClick={() => {
                setMode("login");
                setError("");
                setOkMessage("");
              }}
            >
              Iniciar sesión
            </button>
            <button
              type="button"
              className={mode === "register" ? "active" : ""}
              onClick={() => {
                setMode("register");
                setError("");
                setOkMessage("");
              }}
            >
              Registrarse
            </button>
          </div>
        ) : (
          <div style={{ padding: "0 1.5rem", marginBottom: "0.5rem" }}>
            <button
              type="button"
              className="text-link"
              onClick={() => {
                setMode("login");
                setError("");
                setOkMessage("");
                setResetLink("");
              }}
              style={{ fontSize: "0.9rem" }}
            >
              ← Volver a inicio de sesión
            </button>
          </div>
        )}

        <div className="form-card-body">
          {mode === "register" && (
            <FormField label="Nombre completo" required>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                minLength={2}
                placeholder="David Alejandro Osorio"
                autoComplete="name"
              />
            </FormField>
          )}

          <FormField label="Correo electrónico" required>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="usuario@correo.com"
              autoComplete="email"
            />
          </FormField>

          {mode !== "forgot" && (
            <FormField
              label="Contraseña"
              required
              hint={
                mode === "login" ? (
                  <button
                    type="button"
                    className="text-link"
                    style={{ fontSize: "0.82rem", background: "none", border: "none", padding: 0, cursor: "pointer" }}
                    onClick={() => {
                      setMode("forgot");
                      setError("");
                      setOkMessage("");
                    }}
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                ) : (
                  "Mínimo 6 caracteres"
                )
              }
            >
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                autoComplete={mode === "login" ? "current-password" : "new-password"}
              />
            </FormField>
          )}

          {error && <Alert type="error">{error}</Alert>}
          {okMessage && <Alert type="success">{okMessage}</Alert>}

          {resetLink && (
            <div style={{ margin: "0.8rem 0", padding: "0.75rem", background: "rgba(99, 102, 241, 0.1)", borderRadius: "8px", border: "1px dashed #6366f1" }}>
              <p style={{ margin: "0 0 0.5rem 0", fontSize: "0.85rem", fontWeight: "600", color: "#4338ca" }}>
                Enlace directo generado (prueba rápida):
              </p>
              <a
                href={resetLink}
                className="btn-secondary btn-sm btn-block"
                style={{ textAlign: "center", display: "block" }}
              >
                Abrir formulario de restablecimiento →
              </a>
            </div>
          )}

          <button className="btn-primary btn-block auth-submit" disabled={busy}>
            {busy
              ? "Procesando…"
              : mode === "login"
              ? "Entrar al sistema →"
              : mode === "register"
              ? "Crear cuenta →"
              : "Enviar enlace al correo →"}
          </button>

          {mode !== "forgot" && (
            <p className="auth-demo-hint">
              Demo: <code>pruebas@gmail.com</code> / <code>prueba123</code>
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
