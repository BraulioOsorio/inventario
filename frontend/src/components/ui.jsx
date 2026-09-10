import { useEffect, useRef, useState } from "react";

export const RowMenuIcons = {
  edit: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
    </svg>
  ),
  trash: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
    </svg>
  ),
  power: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 2v10M18.36 6.64a9 9 0 1 1-12.73 0" />
    </svg>
  ),
  check: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  return: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M3 10h13a4 4 0 0 1 0 8H9M3 10l4-4M3 10l4 4" />
    </svg>
  ),
  restock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M12 5v14M5 12h14" />
    </svg>
  ),
  external: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
      <path d="M14 3h7v7M10 14 21 3M21 14v7h-7M3 10V3h7" />
    </svg>
  ),
};

export function TableRowMenu({ items, label = "Opciones de fila" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const visible = items.filter((item) => !item.hidden);

  useEffect(() => {
    if (!open) return undefined;
    function handleClickOutside(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (!visible.length) return null;

  return (
    <div className="table-row-menu" ref={ref}>
      <button
        type="button"
        className="row-menu-trigger"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={label}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden>
          <circle cx="12" cy="5" r="1.75" />
          <circle cx="12" cy="12" r="1.75" />
          <circle cx="12" cy="19" r="1.75" />
        </svg>
      </button>
      {open && (
        <div className="row-menu-popover" role="menu">
          {visible.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className={`row-menu-item ${item.danger ? "danger" : ""} ${item.primary ? "primary" : ""}`}
              onClick={() => {
                setOpen(false);
                item.onClick?.();
              }}
              disabled={item.disabled}
              title={item.title || item.label}
            >
              {item.icon && <span className="row-menu-icon">{item.icon}</span>}
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
