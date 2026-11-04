import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import {
  Alert,
  DataToolbar,
  EmptyState,
  FormActions,
  FormCard,
  FormField,
  FormRow,
  KpiCard,
  Modal,
  PageHeader,
  Panel,
  RowMenuIcons,
  TableRowMenu,
} from "../components/ui";

const fmt = (n) =>
  Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

export default function LoansPage() {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [statusFilter, setStatusFilter] = useState("activo");
  const [detail, setDetail] = useState(null);
  const [payOpen, setPayOpen] = useState(false);
  const [payForm, setPayForm] = useState({ amount: "", notes: "" });
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const data = await api.listCreditAccounts(token, {
        status: statusFilter || undefined,
      });
      setAccounts(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, statusFilter]);

  const kpis = useMemo(() => {
    const active = accounts.filter((a) => a.status === "activo");
    const debt = active.reduce((s, a) => s + Number(a.balance_due || 0), 0);
    const overdue = active.filter((a) => a.is_overdue).length;
    return { active: active.length, debt, overdue };
  }, [accounts]);

  async function openDetail(id) {
    try {
      const data = await api.getCreditAccount(token, id);
      setDetail(data);
    } catch (err) {
      setError(err.message);
    }
  }

  function openPay(account) {
    setDetail(account);
    setPayForm({ amount: String(account.balance_due || ""), notes: "" });
    setPayOpen(true);
  }

  async function submitPay(e) {
    e.preventDefault();
    if (!detail) return;
    setBusy(true);
    setError("");
    try {
      await api.payCredit(token, detail.id, {
        amount: Number(payForm.amount),
        notes: payForm.notes.trim() || null,
      });
      setOk("Abono registrado correctamente.");
      setPayOpen(false);
      setDetail(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page page-module">
      <PageHeader
        kicker="Operaciones"
        title="Créditos de clientes"
        subtitle="Deudas acumuladas por canasta. Registra nuevas ventas a crédito desde Operaciones → Crédito."
      />

      {error && <Alert type="error">{error}</Alert>}
      {ok && <Alert type="success">{ok}</Alert>}

      <section className="dash-section kpi-grid">
        <KpiCard label="Cuentas activas" value={kpis.active} hint="Con saldo pendiente" />
        <KpiCard label="Deuda total" value={fmt(kpis.debt)} hint="Suma de cuentas activas" tone="warn" />
        <KpiCard label="Vencidas" value={kpis.overdue} hint="Pasaron fecha límite" tone={kpis.overdue ? "warn" : "normal"} />
      </section>

      <DataToolbar>
        <FormField label="Estado">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="activo">Activas (con deuda)</option>
            <option value="saldado">Saldadas</option>
            <option value="">Todas</option>
          </select>
        </FormField>
        <div className="toolbar-actions">
          <Link to="/movimientos?mode=credit" className="btn-primary btn-sm">
            + Nueva venta a crédito
          </Link>
        </div>
      </DataToolbar>

      <Panel title="Cuentas de crédito" className="table-panel glass-panel">
        {accounts.length ? (
          <div className="table-wrap">
            <table className="table-erp">
              <thead>
                <tr>
                  <th>Cliente</th>
                  <th>Productos en deuda</th>
                  <th>Debe</th>
                  <th>Límite</th>
                  <th>Estado</th>
                  <th className="cell-actions-menu"></th>
                </tr>
              </thead>
              <tbody>
                {accounts.map((a) => (
                  <tr key={a.id} className={a.is_overdue ? "row-warn" : ""}>
                    <td>
                      <strong>{a.customer_name}</strong>
                      {a.customer_phone && <div className="muted tiny contact-meta">{a.customer_phone}</div>}
                    </td>
                    <td className="muted">{a.items_summary || `${a.lines_count} movimientos`}</td>
                    <td>
                      <strong>{fmt(a.balance_due)}</strong>
                    </td>
                    <td>{a.due_date ? new Date(a.due_date).toLocaleDateString("es-CO") : "—"}</td>
                    <td>
                      <span className={`badge ${a.status === "activo" ? "active-state" : "inactive"}`}>
                        {a.status === "activo" ? "Activa" : "Saldada"}
                      </span>
                      {a.is_overdue && <span className="pill out">Vencida</span>}
                    </td>
                    <td className="cell-actions-menu">
                      <TableRowMenu
                        label={`Opciones de ${a.customer_name}`}
                        items={[
                          {
                            id: "detail",
                            label: "Ver detalle",
                            icon: RowMenuIcons.external,
                            onClick: () => openDetail(a.id),
                          },
                          {
                            id: "pay",
                            label: "Registrar abono",
                            icon: RowMenuIcons.check,
                            primary: true,
                            hidden: a.status !== "activo" || Number(a.balance_due) <= 0,
                            onClick: () => openPay(a),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Sin cuentas en este filtro"
            text="Registra crédito desde el punto de venta (pestaña Crédito) con un cliente del directorio."
            action={
              <Link className="btn-secondary" to="/movimientos?mode=credit">
                Ir a crédito en POS
              </Link>
            }
          />
        )}
      </Panel>

      <Modal
        open={Boolean(detail && !payOpen)}
        title={detail ? `Deuda · ${detail.customer_name}` : ""}
        subtitle={detail ? `Saldo pendiente ${fmt(detail.balance_due)}` : ""}
        onClose={() => setDetail(null)}
        wide
      >
        {detail && (
          <div className="credit-detail">
            <h3 className="h3-panel">Productos fiados</h3>
            <div className="table-wrap">
              <table className="table-erp">
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th>Cant.</th>
                    <th>Precio</th>
                    <th>Subtotal</th>
                    <th>Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {(detail.lines || []).map((line) => (
                    <tr key={line.id}>
                      <td>{line.product_name}</td>
                      <td>{line.quantity}</td>
                      <td>{fmt(line.unit_price)}</td>
                      <td>{fmt(line.line_total)}</td>
                      <td>{new Date(line.created_at).toLocaleDateString("es-CO")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {(detail.payments || []).length > 0 && (
              <>
                <h3 className="h3-panel">Abonos</h3>
                <ul className="alert-preview-list">
                  {detail.payments.map((p) => (
                    <li key={p.id} className="alert-preview-item">
                      <strong>{fmt(p.amount)}</strong>
                      <span className="muted tiny">
                        {new Date(p.created_at).toLocaleString("es-CO")}
                        {p.notes ? ` · ${p.notes}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {detail.status === "activo" && Number(detail.balance_due) > 0 && (
              <div className="form-actions-inline">
                <button type="button" className="btn-primary" onClick={() => openPay(detail)}>
                  Registrar abono
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal open={payOpen} title="Registrar abono" subtitle={detail ? detail.customer_name : ""} onClose={() => setPayOpen(false)}>
        <FormCard onSubmit={submitPay} bare className="glass-form modal-form">
          <div className="form-card-body">
            <FormRow cols={2}>
              <FormField label="Monto del abono" required>
                <input
                  type="number"
                  min="1"
                  required
                  value={payForm.amount}
                  onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                />
              </FormField>
              <FormField label="Nota">
                <input
                  value={payForm.notes}
                  onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                  placeholder="Ej. Pago parcial en efectivo"
                />
              </FormField>
            </FormRow>
          </div>
          <FormActions>
            <button type="button" className="btn-secondary" onClick={() => setPayOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? "Guardando…" : "Confirmar abono"}
            </button>
          </FormActions>
        </FormCard>
      </Modal>
    </div>
  );
}
