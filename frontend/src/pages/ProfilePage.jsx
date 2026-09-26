import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import PasswordStrength from "../components/PasswordStrength";
import UserAvatar from "../components/UserAvatar";
import { Alert, FormActions, FormCard, FormField, PageHeader } from "../components/ui";
import { isStrongPassword, readImageAsDataUrl } from "../utils/userDisplay";

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
  const fileRef = useRef(null);
  const [fullName, setFullName] = useState(user?.full_name || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileMsg, setProfileMsg] = useState({ type: "", text: "" });
  const [avatarMsg, setAvatarMsg] = useState({ type: "", text: "" });
  const [passwordMsg, setPasswordMsg] = useState({ type: "", text: "" });
  const [busyProfile, setBusyProfile] = useState(false);
  const [busyAvatar, setBusyAvatar] = useState(false);
  const [busyPassword, setBusyPassword] = useState(false);

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

  async function onPickAvatar(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setAvatarMsg({ type: "", text: "" });
    setBusyAvatar(true);
    try {
      const dataUrl = await readImageAsDataUrl(file);
      const updated = await api.updateAvatar(token, { avatar_base64: dataUrl });
      updateUser(updated);
      setAvatarMsg({ type: "success", text: "Foto de perfil actualizada." });
    } catch (err) {
      setAvatarMsg({ type: "error", text: err.message });
    } finally {
      setBusyAvatar(false);
    }
  }

  async function onRemoveAvatar() {
    setAvatarMsg({ type: "", text: "" });
    setBusyAvatar(true);
    try {
      const updated = await api.updateAvatar(token, { avatar_base64: null });
      updateUser(updated);
      setAvatarMsg({ type: "success", text: "Se restauraron las iniciales como avatar." });
    } catch (err) {
      setAvatarMsg({ type: "error", text: err.message });
    } finally {
      setBusyAvatar(false);
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
          <div className="profile-avatar-wrap">
            <UserAvatar user={user} size="xl" className="profile-avatar-main" />
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="profile-avatar-input"
              onChange={onPickAvatar}
              disabled={busyAvatar}
            />
          </div>

          <div className="profile-avatar-actions">
            <button
              type="button"
              className="btn-secondary btn-sm"
              onClick={() => fileRef.current?.click()}
              disabled={busyAvatar}
            >
              {busyAvatar ? "Guardando…" : "Subir foto"}
            </button>
            {user?.avatar_base64 && (
              <button
                type="button"
                className="btn-danger-ghost btn-sm"
                onClick={onRemoveAvatar}
                disabled={busyAvatar}
              >
                Quitar foto
              </button>
            )}
          </div>

          {avatarMsg.text && (
            <Alert type={avatarMsg.type}>{avatarMsg.text}</Alert>
          )}

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
            JPG, PNG, WEBP o GIF hasta 500 KB. Si no subes foto, se muestran tus iniciales con color único.
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
