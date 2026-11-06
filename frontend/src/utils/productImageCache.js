const STORAGE_KEY = "inv_product_images_v1";

function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    /* quota or private mode */
  }
}

/**
 * @param {Array} products
 * @param {{ mergeOnly?: boolean }} options
 * mergeOnly: solo agrega/actualiza imágenes recibidas; no borra caché (listados sin foto).
 */
export function syncProductImageCache(products, options = {}) {
  const { mergeOnly = false } = options;
  if (!Array.isArray(products)) return;
  const store = readStore();
  const seen = new Set();
  let changed = false;

  for (const p of products) {
    if (!p?.id) continue;
    seen.add(p.id);
    if (p.image_base64) {
      const prev = store[p.id];
      if (!prev || prev.updated_at !== p.updated_at || prev.src !== p.image_base64) {
        store[p.id] = { updated_at: p.updated_at, src: p.image_base64 };
        changed = true;
      }
    } else if (!mergeOnly && store[p.id]) {
      delete store[p.id];
      changed = true;
    }
  }

  if (!mergeOnly) {
    for (const id of Object.keys(store)) {
      if (!seen.has(id)) {
        delete store[id];
        changed = true;
      }
    }
  }

  if (changed) writeStore(store);
}

export function getProductImageSrc(product) {
  if (!product?.id) return null;
  if (product.image_base64) return product.image_base64;
  const entry = readStore()[product.id];
  return entry?.src || null;
}

export function productNeedsImageHydration(products) {
  if (!Array.isArray(products) || !products.length) return false;
  return products.some((p) => p?.id && !getProductImageSrc(p));
}

export function clearProductImageCacheEntry(productId) {
  if (!productId) return;
  const store = readStore();
  if (!store[productId]) return;
  delete store[productId];
  writeStore(store);
}
