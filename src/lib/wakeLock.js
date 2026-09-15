/**
 * Screen wake lock.
 *
 * Keeps the screen from sleeping while a rider is on an active run, so the
 * WebView is not throttled mid-delivery.
 *
 * What this does NOT do: keep GPS running in the background. A screen wake lock
 * only holds the display on while the app is in the foreground. If the rider
 * locks the phone or switches apps, the browser suspends timers and location
 * updates stop. Genuine background tracking needs a native foreground service
 * (Android) or background location mode (iOS), neither of which this Capacitor
 * WebView build has. Riders must keep the app open on screen during a run.
 */

let wakeLockSentinel = null;

export async function requestScreenWakeLock() {
  if (typeof window === "undefined" || !("wakeLock" in navigator)) {
    return null;
  }
  try {
    if (wakeLockSentinel && !wakeLockSentinel.released) {
      return wakeLockSentinel;
    }
    wakeLockSentinel = await navigator.wakeLock.request("screen");
    wakeLockSentinel.addEventListener("release", () => {
      wakeLockSentinel = null;
    });
    return wakeLockSentinel;
  } catch (err) {
    console.warn("Screen WakeLock notice:", err?.message);
    return null;
  }
}

export function releaseScreenWakeLock() {
  if (wakeLockSentinel) {
    wakeLockSentinel.release().catch(() => {});
    wakeLockSentinel = null;
  }
}
