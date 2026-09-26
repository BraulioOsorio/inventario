import { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useBusinessDay } from "../businessDay";
import { useSidebar } from "../layout/SidebarContext";

const SUB_LINKS = [
  { to: "/movimientos", mode: null, label: "Punto de venta", desc: "Cobrar y vender" },
  { to: "/movimientos?mode=in", mode: "in", label: "Entrada de stock", desc: "Ingresar mercancía" },
  { to: "/movimientos?mode=adjust", mode: "adjust", label: "Ajuste inventario", desc: "Salida sin cobro" },
  { to: "/movimientos?mode=history", mode: "history", label: "Historial", desc: "Ver movimientos" },
];

function OpsIcon() {
  return (
    <span className="nav-icon-svg">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M2 10h20M6 15h4" />
      </svg>
    </span>
  );
}

export default function NavOperacionesMenu() {
  const location = useLocation();
  const { close } = useSidebar();
  const { status, canOperate, loading, openDay, closeDay, rolloverDay, refresh } = useBusinessDay();
  const [flyoutOpen, setFlyoutOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef(null);
  const triggerRef = useRef(null);
  const [panelTop, setPanelTop] = useState(120);

  const onMovimientos = location.pathname === "/movimientos";
  const activeMode = new URLSearchParams(location.search).get("mode") || "pos";
  const isGroupActive = onMovimientos;

  function syncPanelTop() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPanelTop(Math.max(12, rect.top - 4));
  }

  function openFlyout() {
    syncPanelTop();
    setFlyoutOpen(true);
  }

  useEffect(() => {
    setFlyoutOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!flyoutOpen) return undefined;
    function onDocClick(e) {
      if (!wrapRef.current?.contains(e.target)) setFlyoutOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [flyoutOpen]);

  async function runDayAction(action) {
    setBusy(true);
    try {
      if (action === "open") await openDay();
      if (action === "close") await closeDay();
      if (action === "rollover") await rolloverDay();
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  const suggestion = status?.suggestion;
  const showOpen = suggestion === "open";
  const showRollover = suggestion === "rollover";
  const showCloseOnly = canOperate && status?.open_day;

  return (
    <div
      className={`nav-flyout-wrap ${flyoutOpen ? "flyout-open" : ""}`}
      ref={wrapRef}
      onMouseEnter={openFlyout}
      onMouseLeave={() => setFlyoutOpen(false)}
    >
      <button
        ref={triggerRef}
        type="button"
        className={`nav-item nav-flyout-trigger ${isGroupActive ? "active" : ""}`}
        aria-expanded={flyoutOpen}
        onClick={() => (flyoutOpen ? setFlyoutOpen(false) : openFlyout())}
      >
        <OpsIcon />
        <span className="nav-text">
          <strong>Operaciones</strong>
          <small>Caja diaria y ventas</small>
        </span>
        <span className="nav-flyout-chevron" aria-hidden>›</span>
      </button>

      {flyoutOpen && (
        <div className="nav-flyout-panel glass-panel" role="menu" style={{ top: panelTop }}>
          <div className="nav-flyout-head">
            <OpsIcon />
            <div>
              <strong>Operaciones</strong>
              <small>Día {status?.client_date || "—"}</small>
            </div>
          </div>

          <p className="nav-flyout-kicker">Accesos rápidos</p>
          <div className="nav-flyout-quick">
            {showOpen && (
              <button
                type="button"
                className="nav-flyout-quick-btn"
                disabled={busy || loading}
                onClick={() => runDayAction("open")}
              >
                <span className="nav-flyout-quick-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18M12 14v4M10 16h4" />
                  </svg>
                </span>
                <span>Abrir día</span>
              </button>
            )}
            {showRollover && (
              <>
                <button
                  type="button"
                  className="nav-flyout-quick-btn"
                  disabled={busy || loading}
                  onClick={() => runDayAction("rollover")}
                >
                  <span className="nav-flyout-quick-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 1 1-2.64-6.36M21 3v6h-6" />
                    </svg>
                  </span>
                  <span>Cerrar y abrir hoy</span>
                </button>
                <button
                  type="button"
                  className="nav-flyout-quick-btn subtle"
                  disabled={busy || loading}
                  onClick={() => runDayAction("close")}
                >
                  <span className="nav-flyout-quick-icon" aria-hidden>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="3" y="4" width="18" height="18" rx="2" />
                      <path d="M16 2v4M8 2v4M3 10h18M9 16l6-6M15 16l-6-6" />
                    </svg>
                  </span>
                  <span>Cerrar día anterior</span>
                </button>
              </>
            )}
            {showCloseOnly && !showRollover && (
              <button
                type="button"
                className="nav-flyout-quick-btn subtle"
                disabled={busy || loading}
                onClick={() => runDayAction("close")}
              >
                <span className="nav-flyout-quick-icon" aria-hidden>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18M9 16l6-6M15 16l-6-6" />
                  </svg>
                </span>
                <span>Cerrar día</span>
              </button>
            )}
            {canOperate && !showOpen && !showRollover && (
              <p className="nav-flyout-day-ok">Día de hoy abierto</p>
            )}
          </div>

          <p className="nav-flyout-kicker">Módulos</p>
          <div className="nav-flyout-links">
            {SUB_LINKS.map((item) => {
              const linkMode = item.mode || "pos";
              const active = onMovimientos && activeMode === linkMode;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  role="menuitem"
                  className={active ? "nav-flyout-link active" : "nav-flyout-link"}
                  onClick={close}
                >
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.desc}</small>
                  </span>
                </NavLink>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
