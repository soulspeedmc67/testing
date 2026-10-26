import test from "node:test";
import assert from "node:assert/strict";
import { walletBalance, walletToUse } from "../src/lib/wallet.js";
import { shopRules, SHOP_RULE_DEFAULTS } from "../src/lib/deliveryCharges.js";
import { billForChangedOrder, buildReplacementOrder } from "../src/lib/orderChange.js";

const rules = shopRules({});

test("every customer starts with the ₹50 welcome credit", () => {
  assert.equal(SHOP_RULE_DEFAULTS.walletWelcomeAmount, 50);
  assert.equal(walletBalance(rules, 0), 50);
  assert.equal(walletBalance(rules, undefined), 50);
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

test("an order uses what it can: the balance, the limit, and never more than the bill", () => {
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
