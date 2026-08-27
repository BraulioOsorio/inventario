import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import {
  Alert,
  FormActions,
  FormCard,
  FormField,
  FormRow,
  FormSection,
  PageHeader,
  Toolbar,
} from "../components/ui";

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
      setOk("Producto guardado correctamente.");
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
    <div className="page page-module">
      <PageHeader
        kicker="Catálogo"
        title="Productos"
        subtitle="Alta, búsqueda y control de existencias por contexto."
        actions={
          <button type="button" className="btn-primary" onClick={() => setOpenForm((v) => !v)}>
            {openForm ? "Cerrar formulario" : "+ Nuevo producto"}
          </button>
        }
      />

      {error && <Alert type="error">{error}</Alert>}
      {ok && <Alert type="success">{ok}</Alert>}

      <Toolbar>
        <FormField label="Contexto" className="toolbar-field">
          <select value={context} onChange={(e) => setContext(e.target.value)}>
            <option value="">Todos</option>
            <option value="tienda">Tienda</option>
            <option value="papeleria">Papelería</option>
            <option value="personal">Personal</option>
            <option value="general">General</option>
          </select>
        </FormField>
        <FormField label="Buscar" className="toolbar-field grow">
          <input
            placeholder="Nombre o SKU"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load().catch((err) => setError(err.message))}
          />
        </FormField>
        <button type="button" className="btn-secondary toolbar-btn" onClick={() => load().catch((err) => setError(err.message))}>
          Buscar
        </button>
      </Toolbar>

      {openForm && (
        <FormCard
          title="Registrar producto"
          subtitle="Completa la información del ítem. Los campos con * son obligatorios."
          onSubmit={onSubmit}
        >
          <FormSection title="Información general">
            <FormRow cols={3}>
              <FormField label="Nombre" required>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Cuaderno A4" />
              </FormField>
              <FormField label="SKU" required hint="Código único del producto">
                <input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="SKU-001" />
              </FormField>
              <FormField label="Contexto">
                <select value={form.context_type} onChange={(e) => setForm({ ...form, context_type: e.target.value })}>
                  <option value="general">General</option>
                  <option value="tienda">Tienda</option>
                  <option value="papeleria">Papelería</option>
                  <option value="personal">Personal</option>
                </select>
              </FormField>
            </FormRow>
            <FormRow cols={2}>
              <FormField label="Categoría">
                <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                  <option value="">Sin categoría</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Unidad de medida">
                <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="unidad, caja, paquete…" />
              </FormField>
            </FormRow>
          </FormSection>

          <FormSection title="Inventario y precio">
            <FormRow cols={3}>
              <FormField label="Cantidad inicial">
                <input type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </FormField>
              <FormField label="Stock mínimo" hint="Alerta cuando baje de este valor">
                <input type="number" min="0" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} />
              </FormField>
              <FormField label="Precio unitario">
                <input type="number" min="0" step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
              </FormField>
            </FormRow>
          </FormSection>

          <FormField label="Descripción">
            <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalles opcionales del producto" />
          </FormField>

          <FormActions>
            <button type="button" className="btn-secondary" onClick={() => setOpenForm(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Guardando…" : "Guardar producto"}</button>
          </FormActions>
        </FormCard>
      )}

      <section className="panel table-panel">
        <div className="panel-head">
          <h2>Listado de productos</h2>
          <span className="badge">{products.length} ítems</span>
        </div>
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
                  <td><span className="badge soft">{p.context_type}</span></td>
                  <td>
                    {p.quantity} {p.unit}
                    {p.low_stock && <span className="pill out">bajo</span>}
                  </td>
                  <td>{p.min_stock}</td>
                  <td>${Number(p.unit_price).toFixed(2)}</td>
                  <td>
                    <button type="button" className="btn-danger-ghost" onClick={() => onDelete(p.id)}>Eliminar</button>
                  </td>
                </tr>
              ))}
              {!products.length && (
                <tr><td colSpan={7} className="muted cell-empty">No hay productos registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
