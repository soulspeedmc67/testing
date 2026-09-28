// Run with: npm test   (node --test tests/)
import test from "node:test";
import assert from "node:assert/strict";

import {
  isPlaceholderImage,
  needsPhotoLookup,
  isLookupBarcode,
  pickFrontImage,
  parsePackSize,
  brandMatches,
  scoreMatch,
  chooseSearchMatch,
  searchTermsFor,
} from "../src/lib/productPhotoMatch.js";
import { findContentBox, isMostlyFlat, qualityReasons } from "../src/lib/photoQuality.js";

// Shaped like real Open Food Facts API v2 answers.
const parleG = {
  code: "8901719134845",
  product_name: "Parle-G Original Gluco Biscuits",
  brands: "Parle",
  quantity: "250 g",
  selected_images: {
    front: {
      display: {
        hi: "https://images.openfoodfacts.org/images/products/890/171/913/4845/front_hi.12.400.jpg",
        en: "https://images.openfoodfacts.org/images/products/890/171/913/4845/front_en.20.400.jpg",
      },
    },
  },
};
const tataSalt = {
  product_name: "Tata Salt Iodised",
  brands: "Tata, Tata Consumer Products",
  quantity: "1 kg",
  image_front_url: "https://images.openfoodfacts.org/images/products/890/172/500/1238/front_en.5.400.jpg",
};
const catchSalt = {
  product_name: "Catch Iodised Salt",
  brands: "Catch",
  quantity: "1 kg",
  image_front_url: "https://images.openfoodfacts.org/images/products/111/front_en.3.400.jpg",
};

test("barcode hit: the English front photo, full size", () => {
  assert.equal(isLookupBarcode("8901719134845"), true);
  assert.equal(
    pickFrontImage(parleG),
    "https://images.openfoodfacts.org/images/products/890/171/913/4845/front_en.20.full.jpg"
  );
});

test("front photo falls back to an Indian language, then any language", () => {
  const hindiOnly = { selected_images: { front: { display: { hi: "https://x/front_hi.1.400.jpg" } } } };
  assert.equal(pickFrontImage(hindiOnly), "https://x/front_hi.1.full.jpg");
  const frenchOnly = { selected_images: { front: { display: { fr: "https://x/front_fr.1.400.jpg" } } } };
  assert.equal(pickFrontImage(frenchOnly), "https://x/front_fr.1.full.jpg");
  assert.equal(pickFrontImage({}), "");
});

test("name search hit: same brand, same words, same pack size", () => {
  const row = { name: "Tata Salt Iodised 1 kg", brand: "Tata", unit: "1 kg" };
  const result = scoreMatch(row, tataSalt);
  assert.equal(result.brandOk, true);
  assert.equal(result.sizeMatch, true);
  assert.equal(result.accepted, true);
});

test("name search: brand found in the name when the brand column is empty", () => {
  const row = { name: "Parle-G Original Gluco Biscuits 250g", brand: "", unit: "" };
  assert.equal(brandMatches(row, parleG), true);
  assert.equal(scoreMatch(row, parleG).accepted, true);
});

test("wrong brand is rejected even when the words and size match", () => {
  const row = { name: "Tata Salt Iodised 1 kg", brand: "Tata", unit: "1 kg" };
  assert.equal(scoreMatch(row, catchSalt).accepted, false);
  const best = chooseSearchMatch(row, [catchSalt, tataSalt]);
  assert.equal(best.product, tataSalt);
  assert.equal(chooseSearchMatch(row, [catchSalt]), null);
});

test("same brand but a different product is rejected", () => {
  const row = { name: "Parle Monaco Salted Crackers", brand: "Parle", unit: "" };
  assert.equal(scoreMatch(row, parleG).accepted, false);
});

test("a result without a photo is never accepted", () => {
  const row = { name: "Tata Salt Iodised 1 kg", brand: "Tata" };
  const noPhoto = { ...tataSalt, image_front_url: undefined };
  assert.equal(scoreMatch(row, noPhoto).accepted, false);
});

