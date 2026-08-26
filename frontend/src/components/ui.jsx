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
    <section className={`panel ${className}`}>
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

export function KpiCard({ label, value, hint, tone = "default", icon }) {
  return (
    <article className={`kpi kpi-${tone}`}>
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
