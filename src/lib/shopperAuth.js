/**
 * Signing in to shop on the website, the same way as the apps: a Google
 * account (firestore.rules only take orders from Google or Apple accounts),
 * then a mobile number for the rider, confirmed with an SMS code through
 * 2Factor when that is switched on (public/api/auth/send-otp.php answers
 * { configured: false } until then, and the number is saved as given).
 *
 * The session the shop pages read is `dashit_user` in localStorage:
 * { uid, name, email, mobile, isLoggedIn }.
 */
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { getDb, getFirebaseAuth } from "./firebase";
import { signInWithGoogle, completeGoogleRedirect } from "./auth";

const USER_KEY = "dashit_user";

/** On the website the PHP lives on the same site; on a computer, the live one. */
export const API_ORIGIN =
  typeof window !== "undefined" && /^(localhost|127\.|\[::1\])/.test(window.location.hostname)
    ? "https://dashit.co.in"
    : "";

export function readShopper() {
  if (typeof window === "undefined") return null;
  try {
    const u = JSON.parse(localStorage.getItem(USER_KEY) || "null");
    return u && u.isLoggedIn ? u : null;
  } catch (e) {
    return null;
  }
}

function saveShopper(user) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
    if (user.mobile) localStorage.setItem("dashit_user_phone", user.mobile);
    window.dispatchEvent(new Event("dashit_user_updated"));
  } catch (e) {}
  return user;
}

/** 10 digits, or null: 09876543210 / +91 98765 43210 → 9876543210. */
export function cleanMobile(value) {
  const digits = String(value || "").replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

/** Waits for Firebase to restore a saved session (it loads asynchronously). */
async function currentFirebaseUser() {
  const auth = getFirebaseAuth();
  if (!auth) return null;
  try {
    if (typeof auth.authStateReady === "function") await auth.authStateReady();
  } catch (e) {}
  return auth.currentUser || null;
}

/** True when there is a Google session behind the saved shopper. */
export async function hasLiveSession() {
  const user = await currentFirebaseUser();
  return Boolean(user && !user.isAnonymous);
}

export async function idToken() {
  const user = await currentFirebaseUser();
  if (!user || user.isAnonymous) throw new Error("Please sign in again.");
  return user.getIdToken();
}

/** Google sign-in. Returns { user } with whatever number the profile already has, or { error }. */
export async function signInShopper() {
  const res = await signInWithGoogle();
  if (res?.redirecting) return { redirecting: true };
  if (!res?.success) return { error: res?.message || "", cancelled: Boolean(res?.cancelled) };
  const u = res.user;
  return { user: { uid: u.uid, name: u.name, email: u.email, mobile: cleanMobile(u.mobile) || "" } };
}

/** Finishes a sign-in that went through Google's redirect page instead of the popup. */
export async function finishRedirectSignIn() {
  const res = await completeGoogleRedirect();
  if (!res) return null;
  if (!res.success) return { error: res.message };
  const u = res.user;
  return { user: { uid: u.uid, name: u.name, email: u.email, mobile: cleanMobile(u.mobile) || "" } };
}

async function post(path, body) {
  let res;
  try {
    res = await fetch(`${API_ORIGIN}/api/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error("Couldn't reach DASHIT. Check your connection and try again.");
  }
  // A site without the endpoint yet: carry on without a code, like the apps.
  if (res.status === 404) return { configured: false };
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error || "That didn't work. Please try again.");
  return data;
}

/** Texts a code to the number. { configured: false } means "no codes yet, just save it". */
export async function requestNumberCode(mobile) {
  return post("send-otp.php", { mobile, id_token: await idToken() });
}

/** Checks the code; the server marks the number confirmed on the profile. */
export async function confirmNumberCode(mobile, otp, ticket) {
  return post("verify-otp.php", { mobile, otp, ticket, id_token: await idToken() });
}

/** Saves the number on the profile (unconfirmed) when there are no SMS codes yet. */
export async function saveNumberUnconfirmed(uid, mobile) {
  const db = getDb();
  if (!db) return;
  try {
    await setDoc(
      doc(db, "users", uid),
      { mobile: `+91${mobile}`, mobileVerified: false, updatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (e) {
    // The order carries the number anyway; the profile catches up next time.
    console.warn("Couldn't save the number on the profile:", e?.message);
  }
}

/** Stores the finished session the shop pages read. */
export function completeShopper(user, mobile) {
  return saveShopper({
    uid: user.uid,
    name: user.name || "Customer",
    email: user.email || "",
    mobile,
    provider: "google",
    isLoggedIn: true,
  });
}

export async function signOutShopper() {
  try {
    const auth = getFirebaseAuth();
    if (auth) {
      const { signOut } = await import("firebase/auth");
      await signOut(auth);
    }
  } catch (e) {}
  try {
    localStorage.removeItem(USER_KEY);
    window.dispatchEvent(new Event("dashit_user_updated"));
  } catch (e) {}
}
