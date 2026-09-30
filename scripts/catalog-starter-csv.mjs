#!/usr/bin/env node
/**
 * Writes a starter stock file from the product list — the command-line twin
 * of the admin's "Pick from product list" screen.
 *
 *   node scripts/catalog-starter-csv.mjs --shelf Dairy --limit 40 > dairy.csv
 *   node scripts/catalog-starter-csv.mjs --shelf Chips --aisle "Chips Crisps" --search lays
 *   node scripts/catalog-starter-csv.mjs --list        (shelves and aisles with counts)
 *
 * Names come well-known brands first. The file has name, category, unit and
 * brand filled in; fill quantity and price, then upload it under Import CSV.
 * Reads public/catalog/products-v1.json (npm run catalog:build makes it).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prepareCatalog, browseCatalog, catalogItem, shelfAisles } from "../src/lib/productCatalog.js";
import { catalogStarterCsv } from "../src/lib/csvInventory.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE = path.join(ROOT, "public/catalog/products-v1.json");

const args = process.argv.slice(2);
const opt = (name, fallback = "") => {
  const at = args.indexOf(`--${name}`);
  return at === -1 ? fallback : args[at + 1] || fallback;
};

if (!fs.existsSync(FILE)) {
  console.error("No product list yet. Run: npm run catalog:build");
  process.exit(1);
}
const catalog = prepareCatalog(JSON.parse(fs.readFileSync(FILE, "utf8")));

if (args.includes("--list")) {
  for (const shelf of catalog.shelves) {
    console.log(shelf);
    for (const a of shelfAisles(catalog, shelf)) console.log(`  ${a.label} (${a.count})`);
  }
  process.exit(0);
}

const shelf = opt("shelf");
if (shelf && !catalog.shelves.includes(shelf)) {
  console.error(`No shelf "${shelf}". Shelves: ${catalog.shelves.join(", ")}`);
  process.exit(1);
}
const limit = Number(opt("limit", "50")) || 50;
const picked = browseCatalog(catalog, { shelf, aisle: opt("aisle"), query: opt("search") })
  .slice(0, limit)
  .map((i) => catalogItem(catalog, i));

process.stdout.write(catalogStarterCsv(picked));
console.error(`${picked.length} items. Fill quantity and price, then upload under Import CSV.`);
