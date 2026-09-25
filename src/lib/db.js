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

export function assignDefaultDistributor(p) {
  if (p && p.distributor) return p.distributor;
  const cat = String(p?.cat || "").toLowerCase();
  const brand = String(p?.brand || "").toLowerCase();
  if (cat.includes("dairy") || brand.includes("amul")) return "Amul Valley Dairy Logistics";
  if (cat.includes("bakery") || brand.includes("kandur") || cat.includes("bread")) return "Local Kandur Bakeries";
  if (cat.includes("fruit") || cat.includes("veg") || brand.includes("farm") || brand.includes("orchard")) return "Anantnag Fresh Farm Orchards";
  if (cat.includes("care") || cat.includes("clean") || brand.includes("vim") || brand.includes("surf") || brand.includes("dove")) return "Hindustan Unilever Direct";
  if (cat.includes("instant") || brand.includes("nestle") || brand.includes("maggi") || brand.includes("itc")) return "ITC & Nestlé Supply Hub";
  return "Kashmir Wholesale FMCG";
}

// In-Memory Catalogue Cache with 5-minute TTL & Single Shared Listener
let memoryProductsCache = null;
let memoryProductsCacheTime = 0;
const PRODUCTS_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

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
    distributor: p.distributor || assignDefaultDistributor(p),
  }));
}

export function invalidateProductCache() {
  memoryProductsCache = null;
  memoryProductsCacheTime = 0;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("dashit_products_updated"));
  }
}

export async function fetchProducts(forceRefresh = false) {
  const now = Date.now();
  if (!forceRefresh && memoryProductsCache && (now - memoryProductsCacheTime < PRODUCTS_CACHE_TTL_MS)) {
    return memoryProductsCache;
  }

  let firestoreList = [];
  const db = getDb();
  if (db) {
    try {
      const snap = await getDocs(
        query(collection(db, "products"), where("active", "==", true))
      );
      firestoreList = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    } catch (e) {
      console.warn("fetchProducts Firestore warning:", e?.message);
    }
  }

  const enriched = enrichProducts(firestoreList);
  if (enriched.length > 0) {
    memoryProductsCache = enriched;
    memoryProductsCacheTime = now;
  }
  return enriched;
}

// Single shared Firestore onSnapshot listener for watchProducts
const productSubscribers = new Set();
let sharedProductUnsub = null;
let sharedCurrentLive = [];
let sharedCleanupTimer = null;

function broadcastProducts(list) {
  sharedCurrentLive = list;
  const enriched = enrichProducts(list);
  memoryProductsCache = enriched;
  memoryProductsCacheTime = Date.now();
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
  if (db) {
    try {
      sharedProductUnsub = onSnapshot(
        query(collection(db, "products"), where("active", "==", true)),
        (snap) => {
          const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          broadcastProducts(docs);
        },
        (err) => {
          console.warn("watchProducts snapshot warning:", err?.message);
          if (sharedCurrentLive.length > 0) {
            broadcastProducts(sharedCurrentLive);
          }
        }
      );
    } catch (e) {
      console.warn("watchProducts init warning:", e?.message);
    }
  }

  if (typeof window !== "undefined") {
    const localHandler = () => broadcastProducts(sharedCurrentLive);
    window.addEventListener("dashit_products_updated", localHandler);
    window.addEventListener("storage", localHandler);
  }
}

/** Live catalogue — shares a single Firestore connection across all components */
export function watchProducts(callback) {
  productSubscribers.add(callback);

  // Immediate emit from memory cache or current live data
  if (sharedCurrentLive.length > 0) {
    callback(enrichProducts(sharedCurrentLive));
  } else if (memoryProductsCache && memoryProductsCache.length > 0) {
    callback(memoryProductsCache);
  } else {
    fetchProducts().then((p) => {
      if (productSubscribers.has(callback) && p?.length) {
        callback(p);
      }
    });
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
    // Soft delete then hard delete to ensure real-time query listeners and persistent index reflect removal
    await setDoc(doc(db, "products", targetId), { active: false, deletedAt: serverTimestamp() }, { merge: true });
    await deleteDoc(doc(db, "products", targetId));
  } catch (e) {
    console.warn("deleteProduct Firestore warning:", e?.message);
  }
  invalidateProductCache();
}

