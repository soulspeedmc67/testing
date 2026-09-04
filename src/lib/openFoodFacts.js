/**
 * Open Food Facts client — runs entirely in the admin's browser.
 *
 * The old Express server proxied this (server/index.js: /api/admin/products/
 * search-off) partly to set a `User-Agent` header. Browsers refuse to let JS set
 * that header (it's on the fetch forbidden-header list) — dropping it is not
 * optional, it silently would have been ignored anyway. OFF's public read API
 * supports CORS, so a direct call works without a server in front of it. This
 * is exactly the client-side pattern docs/FIRESTORE.md commits to for Spark
 * (no Cloud Functions to proxy through).
 *
 * If your network/region ever blocks world.openfoodfacts.net, searches will
 * fail with a network error surfaced to the caller — there is no server-side
 * fallback by design.
 */

const FALLBACK_IMG =
  "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=600&auto=format&fit=crop&q=80";

/** Same heuristic the old server used, so imported products land in the same categories. */
export function classifyCategory(categoriesText = "", productName = "") {
  const combined = `${categoriesText} ${productName}`.toLowerCase();
  if (/chip|crisp|nacho|kurkure|lays|dorito|puff/i.test(combined)) return "Chips";
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
  return "Snacks";
}

function extractBestFrontImage(product) {
  if (!product) return FALLBACK_IMG;
  const selected = product.selected_images?.front;
  if (selected?.display?.en) return selected.display.en.replace(/\.400\.jpg$/, ".full.jpg");
  if (selected?.display?.in) return selected.display.in;
  if (product.image_front_url) return product.image_front_url.replace(/\.400\.jpg$/, ".full.jpg");
  if (product.image_url) return product.image_url.replace(/\.400\.jpg$/, ".full.jpg");
  return FALLBACK_IMG;
}

function toCatalogueItem(p) {
  const name = p.product_name_en || p.product_name || "Indian FMCG Product";
  return {
    barcode: p.code || `IND-${Math.floor(10000000 + Math.random() * 90000000)}`,
    name,
    brand: p.brands ? p.brands.split(",")[0].trim() : "Indian Brand",
    cat: classifyCategory(p.categories || "", name),
    unit: p.quantity || "1 pc",
    img: extractBestFrontImage(p),
    price: 40,
    originalPrice: 45,
    badge: "Indian FMCG",
  };
}

/** Looks up one product by barcode. Returns { success, products, message? }. */
export async function searchOffByBarcode(barcode) {
  try {
    const resp = await fetch(
      `https://world.openfoodfacts.net/api/v0/product/${encodeURIComponent(barcode.trim())}.json`
    );
    const data = await resp.json();
    if (data.status === 1 && data.product) {
      const item = toCatalogueItem(data.product);
      return { success: true, products: [{ ...item, badge: "OFF Verified" }] };
    }
    return { success: false, message: "Product not found in Open Food Facts database", products: [] };
  } catch (err) {
    return { success: false, message: err?.message || "Network error", products: [] };
  }
}

/** Searches Indian FMCG products by name. Returns { success, count, products, message? }. */
export async function searchOffByQuery(query) {
  try {
    const url =
      `https://world.openfoodfacts.net/cgi/search.pl?search_terms=${encodeURIComponent(query.trim())}` +
      `&search_simple=1&action=process&json=1&page_size=25&countries_tags_en=india`;
    const resp = await fetch(url);
    const data = await resp.json();
    const items = (data.products || [])
      .filter((p) => (p.product_name || p.product_name_en) && (p.image_front_url || p.image_url))
      .map(toCatalogueItem);
    return { success: true, count: items.length, products: items };
  } catch (err) {
    return { success: false, message: err?.message || "Network error", products: [] };
  }
}
