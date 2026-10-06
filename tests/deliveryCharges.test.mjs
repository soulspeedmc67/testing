import test from "node:test";
import assert from "node:assert/strict";

import {
  SHOP_RULE_DEFAULTS,
  shopRules,
  sameShopRules,
  standardDeliveryFee,
  calculateDeliveryCharges,
} from "../src/lib/deliveryCharges.js";

test("with nothing saved, the built-in rules apply", () => {
  assert.deepEqual(shopRules(null), { ...SHOP_RULE_DEFAULTS });
  assert.deepEqual(shopRules({ isOpen: true }), { ...SHOP_RULE_DEFAULTS });
  assert.equal(shopRules(undefined).minOrderValue, 100);
});

test("the built-in delivery fee: 40% under ₹180, ₹35 to ₹299, ₹25 from ₹300", () => {
  const fee = (subtotal) => standardDeliveryFee(subtotal).fee;
  assert.equal(fee(100), 40);
  assert.equal(fee(179), 72);
  assert.equal(fee(180), 35);
  assert.equal(fee(299), 35);
  assert.equal(fee(300), 25);
  assert.equal(fee(2000), 25);
});

test("the shop's saved numbers replace the built-in ones", () => {
  const rules = shopRules({
    minOrderValue: 150,
    handlingFee: 5,
    deliverySmallBelow: 200,
    deliverySmallPercent: 25,
    deliveryMidFee: 30,
    deliveryLowFrom: 500,
    deliveryLowFee: 0,
    freeDeliveryOrders: 2,
  });
  assert.equal(rules.minOrderValue, 150);
  assert.equal(rules.handlingFee, 5);
  assert.equal(standardDeliveryFee(100, rules).fee, 25);
  assert.equal(standardDeliveryFee(200, rules).fee, 30);
  assert.equal(standardDeliveryFee(499, rules).fee, 30);
  assert.equal(standardDeliveryFee(500, rules).fee, 0);
  assert.equal(calculateDeliveryCharges(300, 1, null, rules).fee, 0, "second order is still free");
  assert.equal(calculateDeliveryCharges(300, 2, null, rules).fee, 30, "third order pays");
});

test("a field that is missing, blank, negative or not a number keeps its default", () => {
  const rules = shopRules({ minOrderValue: "", handlingFee: -4, deliveryMidFee: "abc", deliveryLowFee: null });
  assert.equal(rules.minOrderValue, SHOP_RULE_DEFAULTS.minOrderValue);
  assert.equal(rules.handlingFee, SHOP_RULE_DEFAULTS.handlingFee);
  assert.equal(rules.deliveryMidFee, SHOP_RULE_DEFAULTS.deliveryMidFee);
  assert.equal(rules.deliveryLowFee, SHOP_RULE_DEFAULTS.deliveryLowFee);
});

test("0 is a real setting: no minimum, no handling charge, no free first orders", () => {
  const rules = shopRules({ minOrderValue: 0, handlingFee: 0, freeDeliveryOrders: 0 });
  assert.equal(rules.minOrderValue, 0);
  assert.equal(rules.handlingFee, 0);
  assert.equal(calculateDeliveryCharges(400, 0, null, rules).fee, 25, "a first order pays once the offer is ended");
  assert.equal(calculateDeliveryCharges(400, 0, null, rules).isFirstFivePromo, false);
});

test("numbers saved as text still count, and the small-order share stops at 100%", () => {
  const rules = shopRules({ minOrderValue: "250", deliverySmallPercent: 400, freeDeliveryOrders: 3.9 });
  assert.equal(rules.minOrderValue, 250);
  assert.equal(rules.deliverySmallPercent, 100);
  assert.equal(rules.freeDeliveryOrders, 3);
});

test("the first orders are free, and say which order this is", () => {
  const first = calculateDeliveryCharges(120, 0);
  assert.equal(first.fee, 0);
  assert.equal(first.standardFee, 48);
  assert.equal(first.isFirstFivePromo, true);
  assert.equal(first.orderNumber, 1);
  assert.equal(first.freeOrders, 5);
  const sixth = calculateDeliveryCharges(120, 5);
  assert.equal(sixth.fee, 48);
  assert.equal(sixth.isFirstFivePromo, false);
});

test("a free-delivery code waives the fee whatever the order's size", () => {
  assert.equal(calculateDeliveryCharges(120, 9, { code: "FREEDEL" }).fee, 0);
  assert.equal(calculateDeliveryCharges(120, 9, { code: "X", waivesDelivery: true }).fee, 0);
  assert.equal(calculateDeliveryCharges(120, 9, { code: "X" }).fee, 48);
});

test("sameShopRules compares every rule", () => {
  assert.equal(sameShopRules(shopRules(null), SHOP_RULE_DEFAULTS), true);
  assert.equal(sameShopRules(shopRules({ handlingFee: 12 }), SHOP_RULE_DEFAULTS), false);
});
