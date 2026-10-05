import test from "node:test";
import assert from "node:assert/strict";
import {
  orderTimeMs,
  istDayKey,
  summarize,
  fillDays,
  rangeKeys,
  mergeOrders,
  daysToCsv,
} from "../src/lib/salesAnalytics.js";

// A moment given in India time.
const ist = (day, hour, minute = 0) => Date.UTC(2026, 9, day, hour, minute) - 330 * 60 * 1000;

const order = (id, day, hour, fields = {}) => ({
  id,
  createdAt: { seconds: ist(day, hour) / 1000, nanoseconds: 0 },
  status: "Delivered",
  totalAmount: 200,
  deliveryFee: 25,
  userId: "u1",
  paymentMethod: "Cash on Delivery",
  items: [{ name: "Milk", price: 60, qty: 2 }, { name: "Bread", price: 40, qty: 1 }],
  ...fields,
});

test("dates are read from every shape an order has used", () => {
  const ms = ist(5, 10);
  assert.equal(orderTimeMs({ createdAt: { toMillis: () => ms } }), ms);
  assert.equal(orderTimeMs({ createdAt: { seconds: ms / 1000 } }), ms);
  assert.equal(orderTimeMs({ createdAt: new Date(ms).toISOString() }), ms);
  assert.equal(orderTimeMs({ createdAt: ms }), ms);
  assert.equal(orderTimeMs({ createdAt: ms / 1000 }), ms);
  assert.equal(orderTimeMs({}), null);
});

test("a day is India's: 11:59 pm and 12:01 am fall on different days", () => {
  assert.equal(istDayKey(ist(5, 23, 59)), "2026-10-05");
  assert.equal(istDayKey(ist(6, 0, 1)), "2026-10-06");
});

test("sales are delivered orders; cancelled and replaced ones are kept apart", () => {
  const orders = [
    order("a", 5, 10),
    order("b", 5, 11, { status: "Out for Delivery", totalAmount: 150 }),
    order("c", 5, 12, { status: "Cancelled", cancelReason: "Customer asked" }),
    order("d", 5, 13, { status: "Cancelled", cancelReason: "Replaced by e" }),
    order("e", 5, 13, { totalAmount: 300, paymentMethod: "Paid online", userId: "u2" }),
    order("f", 6, 9),
  ];
  const s = summarize(orders, { fromKey: "2026-10-05", toKey: "2026-10-05" });
  assert.equal(s.totals.orders, 4); // the replaced one is not an order of its own
  assert.equal(s.totals.delivered, 2);
  assert.equal(s.totals.cancelled, 1);
  assert.equal(s.totals.pending, 1);
  assert.equal(s.totals.sales, 500);
  assert.equal(s.totals.booked, 650);
  assert.equal(s.totals.onlineSales, 300);
  assert.equal(s.totals.codSales, 200);
  assert.equal(s.totals.units, 6);
  assert.equal(s.averageOrder, 250);
  assert.equal(s.customers, 2);
  assert.equal(s.topProducts[0].name, "Milk");
  assert.equal(s.topProducts[0].units, 4);
  assert.equal(s.hours[10].orders, 1);
});

test("lifetime takes every day; the best day is the one with most sales", () => {
  const s = summarize([order("a", 5, 10), order("b", 6, 9, { totalAmount: 900 }), order("c", 6, 9, { userId: "u1" })]);
  assert.equal(s.days.length, 2);
  assert.equal(s.bestDay.key, "2026-10-06");
  assert.equal(s.totals.sales, 1300);
  assert.equal(s.repeatCustomers, 1);
});

test("empty days are filled in as zeros", () => {
  const s = summarize([order("a", 3, 10)]);
  const days = fillDays(s.days, "2026-10-01", "2026-10-05");
  assert.deepEqual(days.map((d) => d.key), ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04", "2026-10-05"]);
  assert.equal(days[2].sales, 200);
  assert.equal(days[0].sales, 0);
});

test("ranges are India days", () => {
  const now = ist(5, 21);
  assert.deepEqual(rangeKeys("today", now), { fromKey: "2026-10-05", toKey: "2026-10-05" });
  assert.deepEqual(rangeKeys("7d", now), { fromKey: "2026-09-29", toKey: "2026-10-05" });
  assert.deepEqual(rangeKeys("month", now), { fromKey: "2026-10-01", toKey: "2026-10-05" });
  assert.deepEqual(rangeKeys("lifetime", now), { fromKey: null, toKey: null });
});

test("an order seen twice is counted once, the later copy winning", () => {
  const merged = mergeOrders([order("a", 5, 10, { status: "Placed" })], [order("a", 5, 10)]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].status, "Delivered");
});

test("csv has a header and a row per day", () => {
  const csv = daysToCsv(summarize([order("a", 5, 10)]).days);
  assert.equal(csv.split("\n").length, 2);
  assert.match(csv, /^Date,Orders/);
});
