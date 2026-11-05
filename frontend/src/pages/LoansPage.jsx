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
  const [summary, setSummary] = useState({ active_count: 0, total_debt: 0, overdue_count: 0 });
  const [statusFilter, setStatusFilter] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const debouncedSearch = useDebouncedValue(clientSearch);
  const [listPage, setListPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [linesPage, setLinesPage] = useState(1);
  const [paymentsPage, setPaymentsPage] = useState(1);
  const [payOpen, setPayOpen] = useState(false);
  const [editPayOpen, setEditPayOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [payForm, setPayForm] = useState({ amount: "", notes: "", payment_method_id: "" });
  const [editPayForm, setEditPayForm] = useState({ amount: "", notes: "", payment_method_id: "" });
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [detailNotes, setDetailNotes] = useState("");
  const [detailDueDate, setDetailDueDate] = useState("");
  const [savingMeta, setSavingMeta] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [data, sum] = await Promise.all([
        api.listCreditAccounts(token, { status: statusFilter || undefined }),
        api.creditAccountsSummary(token),
      ]);
      setAccounts(data);
      setSummary(sum || { active_count: 0, total_debt: 0, overdue_count: 0 });
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, statusFilter]);

  useEffect(() => {
    if (!token) return;
    api
      .listPaymentMethods(token)
      .then(setPaymentMethods)
      .catch(() => setPaymentMethods([]));
  }, [token]);

  const defaultPaymentMethodId = useMemo(() => {
    const efectivo = paymentMethods.find((m) => m.name === "Efectivo");
    return efectivo?.id || paymentMethods[0]?.id || "";
  }, [paymentMethods]);

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
        setDetailNotes(data.notes || "");
        setDetailDueDate(data.due_date ? data.due_date.slice(0, 10) : "");
        setLinesPage(1);
        setPaymentsPage(1);
      })
      .catch((err) => setError(err.message))
      .finally(() => setBusy(false));
  }, [selectedId, token]);

  const kpis = useMemo(
    () => ({
      active: summary.active_count ?? 0,
      debt: summary.total_debt ?? 0,
      overdue: summary.overdue_count ?? 0,
    }),
    [summary]
  );

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
    setPayForm({
      amount: String(account.balance_due || ""),
      notes: "",
      payment_method_id: defaultPaymentMethodId,
    });
    setPayOpen(true);
  }

  function openEditPayment(payment) {
    setEditingPayment(payment);
    setEditPayForm({
      amount: String(payment.amount ?? ""),
      notes: payment.notes || "",
      payment_method_id: payment.payment_method_id || defaultPaymentMethodId,
    });
    setEditPayOpen(true);
  }

  async function saveAccountMeta(e) {
    e.preventDefault();
    if (!detail) return;
    setSavingMeta(true);
    setError("");
    try {
      const updated = await api.updateCreditAccount(token, detail.id, {
        notes: detailNotes.trim() || null,
        due_date: detailDueDate ? new Date(detailDueDate).toISOString() : null,
      });
      setDetail(updated);
      setDetailNotes(updated.notes || "");
      setOk("Notas y fecha límite actualizadas.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSavingMeta(false);
    }
  }

  async function submitEditPay(e) {
    e.preventDefault();
    if (!detail || !editingPayment) return;
    setBusy(true);
    setError("");
    try {
      const updated = await api.updateCreditPayment(token, detail.id, editingPayment.id, {
        amount: Number(editPayForm.amount),
        payment_method_id: editPayForm.payment_method_id,
        notes: editPayForm.notes.trim() || null,
      });
      setOk("Abono actualizado.");
      setEditPayOpen(false);
      setEditingPayment(null);
      setDetail(updated);
      setDetailNotes(updated.notes || "");
      setSelectedId(updated.id);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitPay(e) {
    e.preventDefault();
    if (!detail) return;
    setBusy(true);
    setError("");
    try {
      const updated = await api.payCredit(token, detail.id, {
        amount: Number(payForm.amount),
        payment_method_id: payForm.payment_method_id,
        notes: payForm.notes.trim() || null,
      });
      setOk("Abono registrado correctamente.");
      setPayOpen(false);
      setDetail(updated);
      setDetailNotes(updated.notes || "");
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
            <option value="">Todas</option>
            <option value="activo">Activas (con deuda)</option>
            <option value="saldado">Saldadas</option>
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

              <form className="credit-meta-form glass-form" onSubmit={saveAccountMeta}>
                <h3 className="h3-panel">Notas de la cuenta</h3>
                <p className="muted tiny credit-meta-hint">
                  Incluye la nota del punto de venta al fiar. Puedes editarla aquí.
                </p>
                <FormRow cols={2}>
                  <FormField label="Nota / observaciones">
                    <textarea
                      rows={3}
                      value={detailNotes}
                      onChange={(e) => setDetailNotes(e.target.value)}
                      placeholder="Ej. Paga quincenalmente, deja mercancía en local…"
                    />
                  </FormField>
                  <FormField label="Fecha límite">
                    <input
                      type="date"
                      value={detailDueDate}
                      onChange={(e) => setDetailDueDate(e.target.value)}
                    />
                  </FormField>
                </FormRow>
                <div className="form-actions-inline">
                  <button type="submit" className="btn-secondary btn-sm" disabled={savingMeta}>
                    {savingMeta ? "Guardando…" : "Guardar nota y fecha"}
                  </button>
                </div>
              </form>

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
                  <div className="table-wrap credit-payments-table-wrap">
                    <table className="table-erp">
                      <thead>
                        <tr>
                          <th>Monto</th>
                          <th>Forma de pago</th>
                          <th>Fecha</th>
                          <th>Nota</th>
                          <th className="cell-actions-menu"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {pagedPayments.map((p) => (
                          <tr key={p.id}>
                            <td>
                              <strong>{fmt(p.amount)}</strong>
                            </td>
                            <td>{p.payment_method_name || "Sin asignar"}</td>
                            <td>{new Date(p.created_at).toLocaleString("es-CO")}</td>
                            <td className="muted">{p.notes || "—"}</td>
                            <td className="cell-actions-menu">
                              <TableRowMenu
                                label={`Opciones del abono ${fmt(p.amount)}`}
                                items={[
                                  {
                                    id: "edit",
                                    label: "Editar abono",
                                    icon: RowMenuIcons.edit,
                                    primary: true,
                                    onClick: () => openEditPayment(p),
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
              <FormField label="Forma de pago" required>
                <select
                  required
                  value={payForm.payment_method_id}
                  onChange={(e) => setPayForm({ ...payForm, payment_method_id: e.target.value })}
                >
                  {!paymentMethods.length && <option value="">Cargando…</option>}
                  {paymentMethods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </FormField>
            </FormRow>
            <FormField label="Nota del abono">
              <input
                value={payForm.notes}
                onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                placeholder="Opcional: referencia, comprobante…"
              />
            </FormField>
          </div>
          <FormActions>
            <button type="button" className="btn-secondary" onClick={() => setPayOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={busy || !payForm.payment_method_id}>
              {busy ? "Guardando…" : "Confirmar abono"}
            </button>
          </FormActions>
        </FormCard>
      </Modal>

      <Modal
        open={editPayOpen}
        title="Editar abono"
        subtitle={detail ? detail.customer_name : ""}
        onClose={() => {
          setEditPayOpen(false);
          setEditingPayment(null);
        }}
      >
        <FormCard onSubmit={submitEditPay} bare className="glass-form modal-form">
          <div className="form-card-body">
            <FormRow cols={2}>
              <FormField label="Monto del abono" required>
                <input
                  type="number"
                  min="1"
                  required
                  value={editPayForm.amount}
                  onChange={(e) => setEditPayForm({ ...editPayForm, amount: e.target.value })}
                />
              </FormField>
              <FormField label="Forma de pago" required>
                <select
                  required
                  value={editPayForm.payment_method_id}
                  onChange={(e) => setEditPayForm({ ...editPayForm, payment_method_id: e.target.value })}
                >
                  {!paymentMethods.length && <option value="">Cargando…</option>}
                  {paymentMethods.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </FormField>
            </FormRow>
            <FormField label="Nota del abono">
              <input
                value={editPayForm.notes}
                onChange={(e) => setEditPayForm({ ...editPayForm, notes: e.target.value })}
                placeholder="Opcional: referencia, comprobante…"
              />
            </FormField>
          </div>
          <FormActions>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => {
                setEditPayOpen(false);
                setEditingPayment(null);
              }}
            >
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={busy || !editPayForm.payment_method_id}>
              {busy ? "Guardando…" : "Guardar cambios"}
            </button>
          </FormActions>
        </FormCard>
      </Modal>
    </div>
  );
}
