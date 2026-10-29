import test from "node:test";
import assert from "node:assert/strict";
import { walletBalance, walletToUse } from "../src/lib/wallet.js";
import { shopRules, SHOP_RULE_DEFAULTS } from "../src/lib/deliveryCharges.js";
import { billForChangedOrder, buildReplacementOrder } from "../src/lib/orderChange.js";

const rules = shopRules({ walletWelcomeAmount: 50, walletMaxPerOrder: 50 });

test("the wallet is off until the shop sets a credit", () => {
  assert.equal(SHOP_RULE_DEFAULTS.walletWelcomeAmount, 0);
  assert.equal(SHOP_RULE_DEFAULTS.walletMaxPerOrder, 0);
  const off = shopRules({});
  assert.equal(walletBalance(off, 0), 0);
  assert.equal(walletToUse(off, 0, 500), 0);
});

test("with a credit set, every customer starts with it", () => {
  const on = shopRules({ walletWelcomeAmount: 50, walletMaxPerOrder: 50 });
  assert.equal(walletBalance(on, 0), 50);
  assert.equal(walletBalance(on, undefined), 50);
});

test("the balance is the credit minus what was used, never below 0", () => {
  assert.equal(walletBalance(rules, 20), 30);
  assert.equal(walletBalance(rules, 50), 0);
  assert.equal(walletBalance(rules, 80), 0);
});

test("the shop's settings change the credit and the per-order limit", () => {
  const custom = shopRules({ walletWelcomeAmount: 100, walletMaxPerOrder: 30 });
  assert.equal(walletBalance(custom, 0), 100);
  assert.equal(walletToUse(custom, 0, 400), 30);
  assert.equal(shopRules({ walletWelcomeAmount: 0 }).walletWelcomeAmount, 0);
  assert.equal(walletBalance(shopRules({ walletWelcomeAmount: 0 }), 0), 0);
});

test("the wallet takes the credit off the whole bill, items included", () => {
  // ₹151 bill (₹100 items + ₹40 delivery + ₹11 handling) with ₹50 of credit: ₹50 comes off, ₹101 is paid.
  assert.equal(walletToUse(rules, 0, 151), 50);
  // A big basket still gets the full credit.
  assert.equal(walletToUse(rules, 0, 900), 50);
});

test("an order uses what it can: the balance, the limit, and never takes the bill below ₹1", () => {
  assert.equal(walletToUse(rules, 0, 250), 50);
  assert.equal(walletToUse(rules, 35, 250), 15);
  assert.equal(walletToUse(rules, 0, 30), 29);
  assert.equal(walletToUse(rules, 0, 1), 0);
  assert.equal(walletToUse(rules, 50, 250), 0);
});

test("adding items keeps the wallet amount and lowers what is left to pay", () => {
  const order = {
    orderId: "DSH-1",
    items: [{ id: "1", price: 100, qty: 1 }],
    subtotal: 100,
    deliveryFee: 40,
    handlingFee: 11,
    discount: 0,
    walletUsed: 50,
    total: 101,
  };
  const items = [{ id: "1", price: 100, qty: 2 }];
  const bill = billForChangedOrder(order, items, null, rules);
  assert.equal(bill.walletUsed, 50);
  const replacement = buildReplacementOrder(order, items, bill);
  assert.equal(replacement.walletUsed, 50);
  assert.equal(replacement.replacesOrderId, "DSH-1");
  assert.equal(bill.total + 50, bill.subtotal + bill.deliveryFee + bill.handlingFee - bill.discount);
});

test("an order that used no wallet carries no wallet field", () => {
  const order = { orderId: "DSH-2", items: [{ id: "1", price: 100, qty: 1 }], subtotal: 100, deliveryFee: 40, handlingFee: 11, total: 151 };
  const bill = billForChangedOrder(order, order.items, null, rules);
  assert.equal(bill.walletUsed, 0);
  assert.equal("walletUsed" in buildReplacementOrder(order, order.items, bill), false);
});

test("money an admin added counts even with no welcome credit", () => {
  const off = shopRules({}); // welcome credit 0, no per-order limit
  // used - bonus = 0 - 100 = -100 spent: ₹100 in the wallet.
  assert.equal(walletBalance(off, -100), 100);
  assert.equal(walletToUse(off, -100, 500), 100);
  // ₹30 of that already used: ₹70 left.
  assert.equal(walletBalance(off, -70), 70);
  // Added money on top of a welcome credit.
  assert.equal(walletBalance(rules, -25), 75);
});

test("a per-order limit of 0 means there is none, and a limit still applies when set", () => {
  assert.equal(walletToUse(shopRules({ walletWelcomeAmount: 200, walletMaxPerOrder: 0 }), 0, 500), 200);
  assert.equal(walletToUse(shopRules({ walletWelcomeAmount: 200, walletMaxPerOrder: 60 }), 0, 500), 60);
});

test("a customer's number is looked up however it was saved", async () => {
  const { mobileVariants } = await import("../src/lib/walletAdmin.js").catch(() => ({ mobileVariants: null }));
  if (!mobileVariants) return; // the lookup file needs the browser build of Firebase
  assert.deepEqual(mobileVariants("98765 43210").sort(), ["+919876543210", "9876543210", "919876543210"].sort());
  assert.deepEqual(mobileVariants("12"), []);
});
