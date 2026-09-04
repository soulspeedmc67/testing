/**
 * Navigation helpers.
 *
 * The app is a static export wrapped in Capacitor, so a screen can be entered
 * directly from a notification, a deep link, or a cold start. In those cases the
 * history stack is empty and a bare `router.back()` either does nothing or walks
 * the user out of the app. Every back affordance should route through
 * `goBack()`, which falls back to a sensible in-app screen instead.
 */

/** Depth of the session history stack, guarded for SSR. */
const historyDepth = () => {
  if (typeof window === "undefined") return 0;
  try {
    return window.history?.length || 0;
  } catch (e) {
    return 0;
  }
};

/**
 * Go back one screen, or land on `fallback` when there is nothing to go back to.
 * @param {import('next/router').NextRouter} router
 * @param {string} fallback route to use when the history stack is empty
 */
export const goBack = (router, fallback = "/") => {
  if (!router) return;
  if (historyDepth() > 1) {
    router.back();
    return;
  }
  router.replace(fallback);
};

/**
 * Navigate to a tab/route without stacking duplicate history entries — tapping
 * the tab you are already on should be a no-op rather than a new entry.
 */
export const navigateTo = (router, path) => {
  if (!router || !path) return;
  if (router.asPath === path || router.pathname === path) return;
  router.push(path);
};
