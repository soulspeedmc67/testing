import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  runTransaction,
  arrayUnion,
  writeBatch,
  increment,
  Timestamp,
} from "firebase/firestore";
import { getDb, getFirebaseAuth } from "./firebase";
import { onAuthStateChanged } from "firebase/auth";

/**
 * Firestore data layer.
 *
 * Every component talks to Firestore through this module — no page imports
 * `firebase/firestore` directly. That keeps the collection shapes in one place
 * and makes the Socket.io removal total: the `watch*` helpers below are the
 * realtime replacement for every socket event the Express server used to emit.
 */

export const ORDER_STATUS = {
  PLACED: "Placed",
  PACKED: "Packed",
  PACKING: "Packed", // backward-compatible alias
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

/* ------------------------------------------------------------------ products */

/** The owner's own stock. Always in the distributor list; can't be removed. */
export const SELF_DISTRIBUTOR_NAME = "Myself";
export const SELF_DISTRIBUTOR = { id: "SELF", name: SELF_DISTRIBUTOR_NAME, isSelf: true, active: true };

/* Six made-up distributors were once filled in as examples. They are dropped
   wherever they turn up (saved lists, product tags), so only real ones remain. */
const DEMO_DISTRIBUTOR_IDS = new Set([
  "DIST-KASHMIR-FMCG",
  "DIST-AMUL-VALLEY",
  "DIST-KANDUR-BAKERY",
  "DIST-ANANTNAG-ORCHARDS",
  "DIST-HUL-DIRECT",
  "DIST-ITC-NESTLE",
]);
const DEMO_DISTRIBUTOR_NAMES = new Set([
  "Kashmir Wholesale FMCG",
  "Amul Valley Dairy Logistics",
  "Local Kandur Bakeries",
  "Anantnag Fresh Farm Orchards",
  "Hindustan Unilever Direct",
  "ITC & Nestlé Supply Hub",
]);

function isRealDistributor(d) {
  return d && d.id !== SELF_DISTRIBUTOR.id && !DEMO_DISTRIBUTOR_IDS.has(String(d.id)) && !DEMO_DISTRIBUTOR_NAMES.has(d.name);
}

/** Who a product's stock came from; untagged items are the owner's own. */
export function assignDefaultDistributor(p) {
  const name = String(p?.distributor || "").trim();
  if (!name || DEMO_DISTRIBUTOR_NAMES.has(name)) return SELF_DISTRIBUTOR_NAME;
  return name;
}

/**
 * An order's lines grouped by who supplied the stock, so staff pick one
 * distributor's shelf at a time: the owner's own stock first, then each
 * distributor A→Z, then lines no longer in the catalogue. Each entry keeps the
 * line's position in `order.items`, which the packing checklist is keyed on.
 * Lines are matched to the catalogue by product id (any app's field name), a
 * size variant's parent id ("54-6pcs" → "54"), then by name.
 */
export const UNKNOWN_DISTRIBUTOR_LABEL = "Not in the item list";

export function groupOrderItemsByDistributor(items = [], catalogue = []) {
  const byId = new Map();
  const byName = new Map();
  catalogue.forEach((p) => {
    [p.id, p.barcode].forEach((key) => {
      if (key !== undefined && key !== null && key !== "") byId.set(String(key).toLowerCase(), p);
    });
    if (p.name) byName.set(String(p.name).trim().toLowerCase(), p);
  });
  const find = (item) => {
    const keys = [item.productId, item.id, item.barcode]
      .filter((k) => k !== undefined && k !== null && k !== "")
      .map((k) => String(k).toLowerCase());
    for (const key of keys) {
      if (byId.has(key)) return byId.get(key);
      const parent = key.split("-")[0];
      if (parent && byId.has(parent)) return byId.get(parent);
    }
    return byName.get(String(item.name || "").trim().toLowerCase()) || null;
  };

  const groups = new Map();
  items.forEach((item, index) => {
    const product = find(item);
    const label = product ? assignDefaultDistributor(product) : UNKNOWN_DISTRIBUTOR_LABEL;
    if (!groups.has(label)) groups.set(label, []);
    groups.get(label).push({ item, index });
  });

  const rank = (label) =>
    label === SELF_DISTRIBUTOR_NAME ? 0 : label === UNKNOWN_DISTRIBUTOR_LABEL ? 2 : 1;
  return [...groups.entries()]
    .map(([distributor, entries]) => ({ distributor, entries }))
    .sort((a, b) => rank(a.distributor) - rank(b.distributor) || a.distributor.localeCompare(b.distributor));
}

// ---------------------------------------------------------------------------
// The catalogue, read from Firestore as little as possible.
//
// Firestore bills every document read and the free plan allows 50,000 a day.
// Reading all ~1,300 products on every visit used that up within hours. So
// this browser keeps the catalogue (localStorage) along with the time of the
// newest change it has seen, and a visit only asks for products changed since
// then: usually none, or a handful. Every product write sets `updatedAt`, and
// removals mark `active: false` instead of deleting, so a change-only query
// sees them. The whole list is read only on a first visit, once a week to
// catch anything missed, and never for search-engine bots.
// ---------------------------------------------------------------------------

const CATALOGUE_KEY = "dashit_catalogue_v2";
const LEGACY_CATALOGUE_KEYS = ["dashit_cached_products", "dashit_products_cached_at"];
const FULL_REFRESH_MS = 7 * 24 * 60 * 60 * 1000;

let memoryProductsCache = null; // enriched, shown products
let catalogueState = null; // { items: { [id]: product }, syncedAt: ms, fullAt: ms }

function enrichProducts(rawList = []) {
  let merged = rawList;
  if (typeof window !== "undefined") {
    try {
      const custom = JSON.parse(localStorage.getItem("dashit_custom_products") || "[]");
      if (custom.length > 0) {
        const customIds = new Set(custom.map((c) => String(c.id || c.barcode)));
        merged = [...custom, ...rawList.filter((p) => !customIds.has(String(p.id || p.barcode)))];
      }
      const deletedIds = new Set(JSON.parse(localStorage.getItem("dashit_deleted_products") || "[]").map(String));
      if (deletedIds.size > 0) {
        merged = merged.filter((p) => !deletedIds.has(String(p.id || p.barcode)));
      }
    } catch (e) {}
  }
  return merged.map((p) => ({
    ...p,
    distributor: assignDefaultDistributor(p),
  }));
}

/** Search engines and link previews get the static pages, never Firestore. */
function isLikelyBot() {
  if (typeof navigator === "undefined") return false;
  return /bot|crawl|spider|slurp|mediapartners|facebookexternalhit|whatsapp|telegram|lighthouse|pagespeed|headless/i.test(
    navigator.userAgent || ""
  );
}

function millisOf(value) {
  if (!value) return 0;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000 + Math.floor((value.nanoseconds || 0) / 1e6);
  const n = typeof value === "number" ? value : Date.parse(value);
  return Number.isFinite(n) ? n : 0;
}

function readCatalogue() {
  if (catalogueState) return catalogueState;
  if (typeof window === "undefined") return null;
  try {
    LEGACY_CATALOGUE_KEYS.forEach((k) => localStorage.removeItem(k));
    const parsed = JSON.parse(localStorage.getItem(CATALOGUE_KEY) || "null");
    if (parsed && parsed.items && typeof parsed.items === "object") {
      catalogueState = parsed;
      return parsed;
    }
  } catch (e) {}
  return null;
}

function saveCatalogue(state) {
  catalogueState = state;
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CATALOGUE_KEY, JSON.stringify(state));
  } catch (e) {
    // Too big for localStorage: kept in memory for this visit only.
  }
}

/** Recent enough to only ask for changes since `syncedAt`. */
function canFetchChangesOnly(state) {
  return (
    !!state &&
    state.syncedAt > 0 &&
    Object.keys(state.items).length > 0 &&
    Date.now() - (state.fullAt || 0) < FULL_REFRESH_MS
  );
}

function shownProducts(state) {
  return Object.values(state?.items || {}).filter((p) => p.active !== false);
}

/** A catalogue built from a full read of the active products. */
function fullState(docs) {
  const items = {};
  let newest = 0;
  docs.forEach((d) => {
    const data = { id: d.id, ...d.data() };
    items[d.id] = data;
    newest = Math.max(newest, millisOf(data.updatedAt));
  });
  // Nothing has ever been edited: start from "now", less a margin for this
  // device's clock being ahead of the server's.
  const syncedAt = newest > 0 ? newest : Date.now() - 10 * 60 * 1000;
  return { items, syncedAt, fullAt: Date.now() };
}

/** Folds changed products into the catalogue; removed ones drop out. */
function withChanges(state, changes) {
  const items = { ...state.items };
  let syncedAt = state.syncedAt || 0;
  changes.forEach(({ type, doc: d }) => {
    if (type === "removed") {
      delete items[d.id];
      return;
    }
    const data = { id: d.id, ...d.data() };
    if (data.active === false) delete items[d.id];
    else items[d.id] = data;
    syncedAt = Math.max(syncedAt, millisOf(data.updatedAt));
  });
  return { ...state, items, syncedAt };
}

export function invalidateProductCache() {
  // The stored catalogue stays: the change arrives through the live listener.
  memoryProductsCache = null;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("dashit_products_updated"));
  }
}

export async function fetchProducts(forceRefresh = false) {
  if (!forceRefresh && memoryProductsCache && sharedProductUnsub) {
    return memoryProductsCache; // the live listener keeps it current
  }
  let state = readCatalogue();
  const db = getDb();
  if (db && !isLikelyBot()) {
    try {
      if (canFetchChangesOnly(state)) {
        const snap = await getDocs(
          query(collection(db, "products"), where("updatedAt", ">", Timestamp.fromMillis(state.syncedAt)))
        );
        state = withChanges(state, snap.docs.map((d) => ({ type: "modified", doc: d })));
      } else {
        const snap = await getDocs(query(collection(db, "products"), where("active", "==", true)));
        state = fullState(snap.docs);
      }
      saveCatalogue(state);
    } catch (e) {
      console.warn("fetchProducts Firestore warning:", e?.message);
    }
  }
  const enriched = enrichProducts(shownProducts(state));
  if (enriched.length > 0) memoryProductsCache = enriched;
  return enriched;
}

// One shared Firestore listener for every component that watches the catalogue
const productSubscribers = new Set();
let sharedProductUnsub = null;
let sharedCleanupTimer = null;
let localListenersAdded = false;

function broadcastProducts() {
  const enriched = enrichProducts(shownProducts(readCatalogue()));
  memoryProductsCache = enriched;
  productSubscribers.forEach((cb) => {
    try { cb(enriched); } catch (e) {}
  });
}

