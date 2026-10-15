import { normaliseName, photoFromCatalog } from "./productCatalog.js";
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

/** The website's photos, once per page load. Null if they couldn't be had (a failed fetch can be retried). */
export function loadSitePhotos() {
  if (!loading) {
    loading = fetch(PHOTOS_URL)
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error(`photos.php answered ${res.status}`))))
      .then((body) => {
        const names = new Map();
        for (const [name, img] of Object.entries(body?.names || {})) {
          const key = normaliseName(name);
          if (key && img) names.set(key, img);
        }
        return {
          files: new Set(Array.isArray(body?.files) ? body.files : []),
          names,
          barcodes: new Map(Object.entries(body?.barcodes || {})),
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
  let copy = filtered.get(catalog);
  if (!copy) {
    copy = {
      ...catalog,
      images: catalog.images.map((img) => (img && site.files.has(img.replace(CATALOG_PATH, "")) ? img : "")),
    };
    filtered.set(catalog, copy);
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
