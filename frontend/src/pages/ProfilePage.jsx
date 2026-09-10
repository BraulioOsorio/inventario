import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import PasswordStrength from "../components/PasswordStrength";
import { Alert, FormActions, FormCard, FormField, PageHeader } from "../components/ui";
import { avatarHue, getInitials, isStrongPassword } from "../utils/userDisplay";

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Intl.DateTimeFormat("es-CO", {
      dateStyle: "long",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function ProfilePage() {
  const { token, user, updateUser } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileMsg, setProfileMsg] = useState({ type: "", text: "" });
  const [passwordMsg, setPasswordMsg] = useState({ type: "", text: "" });
  const [busyProfile, setBusyProfile] = useState(false);
  const [busyPassword, setBusyPassword] = useState(false);

  const hue = avatarHue(user?.full_name);
  const initials = getInitials(user?.full_name);

  useEffect(() => {
    setFullName(user?.full_name || "");
  }, [user?.full_name]);

  async function onSaveProfile(e) {
    e.preventDefault();
    setProfileMsg({ type: "", text: "" });
    setBusyProfile(true);
    try {
      const updated = await api.updateProfile(token, { full_name: fullName.trim() });
      updateUser(updated);
      setProfileMsg({ type: "success", text: "Nombre actualizado correctamente." });
    } catch (err) {
      setProfileMsg({ type: "error", text: err.message });
    } finally {
      setBusyProfile(false);
    }
  }

  async function onChangePassword(e) {
    e.preventDefault();
    setPasswordMsg({ type: "", text: "" });

    if (!isStrongPassword(newPassword)) {
      setPasswordMsg({ type: "error", text: "La nueva contraseña no cumple todos los requisitos de seguridad." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg({ type: "error", text: "Las contraseñas no coinciden." });
      return;
    }

    setBusyPassword(true);
    try {
      const res = await api.changePassword(token, {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMsg({ type: "success", text: res.message || "Contraseña actualizada." });
    } catch (err) {
      setPasswordMsg({ type: "error", text: err.message });
    } finally {
      setBusyPassword(false);
    }
  }

  return (
    <div className="page page-module">
      <PageHeader
        kicker="Cuenta"
        title="Mi perfil"
        subtitle="Administra tu información personal y la seguridad de tu acceso."
      />

      <div className="profile-layout">
        <section className="panel profile-card glass-panel">
          <div
            className="profile-avatar"
            style={{
              background: `linear-gradient(135deg, hsl(${hue} 68% 52%), hsl(${(hue + 40) % 360} 72% 58%))`,
            }}
            aria-hidden
          >
            {initials}
          </div>
          <h2>{user?.full_name}</h2>
          <p className="profile-email">{user?.email}</p>
          <div className="profile-meta">
            <span className={`badge ${user?.is_admin ? "admin" : "soft"}`}>
              {user?.is_admin ? "Administrador" : "Operador"}
            </span>
            <span className="badge ok">Activo</span>
          </div>
          <dl className="profile-facts">
            <div>
              <dt>Miembro desde</dt>
              <dd>{formatDate(user?.created_at)}</dd>
            </div>
            <div>
              <dt>Identificador</dt>
              <dd className="profile-id">{user?.id}</dd>
            </div>
          </dl>
          <p className="profile-hint">
            El avatar muestra tus iniciales con un color único. En una versión futura podrás subir una foto de perfil.
          </p>
        </section>

        <div className="profile-forms">
          <FormCard
            title="Datos personales"
            subtitle="Actualiza cómo aparece tu nombre en el sistema."
            onSubmit={onSaveProfile}
          >
            <FormField label="Nombre completo" required>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                minLength={2}
                placeholder="Tu nombre y apellido"
                autoComplete="name"
              />
            </FormField>
            <FormField label="Correo electrónico">
              <input value={user?.email || ""} disabled readOnly />
            </FormField>
            {profileMsg.text && <Alert type={profileMsg.type}>{profileMsg.text}</Alert>}
            <FormActions>
              <button type="submit" className="btn-primary" disabled={busyProfile}>
                {busyProfile ? "Guardando…" : "Guardar cambios"}
              </button>
            </FormActions>
          </FormCard>

          <FormCard
            title="Seguridad"
            subtitle="Cambia tu contraseña con los requisitos de fortaleza del sistema."
            onSubmit={onChangePassword}
          >
            <FormField label="Contraseña actual" required>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </FormField>
            <FormField label="Nueva contraseña" required>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="••••••••"
              />
            </FormField>
            {newPassword && <PasswordStrength password={newPassword} />}
            <FormField label="Confirmar nueva contraseña" required>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
                placeholder="••••••••"
              />
            </FormField>
            {passwordMsg.text && <Alert type={passwordMsg.type}>{passwordMsg.text}</Alert>}
            <FormActions>
              <button type="submit" className="btn-primary" disabled={busyPassword}>
                {busyPassword ? "Actualizando…" : "Actualizar contraseña"}
              </button>
            </FormActions>
          </FormCard>
        </div>
      </div>
    </div>
  );
}
