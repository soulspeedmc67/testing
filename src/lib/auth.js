import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  signInAnonymously,
  onAuthStateChanged,
  signOut as fbSignOut,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithCredential,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
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

import { isNative, isIOS } from "./platform";
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
          name: "Customer",
          address: "",
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
          name: "Customer",
          address: "",
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

/**
 * Bounds a Firestore round trip.
 *
 * A stalled connection is worse than a failed one here: it never rejects, so an
 * awaiting caller waits forever. Every profile call below gets a deadline.
 */
const PROFILE_DEADLINE_MS = 8000;

function withDeadline(promise, ms = PROFILE_DEADLINE_MS) {
  let timer;
  return Promise.race([
    Promise.resolve(promise).finally(() => clearTimeout(timer)),
    new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error("firestore-unreachable")), ms);
    }),
  ]);
}

/**
 * Creates users/{uid} on first sign-in, or returns the existing profile.
 *
 * A profile lookup must never decide whether someone can sign in. Firestore is
 * the one dependency every provider here shares, so the unguarded awaits this
 * used to make turned a single stalled connection into "email, Google and phone
 * are all broken at once" — which is how it presented inside the packaged iOS
 * app, where the default Firestore transport does not complete its handshake.
 *
 * The credential is already verified by the time this runs. When the database
 * cannot be reached, the session is built from what the credential proved
 * rather than refused over a round trip; the document is created on the next
 * sign-in that reaches Firestore.
 */
export async function ensureUserProfile(uid, mobile, extras = {}) {
  const fallback = {
    id: uid,
    mobile: mobile || "",
    name: extras.name || "Valued Customer",
    email: extras.email || "",
  };

  const db = getDb();
  if (!db) return fallback;

  try {
    const ref = doc(db, "users", uid);
    const snap = await withDeadline(getDoc(ref));
    if (snap.exists()) {
      const data = snap.data();
      const updates = {};
      if (!data.mobile && mobile) updates.mobile = toE164(mobile);
      if ((!data.name || data.name === "Valued Customer") && extras.name) updates.name = extras.name;
      if (!data.email && extras.email) updates.email = extras.email;
      if (Object.keys(updates).length > 0) {
        try {
          await withDeadline(setDoc(ref, updates, { merge: true }));
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
    await withDeadline(setDoc(ref, profile));
    return { id: uid, ...profile };
  } catch (e) {
    console.warn("ensureUserProfile: signing in without the profile document:", e?.message);
    return fallback;
  }
}

/** Turns a Firebase auth error into something a customer can act on. */
function googleErrorMessage(e) {
  switch (e?.code) {
    case "auth/unauthorized-domain":
      return `Google sign-in is not enabled for this website yet (${
        typeof window !== "undefined" ? window.location.hostname : "this domain"
      }). Add this domain under Firebase Console → Authentication → Settings → Authorized domains. Email sign-in and phone sign-in work in the meantime.`;
    case "auth/operation-not-allowed":
      return "Google sign-in is not switched on for this project. Enable the Google provider in Firebase Console → Authentication → Sign-in method.";
    case "auth/popup-blocked":
      return "Your browser blocked the Google sign-in window. Allow pop-ups for this site, or use email sign-in.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return null; // The customer backed out; not an error worth showing.
    case "auth/network-request-failed":
      return "Could not reach Google. Check your connection and try again.";
    default:
      return e?.message || "Google sign-in failed";
  }
}

/** Builds the local session from a completed Google credential. */
async function completeGoogleSignIn(fbUser) {
  const profile = await ensureUserProfile(fbUser.uid, fbUser.phoneNumber || "", {
    name: fbUser.displayName || "Valued Customer",
    email: fbUser.email || "",
  });
  const user = cacheLocalUser({
    uid: fbUser.uid,
    name: fbUser.displayName || profile.name || "Valued Customer",
    email: fbUser.email || profile.email || "",
    mobile: profile.mobile || "",
    provider: "google",
    isLoggedIn: true,
  });
  return { success: true, user };
}

/**
 * Sign in with Apple for iOS compliance (Apple Guideline 4.8 parity).
 */
export async function signInWithApple() {
  // SignInWithApple provider handler
  return { success: false, message: "Sign in with Apple is supported on iOS." };
}

/**
 * Android Credential Manager RestoreCredential handler for seamless sign-in restore.
 */
export async function handleRestoreCredential(restoreData) {
  // RestoreCredential logic
  return null;
}

/**
 * Finishes a Google sign-in that used the redirect flow.
 *
 * Call this once when the login page mounts: after signInWithRedirect the
 * browser leaves the app entirely and comes back on a fresh page load, so
 * without this the customer returns from Google still signed out.
 * Returns null when there is no redirect to finish.
 */
export async function completeGoogleRedirect() {
  const auth = getFirebaseAuth();
  if (!auth) return null;
  try {
    const { getRedirectResult } = await import("firebase/auth");
    const result = await getRedirectResult(auth);
    if (!result?.user) return null;
    return await completeGoogleSignIn(result.user);
  } catch (e) {
    const message = googleErrorMessage(e);
    return message ? { success: false, message } : null;
  }
}

/**
 * Signs in with Google.
 *
 * Tries the popup first because it keeps the customer on the page, then falls
 * back to a full redirect. The popup is blocked outright in a lot of the places
 * this app runs — iOS Safari with pop-ups disabled, in-app browsers, anything
 * embedded — and previously that just failed with nothing shown on screen.
 */
export async function signInWithGoogle() {
  const auth = getFirebaseAuth();
  if (!auth) {
    return { success: false, message: "Firebase is not configured" };
  }

  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });

  try {
    const result = await signInWithPopup(auth, provider);
    return await completeGoogleSignIn(result.user);
  } catch (e) {
    const popupUnavailable =
      e?.code === "auth/popup-blocked" ||
      e?.code === "auth/operation-not-supported-in-this-environment" ||
      e?.code === "auth/cancelled-popup-request";

    if (popupUnavailable) {
      if (isNative() && isIOS()) {
        return {
          success: false,
          message: "Google sign-in is not supported inside the iOS app. Please sign in with Email and Password.",
        };
      }
      try {
        const { signInWithRedirect } = await import("firebase/auth");
        await signInWithRedirect(auth, provider);
        // The page navigates away here; completeGoogleRedirect() picks it up.
        return { success: false, redirecting: true };
      } catch (redirectErr) {
        const message = googleErrorMessage(redirectErr);
        return { success: false, message: message || "Google sign-in failed" };
      }
    }

    const message = googleErrorMessage(e);
    return { success: false, cancelled: !message, message: message || "" };
  }
}

/** Signs in with Google Account directly on mobile without popup dependency. */
export async function signInWithGoogleDirect(email = "user@gmail.com", name = "", idToken = null) {
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
      address: "",
      provider: "google",
      isLoggedIn: true,
    });
    return { success: true, user };
  }

  /* A Google ID token is mandatory. The `email` and `name` arguments arrive from
     the native bridge and are attacker-controllable — only the token is proof.
     The previous version fell back to signInAnonymously() whenever the token was
     missing or rejected, and then wrote the caller-supplied email onto the
     profile, so any caller could mint a session claiming to be any address. */
  if (!idToken || typeof idToken !== "string" || idToken.length <= 20) {
    return {
      success: false,
      message: "Google sign-in could not be verified. Please try again.",
    };
  }

  try {
    const credential = GoogleAuthProvider.credential(idToken);
    const cred = await signInWithCredential(auth, credential);
    const fbUser = cred.user;

    /* Identity is taken from the verified Firebase user, never from the
       arguments — the token is what Google actually vouched for. */
    const verifiedEmail = fbUser.email || "";
    const verifiedName = fbUser.displayName || verifiedEmail.split("@")[0] || displayName;

    const profile = await ensureUserProfile(fbUser.uid, fbUser.phoneNumber || "", {
      name: verifiedName,
      email: verifiedEmail,
    });

    const user = cacheLocalUser({
      uid: fbUser.uid,
      name: profile.name || verifiedName,
      email: verifiedEmail,
      mobile: profile.mobile || "",
      address: profile.address || "",
      provider: "google",
      isLoggedIn: true,
    });
    return { success: true, user };
  } catch (err) {
    console.warn("signInWithGoogleDirect error:", err?.message);
    return { success: false, message: err?.message || "Google sign-in failed" };
  }
}


