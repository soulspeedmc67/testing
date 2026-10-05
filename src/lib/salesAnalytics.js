/**
 * Sales analytics for the staff console: per-day numbers, a period summary
 * and the shop's lifetime totals, worked out from the order documents.
 *
 * Rules (the iOS admin's `AdminAnalytics.swift` follows the same ones):
 * - A day is a calendar day in India (UTC+5:30), whatever the device's zone.
 * - An order belongs to the day it was placed (`createdAt`).
 * - Sales are the totals of delivered orders: money actually taken.
 *   "Booked" adds the orders still on their way (placed, packed, out).
 * - An order cancelled because it was replaced (items added in the first
 *   30 seconds, cancelReason "Replaced by …") is not an order of its own: the
 *   replacement is. It is left out everywhere, so nothing is counted twice.
 */

const IST_OFFSET_MS = 330 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const num = (v) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

/** Milliseconds since 1970 from a Firestore Timestamp, a Date, an ISO string or a number. */
export function orderTimeMs(order) {
  const v = order?.createdAt ?? order?.placedAt ?? order?.timestamp;
  if (!v) return null;
  if (typeof v === "number") return v < 1e12 ? v * 1000 : v;
  if (typeof v.toMillis === "function") return v.toMillis();
  if (typeof v.toDate === "function") return v.toDate().getTime();
  if (typeof v.seconds === "number") return v.seconds * 1000 + Math.floor((v.nanoseconds || 0) / 1e6);
  if (v instanceof Date) return v.getTime();
  const t = Date.parse(String(v));
  return Number.isFinite(t) ? t : null;
}

/** "2026-10-05": the India calendar day of a moment. */
export function istDayKey(ms) {
  return new Date(ms + IST_OFFSET_MS).toISOString().slice(0, 10);
}

/** The India hour (0-23) of a moment. */
export function istHourOf(ms) {
  return new Date(ms + IST_OFFSET_MS).getUTCHours();
}

/** The day key `back` days before the one holding `nowMs`. */
export function istDayKeyBefore(nowMs, back) {
  return istDayKey(nowMs - back * DAY_MS);
}

export function orderTotal(order) {
  return num(order?.totalAmount ?? order?.total ?? order?.finalTotal ?? order?.grandTotal);
}

const statusOf = (order) => String(order?.status || "").toLowerCase();
export const isDelivered = (order) => statusOf(order) === "delivered";
export const isReplaced = (order) =>
  statusOf(order) === "cancelled" && /^replaced by/i.test(String(order?.cancelReason || order?.rejectionReason || ""));
export const isCancelled = (order) => statusOf(order) === "cancelled" && !isReplaced(order);
export const isPaidOnline = (order) =>
  /online|upi|card|prepaid/i.test(String(order?.paymentMethod || "")) ||
  ["paid", "completed", "captured"].includes(String(order?.paymentStatus || "").toLowerCase());

const itemQty = (item) => Math.max(0, num(item?.qty ?? item?.quantity ?? 1));
const unitsOf = (order) => (Array.isArray(order?.items) ? order.items : []).reduce((s, i) => s + itemQty(i), 0);
const customerOf = (order) => String(order?.userId || order?.mobile || order?.customerPhone || "").trim();

function emptyBucket(key) {
  return {
    key,
    orders: 0, // placed, cancelled ones included
    delivered: 0,
    cancelled: 0,
    pending: 0, // not delivered or cancelled yet
    sales: 0, // ₹ from delivered orders
    booked: 0, // ₹ from delivered + pending orders
    units: 0, // pieces in delivered orders
    deliveryFees: 0, // ₹ of delivery charge in delivered orders
    discounts: 0,
    onlineSales: 0,
    codSales: 0,
  };
}

function add(bucket, order) {
  const total = orderTotal(order);
  bucket.orders += 1;
  if (isCancelled(order)) {
    bucket.cancelled += 1;
    return;
  }
  bucket.booked += total;
  if (!isDelivered(order)) {
    bucket.pending += 1;
    return;
  }
  bucket.delivered += 1;
  bucket.sales += total;
  bucket.units += unitsOf(order);
  bucket.deliveryFees += num(order?.deliveryFee);
  bucket.discounts += num(order?.discount ?? order?.couponDiscount);
  if (isPaidOnline(order)) bucket.onlineSales += total;
  else bucket.codSales += total;
}

/** The orders that count, each with its time; replaced and undated ones are dropped. */
function usable(orders) {
  const out = [];
  for (const order of orders || []) {
    if (!order || isReplaced(order)) continue;
    const ms = orderTimeMs(order);
    if (ms === null) continue;
    out.push({ order, ms });
  }
  return out;
}

