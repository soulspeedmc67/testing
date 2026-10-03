import { isAgeRestricted } from "./ageGate";
import { isNative, isIOS } from "./platform";
import { photosFirst } from "./productPhotoMatch";

/**
 * The tobacco section, modelled on how Blinkit sells cigarettes:
 *
 *  - Tobacco never appears in ordinary browsing (home grid, categories, search
 *    results, offers, recommendations). COTPA 2003 §5 bars advertising it, and
 *    an upsell rail next to milk is exactly that.
 *  - Searching for it shows "No results" plus a "Looking for tobacco products?"
 *    banner. "View items" opens the age + school-premises declaration, and only
 *    after that does the /tobacco section list anything.
 *  - Packs are shown as plain, unbranded art rather than the brand photo.
 *
 * Store policy — why iOS is off by default:
 *  - Apple App Store Review Guideline 1.4.3: "Facilitating the sale of ...
 *    tobacco is not allowed." No regional exception.
 *  - Google Play "may allow the limited sale of tobacco products in
 *    food/grocery delivery apps, in certain regions, and subject to age-gating
 *    safeguards (such as ID check at delivery)." Android stays on.
 *
 * Both are build-time switches so a store build can be produced without code
 * changes:
 *   NEXT_PUBLIC_TOBACCO_SECTION=off  → off everywhere (web, Android, iOS)
 *   NEXT_PUBLIC_TOBACCO_IOS=on       → also on inside the iOS app (review risk)
 */

const SECTION_FLAG = process.env.NEXT_PUBLIC_TOBACCO_SECTION;
const IOS_FLAG = process.env.NEXT_PUBLIC_TOBACCO_IOS;

export const TOBACCO_ROUTE = "/tobacco";

/** Plain, unbranded pack art used for every tobacco item in the section. */
export const PLAIN_PACK_IMG = "/art/tobacco-plain-pack.svg";

/**
 * Reads the platform, so it is only meaningful on the client. Call it from an
 * effect or an event handler, never during render of statically exported HTML.
 */
export function isTobaccoSectionEnabled() {
  if (SECTION_FLAG === "off") return false;
  // The website never lists tobacco (COTPA §5; the Terms promise it isn't promoted).
  if (!isNative()) return false;
  if (isNative() && isIOS() && IOS_FLAG !== "on") return false;
  return true;
}

/** Everything a shopper may see while browsing — tobacco removed, items with a photo first. */
export function browseable(list = []) {
  return photosFirst((list || []).filter((p) => !isAgeRestricted(p)));
}

/** The section's own listing, with brand imagery swapped for plain packs. */
export function tobaccoCatalogue(list = []) {
  return (list || []).filter(isAgeRestricted).map(asPlainPack);
}

export function asPlainPack(product) {
  return product ? { ...product, img: PLAIN_PACK_IMG } : product;
}

/*
 * Search terms that mean "I want tobacco" even when no product name contains
 * them. Prefix stems catch plurals and common misspellings ("cigarettes",
 * "cigrette", "ciggs", "smoking").
 */
const INTENT_STEMS = [
  "cig",
  "cugar",
  "sigar",
  "smoking",
  "tobac",
  "bidi",
  "beedi",
  "hookah",
  "shisha",
  "vape",
  "nicotin",
  "gutkha",
  "zarda",
  "khaini",
  "snuff",
  "rolling paper",
];

/*
 * Matched as whole words only, so "smoky chips" and "classic curd" stay
 * groceries.
 */
const INTENT_WORDS = [
  "smoke",
  "smokes",
  "marlboro",
  "gold flake",
  "goldflake",
  "wills",
  "navy cut",
  "benson",
  "esse",
  "four square",
  "red and white",
  "capstan",
  "davidoff",
  "dunhill",
  "ice burst",
];

export function isTobaccoQuery(query = "") {
  const q = String(query).trim().toLowerCase();
  if (q.length < 3) return false;
  if (INTENT_STEMS.some((stem) => q.includes(stem))) return true;
  return INTENT_WORDS.some((word) => new RegExp(`(^|\\s)${word}(\\s|$)`).test(q));
}

/**
 * Tobacco products for the typeahead rows: name matches first, then — when the
 * query is plainly for tobacco ("cigarettes") — the rest of the range.
 */
export function tobaccoMatches(query = "", list = []) {
  const q = String(query).trim().toLowerCase();
  if (q.length < 3) return [];
  const restricted = (list || []).filter(isAgeRestricted);
  const isDirect = (p) =>
    (p.name || "").toLowerCase().includes(q) || (p.brand || "").toLowerCase().includes(q);
  const direct = restricted.filter(isDirect);
  if (!isTobaccoQuery(q)) return direct;
  return [...direct, ...restricted.filter((p) => !isDirect(p))];
}