/**
 * Adjust stock for a single product (+/- delta or set absolute).
 */
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

/**
 * Bulk stock inward/adjustment for mass barcode imports.
 */
export async function bulkUpdateProductStock(stockUpdates = []) {
  if (!stockUpdates || stockUpdates.length === 0) return { success: true, count: 0 };

  if (typeof window !== "undefined") {
    try {
      const custom = JSON.parse(localStorage.getItem("dashit_custom_products") || "[]");
      stockUpdates.forEach((up) => {
        const id = String(up.id || up.barcode || "");
        const idx = custom.findIndex((p) => String(p.id || p.barcode) === id);
        if (idx !== -1) {
          if (up.newStock !== undefined) {
            custom[idx].stock = Math.max(0, Number(up.newStock));
          } else if (up.qtyToAdd !== undefined) {
            custom[idx].stock = Math.max(0, (Number(custom[idx].stock) || 0) + Number(up.qtyToAdd));
          }
          if (up.product) {
            if (up.product.distributor) custom[idx].distributor = up.product.distributor;
            if (up.product.price !== undefined) custom[idx].price = up.product.price;
            if (up.product.originalPrice !== undefined) custom[idx].originalPrice = up.product.originalPrice;
            if (up.product.cat) custom[idx].cat = up.product.cat;
          }
        } else if (up.product) {
          custom.unshift({
            ...up.product,
            id: id || `PROD-${Date.now()}`,
            stock: Number(up.qtyToAdd || up.newStock || 1),
            active: true,
          });
        }
      });
      localStorage.setItem("dashit_custom_products", JSON.stringify(custom));
      window.dispatchEvent(new CustomEvent("dashit_products_updated"));
    } catch (e) {
      console.warn("bulkUpdateProductStock local error:", e);
    }
  }

  /* Failures are collected per item rather than aborting the loop, and they are
     reported back to the caller. This used to be one try/catch around the whole
     loop that swallowed the error and returned success unconditionally: a write
     rejected by the security rules (a non-admin staff account, an expired
     token) updated only the local mirror while the UI announced a completed
     import, so the owner's device showed stock that no customer could see. */
  const db = getDb();
  const failures = [];
  let written = 0;

  if (db) {
    for (const up of stockUpdates) {
      const id = String(up.id || up.barcode || "");
      if (!id) continue;

      const base = { active: true, updatedAt: serverTimestamp() };
      if (up.product) Object.assign(base, up.product);

      try {
        /* `qtyToAdd` is the shape the barcode inward screen and the CSV importer
           send. Applied as a relative increment inside a transaction so a
           concurrent order deduction is not overwritten. */
        if (up.qtyToAdd !== undefined && up.newStock === undefined && up.calculatedStock === undefined) {
          const delta = Number(up.qtyToAdd) || 0;
          await runTransaction(db, async (tx) => {
            const ref = doc(db, "products", id);
            const snap = await tx.get(ref);
            const current = snap.exists() ? Number(snap.data().stock) || 0 : 0;
            tx.set(ref, { ...base, stock: Math.max(0, current + delta) }, { merge: true });
          });
        } else {
          const payload = { ...base };
          if (up.newStock !== undefined) payload.stock = Math.max(0, Number(up.newStock) || 0);
          else if (up.calculatedStock !== undefined) payload.stock = Math.max(0, Number(up.calculatedStock) || 0);
          await setDoc(doc(db, "products", id), payload, { merge: true });
        }
        written += 1;
      } catch (e) {
        console.warn(`bulkUpdateProductStock failed for ${id}:`, e?.message);
        failures.push({ id, name: up.product?.name || id, reason: e?.message || "Write rejected" });
      }
    }
  }

  return {
    // Local-only is not a server success; say so rather than implying a sync.
    success: failures.length === 0,
    syncedToServer: Boolean(db) && failures.length === 0,
    count: db ? written : 0,
    attempted: stockUpdates.length,
    failures,
  };
  invalidateProductCache();
  return result;
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

export const DEFAULT_DISTRIBUTORS = [
  {
    id: "DIST-KASHMIR-FMCG",
    name: "Kashmir Wholesale FMCG",
    contactPerson: "Bashir Ahmad",
    phone: "+91 94190 12345",
    email: "bashir.fmcg@dashit.store",
    address: "KP Road, Near Bus Stand, Anantnag",
    notes: "Primary supplier for branded packaged goods, snacks, and daily staples.",
    leadTime: "Same Day",
    active: true,
  },
  {
    id: "DIST-AMUL-VALLEY",
    name: "Amul Valley Dairy Logistics",
    contactPerson: "Tariq Mir",
    phone: "+91 97970 54321",
    email: "tariq.amul@dashit.store",
    address: "Industrial Estate, Anantnag",
    notes: "Delivers chilled milk packets, fresh butter, paneer, and curd daily at 6:30 AM.",
    leadTime: "Daily 6:30 AM",
    active: true,
  },
  {
    id: "DIST-KANDUR-BAKERY",
    name: "Local Kandur Bakeries",
    contactPerson: "Ghulam Nabi",
    phone: "+91 91498 76543",
    email: "kandur.orders@dashit.store",
    address: "Reshi Bazar, Anantnag",
    notes: "Traditional artisan Kashmiri bakery: fresh Lavas, Roth, Sheermal, and Bakarkhani.",
    leadTime: "Twice Daily (Morning / Evening)",
    active: true,
  },
  {
    id: "DIST-ANANTNAG-ORCHARDS",
    name: "Anantnag Fresh Farm Orchards",
    contactPerson: "Shabir Lone",
    phone: "+91 99065 11223",
    email: "shabir.orchards@dashit.store",
    address: "Mattan Fruit Mandi, Anantnag",
    notes: "Direct farm fresh apples, seasonal cherries, pears, and fresh valley greens.",
    leadTime: "Next Day 7:00 AM",
    active: true,
  },
  {
    id: "DIST-HUL-DIRECT",
    name: "Hindustan Unilever Direct",
    contactPerson: "Manzoor Dar",
    phone: "+91 94191 88990",
    email: "hul.anantnag@dashit.store",
    address: "Nai Basti, Anantnag",
    notes: "Direct wholesale distributor for soaps, detergents, shampoos, and household essentials.",
    leadTime: "2 Days",
    active: true,
  },
  {
    id: "DIST-ITC-NESTLE",
    name: "ITC & Nestlé Supply Hub",
    contactPerson: "Farooq Shah",
    phone: "+91 96222 33445",
    email: "itc.farooq@dashit.store",
    address: "Bijbehara Highway Link, Anantnag",
    notes: "Instant noodles, chocolates, confectionery, beverages, and wheat flour.",
    leadTime: "Every 2 Days",
    active: true,
  },
];

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

  if (typeof window !== "undefined") {
    try {
      const custom = JSON.parse(localStorage.getItem("dashit_distributors") || "[]");
      if (custom.length > 0) {
        const customIds = new Set(custom.map((c) => String(c.id)));
        return [...custom, ...firestoreList.filter((d) => !customIds.has(String(d.id)))];
      }
    } catch (e) {}
  }

  return firestoreList.length > 0 ? firestoreList : DEFAULT_DISTRIBUTORS;
}

