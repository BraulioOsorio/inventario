import { NavLink, Outlet, Navigate } from "react-router-dom";
import { useAuth } from "../auth";

const NAV = [
  { to: "/", label: "Resumen", end: true, icon: "◈" },
  { to: "/productos", label: "Productos", icon: "▣" },
  { to: "/categorias", label: "Categorías", icon: "▤" },
  { to: "/movimientos", label: "Movimientos", icon: "⇄" },
];

export default function AppLayout() {
  const { user, logout } = useAuth();

  return (
    <div className="erp">
      <aside className="erp-sidebar">
        <div className="brand">
          <span className="brand-mark">IM</span>
          <div>
            <strong>Inventario Modular</strong>
            <small>ERP · Cloud</small>
          </div>
        </div>

        <nav className="erp-nav">
          <p className="nav-label">Módulos</p>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
          {user?.is_admin && (
            <>
              <p className="nav-label">Administración</p>
              <NavLink to="/usuarios" className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}>
                <span className="nav-icon">◎</span>
                Usuarios
              </NavLink>
            </>
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
          <button type="button" className="btn-ghost" onClick={logout}>
            Cerrar sesión
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
