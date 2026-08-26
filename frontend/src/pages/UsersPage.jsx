import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";

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
      setOk("Usuario creado.");
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
    <div className="page">
      <header className="page-head">
        <div>
          <p className="kicker">Seguridad</p>
          <h1>Usuarios</h1>
          <p className="sub">Solo administradores pueden crear y activar cuentas.</p>
        </div>
      </header>

      {(error || ok) && <div className={`alert ${error ? "error" : "success"}`}>{error || ok}</div>}

      <div className="split-2">
        <form className="panel form-panel" onSubmit={onSubmit}>
          <h2>Crear usuario</h2>
          <label>Nombre<input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></label>
          <label>Correo<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label>Contraseña<input type="password" required minLength={6} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
          <label>Rol
            <select value={form.is_admin ? "admin" : "user"} onChange={(e) => setForm({ ...form, is_admin: e.target.value === "admin" })}>
              <option value="user">Usuario</option>
              <option value="admin">Administrador</option>
            </select>
          </label>
          <button className="btn-primary" disabled={busy}>Crear</button>
        </form>

        <section className="panel">
          <div className="panel-head"><h2>Directorio</h2></div>
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
                    <td>{u.is_admin ? "Admin" : "Usuario"}</td>
                    <td>{u.is_active ? "Activo" : "Inactivo"}</td>
                    <td>
                      <button type="button" className="btn-secondary" onClick={() => toggle(u)}>
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
