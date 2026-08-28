import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { Alert, EmptyState, KpiCard, PageHeader, Panel, ValuationCard } from "../components/ui";

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

function TopMovers({ movements, products }) {
  const rows = useMemo(() => {
    const counts = {};
    movements.forEach((m) => {
      counts[m.product_id] = (counts[m.product_id] || 0) + Number(m.quantity);
    });
    return Object.entries(counts)
      .map(([id, qty]) => {
        const product = products.find((p) => String(p.id) === String(id));
        return { id, name: product?.name || `Producto #${id}`, qty };
      })
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [movements, products]);

  const max = rows[0]?.qty || 1;

  if (!rows.length) {
    return <EmptyState title="Sin actividad" text="Aún no hay movimientos para mostrar tendencias." />;
  }

  return (
    <div className="bar-list">
      {rows.map((row) => (
        <div key={row.id} className="bar-row">
          <div className="bar-meta">
            <strong>{row.name}</strong>
            <span>{row.qty} und movidas</span>
          </div>
          <div className="bar-track">
            <div className="bar-fill" style={{ width: `${Math.round((row.qty / max) * 100)}%`, background: "var(--blue)" }} />
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
  const critical = useMemo(() => products.filter((p) => Number(p.quantity) <= 0), [products]);
  const units = useMemo(() => products.reduce((a, p) => a + Number(p.quantity || 0), 0), [products]);
  const value = useMemo(
    () => products.reduce((acc, p) => acc + Number(p.quantity) * Number(p.unit_price), 0),
    [products]
  );

  return (
    <div className="page">
      <PageHeader
        title={`Bienvenido, ${user?.full_name?.split(" ")[0] || "usuario"}`}
        subtitle="Vista general del inventario · indicadores, alertas y actividad reciente."
      />

      {error && <Alert>{error}</Alert>}

      <section className="kpi-grid">
        <KpiCard label="Productos activos" value={products.length} hint="Ítems en catálogo" icon="P" />
        <KpiCard label="Unidades en stock" value={units} hint="Cantidad total" icon="U" />
        <KpiCard label="Alertas activas" value={lowItems.length + critical.length} hint="Bajo mínimo o agotados" tone="warn" icon="!" />
        <KpiCard label="Movimientos" value={movements.length} hint="Registros históricos" icon="↕" />
      </section>

      <section className="dash-grid dash-grid-home">
        <Panel
          title="Distribución por contexto"
          action={<Link to="/productos" className="text-link">Ver catálogo</Link>}
          className="span-2"
        >
          {products.length ? <ContextBars products={products} /> : (
            <EmptyState
              title="Sin productos"
              text="Crea el primero para ver la distribución."
              action={<Link className="btn-primary" to="/productos">Ir a productos</Link>}
            />
          )}
        </Panel>

        <ValuationCard units={units} value={value} products={products.length} />
      </section>

      <section className="dash-grid dash-grid-home">
        <Panel title="Productos con más movimiento" action={<Link to="/movimientos" className="text-link">Ver historial</Link>}>
          <TopMovers movements={movements} products={products} />
        </Panel>

        <Panel title="Cobertura de categorías">
          <Donut products={products} categories={categories} />
        </Panel>

        <Panel title="Alertas prioritarias" action={<Link to="/alertas" className="text-link">Centro de alertas</Link>}>
          {lowItems.length || critical.length ? (
            <ul className="plain-list">
              {[...critical, ...lowItems].slice(0, 5).map((p) => (
                <li key={p.id}>
                  <div>
                    <strong>{p.name}</strong>
                    <div className="muted tiny">{Number(p.quantity) <= 0 ? "Agotado" : "Stock bajo"}</div>
                  </div>
                  <span>{p.quantity} / mín {p.min_stock}</span>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState title="Sin alertas" text="Todo el stock está en rango." />
          )}
        </Panel>
      </section>

      <Panel title="Últimos movimientos" action={<Link to="/movimientos" className="text-link">Abrir módulo</Link>}>
        {movements.length ? (
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
                {movements.slice(0, 6).map((m) => (
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
            text="Registra entradas o salidas para iniciar la trazabilidad."
            action={<Link className="btn-secondary" to="/movimientos">Registrar movimiento</Link>}
          />
        )}
      </Panel>
    </div>
  );
}
