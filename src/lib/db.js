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
} from "firebase/firestore";
import { getDb } from "./firebase";

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
  PACKING: "Packing",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
};

/* ------------------------------------------------------------------ products */

export async function fetchProducts() {
  const db = getDb();
  if (!db) return [];
  const snap = await getDocs(
    query(collection(db, "products"), where("active", "==", true))
  );
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Live catalogue — admin edits appear in the storefront without a refresh. */
export function watchProducts(callback) {
  const db = getDb();
  if (!db) return () => {};
  return onSnapshot(
    query(collection(db, "products"), where("active", "==", true)),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
}

export async function upsertProduct(product) {
  const db = getDb();
  if (!db) throw new Error("Firestore unavailable");
  const { id, ...data } = product;
  /* Every catalogue read filters `active == true` (fetchProducts, watchProducts).
     A caller passing an explicit id (the OFF importer keys new docs by barcode)
     must still default to visible — setDoc(merge) does not carry `addDoc`'s
     default forward, so this has to be set explicitly on both paths. Passing
     `active: false` in `product` still hides it, as intended. */
  const payload = { active: true, ...data, updatedAt: serverTimestamp() };
  if (id) {
    await setDoc(doc(db, "products", String(id)), payload, { merge: true });
    return String(id);
  }
  const ref = await addDoc(collection(db, "products"), {
    ...payload,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function deleteProduct(productId) {
  const db = getDb();
  if (!db) return;
  await deleteDoc(doc(db, "products", String(productId)));
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

/* -------------------------------------------------------------------- orders */

/** Human-facing order code, e.g. DSH-4821. */
const newOrderCode = () =>
  `DSH-${Math.floor(1000 + Math.random() * 9000)}`;

/**
 * Creates an order under a transaction so a colliding code cannot overwrite an
 * existing order. Rules require status 'Placed' and driverId null on create.
 */
export async function createOrder(orderData, uid) {
  const db = getDb();
  if (!db) throw new Error("Firestore unavailable");

  const now = new Date().toISOString();
  let code = newOrderCode();

  await runTransaction(db, async (tx) => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const ref = doc(db, "orders", code);
      const existing = await tx.get(ref);
      if (!existing.exists()) {
        tx.set(ref, {
          ...orderData,
          orderId: code,
          userId: uid,
          status: ORDER_STATUS.PLACED,
          driverId: null,
          driverName: "",
          statusHistory: [{ status: ORDER_STATUS.PLACED, at: now }],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        return;
      }
      code = newOrderCode();
    }
    throw new Error("Could not allocate an order code");
  });

  return { success: true, orderId: code, order: { ...orderData, orderId: code } };
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
  const db = getDb();
  if (!db || !orderId) return () => {};
  return onSnapshot(doc(db, "orders", String(orderId)), (snap) => {
    callback(snap.exists() ? { id: snap.id, ...snap.data() } : null);
  });
}

/** Admin console: every live order, newest first. */
export function watchAllOrders(callback, max = 100) {
  const db = getDb();
  if (!db) return () => {};
  return onSnapshot(
    query(collection(db, "orders"), orderBy("createdAt", "desc"), limit(max)),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
}

/** Driver console: only orders assigned to this rider. */
export function watchDriverOrders(driverId, callback) {
  const db = getDb();
  if (!db || !driverId) return () => {};
  return onSnapshot(
    query(
      collection(db, "orders"),
      where("driverId", "==", driverId),
      where("status", "in", [
        ORDER_STATUS.PLACED,
        ORDER_STATUS.PACKING,
        ORDER_STATUS.OUT_FOR_DELIVERY,
      ])
    ),
    (snap) => callback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
  );
}

export async function updateOrderStatus(orderId, status) {
  const db = getDb();
  if (!db) return { success: false };
  await updateDoc(doc(db, "orders", String(orderId)), {
    status,
    updatedAt: serverTimestamp(),
    statusHistory: arrayUnion({ status, at: new Date().toISOString() }),
  });
  return { success: true };
}

/** Admin-only: rules forbid drivers from assigning themselves. */
export async function assignDriver(orderId, driverId, driverName) {
  const db = getDb();
  if (!db) return { success: false };
  await updateDoc(doc(db, "orders", String(orderId)), {
    driverId,
    driverName: driverName || "",
    updatedAt: serverTimestamp(),
  });
  return { success: true };
}

/* ------------------------------------------------------------ live tracking */

/**
 * Replaces `update_driver_location`. Written to a subcollection doc so a GPS
 * tick does not wake every listener on the parent order document.
 */
export async function pushDriverLocation(orderId, payload) {
  const db = getDb();
  if (!db) return;
  await setDoc(
    doc(db, "orders", String(orderId), "tracking", "live"),
    { ...payload, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/** Replaces `driver_location_changed`. */
export function watchOrderTracking(orderId, callback) {
  const db = getDb();
  if (!db || !orderId) return () => {};
  return onSnapshot(
    doc(db, "orders", String(orderId), "tracking", "live"),
    (snap) => callback(snap.exists() ? snap.data() : null)
  );
}

/* ------------------------------------------------------------ store config */

export function watchStoreConfig(callback) {
  const db = getDb();
  if (!db) return () => {};
  return onSnapshot(doc(db, "config", "store"), (snap) => {
    callback(snap.exists() ? snap.data() : { isOpen: true, highDemand: false });
  });
}

export async function setStoreConfig(patch) {
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
