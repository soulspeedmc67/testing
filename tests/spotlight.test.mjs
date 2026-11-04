import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeSpotlight,
  spotlightProblems,
  sectionProblems,
  newItemProblems,
  productFromNewItem,
  shopperSpotlight,
  itemFromProduct,
  moveEntry,
  photoPrompt,
} from "../src/lib/spotlight.js";

const PHOTO = "https://dashit.co.in/uploads/a.jpg";

test("a missing document is off, with the default words", () => {
  const spot = normalizeSpotlight(undefined);
  assert.equal(spot.enabled, false);
  assert.equal(spot.tabLabel, "Specials");
  assert.deepEqual(spot.sections, []);
  assert.equal(shopperSpotlight(undefined, []), null);
});

test("duplicate items in a group are kept once, and MRP below price is dropped", () => {
  const spot = normalizeSpotlight({
    sections: [{ id: "g1", name: "Towels", img: PHOTO, items: [
      { id: "p1", name: "Towel", img: PHOTO, price: 199, mrp: 150 },
      { id: "p1", name: "Towel again", img: PHOTO, price: 199 },
    ] }],
  });
  assert.equal(spot.sections[0].items.length, 1);
  assert.equal(spot.sections[0].items[0].mrp, 0);
});

test("groups and items must have photos", () => {
  const problems = spotlightProblems({
    tabLabel: "Diwali",
    title: "Diwali Specials",
    enabled: true,
    sections: [{ id: "g1", name: "Diyas", img: "", items: [{ id: "p1", name: "Clay diya", img: "" }] }],
  });
  assert.ok(problems.some((p) => p.includes('"Diyas" needs a photo')));
  assert.ok(problems.some((p) => p.includes('"Clay diya"')));
  assert.deepEqual(sectionProblems({ name: "Diyas", img: PHOTO }), []);
  assert.equal(sectionProblems({ name: "", img: "" }).length, 2);
});

test("it can't be switched on with nothing in it", () => {
  const problems = spotlightProblems({ tabLabel: "A", title: "B", enabled: true, sections: [{ id: "g", name: "G", img: PHOTO, items: [] }] });
  assert.ok(problems.includes("Add at least one item before switching it on."));
});

test("a new item needs a name, price, size and photo, and becomes a real product", () => {
  assert.equal(newItemProblems({}).length, 4);
  assert.deepEqual(newItemProblems({ name: "Lamp", price: "349", mrp: "899", unit: "1 pc", img: PHOTO }), []);
  const doc = productFromNewItem({ name: "Lamp", price: "349", mrp: "899", unit: "1 pc", img: PHOTO, stock: "5", cat: "Home" }, 1);
  assert.equal(doc.id, "SPOT-1");
  assert.equal(doc.originalPrice, 899);
  assert.equal(doc.stock, 5);
  assert.equal(doc.inStock, true);
  assert.equal(doc.active, true);
});

test("shoppers get the live product when the shop has it, the kept copy otherwise", () => {
  const raw = {
    enabled: true,
    sections: [
      { id: "g1", name: "Towels", img: PHOTO, items: [{ id: "p1", name: "Old name", img: PHOTO, price: 100 }, { id: "p2", name: "New towel", img: PHOTO, price: 250, mrp: 400 }] },
      { id: "g2", name: "Empty", img: PHOTO, items: [] },
    ],
  };
  const spot = shopperSpotlight(raw, [{ id: "p1", name: "Live name", price: 90 }]);
  assert.equal(spot.sections.length, 1);
  assert.equal(spot.sections[0].products[0].name, "Live name");
  assert.equal(spot.sections[0].products[1].originalPrice, 400);
  assert.equal(shopperSpotlight({ ...raw, enabled: false }, []), null);
});

test("a shop product is copied onto an item, and lists reorder", () => {
  const item = itemFromProduct({ id: 7, name: "Bottle", image: PHOTO, price: 999, originalPrice: 2499, unit: "1200 ml" });
  assert.deepEqual(item, { id: "7", name: "Bottle", img: PHOTO, price: 999, mrp: 2499, unit: "1200 ml" });
  assert.deepEqual(moveEntry(["a", "b", "c"], 0, 2), ["b", "c", "a"]);
  assert.deepEqual(moveEntry(["a", "b"], 0, -1), ["a", "b"]);
});

test("items can sit on their own, with no group at all", () => {
  const raw = { enabled: true, items: [{ id: "p9", name: "Brass diya", img: PHOTO, price: 149 }], sections: [] };
  const spot = shopperSpotlight(raw, []);
  assert.equal(spot.sections.length, 0);
  assert.equal(spot.products.length, 1);
  assert.equal(spot.products[0].name, "Brass diya");
  assert.deepEqual(spotlightProblems({ ...raw, tabLabel: "Diwali", title: "Diwali" }), []);
  assert.ok(spotlightProblems({ tabLabel: "A", title: "B", enabled: true, items: [{ id: "x", name: "No photo", img: "", price: 5 }] }).some((p) => p.includes('"No photo" needs a photo')));
});

test("photo prompts name the item or the group", () => {
  assert.match(photoPrompt("item", "Lavender diffuser", "1 set"), /Lavender diffuser \(1 set\).*white background/);
  assert.match(photoPrompt("group", "Bedsheets & Towels"), /"Bedsheets & Towels".*4:5/);
});
