#!/usr/bin/env node
/**
 * Builds the admin's product-name list from the scraped Blinkit catalogue.
 *
 *   node scripts/build-catalog-index.mjs [path/to/blinkit_master_catalog.json]
 *
 * Reads data/blinkit_master_catalog.json (~88 MB, never shipped) and writes
 * public/catalog/products-v1.json: names, the DASHit shelf each belongs to and
 * a guessed brand — nothing else. No photo links, prices or Blinkit ids, so
 * the file carries no Blinkit images into the site or the apps.
 *
 * Only grocery-shop sections are kept (see SHELVES below). Clothes, gadgets,
 * books, prescription medicines, tobacco and Blinkit's own-label goods are
 * left out: DASHit doesn't sell them, or can't buy them from a distributor.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = path.resolve(
  process.argv[2] ||
  (fs.existsSync(path.join(ROOT, "data/dashit_master_catalog.json"))
    ? path.join(ROOT, "data/dashit_master_catalog.json")
    : path.join(ROOT, "data/blinkit_master_catalog.json"))
);
const OUT = path.join(ROOT, "public/catalog/products-v1.json");

/* Blinkit "section | aisle" → the shelf names the admin's "Which shelf?"
   picker uses (CATEGORIES in src/pages/xcyop.js). A section listed without
   aisles maps every aisle in it; an aisle not listed is dropped. */
const SHELVES = {
  "Munchies": {
    "Chips Crisps": "Chips",
    "Bhujia Mixtures": "Snacks",
    "Namkeen Snacks": "Snacks",
    "Makhana More": "Snacks",
    "Popcorn": "Snacks",
    "Papad Fryums": "Snacks",
    "Imported Snacks": "Snacks",
  },
  "Bakery Biscuits": {
    "Cream Biscuits": "Biscuits",
    "Rusks Wafers": "Biscuits",
    "Sweet Salty": "Biscuits",
    "Biscuit Gift Pack": "Biscuits",
    "Cakes Rolls": "Bakery",
    "Gourmet Bakery": "Bakery",
    "Baking Ingredients": "Bakery",
  },
  "Sweet Tooth": {
    "Candies Gum": "Snacks",
    "Chocolate Gift Pack": "Snacks",
    "Mouth Fresheners": "Snacks",
    "Ice Cream Frozen Dessert": "Snacks",
    "Syrups": "Beverages",
  },
  "Cold Drinks Juices": "Beverages",
  "Tea Coffee Milk Drinks": "Beverages",
  "Dairy Breakfast": {
    "Milk": "Dairy",
    "Cheese": "Dairy",
    "Condensed Milk": "Dairy",
    "Eggs": "Dairy",
    "Muesli Granola": "Staples",
    "Vermicelli": "Staples",
  },
  "Instant Frozen Food": {
    "Noodles": "Instant Food",
    "Pasta More": "Instant Food",
    "Instant Mixes": "Instant Food",
    "Ready To Cook Eat": "Instant Food",
    "Frozen Veg": "Instant Food",
    "Frozen Veg Snacks": "Instant Food",
    "Batter": "Instant Food",
    "Dessert Cake Mixes": "Instant Food",
    "Energy Bars": "Snacks",
  },
  "Atta Rice Dal": "Staples",
  "Dry Fruits Masala Oil": {
    "Powdered Spice": "Spices",
    "Whole Herbs": "Spices",
    "Gravy Mixes Pastes": "Spices",
    "Oil": "Staples",
    "Salt Sugar Jaggery": "Staples",
    "Dry Fruits": "Staples",
    "Dry Fruit Gift Packs": "Staples",
  },
  "Sauces Spreads": "Staples",
  "Vegetables Fruits": {
    "Fresh Fruits": "Fruits",
    "Exotics": "Fruits",
    "Fresh Vegetables": "Vegetables",
    "Leafies Herbs": "Vegetables",
    "Freshly Cut Sprouts": "Vegetables",
    "Trusted Organic": "Vegetables",
    "Wholesale Fnv": "Vegetables",
  },
  "Cleaning Essentials": "Household Items",
  "Home Furnishing Decor": { "Tissues Disposables": "Household Items" },
  "Personal Care": "Personal Care",
  "Beauty Cosmetics": { "Face Care": "Personal Care", "Body Skin Care": "Personal Care" },
  "Baby Care": {
    "Diapers More": "Personal Care",
    "Hygiene": "Personal Care",
    "Skin Hair Care": "Personal Care",
    "Oral Nasal Care": "Personal Care",
    "Baby Food": "Staples",
  },
  "Pharma Wellness": {
    "Pure Otc": "Personal Care",
    "Antiseptic Liquid": "Personal Care",
    "Adult Hygiene": "Personal Care",
  },
};

/* Blinkit's own labels: sold only on Blinkit, so no distributor in Anantnag
   carries them. Matched against the start of the name. */
const OWN_LABELS = ["whole farm", "grofers", "blinkit", "savemore"];

/* Words that open a brand name but aren't the brand on their own: "Red" in
   Red Bull, "Dr" in Dr Oetker, "The" in The Whole Truth. After one of these
   the brand is the first two words. */