function startSharedProductWatcher() {
  if (sharedCleanupTimer) {
    clearTimeout(sharedCleanupTimer);
    sharedCleanupTimer = null;
  }
  if (sharedProductUnsub) return;

  const db = getDb();
  if (db && !isLikelyBot()) {
    try {
      const stored = readCatalogue();
      if (canFetchChangesOnly(stored)) {
        // Only products changed since the last visit, then each change live.
        sharedProductUnsub = onSnapshot(
          query(collection(db, "products"), where("updatedAt", ">", Timestamp.fromMillis(stored.syncedAt))),
          (snap) => {
            saveCatalogue(withChanges(readCatalogue() || stored, snap.docChanges()));
            broadcastProducts();
          },
          (err) => console.warn("watchProducts snapshot warning:", err?.message)
        );
      } else {
        // First visit (or a week on): the whole list once, then changes.
        sharedProductUnsub = onSnapshot(
          query(collection(db, "products"), where("active", "==", true)),
          (snap) => {
            saveCatalogue(fullState(snap.docs));
            broadcastProducts();
          },
          (err) => console.warn("watchProducts snapshot warning:", err?.message)
        );
      }
    } catch (e) {
      console.warn("watchProducts init warning:", e?.message);
    }
  }

  if (typeof window !== "undefined" && !localListenersAdded) {
    localListenersAdded = true;
    window.addEventListener("dashit_products_updated", broadcastProducts);
    window.addEventListener("storage", broadcastProducts);
  }
}

/** Live catalogue — shares a single Firestore connection across all components */
export function watchProducts(callback) {
  productSubscribers.add(callback);

  // What this browser already has, straight away.
  const stored = readCatalogue();
  const immediate = memoryProductsCache || (stored ? enrichProducts(shownProducts(stored)) : null);
  if (immediate && immediate.length > 0) {
    callback(immediate);
  }

  startSharedProductWatcher();

  return () => {
    productSubscribers.delete(callback);
    if (productSubscribers.size === 0) {
      // 30-second grace period before closing the Firestore connection
      // so navigating between screens doesn't churn connections and reads
      if (sharedCleanupTimer) clearTimeout(sharedCleanupTimer);
      sharedCleanupTimer = setTimeout(() => {
        if (productSubscribers.size === 0 && typeof sharedProductUnsub === "function") {
          sharedProductUnsub();
          sharedProductUnsub = null;
        }
      }, 30000);
    }
  };
}

export async function upsertProduct(product) {
  const { id, ...data } = product;
  const prodId = id ? String(id) : `PROD-${Date.now()}`;
  const itemToSave = { id: prodId, barcode: prodId, active: true, ...data };

  // 1. Immediately save to localStorage and broadcast cross-tab
  if (typeof window !== "undefined") {
    try {
      const custom = JSON.parse(localStorage.getItem("dashit_custom_products") || "[]");
      const updated = [itemToSave, ...custom.filter((p) => String(p.id || p.barcode) !== prodId)];
      localStorage.setItem("dashit_custom_products", JSON.stringify(updated));

      // Remove from deleted list if re-added
      const deleted = JSON.parse(localStorage.getItem("dashit_deleted_products") || "[]");
      const unDeleted = deleted.filter((dId) => String(dId) !== prodId);
      localStorage.setItem("dashit_deleted_products", JSON.stringify(unDeleted));

      window.dispatchEvent(new CustomEvent("dashit_products_updated"));
    } catch (e) {
      console.warn("localStorage save error:", e);
    }
  }

  // 2. Sync to Firestore in the background (fail-safe)
  const db = getDb();
  if (db) {
    try {
      const payload = { active: true, ...data, updatedAt: serverTimestamp() };
      await setDoc(doc(db, "products", prodId), payload, { merge: true });
    } catch (err) {
      console.warn("Firestore upsertProduct warning (saved locally):", err?.message);
    }
  }

  invalidateProductCache();
  return prodId;
}

export async function deleteProduct(productId) {
  const targetId = String(productId);
  if (typeof window !== "undefined") {
    try {
      const custom = JSON.parse(localStorage.getItem("dashit_custom_products") || "[]");
      const filtered = custom.filter((p) => String(p.id || p.barcode) !== targetId);
      localStorage.setItem("dashit_custom_products", JSON.stringify(filtered));

      // Persist deleted product ID so default/seed items also stay deleted
      const deletedIds = JSON.parse(localStorage.getItem("dashit_deleted_products") || "[]");
      if (!deletedIds.includes(targetId)) {
        deletedIds.push(targetId);
        localStorage.setItem("dashit_deleted_products", JSON.stringify(deletedIds));
      }

      window.dispatchEvent(new CustomEvent("dashit_products_updated"));
    } catch (e) {}
  }

  const db = getDb();
  if (!db) {
    invalidateProductCache();
    return;
  }
  try {
    // Marked removed rather than erased: shops that only fetch what changed
    // since their last visit (see watchProducts) still learn it's gone.
    await setDoc(
      doc(db, "products", targetId),
      { active: false, deletedAt: serverTimestamp(), updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (e) {
    console.warn("deleteProduct Firestore warning:", e?.message);
  }
  invalidateProductCache();
}

/**
 * Adjust stock for a single product (+/- delta or set absolute).
 */
// ---------------------------------------------------------------------------
// Product photos (see lib/productPhotoFinder.js)

/* Local copies of products the admin changed, so the page shows the change
   before Firestore's listener comes back. */
function mirrorProductFieldsLocally(changes) {
  if (typeof window === "undefined" || changes.length === 0) return;
  try {
    const custom = JSON.parse(localStorage.getItem("dashit_custom_products") || "[]");
    const byId = new Map(changes.map((c) => [String(c.id), c.fields]));
    let touched = false;
    custom.forEach((item) => {
      const fields = byId.get(String(item.id || item.barcode));
      if (fields) {
        Object.assign(item, fields);
        touched = true;
      }
    });
    if (touched) {
      localStorage.setItem("dashit_custom_products", JSON.stringify(custom));
      window.dispatchEvent(new CustomEvent("dashit_products_updated"));
    }
  } catch (e) {}
}

async function writeProductFields(changes) {
  mirrorProductFieldsLocally(changes);
  invalidateProductCache();
  const db = getDb();
  if (!db || changes.length === 0) return { success: true, count: 0 };
  let written = 0;
  for (let i = 0; i < changes.length; i += 400) {
    const batch = writeBatch(db);
    changes.slice(i, i + 400).forEach(({ id, fields }) => {
      batch.set(doc(db, "products", String(id)), { ...fields, updatedAt: serverTimestamp() }, { merge: true });
    });
    await batch.commit();
    written += Math.min(400, changes.length - i);
  }
  return { success: true, count: written };
}

/**
 * Saves photos found on Open Food Facts: `[{ id, img, offBarcode, weak, issues }]`.
 * `imgSource` records where each came from, so a later import skips them.
 */
export function saveFoundProductPhotos(found = []) {
  return writeProductFields(
    found.map((f) => ({
      id: f.id,
      fields: {
        img: f.img,
        imgSource: "openfoodfacts",
        offBarcode: f.offBarcode || "",
        photoQuality: f.weak ? "weak" : "good",
        photoIssues: f.issues || [],
        photoRejected: false,
      },
    }))
  );
}

/** "Wrong photo, remove": clears it and stops imports from finding the same one again. */
export function removeProductPhoto(id, rejectedUrl = "") {
  return writeProductFields([
    {
      id,
      fields: {
        img: "",
        imgSource: "none",
        photoRejected: true,
        rejectedPhoto: rejectedUrl,
        photoQuality: "none",
        photoIssues: [],
      },
    },
  ]);
}

/** A photo the admin chose (camera, gallery or a link). Imports never replace it. */
export function setManualProductPhoto(id, url, { weak = false, issues = [] } = {}) {
  return setManualProductPhotos([{ id, url, weak, issues }]);
}

/** Many at once, from a filled-in "photos to add" file: `[{ id, url, weak, issues }]`. Only photo fields change. */
export function setManualProductPhotos(photos = []) {
  return writeProductFields(
    photos.map(({ id, url, weak = false, issues = [] }) => ({
      id,
      fields: {
        img: url,
        imgSource: "manual",
        photoQuality: weak ? "weak" : "good",
        photoIssues: issues,
        photoRejected: false,
      },
    }))
  );
}

/** "Fix shelves": moves items to another shelf, `[{ id, cat }]`. Only `cat` changes. */
export function setProductShelves(moves = []) {
  return writeProductFields(moves.map(({ id, cat }) => ({ id, fields: { cat } })));
}

/**
 * "Check photos": the owner said none of the suggested photos is this item.
 * Saved on the item so it isn't asked again, on this or any other device.
 */
export function skipProductPhotoSuggestions(ids = []) {
  return writeProductFields(ids.map((id) => ({ id, fields: { photoSuggestionsSkipped: true } })));
}

/**
 * "Delete all" for one distributor: removes every item whose stock came from
 * them (untagged items count as the owner's own, "Myself"). Returns how many.
 */
export async function deleteDistributorProducts(distributorName, catalogue = []) {
  const name = String(distributorName || "").trim();
  if (!name) return { success: false, count: 0 };
  const ids = catalogue
    .filter((p) => assignDefaultDistributor(p) === name)
    .map((p) => String(p.id || p.barcode))
    .filter(Boolean);
  if (typeof window !== "undefined") {
    try {
      const idSet = new Set(ids);
      const custom = JSON.parse(localStorage.getItem("dashit_custom_products") || "[]");
      localStorage.setItem(
        "dashit_custom_products",
        JSON.stringify(custom.filter((p) => !idSet.has(String(p.id || p.barcode))))
      );
      const deleted = new Set(JSON.parse(localStorage.getItem("dashit_deleted_products") || "[]"));
      ids.forEach((id) => deleted.add(id));
      localStorage.setItem("dashit_deleted_products", JSON.stringify([...deleted]));
      window.dispatchEvent(new CustomEvent("dashit_products_updated"));
    } catch (e) {}
  }
  invalidateProductCache();
  const db = getDb();
  if (!db) return { success: true, count: ids.length };
  for (let i = 0; i < ids.length; i += 400) {
    const batch = writeBatch(db);
    // Marked removed, not erased, so shops that only fetch changes see it.
    ids.slice(i, i + 400).forEach((id) =>
      batch.set(
        doc(db, "products", id),
        { active: false, deletedAt: serverTimestamp(), updatedAt: serverTimestamp() },
        { merge: true }
      )
    );
    await batch.commit();
  }
  return { success: true, count: ids.length };
}

export async function adjustSingleProductStock(productId, deltaOrAbsolute, isAbsolute = false) {
  const targetId = String(productId);
  const db = getDb();

  /* Firestore is the source of truth for stock, so a relative adjustment is
     applied there atomically. The previous version computed the new value from
     the localStorage mirror alone and left it at 0 when the product was not in
     that mirror — so adjusting the stock of any catalogue product from a fresh
     admin device silently wrote stock: 0 and made it look out of stock. */
  let newStockVal = null;

  if (db) {
    try {
      newStockVal = await runTransaction(db, async (tx) => {
        const ref = doc(db, "products", targetId);
        const snap = await tx.get(ref);
        const current = snap.exists() ? Number(snap.data().stock) || 0 : 0;
        const next = isAbsolute
          ? Math.max(0, Number(deltaOrAbsolute) || 0)
          : Math.max(0, current + (Number(deltaOrAbsolute) || 0));
        tx.set(ref, { stock: next, updatedAt: serverTimestamp() }, { merge: true });
        return next;
      });
    } catch (e) {
      console.warn("adjustSingleProductStock firestore warning:", e?.message);
    }
  }

  if (typeof window !== "undefined") {
    try {
      const custom = JSON.parse(localStorage.getItem("dashit_custom_products") || "[]");
      const idx = custom.findIndex((p) => String(p.id || p.barcode) === targetId);
      if (idx !== -1) {
        const cur = Number(custom[idx].stock) || 0;
        const localNext = isAbsolute
          ? Math.max(0, Number(deltaOrAbsolute) || 0)
          : Math.max(0, cur + (Number(deltaOrAbsolute) || 0));
        // Prefer the transactional Firestore result when there is one.
        newStockVal = newStockVal === null ? localNext : newStockVal;
        custom[idx].stock = newStockVal;
        localStorage.setItem("dashit_custom_products", JSON.stringify(custom));
        window.dispatchEvent(new CustomEvent("dashit_products_updated"));
      }
    } catch (e) {
      console.warn("adjustSingleProductStock local error:", e);
    }
  }

  invalidateProductCache();
  return newStockVal === null ? 0 : newStockVal;
}

/* Firestore takes at most 500 writes per batch; staying well under leaves room
   for the security rules' own document reads. A few batches go out at once so a
   large file saves in seconds rather than one row at a time. */
const STOCK_BATCH_SIZE = 250;
const STOCK_PARALLEL_BATCHES = 3;
const STOCK_PARALLEL_SINGLE_WRITES = 8;

/** Runs `worker` over `items`, at most `limit` at a time. */
async function runPooled(items, limit, worker) {
  let next = 0;
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      await worker(items[index], index);
    }
  });
  await Promise.all(lanes);
}

