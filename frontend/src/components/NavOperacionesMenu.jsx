import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  const panelRef = useRef(null);
  const [panelStyle, setPanelStyle] = useState({ top: 120, left: 280 });

  const onMovimientos = location.pathname === "/movimientos";
  const activeMode = new URLSearchParams(location.search).get("mode") || "pos";
  const isGroupActive = onMovimientos;

  function syncPanelPosition() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const gap = 8;
    const panelWidth = 300;
    let left = rect.right + gap;
    let top = Math.max(12, rect.top - 4);

    if (left + panelWidth > window.innerWidth - 12) {
      left = Math.max(12, rect.left - panelWidth - gap);
    }

    setPanelStyle({ top, left });
  }

  function openFlyout() {
    syncPanelPosition();
    setFlyoutOpen(true);
  }

  function toggleFlyout() {
    if (flyoutOpen) {
      setFlyoutOpen(false);
      return;
    }
    openFlyout();
  }

  useEffect(() => {
    setFlyoutOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    if (!flyoutOpen) return undefined;

    function onReposition() {
      syncPanelPosition();
    }

    function onDocPointerDown(e) {
      const target = e.target;
      if (wrapRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      setFlyoutOpen(false);
    }

    const closeTimer = window.setTimeout(() => {
      document.addEventListener("pointerdown", onDocPointerDown);
    }, 0);

    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);

    return () => {
      window.clearTimeout(closeTimer);
      document.removeEventListener("pointerdown", onDocPointerDown);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
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

  const panel = flyoutOpen
    ? createPortal(
        <div
          ref={panelRef}
          className="nav-flyout-panel glass-panel"
          role="menu"
          style={{ top: panelStyle.top, left: panelStyle.left }}
        >
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
                  onClick={() => {
                    setFlyoutOpen(false);
                    close();
                  }}
                >
                  <span>
                    <strong>{item.label}</strong>
                    <small>{item.desc}</small>
                  </span>
                </NavLink>
              );
            })}
          </div>
        </div>,
        document.body
      )
    : null;

  return (
    <>
      <div className={`nav-flyout-wrap ${flyoutOpen ? "flyout-open" : ""}`} ref={wrapRef}>
        <button
          ref={triggerRef}
          type="button"
          className={`nav-item nav-flyout-trigger ${isGroupActive ? "active" : ""}`}
          aria-expanded={flyoutOpen}
          aria-haspopup="menu"
          onClick={toggleFlyout}
        >
          <OpsIcon />
          <span className="nav-text">
            <strong>Operaciones</strong>
            <small>Caja diaria y ventas</small>
          </span>
          <span className="nav-flyout-chevron" aria-hidden>
            ›
          </span>
        </button>
      </div>
      {panel}
    </>
  );
}
