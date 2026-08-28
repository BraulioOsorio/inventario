import { NavLink, Outlet, Navigate, Link } from "react-router-dom";
import { useAuth } from "../auth";
import ModuleTopbar from "./ModuleTopbar";

const QUICK = [
  { to: "/productos", label: "Productos", tone: "blue" },
  { to: "/alertas", label: "Alertas", tone: "orange" },
  { to: "/movimientos", label: "Movimientos", tone: "teal" },
];

const NAV = [
  { to: "/", label: "Resumen", end: true, icon: "◉" },
  { to: "/productos", label: "Catálogo", icon: "▦" },
  { to: "/categorias", label: "Clasificación", icon: "◎" },
  { to: "/alertas", label: "Alertas", icon: "!" },
  { to: "/movimientos", label: "Operaciones", icon: "↕" },
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
              <span className="nav-icon" aria-hidden>{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
          {user?.is_admin && (
            <NavLink to="/usuarios" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
              <span className="nav-icon" aria-hidden>⚙</span>
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
        <ModuleTopbar />
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
