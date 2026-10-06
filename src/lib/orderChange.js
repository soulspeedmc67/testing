import { calculateDeliveryCharges, SHOP_RULE_DEFAULTS } from "./deliveryCharges.js";

/**
 * Adding items to an order during its change window.
 *
 * `firestore.rules` never lets a customer edit an order's items or totals; it
 * only lets them cancel an order that is still "Placed". So the website does
 * what the apps do (`OrderUpdater.swift`, `OrderRepository.addItems`): it
 * places an order with everything in it and cancels the original as
 * "Replaced by <id>". This file is the part with no Firestore in it: the
 * window, the merged items, the bill and the new order's fields. The write is
 * `addItemsToOrder` in `db.js`.
 */

/** How long a customer can add items or cancel after placing an order. Same as
 * `Order.modifyWindowSeconds` (iOS) and `MODIFY_WINDOW_MS` (Android). */
export const ORDER_CHANGE_WINDOW_SECONDS = 30;

/* What the shopper is told. The first six are the apps' sentences word for word. */
const MESSAGES = {
  windowClosed: "The 30 seconds are up and the store is packing your order.",
  nothingAdded: "Add at least one item first.",
  notSignedIn: "Please sign in again to change this order.",
  storeStartedPacking: "The store has already started packing, so this order can't be changed now.",
  alreadyPaid: "This order is already paid, so items can't be added to it. Place a new order for anything else.",
  network: "We couldn't reach the store. Check your connection and try again.",
  cancelled: "This order has been cancelled, so items can't be added to it.",
  tooManyItems: "An order can hold up to 100 different items. Place a new order for the rest.",
  billChanged: "This order has just changed. Close this, check your order and try again.",
  cancelTooLate: "The store has already started on this order, so it can't be cancelled here. Message us on WhatsApp and we'll help.",
  refused: "The store couldn't take this change, so your order is as it was. Place a new order for anything else.",
};

export class OrderChangeError extends Error {
  constructor(code) {
    super(MESSAGES[code] || MESSAGES.network);
    this.name = "OrderChangeError";
    this.code = MESSAGES[code] ? code : "network";
  }
}

/**
 * Milliseconds for a saved time, whatever shape it arrives in: a Firestore
 * Timestamp, a Date, an epoch number, an ISO string, or a Timestamp that has
 * been through localStorage ({ seconds }). 0 when there is none.
 */
export function timeMs(value) {
  if (!value) return 0;
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value.seconds === "number") return value.seconds * 1000;
  if (value instanceof Date) return value.getTime();
  return 0;
}

/**
 * When the window to add items or cancel closes: 30 seconds after the order
 * was placed. An order that replaced another keeps the first order's deadline
 * (`modifyWindowEndsAt`), so adding items never buys more time.
 */
export function orderChangeDeadlineMs(order) {
  const carried = timeMs(order?.modifyWindowEndsAt);
  if (carried) return carried;
  const placedAt = timeMs(order?.createdAt ?? order?.timestamp);
  return placedAt ? placedAt + ORDER_CHANGE_WINDOW_SECONDS * 1000 : 0;
}

/** Whole seconds left in the window; 0 once the order has moved past "Placed". */
export function orderChangeSecondsLeft(order, now = Date.now()) {
  if (!order) return 0;
  const status = String(order.status || "").toLowerCase();
  if (status && status !== "placed") return 0;
  const deadline = orderChangeDeadlineMs(order);
  if (!deadline) return 0;
  return Math.min(ORDER_CHANGE_WINDOW_SECONDS, Math.max(0, Math.ceil((deadline - now) / 1000)));
}

/** Paid online: the same test as `saysPaidOnline` in firestore.rules and `isPaidOnline` in the apps. */
export function isPaidOnline(order) {
  return (
    /online|upi|card|prepaid/i.test(String(order?.paymentMethod || "")) ||
    ["paid", "completed", "captured"].includes(String(order?.paymentStatus || "").toLowerCase())
  );
}

/**
 * The order that took this one's place when items were added, or null. The
 * website and both apps cancel the original with "Replaced by <id>".
 */
export function replacementIdOf(order) {
  if (!String(order?.status || "").toLowerCase().includes("cancel")) return null;
  const match = /^replaced by ([A-Za-z0-9_-]+)/i.exec(String(order?.cancelReason || "").trim());
  return match ? match[1] : null;
}

const idOf = (item) => String(item?.id ?? item?.barcode ?? "");
const qtyOf = (item) => Number(item?.qty ?? item?.quantity) || 0;
const rupees = (value) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
};

/** The order's items with the additions in: more of an item already there raises its quantity. */
export function mergeAdditions(items = [], additions = []) {
  const merged = (Array.isArray(items) ? items : []).map((item) => ({ ...item }));
  for (const addition of additions || []) {
    const qty = Math.floor(qtyOf(addition));
    if (qty <= 0) continue;
    const index = merged.findIndex((item) => idOf(item) === idOf(addition));
    if (index < 0) {
      merged.push({ ...addition, qty });
      continue;
    }
    const total = (qtyOf(merged[index]) || 1) + qty;
    merged[index] = { ...merged[index], qty: total };
    if ("quantity" in merged[index]) merged[index].quantity = total;
  }
  return merged;
}

