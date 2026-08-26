import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";

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

  const low = useMemo(() => products.filter((p) => p.low_stock).length, [products]);
  const value = useMemo(
    () => products.reduce((acc, p) => acc + Number(p.quantity) * Number(p.unit_price), 0),
    [products]
  );

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="kicker">Módulo resumen</p>
          <h1>Panel operativo</h1>
          <p className="sub">Hola, {user?.full_name?.split(" ")[0]}. Estado general del inventario.</p>
        </div>
      </header>

      {error && <div className="alert error">{error}</div>}

      <section className="kpi-grid">
        <article className="kpi">
          <span>Productos activos</span>
          <strong>{products.length}</strong>
        </article>
        <article className="kpi warn">
          <span>Stock bajo</span>
          <strong>{low}</strong>
        </article>
        <article className="kpi">
          <span>Categorías</span>
          <strong>{categories.length}</strong>
        </article>
        <article className="kpi">
          <span>Valor estimado</span>
          <strong>${value.toFixed(0)}</strong>
        </article>
      </section>

      <section className="split-2">
        <div className="panel">
          <div className="panel-head">
            <h2>Accesos rápidos</h2>
          </div>
          <div className="quick-grid">
            <Link className="quick" to="/productos">Gestionar productos</Link>
            <Link className="quick" to="/categorias">Organizar categorías</Link>
            <Link className="quick" to="/movimientos">Registrar movimiento</Link>
            {user?.is_admin && <Link className="quick" to="/usuarios">Administrar usuarios</Link>}
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <h2>Alertas de stock</h2>
            <Link to="/productos" className="text-link">Ver todo</Link>
          </div>
          <ul className="plain-list">
            {products.filter((p) => p.low_stock).slice(0, 6).map((p) => (
              <li key={p.id}>
                <strong>{p.name}</strong>
                <span>{p.quantity} / mín {p.min_stock}</span>
              </li>
            ))}
            {!low && <li className="muted">Sin alertas por ahora.</li>}
          </ul>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h2>Últimos movimientos</h2>
          <Link to="/movimientos" className="text-link">Abrir módulo</Link>
        </div>
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
              {!movements.length && (
                <tr><td colSpan={4} className="muted">Aún no hay movimientos.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
