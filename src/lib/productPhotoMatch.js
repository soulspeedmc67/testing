/**
 * The rules for finding a product's photo on Open Food Facts (OFF): which
 * products need one, which photo on an OFF record to use, and whether a name
 * search result is really the same product. A wrong photo is worse than none,
 * so a search result is only accepted when the brand matches and most of the
 * name (or the pack size) does too.
 *
 * No imports on purpose: `node --test tests/` checks these rules directly.
 */

/* Hosts of the stock photos the catalogue used to fill gaps with. A product
   showing one of these has no real photo. */
const PLACEHOLDER_HOSTS = ["unsplash.com", "picsum.photos", "placeholder.com", "placehold.co", "dummyimage.com"];

/** True when a product has no real photo: nothing, a broken value, or a stock placeholder. */
export function isPlaceholderImage(url) {
  const value = String(url || "").trim();
  if (!value) return true;
  if (value.startsWith("data:image/") || value.startsWith("/")) return false;
  let host;
  try {
    host = new URL(value).hostname.toLowerCase();
  } catch {
    return true;
  }
  return PLACEHOLDER_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
}

/**
 * Whether an import should look this product's photo up. Photos the admin set
 * (by hand, or through the CSV's image column) and photos already found are
 * kept, and so is a removal: a photo marked wrong is not fetched again. Only
 * "Replace photos" overrides all of that.
 */
export function needsPhotoLookup(product, { replace = false } = {}) {
  if (replace) return true;
  if (!product) return true;
  if (product.photoRejected) return false;
  return isPlaceholderImage(product.img);
}

/** EAN-8, UPC-A, EAN-13 and GTIN-14 are what OFF records are keyed by. */
export function isLookupBarcode(code) {
  return /^(\d{8}|\d{12,14})$/.test(String(code || "").trim());
}

/* Front photo language preference: English, then Indian languages, then any. */
const LANGUAGE_ORDER = ["en", "hi", "mr", "ta", "te", "kn", "ml", "bn", "gu", "pa", "or", "as", "ur", "ne", "sa", "in"];

/** OFF serves 100/200/400px copies; the same path with ".full" is the original upload. */
export function toFullSizeImage(url) {
  return String(url || "").replace(/\.(100|200|400)\.(jpg|jpeg|png|webp)$/i, ".full.$2");
}

/** The front photo of an OFF record, full size, or "" when it has none. */
export function pickFrontImage(product) {
  const display = product?.selected_images?.front?.display || {};
  for (const lang of LANGUAGE_ORDER) {
    if (display[lang]) return toFullSizeImage(display[lang]);
  }
  const any = Object.values(display).find(Boolean);
  if (any) return toFullSizeImage(any);
  if (product?.image_front_url) return toFullSizeImage(product.image_front_url);
  return "";
}

/**
 * The original size of an OFF photo, from the record's `images` metadata
 * (`front_en` → sizes.full), so the quality check needn't download it.
 */
export function frontImageSize(product, url = pickFrontImage(product)) {
  const key = String(url).match(/\/(front_[a-z]{2,3})\.\d+\./)?.[1];
  const full = key ? product?.images?.[key]?.sizes?.full : null;
  return full && full.w > 0 && full.h > 0 ? { width: full.w, height: full.h } : null;
}

/** The 400px copy OFF keeps next to every original, for quick checks and cards. */
export function toSmallImage(url) {
  return String(url || "").replace(/\.full\.(jpg|jpeg|png|webp)$/i, ".400.$1");
}

// ---------------------------------------------------------------------------
// Words, brands and pack sizes

const STOP_WORDS = new Set([
  "and", "the", "of", "with", "for", "in", "a", "an", "new", "pack", "packet", "pouch", "box", "bottle",
  "jar", "tin", "can", "pc", "pcs", "piece", "pieces", "combo", "free", "offer", "value", "family",
]);

/* Words in company names that say nothing about which brand it is. */
const CORPORATE_WORDS = new Set([
  "ltd", "limited", "pvt", "private", "company", "co", "corp", "corporation", "inc", "india", "indian",
  "products", "product", "foods", "food", "industries", "group", "brands", "brand", "consumer", "international",
]);

const UNIT_WORDS = /^(\d+(\.\d+)?)?(g|gm|gms|gram|grams|kg|kgs|ml|l|ltr|ltrs|litre|litres|liter|liters)$/;

