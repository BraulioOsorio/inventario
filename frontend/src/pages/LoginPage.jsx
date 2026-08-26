import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../auth";

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
    <div className="auth-shell">
      <section className="auth-hero">
        <p className="eyebrow">ERP en la nube</p>
        <h1>Inventario Modular</h1>
        <p className="lede">
          Plataforma modular para tienda, papelería o uso personal: productos,
          categorías, movimientos y administración de usuarios.
        </p>
      </section>

      <form className="auth-card" onSubmit={onSubmit}>
        <div className="tabs">
          <button type="button" className={mode === "login" ? "active" : ""} onClick={() => setMode("login")}>
            Iniciar sesión
          </button>
          <button type="button" className={mode === "register" ? "active" : ""} onClick={() => setMode("register")}>
            Registrarse
          </button>
        </div>

        {mode === "register" && (
          <label>
            Nombre completo
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} required minLength={2} />
          </label>
        )}
        <label>
          Correo
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Contraseña
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </label>

        {error && <div className="alert error">{error}</div>}
        <button className="btn-primary" disabled={busy}>
          {busy ? "Procesando…" : mode === "login" ? "Entrar al sistema" : "Crear cuenta"}
        </button>
      </form>
    </div>
  );
}
