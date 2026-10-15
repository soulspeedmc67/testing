// Run with: npm test   (node --test tests/)
import test from "node:test";
import assert from "node:assert/strict";

import { prepareCatalog } from "../src/lib/productCatalog.js";
import { photoFromSite } from "../src/lib/sitePhotos.js";

const catalog = prepareCatalog({
  shelves: ["Dairy"],
  aisles: [["Milk", 0]],
  brands: ["Amul"],
  images: ["", "/products/catalog/dairy/gold.webp", "/products/catalog/dairy/taaza.webp"],
  items: [
    ["Amul Gold Milk", 0, 0, 1],
    ["Amul Taaza Milk", 0, 0, 2],
  ],
});

const site = (files, names = {}, barcodes = {}) => ({
  files: new Set(files),
  names: new Map(Object.entries(names)),
  barcodes: new Map(Object.entries(barcodes)),
});

test("photoFromSite: same barcode first, then the same name the shop had", () => {
  const s = site([], { "amul butter 100g": "/products/uploads/dsh_a.webp" }, { "8901262150019": "/products/uploads/dsh_b.webp" });
  assert.deepEqual(photoFromSite(s, catalog, { name: "Amul Butter 100g", barcode: "8901262150019" }), {
    img: "/products/uploads/dsh_b.webp",
    via: "barcode",
  });
  assert.deepEqual(photoFromSite(s, catalog, { name: "AMUL Butter 100G", barcode: "" }), {
    img: "/products/uploads/dsh_a.webp",
    via: "name",
  });
});

test("photoFromSite: a product-list photo only when the file is on the website", () => {
  const onlyTaaza = site(["dairy/taaza.webp"]);
  assert.equal(photoFromSite(onlyTaaza, catalog, { name: "Amul Gold Milk" }), null);
  assert.equal(photoFromSite(onlyTaaza, catalog, { name: "Amul Taaza Milk" }).img, "https://dashit.co.in/products/catalog/dairy/taaza.webp");
  // No list of files (photos.php didn't answer): the product list as before.
  assert.equal(photoFromSite(null, catalog, { name: "Amul Gold Milk" }).img, "https://dashit.co.in/products/catalog/dairy/gold.webp");
});

test("photoOptions: close photos to choose from, the closest first, the shop's earlier ones included", async () => {
  const { photoOptions } = await import("../src/lib/sitePhotos.js");
  const s = {
    files: new Set(["dairy/gold.webp", "dairy/taaza.webp"]),
    names: new Map(),
    barcodes: new Map(),
    named: [{ name: "Amul Gold Full Cream Milk", img: "/products/uploads/dsh_g.webp" }],
  };
  const options = photoOptions(s, catalog, { name: "Amul Gold Milk 500ml" });
  assert.equal(options[0].img, "https://dashit.co.in/products/catalog/dairy/gold.webp");
  assert.ok(options.some((o) => o.img === "/products/uploads/dsh_g.webp" && o.own));
  // Another brand is never offered.
  assert.deepEqual(photoOptions(s, catalog, { name: "Nestle Gold Milk" }), []);
});
