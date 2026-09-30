// Run with: npm test   (node --test tests/)
import test from "node:test";
import assert from "node:assert/strict";

import { photosFirst, photoGaps, parsePhotoLinks } from "../src/lib/productPhotoMatch.js";

const off = "https://images.openfoodfacts.org/images/products/890/171/912/3870/front_en.27.full.jpg";
const stock = "https://images.unsplash.com/photo-1?w=400";

test("photosFirst puts items with a real photo first and keeps order inside each group", () => {
  const list = [
    { id: "a", img: "" },
    { id: "b", img: off },
    { id: "c", img: stock },
    { id: "d", img: "/products/enriched/1.webp" },
    { id: "e" },
  ];
  assert.deepEqual(photosFirst(list).map((p) => p.id), ["b", "d", "a", "c", "e"]);
  assert.deepEqual(photosFirst([]), []);
  assert.deepEqual(photosFirst(null), []);
});

test("photoGaps lists missing photos by most stock first, then weak ones", () => {
  const gaps = photoGaps([
    { id: "low", img: "", stock: 2 },
    { id: "ok", img: off, photoQuality: "good" },
    { id: "weak", img: off, photoQuality: "weak", photoIssues: ["Too small"] },
    { id: "high", img: stock, stock: 40 },
  ]);
  assert.deepEqual(gaps.map((g) => g.product.id), ["high", "low", "weak"]);
  assert.equal(gaps[2].reason, "Too small");
});

test("parsePhotoLinks reads barcode + image and ignores every other column", () => {
  const rows = [
    ["﻿barcode", "name", "quantity", "image"],
    ["CSV-1", "Face wash", "99", off],
    ["'-odd-id", "Formula-safe id", "", off],
    ["CSV-2", "No link yet", "", ""],
    ["CSV-3", "Stock photo", "", stock],
    ["CSV-1", "Repeat", "", off],
    ["CSV-4", "Not a link", "", "see shelf"],
  ];
  const { links, skipped, error } = parsePhotoLinks(rows);
  assert.equal(error, "");
  assert.deepEqual(links, [
    { id: "CSV-1", url: off },
    { id: "-odd-id", url: off },
  ]);
  assert.equal(skipped, 3);
});

test("parsePhotoLinks explains a file without the needed columns", () => {
  assert.match(parsePhotoLinks([["name", "image"]]).error, /barcode column/);
  assert.match(parsePhotoLinks([]).error, /empty/);
});
