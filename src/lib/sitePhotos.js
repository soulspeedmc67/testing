import { normaliseName, photoFromCatalog, catalogPhotoUrl, searchCatalog } from "./productCatalog.js";
import { opensAsPhoto } from "./photoQuality.js";

/**
 * Product photos already on the website (Hostinger), for new products to get
 * one by themselves (api/catalog/photos.php):
 *  1. the photo the same barcode had in the shop before,
 *  2. the photo the same product name had (a cleared and re-uploaded stock
 *     list gets its photos back),
 *  3. the same product's photo in the product list (photoFromCatalog), only
 *     among photos really on the website.
 * Open Food Facts is asked only for what's left (productPhotoFinder).
 */

const ORIGIN =
  typeof window !== "undefined" && /^(localhost|127\.|\[::1\])/.test(window.location.hostname)
    ? "https://dashit.co.in"
    : "";
const PHOTOS_URL = `${ORIGIN}/api/catalog/photos.php`;
const CATALOG_PATH = /^.*?\/?products\/(?:catalog|thumbs)\//;

let loading = null;

/** A website path as the full address, which every app version can load. */
const absolute = (img) => (/^\/products\//.test(String(img || "")) ? `https://dashit.co.in${img}` : img);

/** The website's photos, once per page load. Null if they couldn't be had (a failed fetch can be retried). */
export function loadSitePhotos() {
  if (!loading) {
    loading = fetch(PHOTOS_URL)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`photos.php answered ${res.status}`))))
      .then((body) => {
        const names = new Map();
        const named = [];
        for (const [name, img] of Object.entries(body?.names || {})) {
          const key = normaliseName(name);
          if (key && img) {
            names.set(key, absolute(img));
            named.push({ name, img: absolute(img) });
          }
        }
        return {
          files: new Set(Array.isArray(body?.files) ? body.files : []),
          names,
          named,
          barcodes: new Map(Object.entries(body?.barcodes || {}).map(([code, img]) => [code, absolute(img)])),
        };
      })
      .catch(() => {
        loading = null;
        return null;
      });
  }
  return loading;
}

const filtered = new WeakMap();

/** The product list with only the photos on the website (the rest blank, so photoFromCatalog skips them). */
function onSiteCatalog(catalog, site) {
  if (!site || site.files.size === 0) return catalog;
  let bySite = filtered.get(catalog);
  if (!bySite) filtered.set(catalog, (bySite = new WeakMap()));
  let copy = bySite.get(site);
  if (!copy) {
    copy = {
      ...catalog,
      images: catalog.images.map((img) => (img && site.files.has(img.replace(CATALOG_PATH, "")) ? img : "")),
    };
    bySite.set(site, copy);
  }
  return copy;
}

/** `{ img, via: "barcode" | "name" | "catalog" }` for `{ name, barcode }`, or null. */
export function photoFromSite(site, catalog, { name, barcode } = {}) {
  if (site) {
    const code = String(barcode || "").trim();
    if (code && site.barcodes.has(code)) return { img: site.barcodes.get(code), via: "barcode" };
    const key = normaliseName(name);
    if (key && site.names.has(key)) return { img: site.names.get(key), via: "name" };
  }
  const hit = catalog ? photoFromCatalog(onSiteCatalog(catalog, site), name) : null;
  return hit ? { img: hit.img, via: "catalog" } : null;
}

/**
 * Whether the photo opens, small copy or original: either can be the one on
 * the host (as components/ProductImage loads them).
 */
export async function sitePhotoOpens(img) {
  const value = String(img || "");
  const onSite = value.match(CATALOG_PATH);
  if (!onSite) return opensAsPhoto(value);
  const path = value.slice(onSite[0].length);
  if (await opensAsPhoto(`https://dashit.co.in/products/thumbs/${path}`)) return true;
  return opensAsPhoto(`https://dashit.co.in/products/catalog/${path}`);
}

/* ---------- Photos to choose from ("Check photos") ---------- */

