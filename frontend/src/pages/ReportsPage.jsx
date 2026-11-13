import { useMemo, useState } from "react";
import { api, clientLocalDate } from "../api";
import { useAuth } from "../auth";
import { Alert, PageHeader, Panel } from "../components/ui";

function monthStartIso() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

async function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const SECTIONS = [
  {
    title: "Control general",
    items: [
      {
        key: "executive",
        name: "Resumen ejecutivo",
        desc: "Ventas, deuda, inventario y alertas en una página",
        params: "day",
        file: "resumen-ejecutivo.pdf",
      },
      {
        key: "movements",
        name: "Resumen de movimientos",
        desc: "Entradas, salidas, ajustes y ventas POS en un rango",
        params: "range",
        file: "movimientos.pdf",
      },
    ],
  },
  {
    title: "Ventas",
    items: [
      {
        key: "sales-daily",
        name: "Ventas del día",
        desc: "Detalle POS por hora y totales",
        params: "day",
        file: "ventas-dia.pdf",
      },
      {
        key: "sales-monthly",
        name: "Ventas del mes",
        desc: "Total mensual y desglose por día",
        params: "month",
        file: "ventas-mes.pdf",
      },
      {
        key: "top-products",
        name: "Productos más vendidos",
        desc: "Ranking por unidades e ingresos estimados",
        params: "range",
        file: "productos-top.pdf",
      },
    ],
  },
  {
    title: "Créditos y clientes",
    items: [
      {
        key: "debtors",
        name: "Clientes deudores",
        desc: "Saldos pendientes de cobro",
        params: "none",
        file: "clientes-deudores.pdf",
      },
      {
        key: "overdue",
        name: "Fiados vencidos",
        desc: "Prioridad de cobranza",
        params: "none",
        file: "fiados-vencidos.pdf",
      },
    ],
  },
  {
    title: "Inventario",
    items: [
      {
        key: "low-stock",
        name: "Stock bajo",
        desc: "Productos en mínimo o agotados",
        params: "none",
        file: "stock-bajo.pdf",
      },
      {
        key: "inventory",
        name: "Inventario valorizado",
        desc: "Valor por contexto y top productos",
        params: "none",
        file: "inventario-valorizado.pdf",
      },
    ],
  },
];

export default function ReportsPage() {
  const { token } = useAuth();
  const [day, setDay] = useState(() => clientLocalDate());
  const [from, setFrom] = useState(monthStartIso);
  const [to, setTo] = useState(() => clientLocalDate());
  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth() + 1);
  const [busyKey, setBusyKey] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const flatCount = useMemo(() => SECTIONS.reduce((n, s) => n + s.items.length, 0), []);

  async function download(item) {
    setBusyKey(item.key);
    setError("");
    setOk("");
    try {
      const params = {};
      if (item.params === "day") params.day = day;
      if (item.params === "range") {
        params.from = from;
        params.to = to;
      }
      if (item.params === "month") {
        params.year = year;
        params.month = month;
      }
      const blob = await api.downloadReportPdf(token, item.key, params);
      await saveBlob(blob, item.file);
      setOk(`PDF generado: ${item.name}`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusyKey("");
    }
  }

  return (
    <div className="page reports-page">
      <PageHeader
        kicker="Análisis"
        title="Reportes PDF"
        subtitle={`${flatCount} informes listos para imprimir o compartir`}
      />

      <Panel className="glass-panel report-filters-panel">
        <p className="report-filters-title">Parámetros</p>
        <div className="report-filters-grid">
          <label className="form-field">
            <span>Día (ventas / ejecutivo)</span>
            <input type="date" value={day} onChange={(e) => setDay(e.target.value)} />
          </label>
          <label className="form-field">
            <span>Desde</span>
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="form-field">
            <span>Hasta</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
          <label className="form-field">
            <span>Año (ventas mes)</span>
            <input
              type="number"
              min={2020}
              max={2100}
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
            />
          </label>
          <label className="form-field">
            <span>Mes</span>
            <input
              type="number"
              min={1}
              max={12}
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
            />
          </label>
        </div>
      </Panel>

      {error && <Alert type="error">{error}</Alert>}
      {ok && <Alert type="success">{ok}</Alert>}

      {SECTIONS.map((section) => (
        <section key={section.title} className="dash-section">
          <h2 className="report-section-title">{section.title}</h2>
          <div className="report-card-grid">
            {section.items.map((item) => (
              <article key={item.key} className="report-card glass-panel">
                <h3>{item.name}</h3>
                <p>{item.desc}</p>
                <button
                  type="button"
                  className="btn-primary btn-sm"
                  disabled={busyKey === item.key}
                  onClick={() => download(item)}
                >
                  {busyKey === item.key ? "Generando…" : "Descargar PDF"}
                </button>
              </article>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
