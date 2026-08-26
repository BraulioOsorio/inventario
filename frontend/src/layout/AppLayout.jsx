import { NavLink, Outlet, Navigate, Link } from "react-router-dom";
import { useAuth } from "../auth";

const QUICK = [
  { to: "/productos", label: "Productos", tone: "blue" },
  { to: "/categorias", label: "Categorías", tone: "teal" },
  { to: "/movimientos", label: "Movimientos", tone: "orange" },
];

const NAV = [
  { to: "/", label: "Resumen", end: true },
  { to: "/productos", label: "Catálogo" },
  { to: "/categorias", label: "Clasificación" },
  { to: "/movimientos", label: "Operaciones" },
];

export default function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="erp">
      <aside className="erp-sidebar">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            <span />
          </span>
          <div>
            <strong>Inventario Modular</strong>
            <small>ERP amigable · Cloud</small>
          </div>
        </div>

        <div className="quick-block">
          <p className="nav-label">Acceso rápido</p>
          <div className="quick-side">
            {QUICK.map((item) => (
              <Link key={item.to} to={item.to} className={`quick-side-btn ${item.tone}`}>
                {item.label}
              </Link>
            ))}
            {user?.is_admin && (
              <Link to="/usuarios" className="quick-side-btn violet">
                Usuarios
              </Link>
            )}
          </div>
        </div>

        <nav className="erp-nav">
          <p className="nav-label">Menú</p>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
            >
              {item.label}
            </NavLink>
          ))}
          {user?.is_admin && (
            <NavLink to="/usuarios" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
              Administración
            </NavLink>
          )}
        </nav>

        <div className="sidebar-foot">
          <div className="who">
            <span className="avatar">{(user?.full_name || "?").slice(0, 1).toUpperCase()}</span>
            <div>
              <strong>{user?.full_name}</strong>
              <small>{user?.is_admin ? "Administrador" : "Usuario"}</small>
            </div>
          </div>
          <button type="button" className="btn-side-exit" onClick={logout}>
            Salir
          </button>
        </div>
      </aside>

      <div className="erp-main">
        <Outlet />
      </div>
    </div>
  );
}

export function RequireAuth({ children }) {
  const { token, loading } = useAuth();
  if (loading) return <div className="boot">Cargando sistema…</div>;
  if (!token) return <Navigate to="/login" replace />;
  return children;
}
