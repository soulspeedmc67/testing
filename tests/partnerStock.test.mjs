import test from "node:test";
import assert from "node:assert/strict";
import { stockState, discountPercent, summarise, cleanProduct, formatINR, timeAgo, DEFAULT_LOW_AT, LIMITS } from "../src/lib/partnerStock.js";

test("an item's state: out, low, ok, hidden", () => {
  assert.equal(stockState({ stock: 0 }), "out");
  assert.equal(stockState({ stock: -2 }), "out");
  assert.equal(stockState({ stock: DEFAULT_LOW_AT }), "low");
  assert.equal(stockState({ stock: DEFAULT_LOW_AT + 1 }), "ok");
  assert.equal(stockState({ stock: 8, lowStockAt: 10 }), "low");
  assert.equal(stockState({ stock: 8, lowStockAt: 7 }), "ok");
  assert.equal(stockState({ stock: 0, active: false }), "hidden");
  assert.equal(stockState({ stock: "12" }), "ok");
});

test("discount percent only when the MRP is really higher", () => {
  assert.equal(discountPercent({ price: 1178, mrp: 2999 }), 61);
  assert.equal(discountPercent({ price: 100, mrp: 100 }), 0);
  assert.equal(discountPercent({ price: 100, mrp: 0 }), 0);
  assert.equal(discountPercent({ price: 100 }), 0);
});

test("totals for a dashboard", () => {
  const s = summarise([
    { price: 10, stock: 100, mrp: 12 },          // ok
    { price: 20, stock: 3 },                      // low
    { price: 5, stock: 0 },                       // out
    { price: 50, stock: 10, active: false },      // hidden
  ]);
  assert.equal(s.items, 4);
  assert.equal(s.units, 113);
  assert.deepEqual([s.ok, s.low, s.out, s.hidden], [1, 1, 1, 1]);
  assert.equal(s.stockValue, 10 * 100 + 20 * 3 + 0 + 50 * 10);
  assert.equal(s.retailValue, 12 * 100 + 20 * 3 + 0 + 50 * 10);
  assert.deepEqual(summarise([]).items, 0);
  assert.equal(summarise(null).stockValue, 0);
});

test("latest update is read from a Firestore timestamp or a number", () => {
  const s = summarise([{ stock: 1, updatedAt: { toMillis: () => 5000 } }, { stock: 1, updatedAt: 9000 }]);
  assert.equal(s.lastUpdated, 9000);
});

test("rupees in the Indian way", () => {
  assert.equal(formatINR(123456), "₹1,23,456");
  assert.equal(formatINR(250.5), "₹250.50");
  assert.equal(formatINR(0), "₹0");
});

test("how long ago", () => {
  const now = 1_000_000_000;
  assert.equal(timeAgo(0, now), "never");
  assert.equal(timeAgo(now - 20_000, now), "just now");
  assert.equal(timeAgo(now - 5 * 60_000, now), "5 min ago");
  assert.equal(timeAgo(now - 3 * 3_600_000, now), "3 h ago");
  assert.equal(timeAgo(now - 2 * 86_400_000, now), "2 d ago");
});

test("a good form is tidied and keeps only the allowed fields", () => {
  const r = cleanProduct({ name: "  Aashirvaad   Atta 5 kg ", price: "250", mrp: "280", stock: "40", category: " Staples ", unit: "5 kg", lowStockAt: "", img: "https://x.com/a.jpg", barcode: "8901", extra: "nope" });
  assert.ok(r.ok);
  assert.deepEqual(r.data, { name: "Aashirvaad Atta 5 kg", price: 250, stock: 40, lowStockAt: DEFAULT_LOW_AT, active: true, mrp: 280, category: "Staples", unit: "5 kg", barcode: "8901", img: "https://x.com/a.jpg" });
  assert.equal("extra" in r.data, false);
});

test("a form with no MRP leaves it out, and a hidden item stays hidden", () => {
  const r = cleanProduct({ name: "Milk", price: 30, stock: 0, active: false });
  assert.ok(r.ok);
  assert.equal("mrp" in r.data, false);
  assert.equal(r.data.active, false);
  assert.equal(r.data.stock, 0);
});

test("bad forms are refused with a reason for each field", () => {
  const bad = (form) => cleanProduct(form);
  assert.equal(bad({ name: "", price: 1, stock: 1 }).errors.name !== undefined, true);
  assert.equal(bad({ name: "x", price: "", stock: 1 }).errors.price !== undefined, true);
  assert.equal(bad({ name: "x", price: -1, stock: 1 }).errors.price !== undefined, true);
  assert.equal(bad({ name: "x", price: "abc", stock: 1 }).errors.price !== undefined, true);
  assert.equal(bad({ name: "x", price: 1, stock: "" }).errors.stock !== undefined, true);
  assert.equal(bad({ name: "x", price: 1, stock: -3 }).errors.stock !== undefined, true);
  assert.equal(bad({ name: "x", price: LIMITS.price + 1, stock: 1 }).errors.price !== undefined, true);
  assert.equal(bad({ name: "x", price: 100, mrp: 50, stock: 1 }).errors.mrp !== undefined, true);
  assert.equal(bad({ name: "x", price: 1, stock: 1, img: "http://insecure.com/a.jpg" }).errors.img !== undefined, true);
  assert.equal(bad({ name: "x", price: 1, stock: 1, lowStockAt: -1 }).errors.lowStockAt !== undefined, true);
  assert.equal(bad({ name: "x", price: 1, stock: 1 }).ok, true);
});

test("long text is cut to what the rules allow", () => {
  const r = cleanProduct({ name: "n".repeat(300), price: 1, stock: 1, description: "d".repeat(900), category: "c".repeat(200) });
  assert.ok(r.ok);
  assert.equal(r.data.name.length, LIMITS.name);
  assert.equal(r.data.description.length, LIMITS.description);
  assert.equal(r.data.category.length, LIMITS.category);
});
