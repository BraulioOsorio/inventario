import { NavLink, Outlet, Navigate, Link } from "react-router-dom";
import { useAuth } from "../auth";
import ModuleTopbar from "./ModuleTopbar";
import { SidebarProvider, useSidebar } from "./SidebarContext";
import { avatarHue, getInitials } from "../utils/userDisplay";

const NAV = [
  { to: "/", label: "Inicio", end: true, icon: "home", desc: "Resumen general" },
  { to: "/movimientos", label: "Punto de venta", icon: "pos", desc: "Cobrar y vender" },
  { to: "/productos", label: "Productos", icon: "box", desc: "Catálogo completo" },
  { to: "/pedidos", label: "Pedidos", icon: "orders", desc: "Compras a proveedores" },
  { to: "/prestamos", label: "Préstamos", icon: "loans", desc: "Custodia y devolución" },
  { to: "/clientes", label: "Clientes", icon: "customers", desc: "Directorio de contactos" },
  { to: "/categorias", label: "Categorías", icon: "tag", desc: "Organización" },
  { to: "/alertas", label: "Alertas", icon: "bell", desc: "Stock bajo" },
];

function NavIcon({ name }) {
  const icons = {
    home: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z" />
      </svg>
    ),
    pos: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="6" width="18" height="14" rx="2" />
        <path d="M7 10h4M7 14h10M15 10h2" />
      </svg>
    ),
    box: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9z" />
        <path d="M12 12 20 7.5M12 12v9M12 12 4 7.5" />
      </svg>
    ),
    tag: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 12 12 20l-8-8V4h8l8 8z" />
        <circle cx="7.5" cy="7.5" r="1.5" fill="currentColor" stroke="none" />
      </svg>
    ),
    orders: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M1 3h15v13H1zM16 8h4l3 3v5h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </svg>
    ),
    loans: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
        <path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" />
        <path d="M7 21h10M12 3v18M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" />
      </svg>
    ),
    customers: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    bell: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 2h16l-2-2z" />
        <path d="M10 20a2 2 0 0 0 4 0" />
      </svg>
    ),
    users: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="9" cy="8" r="3" />
        <path d="M2 20c0-3.3 3.1-5 7-5s7 1.7 7 5" />
        <circle cx="17" cy="9" r="2" />
        <path d="M22 20c0-2.2-2.2-3.5-4.5-3.5" />
      </svg>
    ),
  };
  return <span className="nav-icon-svg">{icons[name]}</span>;
}

function Shell() {
  const { user, logout } = useAuth();
  const { open, close, toggle } = useSidebar();

  return (
    <div className={`erp ${open ? "sidebar-open" : ""}`}>
      <button
        type="button"
        className="sidebar-backdrop"
        aria-label="Cerrar menú"
        onClick={close}
      />

      <aside className="erp-sidebar glass-sidebar">
        <div className="brand glass-brand">
          <span className="brand-mark" aria-hidden>
            <span />
          </span>
          <div>
            <strong>Inventario</strong>
            <small>Modular · Cloud</small>
          </div>
          <button type="button" className="sidebar-close-mobile" onClick={close} aria-label="Cerrar">
            ×
          </button>
        </div>

        <nav className="erp-nav">
          <p className="nav-label">Navegación</p>
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={close}
              className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
            >
              <NavIcon name={item.icon} />
              <span className="nav-text">
                <strong>{item.label}</strong>
                <small>{item.desc}</small>
              </span>
            </NavLink>
          ))}
          {user?.is_admin && (
            <NavLink
              to="/usuarios"
              onClick={close}
              className={({ isActive }) => (isActive ? "nav-item active" : "nav-item")}
            >
              <NavIcon name="users" />
              <span className="nav-text">
                <strong>Usuarios</strong>
                <small>Administración</small>
              </span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-foot glass-foot">
          <Link to="/perfil" className="who profile-link" onClick={close}>
            <span
              className="avatar avatar-gradient"
              style={{
                background: `linear-gradient(135deg, hsl(${avatarHue(user?.full_name)} 68% 52%), hsl(${(avatarHue(user?.full_name) + 40) % 360} 72% 58%))`,
              }}
            >
              {getInitials(user?.full_name)}
            </span>
            <div>
              <strong>{user?.full_name}</strong>
              <small>{user?.is_admin ? "Administrador" : "Operador"} · Ver perfil</small>
            </div>
          </Link>
          <button type="button" className="btn-side-exit" onClick={logout}>
            Cerrar sesión
          </button>
        </div>
      </aside>

      <div className="erp-main">
        <ModuleTopbar onMenuToggle={toggle} />
        <Outlet />
      </div>
    </div>
  );
}

export default function AppLayout() {
  return (
    <SidebarProvider>
      <Shell />
    </SidebarProvider>
  );
}

export function RequireAuth({ children }) {
  const { token, loading } = useAuth();
  if (loading) return <div className="boot glass-boot">Cargando sistema…</div>;
  if (!token) return <Navigate to="/login" replace />;
  return children;
}