const UNITS = new Set(
  "g gm gms gram grams kg kgs ml l ltr ltrs litre litres liter liters pc pcs piece pieces pack packet pkt x combo pouch bottle jar box".split(" ")
);
const stem = (w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w);
const nameWords = (name) =>
  normaliseName(name)
    .split(" ")
    .filter((w) => w && !/^\d/.test(w) && !UNITS.has(w))
    .map(stem);

function oneEditApart(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (a.length > b.length) i += 1;
    else if (b.length > a.length) j += 1;
    else {
      i += 1;
      j += 1;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}
// A one-letter typo or a shortened word only counts on words of five letters
// or more: "top" isn't "topical" (as scripts/suggest-store-photos.mjs).
const sameWord = (s, l) => s === l || (s.length >= 5 && l.length >= 5 && (oneEditApart(s, l) || l.startsWith(s)));

const pools = new WeakMap();

/**
 * Everything a photo can be chosen from, indexed by the first three letters of
 * the brand word: the shop's earlier photos (and its own uploads) first, then
 * the product list's photos that are on the website.
 */
function photoPool(site, catalog) {
  const key = site || catalog;
  if (!key) return null;
  const cached = pools.get(key);
  if (cached && cached.catalog === catalog) return cached;
  const entries = [];
  for (const { name, img } of site?.named || []) entries.push({ name, img, own: true });
  if (catalog) {
    const list = onSiteCatalog(catalog, site);
    for (let i = 0; i < list.size; i += 1) {
      const img = list.images[list.imageOf[i] || 0];
      if (img) entries.push({ name: list.names[i], img: catalogPhotoUrl(img), own: false });
    }
  }
  const byStart = new Map();
  entries.forEach((entry, index) => {
    entry.words = nameWords(entry.name);
    if (!entry.words.length) return;
    const start = entry.words[0].slice(0, 3);
    if (!byStart.has(start)) byStart.set(start, []);
    byStart.get(start).push(index);
  });
  const pool = { catalog, entries, byStart };
  pools.set(key, pool);
  return pool;
}

/**
 * Up to `limit` photos that are likely this product, closest first:
 * `[{ img, name, own }]` (`own`: a photo the shop had for an item of that name).
 * Same brand word and at least 60% of the product's words, never a guess
 * further off than that.
 */
export function photoOptions(site, catalog, product, limit = 4) {
  const pool = photoPool(site, catalog);
  const words = [...new Set(nameWords(product?.name))];
  if (!pool || words.length === 0) return [];
  const need = Math.max(Math.min(2, words.length), Math.ceil(words.length * 0.6));
  const scored = [];
  for (const index of pool.byStart.get(words[0].slice(0, 3)) || []) {
    const entry = pool.entries[index];
    if (!sameWord(words[0], entry.words[0])) continue;
    const hits = words.filter((w) => entry.words.some((l) => sameWord(w, l))).length;
    if (hits < need) continue;
    const extras = entry.words.filter((l) => !words.some((w) => sameWord(w, l))).length;
    scored.push({ entry, score: hits / words.length - 0.05 * extras + (entry.own ? 0.02 : 0) });
  }
  scored.sort((a, b) => b.score - a.score);
  const seen = new Set();
  const out = [];
  for (const { entry } of scored) {
    if (seen.has(entry.img)) continue;
    seen.add(entry.img);
    out.push({ img: entry.img, name: entry.name, own: entry.own });
    if (out.length === limit) break;
  }
  return out;
}

/** Photos for whatever the owner types ("amul butter"): the product list's, on the website only. */
export function searchSitePhotos(site, catalog, query, limit = 8) {
  if (!catalog) return [];
  return searchCatalog(onSiteCatalog(catalog, site), query, limit * 3)
    .filter((item) => item.img)
    .slice(0, limit)
    .map((item) => ({ img: catalogPhotoUrl(item.img), name: item.name, own: false }));
}
