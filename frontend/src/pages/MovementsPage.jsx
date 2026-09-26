import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api";
import { useAuth } from "../auth";
import { useBusinessDay } from "../businessDay";
import { Alert, EmptyState, FormActions, FormCard, FormField, FormRow, PageHeader, Panel } from "../components/ui";
import { movementTypeLabel } from "../utils/labels";

const fmt = (n) =>
  Number(n || 0).toLocaleString("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });

const MODES = [
  { id: "pos", label: "Punto de venta", hint: "Toca productos y cobra" },
  { id: "in", label: "Entrada", hint: "Ingresar stock" },
  { id: "adjust", label: "Ajuste inventario", hint: "Salida sin cobro" },
  { id: "history", label: "Historial", hint: "Ver movimientos" },
];

function productMap(products) {
  const m = {};
  products.forEach((p) => {
    m[p.id] = p;
  });
  return m;
}

export default function MovementsPage() {
  const { token } = useAuth();
  const { canOperate, refresh: refreshBusinessDay } = useBusinessDay();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [movements, setMovements] = useState([]);
  const [mode, setMode] = useState("pos");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [received, setReceived] = useState("");
  const [inForm, setInForm] = useState({ product_id: "", quantity: 1, note: "" });
  const [adjustForm, setAdjustForm] = useState({ product_id: "", quantity: 1, note: "" });
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");
  const [busy, setBusy] = useState(false);

  const byId = useMemo(() => productMap(allProducts), [allProducts]);

  async function load() {
    const [active, catalog, m] = await Promise.all([
      api.listProducts(token, { active_only: true }),
      api.listProducts(token, { active_only: false }),
      api.listMovements(token),
    ]);
    setProducts(active);
    setAllProducts(catalog);
    setMovements(m);
  }

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [token]);

  useEffect(() => {
    const modeParam = searchParams.get("mode");
    if (modeParam && MODES.some((m) => m.id === modeParam)) {
      setMode(modeParam);
    }
  }, [searchParams]);

  useEffect(() => {
    const productId = searchParams.get("product") || "";
    const type = searchParams.get("type") || "in";
    if (productId) {
      if (type === "out") {
        const p = products.find((x) => String(x.id) === productId);
        if (p) addToCart(p);
        setMode("pos");
      } else {
        setInForm((prev) => ({ ...prev, product_id: productId }));
        setMode("in");
      }
    }
  }, [searchParams, products]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q || q.length < 3) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q))
    );
  }, [products, search]);

  const subtotal = useMemo(
    () => cart.reduce((acc, line) => acc + line.unit_price * line.quantity, 0),
    [cart]
  );
  const receivedNum = Number(received) || 0;
  const change = Math.max(0, receivedNum - subtotal);
  const canPay = cart.length > 0 && receivedNum >= subtotal && subtotal > 0;

  function addToCart(product) {
    if (Number(product.quantity) <= 0) {
      setError(`"${product.name}" está agotado.`);
      return;
    }
    setError("");
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.product_id === product.id);
      if (idx >= 0) {
        const line = prev[idx];
        if (line.quantity >= Number(product.quantity)) {
          setError(`Stock máximo alcanzado para "${product.name}".`);
          return prev;
        }
        const next = [...prev];
        next[idx] = { ...line, quantity: line.quantity + 1 };
        return next;
      }
      return [
        ...prev,
        {
          product_id: product.id,
          name: product.name,
          unit_price: Number(product.unit_price) || 0,
          quantity: 1,
          max_stock: Number(product.quantity),
        },
      ];
    });
  }

  function changeQty(productId, delta) {
    setCart((prev) =>
      prev
        .map((line) => {
          if (line.product_id !== productId) return line;
          const q = line.quantity + delta;
          if (q <= 0) return null;
          if (q > line.max_stock) {
            setError("No hay suficiente stock.");
            return line;
          }
          return { ...line, quantity: q };
        })
        .filter(Boolean)
    );
  }

  function removeLine(productId) {
    setCart((prev) => prev.filter((l) => l.product_id !== productId));
  }

  function clearCart() {
    setCart([]);
    setReceived("");
    setError("");
  }

  function setQuickAmount(amount) {
    setReceived(String(amount));
  }

  function ensureDayOpen() {
    if (!canOperate) {
      setError("Debes tener el día operativo de hoy abierto para registrar movimientos.");
      return false;
    }
    return true;
  }

  async function checkout() {
    if (!canPay || !ensureDayOpen()) return;
    setBusy(true);
    setError("");
    setOk("");
    try {
      for (const line of cart) {
        await api.createMovement(token, {
          product_id: line.product_id,
          movement_type: "out",
          quantity: line.quantity,
          note: `Venta POS · ${fmt(line.unit_price * line.quantity)}`,
        });
      }
      setOk(`Venta registrada · Total ${fmt(subtotal)} · Cambio ${fmt(change)}`);
      clearCart();
      await load();
      await refreshBusinessDay();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitEntry(e) {
    e.preventDefault();
    if (!ensureDayOpen()) return;
    setBusy(true);
    setError("");
    setOk("");
    try {
      await api.createMovement(token, {
        ...inForm,
        movement_type: "in",
        quantity: Number(inForm.quantity),
      });
      setInForm({ product_id: "", quantity: 1, note: "" });
      setOk("Entrada registrada correctamente.");
      await load();
      await refreshBusinessDay();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function submitAdjust(e) {
    e.preventDefault();
    if (!ensureDayOpen()) return;
    setBusy(true);
    setError("");
    setOk("");
    try {
      const note = adjustForm.note.trim() || "Ajuste de inventario (sin cobro)";
      await api.createMovement(token, {
        product_id: adjustForm.product_id,
        movement_type: "out",
        quantity: Number(adjustForm.quantity),
        note: `Ajuste inventario · ${note}`,
      });
      setAdjustForm({ product_id: "", quantity: 1, note: "" });
      setOk("Ajuste registrado: salida de stock sin cobro.");
      await load();
      await refreshBusinessDay();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page page-module page-pos">
      <PageHeader
        kicker="Operaciones"
        title="Punto de venta inteligente"
        subtitle="Agrega productos con un toque, cobra y calcula el cambio al instante."
      />

      {error && <Alert type="error">{error}</Alert>}
      {ok && <Alert type="success">{ok}</Alert>}
      {!canOperate && (
        <Alert type="warning">
          El día operativo de hoy no está abierto. Abre el día desde el menú Operaciones o cuando aparezca el aviso al entrar.
        </Alert>
      )}

      <div className="pos-mode-tabs glass-tabs">
        {MODES.map((m) => (
          <button
            key={m.id}
            type="button"
            className={`filter-chip pos-mode-chip ${mode === m.id ? "active" : ""}`}
            onClick={() => {
              setMode(m.id);
              const q = new URLSearchParams(searchParams);
              if (m.id === "pos") q.delete("mode");
              else q.set("mode", m.id);
              const qs = q.toString();
              navigate(qs ? `/movimientos?${qs}` : "/movimientos", { replace: true });
            }}
          >
            <strong>{m.label}</strong>
            <small>{m.hint}</small>
          </button>
        ))}
      </div>

      {mode === "pos" && (
        <div className="pos-layout">
          <section className="pos-catalog glass-panel">
            <div className="pos-search-wrap">
              <input
                className="pos-search"
                placeholder="Nombre o marca (mín. 3 letras)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="pos-product-grid">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className={`pos-product-card ${Number(p.quantity) <= 0 ? "disabled" : ""}`}
                  onClick={() => addToCart(p)}
                  disabled={Number(p.quantity) <= 0}
                >
                  <span className="pos-product-name">{p.name}</span>
                  <span className="pos-product-price">{fmt(p.unit_price)}</span>
                  <span className="pos-product-stock">Stock: {p.quantity}</span>
                </button>
              ))}
              {!filtered.length && (
                <p className="pos-empty">No hay productos. Crea algunos en el catálogo.</p>
              )}
            </div>
          </section>

          <aside className="pos-ticket glass-panel glass-panel-accent">
            <div className="pos-ticket-head">
              <h2>Ticket de venta</h2>
              <span className="badge">{cart.length} ítems</span>
            </div>

            <ul className="pos-cart-list">
              {cart.map((line) => (
                <li key={line.product_id} className="pos-cart-line">
                  <div className="pos-cart-info">
                    <strong>{line.name}</strong>
                    <span>{fmt(line.unit_price)} c/u</span>
                  </div>
                  <div className="pos-cart-controls">
                    <button type="button" onClick={() => changeQty(line.product_id, -1)} aria-label="Menos">−</button>
                    <span>{line.quantity}</span>
                    <button type="button" onClick={() => changeQty(line.product_id, 1)} aria-label="Más">+</button>
                  </div>
                  <div className="pos-cart-line-total">{fmt(line.unit_price * line.quantity)}</div>
                  <button type="button" className="pos-remove" onClick={() => removeLine(line.product_id)} aria-label="Quitar">×</button>
                </li>
              ))}
              {!cart.length && (
                <li className="pos-cart-empty">Toca un producto para agregarlo aquí</li>
              )}
            </ul>

            <div className="pos-summary">
              <div className="pos-summary-row">
                <span>Subtotal</span>
                <strong>{fmt(subtotal)}</strong>
              </div>
              <div className="pos-summary-row pos-total">
                <span>Total a pagar</span>
                <strong>{fmt(subtotal)}</strong>
              </div>

              <label className="pos-received-label">Dinero recibido</label>
              <input
                type="number"
                min="0"
                className="pos-received-input"
                placeholder="0"
                value={received}
                onChange={(e) => setReceived(e.target.value)}
              />

              <div className="pos-quick-amounts">
                {[10000, 20000, 50000, 100000].map((a) => (
                  <button key={a} type="button" onClick={() => setQuickAmount(a)}>
                    {fmt(a)}
                  </button>
                ))}
                <button type="button" onClick={() => setQuickAmount(subtotal)}>Exacto</button>
              </div>

              <div className={`pos-change ${receivedNum >= subtotal && subtotal > 0 ? "ok" : ""}`}>
                <span>Cambio a devolver</span>
                <strong>{fmt(change)}</strong>
              </div>
            </div>

            <div className="pos-actions">
              <button type="button" className="btn-secondary btn-block" onClick={clearCart} disabled={!cart.length}>
                Vaciar ticket
              </button>
              <button
                type="button"
                className="btn-primary btn-block pos-pay-btn"
                disabled={!canPay || busy || !canOperate}
                onClick={checkout}
              >
                {busy ? "Procesando…" : `Cobrar ${fmt(subtotal)}`}
              </button>
            </div>
          </aside>
        </div>
      )}

      {mode === "adjust" && (
        <section className="glass-panel pos-entry-panel">
          <h2>Ajuste de inventario</h2>
          <p className="sub">
            Registra una salida de stock sin cobro (merma, rotura, corrección). No genera venta en caja.
          </p>
          <FormCard onSubmit={submitAdjust} bare className="glass-form">
            <div className="form-card-body">
              <FormField label="Producto" required>
                <select
                  required
                  value={adjustForm.product_id}
                  onChange={(e) => setAdjustForm({ ...adjustForm, product_id: e.target.value })}
                >
                  <option value="">Selecciona un producto…</option>
                  {allProducts.filter((p) => p.is_active).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} — stock: {p.quantity}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormRow cols={2}>
                <FormField label="Cantidad a retirar" required>
                  <input
                    type="number"
                    min="1"
                    required
                    value={adjustForm.quantity}
                    onChange={(e) => setAdjustForm({ ...adjustForm, quantity: e.target.value })}
                  />
                </FormField>
                <FormField label="Motivo del ajuste" required>
                  <input
                    required
                    value={adjustForm.note}
                    onChange={(e) => setAdjustForm({ ...adjustForm, note: e.target.value })}
                    placeholder="Ej. Producto dañado"
                  />
                </FormField>
              </FormRow>
            </div>
            <FormActions>
              <button type="submit" className="btn-primary" disabled={busy || !canOperate}>
                {busy ? "Guardando…" : "Registrar ajuste (salida)"}
              </button>
            </FormActions>
          </FormCard>
        </section>
      )}

      {mode === "in" && (
        <section className="glass-panel pos-entry-panel">
          <h2>Registrar entrada de stock</h2>
          <p className="sub">Usa esto cuando llegue mercancía nueva al inventario.</p>
          <FormCard onSubmit={submitEntry} bare className="glass-form">
            <div className="form-card-body">
              <FormField label="Producto" required>
                <select
                  required
                  value={inForm.product_id}
                  onChange={(e) => setInForm({ ...inForm, product_id: e.target.value })}
                >
                  <option value="">Selecciona un producto…</option>
                  {allProducts.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}{!p.is_active ? " (inactivo)" : ""} — stock: {p.quantity}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormRow cols={2}>
                <FormField label="Cantidad" required>
                  <input
                    type="number"
                    min="1"
                    required
                    value={inForm.quantity}
                    onChange={(e) => setInForm({ ...inForm, quantity: e.target.value })}
                  />
                </FormField>
                <FormField label="Nota">
                  <input
                    value={inForm.note}
                    onChange={(e) => setInForm({ ...inForm, note: e.target.value })}
                    placeholder="Ej. Compra proveedor"
                  />
                </FormField>
              </FormRow>
            </div>
            <FormActions>
              <button type="submit" className="btn-primary" disabled={busy || !canOperate}>
                {busy ? "Guardando…" : "Registrar entrada"}
              </button>
            </FormActions>
          </FormCard>
        </section>
      )}

      {mode === "history" && (
        <section className="dash-section">
          <Panel
            title="Historial de movimientos"
            action={<span className="badge">{movements.length} registros</span>}
            className="table-panel movements-panel"
          >
            {movements.length ? (
              <div className="table-wrap">
                <table className="table-erp">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Tipo</th>
                      <th>Cantidad</th>
                      <th>Nota</th>
                      <th>Fecha</th>
                    </tr>
                  </thead>
                  <tbody>
                    {movements.map((m) => {
                      const product = byId[m.product_id];
                      return (
                        <tr key={m.id}>
                          <td>
                            <strong>{product?.name || "—"}</strong>
                            {product && !product.is_active && (
                              <div className="muted tiny">Producto inactivo</div>
                            )}
                          </td>
                          <td>
                            <span className={`pill ${m.movement_type}`}>
                              {movementTypeLabel(m.movement_type)}
                            </span>
                          </td>
                          <td><strong>{m.quantity}</strong></td>
                          <td className="muted">{m.note || "—"}</td>
                          <td>{new Date(m.created_at).toLocaleString("es-CO")}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="Sin movimientos"
                text="Registra ventas en el punto de venta o entradas de stock para ver el historial."
              />
            )}
          </Panel>
        </section>
      )}
    </div>
  );
}
