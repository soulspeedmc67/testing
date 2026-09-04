import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInAnonymously,
  onAuthStateChanged,
  signOut as fbSignOut,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { getFirebaseAuth, getDb, AUTH_MODE, DEV_OTP } from "./firebase";

/**
 * Authentication layer.
 *
 * Two providers behind one interface:
 *   - "otp"   — OTP generated here in code, then Firebase ANONYMOUS sign-in.
 *               Free on Spark, and the anonymous uid is what firestore.rules
 *               use for ownership, so security still functions.
 *   - "phone" — real Firebase Phone Auth (billed SMS, Blaze plan).
 *
 * Callers use sendOtp/verifyOtp and never branch on the mode.
 *
 * ---------------------------------------------------------------------------
 * WHAT "otp" MODE DOES AND DOES NOT DO
 *
 * The code is generated on the device, so it proves the user can read their own
 * screen — it does NOT prove they own the phone number. It is a number-entry
 * confirmation step and a working stand-in for the real thing, not a security
 * control. Anyone determined can bypass it.
 *
 * Data security does not rest on it: it rests on the anonymous uid plus
 * firestore.rules, which stop one user reading another's orders regardless.
 *
 * To make it real later, send `code` from a backend you control (the existing
 * Express server in server/, or a Cloud Function) via an SMS provider, and stop
 * returning `devCode` to the client. `issueCode()` is the only function to change.
 * ---------------------------------------------------------------------------
 */

const LOCAL_USER_KEY = "dashit_user";
const CODE_TTL_MS = 5 * 60 * 1000; // codes expire after 5 minutes
const MAX_ATTEMPTS = 5;

/** In-flight challenge for the "otp" provider. */
let challenge = null;

/** Generates the code. Swap this for a server call to go live with real SMS. */
function issueCode() {
  if (process.env.NEXT_PUBLIC_OTP_FIXED === "1") return DEV_OTP;
  const n = Math.floor(Math.random() * 10000);
  return String(n).padStart(4, "0");
}

/** Normalises 9622720283 / +919622720283 / 09622720283 to E.164. */
export function toE164(mobile, country = "+91") {
  const digits = String(mobile || "").replace(/\D/g, "");
  const trimmed = digits.replace(/^0+/, "").slice(-10);
  return `${country}${trimmed}`;
}

export function getLocalUser() {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LOCAL_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function cacheLocalUser(user) {
  try {
    localStorage.setItem(LOCAL_USER_KEY, JSON.stringify(user));
  } catch (e) {}
  return user;
}

/**
 * reCAPTCHA is required by web Phone Auth. It is created lazily and reused —
 * constructing more than one verifier per page breaks the flow.
 */
let recaptcha = null;
let confirmation = null;

function ensureRecaptcha(auth, containerId = "dashit-recaptcha") {
  if (recaptcha) return recaptcha;
  if (typeof document !== "undefined" && !document.getElementById(containerId)) {
    const host = document.createElement("div");
    host.id = containerId;
    host.style.display = "none";
    document.body.appendChild(host);
  }
  recaptcha = new RecaptchaVerifier(auth, containerId, { size: "invisible" });
  return recaptcha;
}

/** Sends an OTP. Returns { success, devOtp?, message }. */
export async function sendOtp(mobile) {
  if (AUTH_MODE === "otp") {
    const code = issueCode();
    challenge = {
      mobile: toE164(mobile),
      code,
      expiresAt: Date.now() + CODE_TTL_MS,
      attempts: 0,
    };
    // devOtp is surfaced in the UI because there is no SMS channel yet.
    return { success: true, message: "Enter the code shown below", devOtp: code };
  }

  const auth = getFirebaseAuth();
  if (!auth) {
    return { success: false, message: "Firebase is not configured" };
  }

  try {
    confirmation = await signInWithPhoneNumber(
      auth,
      toE164(mobile),
      ensureRecaptcha(auth)
    );
    return { success: true, message: "OTP sent" };
  } catch (e) {
    // A failed attempt leaves the verifier in a bad state; rebuild it next time.
    try {
      recaptcha?.clear();
    } catch (err) {}
    recaptcha = null;
    return { success: false, message: e?.message || "Could not send OTP" };
  }
}

/**
 * Verifies the OTP and ensures a users/{uid} profile exists.
 * Returns { success, user }.
 */
export async function verifyOtp(mobile, otp) {
  if (AUTH_MODE === "otp") {
    if (!challenge) {
      return { success: false, message: "Request a code first" };
    }
    if (Date.now() > challenge.expiresAt) {
      challenge = null;
      return { success: false, message: "Code expired — request a new one" };
    }
    challenge.attempts += 1;
    if (challenge.attempts > MAX_ATTEMPTS) {
      challenge = null;
      return { success: false, message: "Too many attempts — request a new code" };
    }
    if (String(otp).trim() !== challenge.code) {
      return { success: false, message: "Incorrect code" };
    }

    const verifiedMobile = challenge.mobile;
    challenge = null;

    // Anonymous sign-in supplies the uid that firestore.rules key ownership on.
    // Free on Spark. If Firebase is not configured we fall back to a local-only
    // profile so the app still runs offline.
    const auth = getFirebaseAuth();
    if (!auth) {
      return {
        success: true,
        user: cacheLocalUser({
          id: `USR-${verifiedMobile.slice(-10)}`,
          uid: null,
          mobile,
          name: "Valued Customer",
          address: "Nai Basti, Anantnag",
        }),
      };
    }

    try {
      const credential = auth.currentUser
        ? { user: auth.currentUser }
        : await signInAnonymously(auth);
      const uid = credential.user.uid;
      const profile = await ensureUserProfile(uid, verifiedMobile);
      return { success: true, user: cacheLocalUser({ uid, ...profile }) };
    } catch (e) {
      return { success: false, message: e?.message || "Could not sign in" };
    }
  }

  if (!confirmation) {
    return { success: false, message: "Request a new code first" };
  }

  try {
    const credential = await confirmation.confirm(String(otp));
    const fbUser = credential.user;
    const profile = await ensureUserProfile(fbUser.uid, mobile);
    return { success: true, user: cacheLocalUser({ uid: fbUser.uid, ...profile }) };
  } catch (e) {
    return { success: false, message: e?.message || "Incorrect code" };
  }
}

/** Creates users/{uid} on first sign-in, or returns the existing profile. */
export async function ensureUserProfile(uid, mobile) {
  const db = getDb();
  if (!db) return { id: uid, mobile, name: "Valued Customer" };

  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return { id: uid, ...snap.data() };

  const profile = {
    mobile: toE164(mobile),
    name: "Valued Customer",
    email: "",
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, profile);
  return { id: uid, ...profile };
}

/** Resolves the caller's staff role, or null for ordinary customers. */
export async function getStaffRole(uid) {
  const db = getDb();
  if (!db || !uid) return null;
  try {
    const snap = await getDoc(doc(db, "staff", uid));
    if (!snap.exists()) return null;
    const data = snap.data();
    return data.active === false ? null : data.role || null;
  } catch (e) {
    // Rules deny reads of other people's staff docs — treat as "not staff".
    return null;
  }
}

/** Subscribes to auth changes. Returns an unsubscribe fn. */
export function watchAuth(callback) {
  const auth = getFirebaseAuth();
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function signOut() {
  try {
    localStorage.removeItem(LOCAL_USER_KEY);
  } catch (e) {}
  const auth = getFirebaseAuth();
  if (auth) await fbSignOut(auth);
}
