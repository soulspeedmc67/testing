import {
  collection, doc, getDoc, getDocs, onSnapshot, query, orderBy, setDoc, updateDoc, deleteDoc, serverTimestamp,
} from "firebase/firestore";
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword, signInWithEmailAndPassword } from "firebase/auth";
import { getDb, getFirebaseAuth } from "./firebase";

/**
 * Partner shops: other shop owners who run their own stock on DASHit.
 *
 * A partner is not staff (firestore.rules, "Partners"). His login is mapped by
 * partnerUsers/{uid} to partners/{partnerId}, and everything he can touch lives
 * under that one path: settings, products, and (round 2) shopOrders. The owner
 * reads all of it and alone controls `active`, `maxDeliveryKm`, the location
 * and the commission on partners/{partnerId}.
 *
 * Creating a login, switching one off and resetting a password go through the
 * server (public/api/staff/partner.php): the browser cannot create other
 * people's logins, and must not.
 */

const PARTNER_API = "https://dashit.co.in/api/staff/partner.php";

const dbOrNull = () => getDb();

// ---------------------------------------------------------------- the partner himself

/**
 * Signs a partner in with the email and password DASHit gave him: { ok } or
 * { ok: false, message }. Deliberately NOT the customer sign-in (signInWithEmail),
 * which would also create a customer profile for him.
 */
export async function partnerSignIn(email, password) {
  const auth = getFirebaseAuth();
  if (!auth) return { ok: false, message: "Sign-in isn't available right now. Please try again shortly." };
  const clean = String(email || "").trim().toLowerCase();
  if (!clean || !password) return { ok: false, message: "Enter your email and password." };
  try {
    await signInWithEmailAndPassword(auth, clean, password);
    return { ok: true };
  } catch (e) {
    const code = String(e?.code || "");
    if (code.includes("too-many-requests")) return { ok: false, message: "Too many tries. Wait a few minutes, then try again." };
    if (code.includes("user-disabled")) return { ok: false, message: "This account is switched off. Please contact DASHit." };
    if (code.includes("network")) return { ok: false, message: "No connection. Check your internet and try again." };
    return { ok: false, message: "That email or password isn't right. Check them and try again." };
  }
}

/**
 * Who a signed-in account is as a partner: { partnerId, suspended } or null when
 * the account is not a partner at all. `suspended` is true when the owner has
 * switched him off (the rules then refuse his partner document too).
 */
export async function getPartnerAccess(uid) {
  const db = dbOrNull();
  if (!db || !uid) return null;
  let link;
  try {
    link = await getDoc(doc(db, "partnerUsers", uid));
  } catch (e) {
    return null;
  }
  if (!link.exists()) return null;
  const partnerId = String(link.data().partnerId || "");
  if (!partnerId) return null;
  if (link.data().active === false) return { partnerId, suspended: true };
  try {
    const snap = await getDoc(doc(db, "partners", partnerId));
    if (!snap.exists() || snap.data().active === false) return { partnerId, suspended: true };
  } catch (e) {
    return { partnerId, suspended: true };
  }
  return { partnerId, suspended: false };
}

/** His own partner record (name, area, status). Calls back with null if it can't be read. */
export function watchMyPartner(partnerId, cb) {
  const db = dbOrNull();
  if (!db) return () => {};
  return onSnapshot(
    doc(db, "partners", partnerId),
    (snap) => cb(snap.exists() ? { id: snap.id, ...snap.data() } : null),
    () => cb(null)
  );
}

export function watchMySettings(partnerId, cb) {
  const db = dbOrNull();
  if (!db) return () => {};
  return onSnapshot(
    doc(db, "partners", partnerId, "settings", "shop"),
    (snap) => cb(snap.exists() ? snap.data() : {}),
    () => cb({})
  );
}

/** His stock, live, A to Z. `onError` is told if the list can't be read. */
export function watchMyProducts(partnerId, cb, onError) {
  const db = dbOrNull();
  if (!db) return () => {};
  return onSnapshot(
    query(collection(db, "partners", partnerId, "products"), orderBy("name")),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (e) => onError?.(e)
  );
}

