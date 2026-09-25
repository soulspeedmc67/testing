/**
 * DASHit API surface.
 *
 * Previously a fetch client against the Express server on :5001. Now backed by
 * Firestore. The exported function names and their return shapes are unchanged
 * so existing pages keep working — new code should prefer `src/lib/db.js` and
 * `src/lib/auth.js` directly, especially for realtime listeners.
 *
 * When Firebase is not configured, every call degrades to localStorage so the
 * app still runs offline and in development.
 */

import { isFirebaseConfigured, getFirebaseAuth } from "./firebase";
import { sendOtp as authSendOtp, verifyOtp as authVerifyOtp } from "./auth";
import {
  createOrder,
  fetchUserOrders,
  updateOrderStatus,
  fetchProducts,
} from "./db";

export {
  getStaffRole,
  watchAuth,
  signOut,
  signInWithGoogle,
  signInWithGoogleDirect,
  signInWithTruecaller,
  signInWithEmail,
  signUpWithEmail,
  sendWhatsappOtp,
  verifyWhatsappOtp,
} from "./auth";

const readLocal = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
};

const writeLocal = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {}
};

/** Ensures a valid UID for the order, signing in anonymously with Firebase if needed */
export async function ensureAuthenticatedUid() {
  const auth = getFirebaseAuth();
  if (auth && typeof auth.authStateReady === "function") {
    try {
      await auth.authStateReady();
    } catch (e) {}
  }
  if (auth?.currentUser?.uid) {
    return auth.currentUser.uid;
  }
  if (auth) {
    try {
      const { signInAnonymously } = await import("firebase/auth");
      const cred = await signInAnonymously(auth);
      if (cred?.user?.uid) {
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("dashit_client_uid", cred.user.uid);
          } catch (err) {}
        }
        return cred.user.uid;
      }
    } catch (e) {
      console.warn("Anonymous sign-in skipped:", e?.message);
    }
  }
  // Persistent fallback for guest/phone users so order write NEVER drops
  let clientUid = typeof window !== "undefined" ? localStorage.getItem("dashit_client_uid") : null;
  if (!clientUid && typeof window !== "undefined") {
    const phone = localStorage.getItem("dashit_user_phone");
    clientUid = phone ? `cust_${phone}` : `guest_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      localStorage.setItem("dashit_client_uid", clientUid);
    } catch (e) {}
  }
  return clientUid || "anonymous_customer";
}

/** Current signed-in uid, or null. */
const currentUid = () => getFirebaseAuth()?.currentUser?.uid || (typeof window !== "undefined" ? localStorage.getItem("dashit_client_uid") : null);

export async function sendOtp(mobile) {
  return authSendOtp(mobile);
}

export async function verifyOtp(mobile, otp) {
  return authVerifyOtp(mobile, otp);
}

let isSubmittingOrder = false;
let lastSubmitOrderTimestamp = 0;

export async function submitOrder(orderData) {
  const now = Date.now();
  if (isSubmittingOrder) {
    throw new Error("Your order is currently processing. Please wait a moment.");
  }
  if (now - lastSubmitOrderTimestamp < 2500) {
    throw new Error("Please wait a moment before placing another order.");
  }

  isSubmittingOrder = true;
  try {
    const uid = await ensureAuthenticatedUid();

    // If Firebase is available, submit directly to Firestore
    if (isFirebaseConfigured) {
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Connection timeout contacting store")), 8000)
        );
        const result = await Promise.race([createOrder(orderData, uid), timeoutPromise]);
        lastSubmitOrderTimestamp = Date.now();
        const confirmedOrder = {
          ...orderData,
          orderId: result.orderId,
          status: "Placed",
        };
        writeLocal("dashit_active_order", confirmedOrder);
        const history = readLocal("dashit_orders_history", []);
        const filtered = history.filter((h) => h.orderId !== result.orderId && h.orderId !== orderData.orderId);
        writeLocal("dashit_orders_history", [confirmedOrder, ...filtered]);

        // Broadcast order across browser tabs, windows, and dark store portals
        if (typeof window !== "undefined") {
          try {
            window.dispatchEvent(new CustomEvent("dashit_orders_updated", { detail: confirmedOrder }));
            if (window.BroadcastChannel) {
              const bc = new BroadcastChannel("dashit_orders_channel");
              bc.postMessage({ type: "NEW_ORDER", order: confirmedOrder });
            }
          } catch (e) {}
        }

        return result;
      } catch (e) {
        console.error("Firestore order write error:", e);
        throw new Error(
          "We could not reach the store to place your order. Please check your connection and try again."
        );
      }
    }

    // Fallback for a build with no Firebase configured at all (local demo mode).
    const local = {
      ...orderData,
      orderId: orderData.orderId || `DSH-${Date.now().toString().slice(-4)}${Math.floor(1000 + Math.random() * 9000)}`,
      status: "Placed",
      createdAt: new Date().toISOString(),
    };
    writeLocal("dashit_active_order", local);
    const history = readLocal("dashit_orders_history", []);
    writeLocal("dashit_orders_history", [local, ...history]);

    if (typeof window !== "undefined") {
      try {
        window.dispatchEvent(new CustomEvent("dashit_orders_updated", { detail: local }));
        if (window.BroadcastChannel) {
          const bc = new BroadcastChannel("dashit_orders_channel");
          bc.postMessage({ type: "NEW_ORDER", order: local });
        }
      } catch (e) {}
    }

    return { success: true, orderId: local.orderId, order: local, offline: true };
  } finally {
    isSubmittingOrder = false;
  }
}

export async function fetchAdminOrders() {
  const uid = currentUid();
  if (!isFirebaseConfigured || !uid) {
    return { success: false, orders: readLocal("dashit_orders_history", []) };
  }
  try {
    // Admin listing is realtime elsewhere; this one-shot keeps the old contract.
    const { watchAllOrders } = await import("./db");
    const orders = await new Promise((resolve) => {
      const stop = watchAllOrders((list) => {
        stop();
        resolve(list);
      });
    });
    return { success: true, orders };
  } catch (e) {
    return { success: false, orders: [] };
  }
}

export async function updateAdminOrderStatus(orderId, status) {
  if (!isFirebaseConfigured) return { success: false };
  try {
    return await updateOrderStatus(orderId, status);
  } catch (e) {
    return { success: false, message: e?.message };
  }
}

export async function fetchUserOrderHistory() {
  const uid = currentUid();
  if (!isFirebaseConfigured || !uid) {
    return readLocal("dashit_orders_history", []);
  }
  return fetchUserOrders(uid);
}

export async function fetchCatalogue() {
  if (!isFirebaseConfigured) return [];
  try {
    return await fetchProducts();
  } catch (e) {
    return [];
  }
}
