import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { Alert, EmptyState, KpiCard, PageHeader, Panel } from "../components/ui";

const CONTEXT_COLORS = {
  tienda: "#2f6fed",
  papeleria: "#e8873a",
  personal: "#1f8f63",
  general: "#6b7c90",
};

function ContextBars({ products }) {
  const data = useMemo(() => {
    const map = { tienda: 0, papeleria: 0, personal: 0, general: 0 };
    products.forEach((p) => {
      const key = map[p.context_type] !== undefined ? p.context_type : "general";
      map[key] += Number(p.quantity) || 0;
    });
    const total = Object.values(map).reduce((a, b) => a + b, 0) || 1;
    return Object.entries(map).map(([key, qty]) => ({
      key,
      qty,
      pct: Math.round((qty / total) * 100),
      color: CONTEXT_COLORS[key],
    }));
  }, [products]);

  return (
    <div className="bar-list">
      {data.map((row) => (
        <div key={row.key} className="bar-row">
          <div className="bar-meta">
            <strong>{row.key}</strong>
            <span>{row.qty} und · {row.pct}%</span>
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${row.pct}%`, background: row.color }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Donut({ products, categories }) {
  const total = Math.max(products.length, 1);
  const withCat = products.filter((p) => p.category_id).length;
  const pct = Math.round((withCat / total) * 100);
  const r = 54;
  const c = 2 * Math.PI * r;
  const dash = (pct / 100) * c;

  return (
    <div className="donut-wrap">
      <svg viewBox="0 0 140 140" className="donut" aria-hidden>
        <circle cx="70" cy="70" r={r} fill="none" stroke="#e8eef5" strokeWidth="16" />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="#2f6fed"
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform="rotate(-90 70 70)"
        />
        <text x="70" y="74" textAnchor="middle" fontSize="22" fontWeight="700" fill="#1d2a36">
          {pct}%
        </text>
      </svg>
      <div>
        <p><strong>{withCat}</strong> productos categorizados</p>
        <p className="muted">{categories.length} categorías disponibles</p>
      </div>
    </div>
  );
}

export default function HomePage() {
  const { token, user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [movements, setMovements] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([api.listProducts(token), api.listCategories(token), api.listMovements(token)])
      .then(([p, c, m]) => {
        setProducts(p);
        setCategories(c);
        setMovements(m);
      })
      .catch((err) => setError(err.message));
  }, [token]);

  const lowItems = useMemo(() => products.filter((p) => p.low_stock), [products]);
  const units = useMemo(() => products.reduce((a, p) => a + Number(p.quantity || 0), 0), [products]);
  const value = useMemo(
    () => products.reduce((acc, p) => acc + Number(p.quantity) * Number(p.unit_price), 0),
    [products]
  );
  const today = new Date().toLocaleDateString("es-CO", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="page">
      <PageHeader
        title={`Bienvenido, ${user?.full_name?.split(" ")[0] || "usuario"}`}
        subtitle="Resumen modular del inventario · escalable y listo para crecer."
        actions={<div className="date-chip">{today}</div>}
      />

      {error && <Alert>{error}</Alert>}

      <section className="kpi-grid">
        <KpiCard label="Productos" value={products.length} hint="Ítems activos" icon="P" />
        <KpiCard label="Unidades en stock" value={units} hint="Cantidad total" icon="U" />
        <KpiCard label="Stock bajo" value={lowItems.length} hint="Requieren atención" tone="warn" icon="!" />
        <KpiCard label="Valor estimado" value={`$${value.toFixed(0)}`} hint="Cantidad × precio" icon="$" />
      </section>

      <section className="dash-grid">
        <Panel
          title="Stock por contexto"
          action={<Link to="/productos" className="text-link">Ver catálogo</Link>}
          className="span-2"
        >
          {products.length ? (
            <ContextBars products={products} />
          ) : (
            <EmptyState
              title="Todavía no hay productos"
              text="Crea el primero para ver distribución por tienda, papelería o personal."
              action={<Link className="btn-primary" to="/productos">Ir a productos</Link>}
            />
          )}
        </Panel>

        <Panel title="Cobertura de categorías">
          <Donut products={products} categories={categories} />
        </Panel>
      </section>

      <section className="dash-grid">
        <Panel title="Alertas de stock" action={<Link to="/productos" className="text-link">Ver todo</Link>}>
          {lowItems.length ? (
            <ul className="plain-list">
              {lowItems.slice(0, 6).map((p) => (
                <li key={p.id}>
                  <strong>{p.name}</strong>
                  <span>{p.quantity} / mín {p.min_stock}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Sin alertas" text="Todo el stock está por encima del mínimo." />
          )}
        </Panel>

        <Panel
          title="Últimos movimientos"
          action={<Link to="/movimientos" className="text-link">Abrir módulo</Link>}
          className="span-2"
        >
          {movements.length ? (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Cantidad</th>
                    <th>Nota</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.slice(0, 8).map((m) => (
                    <tr key={m.id}>
                      <td><span className={`pill ${m.movement_type}`}>{m.movement_type}</span></td>
                      <td>{m.quantity}</td>
                      <td>{m.note || "—"}</td>
                      <td>{new Date(m.created_at).toLocaleString("es-CO")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Sin movimientos"
              text="Registra una entrada o salida para comenzar la trazabilidad."
              action={<Link className="btn-secondary" to="/movimientos">Registrar movimiento</Link>}
            />
          )}
        </Panel>
      </section>
    </div>
  );
}
