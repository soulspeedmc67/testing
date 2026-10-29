/**
 * The owner's wallet tools: find a customer by mobile number, email or name,
 * and add money to their wallet.
 *
 * Money added this way is `bonus` on `wallets/{uid}`, on top of the shop's
 * welcome credit; every addition is also written to `wallets/{uid}/grants` as a
 * record that can't be changed or removed (firestore.rules). Only an admin can
 * write either. The customer's apps follow it: balance = welcome credit + bonus
 * - used. The same lookups are in the iOS admin (`AdminWalletView.swift`).
 */
import { collection, query, where, getDocs, getDoc, doc, writeBatch, increment, serverTimestamp, limit } from "firebase/firestore";
import { getDb, getFirebaseAuth } from "./firebase";

export const WALLET_GRANT_MAX = 5000;

const asHit = (d) => {
  const data = d.data() || {};
  return {
    uid: d.id,
    name: String(data.name || "").trim(),
    mobile: String(data.mobile || "").trim(),
    email: String(data.email || "").trim(),
  };
};

/** The ways a number may be saved on a profile: as typed, 10 digits, +91 and 91 in front. */
export function mobileVariants(text) {
  const digits = String(text || "").replace(/\D/g, "");
  if (digits.length < 7) return [];
  const last10 = digits.slice(-10);
  return [...new Set([digits, last10, `+91${last10}`, `91${last10}`])].slice(0, 10);
}

/** Customers matching what was typed: a mobile number, an email, or the start of a name. Up to 10. */
export async function findCustomers(text) {
  const db = getDb();
  const q = String(text || "").trim();
  if (!db || q.length < 2) return [];
  const users = collection(db, "users");
  const found = new Map();
  const add = (snap) => snap.docs.forEach((d) => found.set(d.id, asHit(d)));

  if (q.includes("@")) {
    for (const email of new Set([q, q.toLowerCase()])) {
      add(await getDocs(query(users, where("email", "==", email), limit(10))));
    }
  } else if (/^[\d\s+()-]+$/.test(q)) {
    const variants = mobileVariants(q);
    if (variants.length) add(await getDocs(query(users, where("mobile", "in", variants), limit(10))));
  } else {
    // A name: the start of it, as typed and with a capital first letter (names are saved that way).
    const forms = new Set([q, q.charAt(0).toUpperCase() + q.slice(1), q.toLowerCase()]);
    for (const form of forms) {
      add(await getDocs(query(users, where("name", ">=", form), where("name", "<=", `${form}`), limit(10))));
    }
  }
  return [...found.values()].slice(0, 10);
}

/** What a customer's wallet holds now: the money admins added and what they have spent. */
export async function readWallet(uid) {
  const snap = await getDoc(doc(getDb(), "wallets", uid));
  const data = snap.exists() ? snap.data() : {};
  return { bonus: Math.max(0, Math.floor(Number(data.bonus) || 0)), used: Math.max(0, Math.floor(Number(data.used) || 0)) };
}

/** Adds `amount` rupees to the customer's wallet and records it. Throws a sentence for the owner. */
export async function giveWalletMoney(customer, amount, note = "") {
  const whole = Math.floor(Number(amount));
  if (!Number.isFinite(whole) || whole < 1) throw new Error("Enter an amount of ₹1 or more.");
  if (whole > WALLET_GRANT_MAX) throw new Error(`The most you can add at once is ₹${WALLET_GRANT_MAX.toLocaleString("en-IN")}.`);
  const db = getDb();
  const admin = getFirebaseAuth()?.currentUser;
  if (!db || !admin) throw new Error("Please sign in again.");
  const batch = writeBatch(db);
  const wallet = doc(db, "wallets", customer.uid);
  // `used: increment(0)` makes sure the wallet has a `used`, which the customer's own orders add to.
  batch.set(wallet, { bonus: increment(whole), used: increment(0), updatedAt: serverTimestamp() }, { merge: true });
  batch.set(doc(collection(db, "wallets", customer.uid, "grants")), {
    amount: whole,
    note: String(note || "").trim().slice(0, 120),
    by: admin.uid,
    byEmail: admin.email || "",
    customerName: customer.name || "",
    customerMobile: customer.mobile || "",
    at: serverTimestamp(),
  });
  await batch.commit();
  return whole;
}
