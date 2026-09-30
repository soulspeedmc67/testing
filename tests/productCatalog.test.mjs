// Run with: npm test   (node --test tests/)
import test from "node:test";
import assert from "node:assert/strict";

import {
  normaliseName,
  unitFromName,
  prepareCatalog,
  searchCatalog,
  browseCatalog,
  guessFromCatalog,
  fillFromCatalog,
  catalogItem,
  photoFromCatalog,
} from "../src/lib/productCatalog.js";
import { buildImportPlan, catalogStarterCsv } from "../src/lib/csvInventory.js";

// Same shape scripts/build-catalog-index.mjs writes: [name, aisle, brand], big brands first.
const raw = {
  v: 1,
  shelves: ["Biscuits", "Chips", "Dairy", "Snacks"],
  aisles: [
    ["Milk", 2],
    ["Chips Crisps", 1],
    ["Cream Biscuits", 0],
    ["Ice Cream Frozen Dessert", 3],
    ["Sweet Salty", 0],
  ],
  brands: ["Amul", "Lays", "Parle", "Britannia"],
  items: [
    ["Amul Gold Milk", 0, 0],
    ["Amul Gold Cassata Ice Cream", 3, 0],
    ["Amul Taaza Toned Milk", 0, 0],
    ["Lays Indias Magic Masala Potato Chips", 1, 1],
    ["Lays Indias Magic Masala Potato Chips 143 G", 1, 1],
    ["Parle Krackjack Original Sweet Salty Biscuits 700 G", 4, 2],
    ["Parle 20 20 Nice Biscuit", 2, 2],
    ["Britannia Gold Bourbon Biscuits", 2, 3],
  ],
};
const catalog = prepareCatalog(raw);

test("normaliseName drops case, accents, apostrophes and punctuation", () => {
  assert.equal(normaliseName("Nestlé LAY’S  Magic-Masala!"), "nestle lays magic masala");
  assert.equal(normaliseName(null), "");
});

test("unitFromName reads the last pack size in the shop's spelling", () => {
  assert.equal(unitFromName("Red Bull Drink 250 Ml"), "250 ml");
  assert.equal(unitFromName("Lays Chips 143 G"), "143 g");
  assert.equal(unitFromName("Fortune Oil 1 Ltr"), "1 L");
  assert.equal(unitFromName("Maggi 2 Minute Noodles"), "");
});

test("searchCatalog puts names that start with the first word typed first", () => {
  const names = searchCatalog(catalog, "gold").map((i) => i.name);
  assert.deepEqual(names.slice(0, 2), ["Amul Gold Milk", "Amul Gold Cassata Ice Cream"].slice(0, 2).sort((a, b) => a.length - b.length));
  assert.equal(searchCatalog(catalog, "amul gold")[0].name, "Amul Gold Milk");
});

test("searchCatalog matches words in any order and ignores apostrophes", () => {
  assert.equal(searchCatalog(catalog, "gold amul")[0].name, "Amul Gold Milk");
  assert.equal(searchCatalog(catalog, "Lay's magic")[0].name, "Lays Indias Magic Masala Potato Chips");
});

test("searchCatalog needs two letters and every word to start a word in the name", () => {
  assert.deepEqual(searchCatalog(catalog, "a"), []);
  assert.deepEqual(searchCatalog(catalog, "amul chips"), []);
  // "old" is inside "gold" but starts no word.
  assert.deepEqual(searchCatalog(catalog, "old"), []);
});

test("a picked name carries its shelf, aisle, brand and pack size", () => {
  assert.deepEqual(searchCatalog(catalog, "lays 143")[0], {
    index: 4,
    name: "Lays Indias Magic Masala Potato Chips 143 G",
    shelf: "Chips",
    aisle: "Chips Crisps",
    brand: "Lays",
    unit: "143 g",
  });
});

test("browseCatalog filters by shelf, aisle and typed words, keeping list order", () => {
  assert.deepEqual(browseCatalog(catalog, { shelf: "Dairy" }), [0, 2]);
  assert.deepEqual(browseCatalog(catalog, { shelf: "Biscuits", aisle: "Cream Biscuits" }), [6, 7]);
  assert.deepEqual(browseCatalog(catalog, { query: "britannia" }), [7]);
});

