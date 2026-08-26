import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";

const CONTEXTS = [
  { value: "", label: "Todos" },
  { value: "tienda", label: "Tienda" },
  { value: "papeleria", label: "Papelería" },
  { value: "personal", label: "Personal" },
  { value: "general", label: "General" },
];

const emptyProduct = {
  name: "",
  sku: "",
  description: "",
  unit: "unidad",
  quantity: 0,
  min_stock: 5,
  unit_price: 0,
  context_type: "general",
  category_id: "",
};

export default function DashboardPage() {
  const { user, token, logout } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [movements, setMovements] = useState([]);
  const [users, setUsers] = useState([]);
  const [context, setContext] = useState("");
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyProduct);
  const [categoryName, setCategoryName] = useState("");
  const [movement, setMovement] = useState({ product_id: "", movement_type: "in", quantity: 1, note: "" });
  const [newUser, setNewUser] = useState({
    full_name: "",
    email: "",
    password: "",
    is_admin: false,
  });
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    const tasks = [
      api.listProducts(token, { context_type: context || undefined, q: search || undefined }),
      api.listCategories(token),
      api.listMovements(token),
    ];
    if (user?.is_admin) tasks.push(api.listUsers(token));
    const results = await Promise.all(tasks);
    setProducts(results[0]);
    setCategories(results[1]);
    setMovements(results[2]);
    if (user?.is_admin) setUsers(results[3] || []);
  }

  useEffect(() => {
    refresh().catch((err) => setError(err.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, context, user?.is_admin]);

  const lowStockCount = useMemo(() => products.filter((p) => p.low_stock).length, [products]);

  async function onCreateProduct(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const payload = {
        ...form,
        quantity: Number(form.quantity),
        min_stock: Number(form.min_stock),
        unit_price: Number(form.unit_price),
        category_id: form.category_id || null,
      };
      await api.createProduct(token, payload);
      setForm(emptyProduct);
      setMessage("Producto creado.");
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onCreateCategory(e) {
    e.preventDefault();
    try {
      await api.createCategory(token, { name: categoryName });
      setCategoryName("");
      setMessage("Categoría creada.");
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onMovement(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createMovement(token, {
        ...movement,
        quantity: Number(movement.quantity),
      });
      setMovement({ product_id: "", movement_type: "in", quantity: 1, note: "" });
      setMessage("Movimiento registrado.");
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onCreateUser(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.createUser(token, newUser);
      setNewUser({ full_name: "", email: "", password: "", is_admin: false });
      setMessage("Usuario creado por el administrador.");
      await refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleUserActive(u) {
    try {
      await api.updateUser(token, u.id, { is_active: !u.is_active });
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onDelete(id) {
    if (!confirm("¿Eliminar este producto?")) return;
    try {
      await api.deleteProduct(token, id);
      await refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Inventario Modular</p>
          <h1>Panel de control</h1>
        </div>
        <div className="user-box">
          <span>
            {user?.full_name}
            {user?.is_admin ? " · Admin" : ""}
          </span>
          <button type="button" className="ghost" onClick={logout}>
            Salir
          </button>
        </div>
      </header>

      <section className="stats">
        <article>
          <span>Productos</span>
          <strong>{products.length}</strong>
        </article>
        <article>
          <span>Stock bajo</span>
          <strong className={lowStockCount ? "warn" : ""}>{lowStockCount}</strong>
        </article>
        <article>
          <span>Categorías</span>
          <strong>{categories.length}</strong>
        </article>
        <article>
          <span>Movimientos</span>
          <strong>{movements.length}</strong>
        </article>
      </section>

      {(error || message) && (
        <div className={`banner ${error ? "error" : "ok"}`}>{error || message}</div>
      )}

      {user?.is_admin && (
        <section className="panel">
          <h2>Administración de usuarios</h2>
          <form className="form-grid" onSubmit={onCreateUser} style={{ marginBottom: "1rem" }}>
            <label>
              Nombre
              <input
                required
                value={newUser.full_name}
                onChange={(e) => setNewUser({ ...newUser, full_name: e.target.value })}
              />
            </label>
            <label>
              Correo
              <input
                type="email"
                required
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
              />
            </label>
            <label>
              Contraseña
              <input
                type="password"
                required
                minLength={6}
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
              />
            </label>
            <label>
              Rol
              <select
                value={newUser.is_admin ? "admin" : "user"}
                onChange={(e) => setNewUser({ ...newUser, is_admin: e.target.value === "admin" })}
              >
                <option value="user">Usuario</option>
                <option value="admin">Administrador</option>
              </select>
            </label>
            <button className="primary" disabled={busy} style={{ alignSelf: "end" }}>
              Crear usuario
            </button>
          </form>
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
                      <button type="button" className="ghost" onClick={() => toggleUserActive(u)}>
                        {u.is_active ? "Desactivar" : "Activar"}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="toolbar">
        <select value={context} onChange={(e) => setContext(e.target.value)}>
          {CONTEXTS.map((c) => (
            <option key={c.value || "all"} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <input
          placeholder="Buscar por nombre o SKU"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && refresh().catch((err) => setError(err.message))}
        />
        <button type="button" className="secondary" onClick={() => refresh().catch((err) => setError(err.message))}>
          Buscar
        </button>
      </section>

      <div className="grid-2">
        <form className="panel" onSubmit={onCreateProduct}>
          <h2>Nuevo producto</h2>
          <div className="form-grid">
            <label>
              Nombre
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </label>
            <label>
              SKU
              <input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </label>
            <label>
              Contexto
              <select value={form.context_type} onChange={(e) => setForm({ ...form, context_type: e.target.value })}>
                <option value="general">General</option>
                <option value="tienda">Tienda</option>
                <option value="papeleria">Papelería</option>
                <option value="personal">Personal</option>
              </select>
            </label>
            <label>
              Categoría
              <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Sin categoría</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Cantidad inicial
              <input type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </label>
            <label>
              Stock mínimo
              <input type="number" min="0" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} />
            </label>
            <label>
              Precio unitario
              <input type="number" min="0" step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
            </label>
            <label>
              Unidad
              <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </label>
          </div>
          <label>
            Descripción
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} />
          </label>
          <button className="primary" disabled={busy}>
            Guardar producto
          </button>
        </form>

        <div className="stack">
          <form className="panel" onSubmit={onCreateCategory}>
            <h2>Nueva categoría</h2>
            <label>
              Nombre
              <input required value={categoryName} onChange={(e) => setCategoryName(e.target.value)} />
            </label>
            <button className="secondary">Crear categoría</button>
          </form>

          <form className="panel" onSubmit={onMovement}>
            <h2>Movimiento de stock</h2>
            <label>
              Producto
              <select required value={movement.product_id} onChange={(e) => setMovement({ ...movement, product_id: e.target.value })}>
                <option value="">Selecciona…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.quantity})
                  </option>
                ))}
              </select>
            </label>
            <div className="form-grid">
              <label>
                Tipo
                <select value={movement.movement_type} onChange={(e) => setMovement({ ...movement, movement_type: e.target.value })}>
                  <option value="in">Entrada</option>
                  <option value="out">Salida</option>
                  <option value="adjust">Ajuste (definir stock)</option>
                </select>
              </label>
              <label>
                Cantidad
                <input type="number" min="1" required value={movement.quantity} onChange={(e) => setMovement({ ...movement, quantity: e.target.value })} />
              </label>
            </div>
            <label>
              Nota
              <input value={movement.note} onChange={(e) => setMovement({ ...movement, note: e.target.value })} />
            </label>
            <button className="primary" disabled={busy}>
              Registrar movimiento
            </button>
          </form>
        </div>
      </div>

      <section className="panel">
        <h2>Productos</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>SKU</th>
                <th>Contexto</th>
                <th>Stock</th>
                <th>Mín.</th>
                <th>Precio</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className={p.low_stock ? "low" : ""}>
                  <td>{p.name}</td>
                  <td>{p.sku}</td>
                  <td>{p.context_type}</td>
                  <td>
                    {p.quantity} {p.unit}
                    {p.low_stock && <span className="tag">Bajo</span>}
                  </td>
                  <td>{p.min_stock}</td>
                  <td>${Number(p.unit_price).toFixed(2)}</td>
                  <td>
                    <button type="button" className="ghost danger" onClick={() => onDelete(p.id)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {!products.length && (
                <tr>
                  <td colSpan={7} className="muted">
                    No hay productos todavía.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <h2>Últimos movimientos</h2>
        <ul className="movement-list">
          {movements.slice(0, 12).map((m) => (
            <li key={m.id}>
              <strong>{m.movement_type.toUpperCase()}</strong> · qty {m.quantity}
              <span>{new Date(m.created_at).toLocaleString("es-CO")}</span>
              {m.note && <em>{m.note}</em>}
            </li>
          ))}
          {!movements.length && <li className="muted">Sin movimientos registrados.</li>}
        </ul>
      </section>
    </div>
  );
}
