#!/usr/bin/env node
/**
 * Splits a list of photo matches into "sure" and "to check".
 *
 *   node scripts/sort-matched-photos.mjs [data/photo-matches/dashit-photos-matched-hostinger.json]
 *
 * Each match is `{ barcode, name, unit, image, matched_title }` (the shop item,
 * and the title of the product the photo shows). A match is sure only when
 * photoFromCatalog, the strict exact-product rule, accepts the title for the
 * shop name. Sure ones go to the admin's "Check photos" → "Add them all";
 * the rest are listed there for the owner to confirm one by one, so no photo
 * of a different product goes live unchecked. Updates
 * public/catalog/photo-review-v1.json in place.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { prepareCatalog, photoFromCatalog } from "../src/lib/productCatalog.js";
import { isAgeRestricted } from "../src/lib/ageGate.js";

const file = process.argv[2] || "data/photo-matches/dashit-photos-matched-hostinger.json";
const REVIEW = "public/catalog/photo-review-v1.json";
const matches = JSON.parse(readFileSync(file, "utf8"));
const review = JSON.parse(readFileSync(REVIEW, "utf8"));

const sureIds = new Set(review.sure.map((s) => s.id));
const reviewById = new Map(review.review.map((r) => [r.id, r]));
let sure = 0;
let toCheck = 0;
for (const m of matches) {
  if (!m.image || !m.barcode || isAgeRestricted({ name: m.name, cat: m.category })) continue;
  const one = prepareCatalog({
    shelves: ["x"], aisles: [["x", 0]], brands: [""],
    images: ["", m.image], items: [[m.matched_title, 0, 0, 1]],
  });
  if (photoFromCatalog(one, m.name)) {
    if (!sureIds.has(m.barcode)) {
      review.sure.push({ id: m.barcode, img: m.image, name: m.matched_title });
      sureIds.add(m.barcode);
      reviewById.delete(m.barcode);
      sure += 1;
    }
    continue;
  }
  const option = { img: m.image, name: m.matched_title };
  const listed = reviewById.get(m.barcode);
  if (listed) {
    if (!listed.options.some((o) => o.img === option.img)) listed.options = [option, ...listed.options].slice(0, 3);
  } else {
    reviewById.set(m.barcode, { id: m.barcode, name: m.name, unit: m.unit || "", options: [option] });
  }
  toCheck += 1;
}
review.review = [...reviewById.values()].filter((r) => !sureIds.has(r.id));
writeFileSync(REVIEW, JSON.stringify(review));
console.log(`matches ${matches.length}: sure ${sure} (now ${review.sure.length} in "Add them all"), to check ${toCheck} (list now ${review.review.length})`);
