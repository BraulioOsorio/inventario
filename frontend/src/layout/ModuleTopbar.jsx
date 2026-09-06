import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";

const TITLES = {
  "/": { title: "Panel de inicio", section: "Resumen" },
  "/productos": { title: "Catálogo de productos", section: "Inventario" },
  "/pedidos": { title: "Pedidos a proveedores", section: "Compras" },
  "/prestamos": { title: "Préstamos de inventario", section: "Custodia" },
  "/clientes": { title: "Directorio de clientes", section: "Contactos" },
  "/categorias": { title: "Categorías", section: "Organización" },
  "/movimientos": { title: "Punto de venta", section: "Operaciones" },
  "/alertas": { title: "Centro de alertas", section: "Monitoreo" },
  "/usuarios": { title: "Usuarios del sistema", section: "Admin" },
};

export default function ModuleTopbar({ onMenuToggle }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("all"); // all | stock | order | loan
  const [summary, setSummary] = useState({ total_unread: 0, items: [] });
  const [loading, setLoading] = useState(false);
  const popoverRef = useRef(null);

  const meta = TITLES[pathname] || { title: "Inventario Modular", section: "Sistema" };

  async function fetchNotifications() {
    if (!token) return;
    try {
      setLoading(true);
      const data = await api.getNotifications(token);
      setSummary(data || { total_unread: 0, items: [] });
    } catch {
      // Silencioso en topbar
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 45000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, pathname]);

  // Cerrar al hacer clic por fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);

  const filteredItems = summary.items.filter((item) => {
    if (filter === "all") return true;
    return item.category === filter;
  });

  function handleItemClick(link) {
    setOpen(false);
    if (link) navigate(link);
  }

  function getCategoryIcon(cat) {
    if (cat === "stock") return "📦";
    if (cat === "order") return "🚚";
    if (cat === "loan") return "🤝";
    return "🔔";
  }

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
        {/* Campanita interactiva */}
        <div className="topbar-bell-wrap" ref={popoverRef}>
          <button
            type="button"
            className="topbar-bell-btn"
            onClick={() => {
              setOpen((prev) => !prev);
              if (!open) fetchNotifications();
            }}
            aria-label="Notificaciones"
            title="Notificaciones de stock y pedidos"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 16v-5a6 6 0 1 0-12 0v5l-2 2h16l-2-2z" />
              <path d="M10 20a2 2 0 0 0 4 0" />
            </svg>
            {summary.total_unread > 0 && (
              <span className="topbar-bell-badge">
                {summary.total_unread > 99 ? "99+" : summary.total_unread}
              </span>
            )}
          </button>

          {open && (
            <div className="notifications-popover">
              <div className="notifications-head">
                <h3>
                  <span>🔔</span> Notificaciones
                </h3>
                <span className="badge">
                  {summary.total_unread} {summary.total_unread === 1 ? "alerta" : "alertas"}
                </span>
              </div>

              <div className="notifications-filters">
                <button
                  type="button"
                  className={filter === "all" ? "active" : ""}
                  onClick={() => setFilter("all")}
                >
                  Todas ({summary.items.length})
                </button>
                <button
                  type="button"
                  className={filter === "stock" ? "active" : ""}
                  onClick={() => setFilter("stock")}
                >
                  Stock ({summary.items.filter((i) => i.category === "stock").length})
                </button>
                <button
                  type="button"
                  className={filter === "order" ? "active" : ""}
                  onClick={() => setFilter("order")}
                >
                  Pedidos ({summary.items.filter((i) => i.category === "order").length})
                </button>
                <button
                  type="button"
                  className={filter === "loan" ? "active" : ""}
                  onClick={() => setFilter("loan")}
                >
                  Préstamos ({summary.items.filter((i) => i.category === "loan").length})
                </button>
              </div>

              <div className="notifications-list">
                {filteredItems.map((item) => (
                  <div
                    key={item.id}
                    className={`notification-item ${item.severity || "info"}`}
                    onClick={() => handleItemClick(item.link)}
                    role="button"
                    tabIndex={0}
                  >
                    <span className="notification-icon">{getCategoryIcon(item.category)}</span>
                    <div className="notification-content">
                      <div className="notification-title">{item.title}</div>
                      <div className="notification-desc">{item.message}</div>
                    </div>
                  </div>
                ))}

                {!filteredItems.length && (
                  <div className="notifications-empty">
                    <p>🎉 No tienes alertas pendientes en esta categoría.</p>
                  </div>
                )}
              </div>

              <div className="notification-foot">
                <button
                  type="button"
                  className="text-link"
                  onClick={fetchNotifications}
                  disabled={loading}
                >
                  {loading ? "Actualizando…" : "↻ Actualizar"}
                </button>
                <Link
                  to="/alertas"
                  className="text-link"
                  onClick={() => setOpen(false)}
                >
                  Ver centro de alertas →
                </Link>
              </div>
            </div>
          )}
        </div>

        <span className="module-user-chip">{user?.full_name?.split(" ")[0]}</span>
        <span className="module-date">
          {new Date().toLocaleDateString("es-CO", { weekday: "short", day: "numeric", month: "short" })}
        </span>
      </div>
    </header>
  );
}
