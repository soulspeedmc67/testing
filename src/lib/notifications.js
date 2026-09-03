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

export async function showOrderLiveNotification({
  orderId = "DASH-98214",
  etaMinutes = 7,
  progressPct = 35,
  status = "Preparing your order",
  riderName = "Tariq Ahmad"
}) {
  if (typeof window === "undefined") return;

  const currentKey = `${orderId}_${etaMinutes}_${progressPct}_${status}`;
  if (lastNotificationKey === currentKey) {
    return;
  }
  lastNotificationKey = currentKey;

  // Build clean visual progress track for Android / iOS notification drawer:
  // e.g. [●━━━━🛵┈┈┈┈┈⌂]
  const totalSlots = 8;
  const filledSlots = Math.min(totalSlots - 1, Math.max(0, Math.floor((progressPct / 100) * totalSlots)));
  const unfilledSlots = Math.max(0, totalSlots - 1 - filledSlots);
  const visualTrack = "●" + "━".repeat(filledSlots) + "🛵" + "┈".repeat(unfilledSlots) + "⌂";

  try {
    try {
      await LocalNotifications.createChannel({
        id: "live_order_tracking_v3",
        name: "Dashit Live Tracking",
        description: "Live delivery progress in notification drawer",
        importance: 2, // Silent ongoing status bar
        visibility: 1,
        vibration: false,
        sound: null
      });
    } catch (e) {}

    const title = status === "Delivered" ? "Order Delivered! · Dashit" : `${status} · Dashit`;
    const body = status === "Delivered"
      ? "Your Dashit delivery has arrived. Enjoy!"
      : `${visualTrack}  On time | Arriving in ${etaMinutes} min${etaMinutes !== 1 ? "s" : ""}`;

    await LocalNotifications.schedule({
      notifications: [
        {
          id: 9821,
          title,
          body,
          summaryText: "Dashit Darkstore · Anantnag",
          channelId: "live_order_tracking_v3",
          ongoing: status !== "Delivered",
          autoCancel: status === "Delivered",
          silent: true
        }
      ]
    });
  } catch (err) {
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(`Dashit · ${status}`, {
          body: `${visualTrack} On time | Arriving in ${etaMinutes} mins`,
          icon: "/favicon.ico"
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
