/**
 * Age-restricted products (tobacco and similar) may not be sold to under-18s,
 * so adding one to the cart requires an explicit declaration first.
 *
 * Detection is deliberately belt-and-braces: an explicit `ageRestricted` flag on
 * the product is authoritative, but the catalogue is edited by shop staff and
 * imported from CSV, so a keyword fallback catches an item that was added
 * without the flag. Failing open on a legal restriction is the one mistake this
 * must not make.
 */

const RESTRICTED_KEYWORDS = [
  "cigarette",
  "cigar",
  "tobacco",
  "bidi",
  "beedi",
  "hookah",
  "shisha",
  "vape",
  "e-cigarette",
  "nicotine",
  "rolling paper",
  "gutkha",
  "paan masala",
  "snuff",
  "zarda",
];

export const AGE_RESTRICTED_CATEGORIES = ["Tobacco", "Tobacco & Smoking", "Smoking"];

export const MIN_AGE = 18;

export function isAgeRestricted(product) {
  if (!product) return false;
  if (product.ageRestricted === true) return true;
  if (Number(product.minAge) >= MIN_AGE) return true;

  const cat = String(product.cat || "");
  if (AGE_RESTRICTED_CATEGORIES.some((c) => c.toLowerCase() === cat.toLowerCase())) return true;

  const haystack = `${cat} ${product.name || ""}`.toLowerCase();
  return RESTRICTED_KEYWORDS.some((k) => haystack.includes(k));
}

const STORAGE_KEY = "dashit_age_confirmed";

/** Has the shopper already declared they are over 18 on this device? */
export function hasConfirmedAge() {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return parsed?.confirmed === true;
  } catch (e) {
    return false;
  }
}

export function confirmAge() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ confirmed: true, at: Date.now(), minAge: MIN_AGE })
    );
    window.dispatchEvent(new CustomEvent("dashit_age_confirmed"));
  } catch (e) {}
}

/** Used by account settings and by tests to put the gate back in place. */
export function clearAgeConfirmation() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("dashit_age_confirmed"));
  } catch (e) {}
}

/** Restricted items in a cart, so checkout can re-state the declaration. */
export function restrictedItemsIn(cart = []) {
  return cart.filter((item) => isAgeRestricted(item));
}
