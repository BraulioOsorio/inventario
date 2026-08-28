import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { Alert, DataToolbar, EmptyState, FormField, KpiCard, PageHeader, Panel } from "../components/ui";

const FILTERS = [
  { id: "all", label: "Todos" },
  { id: "critical", label: "Agotados" },
  { id: "low", label: "Stock bajo" },
  { id: "ok", label: "En rango" },
];

function statusOf(product) {
  if (Number(product.quantity) <= 0) return "critical";
  if (product.low_stock) return "low";
  return "ok";
}

export default function AlertsPage() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [context, setContext] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .listProducts(token, { context_type: context || undefined })
      .then(setProducts)
      .catch((err) => setError(err.message));
  }, [token, context]);

  const stats = useMemo(() => {
    const critical = products.filter((p) => Number(p.quantity) <= 0);
    const low = products.filter((p) => p.low_stock && Number(p.quantity) > 0);
    const ok = products.filter((p) => !p.low_stock && Number(p.quantity) > 0);
    return { critical, low, ok };
  }, [products]);

  const visible = useMemo(() => {
    if (filter === "critical") return stats.critical;
    if (filter === "low") return stats.low;
    if (filter === "ok") return stats.ok;
    return [...stats.critical, ...stats.low, ...stats.ok].sort((a, b) => {
      const order = { critical: 0, low: 1, ok: 2 };
      return order[statusOf(a)] - order[statusOf(b)];
    });
  }, [filter, stats]);

  return (
    <div className="page page-module">
      <PageHeader
        kicker="Inventario"
        title="Centro de alertas"
        subtitle="Monitorea productos agotados o por debajo del mínimo y repón stock a tiempo."
      />

      {error && <Alert type="error">{error}</Alert>}

      <section className="kpi-grid kpi-grid-3">
        <KpiCard label="Agotados" value={stats.critical.length} hint="Stock en cero" tone="warn" icon="0" />
        <KpiCard label="Stock bajo" value={stats.low.length} hint="Bajo el mínimo" tone="warn" icon="!" />
        <KpiCard label="En rango" value={stats.ok.length} hint="Sin alerta activa" icon="✓" />
      </section>

      <DataToolbar
        actions={
          <Link to="/movimientos" className="btn-primary btn-sm">
            + Registrar entrada
          </Link>
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
        <div className="filter-chips">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              className={`filter-chip ${filter === f.id ? "active" : ""}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>
      </DataToolbar>

      <Panel title="Productos a revisar" action={<span className="badge">{visible.length} ítems</span>}>
        {visible.length ? (
          <div className="table-wrap">
            <table className="table-erp">
              <thead>
                <tr>
                  <th>Estado</th>
                  <th>Producto</th>
                  <th>Contexto</th>
                  <th>Stock actual</th>
                  <th>Mínimo</th>
                  <th>Faltante</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => {
                  const st = statusOf(p);
                  const deficit = Math.max(0, Number(p.min_stock) - Number(p.quantity));
                  return (
                    <tr key={p.id} className={st !== "ok" ? "row-warn" : ""}>
                      <td>
                        <span className={`status-dot ${st}`}>
                          {st === "critical" ? "Agotado" : st === "low" ? "Bajo" : "OK"}
                        </span>
                      </td>
                      <td>
                        <strong>{p.name}</strong>
                        <div className="muted tiny">{p.sku}</div>
                      </td>
                      <td><span className="badge soft">{p.context_type}</span></td>
                      <td>{p.quantity} {p.unit}</td>
                      <td>{p.min_stock}</td>
                      <td>{deficit > 0 ? `+${deficit}` : "—"}</td>
                      <td>
                        <Link
                          to={`/movimientos?product=${p.id}&type=in`}
                          className="btn-secondary btn-sm"
                        >
                          Reponer
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Sin alertas en este filtro"
            text="Todos los productos visibles están dentro del rango esperado."
          />
        )}
      </Panel>
    </div>
  );
}
