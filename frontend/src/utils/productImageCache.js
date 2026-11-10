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
 * mergeOnly: solo agrega/actualiza; no borra entradas que no vienen en este array.
 * Obligatorio cuando el array es un subconjunto (filtro, búsqueda, paginación).
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
    /* Listado sin binario: si el API dice que ya no hay foto, limpiar caché (también en mergeOnly). */
    if (p.has_image === false && store[p.id]) {
      delete store[p.id];
      changed = true;
      continue;
    }
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
  if (product.has_image === false) return null;
  if (product.image_base64) return product.image_base64;
  const entry = readStore()[product.id];
  return entry?.src || null;
}

/**
 * Pedir include_images=true solo si en BD hay foto (has_image) y aún no tenemos bytes
 * en la respuesta actual ni en localStorage.
 *
 * No usar product.updated_at para “staleness”: ese campo cambia en cada venta/stock
 * y provocaba descargar imágenes otra y otra vez.
 */
export function productsNeedingImageHydration(products) {
  if (!Array.isArray(products) || !products.length) return false;
  return products.some((p) => p?.id && p.has_image && !getProductImageSrc(p));
}

/** Descarga fotos desde /api/media (Drive) y las guarda en caché local. */
export async function hydrateProductImages(token, products, fetchDataUrl) {
  if (!token || !Array.isArray(products) || !products.length) return;
  const missing = products.filter((p) => p?.id && p.has_image && !getProductImageSrc(p));
  if (!missing.length) return;

  const store = readStore();
  let changed = false;

  await Promise.all(
    missing.map(async (p) => {
      try {
        const dataUrl = await fetchDataUrl(token, p.id);
        store[p.id] = { updated_at: p.updated_at, src: dataUrl };
        changed = true;
      } catch {
        /* omitir filas sin imagen accesible */
      }
    }),
  );

  if (changed) writeStore(store);
}

export function clearProductImageCacheEntry(productId) {
  if (!productId) return;
  const store = readStore();
  if (!store[productId]) return;
  delete store[productId];
  writeStore(store);
}
