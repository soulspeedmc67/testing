import test from "node:test";
import assert from "node:assert/strict";
import { calculateDeliveryEta, adoptEtaSettings, adoptStoreLocation, getHighDemandMinutes, DEFAULT_STORE_HUB } from "../src/lib/deliveryEta.js";
import { shopRules, SHOP_RULE_DEFAULTS } from "../src/lib/deliveryCharges.js";
import { ORDER_CHANGE_WINDOW_SECONDS, adoptOrderChangeSeconds, orderChangeSecondsLeft } from "../src/lib/orderChange.js";

const door = { lat: DEFAULT_STORE_HUB.lat + 0.045, lng: DEFAULT_STORE_HUB.lng }; // about 5 km north

test("nothing set keeps today's delivery times", () => {
  adoptStoreLocation({});
  adoptEtaSettings(shopRules({}));
  // 5 km straight, 6.25 km of road at 18 km/h = 20.8 min; + 3 packing + 3 buffer = 27.
  assert.equal(calculateDeliveryEta(door).etaMinutes, 27);
  assert.equal(getHighDemandMinutes(), 18);
  assert.equal(SHOP_RULE_DEFAULTS.orderChangeSeconds, 30);
});

test("the shop's own numbers change the promised time", () => {
  adoptEtaSettings(shopRules({ etaPackingMinutes: 5, etaSpeedKmh: 30, etaBufferMinutes: 0, etaMinMinutes: 10, highDemandMinutes: 25 }));
  // 6.25 km at 30 km/h = 12.5 min; + 5 packing = 17.5, rounded 18.
  assert.equal(calculateDeliveryEta(door).etaMinutes, 18);
  assert.equal(getHighDemandMinutes(), 25);
  // Close by: never less than the least time.
  assert.equal(calculateDeliveryEta({ lat: DEFAULT_STORE_HUB.lat + 0.001, lng: DEFAULT_STORE_HUB.lng }).etaMinutes, 10);
  adoptEtaSettings(shopRules({}));
});

test("silly numbers are kept in range", () => {
  const rules = shopRules({ etaSpeedKmh: 0, etaPackingMinutes: 500, orderChangeSeconds: 2, highDemandMinutes: 9999 });
  assert.equal(rules.etaSpeedKmh, 5);
  assert.equal(rules.etaPackingMinutes, 60);
  assert.equal(rules.orderChangeSeconds, 10);
  assert.equal(rules.highDemandMinutes, 240);
});

test("the time to change an order follows the shop's setting", () => {
  adoptOrderChangeSeconds(60);
  assert.equal(ORDER_CHANGE_WINDOW_SECONDS, 60);
  const placed = Date.now();
  assert.equal(orderChangeSecondsLeft({ status: "Placed", createdAt: placed }, placed), 60);
  adoptOrderChangeSeconds(30);
  assert.equal(ORDER_CHANGE_WINDOW_SECONDS, 30);
});
