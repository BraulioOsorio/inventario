import { useLocation } from "react-router-dom";
import { useAuth } from "../auth";

const TITLES = {
  "/": { title: "Panel de resumen", section: "Inicio" },
  "/productos": { title: "Gestión de productos", section: "Catálogo" },
  "/categorias": { title: "Clasificación", section: "Organización" },
  "/movimientos": { title: "Operaciones de stock", section: "Movimientos" },
  "/alertas": { title: "Centro de alertas", section: "Inventario" },
  "/usuarios": { title: "Administración de usuarios", section: "Seguridad" },
};

export default function ModuleTopbar() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const meta = TITLES[pathname] || { title: "Inventario Modular", section: "Sistema" };

  return (
    <header className="module-topbar">
      <div className="module-topbar-left">
        <span className="module-section">{meta.section}</span>
        <h1>{meta.title}</h1>
      </div>
      <div className="module-topbar-right">
        <span className="module-user-chip">{user?.full_name}</span>
        <span className="module-date">
          {new Date().toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })}
        </span>
      </div>
    </header>
  );
}
