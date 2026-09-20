/**
 * High-reliability order sound & notification utility for the DASHit Admin Desk.
 * Pure Web Audio API synthesis — 0 external mp3 dependencies, works offline and in WebView.
 */

let audioCtx = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtxClass) return null;
  if (!audioCtx) {
    audioCtx = new AudioCtxClass();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

/** Pre-unlocks audio context on initial button click (browser autoplay policy requirement). */
export function unlockAudio() {
  try {
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume();
    }
  } catch (e) {}
}

/** Plays a pleasant, high-visibility 4-note bell chime (D5 -> A5 -> D6 -> F#6 shimmer). */
export function playOrderChime() {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [
      { freq: 587.33, start: 0, duration: 0.18, vol: 0.35 },    // D5
      { freq: 880.00, start: 0.12, duration: 0.22, vol: 0.4 },    // A5
      { freq: 1174.66, start: 0.26, duration: 0.45, vol: 0.5 },  // D6 (high bell ring)
      { freq: 1479.98, start: 0.38, duration: 0.65, vol: 0.3 }   // F#6 (shimmer trail)
    ];

    notes.forEach(({ freq, start, duration, vol }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + start);

      gain.gain.setValueAtTime(0.001, now + start);
      gain.gain.exponentialRampToValueAtTime(vol, now + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + start + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + start);
      osc.stop(now + start + duration);
    });

    // Device haptic vibration (Android & mobile browsers)
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate([200, 100, 250, 100, 350]);
    }
  } catch (err) {
    console.warn("Could not play audio chime:", err);
  }
}

/** Requests browser notification permissions. */
export async function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  try {
    if (Notification.permission === "granted") return true;
    if (Notification.permission !== "denied") {
      const perm = await Notification.requestPermission();
      return perm === "granted";
    }
  } catch (e) {}
  return false;
}

/** Sends an immediate OS desktop / phone notification for incoming orders. */
export async function notifyNewOrder(order) {
  playOrderChime();

  const title = `New Order: #${order.orderId || "DSH"}`;
  const body = `₹${order.totalAmount || 0} · ${order.items?.length || 1} items · ${order.customerName || "Customer"}`;

  // 1. Browser Web Notifications API
  if (typeof window !== "undefined" && "Notification" in window) {
    if (Notification.permission === "granted") {
      try {
        new Notification(title, {
          body,
          icon: "/dashit-app-icon.png",
          badge: "/dashit-mark-navy.png",
          tag: `dashit-order-${order.orderId}`,
          renotify: true,
          vibrate: [200, 100, 200],
        });
      } catch (e) {}
    }
  }

  // 2. Native Android bridge for APK
  if (
    typeof window !== "undefined" &&
    window.AndroidNotifications &&
    typeof window.AndroidNotifications.postAlertNotification === "function"
  ) {
    try {
      window.AndroidNotifications.postAlertNotification(title, body);
      return;
    } catch (e) {}
  }
}