test("guessFromCatalog finds the shelf and brand for a name with a pack size", () => {
  assert.deepEqual(guessFromCatalog(catalog, "AMUL GOLD 1L"), {
    shelf: "Dairy",
    brand: "Amul",
    name: "Amul Gold Milk",
  });
  assert.equal(guessFromCatalog(catalog, "Amul Taaza Toned Milk 500ml").shelf, "Dairy");
});

test("guessFromCatalog doesn't read a pack size as a word", () => {
  // Krackjack's "700 G" must not match the G in Parle-G.
  const guess = guessFromCatalog(catalog, "Parle-G Biscuit 100g");
  assert.equal(guess.shelf, "Biscuits");
  assert.notEqual(guess.name, "Parle Krackjack Original Sweet Salty Biscuits 700 G");
});

test("guessFromCatalog gives up when nothing is close", () => {
  assert.equal(guessFromCatalog(catalog, "Fresh Kashmiri Red Apples"), null);
  assert.equal(guessFromCatalog(catalog, "500 g"), null);
  assert.equal(guessFromCatalog(null, "Amul Gold"), null);
});

test("fillFromCatalog only fills new rows the file gave no category", () => {
  const items = [
    { name: "Amul Gold Milk 1L", action: "new", catFromCsv: false, cat: "Grocery", brand: "" },
    { name: "Amul Gold Milk 1L", action: "new", catFromCsv: true, cat: "Staples", brand: "" },
    { name: "Amul Gold Milk 1L", action: "restock", catFromCsv: false, cat: "Snacks", brand: "" },
    { name: "Something unknown", action: "new", catFromCsv: false, cat: "Grocery", brand: "" },
  ];
  const out = fillFromCatalog(items, catalog);
  assert.deepEqual(
    out.map((i) => [i.cat, i.brand, Boolean(i.catFromCatalog)]),
    [
      ["Dairy", "Amul", true],
      ["Staples", "", false],
      ["Snacks", "", false],
      ["Grocery", "", false],
    ]
  );
  assert.equal(out[1], items[1]);
});

test("buildImportPlan marks whether the file gave the category", () => {
  const plan = buildImportPlan("name,category,quantity,price\nAmul Gold,Dairy,5,34\nMaggi,,5,14\n");
  assert.deepEqual(
    plan.items.map((i) => [i.cat, i.catFromCsv]),
    [
      ["Dairy", true],
      ["Grocery", false],
    ]
  );
});

test("a starter file, once filled in, imports with its shelf and brand", () => {
  const picked = [catalogItem(catalog, 4), catalogItem(catalog, 0)];
  const csv = catalogStarterCsv(picked);
  const [header, ...lines] = csv.trim().split("\n");
  assert.equal(header, "barcode,name,category,quantity,price,mrp,unit,brand,image");
  assert.equal(lines[0], ",Lays Indias Magic Masala Potato Chips 143 G,Chips,,,,143 g,Lays,");

  // The owner fills quantity and price for the chips and leaves the milk.
  const filled = [header, lines[0].replace("Chips,,,", "Chips,12,50,"), lines[1]].join("\n");
  const plan = buildImportPlan(filled);
  assert.equal(plan.items.length, 1);
  assert.deepEqual(
    [plan.items[0].name, plan.items[0].cat, plan.items[0].brand, plan.items[0].unit, plan.items[0].qty, plan.items[0].price],
    ["Lays Indias Magic Masala Potato Chips 143 G", "Chips", "Lays", "143 g", 12, 50]
  );
  assert.equal(plan.errors.length, 1);
  assert.match(plan.errors[0].reason, /Amul Gold Milk/);
});

test("buildImportPlan never guesses a photo; the preview fills in exact matches from the list", () => {
  const plan = buildImportPlan("name,category,quantity,price\nAmul Gold Full Cream Milk,Dairy,5,34\nLay's Magic Masala Chips,Snacks,10,20\n");
  assert.equal(plan.items.length, 2);
  assert.equal(plan.items[0].img, "");
  assert.equal(plan.items[1].img, "");
});

