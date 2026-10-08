import Router from "next/router";

/**
 * "Refresh the website for everyone".
 *
 * The shop presses one button in the staff console or the iOS admin, which
 * saves a new `cacheVersion` on `config/store`. Every open website hears it on
 * the listener it already has (no extra read), drops the copies it saved (shop
 * settings, offer codes, banners, the product list) and loads fresh at the next
 * safe moment: when the shopper moves to another page or comes back to the tab.
 * Never in the middle of an order or a sign-in.
 *
 * The cart, the address, the sign-in and past orders are kept.
 */
const VERSION_KEY = "dashit_cache_version";

// Saved copies the site fetches again by itself. Nothing the shopper made.
const SAVED_COPIES = [
  "dashit_shop_rules",
  "dashit_config_coupons",
  "dashit_store_open",
  "dashit_store_close_reason",
  "dashit_store_weather_alert",
  "dashit_exclusive_offers",
  "dashit_catalog_file_v1",
  "dashit_catalogue_v2",
];

// Pages where a reload would throw away something half done.
const BUSY_PATHS = ["/checkout", "/login", "/add-address", "/confirm-location", "/xcyop", "/driver"];

let reloadPending = false;

const onBusyPage = () => BUSY_PATHS.some((path) => window.location.pathname.startsWith(path));

/** Drops this browser's saved copies of the shop's data. */
export function clearSavedCopies() {
  if (typeof window === "undefined") return;
  try {
    SAVED_COPIES.forEach((key) => localStorage.removeItem(key));
  } catch (e) {}
  try {
    if (window.caches?.keys) {
      window.caches
        .keys()
        .then((names) => Promise.all(names.map((name) => window.caches.delete(name))))
        .catch(() => {});
    }
  } catch (e) {}
}

/**
 * Saves `version` as the one this browser is on (nothing saved for null).
 * False when it can't be saved.
 */
export function rememberCacheVersion(version) {
  try {
    if (version === undefined || version === null || version === "") {
      localStorage.removeItem(VERSION_KEY);
      return true;
    }
    localStorage.setItem(VERSION_KEY, String(version));
    return localStorage.getItem(VERSION_KEY) === String(version);
  } catch (e) {
    return false;
  }
}

function reloadWhenSafe() {
  if (reloadPending) return;
  reloadPending = true;
  const reload = () => window.location.reload();
  // Nobody is looking at a hidden tab, so now is fine.
  if (document.visibilityState === "hidden" && !onBusyPage()) return reload();
  // Arriving on a page: nothing has been typed or started on it yet.
  Router.events.on("routeChangeComplete", reload);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && !onBusyPage()) reload();
  });
}

/**
 * Called with `cacheVersion` each time `config/store` comes from the server.
 * A version this browser hasn't seen means the shop asked for a fresh load.
 */
export function noteCacheVersion(version) {
  if (typeof window === "undefined" || version === undefined || version === null || version === "") return;
  const next = String(version);
  let saved;
  try {
    saved = localStorage.getItem(VERSION_KEY);
  } catch (e) {
    return;
  }
  if (saved === next) return;
  // If the new version can't be saved, a reload would come round again and again.
  if (!rememberCacheVersion(next)) return;
  // The first version this browser hears of: there is nothing older to drop.
  if (saved === null) return;
  clearSavedCopies();
  reloadWhenSafe();
}
