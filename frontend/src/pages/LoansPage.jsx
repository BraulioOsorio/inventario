import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { useDebouncedValue } from "../hooks/useDebouncedValue";
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

const LIST_PAGE_SIZE = 10;
const DETAIL_PAGE_SIZE = 10;

function TablePagination({ page, totalPages, total, label, onPrev, onNext, disabled }) {
  if (total <= 0) return null;
  return (
    <div className="table-pagination">
      <span className="muted table-pagination-meta">
        Página {page} de {totalPages} · {total} {label}
      </span>
      <div className="table-pagination-actions">
        <button type="button" className="btn-ghost btn-sm" disabled={disabled || page <= 1} onClick={onPrev}>
          Anterior
        </button>
        <button type="button" className="btn-ghost btn-sm" disabled={disabled || page >= totalPages} onClick={onNext}>
          Siguiente
        </button>
      </div>
    </div>
  );
}

export default function LoansPage() {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [statusFilter, setStatusFilter] = useState("activo");
  const [clientSearch, setClientSearch] = useState("");
  const debouncedSearch = useDebouncedValue(clientSearch);
  const [listPage, setListPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [linesPage, setLinesPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
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

  useEffect(() => {
    setListPage(1);
  }, [debouncedSearch, statusFilter]);

  useEffect(() => {
    if (!selectedId || !token) {
      setDetail(null);
      return;
    }
    setBusy(true);
    api
      .getCreditAccount(token, selectedId)
      .then((data) => {
        setDetail(data);
        setLinesPage(1);
        setPaymentsPage(1);
      })
      .catch((err) => setError(err.message))
      .finally(() => setBusy(false));
  }, [selectedId, token]);

  const kpis = useMemo(() => {
    const active = accounts.filter((a) => a.status === "activo");
    const debt = active.reduce((s, a) => s + Number(a.balance_due || 0), 0);
    const overdue = active.filter((a) => a.is_overdue).length;
    return { active: active.length, debt, overdue };
  }, [accounts]);

  const filteredAccounts = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (q.length < 3) return accounts;
    return accounts.filter((a) => {
      const name = (a.customer_name || "").toLowerCase();
      const phone = (a.customer_phone || "").toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  }, [accounts, debouncedSearch]);

  const listTotalPages = Math.max(1, Math.ceil(filteredAccounts.length / LIST_PAGE_SIZE));
  const pagedAccounts = filteredAccounts.slice(
    (listPage - 1) * LIST_PAGE_SIZE,
    listPage * LIST_PAGE_SIZE
  );

  const lines = detail?.lines || [];
  const payments = detail?.payments || [];
  const linesTotalPages = Math.max(1, Math.ceil(lines.length / DETAIL_PAGE_SIZE));
  const paymentsTotalPages = Math.max(1, Math.ceil(payments.length / DETAIL_PAGE_SIZE));
  const pagedLines = lines.slice((linesPage - 1) * DETAIL_PAGE_SIZE, linesPage * DETAIL_PAGE_SIZE);
  const pagedPayments = payments.slice(
    (paymentsPage - 1) * DETAIL_PAGE_SIZE,
    paymentsPage * DETAIL_PAGE_SIZE
  );

  function selectAccount(id) {
    setSelectedId(id);
    setOk("");
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
      const updated = await api.payCredit(token, detail.id, {
        amount: Number(payForm.amount),
        notes: payForm.notes.trim() || null,
      });
      setOk("Abono registrado correctamente.");
      setPayOpen(false);
      setDetail(updated);
      setSelectedId(updated.id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page page-module page-credits">
      <PageHeader
        kicker="Operaciones"
        title="Créditos de clientes"
        subtitle="Consulta deudas, productos fiados y abonos. Registra ventas a crédito desde Operaciones → Crédito."
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
        <FormField label="Buscar cliente" className="toolbar-field grow">
          <input
            placeholder="Nombre o teléfono (mín. 3 letras)"
            value={clientSearch}
            onChange={(e) => setClientSearch(e.target.value)}
          />
        </FormField>
        <div className="toolbar-actions">
          <Link to="/movimientos?mode=credit" className="btn-primary btn-sm">
            + Nueva venta a crédito
          </Link>
        </div>
      </DataToolbar>

      <div className="credit-layout">
        <Panel
          title="Cuentas de crédito"
          className="table-panel glass-panel credit-list-panel"
          action={<span className="badge">{filteredAccounts.length} cuentas</span>}
        >
          {filteredAccounts.length ? (
            <>
              <div className="table-wrap">
                <table className="table-erp">
                  <thead>
                    <tr>
                      <th>Cliente</th>
                      <th>Resumen</th>
                      <th>Debe</th>
                      <th>Límite</th>
                      <th className="cell-actions-menu"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedAccounts.map((a) => (
                      <tr
                        key={a.id}
                        className={`${a.is_overdue ? "row-warn" : ""} ${selectedId === a.id ? "row-selected" : ""}`}
                        onClick={() => selectAccount(a.id)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => e.key === "Enter" && selectAccount(a.id)}
                      >
                        <td>
                          <strong>{a.customer_name}</strong>
                          {a.customer_phone && <div className="muted tiny contact-meta">{a.customer_phone}</div>}
                        </td>
                        <td className="muted">{a.items_summary || `${a.lines_count} movimientos`}</td>
                        <td>
                          <strong>{fmt(a.balance_due)}</strong>
                          <div>
                            <span className={`badge ${a.status === "activo" ? "active-state" : "inactive"}`}>
                              {a.status === "activo" ? "Activa" : "Saldada"}
                            </span>
                          </div>
                        </td>
                        <td>{a.due_date ? new Date(a.due_date).toLocaleDateString("es-CO") : "—"}</td>
                        <td className="cell-actions-menu" onClick={(e) => e.stopPropagation()}>
                          <TableRowMenu
                            label={`Opciones de ${a.customer_name}`}
                            items={[
                              {
                                id: "detail",
                                label: "Ver detalle",
                                icon: RowMenuIcons.external,
                                onClick: () => selectAccount(a.id),
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
              <TablePagination
                page={listPage}
                totalPages={listTotalPages}
                total={filteredAccounts.length}
                label="cuentas"
                disabled={busy}
                onPrev={() => setListPage((p) => Math.max(1, p - 1))}
                onNext={() => setListPage((p) => Math.min(listTotalPages, p + 1))}
              />
            </>
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

        <Panel
          title={detail ? `Detalle · ${detail.customer_name}` : "Detalle de la cuenta"}
          className="glass-panel credit-detail-panel"
          action={
            detail ? (
              <span className="badge soft">Saldo {fmt(detail.balance_due)}</span>
            ) : (
              <span className="muted tiny">Selecciona una fila</span>
            )
          }
        >
          {!detail && (
            <EmptyState
              title="Sin cuenta seleccionada"
              text="Haz clic en un cliente de la tabla para ver productos fiados y abonos en esta misma pantalla."
            />
          )}

          {detail && (
            <div className="credit-detail">
              <div className="credit-detail-head">
                <div>
                  <p className="muted tiny">
                    {detail.customer_phone ? `Tel. ${detail.customer_phone}` : "Sin teléfono"}
                    {detail.due_date
                      ? ` · Límite ${new Date(detail.due_date).toLocaleDateString("es-CO")}`
                      : " · Sin fecha límite"}
                  </p>
                  {detail.is_overdue && <span className="pill out">Cuenta vencida</span>}
                </div>
                {detail.status === "activo" && Number(detail.balance_due) > 0 && (
                  <button type="button" className="btn-primary btn-sm" onClick={() => openPay(detail)}>
                    Registrar abono
                  </button>
                )}
              </div>

              <h3 className="h3-panel">Productos fiados</h3>
              {lines.length ? (
                <>
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
                        {pagedLines.map((line) => (
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
                  <TablePagination
                    page={linesPage}
                    totalPages={linesTotalPages}
                    total={lines.length}
                    label="productos"
                    disabled={busy}
                    onPrev={() => setLinesPage((p) => Math.max(1, p - 1))}
                    onNext={() => setLinesPage((p) => Math.min(linesTotalPages, p + 1))}
                  />
                </>
              ) : (
                <p className="muted">Aún no hay productos fiados en esta cuenta.</p>
              )}

              <h3 className="h3-panel">Abonos</h3>
              {payments.length ? (
                <>
                  <ul className="alert-preview-list credit-payments-list">
                    {pagedPayments.map((p) => (
                      <li key={p.id} className="alert-preview-item">
                        <strong>{fmt(p.amount)}</strong>
                        <span className="muted tiny">
                          {new Date(p.created_at).toLocaleString("es-CO")}
                          {p.notes ? ` · ${p.notes}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <TablePagination
                    page={paymentsPage}
                    totalPages={paymentsTotalPages}
                    total={payments.length}
                    label="abonos"
                    disabled={busy}
                    onPrev={() => setPaymentsPage((p) => Math.max(1, p - 1))}
                    onNext={() => setPaymentsPage((p) => Math.min(paymentsTotalPages, p + 1))}
                  />
                </>
              ) : (
                <p className="muted">No hay abonos registrados.</p>
              )}
            </div>
          )}
        </Panel>
      </div>

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
