import { ROAD_FACTOR, fuelSettings } from "./nightCharge.js";
import { istDayKey } from "./salesAnalytics.js";

/**
 * How far each rider has ridden, and what it cost in petrol, worked out from
 * the delivered orders. Riders' phones only ever saved where they are now
 * (drivers/{uid}/telemetry/live), never the road they took, so the distance
 * comes from the orders themselves; that is also what makes it work for every
 * order since the shop opened.
 *
 * - A trip is the store, each door in the order it was delivered, then back to
 *   the store. Orders a rider took out within TRIP_GAP_MS of each other are one
 *   trip with several stops, not separate round trips.
 * - Store to a door is the order's own `distanceKm` (saved at checkout, from
 *   the store as it was then), or the straight line from the store to the pin.
 *   Door to door is the straight line between the two pins. Every leg is then
 *   × ROAD_FACTOR for the streets, as the per-order petrol figure already is.
 * - Petrol: km ÷ the bike's mileage × the petrol price, from Shop settings.
 * - Only delivered orders with a rider count. A day is an India calendar day,
 *   the day the trip started.
 *
 * The iPhone admin (`AdminRiderDistance.swift`) follows the same rules.
 */

export const TRIP_GAP_MS = 10 * 60 * 1000;

const R_KM = 6371;
function haversineKm(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Milliseconds from a Firestore Timestamp, a Date, an ISO string or a number; null when there is none. */
export function toMs(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return v < 1e12 ? v * 1000 : v;
  if (typeof v.toMillis === "function") return v.toMillis();
  if (typeof v.toDate === "function") return v.toDate().getTime();
  if (typeof v.seconds === "number") return v.seconds * 1000 + Math.floor((v.nanoseconds || 0) / 1e6);
  if (v instanceof Date) return v.getTime();
  const t = Date.parse(String(v));
  return Number.isFinite(t) ? t : null;
}

const historyAt = (order, test) => {
  const list = Array.isArray(order?.statusHistory) ? order.statusHistory : [];
  let best = null;
  for (const entry of list) {
    if (!test(String(entry?.status || "").toLowerCase())) continue;
    const ms = toMs(entry?.at);
    if (ms != null && (best == null || ms < best)) best = ms;
  }
  return best;
};

/** When the order left the store with its rider, if that was recorded. */
export function leftStoreMs(order) {
  return historyAt(order, (s) => s.includes("out for delivery") || s.includes("on the way")) ?? toMs(order?.outForDeliveryAt);
}

/** When it was delivered: its own field, the status history, or its last change. */
export function deliveredMs(order) {
  return toMs(order?.deliveredAt) ?? historyAt(order, (s) => s === "delivered") ?? toMs(order?.updatedAt) ?? toMs(order?.createdAt);
}

function pinOf(order) {
  const loc = order?.location || order?.userAddress || order?.deliveryAddress || null;
  const lat = Number(loc?.lat ?? loc?.latitude);
  const lng = Number(loc?.lng ?? loc?.longitude);
  return Number.isFinite(lat) && Number.isFinite(lng) && (lat !== 0 || lng !== 0) ? { lat, lng } : null;
}

/** Straight-line km from the store to the door: the figure saved at checkout, or from the pin. */
function storeLegKm(order, hub) {
  const saved = Number(order?.distanceKm);
  if (Number.isFinite(saved) && saved > 0) return saved;
  const pin = pinOf(order);
  return pin && hub ? haversineKm(hub, pin) : null;
}

const isDelivered = (order) => String(order?.status || "").toLowerCase() === "delivered";
const riderOf = (order) => String(order?.driverId || "").trim();

/**
 * Every trip each rider made: [{ driverId, driverName, orderIds, deliveries, km,
 * startMs, dayKey, unknown }], `unknown` being the delivered orders in it with
 * no distance and no pin (they add nothing to `km`).
 */
export function riderTrips(orders = [], { hub = null, roadFactor = ROAD_FACTOR, gapMs = TRIP_GAP_MS } = {}) {
  const byRider = new Map();
  const seen = new Set();
  for (const order of orders) {
    const id = String(order?.id || order?.orderId || "");
    if (!isDelivered(order) || !riderOf(order) || (id && seen.has(id))) continue;
    if (id) seen.add(id);
    const left = leftStoreMs(order);
    const done = deliveredMs(order);
    const entry = { order, left, done, start: left ?? done ?? 0 };
    const list = byRider.get(riderOf(order)) || [];
    list.push(entry);
    byRider.set(riderOf(order), list);
  }

  const trips = [];
  for (const [driverId, list] of byRider) {
    list.sort((a, b) => a.start - b.start);
    let current = null;
    const close = () => {
      if (current) trips.push(buildTrip(driverId, current, hub, roadFactor));
      current = null;
    };
    for (const entry of list) {
      // Taken out together: both have a recorded leave time, close to each other.
      const together = current && entry.left != null && current.firstLeft != null && entry.left - current.firstLeft <= gapMs;
      if (!together) {
        close();
        current = { firstLeft: entry.left, entries: [] };
      }
      current.entries.push(entry);
    }
    close();
  }
  return trips.sort((a, b) => a.startMs - b.startMs);
}

function buildTrip(driverId, group, hub, roadFactor) {
  // The doors in the order they were delivered.
  const stops = [...group.entries].sort((a, b) => (a.done ?? a.start) - (b.done ?? b.start));
  const known = stops.filter((s) => storeLegKm(s.order, hub) != null);
  let straight = 0;
  if (known.length > 0) {
    straight += storeLegKm(known[0].order, hub);
    for (let i = 1; i < known.length; i++) {
      const a = pinOf(known[i - 1].order);
      const b = pinOf(known[i].order);
      // Door to door; without both pins, as if back through the store.
      straight += a && b ? haversineKm(a, b) : storeLegKm(known[i - 1].order, hub) + storeLegKm(known[i].order, hub);
    }
    straight += storeLegKm(known[known.length - 1].order, hub);
  }
  const first = stops[0];
  const startMs = first.left ?? first.done ?? 0;
  return {
    driverId,
    driverName: String(stops.find((s) => s.order?.driverName)?.order.driverName || "").trim(),
    orderIds: stops.map((s) => String(s.order?.id || s.order?.orderId || "")),
    deliveries: stops.length,
    km: Math.round(straight * roadFactor * 100) / 100,
    startMs,
    dayKey: startMs ? istDayKey(startMs) : null,
    unknown: stops.length - known.length,
  };
}

/** Petrol for `km`: litres and rupees at the shop's petrol price and the bike's mileage. */
export function petrolFor(km, cfg) {
  const { petrolPrice, mileage } = fuelSettings(cfg);
  const litres = km / mileage;
  return { litres: Math.round(litres * 100) / 100, cost: Math.round(litres * petrolPrice), petrolPrice, mileage };
}

const inRange = (dayKey, fromKey, toKey) => !fromKey || (dayKey && dayKey >= fromKey && dayKey <= toKey);

/**
 * Per rider for a period (day keys, both ends included; none = since the start):
 * [{ driverId, name, trips, deliveries, km, litres, cost, unknown, days: [{ key, trips, deliveries, km, litres, cost }] }],
 * most km first, and the totals.
 */
export function summarizeRiders(trips, { fromKey = null, toKey = null, cfg = null, names = {} } = {}) {
  const riders = new Map();
  for (const trip of trips) {
    if (!inRange(trip.dayKey, fromKey, toKey)) continue;
    const r = riders.get(trip.driverId) || {
      driverId: trip.driverId,
      name: names[trip.driverId] || trip.driverName || "Rider",
      trips: 0,
      deliveries: 0,
      km: 0,
      unknown: 0,
      byDay: new Map(),
    };
    r.trips += 1;
    r.deliveries += trip.deliveries;
    r.km += trip.km;
    r.unknown += trip.unknown;
    const key = trip.dayKey || "unknown";
    const d = r.byDay.get(key) || { key, trips: 0, deliveries: 0, km: 0 };
    d.trips += 1;
    d.deliveries += trip.deliveries;
    d.km += trip.km;
    r.byDay.set(key, d);
    riders.set(trip.driverId, r);
  }
  const round1 = (n) => Math.round(n * 10) / 10;
  const list = [...riders.values()]
    .map(({ byDay, ...r }) => ({
      ...r,
      km: round1(r.km),
      ...petrolFor(r.km, cfg),
      days: [...byDay.values()]
        .sort((a, b) => (a.key < b.key ? 1 : -1))
        .map((d) => ({ ...d, km: round1(d.km), ...petrolFor(d.km, cfg) })),
    }))
    .sort((a, b) => b.km - a.km);
  const km = list.reduce((sum, r) => sum + r.km, 0);
  return {
    riders: list,
    totals: {
      riders: list.length,
      trips: list.reduce((s, r) => s + r.trips, 0),
      deliveries: list.reduce((s, r) => s + r.deliveries, 0),
      km: round1(km),
      ...petrolFor(km, cfg),
      unknown: list.reduce((s, r) => s + r.unknown, 0),
    },
  };
}

/** One row per rider per day, as CSV text, for the "Download" button. */
export function ridersToCsv(summary) {
  const head = ["Rider", "Date", "Trips", "Deliveries", "Km", "Petrol (litres)", "Petrol (Rs)"];
  const rows = [];
  for (const r of summary.riders) {
    for (const d of r.days) rows.push([`"${r.name.replace(/"/g, '""')}"`, d.key, d.trips, d.deliveries, d.km, d.litres, d.cost]);
  }
  return [head, ...rows].map((r) => r.join(",")).join("\n");
}
