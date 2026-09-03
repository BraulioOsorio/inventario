export function PageHeader({ kicker, title, subtitle, actions }) {
  return (
    <header className="page-head">
      <div>
        {kicker && <p className="kicker">{kicker}</p>}
        <h1>{title}</h1>
        {subtitle && <p className="sub">{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function Panel({ title, action, children, className = "" }) {
  return (
    <section className={`panel glass-panel ${className}`}>
      {(title || action) && (
        <div className="panel-head">
          {title ? <h2>{title}</h2> : <span />}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function FormCard({ title, subtitle, children, onSubmit, className = "", bare = false }) {
  return (
    <form className={`form-card ${className}`} onSubmit={onSubmit}>
      {(title || subtitle) && (
        <div className="form-card-head">
          {title && <h2>{title}</h2>}
          {subtitle && <p>{subtitle}</p>}
        </div>
      )}
      {bare ? children : <div className="form-card-body">{children}</div>}
    </form>
  );
}

export function FormSection({ title, children }) {
  return (
    <fieldset className="form-section">
      {title && <legend>{title}</legend>}
      {children}
    </fieldset>
  );
}

export function FormField({
  label,
  hint,
  required,
  children,
  className = "",
  span = 1,
}) {
  return (
    <label className={`form-field span-${span} ${className}`}>
      <span className="form-label">
        {label}
        {required && <span className="req">*</span>}
      </span>
      {children}
      {hint && <span className="form-hint">{hint}</span>}
    </label>
  );
}

export function FormRow({ cols = 2, children }) {
  return <div className={`form-row cols-${cols}`}>{children}</div>;
}

export function FormActions({ children, align = "end" }) {
  return <div className={`form-actions align-${align}`}>{children}</div>;
}

export function Toolbar({ children }) {
  return <div className="toolbar">{children}</div>;
}

export function KpiCard({ label, value, hint, tone = "default", icon }) {
  return (
    <article className={`kpi kpi-${tone} glass-panel`}>
      <div className="kpi-top">
        <span>{label}</span>
        {icon && <span className="kpi-icon" aria-hidden>{icon}</span>}
      </div>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </article>
  );
}

export function EmptyState({ title, text, action }) {
  return (
    <div className="empty">
      <strong>{title}</strong>
      <p>{text}</p>
      {action}
    </div>
  );
}

export function Alert({ type = "error", children }) {
  return <div className={`alert ${type === "error" ? "error" : "success"}`}>{children}</div>;
}

export function Modal({ open, title, subtitle, onClose, children, wide = false }) {
  if (!open) return null;
  return (
    <div className="modal-overlay" onClick={onClose} role="presentation">
      <div
        className={`modal-card ${wide ? "modal-wide" : ""}`}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
      >
        <div className="modal-head">
          <div>
            <h2 id="modal-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Cerrar">
            ×
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}

export function FormTabs({ tabs, active, onChange }) {
  return (
    <div className="form-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          className={active === tab.id ? "active" : ""}
          onClick={() => onChange(tab.id)}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

export function DataToolbar({ children, actions }) {
  return (
    <div className="data-toolbar glass-panel">
      <div className="data-toolbar-main">{children}</div>
      {actions && <div className="data-toolbar-actions">{actions}</div>}
    </div>
  );
}

export function ValuationCard({ units, value, products }) {
  const avg = products.length ? value / products.length : 0;
  return (
    <div className="valuation-card glass-panel">
      <div className="valuation-head">
        <span>Valor del inventario</span>
        <strong>${value.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</strong>
      </div>
      <div className="valuation-grid">
        <div>
          <small>Unidades</small>
          <strong>{units}</strong>
        </div>
        <div>
          <small>Productos</small>
          <strong>{products}</strong>
        </div>
        <div>
          <small>Promedio / ítem</small>
          <strong>${avg.toLocaleString("es-CO", { maximumFractionDigits: 0 })}</strong>
        </div>
      </div>
    </div>
  );
}