export function watchDistributors(callback) {
  let currentLive = [];

  const emitMerged = (live = []) => {
    let merged = live;
    if (typeof window !== "undefined") {
      try {
        let stored = localStorage.getItem("dashit_distributors");
        if (!stored) {
          localStorage.setItem("dashit_distributors", JSON.stringify(DEFAULT_DISTRIBUTORS));
          stored = JSON.stringify(DEFAULT_DISTRIBUTORS);
        }
        const custom = JSON.parse(stored || "[]");
        if (custom.length > 0) {
          const customIds = new Set(custom.map((c) => String(c.id)));
          merged = [...custom, ...live.filter((d) => !customIds.has(String(d.id)))];
        }
      } catch (e) {}
    }
    if (merged.length === 0) merged = DEFAULT_DISTRIBUTORS;
    callback(merged);
  };

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
  const { id, ...data } = distributor;
  const distId = id ? String(id) : `DIST-${Date.now()}`;
  const itemToSave = { id: distId, active: true, ...data };

  if (typeof window !== "undefined") {
    try {
      const stored = JSON.parse(localStorage.getItem("dashit_distributors") || JSON.stringify(DEFAULT_DISTRIBUTORS));
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
      console.warn("Firestore upsertDistributor warning:", err?.message);
    }
  }

  return distId;
}

