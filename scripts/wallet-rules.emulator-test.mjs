/**
 * Tests the wallet part of firestore.rules against the Firestore emulator.
 *
 * Needs `@firebase/rules-unit-testing` (not a project dependency):
 *   npm install --no-save @firebase/rules-unit-testing
 *   npx firebase-tools emulators:exec --only firestore "node scripts/wallet-rules.emulator-test.mjs"
 */
import { readFileSync } from "node:fs";
import { initializeTestEnvironment, assertFails, assertSucceeds } from "@firebase/rules-unit-testing";
import { doc, setDoc, updateDoc, getDoc, deleteDoc, writeBatch, serverTimestamp, increment } from "firebase/firestore";

const env = await initializeTestEnvironment({
  projectId: "dashit-wallet-test",
  firestore: { rules: readFileSync(new URL("../firestore.rules", import.meta.url), "utf8") },
});

let failed = 0;
const check = async (name, expectation) => {
  try {
    await expectation();
    console.log(`  ok   ${name}`);
  } catch (e) {
    failed += 1;
    console.log(`  FAIL ${name}\n       ${String(e.message).split("\n")[0]}`);
  }
};

const asShopper = (uid) =>
  env.authenticatedContext(uid, { firebase: { sign_in_provider: "google.com" } }).firestore();

const seed = async (cfg = {}) => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "config", "store"), { walletWelcomeAmount: 50, walletMaxPerOrder: 50, ...cfg });
  });
};

const orderBody = (uid, extra = {}) => ({
  userId: uid, status: "Placed", driverId: null, createdAt: serverTimestamp(),
  items: [{ id: "1", name: "Milk", qty: 1, price: 100 }], subtotal: 100, deliveryFee: 40, handlingFee: 11, total: 151, totalAmount: 151, finalTotal: 151,
  ...extra,
});

// An order that uses `w` of the wallet, written together with the wallet.
const placeWithWallet = (db, uid, id, w) => {
  const batch = writeBatch(db);
  batch.set(doc(db, "orders", id), orderBody(uid, { walletUsed: w }));
  batch.set(doc(db, "wallets", uid), { used: increment(w), updatedAt: serverTimestamp() }, { merge: true });
  return batch.commit();
};

console.log("orders");
await seed();
await check("an order with no wallet is accepted", async () => {
  await assertSucceeds(setDoc(doc(asShopper("u1"), "orders", "A1"), orderBody("u1")));
});
await check("an order using Rs 50 with the wallet write is accepted", async () => {
  await assertSucceeds(placeWithWallet(asShopper("u2"), "u2", "A2", 50));
});
await check("the same order without the wallet write is refused", async () => {
  await assertFails(setDoc(doc(asShopper("u3"), "orders", "A3"), orderBody("u3", { walletUsed: 50 })));
});
await check("more than the per-order limit is refused", async () => {
  await assertFails(placeWithWallet(asShopper("u4"), "u4", "A4", 60));
});
await check("a fractional or negative amount is refused", async () => {
  await assertFails(placeWithWallet(asShopper("u4"), "u4", "A5", 12.5));
  await assertFails(placeWithWallet(asShopper("u4"), "u4", "A6", -5));
});
await check("a second order can't spend what the first used", async () => {
  await assertFails(placeWithWallet(asShopper("u2"), "u2", "A7", 10));
});
await check("a part use, then the rest, then nothing more", async () => {
  const db = asShopper("u5");
  await assertSucceeds(placeWithWallet(db, "u5", "B1", 20));
  await assertSucceeds(placeWithWallet(db, "u5", "B2", 30));
  await assertFails(placeWithWallet(db, "u5", "B3", 1));
});
await check("the wallet write can't be bigger than the order says", async () => {
  const db = asShopper("u6");
  const batch = writeBatch(db);
  batch.set(doc(db, "orders", "C1"), orderBody("u6", { walletUsed: 10 }));
  batch.set(doc(db, "wallets", "u6"), { used: increment(40), updatedAt: serverTimestamp() }, { merge: true });
  await assertFails(batch.commit());
});
await check("the shop setting 0 turns the wallet off", async () => {
  await seed({ walletWelcomeAmount: 0 });
  await assertFails(placeWithWallet(asShopper("u7"), "u7", "D1", 10));
  await assertSucceeds(setDoc(doc(asShopper("u7"), "orders", "D2"), orderBody("u7")));
});

await check("the credit may be used against the whole bill, not just the charges", async () => {
  await seed({ walletWelcomeAmount: 100, walletMaxPerOrder: 100 });
  await assertSucceeds(placeWithWallet(asShopper("f1"), "f1", "H1", 60));
  await assertFails(placeWithWallet(asShopper("f1"), "f1", "H2", 60)); // only 40 left
  await seed();
});

