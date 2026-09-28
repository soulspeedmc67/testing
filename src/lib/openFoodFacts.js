/**
 * Open Food Facts (OFF) client, used from the browser (the site is a static
 * export, so there is no server to go through; OFF answers with CORS open).
 *
 * OFF's limits are 100 product lookups and 10 searches a minute per user, so
 * every request goes through a queue that keeps under them. Photos are only
 * ever real OFF product photos: there is no stock-photo fallback. A product
 * without one shows its first letter instead (see components/ProductImage).
 *
 * Photos are CC BY-SA, credited on the Terms page.
 */

import { findInIndianCatalog } from "./barcodeCatalog";
import { pickFrontImage, isLookupBarcode } from "./productPhotoMatch";

const OFF_BASE = "https://world.openfoodfacts.org";
/* Its sister database for toothpaste, soap and other non-food items, same API
   and licence. Asked only when Open Food Facts has nothing. */
const OBF_BASE = "https://world.openbeautyfacts.org";
const PRODUCT_FIELDS = "code,product_name,product_name_en,brands,quantity,categories,selected_images,image_front_url,images";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * At most `perMinute` requests in any 60 seconds. Callers queue up in order;
 * each waits for a free slot, then runs (slots, not whole requests, are serial,
 * so a slow answer doesn't hold up the next one).
 */
function createRateLimiter(perMinute) {
  const started = [];
  let queue = Promise.resolve();
  return function schedule(task) {
    const slot = queue.then(async () => {
      for (;;) {
        const now = Date.now();
        while (started.length && now - started[0] >= 60_000) started.shift();
        if (started.length < perMinute) break;
        await sleep(60_000 - (now - started[0]) + 25);
      }
      started.push(Date.now());
    });
    queue = slot.catch(() => {});
    return slot.then(task);
  };
}

const QUEUES = {
  food: { base: OFF_BASE, product: createRateLimiter(100), search: createRateLimiter(10), country: "india" },
  beauty: { base: OBF_BASE, product: createRateLimiter(100), search: createRateLimiter(10), country: "" },
};

async function getJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw Object.assign(new Error(`Open Food Facts answered ${response.status}`), { retry: response.status >= 500 });
  }
  return response.json();
}

/* OFF's search is often briefly overloaded (503). Try again twice, each time
   through the same queue, so retries still count against the limits. */
async function withRetry(queue, task) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await queue(task);
    } catch (e) {
      const retryable = e?.retry || e?.name === "TypeError";
      if (!retryable || attempt >= 2) throw e;
      await sleep(attempt === 0 ? 2000 : 6000);
    }
  }
}

/**
 * One product by barcode, or null when the database doesn't know it.
 * `site`: "food" (Open Food Facts) or "beauty" (Open Beauty Facts).
 */
export function fetchOffProduct(barcode, { site = "food" } = {}) {
  const code = String(barcode || "").trim();
  if (!isLookupBarcode(code)) return Promise.resolve(null);
  const q = QUEUES[site];
  return withRetry(q.product, async () => {
    const data = await getJson(`${q.base}/api/v2/product/${encodeURIComponent(code)}.json?fields=${PRODUCT_FIELDS}`);
    return data?.status === 1 && data.product ? { ...data.product, code: data.product.code || code } : null;
  });
}

/** Products matching some words, best first (Open Food Facts: sold in India). */
export function searchOffProducts(terms, { pageSize = 12, site = "food" } = {}) {
  const query = String(terms || "").trim();
  if (!query) return Promise.resolve([]);
  const q = QUEUES[site];
  return withRetry(q.search, async () => {
    const url =
      `${q.base}/cgi/search.pl?search_terms=${encodeURIComponent(query)}` +
      `&search_simple=1&action=process&json=1&page_size=${pageSize}` +
      `${q.country ? `&countries_tags_en=${q.country}` : ""}&fields=${PRODUCT_FIELDS}`;
    const data = await getJson(url);
    return Array.isArray(data?.products) ? data.products : [];
  });
}

