import test from "node:test";
import assert from "node:assert/strict";
import { isSaleLive, saleStatus, nextSaleChange, saleProblems, formToSale, saleToForm, expiresInFor, toLocalInput, fromLocalInput, BLANK_SALE } from "../src/lib/sales.js";

const T = Date.parse("2026-11-01T10:00:00Z");
const H = 3_600_000;

test("a sale with no dates is live while it is switched on", () => {
  assert.equal(isSaleLive({ active: true }, T), true);
  assert.equal(isSaleLive({}, T), true);
  assert.equal(isSaleLive({ active: false }, T), false);
  assert.equal(saleStatus({ active: false }, T), "off");
});

test("a sale starts and ends on its dates", () => {
  const sale = { startsAt: T + H, endsAt: T + 5 * H };
  assert.equal(saleStatus(sale, T), "scheduled");
  assert.equal(isSaleLive(sale, T), false);
  assert.equal(saleStatus(sale, T + 2 * H), "live");
  assert.equal(isSaleLive(sale, T + 2 * H), true);
  assert.equal(saleStatus(sale, T + 5 * H), "ended");
  assert.equal(isSaleLive(sale, T + 6 * H), false);
});

test("the next start or end is found for the timer", () => {
  const offers = [{ startsAt: T + 3 * H, endsAt: T + 9 * H }, { endsAt: T + 2 * H }, { endsAt: T - H }];
  assert.equal(nextSaleChange(offers, T), T + 2 * H);
  assert.equal(nextSaleChange([{ active: true }], T), 0);
});

test("the form is checked in plain words", () => {
  assert.deepEqual(saleProblems({ ...BLANK_SALE, title: "" }), ["Give the sale a name."]);
  assert.equal(saleProblems({ ...BLANK_SALE, title: "Eid" }).length, 0);
  assert.equal(saleProblems({ ...BLANK_SALE, title: "Eid", appliesTo: "category", category: "" })[0], "Choose which category the sale is on.");
  assert.equal(saleProblems({ ...BLANK_SALE, title: "Eid", startsAt: T + 2 * H, endsAt: T + H })[0], "The end has to be after the start.");
});

test("a saved sale keeps what the shop apps read", () => {
  const sale = formToSale({ ...BLANK_SALE, title: "  Dairy week ", badge: "new", appliesTo: "category", category: "Dairy", promoCode: "dairy 20!", endsAt: Date.now() + 3 * 86_400_000 }, "fallback.jpg");
  assert.equal(sale.title, "Dairy week");
  assert.equal(sale.badge, "NEW");
  assert.equal(sale.category, "Dairy");
  assert.equal(sale.appliesTo, "category");
  assert.equal(sale.promoCode, "DAIRY20");
  assert.equal(sale.img, "fallback.jpg");
  assert.ok(sale.expiresIn.startsWith("Ends "));
  const all = formToSale({ ...BLANK_SALE, title: "Everything", appliesTo: "all", category: "Dairy" });
  assert.equal(all.category, "All");
});

test("an older banner opens in the editor as it was", () => {
  const form = saleToForm({ id: "o1", title: "Snacks", category: "Snacks", promoCode: "CRISP20", active: true });
  assert.equal(form.appliesTo, "category");
  assert.equal(saleToForm({ id: "o2", title: "All", category: "All" }).appliesTo, "all");
});

test("the ends line and the date input", () => {
  assert.equal(expiresInFor(0, T), "Active today");
  assert.equal(expiresInFor(T + H, T), "Ends today");
  assert.equal(fromLocalInput(toLocalInput(T)), Math.floor(T / 60000) * 60000);
  assert.equal(fromLocalInput(""), 0);
});
