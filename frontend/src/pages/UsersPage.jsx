import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import PasswordStrength from "../components/PasswordStrength";
import {
  Alert,
  FormActions,
  FormCard,
  FormField,
  PageHeader,
} from "../components/ui";
import { isStrongPassword } from "../utils/userDisplay";

export default function UsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", is_admin: false });
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  const pendingCount = useMemo(() => users.filter((u) => !u.is_active).length, [users]);
  const sortedUsers = useMemo(
    () => [...users].sort((a, b) => Number(a.is_active) - Number(b.is_active)),
    [users]
  );

  async function load() {
    setUsers(await api.listUsers(token));
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [token]);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setOk("");

    if (!isStrongPassword(form.password)) {
      setError("La contraseña no cumple todos los requisitos de seguridad.");
      setBusy(false);
      return;
    }

    try {
      await api.createUser(token, { ...form, is_active: true });
      setForm({ full_name: "", email: "", password: "", is_admin: false });
      setOk("Usuario creado y activado correctamente.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggle(u) {
    try {
      await api.updateUser(token, u.id, { is_active: !u.is_active });
      setOk(u.is_active ? "Usuario desactivado." : "Usuario activado. Ya puede ingresar al sistema.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page page-module">
      <PageHeader
        kicker="Seguridad"
        title="Usuarios"
        subtitle="Solo administradores pueden crear cuentas y activar solicitudes de acceso."
      />

      {error && <Alert type="error">{error}</Alert>}
      {ok && <Alert type="success">{ok}</Alert>}

      {pendingCount > 0 && (
        <Alert type="warning">
          Hay {pendingCount} solicitud{pendingCount > 1 ? "es" : ""} pendiente{pendingCount > 1 ? "s" : ""} de activación.
        </Alert>
      )}

      <div className="module-split">
        <FormCard
          title="Crear usuario"
          subtitle="Crea cuentas activas con datos básicos. La contraseña se almacena encriptada."
          onSubmit={onSubmit}
          className="form-narrow"
        >
          <FormField label="Nombre completo" required>
            <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Nombre y apellido" />
          </FormField>
          <FormField label="Correo electrónico" required>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="usuario@correo.com" />
          </FormField>
          <FormField label="Contraseña" required>
            <input type="password" required minLength={8} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
          </FormField>
          {form.password && <PasswordStrength password={form.password} />}
          <FormField label="Rol del usuario">
            <select value={form.is_admin ? "admin" : "user"} onChange={(e) => setForm({ ...form, is_admin: e.target.value === "admin" })}>
              <option value="user">Usuario estándar</option>
              <option value="admin">Administrador</option>
            </select>
          </FormField>
          <FormActions>
            <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Creando…" : "Crear usuario"}</button>
          </FormActions>
        </FormCard>

        <section className="panel table-panel glass-panel">
          <div className="panel-head">
            <h2>Directorio</h2>
            <span className="badge">{users.length} usuarios</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Correo</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {sortedUsers.map((u) => (
                  <tr key={u.id} className={!u.is_active ? "row-pending" : ""}>
                    <td>{u.full_name}</td>
                    <td>{u.email}</td>
                    <td><span className={`badge ${u.is_admin ? "admin" : "soft"}`}>{u.is_admin ? "Admin" : "Usuario"}</span></td>
                    <td>
                      <span className={`badge ${u.is_active ? "ok" : "warn"}`}>
                        {u.is_active ? "Activo" : "Pendiente"}
                      </span>
                    </td>
                    <td>
                      <button type="button" className="btn-secondary btn-sm" onClick={() => toggle(u)}>
                        {u.is_active ? "Desactivar" : "Activar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
