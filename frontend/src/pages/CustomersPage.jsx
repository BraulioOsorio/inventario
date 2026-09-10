import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { searchQuery, useDebouncedValue } from "../hooks/useDebouncedValue";
import {
  Alert,
  DataToolbar,
  FormActions,
  FormCard,
  FormField,
  FormRow,
  Modal,
  PageHeader,
  RowMenuIcons,
  TableRowMenu,
} from "../components/ui";

const emptyCustomer = {
  full_name: "",
  document_id: "",
  email: "",
  phone: "",
  address: "",
  notes: "",
};

export default function CustomersPage() {
  const { token } = useAuth();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyCustomer);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);
  const debouncedSearch = useDebouncedValue(search);

  async function load() {
    try {
      const list = await api.listCustomers(token, { q: searchQuery(debouncedSearch) });
      setCustomers(list);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, debouncedSearch]);

  function openCreate() {
    setForm(emptyCustomer);
    setEditingId(null);
    setOpenModal(true);
  }

  function openEdit(customer) {
    setForm({
      full_name: customer.full_name || "",
      document_id: customer.document_id || "",
      email: customer.email || "",
      phone: customer.phone || "",
      address: customer.address || "",
      notes: customer.notes || "",
    });
    setEditingId(customer.id);
    setOpenModal(true);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setOk("");

    try {
      if (editingId) {
        await api.updateCustomer(token, editingId, form);
        setOk("Cliente actualizado correctamente.");
      } else {
        await api.createCustomer(token, form);
        setOk("Cliente registrado correctamente.");
      }
      setOpenModal(false);
      setForm(emptyCustomer);
      setEditingId(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id) {
    if (!confirm("¿Deseas eliminar este cliente?")) return;
    try {
      await api.deleteCustomer(token, id);
      setOk("Cliente eliminado.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function closeModal() {
    setOpenModal(false);
    setEditingId(null);
    setForm(emptyCustomer);
  }

  return (
    <div className="page page-module">
      <PageHeader
        kicker="Directorio"
        title="Gestión de clientes"
        subtitle="Administra contactos, documentos y datos de clientes para préstamos y ventas."
      />

      {error && <Alert type="error">{error}</Alert>}
      {ok && <Alert type="success">{ok}</Alert>}

      <DataToolbar
        actions={
          <button type="button" className="btn-primary btn-sm" onClick={openCreate}>
            + Nuevo cliente
          </button>
        }
      >
        <FormField label="Buscar cliente" className="toolbar-field grow" hint="Escribe al menos 3 letras">
          <input
            placeholder="Buscar por nombre, documento, teléfono o correo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </FormField>
      </DataToolbar>

      <section className="panel table-panel panel-elevated glass-panel">
        <div className="panel-head">
          <h2>Listado de clientes</h2>
          <span className="badge">{customers.length} registrados</span>
        </div>
        <div className="table-wrap">
          <table className="table-erp">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Documento / NIT</th>
                <th>Teléfono</th>
                <th>Correo</th>
                <th>Dirección</th>
                <th>Notas</th>
                <th className="cell-actions-menu"></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td><strong>{c.full_name}</strong></td>
                  <td><code>{c.document_id || "—"}</code></td>
                  <td>{c.phone || "—"}</td>
                  <td>{c.email || "—"}</td>
                  <td>{c.address || "—"}</td>
                  <td className="muted" style={{ maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {c.notes || "—"}
                  </td>
                  <td className="cell-actions-menu">
                    <TableRowMenu
                      label={`Opciones de ${c.full_name}`}
                      items={[
                        { id: "edit", label: "Editar", icon: RowMenuIcons.edit, onClick: () => openEdit(c) },
                        { id: "delete", label: "Eliminar", icon: RowMenuIcons.trash, danger: true, onClick: () => onDelete(c.id) },
                      ]}
                    />
                  </td>
                </tr>
              ))}
              {!customers.length && (
                <tr>
                  <td colSpan={7} className="muted cell-empty">
                    No hay clientes registrados. Adiciona el primero con el botón "+ Nuevo cliente".
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
        title={editingId ? "Editar cliente" : "Registrar nuevo cliente"}
        subtitle="Ingresa la información básica y de contacto del cliente."
      >
        <FormCard onSubmit={onSubmit} bare className="modal-form">
          <div className="form-card-body">
            <FormRow cols={2}>
              <FormField label="Nombre completo" required>
                <input
                  required
                  value={form.full_name}
                  onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                  placeholder="Ej. Laura Gómez"
                />
              </FormField>
              <FormField label="Documento / Cédula / NIT">
                <input
                  value={form.document_id}
                  onChange={(e) => setForm({ ...form, document_id: e.target.value })}
                  placeholder="Ej. 1098765432"
                />
              </FormField>
            </FormRow>

            <FormRow cols={2}>
              <FormField label="Teléfono de contacto">
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="Ej. 310 123 4567"
                />
              </FormField>
              <FormField label="Correo electrónico">
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="cliente@correo.com"
                />
              </FormField>
            </FormRow>

            <FormField label="Dirección">
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Ej. Calle 45 # 12-34"
              />
            </FormField>

            <FormField label="Notas o referencias adicionales">
              <textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Observaciones sobre el cliente…"
              />
            </FormField>
          </div>

          <FormActions>
            <button type="button" className="btn-secondary" onClick={closeModal}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? "Guardando…" : editingId ? "Actualizar cliente" : "Crear cliente"}
            </button>
          </FormActions>
        </FormCard>
      </Modal>
    </div>
  );
}