/** Lowercase words without accents or punctuation: "Parle-G Gold 1 kg" → ["parle", "g", "gold", "1", "kg"]. */
export function words(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

/** Words that tell one product from another: no numbers, units or filler. */
function significantWords(text) {
  return words(text).filter((w) => w.length > 1 && !/^\d+$/.test(w) && !UNIT_WORDS.test(w) && !STOP_WORDS.has(w));
}

function brandWords(text) {
  return significantWords(text).filter((w) => w.length >= 3 && !CORPORATE_WORDS.has(w));
}

/**
 * The pack size in grams or millilitres, from text like "500 g", "1kg" or
 * "Tata Salt 1 Kg Pouch". null when there's none.
 */
export function parsePackSize(text) {
  const match = String(text || "")
    .toLowerCase()
    .match(/(\d+(?:\.\d+)?)\s*(kg|kgs|g|gm|gms|grams?|ml|l|ltrs?|litres?|liters?)\b/);
  if (!match) return null;
  const amount = parseFloat(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  const unit = match[2];
  if (/^kg/.test(unit)) return { base: "g", amount: amount * 1000 };
  if (/^(g|gm|gms|gram)/.test(unit)) return { base: "g", amount };
  if (unit === "ml") return { base: "ml", amount };
  return { base: "ml", amount: amount * 1000 };
}

function sameSize(a, b) {
  if (!a || !b || a.base !== b.base) return false;
  return Math.abs(a.amount - b.amount) <= Math.max(a.amount, b.amount) * 0.02;
}

/** A word counts as present when it's there, or one is the start of the other ("choco" / "chocolate"). */
function hasWord(set, word) {
  if (set.has(word)) return true;
  if (word.length < 4) return false;
  for (const other of set) {
    if (other.length >= 4 && (other.startsWith(word) || word.startsWith(other))) return true;
  }
  return false;
}

/**
 * Same brand? Uses the CSV's brand column, or, when that's empty, looks for
 * the OFF brand in the product's name ("Parle-G" → Parle).
 */
export function brandMatches(row, offProduct) {
  const offBrand = new Set(brandWords(offProduct?.brands));
  if (offBrand.size === 0) return false;
  const rowBrand = brandWords(row?.brand);
  if (rowBrand.length > 0) return rowBrand.some((w) => hasWord(offBrand, w));
  const nameWords = new Set(significantWords(row?.name));
  return [...offBrand].some((w) => hasWord(nameWords, w));
}

/**
 * How well a search result fits a CSV row. `accepted` only when the brand
 * matches and 60% of the name's words are in the result, or the pack size is
 * the same and at least a third of the words are. Barcode hits don't need
 * this: the barcode already says which product it is.
 */
export function scoreMatch(row, offProduct) {
  const offName = offProduct?.product_name_en || offProduct?.product_name || "";
  const brandOk = brandMatches(row, offProduct);
  const brandSet = new Set([...brandWords(row?.brand), ...brandWords(offProduct?.brands)]);
  const rowWords = significantWords(row?.name).filter((w) => !hasWord(brandSet, w));
  const offWords = new Set(significantWords(`${offName} ${offProduct?.brands || ""}`));
  const matched = rowWords.filter((w) => hasWord(offWords, w)).length;
  const overlap = rowWords.length ? matched / rowWords.length : null;
  const sizeMatch = sameSize(
    parsePackSize(`${row?.unit || ""} ${row?.name || ""}`),
    parsePackSize(`${offProduct?.quantity || ""} ${offName}`)
  );
  const hasImage = Boolean(pickFrontImage(offProduct));
  const accepted =
    hasImage &&
    brandOk &&
    ((overlap !== null && overlap >= 0.6) || (sizeMatch && (overlap === null || overlap >= 0.34)));
  return { accepted, overlap, sizeMatch, brandOk, score: (overlap || 0) + (sizeMatch ? 0.3 : 0) };
}

/** The best accepted search result for a row, or null. */
export function chooseSearchMatch(row, candidates = []) {
  let best = null;
  for (const candidate of candidates) {
    const result = scoreMatch(row, candidate);
    if (result.accepted && (!best || result.score > best.score)) best = { product: candidate, ...result };
  }
  return best;
}

/** What to search OFF for when there's no barcode: brand and name, without the pack size. */
export function searchTermsFor(row) {
  const brand = String(row?.brand || "").trim();
  const name = String(row?.name || "")
    .replace(/(\d+(?:\.\d+)?)\s*(kg|kgs|g|gm|gms|grams?|ml|l|ltrs?|litres?|liters?)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const nameHasBrand = brand && name.toLowerCase().includes(brand.toLowerCase());
  return (nameHasBrand || !brand ? name : `${brand} ${name}`).trim();
}
