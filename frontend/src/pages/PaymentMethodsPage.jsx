import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import {
  Alert,
  FormActions,
  FormCard,
  FormField,
  PageHeader,
  Panel,
  RowMenuIcons,
  TableRowMenu,
} from "../components/ui";

export default function PaymentMethodsPage() {
  const { token } = useAuth();
  const [methods, setMethods] = useState([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState("");

  async function load() {
    setMethods(await api.listPaymentMethods(token));
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [token]);

  async function onCreate(e) {
    e.preventDefault();
    setError("");
    setOk("");
    try {
      await api.createPaymentMethod(token, { name: name.trim() });
      setName("");
      setOk("Forma de pago creada.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(method) {
    setEditId(method.id);
    setEditName(method.name);
    setOk("");
    setError("");
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!editId) return;
    setError("");
    setOk("");
    try {
      await api.updatePaymentMethod(token, editId, { name: editName.trim() });
      setEditId(null);
      setEditName("");
      setOk("Nombre actualizado.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  async function removeMethod(method) {
    if (!window.confirm(`¿Eliminar la forma de pago «${method.name}»?`)) return;
    setError("");
    setOk("");
    try {
      await api.deletePaymentMethod(token, method.id);
      setOk("Forma de pago eliminada.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page page-module">
      <PageHeader
        kicker="Operaciones"
        title="Formas de pago"
        subtitle="Cada usuario administra sus propias formas de pago. Por defecto: Efectivo y Transferencia. Se eligen al registrar abonos en créditos."
      />

      {error && <Alert type="error">{error}</Alert>}
      {ok && <Alert type="success">{ok}</Alert>}

      <div className="module-split">
        <FormCard
          title="Nueva forma de pago"
          subtitle="Solo aplica a tu cuenta; no afecta a otros usuarios."
          onSubmit={onCreate}
          className="form-narrow"
        >
          <FormField label="Nombre" required>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Nequi, Daviplata, Datafono"
              maxLength={80}
            />
          </FormField>
          <FormActions>
            <button type="submit" className="btn-primary">
              Agregar
            </button>
          </FormActions>
        </FormCard>

        <Panel className="table-panel glass-panel">
          <div className="panel-head">
            <h2>Tus formas de pago</h2>
            <span className="badge">{methods.length}</span>
          </div>
          <div className="table-wrap">
            <table className="table-erp">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th className="cell-actions-menu"></th>
                </tr>
              </thead>
              <tbody>
                {methods.map((m) => (
                  <tr key={m.id}>
                    <td>
                      {editId === m.id ? (
                        <form className="inline-edit-form" onSubmit={saveEdit}>
                          <input
                            required
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            maxLength={80}
                          />
                          <button type="submit" className="btn-secondary btn-sm">
                            Guardar
                          </button>
                          <button
                            type="button"
                            className="btn-ghost btn-sm"
                            onClick={() => {
                              setEditId(null);
                              setEditName("");
                            }}
                          >
                            Cancelar
                          </button>
                        </form>
                      ) : (
                        <strong>{m.name}</strong>
                      )}
                    </td>
                    <td>
                      {m.is_default ? (
                        <span className="badge active-state">Base del sistema</span>
                      ) : (
                        <span className="badge">Personalizada</span>
                      )}
                    </td>
                    <td className="cell-actions-menu">
                      {editId !== m.id && (
                        <TableRowMenu
                          label={`Opciones de ${m.name}`}
                          items={[
                            {
                              id: "edit",
                              label: "Renombrar",
                              icon: RowMenuIcons.edit,
                              onClick: () => startEdit(m),
                            },
                            {
                              id: "delete",
                              label: "Eliminar",
                              icon: RowMenuIcons.trash,
                              danger: true,
                              hidden: m.is_default,
                              onClick: () => removeMethod(m),
                            },
                          ]}
                        />
                      )}
                    </td>
                  </tr>
                ))}
                {!methods.length && (
                  <tr>
                    <td colSpan={3} className="muted">
                      Cargando formas de pago…
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </div>
  );
}
