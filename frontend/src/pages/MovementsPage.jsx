import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import {
  Alert,
  DataToolbar,
  FormActions,
  FormCard,
  FormField,
  FormRow,
  Modal,
  PageHeader,
} from "../components/ui";

export default function MovementsPage() {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [form, setForm] = useState({ product_id: "", movement_type: "in", quantity: 1, note: "" });
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const [openForm, setOpenForm] = useState(false);

  async function load() {
    const [p, m] = await Promise.all([api.listProducts(token), api.listMovements(token)]);
    setProducts(p);
    setMovements(m);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [token]);

  useEffect(() => {
    const productId = searchParams.get("product") || "";
    const type = searchParams.get("type") || "in";
    if (productId) {
      setForm((prev) => ({ ...prev, product_id: productId, movement_type: type }));
      setOpenForm(true);
    }
  }, [searchParams]);

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setOk("");
    try {
      await api.createMovement(token, { ...form, quantity: Number(form.quantity) });
      setForm({ product_id: "", movement_type: "in", quantity: 1, note: "" });
      setOpenForm(false);
      setOk("Movimiento registrado correctamente.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page page-module">
      <PageHeader
        kicker="Operaciones"
        title="Movimientos de stock"
        subtitle="Entradas, salidas y ajustes con historial completo."
      />

      {error && <Alert type="error">{error}</Alert>}
      {ok && <Alert type="success">{ok}</Alert>}

      <DataToolbar
        actions={
          <button type="button" className="btn-primary btn-sm" onClick={() => setOpenForm(true)}>
            + Nuevo movimiento
          </button>
        }
      >
        <span className="toolbar-hint">Registra cambios de inventario y deja trazabilidad por producto.</span>
      </DataToolbar>

      <section className="panel table-panel panel-elevated">
        <div className="panel-head">
          <h2>Historial de movimientos</h2>
          <span className="badge">{movements.length} registros</span>
        </div>
        <div className="table-wrap">
          <table className="table-erp">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Nota</th>
                <th>Fecha</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td><span className={`pill ${m.movement_type}`}>{m.movement_type}</span></td>
                  <td><strong>{m.quantity}</strong></td>
                  <td>{m.note || "—"}</td>
                  <td>{new Date(m.created_at).toLocaleString("es-CO")}</td>
                </tr>
              ))}
              {!movements.length && (
                <tr><td colSpan={4} className="muted cell-empty">Sin movimientos registrados.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={openForm}
        onClose={() => setOpenForm(false)}
        title="Registrar movimiento"
        subtitle="Actualiza el stock del producto seleccionado."
      >
        <FormCard onSubmit={onSubmit} className="modal-form" bare>
          <div className="form-card-body">
            <FormField label="Producto" required>
              <select required value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
                <option value="">Selecciona un producto…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} — stock: {p.quantity}</option>
                ))}
              </select>
            </FormField>
            <FormRow cols={2}>
              <FormField label="Tipo de movimiento">
                <select value={form.movement_type} onChange={(e) => setForm({ ...form, movement_type: e.target.value })}>
                  <option value="in">Entrada (+)</option>
                  <option value="out">Salida (−)</option>
                  <option value="adjust">Ajuste (=)</option>
                </select>
              </FormField>
              <FormField label="Cantidad" required>
                <input type="number" min="1" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
              </FormField>
            </FormRow>
            <FormField label="Nota" hint="Opcional">
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Ej. Compra proveedor #123" />
            </FormField>
          </div>
          <FormActions>
            <button type="button" className="btn-secondary" onClick={() => setOpenForm(false)}>Cancelar</button>
            <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Registrando…" : "Registrar"}</button>
          </FormActions>
        </FormCard>
      </Modal>
    </div>
  );
}
