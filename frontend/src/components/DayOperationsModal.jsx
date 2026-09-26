import { useEffect, useState } from "react";
import { useBusinessDay } from "../businessDay";
import { Alert, Modal } from "./ui";

const DISMISS_KEY = "inventario-day-prompt-dismissed";

function dismissKey(status) {
  if (!status) return "";
  return `${status.suggestion}-${status.client_date}`;
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

  const title =
    suggestion === "rollover" ? "Actualizar día operativo" : "Abrir día operativo";

  const subtitle =
    suggestion === "rollover"
      ? `Tienes abierto el ${status.open_day?.business_date} y hoy es ${status.client_date}.`
      : "Para vender y mover inventario necesitas el día de hoy abierto.";

  return (
    <Modal open={open} title={title} subtitle={subtitle} onClose={dismissLater}>
      {suggestion === "open" && (
        <div className="day-ops-modal-body">
          <p className="day-ops-modal-lead">
            No tienes un día operativo abierto. Te sugerimos abrir el de hoy; también puedes hacerlo
            desde el menú <strong>Operaciones</strong>.
          </p>
          <div className="day-ops-actions">
            <button type="button" className="btn-ghost" disabled={busy} onClick={dismissLater}>
              Más tarde
            </button>
            <button type="button" className="btn-primary" disabled={busy || loading} onClick={() => run("open")}>
              {busy ? "Abriendo…" : "Abrir día de hoy"}
            </button>
          </div>
        </div>
      )}

      {suggestion === "rollover" && status.open_day && (
        <div className="day-ops-modal-body">
          <p className="day-ops-modal-lead">
            Cierra el día anterior y abre el de hoy para que ventas e informes queden alineados con la
            fecha del equipo.
          </p>
          <div className="day-ops-actions">
            <button type="button" className="btn-ghost" disabled={busy} onClick={dismissLater}>
              Más tarde
            </button>
            <button type="button" className="btn-secondary" disabled={busy || loading} onClick={() => run("close")}>
              Solo cerrar
            </button>
            <button type="button" className="btn-primary" disabled={busy || loading} onClick={() => run("rollover")}>
              {busy ? "Procesando…" : "Cerrar y abrir hoy"}
            </button>
          </div>
        </div>
      )}

      {msg && <Alert type="error">{msg}</Alert>}
    </Modal>
  );
}
