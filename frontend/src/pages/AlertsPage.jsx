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
  const [orders, setOrders] = useState([]);
  const [loans, setLoans] = useState([]);
  const [context, setContext] = useState("");
  const [filter, setFilter] = useState("all");
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      api.listProducts(token, { context_type: context || undefined }),
      api.listOrders(token),
      api.listLoans(token),
    ])
      .then(([p, o, l]) => {
        setProducts(p);
        setOrders(o || []);
        setLoans(l || []);
      })
      .catch((err) => setError(err.message));
  }, [token, context]);

  const dueOrders = useMemo(() => orders.filter((o) => o.is_due_soon), [orders]);
  const overdueLoans = useMemo(() => loans.filter((l) => l.is_overdue), [loans]);

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
    <div className="page page-module page-dashboard">
      <PageHeader
        kicker="Inventario"
        title="Centro de alertas"
        subtitle="Monitorea productos agotados o por debajo del mínimo y repón stock a tiempo."
      />

      {error && <Alert type="error">{error}</Alert>}

      <section className="dash-section kpi-grid">
        <KpiCard label="Agotados" value={stats.critical.length} hint="Stock en cero" tone="danger" />
        <KpiCard label="Stock bajo" value={stats.low.length} hint="Bajo el mínimo" tone="warn" />
        <KpiCard
          label="Pedidos próximos"
          value={dueOrders.length}
          hint="Avisados (1 sem antes)"
          tone={dueOrders.length ? "warn" : "normal"}
        />
        <KpiCard
          label="Préstamos vencidos"
          value={overdueLoans.length}
          hint="Requieren retorno"
          tone={overdueLoans.length ? "danger" : "normal"}
        />
      </section>

      <section className="dash-section">
      <DataToolbar
        actions={
          <Link to="/movimientos" className="btn-primary btn-sm">
            Registrar entrada
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

      <Panel title="Productos a revisar" action={<span className="badge">{visible.length} ítems</span>} className="table-panel">
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

      {dueOrders.length > 0 && (
        <Panel
          title="Pedidos a proveedores próximos (avisados 1 semana antes)"
          action={<Link to="/pedidos" className="text-link">Ver módulo de pedidos</Link>}
          className="panel-elevated"
          style={{ marginTop: "1.5rem" }}
        >
          <div className="table-wrap">
            <table className="table-erp">
              <thead>
                <tr>
                  <th>Proveedor</th>
                  <th>Concepto</th>
                  <th>Programación</th>
                  <th>Total estimado</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {dueOrders.map((o) => (
                  <tr key={o.id} className="row-warn">
                    <td>
                      <strong>{o.supplier_name}</strong>
                      {o.supplier_contact && <div className="muted tiny contact-meta">{o.supplier_contact}</div>}
                    </td>
                    <td>{o.title}</td>
                    <td>
                      {o.is_monthly_recurring ? (
                        <span className="badge soft">Mensual · día {o.monthly_day}</span>
                      ) : (
                        <span>{o.expected_date ? new Date(o.expected_date).toLocaleDateString("es-CO") : "—"}</span>
                      )}
                    </td>
                    <td>${Number(o.estimated_total || 0).toLocaleString("es-CO")}</td>
                    <td>
                      <Link to="/pedidos" className="btn-secondary btn-sm">
                        Gestionar
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      {overdueLoans.length > 0 && (
        <Panel
          title="Préstamos con fecha de retorno vencida"
          action={<Link to="/prestamos" className="text-link">Ver préstamos</Link>}
          className="panel-elevated"
          style={{ marginTop: "1.5rem" }}
        >
          <div className="table-wrap">
            <table className="table-erp">
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Prestatario</th>
                  <th>Cantidad</th>
                  <th>Venció el</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {overdueLoans.map((l) => (
                  <tr key={l.id} className="row-warn">
                    <td><strong>{l.product_name}</strong></td>
                    <td>
                      <strong>{l.borrower_name}</strong>
                      {l.borrower_contact && <div className="muted tiny contact-meta">{l.borrower_contact}</div>}
                    </td>
                    <td>{l.quantity}</td>
                    <td><span className="text-danger">{l.due_date ? new Date(l.due_date).toLocaleDateString("es-CO") : "—"}</span></td>
                    <td>
                      <Link to="/prestamos" className="btn-primary btn-sm">
                        Devolver
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
      </section>
    </div>
  );
}
