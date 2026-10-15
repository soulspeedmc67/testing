/**
 * Finds product photos after a stock import, in the background: the stock is
 * saved first, then each product without a photo gets the one already on the
 * website if there is one (sitePhotos). The shop uploads its own photos, so the
 * automatic search no longer asks Open Food Facts; findPhotoFor (one product,
 * Add product screen) still does, by barcode first and by brand + name second (the name match has to be
 * clearly the same product, see productPhotoMatch). Found photos are saved in
 * small batches as they come in, with where they came from.
 *
 * Photos are saved as links (the Open Food Facts address), never uploaded;
 * the storefront does the white-square look in CSS (components/ProductImage).
 */

import { fetchOffProduct, searchOffProducts } from "./openFoodFacts";
import {
  chooseSearchMatch,
  frontImageSize,
  isLookupBarcode,
  needsPhotoLookup,
  pickFrontImage,
  searchTermsFor,
  toSmallImage,
} from "./productPhotoMatch";
import { checkPhoto, qualityReasons } from "./photoQuality";
import { saveFoundProductPhotos } from "./db";
import { loadCatalog } from "./productCatalog";
import { loadSitePhotos, photoFromSite, sitePhotoOpens } from "./sitePhotos";

async function runPool(items, limit, worker) {
  let next = 0;
  const lanes = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      await worker(items[index]);
    }
  });
  await Promise.all(lanes);
}

/** One product: `{ status: "found" | "missing" | "error", img, offBarcode, via, weak, issues }`. */
export async function findPhotoFor(item) {
  return findOne(item);
}

async function findOne(item) {
  const row = { name: item.name, brand: item.brand, unit: item.unit };
  let record = null;
  let via = "";
  // Open Food Facts first; Open Beauty Facts for toothpaste, soap and the like.
  for (const site of ["food", "beauty"]) {
    if (isLookupBarcode(item.barcode)) {
      const byBarcode = await fetchOffProduct(item.barcode, { site });
      if (byBarcode && pickFrontImage(byBarcode)) {
        record = byBarcode;
        via = "barcode";
        break;
      }
    }
    const terms = searchTermsFor(row);
    if (terms) {
      const best = chooseSearchMatch(row, await searchOffProducts(terms, { site }));
      if (best) {
        record = best.product;
        via = "search";
        break;
      }
    }
  }
  if (!record) return { status: "missing" };

  const img = pickFrontImage(record);
  // A photo the admin already marked wrong is never put back.
  if (item.current?.rejectedPhoto && item.current.rejectedPhoto === img) return { status: "missing" };

  // Size from OFF's own metadata; "looks blank" from the small copy.
  const size = frontImageSize(record, img);
  const sample = await checkPhoto(toSmallImage(img));
  const issues = qualityReasons({
    width: size?.width ?? Infinity,
    height: size?.height ?? Infinity,
    flat: sample.checked ? sample.flat : false,
  });
  return { status: "found", img, offBarcode: record.code || item.barcode || "", via, weak: issues.length > 0, issues };
}

/**
 * Looks photos up for imported products. `items`: `[{ id, name, brand, unit,
 * barcode, current }]`, where `current` is the product as it is now (null for
 * a new one). Products that already have a photo are skipped unless `replace`.
 * `onProgress({ done, total, found })` after each one.
 */
export async function findProductPhotos(items, { replace = false, onProgress, concurrency = 4 } = {}) {
  const todo = items.filter((item) => needsPhotoLookup(item.current, { replace }));
  const [catalog, site] =
    todo.length > 0 ? await Promise.all([loadCatalog().catch(() => null), loadSitePhotos()]) : [null, null];

  /** The website's own photo for this product, if it has one that opens. */
  const fromSite = async (item) => {
    if (!catalog && !site) return null;
    const hit = photoFromSite(site, catalog, item);
    if (!hit || hit.img === item.current?.rejectedPhoto || !(await sitePhotoOpens(hit.img))) return null;
    return { status: "found", img: hit.img, source: "website", via: hit.via, weak: false, issues: [] };
  };
  const results = [];
  const pending = [];
  let done = 0;
  let found = 0;
  const report = () => onProgress?.({ done, total: todo.length, found });
  report();

  const flush = async () => {
    if (pending.length === 0) return;
    const batch = pending.splice(0);
    try {
      await saveFoundProductPhotos(batch);
    } catch (e) {
      batch.forEach((b) => {
        const result = results.find((r) => r.id === b.id);
        if (result) Object.assign(result, { status: "error", error: "Couldn't save the photo" });
      });
    }
  };

  await runPool(todo, concurrency, async (item) => {
    let result;
    try {
      // Only the shop's own photos on the website: Open Food Facts isn't asked.
      result = { id: item.id, name: item.name, ...((await fromSite(item)) || { status: "missing" }) };
    } catch (e) {
      result = { id: item.id, name: item.name, status: "error", error: e?.message || "Lookup failed" };
    }
    results.push(result);
    if (result.status === "found") {
      found += 1;
      pending.push(result);
      if (pending.length >= 20) await flush();
    }
    done += 1;
    report();
  });
  await flush();

  return {
    looked: todo.length,
    skipped: items.length - todo.length,
    found: results.filter((r) => r.status === "found").length,
    results,
  };
}
