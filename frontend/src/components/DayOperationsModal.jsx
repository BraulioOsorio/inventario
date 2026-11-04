import { useEffect, useState } from "react";
import { useBusinessDay } from "../businessDay";
import { Alert, Modal } from "./ui";

const DISMISS_KEY = "inventario-day-prompt-dismissed";

function dismissKey(status) {
  if (!status) return "";
  return `${status.suggestion}-${status.client_date}`;
}

function formatDay(value) {
  if (!value) return "—";
  const raw = String(value).slice(0, 10);
  const [y, m, d] = raw.split("-").map(Number);
  if (!y || !m || !d) return raw;
  return new Date(y, m - 1, d).toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function DayOpsIcon() {
  return (
    <span className="day-ops-modal-icon" aria-hidden>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
        <rect x="3" y="4" width="18" height="18" rx="3" />
        <path d="M16 2v4M8 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01" />
      </svg>
    </span>
  );
}

export default function DayOperationsModal() {
  const { status, loading, openDay, closeDay, rolloverDay, refresh, canOperate } = useBusinessDay();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (loading || !status || canOperate) {
      setOpen(false);
      return;
    }
    const key = dismissKey(status);
    if (sessionStorage.getItem(DISMISS_KEY) === key) return;
    setOpen(true);
  }, [status, loading, canOperate]);

  if (!status || canOperate) return null;

  const suggestion = status.suggestion;
  const isRollover = suggestion === "rollover";

  function dismissLater() {
    sessionStorage.setItem(DISMISS_KEY, dismissKey(status));
    setOpen(false);
  }

  async function run(action) {
    setBusy(true);
    setMsg("");
    try {
      if (action === "open") await openDay();
      if (action === "close") await closeDay();
      if (action === "rollover") await rolloverDay();
      await refresh();
      setOpen(false);
      sessionStorage.removeItem(DISMISS_KEY);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  const title = isRollover ? "Actualiza tu día de caja" : "Abre el día de hoy";
  const lead = isRollover
    ? "Las ventas y movimientos deben quedar en la fecha de tu equipo. Cierra el día anterior y abre el de hoy cuando puedas."
    : "Sin un día operativo abierto no podrás vender ni registrar entradas. También puedes hacerlo desde el menú Operaciones.";

  return (
    <Modal open={open} onClose={dismissLater} className="day-ops-modal glass-panel" hideHeader>
      <div className="day-ops-modal-inner">
        <button type="button" className="day-ops-modal-close btn-ghost" onClick={dismissLater} aria-label="Cerrar">
          ×
        </button>

        <div className="day-ops-modal-hero">
          <DayOpsIcon />
          <p className="kicker">Operaciones · Día de caja</p>
          <h2 id="day-ops-title">{title}</h2>
        </div>

        {isRollover && status.open_day && (
          <div className="day-ops-date-strip" role="group" aria-label="Comparación de fechas">
            <div className="day-ops-date-card is-past">
              <span className="day-ops-date-label">Día abierto</span>
              <strong>{formatDay(status.open_day.business_date)}</strong>
            </div>
            <span className="day-ops-date-arrow" aria-hidden>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </span>
            <div className="day-ops-date-card is-today">
              <span className="day-ops-date-label">Hoy en tu equipo</span>
              <strong>{formatDay(status.client_date)}</strong>
            </div>
          </div>
        )}

        {!isRollover && (
          <div className="day-ops-today-chip">
            <span>Fecha local</span>
            <strong>{formatDay(status.client_date)}</strong>
          </div>
        )}

        <p className="day-ops-modal-lead">{lead}</p>

        {msg && <Alert type="error">{msg}</Alert>}

        <div className="day-ops-modal-foot">
          <button type="button" className="btn-ghost" disabled={busy} onClick={dismissLater}>
            Más tarde
          </button>
          {isRollover ? (
            <>
              <button type="button" className="btn-secondary" disabled={busy || loading} onClick={() => run("close")}>
                Solo cerrar
              </button>
              <button type="button" className="btn-primary" disabled={busy || loading} onClick={() => run("rollover")}>
                {busy ? "Procesando…" : "Cerrar y abrir hoy"}
              </button>
            </>
          ) : (
            <button type="button" className="btn-primary" disabled={busy || loading} onClick={() => run("open")}>
              {busy ? "Abriendo…" : "Abrir día de hoy"}
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
