#!/usr/bin/env node
/**
 * Finds the photo of the same product for every shop product that has none.
 *
 *   node scripts/match-store-photos.mjs
 *
 * Reads the live catalogue from Firestore (products are public), matches each
 * name against the full photo catalogue in data/dashit_master_catalog.json
 * (the photos on dashit.co.in/products/catalog/) with photoFromCatalog, the
 * strict rule the admin's CSV import uses, and writes two files to
 * data/photo-matches/:
 *
 *   dashit-photos-matched.csv   products with a sure match and its photo link:
 *                               upload it on the admin's "Photos needed" sheet.
 *   dashit-photos-unmatched.csv the rest, to fill in by hand (same layout).
 *
 * Tobacco gets no photo (it shows the plain pack), and the list's own tobacco
 * aisle ("Paan Corner") is never matched against.
 */
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { prepareCatalog, photoFromCatalog } from "../src/lib/productCatalog.js";
import { isAgeRestricted } from "../src/lib/ageGate.js";
import { photoListToCsv } from "../src/lib/csvInventory.js";

const PROJECT = "dashit-1ecba";
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyB6tH6rYJ3fDZ7SBVkTNL3i_lOTXkPYjsg";
const PHOTO_HOST = "https://dashit.co.in/";
const OUT = "data/photo-matches";

/** The master catalogue in the shape prepareCatalog reads. */
function masterCatalog() {
  const master = JSON.parse(readFileSync("data/dashit_master_catalog.json", "utf8"));
  const shelves = [];
  const aisles = [];
  const images = [""];
  const aisleIds = new Map();
  const items = [];
  for (const entry of master) {
    if (!entry.name || !entry.local_path || entry.category === "Paan Corner") continue;
    const aisleKey = `${entry.category}|${entry.subcategory || ""}`;
    if (!aisleIds.has(aisleKey)) {
      if (!shelves.includes(entry.category)) shelves.push(entry.category);
      aisleIds.set(aisleKey, aisles.length);
      aisles.push([entry.subcategory || entry.category, shelves.indexOf(entry.category)]);
    }
    images.push(PHOTO_HOST + entry.local_path.replace(/^\/+/, ""));
    items.push([entry.name, aisleIds.get(aisleKey), 0, images.length - 1]);
  }
  return prepareCatalog({ shelves, aisles, brands: [""], images, items });
}

/** Every product in Firestore, as plain values. */
async function shopProducts() {
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/products?pageSize=300&key=${API_KEY}`;
  const plain = (v) => v?.stringValue ?? v?.integerValue ?? v?.doubleValue ?? v?.booleanValue ?? "";
  const products = [];
  let page = "";
  do {
    const res = await fetch(base + (page ? `&pageToken=${page}` : ""));
    if (!res.ok) throw new Error(`Firestore answered ${res.status}`);
    const body = await res.json();
    for (const doc of body.documents || []) {
      const f = doc.fields || {};
      products.push({
        id: doc.name.split("/").pop(),
        name: plain(f.name),
        brand: plain(f.brand),
        unit: plain(f.unit),
        cat: plain(f.cat),
        img: plain(f.img),
        imgSource: plain(f.imgSource),
        active: f.active?.booleanValue !== false,
      });
    }
    page = body.nextPageToken || "";
  } while (page);
  return products;
}

const catalog = masterCatalog();
const products = await shopProducts();
// Products with a real photo already keep it; stock photos (Unsplash) aren't the product.
const needPhoto = products.filter(
  (p) => p.active && !isAgeRestricted(p) && (!p.img || /images\.unsplash\.com/.test(p.img))
);

/** Whether the photo is really on dashit.co.in (some catalogue folders are only partly uploaded). */
async function isOnServer(url) {
  try {
    return (await fetch(url, { method: "HEAD" })).ok;
  } catch {
    return false;
  }
}

const found = [];
const unmatched = [];
for (const product of needPhoto) {
  const photo = photoFromCatalog(catalog, product.name);
  if (photo) found.push({ product, photo });
  else unmatched.push(product);
}

// Checked eight at a time; a match whose photo is missing on the server waits with the rest.
const matched = [];
const missing = [];
let next = 0;
await Promise.all(
  Array.from({ length: 8 }, async () => {
    while (next < found.length) {
      const match = found[next++];
      if (await isOnServer(match.photo.img)) matched.push(match);
      else missing.push(match);
    }
  })
);
unmatched.push(...missing.map((m) => m.product));

mkdirSync(OUT, { recursive: true });
const photoCsv = (rows) =>
  photoListToCsv(rows.map((r) => r.product)).split("\n").map((line, i) => {
    if (i === 0 || !line) return line;
    // photoListToCsv leaves the image column empty; fill in the match.
    return line.replace(/,$/, `,${rows[i - 1].photo.img}`);
  }).join("\n");
writeFileSync(`${OUT}/dashit-photos-matched.csv`, photoCsv(matched));
writeFileSync(`${OUT}/dashit-photos-unmatched.csv`, photoListToCsv(unmatched));
writeFileSync(
  `${OUT}/matches.json`,
  JSON.stringify(matched.map(({ product, photo }) => ({ id: product.id, shop: product.name, list: photo.name, img: photo.img })), null, 1)
);

console.log(`Shop products: ${products.length}`);
console.log(`Needing a photo: ${needPhoto.length} (tobacco and inactive left out)`);
console.log(`Sure match: ${matched.length}  →  ${OUT}/dashit-photos-matched.csv`);
console.log(`Sure match, but the photo is missing on dashit.co.in: ${missing.length}`);
missing.forEach((m) => console.log(`   ${m.photo.img}  (${m.photo.name})`));
console.log(`No sure match: ${unmatched.length}  →  ${OUT}/dashit-photos-unmatched.csv`);
