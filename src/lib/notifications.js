import { LocalNotifications } from "@capacitor/local-notifications";

let lastNotificationKey = null;

export async function initNotificationPermissions() {
  if (typeof window === "undefined") return;
  try {
    const perm = await LocalNotifications.checkPermissions();
    if (perm.display !== "granted") {
      await LocalNotifications.requestPermissions();
    }
  } catch (e) {
    if ("Notification" in window && Notification.permission === "default") {
      try { await Notification.requestPermission(); } catch (err) {}
    }
  }
}

export async function showOrderLiveNotification({ orderId = "DASH-98214", etaMinutes = 7, riderName = "Tariq Ahmad" }) {
  if (typeof window === "undefined") return;

  const currentKey = `${orderId}_${etaMinutes}`;
  // Prevent repeated popup triggers if status / ETA has not changed
  if (lastNotificationKey === currentKey) {
    return;
  }
  lastNotificationKey = currentKey;

  try {
    // Android Channel with LOW importance (silent, stays live in status bar without popping up)
    try {
      await LocalNotifications.createChannel({
        id: "live_order_tracking_v2",
        name: "Live Order Tracking",
        description: "Silent ongoing updates in status bar (Zomato style)",
        importance: 2, // LOW: shows in status bar and drawer, NO heads-up popup
        visibility: 1,
        vibration: false,
        sound: null
      });
    } catch (e) {}

    await LocalNotifications.schedule({
      notifications: [
        {
          id: 9821,
          title: `On time · Arriving in ${etaMinutes} min${etaMinutes !== 1 ? "s" : ""}`,
          body: `Dashit Darkstore: Preparing your order for delivery`,
          channelId: "live_order_tracking_v2",
          ongoing: true,
          autoCancel: false,
          silent: true
        }
      ]
    });
  } catch (err) {
    // Browser fallback
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(`DASHit · Arriving in ${etaMinutes} mins`, {
          body: `${riderName} is on the way with order #${orderId}`,
          tag: "dashit_order_tracking",
          silent: true
        });
      } catch (e) {}
    }
  }
}

export async function clearOrderLiveNotification() {
  if (typeof window === "undefined") return;
  lastNotificationKey = null;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: 9821 }] });
  } catch (e) {}
}
