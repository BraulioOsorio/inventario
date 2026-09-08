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
} from "../components/ui";
import { formatMoney, orderStatusLabel } from "../utils/labels";

const emptyOrder = {
  supplier_name: "",
  supplier_contact: "",
  title: "",
  items_summary: "",
  expected_date: "",
  is_monthly_recurring: false,
  monthly_day: 15,
  estimated_total: 0,
  status: "pendiente",
  notes: "",
};

export default function OrdersPage() {
  const { token } = useAuth();
  const [orders, setOrders] = useState([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyOrder);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const list = await api.listOrders(token, {
        status: statusFilter || undefined,
        q: search || undefined,
      });
      setOrders(list);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, statusFilter]);

  const kpis = useMemo(() => {
    const total = orders.length;
    const pending = orders.filter((o) => o.status === "pendiente" || o.status === "solicitado").length;
    const dueSoon = orders.filter((o) => o.is_due_soon).length;
    const sumEstimated = orders
      .filter((o) => o.status !== "cancelado")
      .reduce((acc, o) => acc + Number(o.estimated_total || 0), 0);
    return { total, pending, dueSoon, sumEstimated };
  }, [orders]);

  function openCreate() {
    setForm(emptyOrder);
    setEditingId(null);
    setOpenModal(true);
  }

  function openEdit(order) {
    setForm({
      supplier_name: order.supplier_name || "",
      supplier_contact: order.supplier_contact || "",
      title: order.title || "",
      items_summary: order.items_summary || "",
      expected_date: order.expected_date ? order.expected_date.slice(0, 10) : "",
      is_monthly_recurring: Boolean(order.is_monthly_recurring),
      monthly_day: order.monthly_day || 15,
      estimated_total: order.estimated_total || 0,
      status: order.status || "pendiente",
      notes: order.notes || "",
    });
    setEditingId(order.id);
    setOpenModal(true);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setOk("");

    try {
      const payload = {
        ...form,
        monthly_day: form.is_monthly_recurring ? Number(form.monthly_day) : null,
        expected_date: !form.is_monthly_recurring && form.expected_date ? new Date(form.expected_date).toISOString() : null,
        estimated_total: Number(form.estimated_total || 0),
      };

      if (editingId) {
        await api.updateOrder(token, editingId, payload);
        setOk("Pedido actualizado exitosamente.");
      } else {
        await api.createOrder(token, payload);
        setOk("Pedido a proveedor registrado correctamente.");
      }
      setOpenModal(false);
      setForm(emptyOrder);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onMarkReceived(id) {
    if (!confirm("¿Marcar este pedido como recibido?")) return;
    try {
      await api.updateOrder(token, id, { status: "recibido" });
      setOk("Pedido marcado como recibido.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function onDelete(id) {
    if (!confirm("¿Deseas eliminar este pedido?")) return;
    try {
      await api.deleteOrder(token, id);
      setOk("Pedido eliminado.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function closeModal() {
    setOpenModal(false);
    setEditingId(null);
    setForm(emptyOrder);
  }

  return (
    <div className="page page-module">
      <PageHeader
        kicker="Compras y suministros"
        title="Pedidos a proveedores"
        subtitle="Organiza tus pedidos recurrentes mensuales y compras con avisos automáticos una semana antes."
      />

      {error && <Alert type="error">{error}</Alert>}
      {ok && <Alert type="success">{ok}</Alert>}

      <section className="kpi-grid">
        <KpiCard label="Total pedidos" value={kpis.total} hint="En sistema" />
        <KpiCard label="Pendientes" value={kpis.pending} hint="Por realizar o entregar" tone="warn" />
        <KpiCard
          label="Próximos esta semana"
          value={kpis.dueSoon}
          hint="Avisados en campanita"
          tone={kpis.dueSoon ? "warn" : "normal"}
        />
        <KpiCard label="Inversión proyectada" value={formatMoney(kpis.sumEstimated)} hint="Presupuesto de compras" />
      </section>

      <DataToolbar
        actions={
          <button type="button" className="btn-primary btn-sm" onClick={openCreate}>
            + Nuevo pedido
          </button>
        }
      >
        <FormField label="Estado" className="toolbar-field">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="pendiente">Pendientes</option>
            <option value="solicitado">Solicitados</option>
            <option value="recibido">Recibidos</option>
            <option value="cancelado">Cancelados</option>
          </select>
        </FormField>
        <FormField label="Buscar pedido o proveedor" className="toolbar-field grow">
          <input
            placeholder="Buscar por proveedor, título o productos…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
          />
        </FormField>
        <button type="button" className="btn-secondary toolbar-btn" onClick={load}>
          Buscar
        </button>
      </DataToolbar>

      <section className="panel table-panel panel-elevated glass-panel">
        <div className="panel-head">
          <h2>Lista de pedidos a proveedores</h2>
          <span className="badge">{orders.length} pedidos</span>
        </div>
        <div className="table-wrap">
          <table className="table-erp">
            <thead>
              <tr>
                <th>Proveedor</th>
                <th>Concepto / Pedido</th>
                <th>Programación</th>
                <th>Total estimado</th>
                <th>Estado</th>
                <th>Aviso campanita</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => (
                <tr key={o.id} className={o.is_due_soon ? "row-warn" : ""}>
                  <td>
                    <strong>{o.supplier_name}</strong>
                    {o.supplier_contact && (
                      <div className="muted tiny">📞 {o.supplier_contact}</div>
                    )}
                  </td>
                  <td>
                    <strong>{o.title}</strong>
                    {o.items_summary && (
                      <div className="muted tiny" style={{ maxWidth: "240px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {o.items_summary}
                      </div>
                    )}
                  </td>
                  <td>
                    {o.is_monthly_recurring ? (
                      <span className="badge soft">📅 Mensual (día {o.monthly_day})</span>
                    ) : o.expected_date ? (
                      <span>{new Date(o.expected_date).toLocaleDateString("es-CO")}</span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td><strong>{formatMoney(o.estimated_total)}</strong></td>
                  <td>
                    <span className={`pill ${o.status === "recibido" ? "in" : o.status === "cancelado" ? "out" : "adjust"}`}>
                      {orderStatusLabel(o.status)}
                    </span>
                  </td>
                  <td>
                    {o.is_due_soon ? (
                      <span className="pill out" title="Notificado una semana antes de la fecha">
                        Próximo (1 semana)
                      </span>
                    ) : (
                      <span className="muted tiny">Al día</span>
                    )}
                  </td>
                  <td className="cell-actions">
                    {o.status !== "recibido" && (
                      <button
                        type="button"
                        className="btn-secondary btn-sm"
                        onClick={() => onMarkReceived(o.id)}
                        title="Marcar como recibido"
                      >
                        ✓ Recibido
                      </button>
                    )}
                    <button type="button" className="btn-secondary btn-sm" onClick={() => openEdit(o)}>
                      Editar
                    </button>
                    <button type="button" className="btn-danger-ghost btn-sm" onClick={() => onDelete(o.id)}>
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
              {!orders.length && (
                <tr>
                  <td colSpan={7} className="muted cell-empty">
                    No hay pedidos registrados. Haz clic en "+ Nuevo pedido" para programar compras a proveedores.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <Modal
        open={openModal}
        onClose={closeModal}
        title={editingId ? "Editar pedido a proveedor" : "Nuevo pedido a proveedor"}
        subtitle="Registra la compra o programa la fecha mensual para recibir alertas una semana antes."
        wide
      >
        <FormCard onSubmit={onSubmit} bare className="modal-form">
          <div className="form-card-body">
            <FormRow cols={2}>
              <FormField label="Proveedor / Empresa" required>
                <input
                  required
                  value={form.supplier_name}
                  onChange={(e) => setForm({ ...form, supplier_name: e.target.value })}
                  placeholder="Ej. Distribuidora Papelera Nacional"
                />
              </FormField>
              <FormField label="Contacto / Teléfono del proveedor">
                <input
                  value={form.supplier_contact}
                  onChange={(e) => setForm({ ...form, supplier_contact: e.target.value })}
                  placeholder="Ej. 315 987 6543 · Asesor Carlos"
                />
              </FormField>
            </FormRow>

            <FormRow cols={2}>
              <FormField label="Título o concepto del pedido" required>
                <input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ej. Surtido mensual de cuadernos y tintas"
                />
              </FormField>
              <FormField label="Total estimado ($ COP)">
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={form.estimated_total}
                  onChange={(e) => setForm({ ...form, estimated_total: e.target.value })}
                  placeholder="0"
                />
              </FormField>
            </FormRow>

            <FormField label="Detalle de productos o artículos a solicitar">
              <textarea
                rows={3}
                value={form.items_summary}
                onChange={(e) => setForm({ ...form, items_summary: e.target.value })}
                placeholder="Ej. 50 cuadernos Norma, 100 lapiceros BIC negro, 20 resmas de papel carta…"
              />
            </FormField>

            <div style={{ background: "rgba(99, 102, 241, 0.08)", padding: "1rem", borderRadius: "12px", border: "1px solid rgba(99, 102, 241, 0.2)", marginBottom: "1rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontWeight: "600", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={form.is_monthly_recurring}
                  onChange={(e) => setForm({ ...form, is_monthly_recurring: e.target.checked })}
                />
                <span>Pedido recurrente mensual (Notificar una semana antes de cada mes)</span>
              </label>

              {form.is_monthly_recurring ? (
                <div style={{ marginTop: "0.75rem" }}>
                  <FormField label="Día del mes programado (del 1 al 31)" hint="La campanita te avisará exactamente 7 días antes de este día cada mes">
                    <input
                      type="number"
                      min="1"
                      max="31"
                      required
                      value={form.monthly_day}
                      onChange={(e) => setForm({ ...form, monthly_day: e.target.value })}
                    />
                  </FormField>
                </div>
              ) : (
                <div style={{ marginTop: "0.75rem" }}>
                  <FormField label="Fecha esperada de entrega / realización" hint="La campanita te avisará 7 días antes de esta fecha">
                    <input
                      type="date"
                      value={form.expected_date}
                      onChange={(e) => setForm({ ...form, expected_date: e.target.value })}
                    />
                  </FormField>
                </div>
              )}
            </div>

            <FormRow cols={2}>
              <FormField label="Estado del pedido">
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="pendiente">Pendiente (por pedir)</option>
                  <option value="solicitado">Solicitado al proveedor</option>
                  <option value="recibido">Recibido en almacén</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </FormField>
              <FormField label="Notas adicionales">
                <input
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Condiciones de pago, transporte, etc."
                />
              </FormField>
            </FormRow>
          </div>

          <FormActions>
            <button type="button" className="btn-secondary" onClick={closeModal}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? "Guardando…" : editingId ? "Actualizar pedido" : "Registrar pedido"}
            </button>
          </FormActions>
        </FormCard>
      </Modal>
    </div>
  );
}
