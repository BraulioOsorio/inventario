import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import {
  Alert,
  FormActions,
  FormCard,
  FormField,
  FormRow,
  PageHeader,
} from "../components/ui";

export default function UsersPage() {
  const { token } = useAuth();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", is_admin: false });
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

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
    try {
      await api.createUser(token, form);
      setForm({ full_name: "", email: "", password: "", is_admin: false });
      setOk("Usuario creado correctamente.");
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
        subtitle="Solo administradores pueden crear y activar cuentas."
      />

      {error && <Alert type="error">{error}</Alert>}
      {ok && <Alert type="success">{ok}</Alert>}

      <div className="module-split">
        <FormCard
          title="Crear usuario"
          subtitle="La contraseña se almacena encriptada en la base de datos."
          onSubmit={onSubmit}
          className="form-narrow"
        >
          <FormField label="Nombre completo" required>
            <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Nombre y apellido" />
          </FormField>
          <FormField label="Correo electrónico" required>
            <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="usuario@correo.com" />
          </FormField>
          <FormField label="Contraseña" required hint="Mínimo 6 caracteres">
            <input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="••••••••" />
          </FormField>
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
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>{u.full_name}</td>
                    <td>{u.email}</td>
                    <td><span className={`badge ${u.is_admin ? "admin" : "soft"}`}>{u.is_admin ? "Admin" : "Usuario"}</span></td>
                    <td><span className={`badge ${u.is_active ? "ok" : "muted-badge"}`}>{u.is_active ? "Activo" : "Inactivo"}</span></td>
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
