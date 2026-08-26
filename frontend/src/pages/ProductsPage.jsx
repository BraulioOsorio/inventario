import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";

const empty = {
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

export default function ProductsPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(empty);
  const [context, setContext] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const [openForm, setOpenForm] = useState(false);

  async function load() {
    const [p, c] = await Promise.all([
      api.listProducts(token, { context_type: context || undefined, q: search || undefined }),
      api.listCategories(token),
    ]);
    setProducts(p);
    setCategories(c);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, context]);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setOk("");
    try {
      await api.createProduct(token, {
        ...form,
        quantity: Number(form.quantity),
        min_stock: Number(form.min_stock),
        unit_price: Number(form.unit_price),
        category_id: form.category_id || null,
      });
      setForm(empty);
      setOpenForm(false);
      setOk("Producto guardado.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id) {
    if (!confirm("¿Eliminar producto?")) return;
    try {
      await api.deleteProduct(token, id);
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="kicker">Catálogo</p>
          <h1>Productos</h1>
          <p className="sub">Alta, búsqueda y control de existencias por contexto.</p>
        </div>
        <button type="button" className="btn-primary" onClick={() => setOpenForm((v) => !v)}>
          {openForm ? "Cerrar formulario" : "Nuevo producto"}
        </button>
      </header>

      {(error || ok) && <div className={`alert ${error ? "error" : "success"}`}>{error || ok}</div>}

      <div className="toolbar">
        <select value={context} onChange={(e) => setContext(e.target.value)}>
          <option value="">Todos los contextos</option>
          <option value="tienda">Tienda</option>
          <option value="papeleria">Papelería</option>
          <option value="personal">Personal</option>
          <option value="general">General</option>
        </select>
        <input
          placeholder="Buscar nombre o SKU"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && load().catch((err) => setError(err.message))}
        />
        <button type="button" className="btn-secondary" onClick={() => load().catch((err) => setError(err.message))}>
          Buscar
        </button>
      </div>

      {openForm && (
        <form className="panel form-panel" onSubmit={onSubmit}>
          <h2>Registrar producto</h2>
          <div className="grid-3">
            <label>Nombre<input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label>SKU<input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></label>
            <label>Contexto
              <select value={form.context_type} onChange={(e) => setForm({ ...form, context_type: e.target.value })}>
                <option value="general">General</option>
                <option value="tienda">Tienda</option>
                <option value="papeleria">Papelería</option>
                <option value="personal">Personal</option>
              </select>
            </label>
            <label>Categoría
              <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                <option value="">Sin categoría</option>
                {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label>Cantidad<input type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} /></label>
            <label>Stock mín.<input type="number" min="0" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} /></label>
            <label>Precio<input type="number" min="0" step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} /></label>
            <label>Unidad<input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} /></label>
          </div>
          <label>Descripción<textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></label>
          <button className="btn-primary" disabled={busy}>Guardar</button>
        </form>
      )}

      <section className="panel">
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
                <tr key={p.id} className={p.low_stock ? "row-warn" : ""}>
                  <td>{p.name}</td>
                  <td><code>{p.sku}</code></td>
                  <td>{p.context_type}</td>
                  <td>{p.quantity} {p.unit}{p.low_stock && <span className="pill out">bajo</span>}</td>
                  <td>{p.min_stock}</td>
                  <td>${Number(p.unit_price).toFixed(2)}</td>
                  <td><button type="button" className="btn-danger-ghost" onClick={() => onDelete(p.id)}>Eliminar</button></td>
                </tr>
              ))}
              {!products.length && <tr><td colSpan={7} className="muted">No hay productos.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
