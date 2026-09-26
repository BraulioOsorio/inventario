import { useState } from "react";
import { useBusinessDay } from "../businessDay";
import { Alert } from "./ui";

export default function DayOperationsBanner() {
  const { status, loading, openDay, closeDay, rolloverDay, refresh, canOperate } = useBusinessDay();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  if (!status || canOperate) return null;

  const suggestion = status.suggestion;

  async function run(action) {
    setBusy(true);
    setMsg("");
    try {
      if (action === "open") await openDay();
      if (action === "close") await closeDay();
      if (action === "rollover") await rolloverDay();
      await refresh();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="day-ops-banner glass-panel">
      {suggestion === "open" && (
        <Alert type="warning">
          <div className="day-ops-copy">
            <strong>No tienes un día operativo abierto.</strong>
            <p>Abre el día de hoy para registrar ventas, entradas y ajustes de inventario.</p>
            <div className="day-ops-actions">
              <button type="button" className="btn-primary btn-sm" disabled={busy || loading} onClick={() => run("open")}>
                {busy ? "Abriendo…" : "Abrir día de hoy"}
              </button>
            </div>
          </div>
        </Alert>
      )}

      {suggestion === "rollover" && status.open_day && (
        <Alert type="warning">
          <div className="day-ops-copy">
            <strong>Tienes abierto el día {status.open_day.business_date}, pero hoy es {status.client_date}.</strong>
            <p>Te sugerimos cerrar el día anterior y abrir el de hoy para que los informes cuadren.</p>
            <div className="day-ops-actions">
              <button type="button" className="btn-secondary btn-sm" disabled={busy || loading} onClick={() => run("close")}>
                Solo cerrar día anterior
              </button>
              <button type="button" className="btn-primary btn-sm" disabled={busy || loading} onClick={() => run("rollover")}>
                {busy ? "Procesando…" : "Cerrar y abrir hoy"}
              </button>
            </div>
          </div>
        </Alert>
      )}

      {msg && <Alert type="error">{msg}</Alert>}
    </div>
  );
}
