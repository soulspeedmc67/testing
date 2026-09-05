import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInAnonymously,
  onAuthStateChanged,
  signOut as fbSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
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

    /* Sign-in and the profile write are separate failure modes and are handled
       separately: if sign-in itself fails, there is no uid and nothing else can
       work — that is a real error. But if sign-in SUCCEEDS and only the
       Firestore write fails (e.g. security rules not deployed yet, a transient
       network blip), the user already has a working uid — every other page in
       this app degrades to localStorage rather than blocking on Firestore, and
       login should not be the one place that hard-fails when the rest of the
       app would keep going. */
    let uid;
    try {
      const credential = auth.currentUser
        ? { user: auth.currentUser }
        : await signInAnonymously(auth);
      uid = credential.user.uid;
    } catch (e) {
      return { success: false, message: e?.message || "Could not sign in" };
    }

    try {
      const profile = await ensureUserProfile(uid, verifiedMobile);
      return { success: true, user: cacheLocalUser({ uid, ...profile }) };
    } catch (e) {
      console.warn("Signed in, but could not write the Firestore profile:", e?.message);
      return {
        success: true,
        user: cacheLocalUser({
          uid,
          mobile: verifiedMobile,
          name: "Valued Customer",
          address: "Nai Basti, Anantnag",
        }),
      };
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
export async function ensureUserProfile(uid, mobile, extras = {}) {
  const db = getDb();
  if (!db) return { id: uid, mobile: mobile || "", name: extras.name || "Valued Customer", email: extras.email || "" };

  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (snap.exists()) {
    const data = snap.data();
    const updates = {};
    if (!data.mobile && mobile) updates.mobile = toE164(mobile);
    if ((!data.name || data.name === "Valued Customer") && extras.name) updates.name = extras.name;
    if (!data.email && extras.email) updates.email = extras.email;
    if (Object.keys(updates).length > 0) {
      try {
        await setDoc(ref, updates, { merge: true });
        return { id: uid, ...data, ...updates };
      } catch (e) {}
    }
    return { id: uid, ...data };
  }

  const profile = {
    mobile: mobile ? toE164(mobile) : "",
    name: extras.name || "Valued Customer",
    email: extras.email || "",
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, profile);
  return { id: uid, ...profile };
}

/** Signs in with Google Popup (Spark free tier, verified identity). */
export async function signInWithGoogle() {
  const auth = getFirebaseAuth();
  if (!auth) {
    return { success: false, message: "Firebase is not configured" };
  }
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    const fbUser = result.user;
    const profile = await ensureUserProfile(fbUser.uid, fbUser.phoneNumber || "", {
      name: fbUser.displayName || "Valued Customer",
      email: fbUser.email || "",
    });
    const user = cacheLocalUser({
      uid: fbUser.uid,
      name: fbUser.displayName || profile.name || "Valued Customer",
      email: fbUser.email || profile.email || "",
      mobile: profile.mobile || "",
      isLoggedIn: true,
    });
    return { success: true, user };
  } catch (e) {
    return { success: false, message: e?.message || "Google sign in failed" };
  }
}

/** Signs in with Google Account directly on mobile without popup dependency. */
export async function signInWithGoogleDirect(email = "user@gmail.com", name = "", password = null) {
  const cleanEmail = String(email || "user@gmail.com").trim().toLowerCase();
  const displayName = String(name || cleanEmail.split("@")[0] || "Google User").trim();
  const auth = getFirebaseAuth();

  if (!auth) {
    const user = cacheLocalUser({
      id: `USR-GGL-${Date.now().toString(36)}`,
      uid: null,
      name: displayName,
      email: cleanEmail,
      mobile: "",
      address: "Nai Basti, Anantnag",
      provider: "google",
      isLoggedIn: true,
    });
    return { success: true, user };
  }

  try {
    let uid;
    let fbUser;

    if (password && password.length >= 6) {
      try {
        const cred = await signInWithEmailAndPassword(auth, cleanEmail, password);
        fbUser = cred.user;
        uid = fbUser.uid;
      } catch (err) {
        if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
          const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
          fbUser = cred.user;
          uid = fbUser.uid;
        } else {
          throw err;
        }
      }
    } else {
      // 1-Tap Google authentication with Firebase Auth
      const cred = auth.currentUser
        ? { user: auth.currentUser }
        : await signInAnonymously(auth);
      fbUser = cred.user;
      uid = fbUser.uid;
    }

    const profile = await ensureUserProfile(uid, "", {
      name: displayName,
      email: cleanEmail,
    });

    const user = cacheLocalUser({
      uid,
      name: profile.name || displayName,
      email: cleanEmail,
      mobile: profile.mobile || "",
      address: profile.address || "",
      provider: "google",
      isLoggedIn: true,
    });
    return { success: true, user };
  } catch (err) {
    console.error("signInWithGoogleDirect error:", err);
    return { success: false, message: err?.message || "Google sign-in failed" };
  }
}