/** Same order seen twice (a live snapshot and a one-off read): the later copy wins. */
export function mergeOrders(...lists) {
  const byId = new Map();
  for (const list of lists) {
    for (const o of list || []) {
      const id = String(o?.id || o?.orderId || "");
      if (id) byId.set(id, o);
    }
  }
  return [...byId.values()];
}

/**
 * Every number the analytics screen shows, for orders placed on the days
 * from `fromKey` to `toKey` (inclusive, "YYYY-MM-DD"; null = no limit).
 */
export function summarize(orders, { fromKey = null, toKey = null } = {}) {
  const totals = emptyBucket("total");
  const days = new Map();
  const hours = Array.from({ length: 24 }, (_, hour) => ({ hour, orders: 0 }));
  const products = new Map();
  const customers = new Map();
  let firstMs = null;
  let lastMs = null;

  for (const { order, ms } of usable(orders)) {
    const key = istDayKey(ms);
    if ((fromKey && key < fromKey) || (toKey && key > toKey)) continue;
    if (!days.has(key)) days.set(key, emptyBucket(key));
    add(days.get(key), order);
    add(totals, order);
    if (firstMs === null || ms < firstMs) firstMs = ms;
    if (lastMs === null || ms > lastMs) lastMs = ms;
    if (isCancelled(order)) continue;
    hours[istHourOf(ms)].orders += 1;
    const who = customerOf(order);
    if (who) customers.set(who, (customers.get(who) || 0) + 1);
    if (!isDelivered(order)) continue;
    for (const item of Array.isArray(order.items) ? order.items : []) {
      const name = String(item?.name || "Item").trim();
      const qty = itemQty(item);
      const row = products.get(name) || { name, units: 0, revenue: 0 };
      row.units += qty;
      row.revenue += num(item?.price) * qty;
      products.set(name, row);
    }
  }

  const dayList = [...days.values()].sort((a, b) => (a.key < b.key ? -1 : 1));
  const best = dayList.reduce((top, d) => (d.sales > (top?.sales || 0) ? d : top), null);
  const finished = totals.delivered + totals.cancelled;
  return {
    totals,
    averageOrder: totals.delivered ? totals.sales / totals.delivered : 0,
    cancelRate: finished ? totals.cancelled / finished : 0,
    customers: customers.size,
    repeatCustomers: [...customers.values()].filter((n) => n > 1).length,
    days: dayList,
    bestDay: best && best.sales > 0 ? best : null,
    hours,
    topProducts: [...products.values()].sort((a, b) => b.units - a.units || b.revenue - a.revenue).slice(0, 10),
    firstOrderMs: firstMs,
    lastOrderMs: lastMs,
  };
}

/** One row per day from `fromKey` to `toKey`, days without orders as zeros. */
export function fillDays(days, fromKey, toKey) {
  const byKey = new Map(days.map((d) => [d.key, d]));
  const out = [];
  let ms = Date.parse(`${fromKey}T00:00:00Z`);
  const end = Date.parse(`${toKey}T00:00:00Z`);
  if (!Number.isFinite(ms) || !Number.isFinite(end)) return days;
  // A lifetime range can be long; past ~2 years, days with orders only.
  if ((end - ms) / DAY_MS > 730) return days;
  for (; ms <= end; ms += DAY_MS) {
    const key = new Date(ms).toISOString().slice(0, 10);
    out.push(byKey.get(key) || emptyBucket(key));
  }
  return out;
}

/** The ranges the screens offer: their first and last day keys at `nowMs`. */
export function rangeKeys(range, nowMs = Date.now()) {
  const today = istDayKey(nowMs);
  switch (range) {
    case "today":
      return { fromKey: today, toKey: today };
    case "yesterday": {
      const y = istDayKeyBefore(nowMs, 1);
      return { fromKey: y, toKey: y };
    }
    case "7d":
      return { fromKey: istDayKeyBefore(nowMs, 6), toKey: today };
    case "30d":
      return { fromKey: istDayKeyBefore(nowMs, 29), toKey: today };
    case "month":
      return { fromKey: `${today.slice(0, 7)}-01`, toKey: today };
    default:
      return { fromKey: null, toKey: null }; // lifetime
  }
}

/** Daily rows as CSV text, for the "Download" button. */
export function daysToCsv(days) {
  const head = ["Date", "Orders", "Delivered", "Cancelled", "Pending", "Sales (delivered)", "Booked", "Items sold", "Delivery fees", "Discounts", "Online", "Cash"];
  const rows = days.map((d) => [d.key, d.orders, d.delivered, d.cancelled, d.pending, d.sales, d.booked, d.units, d.deliveryFees, d.discounts, d.onlineSales, d.codSales]);
  return [head, ...rows].map((r) => r.join(",")).join("\n");
}
