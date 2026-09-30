import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaV3Provider } from "firebase/app-check";
import {
  initializeFirestore,
  getFirestore,
  connectFirestoreEmulator,
  persistentLocalCache,
  persistentMultipleTabManager,
} from "firebase/firestore";
import { isNative, isIOS } from "./platform";
import {
  initializeAuth,
  getAuth,
  connectAuthEmulator,
  indexedDBLocalPersistence,
  browserLocalPersistence,
  inMemoryPersistence,
  browserPopupRedirectResolver,
} from "firebase/auth";

/**
 * Firebase singleton.
 *
 * The app is a static export, so this runs entirely client-side. Every accessor
 * is lazy and SSR-guarded: at build time there is no window and no config, and
 * touching Firebase there would break `next build`.
 */

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyB6tH6rYJ3fDZ7SBVkTNL3i_lOTXkPYjsg",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "dashit-1ecba.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "dashit-1ecba",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "dashit-1ecba.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "391742831837",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:391742831837:web:a66d0d0920d75b24f4ef34",
};

/** True when a real project has been configured. */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

let cachedApp = null;
let cachedDb = null;
let cachedAuth = null;

export function getFirebaseApp() {
  if (typeof window === "undefined") return null;
  if (!isFirebaseConfigured) return null;
  if (cachedApp) return cachedApp;
  cachedApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  startAppCheck(cachedApp);
  return cachedApp;
}

/* App Check: each Firestore and sign-in request carries a reCAPTCHA-backed
   token showing it came from this site, not from a script holding the public
   config above. Only the staff pages (/xcyop, /driver) load Firebase, so the
   public pages never load reCAPTCHA. Needs a reCAPTCHA v3 site key registered
   under Firebase console > App Check; without one this does nothing. On
   localhost it prints a debug token to the console to add there instead. */
const APP_CHECK_SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY || "";

function startAppCheck(app) {
  if (!APP_CHECK_SITE_KEY || USE_EMULATORS) return;
  try {
    if (window.location.hostname === "localhost") {
      window.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
    }
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(APP_CHECK_SITE_KEY),
      isTokenAutoRefreshEnabled: true,
    });
  } catch (err) {
    console.warn("App Check did not start:", err?.message);
  }
}

/**
 * Firestore, with the transport pinned on iOS.
 *
 * The default WebChannel streaming transport does not complete its handshake
 * inside the packaged iOS app: the connection opens and then hangs rather than
 * erroring. Because every sign-in path awaits a profile read, that stall
 * presented as "no sign-in method works on iPhone" while the same build worked
 * in Safari and on Android.
 *
 * Long polling is forced only there. Auto-detection is already the default
 * since SDK v9.22 and is what web and Android keep — it is deliberately not
 * restated here, and the two settings cannot both be passed.
 */
/* Local development against `npm run fb:emulate` (firebase.json ports):
   set NEXT_PUBLIC_FIREBASE_EMULATORS=1. Never set for a real build, so the
   live site and apps always talk to the real project. */
const USE_EMULATORS = process.env.NEXT_PUBLIC_FIREBASE_EMULATORS === "1";

export function getDb() {
  const app = getFirebaseApp();
  if (!app) return null;
  if (cachedDb) return cachedDb;
  try {
    const firestoreSettings = {
      ignoreUndefinedProperties: true,
    };
    if (typeof window !== "undefined" && typeof persistentLocalCache === "function") {
      try {
        firestoreSettings.localCache = persistentLocalCache({
          tabManager: typeof persistentMultipleTabManager === "function" ? persistentMultipleTabManager() : undefined,
        });
      } catch (cacheErr) {
        console.warn("Firestore persistent cache notice:", cacheErr?.message);
      }
    }
    cachedDb = initializeFirestore(app, firestoreSettings);
    if (USE_EMULATORS) connectFirestoreEmulator(cachedDb, "127.0.0.1", 8080);
  } catch (e) {
    /* initializeFirestore throws if Firestore was already started for this app
       (a hot reload, or an earlier getFirestore call). The existing instance is
       the right one to hand back. */
    cachedDb = getFirestore(app);
  }
  return cachedDb;
}

/**
 * Auth with an explicit persistence chain.
 *
 * getAuth() assumes IndexedDB is available. Under the custom `capacitor://`
 * scheme iOS can refuse it, and the failure surfaces at sign-in rather than at
 * startup. Listing fallbacks means a device that blocks IndexedDB degrades to
 * localStorage, then to memory, instead of failing to authenticate.
 *
 * browserPopupRedirectResolver must be passed explicitly: initializeAuth does
 * not install one, and without it signInWithPopup/signInWithRedirect throw
 * auth/operation-not-supported-in-this-environment on the web.
 */
export function getFirebaseAuth() {
  const app = getFirebaseApp();
  if (!app) return null;
  if (cachedAuth) return cachedAuth;
  try {
    const authOptions = {
      persistence: [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence],
    };
    if (typeof browserPopupRedirectResolver === "function") {
      authOptions.popupRedirectResolver = browserPopupRedirectResolver;
    }
    cachedAuth = initializeAuth(app, authOptions);
    if (USE_EMULATORS) connectAuthEmulator(cachedAuth, "http://127.0.0.1:9099", { disableWarnings: true });
  } catch (e) {
    try {
      cachedAuth = getAuth(app);
    } catch (err) {
      console.warn("Firebase getAuth fallback notice:", err?.message);
    }
  }
  return cachedAuth;
}

/**
 * Auth provider switch:
 *
 *   "otp"   (default) — OTP generated in code, paired with Firebase ANONYMOUS
 *                       sign-in. Costs nothing, and still yields a real
 *                       request.auth.uid so firestore.rules keep working.
 *   "phone"           — real Firebase Phone Auth. Billed SMS, needs Blaze.
 *
 * Call sites never branch on this — see src/lib/auth.js.
 */
export const AUTH_MODE = process.env.NEXT_PUBLIC_AUTH_MODE || "otp";

/** Fixed code used when NEXT_PUBLIC_OTP_FIXED=1 (handy for repeatable testing). */
export const DEV_OTP = "1234";
