#!/usr/bin/env node
/**
 * The right shelf for each shop product, from the 153k-item photo catalogue.
 *
 *   node scripts/suggest-shelves.mjs
 *
 * The shop's stock file put 2,610 items under "Others" and some on the wrong
 * shelf (Bingo chips under Vegetables, juices under Fruits). Each product
 * name is matched against the catalogue with guessFromCatalog (its five
 * closest names vote), and the catalogue's category and aisle are turned
 * into one of the shop's shelves (SHELF below). Only confident answers are
 * kept. Writes public/catalog/shelf-fixes-v1.json for the admin's "Fix
 * shelves" screen, where the owner checks them and moves them in one tap.
 * Tobacco is never moved.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { prepareCatalog, guessFromCatalog } from "../src/lib/productCatalog.js";
import { isAgeRestricted } from "../src/lib/ageGate.js";

const PROJECT = "dashit-1ecba";
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyB6tH6rYJ3fDZ7SBVkTNL3i_lOTXkPYjsg";

/** Catalogue category (and aisle) → the shop's shelf name. */
function shelfFor(category, aisle) {
  switch (category) {
    case "Vegetables Fruits":
      if (/fruit/i.test(aisle)) return "Fruits";
      if (/flower/i.test(aisle)) return null;
      return "Vegetables";
    case "Dairy Breakfast":
      return /muesli|granola|vermicelli/i.test(aisle) ? "Staples" : "Dairy";
    case "Munchies": return "Snacks";
    case "Bakery Biscuits":
      return /biscuit|rusk|wafer|sweet salty/i.test(aisle) ? "Biscuits" : "Bakery";
    case "Cold Drinks Juices":
    case "Tea Coffee Milk Drinks": return "Beverages";
    case "Atta Rice Dal": return "Staples";
    case "Dry Fruits Masala Oil":
      return /spice|herb|gravy/i.test(aisle) ? "Spices" : /dry fruit/i.test(aisle) ? "Dry Fruits" : "Staples";
    case "Sauces Spreads": return "Sauces & Spreads";
    case "Instant Frozen Food": return "Instant Food";
    case "Sweet Tooth":
      return /ice cream/i.test(aisle) ? "Ice Cream" : "Sweets & Chocolates";
    case "Cleaning Essentials":
    case "Home Furnishing Decor": return "Home Care";
    case "Kitchen Dining": return "Kitchen Care";
    case "Personal Care":
    case "Beauty Cosmetics": return "Personal Care";
    case "Baby Care": return "Baby Care";
    case "Pet Care": return "Pet Care";
    case "Pharma Wellness": return "Health & Wellness";
    case "Stationery Needs":
    case "Books": return "Stationery";
    case "Toys Games": return "Toys & Games";
    case "Electronics Electricals": return "Electronics";
    case "Chicken Meat Fish": return "Meat & Fish";
    default: return null; // Paan Corner (tobacco), fashion, digital goods: leave where they are
  }
}

function catalogue() {
  const master = JSON.parse(readFileSync("data/dashit_master_catalog.json", "utf8"));
  const shelves = [];
  const aisles = [];
  const aisleIds = new Map();
  const items = [];
  for (const entry of master) {
    const shelf = entry.name && shelfFor(entry.category, entry.subcategory || "");
    if (!shelf) continue;
    const key = `${shelf}|${entry.subcategory || ""}`;
    if (!aisleIds.has(key)) {
      if (!shelves.includes(shelf)) shelves.push(shelf);
      aisleIds.set(key, aisles.length);
      aisles.push([entry.subcategory || shelf, shelves.indexOf(shelf)]);
    }
    items.push([entry.name, aisleIds.get(key), 0]);
  }
  return prepareCatalog({ shelves, aisles, brands: [""], items });
}

async function shopProducts() {
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/products?pageSize=300&key=${API_KEY}&mask.fieldPaths=name&mask.fieldPaths=cat&mask.fieldPaths=active`;
  const products = [];
  let page = "";
  do {
    const res = await fetch(base + (page ? `&pageToken=${page}` : ""));
    if (!res.ok) throw new Error(`Firestore answered ${res.status}`);
    const body = await res.json();
    for (const doc of body.documents || []) {
      const f = doc.fields || {};
      products.push({ id: doc.name.split("/").pop(), name: f.name?.stringValue || "", cat: f.cat?.stringValue || "" });
    }
    page = body.nextPageToken || "";
  } while (page);
  return products;
}

const list = catalogue();
const products = await shopProducts();
const same = (a, b) => a.trim().toLowerCase() === b.trim().toLowerCase();
const moves = [];
for (const p of products) {
  if (!p.name || isAgeRestricted(p)) continue;
  const guess = guessFromCatalog(list, p.name);
  if (!guess?.shelf || same(guess.shelf, p.cat)) continue;
  // "Chips" and "Snacks" are one shelf in the apps; "Fruits" was the juice shelf's name too.
  if (same(p.cat, "Chips") && guess.shelf === "Snacks") continue;
  // Easy to confuse (baby lotion vs lotion, pet shampoo vs shampoo): only out of "Others".
  const fromReal = p.cat && !same(p.cat, "Others");
  if (fromReal && ["Baby Care", "Pet Care", "Health & Wellness"].includes(guess.shelf)) continue;
  moves.push({ id: p.id, name: p.name, from: p.cat || "(none)", to: guess.shelf, like: guess.name });
}
moves.sort((a, b) => a.to.localeCompare(b.to) || a.name.localeCompare(b.name));
writeFileSync(
  "public/catalog/shelf-fixes-v1.json",
  JSON.stringify({ builtAt: new Date().toISOString().slice(0, 10), moves })
);
const byTo = {};
moves.forEach((m) => (byTo[m.to] = (byTo[m.to] || 0) + 1));
const fromOthers = moves.filter((m) => same(m.from, "Others")).length;
console.log(`products ${products.length}, moves ${moves.length} (${fromOthers} out of "Others")`);
console.log(byTo);