test("an image already in the CSV, or set by hand, is kept", () => {
  assert.equal(needsPhotoLookup({ img: "https://shop.example/photos/milk.jpg", imgSource: "csv" }), false);
  assert.equal(needsPhotoLookup({ img: "https://shop.example/photos/milk.jpg", imgSource: "manual" }), false);
  assert.equal(needsPhotoLookup({ img: "https://shop.example/photos/milk.jpg", imgSource: "manual" }, { replace: true }), true);
});

test("stock photos and empty images count as no photo; a removed wrong photo stays removed", () => {
  assert.equal(isPlaceholderImage("https://images.unsplash.com/photo-1?w=400"), true);
  assert.equal(isPlaceholderImage(""), true);
  assert.equal(isPlaceholderImage("https://images.openfoodfacts.org/x.full.jpg"), false);
  assert.equal(needsPhotoLookup({ img: "https://images.unsplash.com/photo-1" }), true);
  assert.equal(needsPhotoLookup({ img: "", photoRejected: true }), false);
});

test("pack sizes read the same in g/kg and ml/l", () => {
  assert.deepEqual(parsePackSize("1 Kg pouch"), { base: "g", amount: 1000 });
  assert.deepEqual(parsePackSize("500ml"), { base: "ml", amount: 500 });
  assert.deepEqual(parsePackSize("1.5 L"), { base: "ml", amount: 1500 });
  assert.equal(parsePackSize("Assorted"), null);
});

test("search terms: brand and name, no pack size", () => {
  assert.equal(searchTermsFor({ name: "Maggi 2-Minute Masala Noodles 70 g", brand: "Nestle" }), "Nestle Maggi 2-Minute Masala Noodles");
  assert.equal(searchTermsFor({ name: "Tata Salt 1 kg", brand: "Tata" }), "Tata Salt");
});

// --- Canvas clean-up geometry ---------------------------------------------

/** A white RGBA image with one solid block, like a product on a white background. */
function imageWithBlock(width, height, block, color = [200, 30, 30]) {
  const data = new Uint8ClampedArray(width * height * 4).fill(255);
  for (let y = block.y; y < block.y + block.height; y += 1) {
    for (let x = block.x; x < block.x + block.width; x += 1) {
      const i = (y * width + x) * 4;
      data[i] = color[0];
      data[i + 1] = color[1];
      data[i + 2] = color[2];
    }
  }
  return data;
}

test("trimming finds the product inside the white border", () => {
  const data = imageWithBlock(300, 200, { x: 40, y: 50, width: 120, height: 60 });
  assert.deepEqual(findContentBox(data, 300, 200), { x: 40, y: 50, width: 120, height: 60, empty: false });
});

test("quality check: small or blank photos go on the needs-a-better-photo list", () => {
  assert.deepEqual(qualityReasons({ width: 250, height: 400, flat: false }), ["Too small"]);
  assert.deepEqual(qualityReasons({ width: 800, height: 800, flat: true }), ["Looks blank"]);
  assert.deepEqual(qualityReasons({ width: 800, height: 800, flat: false }), []);

  const blank = imageWithBlock(100, 100, { x: 0, y: 0, width: 100, height: 100 }, [120, 120, 120]);
  assert.equal(isMostlyFlat(blank, 100, 100), true);
  const striped = new Uint8ClampedArray(100 * 100 * 4);
  for (let i = 0; i < 100 * 100; i += 1) {
    const x = i % 100;
    striped.set(x < 50 ? [220, 40, 40, 255] : [30, 60, 200, 255], i * 4);
  }
  assert.equal(isMostlyFlat(striped, 100, 100), false);
});

test("photo size comes from OFF's metadata, not a download", async () => {
  const { frontImageSize, toSmallImage } = await import("../src/lib/productPhotoMatch.js");
  const record = {
    selected_images: { front: { display: { en: "https://images.openfoodfacts.org/images/products/890/171/913/4845/front_en.11.400.jpg" } } },
    images: { front_en: { sizes: { full: { w: 2535, h: 2735 } } } },
  };
  assert.deepEqual(frontImageSize(record), { width: 2535, height: 2735 });
  assert.equal(frontImageSize({ selected_images: record.selected_images }), null);
  assert.equal(
    toSmallImage("https://images.openfoodfacts.org/images/products/890/171/913/4845/front_en.11.full.jpg"),
    "https://images.openfoodfacts.org/images/products/890/171/913/4845/front_en.11.400.jpg"
  );
});