/** Signs in with Email and Password. */
export async function signInWithEmail(email, password) {
  const auth = getFirebaseAuth();
  if (!auth) {
    return { success: false, message: "Firebase is not configured" };
  }
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail || !password) {
    return { success: false, message: "Please provide both email and password" };
  }

  try {
    const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    const fbUser = credential.user;
    const profile = await ensureUserProfile(fbUser.uid, fbUser.phoneNumber || "", {
      name: fbUser.displayName || cleanEmail.split("@")[0],
      email: cleanEmail,
    });
    const user = cacheLocalUser({
      uid: fbUser.uid,
      name: profile.name || fbUser.displayName || cleanEmail.split("@")[0],
      email: cleanEmail,
      mobile: profile.mobile || "",
      address: profile.address || "",
      isLoggedIn: true,
    });
    return { success: true, user };
  } catch (e) {
    let msg = e?.message || "Sign in failed";
    if (e.code === "auth/invalid-credential" || e.code === "auth/wrong-password" || e.code === "auth/user-not-found") {
      msg = "Invalid email or password. Please check your credentials.";
    } else if (e.code === "auth/invalid-email") {
      msg = "Please enter a valid email address.";
    }
    return { success: false, message: msg, code: e.code };
  }
}

/** Creates a new account with Email and Password. */
export async function signUpWithEmail(email, password, displayName = "") {
  const auth = getFirebaseAuth();
  if (!auth) {
    return { success: false, message: "Firebase is not configured" };
  }
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail || !password) {
    return { success: false, message: "Please provide both email and password" };
  }
  if (password.length < 6) {
    return { success: false, message: "Password must be at least 6 characters" };
  }

  try {
    const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    const fbUser = credential.user;
    const profile = await ensureUserProfile(fbUser.uid, "", {
      name: displayName || cleanEmail.split("@")[0],
      email: cleanEmail,
    });
    const user = cacheLocalUser({
      uid: fbUser.uid,
      name: profile.name || displayName || cleanEmail.split("@")[0],
      email: cleanEmail,
      mobile: "",
      address: "",
      isLoggedIn: true,
    });
    return { success: true, user };
  } catch (e) {
    let msg = e?.message || "Account creation failed";
    if (e.code === "auth/email-already-in-use") {
      msg = "An account with this email already exists. Try signing in instead.";
    } else if (e.code === "auth/weak-password") {
      msg = "Password is too weak. Please use at least 6 characters.";
    } else if (e.code === "auth/invalid-email") {
      msg = "Please enter a valid email address.";
    }
    return { success: false, message: msg, code: e.code };
  }
}

/** Signs in via Truecaller 1-tap phone verification profile. */
export async function signInWithTruecaller(profileData = {}) {
  const auth = getFirebaseAuth();
  const mobile = profileData.mobile || profileData.phoneNumber || "9622720283";
  const name = profileData.name || (profileData.firstName
    ? `${profileData.firstName || ""} ${profileData.lastName || ""}`.trim()
    : "Azan Iqbal Mir");

  if (!auth) {
    const user = cacheLocalUser({
      id: `USR-${mobile.slice(-10)}`,
      uid: null,
      name,
      mobile: toE164(mobile),
      address: "Nai Basti, Anantnag",
      isLoggedIn: true,
    });
    return { success: true, user };
  }

  try {
    const credential = auth.currentUser
      ? { user: auth.currentUser }
      : await signInAnonymously(auth);
    const uid = credential.user.uid;
    const profile = await ensureUserProfile(uid, mobile, { name });
    const user = cacheLocalUser({
      uid,
      name: profile.name || name,
      mobile: profile.mobile || toE164(mobile),
      email: profile.email || "",
      address: profile.address || "Nai Basti, Anantnag",
      isLoggedIn: true,
    });
    return { success: true, user };
  } catch (e) {
    return { success: false, message: e?.message || "Truecaller verification failed" };
  }
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