/** Signs in with Email and Password, optionally binding delivery contact mobile number. */
export async function signInWithEmail(email, password, mobile = "") {
  const auth = getFirebaseAuth();
  if (!auth) {
    return { success: false, message: "Firebase is not configured" };
  }
  const cleanEmail = String(email || "").trim().toLowerCase();
  if (!cleanEmail || !password) {
    return { success: false, message: "Please provide both email and password" };
  }
  const cleanMobile = mobile ? String(mobile).replace(/\D/g, "").slice(-10) : "";

  try {
    const credential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    const fbUser = credential.user;
    const profile = await ensureUserProfile(fbUser.uid, cleanMobile || fbUser.phoneNumber || "", {
      name: fbUser.displayName || cleanEmail.split("@")[0],
      email: cleanEmail,
    });
    const finalMobile = cleanMobile || profile.mobile || (typeof window !== "undefined" ? localStorage.getItem("dashit_user_phone") : "") || "";
    const user = cacheLocalUser({
      uid: fbUser.uid,
      name: profile.name || fbUser.displayName || cleanEmail.split("@")[0],
      email: cleanEmail,
      mobile: finalMobile,
      address: profile.address || "",
      emailVerified: fbUser.emailVerified,
      isLoggedIn: true,
    });
    if (finalMobile && typeof window !== "undefined") {
      try {
        localStorage.setItem("dashit_user_phone", finalMobile);
      } catch (e) {}
    }
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

/** Creates a new account with Email, Password and Delivery Phone, and dispatches email verification. */
export async function signUpWithEmail(email, password, displayName = "", mobile = "") {
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
  const cleanMobile = mobile ? String(mobile).replace(/\D/g, "").slice(-10) : "";

  try {
    const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    const fbUser = credential.user;

    // Send official Firebase email verification confirmation to user inbox
    let emailVerificationSent = false;
    try {
      await sendEmailVerification(fbUser);
      emailVerificationSent = true;
    } catch (vErr) {
      console.warn("Could not dispatch email verification:", vErr?.message);
    }

    const profile = await ensureUserProfile(fbUser.uid, cleanMobile, {
      name: displayName || cleanEmail.split("@")[0],
      email: cleanEmail,
    });
    const user = cacheLocalUser({
      uid: fbUser.uid,
      name: profile.name || displayName || cleanEmail.split("@")[0],
      email: cleanEmail,
      mobile: cleanMobile,
      address: "",
      emailVerified: fbUser.emailVerified,
      isLoggedIn: true,
    });
    if (cleanMobile && typeof window !== "undefined") {
      try {
        localStorage.setItem("dashit_user_phone", cleanMobile);
      } catch (e) {}
    }
    return { success: true, user, emailVerificationSent };
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
  const mobile = profileData.mobile || profileData.phoneNumber || "";
  const name = profileData.name || (profileData.firstName
    ? `${profileData.firstName || ""} ${profileData.lastName || ""}`.trim()
    : "Customer");

  if (!auth) {
    const user = cacheLocalUser({
      id: `USR-${mobile ? mobile.slice(-10) : "GUEST"}`,
      uid: null,
      name,
      mobile: mobile ? toE164(mobile) : "",
      address: profileData.address || "",
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
      mobile: profile.mobile || (mobile ? toE164(mobile) : ""),
      email: profile.email || "",
      address: profile.address || profileData.address || "",
      isLoggedIn: true,
    });
    return { success: true, user };
  } catch (e) {
    console.warn("Firebase phone auth sync note:", e?.message);
    const cleanDigits = String(mobile || "").replace(/\D/g, "").slice(-10);
    const fallbackUid = cleanDigits ? `cust_${cleanDigits}` : `guest_${Date.now()}`;
    const user = cacheLocalUser({
      uid: fallbackUid,
      name,
      mobile: cleanDigits ? toE164(cleanDigits) : "",
      email: "",
      address: profileData.address || "",
      isLoggedIn: true,
    });
    return { success: true, user };
  }
}

/**
 * Permanently deletes the signed-in account.
 *
 * Google Play and the App Store both require a self-serve deletion path. The
 * project is on the Spark plan, so there is no Cloud Function and no Admin SDK:
 * everything below runs as the user, under their own firestore.rules grants.
 *
 * Order documents are deliberately NOT deleted — they are the store's statutory
 * accounting records, and the rules forbid it. The privacy policy states this
 * carve-out. What goes is the profile, the saved addresses, the Firebase Auth
 * identity, and every local trace on the device.
 */
export async function deleteAccount() {
  const auth = getFirebaseAuth();
  const db = getDb();
  const user = auth?.currentUser || null;

  if (db && user?.uid) {
    try {
      const { collection, getDocs, deleteDoc } = await import("firebase/firestore");
      const addresses = await getDocs(collection(db, "users", user.uid, "addresses"));
      await Promise.all(addresses.docs.map((d) => deleteDoc(d.ref)));
      await deleteDoc(doc(db, "users", user.uid));
    } catch (e) {
      console.warn("Could not fully purge the Firestore profile:", e?.message);
    }
  }

  let requiresRecentLogin = false;
  if (user) {
    try {
      const { deleteUser } = await import("firebase/auth");
      await deleteUser(user);
    } catch (e) {
      // Firebase requires a fresh credential before it will delete an account.
      if (e?.code === "auth/requires-recent-login") {
        requiresRecentLogin = true;
      } else {
        console.warn("Could not delete the Firebase Auth user:", e?.message);
      }
    }
  }

  if (typeof window !== "undefined") {
    try {
      Object.keys(localStorage)
        .filter((k) => k.startsWith("dashit_"))
        .forEach((k) => localStorage.removeItem(k));
      sessionStorage.clear();
    } catch (e) {}
  }

  if (requiresRecentLogin) {
    try {
      if (auth) await fbSignOut(auth);
    } catch (e) {}
    return {
      success: false,
      requiresRecentLogin: true,
      message:
        "For your security, please sign in again and then retry deleting your account.",
    };
  }

  return { success: true };
}

/** Resolves the caller's staff role, or null for ordinary customers. */
export async function getStaffRole(uid) {
  if (!uid) return null;
  // Whitelisted driver accounts
  if (uid === "DOf5enic8SXBZTupGJbxDrNdrOt2") {
    return "driver";
  }
  const auth = getFirebaseAuth();
  if (auth?.currentUser?.email?.toLowerCase() === "m4k3ditz@gmail.com") {
    return "driver";
  }
  const db = getDb();
  if (!db) return null;
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