/** Adds (id = null) or changes one item. `data` comes from cleanProduct(). */
export async function saveMyProduct(partnerId, id, data) {
  const db = dbOrNull();
  if (!db) throw new Error("Not connected.");
  if (id) {
    await updateDoc(doc(db, "partners", partnerId, "products", id), { ...data, updatedAt: serverTimestamp() });
    return id;
  }
  const ref = doc(collection(db, "partners", partnerId, "products"));
  await setDoc(ref, { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
  return ref.id;
}

/** Just the number in stock. */
export async function setMyStock(partnerId, id, stock) {
  const db = dbOrNull();
  if (!db) throw new Error("Not connected.");
  const value = Math.max(0, Math.round(Number(stock) * 100) / 100);
  await updateDoc(doc(db, "partners", partnerId, "products", id), { stock: value, updatedAt: serverTimestamp() });
}

export async function deleteMyProduct(partnerId, id) {
  const db = dbOrNull();
  if (!db) throw new Error("Not connected.");
  await deleteDoc(doc(db, "partners", partnerId, "products", id));
}

/** His shop details. Only the fields the rules allow (partnerSettingsOk). */
export async function saveMySettings(partnerId, fields) {
  const db = dbOrNull();
  if (!db) throw new Error("Not connected.");
  const allowed = ["displayName", "tagline", "phone", "whatsapp", "address", "hours", "isOpen", "logoUrl"];
  const data = {};
  for (const k of allowed) if (fields[k] !== undefined) data[k] = fields[k];
  await setDoc(doc(db, "partners", partnerId, "settings", "shop"), { ...data, updatedAt: serverTimestamp() }, { merge: true });
}

/** Changes the signed-in partner's password (asks for the old one first, as Firebase requires). */
export async function changeMyPassword(currentPassword, newPassword) {
  const auth = getFirebaseAuth();
  const user = auth?.currentUser;
  if (!user || !user.email) throw new Error("Please sign in again.");
  if (String(newPassword).length < 8) throw new Error("Use at least 8 characters.");
  try {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
    await updatePassword(user, newPassword);
  } catch (e) {
    const code = String(e?.code || "");
    if (code.includes("wrong-password") || code.includes("invalid-credential")) throw new Error("That is not your current password.");
    if (code.includes("too-many-requests")) throw new Error("Too many tries. Wait a few minutes and try again.");
    throw new Error("Could not change the password. Try again.");
  }
}

// ---------------------------------------------------------------- the owner's side

/** Every partner, A to Z. Calls back with null if the list can't be read. */
export function watchPartners(cb) {
  const db = dbOrNull();
  if (!db) return () => {};
  return onSnapshot(
    query(collection(db, "partners"), orderBy("name")),
    (snap) => cb(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    () => cb(null)
  );
}

/** One partner's stock, read once (the owner's detail view; a refresh button re-reads it). */
export async function loadPartnerProducts(partnerId) {
  const db = dbOrNull();
  if (!db) return [];
  const snap = await getDocs(query(collection(db, "partners", partnerId, "products"), orderBy("name")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** The owner changes what is his to set: maxDeliveryKm, commissionPercent, name, city, address, lat, lng. */
export async function updatePartner(partnerId, fields) {
  const db = dbOrNull();
  if (!db) throw new Error("Not connected.");
  const allowed = ["name", "ownerName", "phone", "city", "address", "lat", "lng", "maxDeliveryKm", "commissionPercent", "notes"];
  const data = {};
  for (const k of allowed) if (fields[k] !== undefined) data[k] = fields[k];
  await updateDoc(doc(db, "partners", partnerId), { ...data, updatedAt: serverTimestamp() });
}

/** The server calls: create / set-active / reset-password. Throws a readable Error on refusal. */
export async function partnerApi(action, body = {}) {
  const auth = getFirebaseAuth();
  const token = await auth?.currentUser?.getIdToken?.();
  if (!token) throw new Error("Please sign in again.");
  let res;
  try {
    res = await fetch(PARTNER_API, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ...body, action }),
    });
  } catch (e) {
    throw new Error("Could not reach the server. Check your connection and try again.");
  }
  let data = null;
  try {
    data = await res.json();
  } catch (e) {}
  if (!res.ok || !data || data.error) throw new Error(data?.error || `The server refused that (${res.status}).`);
  return data;
}
