import test from "node:test";
import assert from "node:assert/strict";
import { DARK_STORE_HUB, DEFAULT_STORE_HUB, adoptStoreLocation, storeLocationOf, storePresetsOf, calculateDeliveryEta } from "../src/lib/deliveryEta.js";

test("nothing set means the built-in store spot", () => {
  adoptStoreLocation({});
  assert.equal(DARK_STORE_HUB.lat, DEFAULT_STORE_HUB.lat);
  assert.equal(storeLocationOf({}), null);
});

test("the shop can move the store, and every distance follows", () => {
  const door = { lat: 33.76, lng: 75.17 };
  adoptStoreLocation({});
  const before = calculateDeliveryEta(door).distanceKm;
  adoptStoreLocation({ storeLat: 33.76, storeLng: 75.17, storeLabel: "Home" });
  assert.equal(DARK_STORE_HUB.name, "Home");
  assert.equal(DARK_STORE_HUB.lat, 33.76);
  const after = calculateDeliveryEta(door).distanceKm;
  assert.ok(after < before, `${after} should be closer than ${before}`);
  assert.equal(after, 0);
  adoptStoreLocation({});
  assert.equal(DARK_STORE_HUB.lat, DEFAULT_STORE_HUB.lat);
});

test("a spot that makes no sense is ignored", () => {
  for (const bad of [{ storeLat: 0, storeLng: 0 }, { storeLat: "x", storeLng: 75 }, { storeLat: 120, storeLng: 75 }, { storeLat: 33 }, { storeLat: null, storeLng: null }]) {
    assert.equal(storeLocationOf(bad), null);
  }
});

test("saved places are cleaned", () => {
  const list = storePresetsOf({
    storePresets: [
      { id: "a", name: "  Home ", lat: 33.7, lng: 75.1, address: "Lal Chowk" },
      { name: "Bad", lat: 0, lng: 0 },
      { lat: 33.8, lng: 75.2 },
    ],
  });
  assert.equal(list.length, 2);
  assert.equal(list[0].name, "Home");
  assert.equal(list[1].name, "Saved place");
});
