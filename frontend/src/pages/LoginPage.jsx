import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth";
import { Alert, FormField } from "../components/ui";

const FEATURES = [
  { icon: "📦", text: "Catálogo y stock en tiempo real" },
  { icon: "🛒", text: "Punto de venta con cálculo de cambio" },
  { icon: "🔔", text: "Alertas de inventario bajo" },
];

export default function LoginPage() {
  const { token, login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (token) return <Navigate to="/" replace />;

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(fullName, email, password);
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
          Gestiona tu negocio con un panel moderno: productos, ventas, alertas y
          movimientos en un solo lugar.
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
          <h2>{mode === "login" ? "Bienvenido de nuevo" : "Crea tu cuenta"}</h2>
          <p>{mode === "login" ? "Ingresa para continuar" : "Empieza a organizar tu inventario"}</p>
        </div>

        <div className="tabs glass-tabs-auth">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
            Iniciar sesión
          </button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
            Registrarse
          </button>
        </div>

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
          <FormField label="Contraseña" required hint="Mínimo 6 caracteres">
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

          {error && <Alert type="error">{error}</Alert>}

          <button className="btn-primary btn-block auth-submit" disabled={busy}>
            {busy ? "Procesando…" : mode === "login" ? "Entrar al sistema →" : "Crear cuenta →"}
          </button>

          <p className="auth-demo-hint">
            Demo: <code>pruebas@gmail.com</code> / <code>prueba123</code>
          </p>
        </div>
      </form>
    </div>
  );
}
