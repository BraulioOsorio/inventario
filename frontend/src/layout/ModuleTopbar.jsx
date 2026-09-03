import { useLocation } from "react-router-dom";
import { useAuth } from "../auth";

const TITLES = {
  "/": { title: "Panel de inicio", section: "Resumen" },
  "/productos": { title: "Catálogo de productos", section: "Inventario" },
  "/categorias": { title: "Categorías", section: "Organización" },
  "/movimientos": { title: "Punto de venta", section: "Operaciones" },
  "/alertas": { title: "Centro de alertas", section: "Monitoreo" },
  "/usuarios": { title: "Usuarios del sistema", section: "Admin" },
};

export default function ModuleTopbar({ onMenuToggle }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const meta = TITLES[pathname] || { title: "Inventario Modular", section: "Sistema" };

  return (
    <header className="module-topbar glass-topbar">
      <div className="module-topbar-left">
        <button type="button" className="menu-toggle" onClick={onMenuToggle} aria-label="Abrir menú">
          <span /><span /><span />
        </button>
        <div>
          <span className="module-section">{meta.section}</span>
          <h1>{meta.title}</h1>
        </div>
      </div>
      <div className="module-topbar-right">
        <span className="module-user-chip">{user?.full_name?.split(" ")[0]}</span>
        <span className="module-date">
          {new Date().toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" })}
        </span>
      </div>
    </header>
  );
}
