import { Capacitor } from "@capacitor/core";

/**
 * Platform detection shared across the app.
 *
 * Kept separate from haptics.js so navigation, gesture and animation code can
 * gate on platform without importing the haptics engine. Every helper is
 * SSR-safe: during static export there is no window, so they return false.
 */

export const isNative = () => {
  if (typeof window === "undefined") return false;
  try {
    return Capacitor.isNativePlatform();
  } catch (e) {
    return false;
  }
};

export const isIOS = () => {
  if (typeof window === "undefined") return false;
  try {
    if (Capacitor.getPlatform() === "ios") return true;
  } catch (e) {}
  // Mobile Safari / iPadOS fallback when running as a plain web app
  const ua = window.navigator?.userAgent || "";
  return /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
};

export const isAndroid = () => {
  if (typeof window === "undefined") return false;
  try {
    if (Capacitor.getPlatform() === "android") return true;
  } catch (e) {}
  return /Android/.test(window.navigator?.userAgent || "");
};

/**
 * True when the OS provides its own back affordance that we must not duplicate.
 * Android has the system back gesture / button (handled in _app.js), so adding
 * an in-app edge-swipe there would double-fire the navigation.
 */
export const hasSystemBackGesture = () => isAndroid();
