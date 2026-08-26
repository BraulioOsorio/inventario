import { useEffect, useState } from "react";
import { api } from "../api";
import { useAuth } from "../auth";

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
      setOk("Categoría creada.");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="kicker">Clasificación</p>
          <h1>Categorías</h1>
          <p className="sub">Organiza el catálogo para tienda, papelería o uso personal.</p>
        </div>
      </header>

      {(error || ok) && <div className={`alert ${error ? "error" : "success"}`}>{error || ok}</div>}

      <div className="split-2">
        <form className="panel form-panel" onSubmit={onSubmit}>
          <h2>Nueva categoría</h2>
          <label>Nombre<input required value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label>Descripción<textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
          <button className="btn-primary">Crear categoría</button>
        </form>

        <section className="panel">
          <div className="panel-head"><h2>Listado</h2></div>
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