/** Mirror a stock import into this device's product list, for offline use. */
function mirrorStockUpdatesLocally(stockUpdates) {
  if (typeof window === "undefined") return;
  try {
    // Stocking an item again brings it back if it was deleted before (for
    // example with a distributor's "Delete all", then the same file again).
    const deleted = JSON.parse(localStorage.getItem("dashit_deleted_products") || "[]");
    if (deleted.length > 0) {
      const restocked = new Set(stockUpdates.map((up) => String(up.id || up.barcode || "")));
      const kept = deleted.filter((id) => !restocked.has(String(id)));
      if (kept.length !== deleted.length) localStorage.setItem("dashit_deleted_products", JSON.stringify(kept));
    }

    const custom = JSON.parse(localStorage.getItem("dashit_custom_products") || "[]");
    // Indexed once: a findIndex per row froze the page on files of a few thousand lines.
    const indexById = new Map();
    custom.forEach((p, i) => indexById.set(String(p.id || p.barcode), i));
    const added = [];

    stockUpdates.forEach((up) => {
      const id = String(up.id || up.barcode || "");
      const idx = indexById.get(id);
      if (idx !== undefined) {
        const item = custom[idx];
        if (up.newStock !== undefined) {
          item.stock = Math.max(0, Number(up.newStock));
        } else if (up.qtyToAdd !== undefined) {
          item.stock = Math.max(0, (Number(item.stock) || 0) + Number(up.qtyToAdd));
        }
        if (up.product) {
          if (up.product.distributor) item.distributor = up.product.distributor;
          if (up.product.price !== undefined) item.price = up.product.price;
          if (up.product.originalPrice !== undefined) item.originalPrice = up.product.originalPrice;
          if (up.product.cat) item.cat = up.product.cat;
        }
      } else if (up.product) {
        const newId = id || `PROD-${Date.now()}-${added.length}`;
        indexById.set(newId, -1);
        added.push({
          ...up.product,
          id: newId,
          stock: Number(up.qtyToAdd || up.newStock || 1),
          active: true,
        });
      }
    });

    const next = added.length ? [...added.reverse(), ...custom] : custom;
    localStorage.setItem("dashit_custom_products", JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("dashit_products_updated"));
  } catch (e) {
    // A very large list can outgrow localStorage; the server copy is what counts.
    console.warn("bulkUpdateProductStock local mirror skipped:", e?.message);
  }
}

/**
 * Bulk stock inward/adjustment for CSV imports and barcode inward.
 *
 * Rows are written in batches with an atomic `increment()` for added stock, so
 * a concurrent order deduction is never overwritten and nothing has to be read
 * first. This used to run one read-then-write transaction per row, strictly in
 * turn: a few thousand rows took many minutes and looked like the page had hung.
 *
 * A batch is all-or-nothing, so when one is rejected its rows are retried one
 * by one and only the rows that really failed are reported.
 *
 * @param {Array} stockUpdates  { id, qtyToAdd | newStock | calculatedStock, product? }
 * @param {{ onProgress?: (done: number, total: number) => void }} [options]
 */
export async function bulkUpdateProductStock(stockUpdates = [], options = {}) {
  if (!stockUpdates || stockUpdates.length === 0) return { success: true, count: 0 };
  const { onProgress } = options;

  mirrorStockUpdatesLocally(stockUpdates);

  const db = getDb();
  const failures = [];
  let written = 0;
  let done = 0;
  const total = stockUpdates.length;
  const report = (n) => {
    done += n;
    if (onProgress) onProgress(Math.min(done, total), total);
  };

  if (db) {
    const writes = [];
    const negative = [];
    for (const up of stockUpdates) {
      const id = String(up.id || up.barcode || "");
      if (!id) {
        report(1);
        continue;
      }
      const payload = { active: true, ...(up.product || {}), updatedAt: serverTimestamp() };
      if (up.qtyToAdd !== undefined && up.newStock === undefined && up.calculatedStock === undefined) {
        const delta = Number(up.qtyToAdd) || 0;
        if (delta < 0) {
          // Taking stock away must not go below zero, which needs the current value.
          negative.push({ id, up, payload, delta });
          continue;
        }
        payload.stock = increment(delta);
      } else if (up.newStock !== undefined) {
        payload.stock = Math.max(0, Number(up.newStock) || 0);
      } else if (up.calculatedStock !== undefined) {
        payload.stock = Math.max(0, Number(up.calculatedStock) || 0);
      }
      writes.push({ id, up, payload });
    }

    const writeOne = async ({ id, up, payload }) => {
      try {
        await setDoc(doc(db, "products", id), payload, { merge: true });
        written += 1;
      } catch (e) {
        failures.push({ id, name: up.product?.name || id, reason: e?.message || "Write rejected" });
      }
    };

    const chunks = [];
    for (let i = 0; i < writes.length; i += STOCK_BATCH_SIZE) {
      chunks.push(writes.slice(i, i + STOCK_BATCH_SIZE));
    }

    await runPooled(chunks, STOCK_PARALLEL_BATCHES, async (chunk) => {
      try {
        const batch = writeBatch(db);
        chunk.forEach(({ id, payload }) => batch.set(doc(db, "products", id), payload, { merge: true }));
        await batch.commit();
        written += chunk.length;
      } catch (e) {
        console.warn("bulkUpdateProductStock batch rejected, retrying row by row:", e?.message);
        await runPooled(chunk, STOCK_PARALLEL_SINGLE_WRITES, writeOne);
      }
      report(chunk.length);
    });

    await runPooled(negative, STOCK_PARALLEL_SINGLE_WRITES, async ({ id, up, payload, delta }) => {
      try {
        await runTransaction(db, async (tx) => {
          const ref = doc(db, "products", id);
          const snap = await tx.get(ref);
          const current = snap.exists() ? Number(snap.data().stock) || 0 : 0;
          tx.set(ref, { ...payload, stock: Math.max(0, current + delta) }, { merge: true });
        });
        written += 1;
      } catch (e) {
        failures.push({ id, name: up.product?.name || id, reason: e?.message || "Write rejected" });
      }
      report(1);
    });
  } else {
    report(total);
  }

  invalidateProductCache();

  return {
    // Local-only is not a server success; say so rather than implying a sync.
    success: failures.length === 0,
    syncedToServer: Boolean(db) && failures.length === 0,
    count: db ? written : 0,
    attempted: stockUpdates.length,
    failures,
  };
}

/**
 * Deduct inventory for items in an order when shipped/out for delivery.
 */
export async function deductInventoryForOrder(orderId, items = []) {
  if (!items || items.length === 0) return { success: true, count: 0 };

  const db = getDb();
  const deducted = [];

  /* Deduction is driven by the order's own line items against Firestore, one
     transaction per product. Previously the whole deduction was derived from
     the localStorage product mirror: a product missing from that mirror was
     skipped entirely, so on any admin device with a cold cache an order shipped
     without its stock ever coming down — and two admins marking orders shipped
     at once could both read the same stock and write the same reduced value. */
  if (db) {
    for (const item of items) {
      const itemId = String(item.id || item.barcode || "").trim();
      if (!itemId) continue;
      const qtyToDeduct = Number(item.quantity || item.qty) || 1;
      try {
        const nextStock = await runTransaction(db, async (tx) => {
          const ref = doc(db, "products", itemId);
          const snap = await tx.get(ref);
          if (!snap.exists()) return null;
          const current = Number(snap.data().stock) || 0;
          const next = Math.max(0, current - qtyToDeduct);
          tx.set(ref, { stock: next, updatedAt: serverTimestamp() }, { merge: true });
          return next;
        });
        if (nextStock !== null) deducted.push({ id: itemId, stock: nextStock });
      } catch (e) {
        console.warn(`deductInventoryForOrder could not deduct ${itemId}:`, e?.message);
      }
    }

    if (orderId) {
      try {
        await updateDoc(doc(db, "orders", String(orderId)), {
          inventoryDeducted: true,
          updatedAt: serverTimestamp(),
        });
      } catch (e) {
        console.warn("deductInventoryForOrder could not flag the order:", e?.message);
      }
    }
  }

  // Mirror the result locally so the admin catalogue reflects it immediately.
  if (typeof window !== "undefined") {
    try {
      const custom = JSON.parse(localStorage.getItem("dashit_custom_products") || "[]");
      let touched = false;
      items.forEach((item) => {
        const itemId = String(item.id || item.barcode || "");
        const itemName = String(item.name || "").toLowerCase().trim();
        const qtyToDeduct = Number(item.quantity || item.qty) || 1;

        const idx = custom.findIndex(
          (p) =>
            (itemId && String(p.id || p.barcode) === itemId) ||
            (itemName && String(p.name || "").toLowerCase().trim() === itemName)
        );
        if (idx === -1) return;

        const authoritative = deducted.find((d) => d.id === itemId);
        custom[idx].stock = authoritative
          ? authoritative.stock
          : Math.max(0, (Number(custom[idx].stock) || 0) - qtyToDeduct);
        touched = true;
      });

      if (touched) {
        localStorage.setItem("dashit_custom_products", JSON.stringify(custom));
        window.dispatchEvent(new CustomEvent("dashit_products_updated"));
      }
    } catch (e) {
      console.warn("deductInventoryForOrder local mirror error:", e);
    }
  }

  invalidateProductCache();
  return { success: true, count: deducted.length };
}

