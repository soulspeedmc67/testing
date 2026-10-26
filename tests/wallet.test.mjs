import test from "node:test";
import assert from "node:assert/strict";
import { walletBalance, walletToUse, walletCoverable } from "../src/lib/wallet.js";
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

test("the wallet only covers the delivery and handling charges, never the items", () => {
  assert.equal(walletCoverable({ deliveryFee: 40, handlingFee: 11 }), 51);
  assert.equal(walletCoverable({ deliveryFee: 0, nightFee: 30, extraFee: 20, handlingFee: 11 }), 61);
  assert.equal(walletCoverable({}), 0);
  // ₹50 of credit, but only ₹31 of charges: it takes off ₹31, however big the items are.
  assert.equal(walletToUse(rules, 0, walletCoverable({ deliveryFee: 20, handlingFee: 11 })), 31);
  // Free delivery: just the handling charge.
  assert.equal(walletToUse(rules, 0, walletCoverable({ deliveryFee: 0, handlingFee: 11 })), 11);
});

test("an order uses what it can: the balance, the limit, and never more than the charges", () => {
  assert.equal(walletToUse(rules, 0, 250), 50);
  assert.equal(walletToUse(rules, 35, 250), 15);
  assert.equal(walletToUse(rules, 0, 30), 30);
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
  // ₹200 of items now pays ₹35 delivery + ₹11 handling = ₹46 of charges: that is all the wallet can cover.
  assert.equal(bill.walletUsed, 46);
  const replacement = buildReplacementOrder(order, items, bill);
  assert.equal(replacement.walletUsed, 46);
  assert.equal(replacement.replacesOrderId, "DSH-1");
  assert.equal(bill.total + 46, bill.subtotal + bill.deliveryFee + bill.handlingFee - bill.discount);
});

test("an order that used no wallet carries no wallet field", () => {
  const order = { orderId: "DSH-2", items: [{ id: "1", price: 100, qty: 1 }], subtotal: 100, deliveryFee: 40, handlingFee: 11, total: 151 };
  const bill = billForChangedOrder(order, order.items, null, rules);
  assert.equal(bill.walletUsed, 0);
  assert.equal("walletUsed" in buildReplacementOrder(order, order.items, bill), false);
});
