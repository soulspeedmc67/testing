#!/usr/bin/env node
/**
 * Photo suggestions for the shop products photoFromCatalog couldn't match for
 * sure, for the owner to confirm one by one (nothing here goes live on its own).
 *
 *   node scripts/suggest-store-photos.mjs
 *
 * Reads data/photo-matches/dashit-photos-unmatched.csv (from
 * match-store-photos.mjs) and writes data/photo-matches/suggestions.json:
 * `[{ id, name, brand, unit, cat, options: [{ img, name }] }]`, up to three
 * catalogue photos per product, closest first, each one checked to load from
 * dashit.co.in. A suggestion needs the same brand word and at least 60% of the
 * shop's words (a one-letter typo allowed); tobacco was already left out.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { normaliseName } from "../src/lib/productCatalog.js";
import { parseCsv } from "../src/lib/csvInventory.js";

const OUT = "data/photo-matches";
const UNITS = new Set("g gm gms gram grams kg kgs ml l ltr ltrs litre litres liter liters pc pcs piece pieces pack packet pkt x combo pouch bottle jar box".split(" "));
const stem = (w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w);
const words = (name) => normaliseName(name).split(" ").filter((w) => w && !/^\d/.test(w) && !UNITS.has(w)).map(stem);

function oneEditApart(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i += 1; j += 1; continue; }
    if (++edits > 1) return false;
    if (a.length > b.length) i += 1;
    else if (b.length > a.length) j += 1;
    else { i += 1; j += 1; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}
// A one-letter typo or a shortened word only counts on words of five letters
// or more: "top" isn't "topical", "colour" is "colours".
const same = (s, l) => s === l || (s.length >= 5 && l.length >= 5 && oneEditApart(s, l)) || (s.length >= 5 && l.startsWith(s));

const master = JSON.parse(readFileSync("data/dashit_master_catalog.json", "utf8")).filter((e) => e.category !== "Paan Corner" && e.local_path);
const listWords = master.map((e) => words(e.name));
const byStart = new Map();
listWords.forEach((ws, i) => {
  if (!ws.length) return;
  const key = ws[0].slice(0, 3);
  if (!byStart.has(key)) byStart.set(key, []);
  byStart.get(key).push(i);
});

const rows = parseCsv(readFileSync(`${OUT}/dashit-photos-unmatched.csv`, "utf8"));
const header = rows[0];
const col = (name) => header.indexOf(name);
const products = rows.slice(1).map((r) => ({
  id: r[col("barcode")], name: r[col("name")], brand: r[col("brand")], unit: r[col("unit")], cat: r[col("category")],
}));

const suggestions = [];
for (const product of products) {
  const ws = [...new Set(words(product.name))];
  if (ws.length === 0) continue;
  const scored = [];
  for (const i of byStart.get(ws[0].slice(0, 3)) || []) {
    const lw = listWords[i];
    if (!same(ws[0], lw[0])) continue;
    const hits = ws.filter((w) => lw.some((l) => same(w, l))).length;
    if (hits < Math.max(2, Math.ceil(ws.length * 0.6))) continue;
    const extras = lw.filter((l) => !ws.some((w) => same(w, l))).length;
    scored.push({ i, score: hits / ws.length - 0.05 * extras });
  }
  scored.sort((a, b) => b.score - a.score);
  const seen = new Set();
  const options = [];
  for (const { i } of scored) {
    const name = master[i].name;
    if (seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    options.push({ img: `https://dashit.co.in/${master[i].local_path.replace(/^\/+/, "")}`, name });
    if (options.length === 5) break; // spares, in case some aren't on the server
  }
  if (options.length) suggestions.push({ ...product, options, score: scored[0].score });
}

// Keep only photos that load, three per product at most.
const all = suggestions.flatMap((s) => s.options);
const ok = new Map();
let next = 0;
await Promise.all(Array.from({ length: 16 }, async () => {
  while (next < all.length) {
    const url = all[next++].img;
    if (ok.has(url)) continue;
    try { ok.set(url, (await fetch(url, { method: "HEAD" })).ok); } catch { ok.set(url, false); }
  }
}));
const result = suggestions
  .map((s) => ({ ...s, options: s.options.filter((o) => ok.get(o.img)).slice(0, 3) }))
  .filter((s) => s.options.length)
  // Likeliest first, so the owner starts with the quick yeses.
  .sort((a, b) => b.score - a.score);
writeFileSync(`${OUT}/suggestions.json`, JSON.stringify(result));
console.log(`Products without a sure match: ${products.length}`);
console.log(`With photos to confirm: ${result.length} (${[...ok.values()].filter((v) => !v).length} suggested photos missing on the server were left out)`);

// The admin's "Check photos" screen reads this from the website: sure matches
// to add in one go, then the suggestions to confirm one by one.
const sure = JSON.parse(readFileSync(`${OUT}/matches.json`, "utf8")).map((m) => ({ id: m.id, img: m.img, name: m.list }));
writeFileSync(
  "public/catalog/photo-review-v1.json",
  JSON.stringify({
    builtAt: new Date().toISOString().slice(0, 10),
    sure,
    review: result.map(({ id, name, unit, options }) => ({ id, name, unit, options })),
  })
);
console.log(`public/catalog/photo-review-v1.json: ${sure.length} sure, ${result.length} to confirm`);