/* -------------------------------------------------------------------- offers */

export function watchOffers(callback) {
  const db = getDb();
  if (!db) return () => {};
  return onSnapshot(
    query(collection(db, "offers"), where("active", "==", true)),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
}

export async function saveOffer(offer) {
  const db = getDb();
  if (!db) throw new Error("Firestore unavailable");
  const { id, ...data } = offer;
  if (id) {
    await setDoc(doc(db, "offers", String(id)), data, { merge: true });
    return String(id);
  }
  const ref = await addDoc(collection(db, "offers"), {
    ...data,
    active: true,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteOffer(offerId) {
  const db = getDb();
  if (!db) return;
  await deleteDoc(doc(db, "offers", String(offerId)));
}

/* ---------------------------------------------------------------- distributors */

/** Saved distributors on this device, with the old example ones cleared out. */
function readLocalDistributors() {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(localStorage.getItem("dashit_distributors") || "[]");
    const real = stored.filter(isRealDistributor);
    if (real.length !== stored.length) {
      localStorage.setItem("dashit_distributors", JSON.stringify(real));
    }
    return real;
  } catch (e) {
    return [];
  }
}

function withSelfFirst(local, live) {
  const localIds = new Set(local.map((d) => String(d.id)));
  const others = [...local, ...live.filter((d) => isRealDistributor(d) && !localIds.has(String(d.id)))];
  return [SELF_DISTRIBUTOR, ...others];
}

export async function fetchDistributors() {
  let firestoreList = [];
  const db = getDb();
  if (db) {
    try {
      const snap = await getDocs(
        query(collection(db, "distributors"), where("active", "==", true))
      );
      firestoreList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn("fetchDistributors Firestore warning:", e?.message);
    }
  }
  return withSelfFirst(readLocalDistributors(), firestoreList);
}

/** Live list of distributors, always starting with "Myself". */
export function watchDistributors(callback) {
  let currentLive = [];
  const emitMerged = (live = []) => callback(withSelfFirst(readLocalDistributors(), live));

  const db = getDb();
  let unsub = () => {};
  if (db) {
    try {
      unsub = onSnapshot(
        query(collection(db, "distributors"), where("active", "==", true)),
        (snap) => {
          currentLive = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          emitMerged(currentLive);
        },
        (err) => {
          console.warn("watchDistributors snapshot warning:", err?.message);
          emitMerged(currentLive);
        }
      );
    } catch (e) {
      console.warn("watchDistributors init warning:", e?.message);
    }
  }

  let localHandler = null;
  if (typeof window !== "undefined") {
    localHandler = () => emitMerged(currentLive);
    window.addEventListener("dashit_distributors_updated", localHandler);
    window.addEventListener("storage", localHandler);
    setTimeout(() => emitMerged(currentLive), 10);
  }

  return () => {
    if (typeof unsub === "function") unsub();
    if (typeof window !== "undefined" && localHandler) {
      window.removeEventListener("dashit_distributors_updated", localHandler);
      window.removeEventListener("storage", localHandler);
    }
  };
}

export async function upsertDistributor(distributor) {
  const { id, isSelf, ...data } = distributor;
  // "Myself" is built in, not saved.
  if (isSelf || String(id) === SELF_DISTRIBUTOR.id) return SELF_DISTRIBUTOR.id;
  const distId = id ? String(id) : `DIST-${Date.now()}`;
  const itemToSave = { id: distId, active: true, ...data };

  if (typeof window !== "undefined") {
    try {
      const stored = readLocalDistributors();
      const updated = [itemToSave, ...stored.filter((d) => String(d.id) !== distId)];
      localStorage.setItem("dashit_distributors", JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent("dashit_distributors_updated"));
    } catch (e) {
      console.warn("localStorage upsertDistributor error:", e);
    }
  }

  const db = getDb();
  if (db) {
    try {
      const payload = { active: true, ...data, updatedAt: serverTimestamp() };
      await setDoc(doc(db, "distributors", distId), payload, { merge: true });
    } catch (err) {
      /* Kept on this device either way, but the caller has to know the shared
         list did not take it (usually the rules for /distributors are not
         deployed yet), or the owner is told it saved when other devices never
         see it. */
      console.warn("Firestore upsertDistributor warning:", err?.message);
      const error = new Error(err?.message || "The shop's online list didn't accept it.");
      error.savedLocally = true;
      error.distributorId = distId;
      throw error;
    }
  }

  return distId;
}

export async function deleteDistributor(distributorId) {
  const targetId = String(distributorId);
  if (targetId === SELF_DISTRIBUTOR.id) return;
  if (typeof window !== "undefined") {
    try {
      const stored = readLocalDistributors();
      const filtered = stored.filter((d) => String(d.id) !== targetId);
      localStorage.setItem("dashit_distributors", JSON.stringify(filtered));
      window.dispatchEvent(new CustomEvent("dashit_distributors_updated"));
    } catch (e) {}
  }

  const db = getDb();
  if (!db) return;
  try {
    await deleteDoc(doc(db, "distributors", targetId));
  } catch (e) {
    console.warn("deleteDistributor Firestore warning:", e?.message);
  }
}


/* -------------------------------------------------------------------- orders */

/**
 * Human-facing order code, e.g. DSH-4821K7M.
 *
 * The old form was the last 4 digits of Date.now() plus 3 random digits. Those
 * 4 digits repeat every 10 seconds, so two orders placed in the same 10-second
 * window collided with probability ~1/900 — and because the document is written
 * at that id, a collision overwrote a real customer's live order. The random
 * tail is now 3 base-36 characters (46,656 values) drawn from crypto when it is
 * available, and createOrder additionally refuses to write over an existing id.
 */
const randomTail = (len = 3) => {
  const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // no I/L/O/U — unambiguous when read aloud
  let out = "";
  const cryptoObj = typeof globalThis !== "undefined" ? globalThis.crypto : null;
  if (cryptoObj?.getRandomValues) {
    const bytes = new Uint8Array(len);
    cryptoObj.getRandomValues(bytes);
    for (let i = 0; i < len; i += 1) out += alphabet[bytes[i] % alphabet.length];
    return out;
  }
  for (let i = 0; i < len; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
};

export const newOrderCode = () =>
  `DSH-${Date.now().toString().slice(-5)}${randomTail(3)}`;

/**
 * Creates an order directly in Firestore with full sanitization.
 * Rules require status 'Placed' and driverId null on create.
 */
export async function createOrder(orderData, explicitUid = null) {
  const db = getDb();
  if (!db) throw new Error("Firestore unavailable");

  const auth = getFirebaseAuth();
  if (auth && typeof auth.authStateReady === "function") {
    try {
      await auth.authStateReady();
    } catch (e) {}
  }
  let uid = auth?.currentUser?.uid;

  if (!uid && auth) {
    try {
      const { signInAnonymously } = await import("firebase/auth");
      const cred = await signInAnonymously(auth);
      uid = cred?.user?.uid;
    } catch (e) {
      console.warn("Could not ensure anonymous auth for order:", e?.message);
    }
  }

  // Fallback if auth is completely disabled
  if (!uid) {
    uid = explicitUid || (typeof window !== "undefined" ? localStorage.getItem("dashit_client_uid") : null) || "anonymous";
  } else if (typeof window !== "undefined") {
    try {
      localStorage.setItem("dashit_client_uid", uid);
    } catch (e) {}
  }

  const now = new Date().toISOString();

  // Strip all undefined and forbidden properties to guarantee Firestore acceptance
  const sanitized = JSON.parse(JSON.stringify(orderData || {}));
  delete sanitized.inventoryDeducted; // strictly forbidden by rules on create
  delete sanitized.driverId;          // strictly null on create

  const buildPayload = (code) => ({
    ...sanitized,
    orderId: code,
    userId: uid || "anonymous",
    status: ORDER_STATUS.PLACED,
    otp: sanitized.otp ? String(sanitized.otp) : String(Math.floor(1000 + Math.random() * 9000)),
    driverId: null, // Strictly null on creation as required by rules
    driverName: "",
    statusHistory: [
      ...(Array.isArray(sanitized.statusHistory) ? sanitized.statusHistory : []),
      { status: ORDER_STATUS.PLACED, at: now }
    ],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  /* Written with setDoc and NO merge, which is what makes the overwrite
     impossible: firestore.rules classifies a write to an id that already exists
     as an `update`, and the update rule refuses it for a customer. So a code
     collision is rejected by the server rather than silently merging one
     customer's order on top of another's live order. */
  let code = orderData?.orderId || newOrderCode();
  let lastError = null;

  // Pre-checkout stock sanity check against Firestore to prevent overselling
  if (db && Array.isArray(sanitized.items) && sanitized.items.length > 0) {
    try {
      const stockChecks = await Promise.all(
        sanitized.items.map(async (item) => {
          const itemId = String(item.id || item.barcode || "").trim();
          if (!itemId) return null;
          const pRef = doc(db, "products", itemId);
          const pSnap = await getDoc(pRef);
          if (pSnap.exists()) {
            const pData = pSnap.data();
            const avail = Number(pData.stock);
            const reqQty = Number(item.quantity || item.qty) || 1;
            if (pData.active === false) {
              return `${item.name || "Item"} is currently unavailable.`;
            }
            if (!isNaN(avail) && avail < reqQty) {
              return avail <= 0
                ? `${item.name || "Item"} is out of stock.`
                : `Only ${avail} left in stock for ${item.name || "Item"}.`;
            }
          }
          return null;
        })
      );
      const stockIssue = stockChecks.find(Boolean);
      if (stockIssue) {
        throw new Error(stockIssue);
      }
    } catch (stockErr) {
      if (stockErr.message && !stockErr.message.includes("permission-denied")) {
        throw stockErr;
      }
    }
  }

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const payload = buildPayload(code);
    try {
      await setDoc(doc(db, "orders", code), payload);

      // Update local mirror stock so user's client-side catalog reflects it immediately
      if (typeof window !== "undefined") {
        try {
          const custom = JSON.parse(localStorage.getItem("dashit_custom_products") || "[]");
          let touched = false;
          (sanitized.items || []).forEach((item) => {
            const itemId = String(item.id || item.barcode || "");
            const qtyToDeduct = Number(item.quantity || item.qty) || 1;
            const idx = custom.findIndex((p) => String(p.id || p.barcode) === itemId);
            if (idx !== -1) {
              custom[idx].stock = Math.max(0, (Number(custom[idx].stock) || 0) - qtyToDeduct);
              touched = true;
            }
          });
          if (touched) {
            localStorage.setItem("dashit_custom_products", JSON.stringify(custom));
            window.dispatchEvent(new CustomEvent("dashit_products_updated"));
          }
        } catch (e) {}
      }

      return { success: true, orderId: code, order: { ...payload, orderId: code } };
    } catch (e) {
      lastError = e;
      if (e?.code === "already-exists") {
        code = newOrderCode();
        continue;
      }
      throw e;
    }
  }

  throw lastError || new Error("Could not place the order. Please try again.");
}

export async function fetchUserOrders(uid) {
  const db = getDb();
  if (!db || !uid) return [];
  const snap = await getDocs(
    query(
      collection(db, "orders"),
      where("userId", "==", uid),
      orderBy("createdAt", "desc"),
      limit(50)
    )
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Replaces the `join_order_room` + `order_status_changed` socket pair. */
export function watchOrder(orderId, callback) {
  if (!orderId) return () => {};
  let unsubSnapshot = () => {};
  let unsubAuth = () => {};
  let retryTimer = null;
  let isClosed = false;

  const bind = () => {
    if (isClosed) return;
    try { unsubSnapshot(); } catch (e) {}
    const db = getDb();
    if (!db) return;

    try {
      unsubSnapshot = onSnapshot(
        doc(db, "orders", String(orderId)),
        (snap) => {
          if (snap.exists()) {
            callback({ id: snap.id, ...snap.data() });
          } else {
            callback(null);
          }
        },
        (err) => {
          console.warn("watchOrder snapshot error:", err?.message);
          // If auth was initializing or network dropped, retry after short backoff
          if (!isClosed) {
            clearTimeout(retryTimer);
            retryTimer = setTimeout(() => {
              bind();
            }, 2000);
          }
        }
      );
    } catch (e) {
      console.warn("watchOrder exception:", e?.message);
    }
  };

  const auth = getFirebaseAuth();
  if (auth?.currentUser) {
    bind();
  } else if (auth && typeof auth.authStateReady === "function") {
    auth.authStateReady().then(() => {
      if (!isClosed) bind();
    }).catch(() => {
      if (!isClosed) bind();
    });
  } else {
    bind();
  }

  // Re-bind when auth state resolves or changes (e.g. user signs in or restores)
  if (auth) {
    try {
      unsubAuth = onAuthStateChanged(auth, () => {
        if (!isClosed) {
          bind();
        }
      });
    } catch (e) {}
  }

  return () => {
    isClosed = true;
    clearTimeout(retryTimer);
    try { unsubSnapshot(); } catch (e) {}
    try { unsubAuth(); } catch (e) {}
  };
}

/** Admin console: every live order, newest first, with resilient cross-tab local fallback. */
export function watchAllOrders(callback, max = 100) {
  const getLocalOrders = () => {
    if (typeof window !== "undefined") {
      try {
        const hist = JSON.parse(localStorage.getItem("dashit_orders_history") || "[]");
        const active = localStorage.getItem("dashit_active_order");
        let list = [...hist];
        if (active) {
          const parsed = JSON.parse(active);
          if (!list.some((o) => (o.orderId || o.id) === (parsed.orderId || parsed.id))) {
            list = [parsed, ...list];
          }
        }
        return list;
      } catch (e) {}
    }
    return [];
  };

  let unsubFirestore = () => {};
  let unsubAuth = () => {};
  let retryTimer = null;
  let isClosed = false;
  let firestoreLive = false;

  const emitLocal = () => {
    if (firestoreLive) return;
    callback(getLocalOrders());
  };

  const bind = () => {
    if (isClosed) return;
    try { unsubFirestore(); } catch (e) {}
    const db = getDb();
    if (!db) {
      emitLocal();
      return;
    }

    try {
      unsubFirestore = onSnapshot(
        query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(max)),
        (snap) => {
          firestoreLive = true;
          const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          callback(orders);
        },
        (err) => {
          console.warn("watchAllOrders snapshot permission notice (using local orders stream):", err?.message);
          firestoreLive = false;
          emitLocal();
          if (!isClosed) {
            clearTimeout(retryTimer);
            retryTimer = setTimeout(() => {
              bind();
            }, 2500);
          }
        }
      );
    } catch (e) {
      console.warn("watchAllOrders init warning:", e?.message);
      emitLocal();
    }
  };

  const auth = getFirebaseAuth();
  if (auth?.currentUser) {
    bind();
  } else if (auth && typeof auth.authStateReady === "function") {
    auth.authStateReady().then(() => {
      if (!isClosed) bind();
    }).catch(() => {
      if (!isClosed) bind();
    });
  } else {
    bind();
  }

  if (auth) {
    try {
      unsubAuth = onAuthStateChanged(auth, () => {
        if (!isClosed) bind();
      });
    } catch (e) {}
  }

  // Cross-tab and storage sync (only while Firestore is not the source).
  let localHandler = null;
  let bc = null;
  if (typeof window !== "undefined") {
    localHandler = emitLocal;
    window.addEventListener("dashit_orders_updated", localHandler);
    window.addEventListener("storage", localHandler);

    if (window.BroadcastChannel) {
      try {
        bc = new BroadcastChannel("dashit_orders_channel");
        bc.onmessage = emitLocal;
      } catch (e) {}
    }
    // Initial emit, skipped if Firestore already answered.
    setTimeout(emitLocal, 10);
  }

  return () => {
    isClosed = true;
    clearTimeout(retryTimer);
    try { unsubFirestore(); } catch (e) {}
    try { unsubAuth(); } catch (e) {}
    if (typeof window !== "undefined" && localHandler) {
      window.removeEventListener("dashit_orders_updated", localHandler);
      window.removeEventListener("storage", localHandler);
    }
    if (bc) {
      try { bc.close(); } catch (e) {}
    }
  };
}

/** Admin / Ops console: only active unfulfilled orders, client-sorted newest first. */
export function watchActiveOrders(callback, max = 50) {
  const getLocalActive = () => {
    if (typeof window !== "undefined") {
      try {
        const hist = JSON.parse(localStorage.getItem("dashit_orders_history") || "[]");
        const active = localStorage.getItem("dashit_active_order");
        let list = [...hist];
        if (active) {
          const parsed = JSON.parse(active);
          if (!list.some((o) => (o.orderId || o.id) === (parsed.orderId || parsed.id))) {
            list = [parsed, ...list];
          }
        }
        return list.filter(
          (o) =>
            o.status !== ORDER_STATUS.DELIVERED &&
            o.status !== ORDER_STATUS.CANCELLED
        );
      } catch (e) {}
    }
    return [];
  };

  let unsubFirestore = () => {};
  let unsubAuth = () => {};
  let retryTimer = null;
  let isClosed = false;
  let firestoreLive = false;

  const emitLocal = () => {
    if (firestoreLive) return;
    callback(getLocalActive());
  };

  const bind = () => {
    if (isClosed) return;
    try { unsubFirestore(); } catch (e) {}
    const db = getDb();
    if (!db) {
      emitLocal();
      return;
    }

    try {
      unsubFirestore = onSnapshot(
        query(
          collection(db, "orders"),
          where("status", "in", [
            ORDER_STATUS.PLACED,
            ORDER_STATUS.PACKED,
            "Packing",
            ORDER_STATUS.OUT_FOR_DELIVERY,
          ]),
          limit(max)
        ),
        (snap) => {
          firestoreLive = true;
          const orders = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => getOrderTimestampMs(b) - getOrderTimestampMs(a));
          callback(orders);
        },
        (err) => {
          console.warn("watchActiveOrders permission notice (using local):", err?.message);
          firestoreLive = false;
          emitLocal();
          if (!isClosed) {
            clearTimeout(retryTimer);
            retryTimer = setTimeout(() => {
              bind();
            }, 2500);
          }
        }
      );
    } catch (e) {
      emitLocal();
    }
  };

  const auth = getFirebaseAuth();
  if (auth?.currentUser) {
    bind();
  } else if (auth && typeof auth.authStateReady === "function") {
    auth.authStateReady().then(() => {
      if (!isClosed) bind();
    }).catch(() => {
      if (!isClosed) bind();
    });
  } else {
    bind();
  }

  if (auth) {
    try {
      unsubAuth = onAuthStateChanged(auth, () => {
        if (!isClosed) bind();
      });
    } catch (e) {}
  }

  let localHandler = null;
  if (typeof window !== "undefined") {
    localHandler = emitLocal;
    window.addEventListener("dashit_orders_updated", localHandler);
    window.addEventListener("storage", localHandler);
    setTimeout(emitLocal, 10);
  }

  return () => {
    isClosed = true;
    clearTimeout(retryTimer);
    try { unsubFirestore(); } catch (e) {}
    try { unsubAuth(); } catch (e) {}
    if (typeof window !== "undefined" && localHandler) {
      window.removeEventListener("dashit_orders_updated", localHandler);
      window.removeEventListener("storage", localHandler);
    }
  };
}

/** Driver console: only orders assigned to this rider. */
export function watchDriverOrders(driverId, callback) {
  const getLocalDriverOrders = () => {
    if (typeof window !== "undefined") {
      try {
        const hist = JSON.parse(localStorage.getItem("dashit_orders_history") || "[]");
        const active = localStorage.getItem("dashit_active_order");
        let list = [...hist];
        if (active) {
          const parsed = JSON.parse(active);
          if (!list.some((o) => (o.orderId || o.id) === (parsed.orderId || parsed.id))) {
            list = [parsed, ...list];
          }
        }
        return list.filter((o) => driverId && o.driverId === driverId);
      } catch (e) {}
    }
    return [];
  };

  const db = getDb();
  /* With no rider identity there is nothing to show. The local fallback used to
     run here too, and since freshly placed orders carry driverId: null it
     matched a null driverId and showed unassigned orders to a signed-out
     device. */
  if (!driverId) {
    callback([]);
    return () => {};
  }
  let unsub = () => {};
  let unsubAuth = () => {};
  let retryTimer = null;
  let isClosed = false;
  let firestoreLive = false;

  const emitLocal = () => {
    if (firestoreLive) return;
    callback(getLocalDriverOrders());
  };

  const bind = () => {
    if (isClosed) return;
    try { unsub(); } catch (e) {}
    const db = getDb();
    if (!db) {
      emitLocal();
      return;
    }

    try {
      unsub = onSnapshot(
        query(
          collection(db, "orders"),
          where("driverId", "==", driverId),
          where("status", "in", [
            ORDER_STATUS.PLACED,
            ORDER_STATUS.PACKED,
            "Packing",
            ORDER_STATUS.OUT_FOR_DELIVERY,
          ])
        ),
        (snap) => {
          firestoreLive = true;
          callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        },
        (err) => {
          console.warn("watchDriverOrders snapshot warning:", err?.message);
          firestoreLive = false;
          emitLocal();
          if (!isClosed) {
            clearTimeout(retryTimer);
            retryTimer = setTimeout(() => {
              bind();
            }, 2500);
          }
        }
      );
    } catch (e) {
      callback(getLocalDriverOrders());
    }
  };

  const auth = getFirebaseAuth();
  if (auth?.currentUser) {
    bind();
  } else if (auth && typeof auth.authStateReady === "function") {
    auth.authStateReady().then(() => {
      if (!isClosed) bind();
    }).catch(() => {
      if (!isClosed) bind();
    });
  } else {
    bind();
  }

  if (auth) {
    try {
      unsubAuth = onAuthStateChanged(auth, () => {
        if (!isClosed) bind();
      });
    } catch (e) {}
  }

  let localHandler = null;
  if (typeof window !== "undefined") {
    localHandler = emitLocal;
    window.addEventListener("dashit_orders_updated", localHandler);
    window.addEventListener("storage", localHandler);
    setTimeout(emitLocal, 10);
  }

  return () => {
    isClosed = true;
    clearTimeout(retryTimer);
    if (typeof unsub === "function") unsub();
    try { unsubAuth(); } catch (e) {}
    if (typeof window !== "undefined" && localHandler) {
      window.removeEventListener("dashit_orders_updated", localHandler);
      window.removeEventListener("storage", localHandler);
    }
  };
}

/** Driver console: pool of unassigned active orders ready to claim. */
export function watchAvailableOrders(callback) {
  const getLocalUnassigned = () => {
    if (typeof window !== "undefined") {
      try {
        const hist = JSON.parse(localStorage.getItem("dashit_orders_history") || "[]");
        const active = localStorage.getItem("dashit_active_order");
        const list = [...hist];
        if (active) {
          const parsed = JSON.parse(active);
          if (!list.some((o) => (o.orderId || o.id) === (parsed.orderId || parsed.id))) {
            list.unshift(parsed);
          }
        }
        return list.filter(
          (ord) =>
            (!ord.driverId || ord.driverId === "") &&
            ord.status !== ORDER_STATUS.DELIVERED &&
            ord.status !== ORDER_STATUS.CANCELLED
        );
      } catch (e) {}
    }
    return [];
  };

  let unsub = () => {};
  let unsubAuth = () => {};
  let retryTimer = null;
  let isClosed = false;
  // Same rule as watchAllOrders: local events must not overwrite a live snapshot.
  let firestoreLive = false;
  const emitLocal = () => {
    if (firestoreLive) return;
    callback(getLocalUnassigned());
  };

  const bind = () => {
    if (isClosed) return;
    try { unsub(); } catch (e) {}
    const db = getDb();
    if (!db) {
      emitLocal();
      return;
    }

    try {
      unsub = onSnapshot(
        query(
          collection(db, "orders"),
          where("driverId", "==", null),
          where("status", "in", [
            ORDER_STATUS.PLACED,
            ORDER_STATUS.PACKED,
            "Packing",
          ]),
          limit(30)
        ),
        (snap) => {
          firestoreLive = true;
          const unassigned = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((o) => !o.driverId || o.driverId === "");
          callback(unassigned);
        },
        (err) => {
          console.warn("watchAvailableOrders snapshot warning (using local):", err?.message);
          firestoreLive = false;
          emitLocal();
          if (!isClosed) {
            clearTimeout(retryTimer);
            retryTimer = setTimeout(() => {
              bind();
            }, 2500);
          }
        }
      );
    } catch (e) {
      emitLocal();
    }
  };

  const auth = getFirebaseAuth();
  if (auth?.currentUser) {
    bind();
  } else if (auth && typeof auth.authStateReady === "function") {
    auth.authStateReady().then(() => {
      if (!isClosed) bind();
    }).catch(() => {
      if (!isClosed) bind();
    });
  } else {
    bind();
  }

  if (auth) {
    try {
      unsubAuth = onAuthStateChanged(auth, () => {
        if (!isClosed) bind();
      });
    } catch (e) {}
  }

  let localHandler = null;
  if (typeof window !== "undefined") {
    localHandler = emitLocal;
    window.addEventListener("dashit_orders_updated", localHandler);
    window.addEventListener("storage", localHandler);
    setTimeout(emitLocal, 10);
  }

  return () => {
    isClosed = true;
    clearTimeout(retryTimer);
    if (typeof unsub === "function") unsub();
    try { unsubAuth(); } catch (e) {}
    if (typeof window !== "undefined" && localHandler) {
      window.removeEventListener("dashit_orders_updated", localHandler);
      window.removeEventListener("storage", localHandler);
    }
  };
}

/** Terminal states: an order in one of these is finished, not in flight. */
export const FINISHED_STATUSES = ["Delivered", "Cancelled"];

/**
 * Retires a finished order out of the "active order" slot and into history.
 *
 * Nothing used to do this on delivery — only cancellation removed the key — so a
 * completed order stayed the customer's active delivery forever: the live
 * activity kept sitting at the top of the shop, the home screen kept showing the
 * order card, the ongoing notification was never cleared, and every visit to
 * /shop reopened Firestore listeners on an order that had already arrived.
 *
 * Safe to call repeatedly; it does nothing unless the stored active order is the
 * one named and is genuinely finished.
 *
 * @returns {boolean} whether an order was actually retired.
 */
export function retireFinishedOrder(orderId, status) {
  if (typeof window === "undefined") return false;
  const norm = String(status || "").trim().toLowerCase();
  const isFinished = norm.includes("deliver") || norm.includes("cancel");
  if (!isFinished && !FINISHED_STATUSES.includes(status)) return false;

  try {
    const activeRaw = localStorage.getItem("dashit_active_order");
    if (!activeRaw) return false;
    const active = JSON.parse(activeRaw);
    const targetId = String(orderId || active.orderId || active.id || "");
    const matches =
      !orderId ||
      String(active.orderId) === targetId ||
      String(active.id) === targetId;
    if (!matches) return false;

    const finished = {
      ...active,
      status: norm.includes("deliver") ? "Delivered" : "Cancelled",
      completedAt: active.completedAt || new Date().toISOString(),
    };

    // Keep the receipt: history is what /orders reads for past purchases (capped to 20).
    const history = JSON.parse(localStorage.getItem("dashit_orders_history") || "[]");
    const withoutThis = history.filter(
      (o) => String(o.orderId) !== targetId && String(o.id) !== targetId
    );
    localStorage.setItem(
      "dashit_orders_history",
      JSON.stringify([finished, ...withoutThis].slice(0, 20))
    );

    localStorage.removeItem("dashit_active_order");
    if (targetId) {
      localStorage.removeItem(`dashit_tracking_${targetId}`);
      sessionStorage.removeItem(`dashit_tracker_minimized_${targetId}`);
    }
    sessionStorage.removeItem("dashit_tracker_closed");

    /* Tell the docked chrome immediately rather than letting it find out on its
       next poll, so the capsule and the home card disappear together. */
    if (typeof window !== "undefined") {
      window.__dashit_tracker_minimized = false;
      window.dispatchEvent(
        new CustomEvent("dashit_tracker_minimized_changed", {
          detail: { isMinimized: false, hasOrder: false },
        })
      );
    }
    window.dispatchEvent(
      new CustomEvent("dashit_orders_updated", { detail: finished })
    );
    window.dispatchEvent(
      new CustomEvent("dashit_order_updated", { detail: finished })
    );
    window.dispatchEvent(new Event("storage"));
    return true;
  } catch (e) {
    return false;
  }
}

export async function updateOrderStatus(orderId, status, extraFields = {}) {
  // 1. Always update local storage and broadcast first so UI reflects change immediately
  if (typeof window !== "undefined") {
    try {
      const active = localStorage.getItem("dashit_active_order");
      if (active) {
        const ord = JSON.parse(active);
        if (String(ord.orderId) === String(orderId) || String(ord.id) === String(orderId)) {
          ord.status = status;
          ord.updatedAt = new Date().toISOString();
          if (status === ORDER_STATUS.DELIVERED) {
            ord.deliveredAt = new Date().toISOString();
          }
          Object.assign(ord, extraFields);
          localStorage.setItem("dashit_active_order", JSON.stringify(ord));
        }
      }
      const historyStr = localStorage.getItem("dashit_orders_history");
      if (historyStr) {
        const list = JSON.parse(historyStr);
        const updatedList = list.map((o) =>
          String(o.orderId) === String(orderId) || String(o.id) === String(orderId)
            ? { ...o, status, updatedAt: new Date().toISOString(), ...(status === ORDER_STATUS.DELIVERED ? { deliveredAt: new Date().toISOString() } : {}), ...extraFields }
            : o
        );
        localStorage.setItem("dashit_orders_history", JSON.stringify(updatedList));
      }
      window.dispatchEvent(
        new CustomEvent("dashit_orders_updated", { detail: { orderId, status, ...extraFields } })
      );
      window.dispatchEvent(
        new CustomEvent("dashit_order_updated", { detail: { orderId, status, ...extraFields } })
      );
      window.dispatchEvent(new Event("storage"));

      if (window.BroadcastChannel) {
        try {
          const bc = new BroadcastChannel("dashit_orders_channel");
          bc.postMessage({ type: "ORDER_STATUS_UPDATED", orderId, status, ...extraFields });
        } catch (e) {}
      }
    } catch (e) {}
  }

  const db = getDb();
  if (!db) return { success: true, localUpdated: true };

  try {
    const payload = {
      status,
      updatedAt: serverTimestamp(),
      statusHistory: arrayUnion({ status, at: new Date().toISOString() }),
      ...extraFields,
    };
    if (status === ORDER_STATUS.DELIVERED && !payload.deliveredAt) {
      payload.deliveredAt = serverTimestamp();
    }
    await updateDoc(doc(db, "orders", String(orderId)), payload);
    requestOrderPush(orderId);
    return { success: true, firestoreSynced: true };
  } catch (err) {
    console.warn("Firestore updateOrderStatus sync note:", err?.message || err);
    // Local storage & events already succeeded; report firestore failure
    return { success: false, localUpdated: true, firestoreSynced: false, permissionWarning: true, error: err?.message };
  }
}

/**
 * Extract timestamp in milliseconds from an order object reliably,
 * handling Firestore Timestamp, Date, string ISO, or epoch ms.
 */
export function getOrderTimestampMs(order) {
  if (!order) return 0;
  const ts = order?.createdAt ?? order?.timestamp;
  if (!ts) return 0;
  if (typeof ts === "number") return ts;
  if (typeof ts === "string") {
    const parsed = Date.parse(ts);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof ts.toMillis === "function") return ts.toMillis();
  if (typeof ts.seconds === "number") return ts.seconds * 1000;
  if (ts instanceof Date) return ts.getTime();
  return 0;
}

/**
 * Returns remaining seconds (0 to 30) for a newly placed order's grace period.
 */
/** How long a customer can add items or cancel after placing an order. Same as
 * `Order.modifyWindowSeconds` (iOS) and `MODIFY_WINDOW_MS` (Android). */
export const ORDER_CHANGE_WINDOW_SECONDS = 30;

export function getOrderGracePeriodSeconds(order) {
  if (!order) return 0;
  const status = String(order.status || "").toLowerCase();
  if (status && status !== "placed") return 0;

  const orderTime = getOrderTimestampMs(order);
  if (!orderTime) return 0;

  const elapsedSec = Math.floor((Date.now() - orderTime) / 1000);
  return Math.max(0, ORDER_CHANGE_WINDOW_SECONDS - elapsedSec);
}

/**
 * Modifies an existing order's content (items, total, savings) during the grace period.
 */
export async function updateOrderContent(orderId, updatedFields = {}) {
  const targetId = String(orderId);
  const nowIso = new Date().toISOString();

  // 1. Update local storage & broadcast immediately
  if (typeof window !== "undefined") {
    try {
      const activeStr = localStorage.getItem("dashit_active_order");
      if (activeStr) {
        const ord = JSON.parse(activeStr);
        if (String(ord.orderId) === targetId || String(ord.id) === targetId) {
          const merged = { ...ord, ...updatedFields, updatedAt: nowIso };
          localStorage.setItem("dashit_active_order", JSON.stringify(merged));
        }
      }

      const histStr = localStorage.getItem("dashit_orders_history");
      if (histStr) {
        const list = JSON.parse(histStr);
        const updatedList = list.map((o) =>
          String(o.orderId) === targetId || String(o.id) === targetId
            ? { ...o, ...updatedFields, updatedAt: nowIso }
            : o
        );
        localStorage.setItem("dashit_orders_history", JSON.stringify(updatedList));
      }

      window.dispatchEvent(
        new CustomEvent("dashit_orders_updated", { detail: { orderId: targetId, ...updatedFields } })
      );
      window.dispatchEvent(
        new CustomEvent("dashit_order_updated", { detail: { orderId: targetId, ...updatedFields } })
      );
      window.dispatchEvent(new Event("storage"));

      if (window.BroadcastChannel) {
        try {
          const bc = new BroadcastChannel("dashit_orders_channel");
          bc.postMessage({ type: "ORDER_UPDATED", orderId: targetId, ...updatedFields });
        } catch (e) {}
      }
    } catch (e) {
      console.warn("updateOrderContent localStorage error:", e);
    }
  }

  // 2. Sync to Firestore
  const db = getDb();
  if (!db) return { success: true, localUpdated: true };

  try {
    const payload = {
      ...updatedFields,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(doc(db, "orders", targetId), payload);
    if (payload.status) requestOrderPush(targetId);
    return { success: true, firestoreSynced: true };
  } catch (err) {
    console.warn("Firestore updateOrderContent sync note:", err?.message || err);
    return { success: false, localUpdated: true, firestoreSynced: false, error: err?.message };
  }
}

/** Driver claims an unassigned order. */
export async function claimOrder(orderId, driverId, driverName) {
  const applyLocalClaim = () => {
    if (typeof window !== "undefined") {
      try {
        const active = localStorage.getItem("dashit_active_order");
        if (active) {
          const ord = JSON.parse(active);
          if (String(ord.orderId) === String(orderId) || String(ord.id) === String(orderId)) {
            ord.driverId = driverId;
            ord.driverName = driverName || "Delivery Partner";
            ord.status = ORDER_STATUS.OUT_FOR_DELIVERY;
            ord.updatedAt = new Date().toISOString();
            localStorage.setItem("dashit_active_order", JSON.stringify(ord));
          }
        }
        const historyStr = localStorage.getItem("dashit_orders_history");
        if (historyStr) {
          const list = JSON.parse(historyStr);
          const updatedList = list.map((o) =>
            String(o.orderId) === String(orderId) || String(o.id) === String(orderId)
              ? {
                  ...o,
                  driverId,
                  driverName: driverName || "Delivery Partner",
                  status: ORDER_STATUS.OUT_FOR_DELIVERY,
                  updatedAt: new Date().toISOString(),
                }
              : o
          );
          localStorage.setItem("dashit_orders_history", JSON.stringify(updatedList.slice(0, 20)));
        }
        window.dispatchEvent(
          new CustomEvent("dashit_orders_updated", {
            detail: { orderId, status: ORDER_STATUS.OUT_FOR_DELIVERY },
          })
        );
      } catch (e) {}
    }
  };

  const db = getDb();
  if (!db) {
    applyLocalClaim();
    return { success: true, localUpdated: true };
  }

  /* Claiming is a transaction so two riders tapping "Claim" on the same order
     cannot both win: the second read sees a driverId and aborts. */
  try {
    await runTransaction(db, async (tx) => {
      const ref = doc(db, "orders", String(orderId));
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error("ORDER_MISSING");
      const existingDriver = snap.data().driverId;
      if (existingDriver && existingDriver !== driverId) {
        throw new Error("ORDER_ALREADY_CLAIMED");
      }
      tx.update(ref, {
        driverId,
        driverName: driverName || "Delivery Partner",
        status: ORDER_STATUS.OUT_FOR_DELIVERY,
        updatedAt: serverTimestamp(),
        statusHistory: arrayUnion({ status: ORDER_STATUS.OUT_FOR_DELIVERY, at: new Date().toISOString() }),
      });
    });

    // Transaction succeeded: apply local updates safely
    applyLocalClaim();
    requestOrderPush(orderId);
    return { success: true, firestoreSynced: true };
  } catch (err) {
    if (err?.message === "ORDER_ALREADY_CLAIMED") {
      return {
        success: false,
        alreadyClaimed: true,
        message: "Another rider has already picked up this order.",
      };
    }
    console.warn("Firestore claimOrder sync note:", err?.message || err);
    return { success: false, message: err?.message || "Could not claim order" };
  }
}

/**
 * Puts the rider's last known position on a newly assigned order, so the
 * customer's map starts at the rider rather than drawing a route from the
 * store until the rider app's next GPS write. One read and one write, and only
 * a position from the last few minutes is used. Fire and forget.
 */
const RIDER_POSITION_FRESH_MS = 3 * 60 * 1000;
function seedRiderPosition(db, orderId, driverId) {
  getDoc(doc(db, "drivers", String(driverId), "telemetry", "live"))
    .then((snap) => {
      const t = snap.exists() ? snap.data() : null;
      const at = t?.updatedAt?.toMillis?.() || 0;
      if (!t || typeof t.latitude !== "number" || Date.now() - at > RIDER_POSITION_FRESH_MS) return;
      const { latitude, longitude, heading = 0, speed = 0, accuracy = 0 } = t;
      return setDoc(
        doc(db, "orders", String(orderId), "tracking", "live"),
        { latitude, longitude, heading, speed, accuracy, driverId: String(driverId), updatedAt: serverTimestamp() },
        { merge: true }
      );
    })
    .catch((e) => console.warn("Could not copy the rider's position:", e?.message));
}

/** Admin-only: assign a specific driver to an order. */
export async function assignDriver(orderId, driverId, driverName) {
  const isUnassigning = !driverId;
  const targetDriverId = isUnassigning ? null : String(driverId);
  const targetDriverName = isUnassigning ? "" : (driverName || "");

  if (typeof window !== "undefined") {
    try {
      const active = localStorage.getItem("dashit_active_order");
      if (active) {
        const ord = JSON.parse(active);
        if (String(ord.orderId) === String(orderId) || String(ord.id) === String(orderId)) {
          ord.driverId = targetDriverId;
          ord.driverName = targetDriverName;
          ord.assignedAt = isUnassigning ? null : new Date().toISOString();
          localStorage.setItem("dashit_active_order", JSON.stringify(ord));
        }
      }
      const historyStr = localStorage.getItem("dashit_orders_history");
      if (historyStr) {
        const list = JSON.parse(historyStr);
        const updatedList = list.map((o) =>
          String(o.orderId) === String(orderId) || String(o.id) === String(orderId)
            ? { ...o, driverId: targetDriverId, driverName: targetDriverName, assignedAt: isUnassigning ? null : new Date().toISOString() }
            : o
        );
        localStorage.setItem("dashit_orders_history", JSON.stringify(updatedList));
      }
    } catch (e) {}
  }

  const db = getDb();
  if (!db) return { success: true, localUpdated: true };

  try {
    await updateDoc(doc(db, "orders", String(orderId)), {
      driverId: targetDriverId,
      driverName: targetDriverName,
      assignedAt: isUnassigning ? null : serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    if (!isUnassigning) seedRiderPosition(db, orderId, targetDriverId);
    return { success: true, firestoreSynced: true };
  } catch (err) {
    console.warn("Firestore assignDriver sync note:", err?.message || err);
    return { success: true, localUpdated: true, firestoreSynced: false };
  }
}

/* ---------------------------------------------------------------- riders */

/**
 * The rider roster, read from the staff collection.
 *
 * This matters for assignment to work at all. The roster used to be a
 * localStorage list with invented ids like "driver_tariq", while the rider app
 * looks up its work with `where("driverId", "==", <firebase uid>)`. Assigning
 * "Tariq" wrote driverId: "driver_tariq", which matched no real account, so an
 * assigned order never appeared on any rider's phone. Using the staff document
 * id — which IS the uid — makes the two sides line up.
 */
export async function fetchDrivers() {
  const db = getDb();
  if (!db) return [];
  try {
    const snap = await getDocs(
      query(collection(db, "staff"), where("role", "==", "driver"))
    );
    return snap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .filter((d) => d.active !== false)
      .map((d) => ({
        id: d.id, // Firebase uid — what orders.driverId must hold
        name: d.name || d.displayName || d.email?.split("@")[0] || "Rider",
        phone: d.phone || "",
        vehicle: d.vehicle || "Scooter",
        email: d.email || "",
      }));
  } catch (e) {
    console.warn("fetchDrivers warning:", e?.message);
    return [];
  }
}

/**
 * Realtime listener for all drivers registered in Firestore staff.
 * Subscribes to collection(db, "staff") where role == "driver" and active == true.
 */
export function watchDrivers(callback) {
  let unsubFirestore = () => {};
  let unsubAuth = () => {};
  let retryTimer = null;
  let isClosed = false;

  const bind = () => {
    if (isClosed) return;
    try { unsubFirestore(); } catch (e) {}
    const db = getDb();
    if (!db) {
      callback([]);
      return;
    }

    try {
      unsubFirestore = onSnapshot(
        query(collection(db, "staff"), where("role", "==", "driver")),
        (snap) => {
          const staffDrivers = snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .map((d) => ({
              id: d.id,
              name: d.name || d.displayName || d.email?.split("@")[0] || "Rider",
              phone: d.phone || "",
              vehicle: d.vehicle || "Scooter",
              email: d.email || "",
              photo: d.photo || d.photoUrl || "",
              photoUrl: d.photoUrl || d.photo || "",
              active: d.active !== false,
              // "pending": signed up in the driver app, waiting for the owner's approval.
              status: d.status || "",
            }));
          callback(staffDrivers);
        },
        (err) => {
          console.warn("watchDrivers onSnapshot warning:", err?.message);
          if (!isClosed) {
            clearTimeout(retryTimer);
            retryTimer = setTimeout(() => {
              bind();
            }, 3000);
          }
        }
      );
    } catch (e) {
      console.warn("watchDrivers exception:", e?.message);
      callback([]);
    }
  };

  const auth = getFirebaseAuth();
  if (auth?.currentUser) {
    bind();
  } else if (auth && typeof auth.authStateReady === "function") {
    auth.authStateReady().then(() => {
      if (!isClosed) bind();
    }).catch(() => {
      if (!isClosed) bind();
    });
  } else {
    bind();
  }

  if (auth) {
    try {
      unsubAuth = onAuthStateChanged(auth, () => {
        if (!isClosed) bind();
      });
    } catch (e) {}
  }

  return () => {
    isClosed = true;
    clearTimeout(retryTimer);
    try { unsubFirestore(); } catch (e) {}
    try { unsubAuth(); } catch (e) {}
  };
}


/* ------------------------------------------------------- push notifications */

/**
 * Asks the DASHit server to send the push for this order's current status
 * (public/api/push/notify.php): "packing", "on the way", "delivered" to the
 * shopper, "new order" to the store. The server reads the order itself and
 * sends each status once, so calling this after every change is safe.
 * Fire and forget: a missed push never blocks the store or the rider.
 */
export function requestOrderPush(orderId) {
  if (typeof window === "undefined" || !orderId) return;
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user) return;
  user
    .getIdToken()
    .then((idToken) =>
      fetch("https://dashit.co.in/api/push/notify.php", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id_token: idToken, orderId: String(orderId) }),
      })
    )
    .catch((e) => console.warn("Order notification request failed:", e?.message));
}

/* ------------------------------------------------------------ live tracking */

/**
 * Replaces `update_driver_location`. Written to a subcollection doc so a GPS
 * tick does not wake every listener on the parent order document.
 */
export async function pushDriverLocation(orderId, payload) {
  const dataWithTime = { ...payload, updatedAt: new Date().toISOString() };
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(`dashit_tracking_${orderId}`, JSON.stringify(dataWithTime));
      window.dispatchEvent(new CustomEvent("dashit_tracking_updated", { detail: { orderId, ...dataWithTime } }));
    } catch (e) {}
  }

  const db = getDb();
  if (!db) return;
  try {
    await setDoc(
      doc(db, "orders", String(orderId), "tracking", "live"),
      { ...payload, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (e) {
    console.warn("Could not push driver location to Firestore:", e?.message);
  }
}

/**
 * Broadcasts driver live GPS telemetry across the entire active multi-drop queue,
 * updating central driver telemetry as well as all customer order subcollections.
 */
export async function pushDriverTelemetryToQueue(driverId, activeOrderIds = [], telemetry = {}, perOrder = {}) {
  const payload = {
    ...telemetry,
    driverId,
    updatedAt: new Date().toISOString(),
  };

  /* Position and rider identity are shared by the whole queue, but arrival time
     is not: the second drop is always further out than the first. `perOrder`
     carries the fields that differ — etaMinutes, distanceKm, progress — keyed by
     order id, so every customer reads an ETA computed for their own address
     rather than the rider's next stop. */
  const extrasFor = (oId) => (perOrder && perOrder[oId]) || {};

  // 1. Dispatch locally for immediate 0ms UI responsiveness across all active tabs
  if (typeof window !== "undefined") {
    activeOrderIds.forEach((oId, idx) => {
      const itemData = { ...payload, ...extrasFor(oId), orderId: oId, queuePosition: idx };
      try {
        localStorage.setItem(`dashit_tracking_${oId}`, JSON.stringify(itemData));
        window.dispatchEvent(
          new CustomEvent("dashit_tracking_updated", { detail: itemData })
        );
      } catch (e) {}
    });
  }

  // 2. Persist to Firestore
  const db = getDb();
  if (!db) return;

  /*
   * The customer-facing writes are committed on their own.
   *
   * All of this used to go into a single writeBatch together with the rider's
   * own drivers/{id}/telemetry/live document. A Firestore batch is atomic, so
   * one rejected write fails every write in it — and if the drivers/ path is not
   * granted by firestore.rules, that single denial silently took down live
   * tracking for every customer in the queue as well. The two are now
   * independent: a problem with the rider's telemetry document cannot stop the
   * customer seeing their delivery move.
   */
  try {
    if (activeOrderIds.length > 0) {
      const batch = writeBatch(db);
      activeOrderIds.forEach((orderId, idx) => {
        const orderTrackingRef = doc(db, "orders", String(orderId), "tracking", "live");
        batch.set(
          orderTrackingRef,
          {
            ...telemetry,
            ...extrasFor(orderId),
            queuePosition: idx, // 0 = next drop, 1 = the drop after that
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
      });
      await batch.commit();
    }
  } catch (err) {
    console.warn("Could not fan-out tracking to the customers' orders:", err?.message);
  }

  // The rider's own telemetry document, kept separate and non-critical.
  if (driverId) {
    try {
      await setDoc(
        doc(db, "drivers", String(driverId), "telemetry", "live"),
        { ...telemetry, driverId, updatedAt: serverTimestamp() },
        { merge: true }
      );
    } catch (err) {
      console.warn("Could not update rider telemetry document:", err?.message);
    }
  }
}


/** Replaces `driver_location_changed`. */
export function watchOrderTracking(orderId, callback) {
  if (!orderId) return () => {};
  let unsubFirestore = () => {};
  let unsubAuth = () => {};
  let retryTimer = null;
  let isClosed = false;

  const bind = () => {
    if (isClosed) return;
    try { unsubFirestore(); } catch (e) {}
    const db = getDb();
    if (!db) return;

    try {
      unsubFirestore = onSnapshot(
        doc(db, "orders", String(orderId), "tracking", "live"),
        (snap) => {
          if (snap.exists()) {
            callback(snap.data());
          }
        },
        (err) => {
          console.warn("watchOrderTracking Firestore snapshot error:", err?.message);
          if (!isClosed) {
            clearTimeout(retryTimer);
            retryTimer = setTimeout(() => {
              bind();
            }, 2000);
          }
        }
      );
    } catch (e) {
      console.warn("watchOrderTracking exception:", e?.message);
    }
  };

  const auth = getFirebaseAuth();
  if (auth?.currentUser) {
    bind();
  } else if (auth && typeof auth.authStateReady === "function") {
    auth.authStateReady().then(() => {
      if (!isClosed) bind();
    }).catch(() => {
      if (!isClosed) bind();
    });
  } else {
    bind();
  }

  if (auth) {
    try {
      unsubAuth = onAuthStateChanged(auth, () => {
        if (!isClosed) {
          bind();
        }
      });
    } catch (e) {}
  }

  // Also listen for local updates (useful in dev/sandbox or low-connectivity fallback)
  const localHandler = (e) => {
    if (e.detail && (e.detail.orderId === orderId || !e.detail.orderId)) {
      callback(e.detail);
    }
  };

  if (typeof window !== "undefined") {
    window.addEventListener("dashit_tracking_updated", localHandler);
    try {
      const cached = localStorage.getItem(`dashit_tracking_${orderId}`);
      if (cached) callback(JSON.parse(cached));
    } catch (e) {}
  }

  return () => {
    isClosed = true;
    clearTimeout(retryTimer);
    try { unsubFirestore(); } catch (e) {}
    try { unsubAuth(); } catch (e) {}
    if (typeof window !== "undefined") {
      window.removeEventListener("dashit_tracking_updated", localHandler);
    }
  };
}

/* ------------------------------------------------------------ store config */

let memoryStoreConfig = null;
const storeConfigSubscribers = new Set();
let sharedStoreConfigUnsub = null;
let sharedConfigCleanupTimer = null;

function broadcastStoreConfig(cfg) {
  memoryStoreConfig = cfg;
  storeConfigSubscribers.forEach((cb) => {
    try { cb(cfg); } catch (e) {}
  });
}

function startSharedStoreConfigWatcher() {
  if (sharedConfigCleanupTimer) {
    clearTimeout(sharedConfigCleanupTimer);
    sharedConfigCleanupTimer = null;
  }
  if (sharedStoreConfigUnsub) return;

  const db = getDb();
  if (!db) return;
  try {
    sharedStoreConfigUnsub = onSnapshot(
      doc(db, "config", "store"),
      (snap) => {
        broadcastStoreConfig(snap.exists() ? snap.data() : { isOpen: true, highDemand: false });
      },
      (err) => {
        console.warn("watchStoreConfig snapshot error:", err?.message);
      }
    );
  } catch (e) {
    console.warn("watchStoreConfig init error:", e?.message);
  }
}

export function watchStoreConfig(callback) {
  storeConfigSubscribers.add(callback);
  if (memoryStoreConfig) {
    callback(memoryStoreConfig);
  }
  startSharedStoreConfigWatcher();

  return () => {
    storeConfigSubscribers.delete(callback);
    if (storeConfigSubscribers.size === 0) {
      if (sharedConfigCleanupTimer) clearTimeout(sharedConfigCleanupTimer);
      sharedConfigCleanupTimer = setTimeout(() => {
        if (storeConfigSubscribers.size === 0 && typeof sharedStoreConfigUnsub === "function") {
          sharedStoreConfigUnsub();
          sharedStoreConfigUnsub = null;
        }
      }, 30000);
    }
  };
}

export async function setStoreConfig(patch) {
  if (memoryStoreConfig) {
    broadcastStoreConfig({ ...memoryStoreConfig, ...patch });
  }
  const db = getDb();
  if (!db) return;
  await setDoc(
    doc(db, "config", "store"),
    { ...patch, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/* ---------------------------------------------------------------- addresses */

export async function fetchAddresses(uid) {
  const db = getDb();
  if (!db || !uid) return [];
  const snap = await getDocs(collection(db, "users", uid, "addresses"));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function saveAddress(uid, address) {
  const db = getDb();
  if (!db || !uid) return null;
  const { id, ...data } = address;
  if (id) {
    await setDoc(doc(db, "users", uid, "addresses", String(id)), data, {
      merge: true,
    });
    return String(id);
  }
  const ref = await addDoc(collection(db, "users", uid, "addresses"), data);
  return ref.id;
}

/* -------------------------------------------------------------------- stats */

/** Admin dashboard totals, derived client-side (no Cloud Functions on Spark). */
export async function fetchOrderStats() {
  const db = getDb();
  if (!db) return { total: 0, revenue: 0, delivered: 0, active: 0 };
  const snap = await getDocs(
    query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(500))
  );
  const orders = snap.docs.map((d) => d.data());
  return {
    total: orders.length,
    revenue: orders.reduce((sum, o) => sum + (Number(o.total) || 0), 0),
    delivered: orders.filter((o) => o.status === ORDER_STATUS.DELIVERED).length,
    active: orders.filter(
      (o) =>
        o.status !== ORDER_STATUS.DELIVERED && o.status !== ORDER_STATUS.CANCELLED
    ).length,
  };
}
