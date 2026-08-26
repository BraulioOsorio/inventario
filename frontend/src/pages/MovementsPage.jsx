import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";

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
      setOk("Movimiento registrado.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="kicker">Operaciones</p>
          <h1>Movimientos</h1>
          <p className="sub">Entradas, salidas y ajustes con trazabilidad.</p>
        </div>
      </header>

      {(error || ok) && <div className={`alert ${error ? "error" : "success"}`}>{error || ok}</div>}

      <div className="split-2">
        <form className="panel form-panel" onSubmit={onSubmit}>
          <h2>Nuevo movimiento</h2>
          <label>Producto
            <select required value={form.product_id} onChange={(e) => setForm({ ...form, product_id: e.target.value })}>
              <option value="">Selecciona…</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>{p.name} ({p.quantity})</option>
              ))}
            </select>
          </label>
          <div className="grid-2">
            <label>Tipo
              <select value={form.movement_type} onChange={(e) => setForm({ ...form, movement_type: e.target.value })}>
                <option value="in">Entrada</option>
                <option value="out">Salida</option>
                <option value="adjust">Ajuste</option>
              </select>
            </label>
            <label>Cantidad
              <input type="number" min="1" required value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
            </label>
          </div>
          <label>Nota<input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} /></label>
          <button className="btn-primary" disabled={busy}>Registrar</button>
        </form>

        <section className="panel">
          <div className="panel-head"><h2>Historial</h2></div>
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
                {!movements.length && <tr><td colSpan={4} className="muted">Sin movimientos.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