export async function deleteDistributor(distributorId) {
  const targetId = String(distributorId);
  if (typeof window !== "undefined") {
    try {
      const stored = JSON.parse(localStorage.getItem("dashit_distributors") || JSON.stringify(DEFAULT_DISTRIBUTORS));
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

export async function updateOrderStatus(orderId, status) {
  // 1. Always update local storage and broadcast first so UI reflects change immediately
  if (typeof window !== "undefined") {
    try {
      const active = localStorage.getItem("dashit_active_order");
      if (active) {
        const ord = JSON.parse(active);
        if (String(ord.orderId) === String(orderId) || String(ord.id) === String(orderId)) {
          ord.status = status;
          ord.updatedAt = new Date().toISOString();
          localStorage.setItem("dashit_active_order", JSON.stringify(ord));
        }
      }
      const historyStr = localStorage.getItem("dashit_orders_history");
      if (historyStr) {
        const list = JSON.parse(historyStr);
        const updatedList = list.map((o) =>
          String(o.orderId) === String(orderId) || String(o.id) === String(orderId)
            ? { ...o, status, updatedAt: new Date().toISOString() }
            : o
        );
        localStorage.setItem("dashit_orders_history", JSON.stringify(updatedList));
      }
      window.dispatchEvent(
        new CustomEvent("dashit_orders_updated", { detail: { orderId, status } })
      );
      window.dispatchEvent(
        new CustomEvent("dashit_order_updated", { detail: { orderId, status } })
      );
      window.dispatchEvent(new Event("storage"));

      if (window.BroadcastChannel) {
        try {
          const bc = new BroadcastChannel("dashit_orders_channel");
          bc.postMessage({ type: "ORDER_STATUS_UPDATED", orderId, status });
        } catch (e) {}
      }
    } catch (e) {}
  }

  const db = getDb();
  if (!db) return { success: true, localUpdated: true };

  try {
    await updateDoc(doc(db, "orders", String(orderId)), {
      status,
      updatedAt: serverTimestamp(),
      statusHistory: arrayUnion({ status, at: new Date().toISOString() }),
    });
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
 * Returns remaining seconds (0 to 60) for a newly placed order's grace period.
 */
export function getOrderGracePeriodSeconds(order) {
  if (!order) return 0;
  const status = String(order.status || "").toLowerCase();
  if (status && status !== "placed") return 0;

  const orderTime = getOrderTimestampMs(order);
  if (!orderTime) return 0;

  const elapsedSec = Math.floor((Date.now() - orderTime) / 1000);
  return Math.max(0, 60 - elapsedSec);
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

/** Admin-only: assign a specific driver to an order. */
export async function assignDriver(orderId, driverId, driverName) {
  if (typeof window !== "undefined") {
    try {
      const active = localStorage.getItem("dashit_active_order");
      if (active) {
        const ord = JSON.parse(active);
        if (String(ord.orderId) === String(orderId) || String(ord.id) === String(orderId)) {
          ord.driverId = driverId;
          ord.driverName = driverName || "";
          localStorage.setItem("dashit_active_order", JSON.stringify(ord));
        }
      }
      const historyStr = localStorage.getItem("dashit_orders_history");
      if (historyStr) {
        const list = JSON.parse(historyStr);
        const updatedList = list.map((o) =>
          String(o.orderId) === String(orderId) || String(o.id) === String(orderId)
            ? { ...o, driverId, driverName: driverName || "" }
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
      driverId,
      driverName: driverName || "",
      updatedAt: serverTimestamp(),
    });
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
            .filter((d) => d.active !== false)
            .map((d) => ({
              id: d.id,
              name: d.name || d.displayName || d.email?.split("@")[0] || "Rider",
              phone: d.phone || "",
              vehicle: d.vehicle || "Scooter",
              email: d.email || "",
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
