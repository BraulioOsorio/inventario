import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { Alert, FormField } from "../components/ui";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!token) {
      setError("Token de recuperación no encontrado o inválido.");
      return;
    }

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setBusy(true);
    try {
      const res = await api.resetPassword(token, password);
      setSuccess(res?.message || "Contraseña restablecida con éxito.");
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 2500);
    } catch (err) {
      setError(err.message || "Error al restablecer contraseña.");
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
            <p className="eyebrow">Seguridad de cuenta</p>
            <h1>Inventario Modular</h1>
          </div>
        </div>
        <p className="lede">
          Establece una nueva contraseña segura para recuperar el acceso a tu sistema de inventario.
        </p>
      </section>

      <form className="auth-card glass-auth-card form-card" onSubmit={onSubmit}>
        <div className="form-card-head auth-form-head">
          <h2>Restablecer contraseña</h2>
          <p>Ingresa tu nueva clave de acceso</p>
        </div>

        <div className="form-card-body">
          {!token && (
            <Alert type="error">
              No se proporcionó un token de recuperación válido. Por favor solicita un nuevo enlace desde la pantalla de inicio de sesión.
            </Alert>
          )}

          {error && <Alert type="error">{error}</Alert>}
          {success && (
            <Alert type="success">
              {success} Redirigiendo al inicio de sesión…
            </Alert>
          )}

          {token && !success && (
            <>
              <FormField label="Nueva contraseña" required hint="Mínimo 6 caracteres">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </FormField>

              <FormField label="Confirmar nueva contraseña" required>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </FormField>

              <button className="btn-primary btn-block auth-submit" disabled={busy}>
                {busy ? "Guardando…" : "Actualizar contraseña →"}
              </button>
            </>
          )}

          <div style={{ textAlign: "center", marginTop: "1rem" }}>
            <Link to="/login" className="text-link" style={{ fontSize: "0.9rem" }}>
              ← Volver al inicio de sesión
            </Link>
          </div>
        </div>
      </form>
    </div>
  );
}