console.log("wallet document");
await seed();
await placeWithWallet(asShopper("w1"), "w1", "E1", 50);
await check("the owner reads their wallet, another shopper does not", async () => {
  await assertSucceeds(getDoc(doc(asShopper("w1"), "wallets", "w1")));
  await assertFails(getDoc(doc(asShopper("w2"), "wallets", "w1")));
});
await check("used can't be lowered by hand", async () => {
  await assertFails(updateDoc(doc(asShopper("w1"), "wallets", "w1"), { used: 0 }));
});
await check("the wallet can't be deleted", async () => {
  await assertFails(deleteDoc(doc(asShopper("w1"), "wallets", "w1")));
});
await check("a shopper can't make a wallet for someone else", async () => {
  await assertFails(setDoc(doc(asShopper("w2"), "wallets", "w9"), { used: 0 }));
});
await check("a refund with no cancel is refused", async () => {
  await assertFails(updateDoc(doc(asShopper("w1"), "wallets", "w1"), { used: 0, lastRefundOrder: "E1" }));
});
await check("cancelling in the same batch gives the amount back", async () => {
  const db = asShopper("w1");
  const batch = writeBatch(db);
  batch.update(doc(db, "orders", "E1"), { status: "Cancelled", cancelReason: "Customer cancelled", updatedAt: serverTimestamp() });
  batch.update(doc(db, "wallets", "w1"), { used: increment(-50), lastRefundOrder: "E1", updatedAt: serverTimestamp() });
  await assertSucceeds(batch.commit());
  const snap = await getDoc(doc(db, "wallets", "w1"));
  if (snap.data().used !== 0) throw new Error(`used is ${snap.data().used}`);
});
await check("the same order can't be refunded twice", async () => {
  const db = asShopper("w1");
  await placeWithWallet(db, "w1", "E2", 50);
  const again = writeBatch(db);
  again.update(doc(db, "wallets", "w1"), { used: increment(-50), lastRefundOrder: "E1", updatedAt: serverTimestamp() });
  await assertFails(again.commit());
});
await check("a refund for someone else's order is refused", async () => {
  await placeWithWallet(asShopper("w3"), "w3", "F1", 50);
  const db = asShopper("w4");
  await placeWithWallet(db, "w4", "F2", 10);
  const batch = writeBatch(db);
  batch.update(doc(db, "wallets", "w4"), { used: increment(-50), lastRefundOrder: "F1", updatedAt: serverTimestamp() });
  await assertFails(batch.commit());
});

console.log("money an admin adds");
const asAdmin = () => env.authenticatedContext("admin1", { email: "m4k3ditz@gmail.com", email_verified: true, firebase: { sign_in_provider: "google.com" } }).firestore();
await check("an admin can add money, with a record of it", async () => {
  await seed({ walletWelcomeAmount: 0, walletMaxPerOrder: 0 });
  const db = asAdmin();
  const batch = writeBatch(db);
  batch.set(doc(db, "wallets", "g1"), { bonus: increment(100), used: increment(0), updatedAt: serverTimestamp() }, { merge: true });
  batch.set(doc(db, "wallets", "g1", "grants", "x1"), { amount: 100, note: "welcome", at: serverTimestamp() });
  await assertSucceeds(batch.commit());
});
await check("the customer can spend the added money, with no per-order limit when it is 0", async () => {
  await assertSucceeds(placeWithWallet(asShopper("g1"), "g1", "I1", 70));
  await assertSucceeds(placeWithWallet(asShopper("g1"), "g1", "I2", 30));
  await assertFails(placeWithWallet(asShopper("g1"), "g1", "I3", 1));
});
await check("a customer can't add money to their own wallet", async () => {
  await assertFails(setDoc(doc(asShopper("g2"), "wallets", "g2"), { used: 0, bonus: 500 }));
  await assertFails(updateDoc(doc(asShopper("g1"), "wallets", "g1"), { bonus: 999 }));
});
await check("a customer can't read or write the record of grants", async () => {
  await assertFails(getDoc(doc(asShopper("g1"), "wallets", "g1", "grants", "x1")));
  await assertFails(setDoc(doc(asShopper("g1"), "wallets", "g1", "grants", "x2"), { amount: 5 }));
});
await check("a limit per order still applies when one is set", async () => {
  await seed({ walletWelcomeAmount: 0, walletMaxPerOrder: 40 });
  const db = asAdmin();
  await setDoc(doc(db, "wallets", "g3"), { bonus: 100, used: 0 });
  await assertFails(placeWithWallet(asShopper("g3"), "g3", "J1", 60));
  await assertSucceeds(placeWithWallet(asShopper("g3"), "g3", "J2", 40));
});

console.log("adding items (replacement order)");
await seed();
await placeWithWallet(asShopper("r1"), "r1", "G1", 30);
const replace = (db, newId, w) => {
  const batch = writeBatch(db);
  batch.set(doc(db, "orders", newId), orderBody("r1", { walletUsed: w, replacesOrderId: "G1" }));
  batch.update(doc(db, "orders", "G1"), { status: "Cancelled", cancelReason: `Replaced by ${newId}`, updatedAt: serverTimestamp() });
  return batch.commit();
};
await check("a replacement can't carry more than the original used", async () => {
  await assertFails(replace(asShopper("r1"), "G2", 40));
});
await check("a replacement carries the original's amount, wallet untouched", async () => {
  await assertSucceeds(replace(asShopper("r1"), "G2", 30));
  const snap = await getDoc(doc(asShopper("r1"), "wallets", "r1"));
  if (snap.data().used !== 30) throw new Error(`used is ${snap.data().used}`);
});

await env.cleanup();
console.log(failed ? `\n${failed} FAILED` : "\nall passed");
process.exit(failed ? 1 : 0);
