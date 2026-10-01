#!/usr/bin/env node
/**
 * Second pass after scripts/suggest-shelves.mjs: shelves by brand.
 *
 *   node scripts/suggest-shelves-by-brand.mjs
 *
 * Items still under "Others", or filed under Fruits or Vegetables by a word
 * in their name ("apple shampoo", "fruit chews"), are moved to the shelf
 * their brand's other items are on. A brand is the first word of the name
 * (two words when the first is short), and it only counts when at least 3 of
 * the shop's own items on real shelves share it and 85% of those sit on one
 * shelf. Fresh fruit and vegetables have no brand in the stock file, so a
 * Fruits or Vegetables item only moves to a packaged-goods shelf. Tobacco is
 * never moved. Failing that, clear words in the name (WORDS below).
 * Writes public/catalog/shelf-fixes-v2.json, applied with
 * `node scripts/apply-shelf-fixes.mjs public/catalog/shelf-fixes-v2.json`.
 */
import { writeFileSync } from "node:fs";
import { isAgeRestricted } from "../src/lib/ageGate.js";

const PROJECT = "dashit-1ecba";
const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyB6tH6rYJ3fDZ7SBVkTNL3i_lOTXkPYjsg";
const UNSURE = new Set(["others", "other", "fruits", "vegetables", "(none)", ""]);
const MIN_ITEMS = 3;
const AGREE = 0.85;

/**
 * Words that say what a product is, used when its brand isn't known. An item
 * moves only when every word it has points at the same shelf.
 */
const WORDS = [
  ["Personal Care", /\b(shampoo|shmp|shampo|conditioner|soap|body ?wash|shower|face ?wash|facewash|lotion|sunscreen|serum|moisturi[sz]er|deo|deodorant|perfume|edp|body mist|toothpaste|tooth ?brush|razor|shaving|hair ?(oil|colou?r|gel)|lipstick|kajal|nail|talc|sanitary|pads?|scrub|wax|oil|spray)\b/],
  ["Biscuits", /\b(biscuits?|cookies?|rusk|wafers?|crackers?)\b/],
  ["Snacks", /\b(chips|namkeen|makhana|makhna|bhujia|nachos|popcorn|puffs?|kurkure|mixture)\b/],
  ["Beverages", /\b(juice|drink|shake|soda|cola|squash|nectar|lassi|tea|coffee)\b/],
  ["Sweets & Chocolates", /\b(chocolates?|choco|candy|candies|toffee|lollipop|chewing|gum|chews?|chewy|ladoo|laddu|barfi|halwa|mints?|cadbury|galaxy|truff\\w*|temptations|bar|toblerone|fantastik)\b/],
  ["Dairy", /\b(yogh?urt|curd|paneer|cheese|butter ?milk|ghee)\b/],
  ["Sauces & Spreads", /\b(pickle|achar|murab+a|muraba|jam|ketchup|sauce|mayonnaise|mayo|spread|honey)\b/],
  // Health first in mind: "Durex bubble gum" must never land among the sweets.
  ["Health & Wellness", /\b(durex|cndm|condoms?|manforce|skore|kamasutra|ensure|vicks?|vickss|vaporub|balm|pain|tablets?|capsules?|syrup|ors)\b/],
  ["Baby Care", /\b(cerelac|diapers?|baby wipes)\b/],
  ["Home Care", /\b(detergent|dishwash|floor cleaner|toilet cleaner|phenyl|air freshener|agarbatti|incense|dhoop)\b/],
  ["Stationery", /\b(pencil|pen|eraser|sharpener|notebook|note book|stapler|steplar|glue|crayons?|marker)\b/],
  ["Instant Food", /\b(noodles|pasta|soup|oats|cornflakes|muesli)\b/],
  ["Dry Fruits", /\b(almonds?|badam|cashews?|kaju|walnuts?|akhrot|raisins?|raisan|kishmish|pista|pistachios?|dates|anjeer|figs?|hazelnuts?)\b/],
];

function shelfByWords(name) {
  const text = name.toLowerCase();
  const hits = new Set(WORDS.filter(([, re]) => re.test(text)).map(([shelf]) => shelf));
  return hits.size === 1 ? [...hits][0] : null;
}

async function shopProducts() {
  const base = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents/products?pageSize=300&key=${API_KEY}&mask.fieldPaths=name&mask.fieldPaths=cat`;
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

/** "AMUL DARK FRUIT" → "amul"; "GC BUTTON MUSHROOM" → "gc button" (too short alone). */
function brandOf(name) {
  const words = name.toLowerCase().replace(/[^a-z0-9& ]+/g, " ").split(/\s+/).filter(Boolean);
  if (words.length < 2) return "";
  return words[0].length <= 3 ? `${words[0]} ${words[1]}` : words[0];
}

const products = await shopProducts();
const tally = new Map(); // brand → Map(shelf → count)
for (const p of products) {
  if (UNSURE.has(p.cat.trim().toLowerCase()) || isAgeRestricted(p)) continue;
  const brand = brandOf(p.name);
  if (!brand) continue;
  if (!tally.has(brand)) tally.set(brand, new Map());
  const shelves = tally.get(brand);
  shelves.set(p.cat, (shelves.get(p.cat) || 0) + 1);
}

const shelfOf = new Map();
for (const [brand, shelves] of tally) {
  const total = [...shelves.values()].reduce((a, b) => a + b, 0);
  const [shelf, count] = [...shelves].sort((a, b) => b[1] - a[1])[0];
  if (total >= MIN_ITEMS && count / total >= AGREE) shelfOf.set(brand, shelf);
}

const moves = [];
for (const p of products) {
  const from = p.cat.trim().toLowerCase();
  if (!UNSURE.has(from) || !p.name || isAgeRestricted(p)) continue;
  const byBrand = shelfOf.get(brandOf(p.name));
  const to = byBrand || shelfByWords(p.name);
  if (!to || to.toLowerCase() === from) continue;
  moves.push({ id: p.id, name: p.name, from: p.cat || "(none)", to, like: byBrand ? `brand "${brandOf(p.name)}"` : "name" });
}
moves.sort((a, b) => a.to.localeCompare(b.to) || a.name.localeCompare(b.name));
writeFileSync(
  "public/catalog/shelf-fixes-v2.json",
  JSON.stringify({ builtAt: new Date().toISOString().slice(0, 10), moves })
);
const byFrom = {};
moves.forEach((m) => (byFrom[m.from] = (byFrom[m.from] || 0) + 1));
console.log(`brands known ${shelfOf.size}; moves ${moves.length}`, byFrom);
