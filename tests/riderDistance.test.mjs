import test from "node:test";
import assert from "node:assert/strict";
import { riderTrips, summarizeRiders, leftStoreMs, deliveredMs, petrolFor, ridersToCsv, TRIP_GAP_MS } from "../src/lib/riderDistance.js";

const HUB = { lat: 33.7311, lng: 75.1487 };
const T = Date.parse("2026-11-03T06:00:00Z"); // 11:30 am in India
const MIN = 60_000;

const order = (id, { rider = "r1", km = 2, left = T, done = T + 15 * MIN, status = "Delivered", pin = null, history = true } = {}) => ({
  id,
  status,
  driverId: rider,
  driverName: rider === "r1" ? "Bilal" : "Aamir",
  distanceKm: km,
  location: pin,
  deliveredAt: done != null ? new Date(done).toISOString() : undefined,
  statusHistory: history && left != null ? [{ status: "Packed", at: new Date(left - 5 * MIN).toISOString() }, { status: "Out for Delivery", at: new Date(left).toISOString() }] : [],
});

test("one delivery is store to the door and back, by road", () => {
  const [trip] = riderTrips([order("a", { km: 2 })], { hub: HUB });
  assert.equal(trip.deliveries, 1);
  assert.equal(trip.km, 5); // 2 km × 2 × 1.25
  assert.equal(trip.dayKey, "2026-11-03");
});

test("orders taken out together are one trip through both doors", () => {
  const near = { lat: 33.74, lng: 75.15 };
  const far = { lat: 33.75, lng: 75.16 };
  const trips = riderTrips(
    [
      order("a", { km: 1, pin: near, left: T, done: T + 10 * MIN }),
      order("b", { km: 2.4, pin: far, left: T + 3 * MIN, done: T + 20 * MIN }),
    ],
    { hub: HUB }
  );
  assert.equal(trips.length, 1);
  assert.equal(trips[0].deliveries, 2);
  // store→near 1 + near→far (~1.43) + far→store 2.4, × 1.25: well under two round trips (8.5 km).
  assert.ok(trips[0].km > 5.5 && trips[0].km < 6.2, String(trips[0].km));
});

test("orders taken out far apart are separate trips, and only delivered orders with a rider count", () => {
  const trips = riderTrips(
    [
      order("a", { left: T }),
      order("b", { left: T + TRIP_GAP_MS + MIN }),
      order("c", { status: "Cancelled" }),
      order("d", { rider: "" }),
      order("a", { left: T }), // the same order twice (live list + full read)
    ],
    { hub: HUB }
  );
  assert.equal(trips.length, 2);
});

test("old orders with no leave time still count, each as its own trip", () => {
  const trips = riderTrips([order("a", { history: false }), order("b", { history: false })], { hub: HUB });
  assert.equal(trips.length, 2);
  assert.equal(leftStoreMs(order("x", { history: false })), null);
  assert.equal(deliveredMs({ statusHistory: [{ status: "Delivered", at: "2026-11-03T06:30:00Z" }] }), Date.parse("2026-11-03T06:30:00Z"));
});

test("an order with no distance falls back to its pin, or counts as unknown", () => {
  const pinned = order("a", { km: null, pin: { lat: 33.7491, lng: 75.1487 } }); // ~2 km north
  const [trip] = riderTrips([pinned], { hub: HUB });
  assert.ok(trip.km > 4.9 && trip.km < 5.1, String(trip.km));
  const [blind] = riderTrips([order("b", { km: null })], { hub: HUB });
  assert.equal(blind.km, 0);
  assert.equal(blind.unknown, 1);
});

test("riders are summed for a period with petrol at the shop's price and mileage", () => {
  const trips = riderTrips(
    [
      order("a", { km: 2 }),
      order("b", { km: 4, left: T + 60 * MIN, done: T + 80 * MIN }),
      order("c", { rider: "r2", km: 1, left: T - 2 * 86_400_000, done: T - 2 * 86_400_000 + 10 * MIN }),
    ],
    { hub: HUB }
  );
  const cfg = { petrolPrice: 100, bikeMileage: 50 };
  const day = summarizeRiders(trips, { fromKey: "2026-11-03", toKey: "2026-11-03", cfg });
  assert.equal(day.riders.length, 1);
  assert.equal(day.riders[0].name, "Bilal");
  assert.equal(day.riders[0].km, 15); // 5 + 10
  assert.equal(day.riders[0].litres, 0.3);
  assert.equal(day.riders[0].cost, 30);
  const all = summarizeRiders(trips, { cfg, names: { r2: "Aamir K" } });
  assert.equal(all.totals.riders, 2);
  assert.equal(all.totals.km, 17.5);
  assert.equal(all.riders[1].name, "Aamir K");
  assert.equal(petrolFor(45, null).litres, 1); // defaults: 45 km a litre
  assert.match(ridersToCsv(all), /^Rider,Date,Trips/);
});
