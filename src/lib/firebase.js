import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

/**
 * Firebase singleton.
 *
 * The app is a static export, so this runs entirely client-side. Every accessor
 * is lazy and SSR-guarded: at build time there is no window and no config, and
 * touching Firebase there would break `next build`.
 */

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/** True when a real project has been configured in .env.local. */
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

let cachedApp = null;

export function getFirebaseApp() {
  if (typeof window === "undefined") return null;
  if (!isFirebaseConfigured) return null;
  if (cachedApp) return cachedApp;
  cachedApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
  return cachedApp;
}

export function getDb() {
  const app = getFirebaseApp();
  return app ? getFirestore(app) : null;
}

export function getFirebaseAuth() {
  const app = getFirebaseApp();
  return app ? getAuth(app) : null;
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
