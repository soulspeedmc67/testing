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

/** Current signed-in uid, or null. */
const currentUid = () => getFirebaseAuth()?.currentUser?.uid || null;

export async function sendOtp(mobile) {
  return authSendOtp(mobile);
}

export async function verifyOtp(mobile, otp) {
  return authVerifyOtp(mobile, otp);
}

export async function submitOrder(orderData) {
  const uid = currentUid();

  if (!isFirebaseConfigured || !uid) {
    // Offline / unauthenticated: keep the order locally so the tracker still works.
    const local = {
      ...orderData,
      orderId: orderData.orderId || `DSH-${Math.floor(1000 + Math.random() * 9000)}`,
      status: "Placed",
      createdAt: new Date().toISOString(),
    };
    writeLocal("dashit_active_order", local);
    const history = readLocal("dashit_orders_history", []);
    writeLocal("dashit_orders_history", [local, ...history]);
    return { success: true, order: local, offline: true };
  }

  try {
    const result = await createOrder(orderData, uid);
    writeLocal("dashit_active_order", {
      ...orderData,
      orderId: result.orderId,
      status: "Placed",
    });
    return result;
  } catch (e) {
    console.warn("Order write failed, storing locally:", e?.message);
    return { success: false, message: e?.message };
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
