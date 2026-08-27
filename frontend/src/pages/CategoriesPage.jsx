import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";
import { Alert, FormActions, FormCard, FormField, PageHeader } from "../components/ui";

export default function CategoriesPage() {
  const { token } = useAuth();
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function load() {
    setCategories(await api.listCategories(token));
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [token]);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    setOk("");
    try {
      await api.createCategory(token, { name, description: description || null });
      setName("");
      setDescription("");
      setOk("Categoría creada correctamente.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page page-module">
      <PageHeader
        kicker="Clasificación"
        title="Categorías"
        subtitle="Organiza el catálogo para tienda, papelería o uso personal."
      />

      {error && <Alert type="error">{error}</Alert>}
      {ok && <Alert type="success">{ok}</Alert>}

      <div className="module-split">
        <FormCard
          title="Nueva categoría"
          subtitle="Agrupa productos relacionados para facilitar la búsqueda."
          onSubmit={onSubmit}
          className="form-narrow"
        >
          <FormField label="Nombre" required>
            <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej. Papelería escolar" />
          </FormField>
          <FormField label="Descripción" hint="Opcional">
            <textarea rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Breve descripción de la categoría" />
          </FormField>
          <FormActions>
            <button type="submit" className="btn-primary">Crear categoría</button>
          </FormActions>
        </FormCard>

        <section className="panel table-panel">
          <div className="panel-head">
            <h2>Listado</h2>
            <span className="badge">{categories.length} categorías</span>
          </div>
          <ul className="plain-list dense">
            {categories.map((c) => (
              <li key={c.id}>
                <strong>{c.name}</strong>
                <span>{c.description || "Sin descripción"}</span>
              </li>
            ))}
            {!categories.length && <li className="muted">Sin categorías todavía.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
}
