import test from "node:test";
import assert from "node:assert/strict";
import {
  nightChargeSettings,
  istHour,
  isNightHours,
  isNightChargeOn,
  nightChargeFor,
  deliveryFeeParts,
  fuelCostFor,
} from "../src/lib/nightCharge.js";

// India is UTC+5:30, so 14:30 UTC is 8 pm in Anantnag.
const at = (istHours, istMinutes = 0) => new Date(Date.UTC(2026, 9, 5, istHours, istMinutes) - 330 * 60 * 1000);

test("the hour is India's, whatever zone the device is in", () => {
  assert.equal(istHour(new Date("2026-10-05T14:30:00Z")), 20);
  assert.equal(istHour(new Date("2026-10-05T18:29:00Z")), 23);
  assert.equal(istHour(new Date("2026-10-05T18:30:00Z")), 0);
});

test("night runs from 8 pm to 6 am", () => {
  assert.equal(isNightHours(at(19, 59)), false);
  assert.equal(isNightHours(at(20, 0)), true);
  assert.equal(isNightHours(at(23, 30)), true);
  assert.equal(isNightHours(at(5, 59)), true);
  assert.equal(isNightHours(at(6, 0)), false);
  assert.equal(isNightHours(at(13, 0)), false);
});

test("with nothing saved the charge is automatic: on at night, off by day", () => {
  assert.equal(nightChargeSettings(undefined).mode, "auto");
  assert.equal(isNightChargeOn({}, at(21)), true);
  assert.equal(isNightChargeOn({}, at(15)), false);
});

test("the shop's switch overrides the clock both ways", () => {
  assert.equal(isNightChargeOn({ nightChargeMode: "on" }, at(15)), true);
  assert.equal(isNightChargeOn({ nightChargeMode: "off" }, at(22)), false);
  assert.equal(isNightChargeOn({ nightChargeMode: "nonsense" }, at(22)), true);
});

test("the charge is by distance, in whole rupees, never under the minimum", () => {
  const night = at(21);
  assert.equal(nightChargeFor(0.8, {}, night), 10);
  assert.equal(nightChargeFor(3, {}, night), 18);
  assert.equal(nightChargeFor(5.2, {}, night), 31);
  assert.equal(nightChargeFor(8, {}, night), 48);
  assert.equal(nightChargeFor(8, { nightChargePerKm: 10, nightChargeMin: 20 }, night), 80);
  assert.equal(nightChargeFor(1, { nightChargePerKm: 10, nightChargeMin: 20 }, night), 20);
});

test("no charge by day, when switched off, or without a distance", () => {
  assert.equal(nightChargeFor(5, {}, at(12)), 0);
  assert.equal(nightChargeFor(5, { nightChargeMode: "off" }, at(22)), 0);
  assert.equal(nightChargeFor(null, {}, at(22)), 0);
  assert.equal(nightChargeFor("abc", {}, at(22)), 0);
  assert.equal(nightChargeFor(5, { nightChargePerKm: 0 }, at(22)), 0);
});

test("petrol for a delivery is the road there and back", () => {
  // 8 km straight is 20 km of road both ways: 20 / 45 litres at ₹107.
  assert.deepEqual(fuelCostFor(8, {}), { roundTripKm: 20, litres: 0.44, cost: 48, perKm: 2.38 });
  assert.equal(fuelCostFor(2, {}).cost, 12);
  assert.equal(fuelCostFor(8, { petrolPrice: 120, bikeMileage: 40 }).cost, 60);
  assert.equal(fuelCostFor(undefined, {}), null);
  // A blank or zero setting falls back to the default instead of dividing by zero.
  assert.equal(fuelCostFor(8, { petrolPrice: 0, bikeMileage: 0 }).cost, 48);
});

test("an order's delivery fee splits into the normal fee and the distance charge inside it", () => {
  assert.deepEqual(deliveryFeeParts({ deliveryFee: 56, nightDeliveryFee: 31 }), { base: 25, night: 31 });
  // First-5-orders free delivery at night: only the distance charge was paid.
  assert.deepEqual(deliveryFeeParts({ deliveryFee: 31, nightDeliveryFee: 31 }), { base: 0, night: 31 });
  // Orders from before the charge, and from builds that don't save it.
  assert.deepEqual(deliveryFeeParts({ deliveryFee: 35 }), { base: 35, night: 0 });
  assert.deepEqual(deliveryFeeParts(null), { base: 0, night: 0 });
  // A share bigger than the fee can't make the normal fee negative.
  assert.deepEqual(deliveryFeeParts({ deliveryFee: 10, nightDeliveryFee: 40 }), { base: 0, night: 10 });
});