test("fillFromCatalog populates photos when catalog provides images", () => {
  const rawWithImgs = {
    v: 1,
    shelves: ["Dairy", "Chips"],
    aisles: [["Milk", 0], ["Crisps", 1]],
    brands: ["Amul", "Lays"],
    images: ["", "/products/catalog/dairy/amul.webp", "/products/catalog/chips/lays.webp"],
    items: [
      ["Amul Gold Milk 1L", 0, 0, 1],
      ["Lays Magic Masala", 1, 1, 2],
    ],
  };
  const catWithImgs = prepareCatalog(rawWithImgs);
  const items = [
    { name: "Amul Gold Milk 1L", action: "new", catFromCsv: true, cat: "Dairy", brand: "Amul", img: "" },
    { name: "Lays Magic Masala", action: "restock", catFromCsv: true, cat: "Chips", brand: "Lays", img: "" },
  ];
  const filled = fillFromCatalog(items, catWithImgs);
  assert.equal(filled[0].img, "https://dashit.co.in/products/catalog/dairy/amul.webp");
  assert.equal(filled[1].img, "https://dashit.co.in/products/catalog/chips/lays.webp");
});

/* ---------- photoFromCatalog: a photo only for the same product ---------- */

function photoList(names) {
  return prepareCatalog({
    shelves: ["Shelf"],
    aisles: [["Aisle", 0]],
    brands: [""],
    images: ["", ...names.map((_, i) => `/products/catalog/x/dsh_${i}.webp`)],
    items: names.map((name, i) => [name, 0, 0, i + 1]),
  });
}

test("photo: the same product gets its photo, as a full link", () => {
  const list = photoList(["Amul Gold Full Cream Milk", "Amul Taaza Toned Milk"]);
  assert.deepEqual(photoFromCatalog(list, "AMUL GOLD FULL CREAM MILK 500ml"), {
    img: "https://dashit.co.in/products/catalog/x/dsh_0.webp",
    name: "Amul Gold Full Cream Milk",
  });
});

test("photo: a one-letter typo in a long word still matches", () => {
  const list = photoList(["Pantene Hairfall Control Shampoo"]);
  assert.equal(photoFromCatalog(list, "PANTENE HAIRFALL CONTROL SHAMPO")?.name, "Pantene Hairfall Control Shampoo");
});

test("photo: one word naming the kind of product may be added", () => {
  const list = photoList(["Catch Hing Powder", "Fogg Napoleon Deodorant"]);
  assert.equal(photoFromCatalog(list, "CATCH HING")?.name, "Catch Hing Powder");
  assert.equal(photoFromCatalog(list, "FOGG NAPOLEON")?.name, "Fogg Napoleon Deodorant");
});

test("photo: a different variant or product never lends its photo", () => {
  const list = photoList([
    "Cadbury Dairy Milk Silk Chocolate",
    "Dabur Chyawanprash Gummies",
    "Amul Pro Chocolate Flavoured Milk",
    "Nivea Creme Soft Soap",
  ]);
  assert.equal(photoFromCatalog(list, "CADBURY DAIRY MILK CHOCOLATE"), null);
  assert.equal(photoFromCatalog(list, "DABUR CHYAWANPRASH"), null);
  assert.equal(photoFromCatalog(list, "AMUL MILK CHOCOLATE"), null);
  assert.equal(photoFromCatalog(list, "NIVEA SOFT CREME"), null);
});

test("photo: strengths and counts must agree, sizes don't matter", () => {
  const list = photoList(["The Derma Co 2% Salicylic Acid Face Serum", "Parle G Biscuits 800 G"]);
  assert.equal(photoFromCatalog(list, "THE DERMA CO 1% SALICYLIC ACID FACE SERUM"), null);
  assert.equal(photoFromCatalog(list, "THE DERMA CO 2% SALICYLIC ACID FACE SERUM")?.name, "The Derma Co 2% Salicylic Acid Face Serum");
  assert.equal(photoFromCatalog(list, "PARLE G BISCUITS 250g")?.name, "Parle G Biscuits 800 G");
});

test("photo: another brand, or a one-word name, gets nothing", () => {
  const list = photoList(["Britannia Marie Gold Biscuits", "Onion"]);
  assert.equal(photoFromCatalog(list, "PARLE MARIE GOLD BISCUITS"), null);
  assert.equal(photoFromCatalog(list, "ONION"), null);
});