const LEADING_WORDS = new Set([
  "the", "dr", "mr", "mrs", "go", "my", "red", "green", "blue", "black", "white",
  "yellow", "gold", "golden", "royal", "premium", "organic", "organically", "pure",
  "fresh", "farm", "nature", "natures", "happy", "good", "true", "urban", "lets",
  "little", "super", "sri", "shree", "shri", "new", "country", "desi", "home",
]);

// Blinkit bundles ("… Chips 80 G Combo") — two products glued into one name.
const isBundle = (name) => /\bcombo\b/i.test(name);

const shelfFor = (section, aisle) => {
  const rule = SHELVES[section];
  if (!rule) return "";
  return typeof rule === "string" ? rule : rule[aisle] || "";
};

const key = (s) => s.toLowerCase().replace(/\s+/g, " ").trim();

function main() {
  if (!fs.existsSync(SOURCE)) {
    console.error(`No catalogue at ${SOURCE}. Pass the path to blinkit_master_catalog.json.`);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(SOURCE, "utf8"));
  const rows = Array.isArray(raw) ? raw : raw.products || [];

  // 1. Keep grocery aisles, drop own labels and repeats (one product sits in several aisles).
  const kept = [];
  const seen = new Set();
  for (const r of rows) {
    const name = String(r.name || "").replace(/\s+/g, " ").trim();
    const shelf = shelfFor(r.category, r.subcategory);
    if (!name || !shelf || isBundle(name)) continue;
    const k = key(name);
    if (seen.has(k) || OWN_LABELS.some((l) => k.startsWith(l))) continue;
    seen.add(k);
    const imgPath = r.local_path ? ("/" + String(r.local_path).replace(/^\//, "")) : "";
    kept.push({ name, shelf, aisle: String(r.subcategory || "").trim(), img: imgPath });
  }

  // 2. Brand = the first word, or the first two when nearly every name with
  //    that first word continues the same way ("Mother Dairy", "Tata Sampann").
  const lead = (words) => (LEADING_WORDS.has(words[0].toLowerCase()) && words.length > 1 ? 2 : 1);
  const prefixCount = new Map();
  for (const item of kept) {
    const words = item.name.split(" ");
    const n = lead(words);
    for (const len of [n, n + 1]) {
      if (words.length < len) continue;
      const p = key(words.slice(0, len).join(" "));
      prefixCount.set(p, (prefixCount.get(p) || 0) + 1);
    }
  }
  for (const item of kept) {
    const words = item.name.split(" ");
    const n = lead(words);
    const one = words.slice(0, n).join(" ");
    const two = words.length > n + 1 ? words.slice(0, n + 1).join(" ") : "";
    const c1 = prefixCount.get(key(one)) || 0;
    const c2 = two ? prefixCount.get(key(two)) || 0 : 0;
    item.brand = c2 >= 5 && c2 / c1 >= 0.6 ? two : one;
  }

  // 3. Well-known brands first: a brand with many products on the shelves is
  //    usually one every distributor stocks. Blinkit's sitemap has no sales
  //    figures, so this is the best "popular" signal the data has.
  const brandSize = new Map();
  for (const item of kept) brandSize.set(item.brand, (brandSize.get(item.brand) || 0) + 1);
  kept.sort(
    (a, b) =>
      brandSize.get(b.brand) - brandSize.get(a.brand) ||
      a.brand.localeCompare(b.brand) ||
      a.name.length - b.name.length ||
      a.name.localeCompare(b.name)
  );

  // 4. Write it as columns of small numbers so the file stays compact.
  const shelves = [...new Set(kept.map((i) => i.shelf))].sort();
  const aisleKey = (i) => `${i.shelf}|${i.aisle}`;
  const aisles = [...new Set(kept.map(aisleKey))].sort();
  const brands = [...new Set(kept.map((i) => i.brand))];
  const images = ["", ...new Set(kept.map((i) => i.img).filter(Boolean))];
  const aisleIndex = new Map(aisles.map((a, i) => [a, i]));
  const brandIndex = new Map(brands.map((b, i) => [b, i]));
  const imageIndex = new Map(images.map((img, i) => [img, i]));

  const out = {
    v: 1,
    builtAt: new Date().toISOString().slice(0, 10),
    source: "DASHit verified FMCG catalog",
    shelves,
    aisles: aisles.map((a) => {
      const [shelf, aisle] = a.split("|");
      return [aisle, shelves.indexOf(shelf)];
    }),
    brands,
    images,
    items: kept.map((i) => [
      i.name,
      aisleIndex.get(aisleKey(i)),
      brandIndex.get(i.brand),
      imageIndex.get(i.img) || 0,
    ]),
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const json = JSON.stringify(out);
  fs.writeFileSync(OUT, json);

  const perShelf = shelves.map((s) => `${s} ${kept.filter((i) => i.shelf === s).length}`).join(", ");
  console.log(`Read ${rows.length} products, kept ${kept.length} (${brands.length} brands).`);
  console.log(perShelf);
  console.log(`Wrote ${path.relative(ROOT, OUT)} — ${(json.length / 1024 / 1024).toFixed(2)} MB`);
}

main();
