import { useEffect, useMemo, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import {
  Alert,
  DataToolbar,
  FormActions,
  FormCard,
  FormField,
  FormRow,
  KpiCard,
  Modal,
  PageHeader,
  RowMenuIcons,
  TableRowMenu,
} from "../components/ui";
import { loanStatusLabel } from "../utils/labels";

const emptyLoan = {
  product_id: "",
  customer_id: "",
  borrower_name: "",
  borrower_contact: "",
  quantity: 1,
  due_date: "",
  discount_stock: true,
  notes: "",
};

export default function LoansPage() {
  const { token } = useAuth();
  const [loans, setLoans] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [openReturnModal, setOpenReturnModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [form, setForm] = useState(emptyLoan);
  const [returnForm, setReturnForm] = useState({ return_to_stock: true, notes: "" });
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const [l, p, c] = await Promise.all([
        api.listLoans(token, { status: statusFilter || undefined }),
        api.listProducts(token),
        api.listCustomers(token),
      ]);
      setLoans(l);
      setProducts(p.filter((x) => x.is_active !== false));
      setCustomers(c);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, statusFilter]);

  const kpis = useMemo(() => {
    const active = loans.filter((l) => l.status === "activo").length;
    const overdue = loans.filter((l) => l.is_overdue).length;
    const returned = loans.filter((l) => l.status === "devuelto").length;
    return { active, overdue, returned };
  }, [loans]);

  function onSelectCustomer(customerId) {
    if (!customerId) {
      setForm((prev) => ({ ...prev, customer_id: "" }));
      return;
    }
    const customer = customers.find((c) => String(c.id) === String(customerId));
    if (customer) {
      setForm((prev) => ({
        ...prev,
        customer_id: customer.id,
        borrower_name: customer.full_name,
        borrower_contact: customer.phone || customer.document_id || "",
      }));
    }
  }

  async function onSubmitCreate(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setOk("");

    try {
      await api.createLoan(token, {
        product_id: form.product_id,
        customer_id: form.customer_id || null,
        borrower_name: form.borrower_name,
        borrower_contact: form.borrower_contact || null,
        quantity: Number(form.quantity),
        due_date: form.due_date ? new Date(form.due_date).toISOString() : null,
        discount_stock: Boolean(form.discount_stock),
        notes: form.notes || null,
      });

      setOk("Préstamo registrado correctamente.");
      setOpenCreateModal(false);
      setForm(emptyLoan);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  function openReturn(loan) {
    setSelectedLoan(loan);
    setReturnForm({ return_to_stock: true, notes: "" });
    setOpenReturnModal(true);
  }

  async function onSubmitReturn(e) {
    e.preventDefault();
    if (!selectedLoan) return;
    setBusy(true);
    setError("");
    setOk("");

    try {
      await api.returnLoan(token, selectedLoan.id, returnForm);
      setOk(`Préstamo de ${selectedLoan.borrower_name} marcado como devuelto.`);
      setOpenReturnModal(false);
      setSelectedLoan(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id) {
    if (!confirm("¿Deseas eliminar este registro de préstamo?")) return;
    try {
      await api.deleteLoan(token, id);
      setOk("Registro eliminado.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page page-module">
      <PageHeader
        kicker="Control y custodia"
        title="Préstamos de inventario"
        subtitle="Administra artículos prestados, asignación a clientes y reingreso automático al stock."
      />

      {error && <Alert type="error">{error}</Alert>}
      {ok && <Alert type="success">{ok}</Alert>}

      <section className="kpi-grid">
        <KpiCard label="Préstamos activos" value={kpis.active} hint="Artículos en posesión externa" />
        <KpiCard
          label="Préstamos vencidos"
          value={kpis.overdue}
          hint="Excedieron fecha límite"
          tone={kpis.overdue ? "danger" : "normal"}
        />
        <KpiCard label="Devueltos" value={kpis.returned} hint="Reintegrados o cerrados" />
      </section>

      <DataToolbar
        actions={
          <button type="button" className="btn-primary btn-sm" onClick={() => setOpenCreateModal(true)}>
            + Nuevo préstamo
          </button>
        }
      >
        <FormField label="Filtrar por estado" className="toolbar-field">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos los préstamos</option>
            <option value="activo">En préstamo (activos)</option>
            <option value="devuelto">Devueltos</option>
            <option value="vencido">Vencidos</option>
          </select>
        </FormField>
      </DataToolbar>

      <section className="panel table-panel panel-elevated glass-panel">
        <div className="panel-head">
          <h2>Lista de préstamos</h2>
          <span className="badge">{loans.length} registros</span>
        </div>
        <div className="table-wrap">
          <table className="table-erp">
            <thead>
              <tr>
                <th>Producto</th>
                <th>Prestatario / Cliente</th>
                <th>Cantidad</th>
                <th>Fecha préstamo</th>
                <th>Fecha límite</th>
                <th>Estado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {loans.map((l) => (
                <tr key={l.id} className={l.is_overdue ? "row-warn" : ""}>
                  <td><strong>{l.product_name || "Producto"}</strong></td>
                  <td>
                    <strong>{l.borrower_name}</strong>
                    {l.borrower_contact && <div className="muted tiny contact-meta">{l.borrower_contact}</div>}
                    {l.customer_name && <span className="badge soft tiny">Cliente: {l.customer_name}</span>}
                  </td>
                  <td><strong>{l.quantity}</strong></td>
                  <td>{new Date(l.loan_date).toLocaleDateString("es-CO")}</td>
                  <td>
                    {l.due_date ? (
                      <span className={l.is_overdue ? "text-danger" : ""}>
                        {new Date(l.due_date).toLocaleDateString("es-CO")}
                        {l.is_overdue && " (Vencido)"}
                      </span>
                    ) : (
                      <span className="muted">Indefinido</span>
                    )}
                  </td>
                  <td>
                    <span className={`pill ${l.status === "devuelto" ? "in" : l.is_overdue ? "out" : "adjust"}`}>
                      {l.is_overdue ? "Vencido" : loanStatusLabel(l.status)}
                    </span>
                  </td>
                  <td className="cell-actions-menu">
                    <TableRowMenu
                      label={`Opciones del préstamo de ${l.product_name}`}
                      items={[
                        {
                          id: "return",
                          label: "Registrar devolución",
                          icon: RowMenuIcons.return,
                          primary: true,
                          hidden: l.status !== "activo",
                          onClick: () => openReturn(l),
                        },
                        { id: "delete", label: "Eliminar", icon: RowMenuIcons.trash, danger: true, onClick: () => onDelete(l.id) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
              {!loans.length && (
                <tr>
                  <td colSpan={7} className="muted cell-empty">
                    No hay préstamos registrados. Haz clic en "+ Nuevo préstamo" para empezar.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Modal nuevo préstamo */}
      <Modal
        open={openCreateModal}
        onClose={() => setOpenCreateModal(false)}
        title="Registrar nuevo préstamo"
        subtitle="Asigna un producto en custodia a un cliente o usuario."
      >
        <FormCard onSubmit={onSubmitCreate} bare className="modal-form">
          <div className="form-card-body">
            <FormField label="Producto a prestar" required>
              <select
                required
                value={form.product_id}
                onChange={(e) => setForm({ ...form, product_id: e.target.value })}
              >
                <option value="">Selecciona un producto…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id} disabled={p.quantity <= 0}>
                    {p.name} — Stock disponible: {p.quantity} {p.unit}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Cliente del directorio (opcional)">
              <select
                value={form.customer_id}
                onChange={(e) => onSelectCustomer(e.target.value)}
              >
                <option value="">Seleccionar de clientes guardados (o escribir abajo)…</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} {c.document_id ? `(${c.document_id})` : ""}
                  </option>
                ))}
              </select>
            </FormField>

            <FormRow cols={2}>
              <FormField label="Nombre de quien recibe" required>
                <input
                  required
                  value={form.borrower_name}
                  onChange={(e) => setForm({ ...form, borrower_name: e.target.value })}
                  placeholder="Ej. Juan Pérez"
                />
              </FormField>
              <FormField label="Teléfono o contacto">
                <input
                  value={form.borrower_contact}
                  onChange={(e) => setForm({ ...form, borrower_contact: e.target.value })}
                  placeholder="Ej. 300 123 4567"
                />
              </FormField>
            </FormRow>

            <FormRow cols={2}>
              <FormField label="Cantidad a prestar" required>
                <input
                  type="number"
                  min="1"
                  required
                  value={form.quantity}
                  onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                />
              </FormField>
              <FormField label="Fecha límite de devolución">
                <input
                  type="date"
                  value={form.due_date}
                  onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                />
              </FormField>
            </FormRow>

            <div style={{ background: "rgba(99, 102, 241, 0.08)", padding: "0.85rem", borderRadius: "10px", margin: "0.5rem 0" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "600", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form.discount_stock}
                  onChange={(e) => setForm({ ...form, discount_stock: e.target.checked })}
                />
                <span>Descontar del stock activo mientras esté prestado</span>
              </label>
              <small className="muted" style={{ display: "block", marginTop: "0.25rem" }}>
                Al devolver el producto se podrá reintegrar automáticamente al inventario.
              </small>
            </div>

            <FormField label="Notas o condiciones del préstamo">
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Observaciones de entrega, estado físico del artículo…"
              />
            </FormField>
          </div>

          <FormActions>
            <button type="button" className="btn-secondary" onClick={() => setOpenCreateModal(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? "Registrando…" : "Registrar préstamo"}
            </button>
          </FormActions>
        </FormCard>
      </Modal>

      {/* Modal registrar devolución */}
      <Modal
        open={openReturnModal}
        onClose={() => setOpenReturnModal(false)}
        title="Registrar devolución de préstamo"
        subtitle={`Confirmar devolución de ${selectedLoan?.quantity} und de ${selectedLoan?.product_name || "ítem"}`}
      >
        <FormCard onSubmit={onSubmitReturn} bare className="modal-form">
          <div className="form-card-body">
            <p>
              Prestatario: <strong>{selectedLoan?.borrower_name}</strong>
            </p>

            <div style={{ background: "rgba(34, 197, 94, 0.1)", padding: "1rem", borderRadius: "10px", margin: "1rem 0" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "600", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={returnForm.return_to_stock}
                  onChange={(e) => setReturnForm({ ...returnForm, return_to_stock: e.target.checked })}
                />
                <span>Reintegrar las {selectedLoan?.quantity} unidades al stock del producto</span>
              </label>
            </div>

            <FormField label="Notas de devolución (opcional)">
              <input
                value={returnForm.notes}
                onChange={(e) => setReturnForm({ ...returnForm, notes: e.target.value })}
                placeholder="Ej. Entregado en perfecto estado"
              />
            </FormField>
          </div>

          <FormActions>
            <button type="button" className="btn-secondary" onClick={() => setOpenReturnModal(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? "Procesando…" : "Confirmar devolución"}
            </button>
          </FormActions>
        </FormCard>
      </Modal>
    </div>
  );
}
