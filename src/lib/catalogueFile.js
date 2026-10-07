import { withShelf } from "./categorize";

/**
 * The web shop's product list, from the same file the Android and iPhone apps
 * use: /catalog/catalog.json, rebuilt on Hostinger by cron every 5 minutes
 * (public/api/catalog/build.php). Shoppers never read the Firestore products
 * collection (firestore.rules allows only staff), so browsing the shop costs
 * nothing in Firestore however many people visit.
 *
 *  1. This browser's saved copy, at once.
 *  2. The file. It is served "no-cache" with an ETag, so the browser asks
 *     "changed?" and gets a 304 with no download when it hasn't.
 *  3. While the tab is visible, /api/catalog/changes.php every 30 seconds for
 *     what changed since our version (price, stock). That answer is shared for
 *     30 s on the server and cached by the CDN, so Firestore is read about
 *     twice a minute in total, not per visitor.
 *
 * Entries keep Firestore's field names; a switched-off product arrives as
 * { id, active: false } and is dropped.
 */

// On a computer (next dev) there is no cron-built file; read the live one.
const ORIGIN =
  typeof window !== "undefined" && /^(localhost|127\.|\[::1\])/.test(window.location.hostname)
    ? "https://dashit.co.in"
    : "";
const FILE_URL = `${ORIGIN}/catalog/catalog.json`;
const CHANGES_URL = `${ORIGIN}/api/catalog/changes.php`;
const STORE_KEY = "dashit_catalog_file_v1";
const POLL_MS = 30 * 1000;

let state = null; // { version, items: { id: entry } }
let shown = null; // memoised list for subscribers
const subscribers = new Set();
let started = false;
let pollTimer = null;

function readSaved() {
  if (typeof window === "undefined") return null;
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (parsed && parsed.items && typeof parsed.items === "object") return parsed;
  } catch (e) {}
  return null;
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(state));
  } catch (e) {
    // Too big for this browser's storage: kept in memory for this visit.
  }
}

function list() {
  if (!shown) {
    // Each product goes on the shelf its name says (see categorize.js); the
    // saved copy keeps the catalogue's own category.
    // The owner's own stock comes before a distributor's (`supplied`), so
    // every list built from this one leads with it.
    shown = Object.values(state?.items || {})
      .filter((p) => p && p.active !== false && p.name)
      .map(withShelf)
      .sort((a, b) => Number(a.supplied === true) - Number(b.supplied === true));
  }
  return shown;
}

function broadcast() {
  shown = null;
  const products = list();
  subscribers.forEach((cb) => {
    try {
      cb(products);
    } catch (e) {}
  });
}

function fold(entries, version) {
  const items = { ...(state?.items || {}) };
  for (const entry of entries || []) {
    if (!entry || !entry.id) continue;
    if (entry.active === false) delete items[entry.id];
    // The shop's cards read sold out from the stock count alone.
    else items[entry.id] = entry.inStock === false ? { ...entry, stock: 0 } : entry;
  }
  state = { version: Math.max(Number(version) || 0, state?.version || 0), items };
}

async function download() {
  try {
    const res = await fetch(FILE_URL, { headers: { Accept: "application/json" } });
    if (!res.ok) return false;
    const file = await res.json();
    const products = Array.isArray(file?.products) ? file.products : [];
    const live = products.filter((p) => p && p.active !== false).length;
    const before = state ? Object.keys(state.items).length : 0;
    const isExplicitClear = file?.cleared === true || (Array.isArray(file?.products) && file?.count === 0);
    // A broken or cut-short file never replaces a good copy.
    if (!isExplicitClear && (!(file.version > 0) || (before > 100 && live < before * 0.5))) return false;
    if (state && state.version === file.version) return false;
    state = { version: file.version, items: {} };
    fold(products, file.version);
    save();
    return true;
  } catch (e) {
    return false;
  }
}

async function fetchChanges() {
  if (!state?.version) return false;
  try {
    const res = await fetch(`${CHANGES_URL}?since=${encodeURIComponent(state.version)}`);
    if (!res.ok) return false;
    const body = await res.json();
    const changed = Array.isArray(body?.products) ? body.products : [];
    if (changed.length === 0 && !(body?.version > state.version)) return false;
    fold(changed, body.version);
    save();
    return changed.length > 0;
  } catch (e) {
    return false;
  }
}

function schedulePoll() {
  clearTimeout(pollTimer);
  pollTimer = setTimeout(async () => {
    if (subscribers.size === 0) {
      started = false;
      return;
    }
    if (document.visibilityState === "visible" && (await fetchChanges())) broadcast();
    schedulePoll();
  }, POLL_MS);
}

/**
 * No file on the website (the cron job hasn't made it yet): changes.php since
 * version 0 builds it on the server and answers with every product.
 */
async function fetchEverything() {
  try {
    const res = await fetch(`${CHANGES_URL}?since=0`);
    if (!res.ok) return false;
    const body = await res.json();
    const products = Array.isArray(body?.products) ? body.products : [];
    const isExplicitClear = body?.cleared === true || (Array.isArray(products) && products.length === 0);
    if (!isExplicitClear && products.filter((p) => p && p.active !== false).length === 0 && !body?.version) return false;
    state = { version: body.version || 0, items: {} };
    fold(products, body.version);
    save();
    return true;
  } catch (e) {
    return false;
  }
}

async function start() {
  if (started || typeof window === "undefined") return;
  started = true;
  for (let attempt = 0; ; attempt += 1) {
    if (await download()) {
      broadcast();
      break;
    }
    if (state && list().length > 0) break; // the saved copy stands
    if (await fetchEverything()) {
      broadcast();
      break;
    }
    if (subscribers.size === 0) {
      started = false;
      return;
    }
    await new Promise((r) => setTimeout(r, Math.min(30000, 5000 * (attempt + 1))));
  }
  schedulePoll();
}

/**
 * Calls back with the product list now (if this browser has one) and whenever
 * it changes. Returns the unsubscribe function, like Firestore's onSnapshot.
 */
export function watchShopProducts(callback) {
  if (!state) state = readSaved();
  subscribers.add(callback);
  if (state && list().length > 0) callback(list());
  start();
  return () => {
    subscribers.delete(callback);
  };
}

/** The current list, loading it first if needed. */
export function loadShopProducts() {
  return new Promise((resolve) => {
    if (!state) state = readSaved();
    if (state && list().length > 0) {
      resolve(list());
      start();
      return;
    }
    const stop = watchShopProducts((products) => {
      stop();
      resolve(products);
    });
  });
}

/** Out of stock the way both apps read it: inStock false, or a stock count of 0. */
export function isSoldOut(product) {
  if (!product) return true;
  if (product.inStock === false) return true;
  const stock = product.stock;
  return stock !== undefined && stock !== null && stock !== "" && Number(stock) <= 0;
}

/** Immediately empties the local catalogue cache and notifies all listeners */
export function clearShopProductsCache() {
  state = { version: Date.now(), items: {} };
  shown = [];
  if (typeof window !== "undefined") {
    try {
      localStorage.removeItem(STORE_KEY);
    } catch (e) {}
  }
  broadcast();
}

if (typeof window !== "undefined") {
  window.addEventListener("dashit_catalogue_cleared", () => {
    clearShopProductsCache();
  });
}