/** Classify text into a DASHit category. */
export function classifyCategory(categoriesText = "", productName = "") {
  const combined = `${categoriesText} ${productName}`.toLowerCase();
  if (/chip|crisp|nacho|kurkure|lays|dorito|puff/i.test(combined)) return "Snacks";
  if (/biscuit|cookie|wafer|rusk|parle-g|oreo|bourbon|good day/i.test(combined)) return "Biscuits";
  if (/snack|namkeen|bhujia|sev|popcorn|mixture|chana|peanut/i.test(combined)) return "Snacks";
  if (/beverage|drink|juice|soda|cola|pepsi|tea|chai|coffee|syrup|energy drink|squash|water/i.test(combined)) return "Beverages";
  if (/milk|dairy|curd|paneer|dahi|butter|cheese|ghee|cream|yogurt|lassi/i.test(combined)) return "Dairy";
  if (/vegetable|onion|potato|tomato|garlic|ginger|carrot|chilli|spinach|pea/i.test(combined)) return "Vegetables";
  if (/fruit|apple|banana|mango|orange|grape|pomegranate|papaya|lemon/i.test(combined)) return "Fruits";
  if (/spice|masala|turmeric|haldi|jeera|coriander|dhaniya|chilli powder|garam masala|salt/i.test(combined)) return "Spices";
  if (/noodle|maggi|pasta|macaroni|instant|ready-to-eat|oats|yippee|cuppa|soup/i.test(combined)) return "Instant Food";
  if (/soap|shampoo|toothpaste|brush|facewash|deodorant|lotion|cream|shave|sanitary|personal care/i.test(combined)) return "Personal Care";
  if (/detergent|cleaner|dishwash|surf|vim|harpic|mop|toilet|foil|repellent|household/i.test(combined)) return "Household Items";
  if (/rice|atta|wheat|flour|dal|pulse|grain|cereal|staple|oil|mustard oil|sunflower oil/i.test(combined)) return "Staples";
  if (/bread|bakery|cake|toast|pav|bun|lavas|croissant/i.test(combined)) return "Bakery";
  return "Snacks";
}

function toCatalogueItem(p) {
  const name = p.product_name_en || p.product_name || "";
  const img = pickFrontImage(p);
  return {
    barcode: p.code || "",
    name,
    brand: p.brands ? p.brands.split(",")[0].trim() : "",
    cat: classifyCategory(p.categories || "", name),
    unit: p.quantity || "1 pc",
    img,
    imgSource: img ? "openfoodfacts" : undefined,
    offBarcode: img ? p.code || "" : undefined,
    price: 40,
    originalPrice: 45,
    stock: 100,
  };
}

/** Looks up one product by barcode (the built-in Indian list first, then Open Food Facts). */
export async function searchOffByBarcode(barcode) {
  const cleanBarcode = String(barcode || "").trim();
  if (!cleanBarcode) {
    return { success: false, message: "Barcode is empty", products: [] };
  }

  try {
    const offProduct = await fetchOffProduct(cleanBarcode);
    const localMatch = findInIndianCatalog(cleanBarcode);
    if (localMatch) {
      // The built-in list has the details; the photo comes from OFF when it has one.
      const img = offProduct ? pickFrontImage(offProduct) : "";
      return {
        success: true,
        products: [{ ...localMatch, img, imgSource: img ? "openfoodfacts" : undefined, offBarcode: img ? cleanBarcode : undefined }],
      };
    }
    if (offProduct) {
      return { success: true, products: [toCatalogueItem(offProduct)] };
    }
    return { success: false, message: "Product not found in Open Food Facts database", products: [] };
  } catch (err) {
    const localMatch = findInIndianCatalog(cleanBarcode);
    if (localMatch) return { success: true, products: [{ ...localMatch, img: "" }] };
    return { success: false, message: err?.message || "Network error", products: [] };
  }
}

/** Searches Indian products by name (only ones with a photo). */
export async function searchOffByQuery(query) {
  try {
    const products = await searchOffProducts(query, { pageSize: 25 });
    const items = products
      .filter((p) => (p.product_name || p.product_name_en) && pickFrontImage(p))
      .map(toCatalogueItem);
    return { success: true, count: items.length, products: items };
  } catch (err) {
    return { success: false, message: err?.message || "Network error", products: [] };
  }
}
