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

export default function MovementsPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [form, setForm] = useState({ product_id: "", movement_type: "in", quantity: 1, note: "" });
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const [p, m] = await Promise.all([api.listProducts(token), api.listMovements(token)]);
    setProducts(p);
    setMovements(m);
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
      await api.createMovement(token, { ...form, quantity: Number(form.quantity) });
      setForm({ product_id: "", movement_type: "in", quantity: 1, note: "" });
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
        title="Movimientos"
        subtitle="Entradas, salidas y ajustes con trazabilidad."
      />

      {error && <Alert type="error">{error}</Alert>}
      {ok && <Alert type="success">{ok}</Alert>}

      <div className="module-split">
        <FormCard
          title="Nuevo movimiento"
          subtitle="Registra cambios de stock y deja una nota de referencia."
          onSubmit={onSubmit}
          className="form-narrow"
        >
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
          <FormField label="Nota" hint="Opcional — motivo o referencia">
            <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Ej. Compra proveedor #123" />
          </FormField>
          <FormActions>
            <button type="submit" className="btn-primary" disabled={busy}>{busy ? "Registrando…" : "Registrar movimiento"}</button>
          </FormActions>
        </FormCard>

        <section className="panel table-panel">
          <div className="panel-head">
            <h2>Historial</h2>
            <span className="badge">{movements.length} movimientos</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Cant.</th>
                  <th>Nota</th>
                  <th>Fecha</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m) => (
                  <tr key={m.id}>
                    <td><span className={`pill ${m.movement_type}`}>{m.movement_type}</span></td>
                    <td>{m.quantity}</td>
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
      </div>
    </div>
  );
}
