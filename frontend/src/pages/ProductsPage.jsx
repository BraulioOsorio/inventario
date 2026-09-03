import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import {
  Alert,
  DataToolbar,
  FormActions,
  FormCard,
  FormField,
  FormRow,
  FormSection,
  FormTabs,
  Modal,
  PageHeader,
} from "../components/ui";
import { contextTypeLabel, formatMoney } from "../utils/labels";

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

const TABS = [
  { id: "general", label: "General" },
  { id: "stock", label: "Inventario" },
];

export default function ProductsPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(empty);
  const [editingId, setEditingId] = useState(null);
  const [context, setContext] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const [openForm, setOpenForm] = useState(false);
  const [tab, setTab] = useState("general");

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

  function openCreate() {
    setForm(empty);
    setEditingId(null);
    setTab("general");
    setOpenForm(true);
  }

  function openEdit(product) {
    setForm({
      name: product.name,
      sku: product.sku,
      description: product.description || "",
      unit: product.unit,
      quantity: product.quantity,
      min_stock: product.min_stock,
      unit_price: product.unit_price,
      context_type: product.context_type,
      category_id: product.category_id || "",
    });
    setEditingId(product.id);
    setTab("general");
    setOpenForm(true);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setOk("");
    try {
      const payload = {
        name: form.name,
        sku: form.sku,
        description: form.description || null,
        unit: form.unit,
        min_stock: Number(form.min_stock),
        unit_price: Number(form.unit_price),
        context_type: form.context_type,
        category_id: form.category_id || null,
      };

      if (editingId) {
        await api.updateProduct(token, editingId, payload);
        setOk("Producto actualizado correctamente.");
      } else {
        await api.createProduct(token, {
          ...payload,
          quantity: Number(form.quantity),
        });
        setOk("Producto guardado correctamente.");
      }

      setForm(empty);
      setEditingId(null);
      setOpenForm(false);
      setTab("general");
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
      setOk("Producto eliminado.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function closeModal() {
    setOpenForm(false);
    setEditingId(null);
    setForm(empty);
    setTab("general");
  }

  return (
    <div className="page page-module">
      <PageHeader
        kicker="Catálogo"
        title="Gestión de productos"
        subtitle="Consulta, filtra y administra el catálogo con control de existencias."
      />

      {error && <Alert type="error">{error}</Alert>}
      {ok && <Alert type="success">{ok}</Alert>}

      <DataToolbar
        actions={
          <button type="button" className="btn-primary btn-sm" onClick={openCreate}>
            + Adicionar
          </button>
        }
      >
        <FormField label="Contexto" className="toolbar-field">
          <select value={context} onChange={(e) => setContext(e.target.value)}>
            <option value="">Todos</option>
            <option value="tienda">Tienda</option>
            <option value="papeleria">Papelería</option>
            <option value="personal">Personal</option>
            <option value="general">General</option>
          </select>
        </FormField>
        <FormField label="Buscar producto" className="toolbar-field grow">
          <input
            placeholder="Nombre o marca"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load().catch((err) => setError(err.message))}
          />
        </FormField>
        <button type="button" className="btn-secondary toolbar-btn" onClick={() => load().catch((err) => setError(err.message))}>
          Buscar
        </button>
      </DataToolbar>

      <section className="panel table-panel panel-elevated glass-panel">
        <div className="panel-head">
          <h2>Listado de productos</h2>
          <span className="badge">{products.length} ítems</span>
        </div>
        <div className="table-wrap">
          <table className="table-erp">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Marca</th>
                <th>Contexto</th>
                <th>Existencias</th>
                <th>Mín.</th>
                <th>Precio</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {products.map((p) => (
                <tr key={p.id} className={p.low_stock ? "row-warn" : ""}>
                  <td><strong>{p.name}</strong></td>
                  <td><code>{p.sku}</code></td>
                  <td><span className="badge soft">{contextTypeLabel(p.context_type)}</span></td>
                  <td>
                    {p.quantity} {p.unit}
                    {p.low_stock && <span className="pill out">Bajo</span>}
                  </td>
                  <td>{p.min_stock}</td>
                  <td>{formatMoney(p.unit_price)}</td>
                  <td className="cell-actions">
                    <button type="button" className="btn-secondary btn-sm" onClick={() => openEdit(p)}>
                      Editar
                    </button>
                    <button
                      type="button"
                      className="btn-danger-ghost btn-sm"
                      onClick={() => onDelete(p.id)}
                      disabled={p.has_movements}
                      title={p.has_movements ? "Tiene movimientos registrados" : "Eliminar producto"}
                    >
                      Eliminar
                    </button>
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

      <Modal
        open={openForm}
        onClose={closeModal}
        title={editingId ? "Editar producto" : "Adicionar producto"}
        subtitle="Completa la información del ítem. Los campos con * son obligatorios."
        wide
      >
        <FormCard onSubmit={onSubmit} className="modal-form" bare>
          <FormTabs tabs={TABS} active={tab} onChange={setTab} />

          {tab === "general" && (
            <div className="form-card-body">
              <FormRow cols={2}>
                <FormField label="Nombre" required>
                  <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Ej. Cuaderno A4" />
                </FormField>
                <FormField label="Marca" required>
                  <input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} placeholder="Ej. Norma, BIC…" />
                </FormField>
              </FormRow>
              <FormRow cols={2}>
                <FormField label="Contexto">
                  <select value={form.context_type} onChange={(e) => setForm({ ...form, context_type: e.target.value })}>
                    <option value="general">General</option>
                    <option value="tienda">Tienda</option>
                    <option value="papeleria">Papelería</option>
                    <option value="personal">Personal</option>
                  </select>
                </FormField>
                <FormField label="Categoría">
                  <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
                    <option value="">Sin categoría</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </FormField>
              </FormRow>
              <FormField label="Descripción">
                <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Detalles opcionales" />
              </FormField>
            </div>
          )}

          {tab === "stock" && (
            <div className="form-card-body">
              <FormSection title="Existencias y precio">
                {editingId ? (
                  <FormField label="Stock actual" hint="Modifica el stock desde Punto de venta o Entrada">
                    <input type="number" value={form.quantity} readOnly disabled />
                  </FormField>
                ) : (
                  <FormRow cols={3}>
                    <FormField label="Cantidad inicial">
                      <input type="number" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
                    </FormField>
                    <FormField label="Stock mínimo" hint="Genera alerta">
                      <input type="number" min="0" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} />
                    </FormField>
                    <FormField label="Precio unitario">
                      <input type="number" min="0" step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
                    </FormField>
                  </FormRow>
                )}
                {editingId && (
                  <FormRow cols={2}>
                    <FormField label="Stock mínimo" hint="Genera alerta">
                      <input type="number" min="0" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} />
                    </FormField>
                    <FormField label="Precio unitario">
                      <input type="number" min="0" step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: e.target.value })} />
                    </FormField>
                  </FormRow>
                )}
                <FormField label="Unidad de medida">
                  <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="unidad, caja, paquete…" />
                </FormField>
              </FormSection>
            </div>
          )}

          <FormActions>
            <button type="button" className="btn-secondary" onClick={closeModal}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? "Guardando…" : editingId ? "Guardar cambios" : "Adicionar producto"}
            </button>
          </FormActions>
        </FormCard>
      </Modal>
    </div>
  );
}
