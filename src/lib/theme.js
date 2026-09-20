/**
 * Theme resolution, persistence and application.
 *
 * Three preferences are stored — 'light', 'dark' and 'system' — but only two
 * themes are ever *applied*. 'system' is not a third look; it is a subscription
 * to the OS setting, which is why `resolveTheme` collapses it and why
 * `watchSystemTheme` exists to re-run that collapse when the OS flips.
 *
 * Everything here is deliberately free of React so the same logic can run in
 * the blocking pre-paint script in _document.js, where no bundle has loaded
 * yet. Keep it that way: if this file ever imports from the app, the inline
 * script and the runtime will drift apart and the app will flash on boot.
 */

export const THEME_STORAGE_KEY = 'dashit_theme';

export const THEME_PREFERENCES = ['light', 'dark', 'system'];

/**
 * System bar colours per theme. These are the only hex values in the app that
 * the native shell reads, so they are kept beside the CSS token definitions
 * they mirror (globals.css `:root` / `.dark`) rather than inline at call sites.
 */
export const THEME_CHROME = {
  light: {
    // Home keeps its warm peach header; every other screen is plain white.
    homeTop: '#FFE8D6',
    homeBottom: '#FFFDF5',
    top: '#FFFFFF',
    bottom: '#FFFFFF',
    inverted: '#061838',
    darkIcons: true,
  },
  dark: {
    /* The home header's peach wash has no dark counterpart that stays legible,
       so in dark mode every screen shares the app ground. The status bar
       blending into the page is the point — it is what makes the top of the
       screen read as one surface instead of a band. */
    homeTop: '#0A0A0C',
    homeBottom: '#0A0A0C',
    top: '#0A0A0C',
    bottom: '#0A0A0C',
    inverted: '#0A0A0C',
    darkIcons: false,
  },
};

/** Reads the saved preference, tolerating private-mode storage failures. */
export function getStoredPreference() {
  if (typeof window === 'undefined') return 'system';
  try {
    const saved = window.localStorage.getItem(THEME_STORAGE_KEY);
    return THEME_PREFERENCES.includes(saved) ? saved : 'system';
  } catch (e) {
    return 'system';
  }
}

export function storePreference(preference) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch (e) {}
}

/** True when the OS is currently asking for a dark interface. */
export function prefersDark() {
  if (typeof window === 'undefined' || !window.matchMedia) return false;
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch (e) {
    return false;
  }
}

/** Collapses a three-way preference into the two-way theme actually rendered. */
export function resolveTheme(preference) {
  if (preference === 'dark') return 'dark';
  if (preference === 'light') return 'light';
  return prefersDark() ? 'dark' : 'light';
}

/**
 * Writes the resolved theme to the document.
 *
 * `color-scheme` is set alongside the class because it is what tells the
 * engine to render native widgets — form controls, scrollbars, the overscroll
 * gutter above the header — in dark. Without it the page is dark but the
 * rubber-band area behind it flashes white on every bounce scroll, which is
 * the single most obvious tell that a dark mode was bolted on.
 */
export function applyTheme(theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
  root.dataset.theme = theme;
}

/**
 * Calls back whenever the OS theme changes. The returned function unsubscribes.
 * Only meaningful while the preference is 'system'; callers are expected to
 * ignore it otherwise rather than tear the listener down and rebuild it.
 */
export function watchSystemTheme(onChange) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  let query;
  try {
    query = window.matchMedia('(prefers-color-scheme: dark)');
  } catch (e) {
    return () => {};
  }
  const handler = (event) => onChange(event.matches ? 'dark' : 'light');

  // Safari below 14 — still in the field on older iPhones — only has the
  // deprecated listener API.
  if (typeof query.addEventListener === 'function') {
    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }
  query.addListener(handler);
  return () => query.removeListener(handler);
}

/**
 * The blocking script injected into <head>.
 *
 * It runs before first paint so the correct ground colour is already on the
 * element when the first frame renders. Written as a string because it must
 * ship inline in the HTML — it cannot be a module, and it must not throw on a
 * browser with storage disabled, hence the bare try/catch.
 */
export const THEME_BOOT_SCRIPT = `(function(){try{
var k='${THEME_STORAGE_KEY}';var p='system';
try{var s=localStorage.getItem(k);if(s==='light'||s==='dark'||s==='system'){p=s}}catch(e){}
var d=p==='dark'||(p==='system'&&window.matchMedia&&window.matchMedia('(prefers-color-scheme: dark)').matches);
var r=document.documentElement;
if(d){r.classList.add('dark')}else{r.classList.remove('dark')}
r.style.colorScheme=d?'dark':'light';r.setAttribute('data-theme',d?'dark':'light');
}catch(e){}})();`;