export function itemsSubtotal(items = []) {
  return (items || []).reduce((sum, item) => sum + rupees(item.price) * qtyOf(item), 0);
}

/* The fee as the bill shows it: the normal fee, and the night distance charge
   that checkout saves inside it (`nightDeliveryFee` is its share). */
function deliveryFeeParts(order) {
  const total = Math.max(0, rupees(order?.deliveryFee));
  const night = Math.min(total, Math.max(0, rupees(order?.nightDeliveryFee)));
  return { base: total - night, night };
}

function couponDiscount(order, subtotal, coupon) {
  const saved = Math.max(0, rupees(order?.discount ?? order?.couponDiscount));
  const code = String(order?.couponCode || "").trim().toLowerCase();
  if (code && coupon && String(coupon.code || "").trim().toLowerCase() === code) {
    if (subtotal < (Number(coupon.minOrder) || 0)) return 0;
    return coupon.isPercent || coupon.discountType === "percent"
      ? Math.round(subtotal * ((Number(coupon.discount) || 0) / 100))
      : Math.min(subtotal, Number(coupon.discount) || 0);
  }
  // The code is no longer in the shop's list (or the list hasn't loaded): the
  // order keeps the discount it was placed with.
  return Math.min(saved, subtotal);
}

/**
 * The bill for `order` once it holds `items`, worked out again the way
 * checkout and the apps (`CartBillBreakdown.calculate`) do it:
 *
 * - Delivery charge: the fee for the new item total. Delivery that was free
 *   on the original (the first-orders offer, or a free-delivery code) stays free.
 * - Night distance charge: kept as it was. Same trip, same address. Orders
 *   placed with the distance charge as their whole fee stay that way.
 * - Handling charge: kept.
 * - Discount: the order's code applied to the new item total; `coupon` is that
 *   code from the shop's list, or null when it isn't there.
 *
 * `rules` are the shop's current delivery fees (`shopRules`).
 */
export function billForChangedOrder(order, items, coupon = null, rules = SHOP_RULE_DEFAULTS) {
  const subtotal = itemsSubtotal(items);
  const before = deliveryFeeParts(order);
  const subtotalBefore = rupees(order?.subtotal) || itemsSubtotal(order?.items);
  // What an order this size pays with no offer and no code.
  const standardFee = calculateDeliveryCharges(subtotal, Infinity, null, rules).fee;
  const standardFeeBefore = calculateDeliveryCharges(subtotalBefore, Infinity, null, rules).fee;
  const distanceOnly = before.night > 0 && before.base === 0;
  const deliveryWaived = before.base === 0 && standardFeeBefore > 0;
  const baseDeliveryFee = distanceOnly || deliveryWaived ? 0 : standardFee;

  const handlingFee = rupees(order?.handlingFee ?? rules.handlingFee);
  const discount = couponDiscount(order, subtotal, coupon);
  const deliveryFee = baseDeliveryFee + before.night;
  const total = Math.max(0, subtotal + deliveryFee + handlingFee - discount);

  const mrpSavings = (items || []).reduce((sum, item) => {
    const mrp = rupees(item.originalPrice || item.mrp);
    const price = rupees(item.price);
    return sum + (mrp > price ? (mrp - price) * qtyOf(item) : 0);
  }, 0);

  return {
    subtotal,
    baseDeliveryFee,
    nightDeliveryFee: before.night,
    distanceOnly,
    deliveryFee,
    handlingFee,
    discount,
    total,
    savings: mrpSavings + discount + (distanceOnly ? 0 : standardFee - baseDeliveryFee),
  };
}

/* What the new order takes from the one it replaces: who it is for and where
   it goes. Nothing the store or a rider sets (status, driver, stock flags) and
   nothing tied to the old order's id is carried. */
const CARRIED_FIELDS = [
  "location",
  "landmark",
  "etaMinutes",
  "distanceKm",
  "customerName",
  "mobile",
  "email",
  "receiverContact",
  "paymentMethod",
  "paymentStatus",
  "couponCode",
];

/**
 * The fields of the order that replaces `order`, in the schema checkout
 * writes. `addItemsToOrder` adds the id, the owner, the status, the delivery
 * code and the times, which need Firestore.
 */
export function buildReplacementOrder(order, items, bill, now = new Date()) {
  const carried = {};
  for (const key of CARRIED_FIELDS) {
    if (order?.[key] !== undefined && order[key] !== null) carried[key] = order[key];
  }
  return {
    ...carried,
    date: now.toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
    items,
    subtotal: bill.subtotal,
    deliveryFee: bill.deliveryFee,
    // The night charge is part of the delivery fee; its share is kept beside it.
    ...(bill.nightDeliveryFee > 0 ? { nightDeliveryFee: bill.nightDeliveryFee } : {}),
    handlingFee: bill.handlingFee,
    discount: bill.discount,
    totalAmount: bill.total,
    total: bill.total,
    finalTotal: bill.total,
    savings: bill.savings,
    replacesOrderId: String(order?.orderId || order?.id || ""),
    platform: "web",
  };
}
