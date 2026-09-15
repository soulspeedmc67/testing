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
  // e.g. [●━━━━►┈┈┈┈┈■]
  const totalSlots = 8;
  const filledSlots = Math.min(totalSlots - 1, Math.max(0, Math.floor((progressPct / 100) * totalSlots)));
  const unfilledSlots = Math.max(0, totalSlots - 1 - filledSlots);
  const visualTrack = "●" + "━".repeat(filledSlots) + "►" + "┈".repeat(unfilledSlots) + "■";

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
          summaryText: "Dashit Express Hub · Anantnag",
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

/**
 * A single alerting notification the moment an order leaves the hub.
 *
 * The live tracking notification above is deliberately silent and ongoing — it
 * is a progress bar, not an alert, so a customer who put their phone down never
 * learns the rider has set off. This fires once per order on that transition,
 * with sound, and is separate so it does not disturb the ongoing one.
 */
let outForDeliveryAnnounced = null;

export async function showOutForDeliveryNotification({ orderId, riderName = "", etaMinutes = 0 } = {}) {
  if (typeof window === "undefined" || !orderId) return;
  // Once per order, even though the status listener re-fires on every snapshot.
  if (outForDeliveryAnnounced === orderId) return;
  outForDeliveryAnnounced = orderId;

  const who = riderName ? `${riderName} is on the way` : "Your rider is on the way";
  const eta = etaMinutes > 0 ? ` · arriving in about ${etaMinutes} min${etaMinutes !== 1 ? "s" : ""}` : "";
  const title = "Out for delivery · Dashit";
  const body = `${who}${eta}. Order #${orderId}`;

  try {
    try {
      await LocalNotifications.createChannel({
        id: "order_out_for_delivery_v1",
        name: "Dashit Out for Delivery",
        description: "Alerts you when your rider sets off",
        importance: 4, // heads-up, with sound
        visibility: 1,
        vibration: true,
      });
    } catch (e) {}

    await LocalNotifications.schedule({
      notifications: [
        {
          id: 9822,
          title,
          body,
          channelId: "order_out_for_delivery_v1",
          smallIcon: "ic_stat_icon_config_sample",
          autoCancel: true,
          silent: false,
        },
      ],
    });
  } catch (err) {
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, { body, icon: "/favicon.ico" });
      } catch (e) {}
    }
  }
}

export async function clearOrderLiveNotification() {
  if (typeof window === "undefined") return;
  lastNotificationKey = null;
  outForDeliveryAnnounced = null;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: 9821 }] });
  } catch (e) {}
}

/**
 * High-priority instant notification when a customer successfully places a new order.
 * Works natively on Android / iOS via Capacitor and on web/PWA via Notifications API.
 */
export async function showOrderPlacedNotification(order) {
  if (typeof window === "undefined" || !order) return;

  const orderId = order.orderId || "DSH-Order";
  const eta = order.etaMinutes || 10;
  const total = order.totalAmount || order.finalTotal || order.total || 0;
  const itemCount = order.items?.length || 1;

  const title = `Order Placed Successfully!`;
  const body = `Order #${orderId} confirmed (₹${total} · ${itemCount} item${itemCount > 1 ? "s" : ""}). Delivery arriving in ~${eta} mins!`;

  // 1. Capacitor Local Notifications (Android / iOS Native App)
  try {
    try {
      await LocalNotifications.createChannel({
        id: "order_status_channel",
        name: "Dashit Order Updates",
        description: "Notifications for order confirmations and live deliveries",
        importance: 4, // High importance
        visibility: 1,
        vibration: true,
        sound: "default"
      });
    } catch (e) {}

    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(10000 + Math.random() * 90000),
          title,
          body,
          summaryText: "Dashit Express · Order Confirmed",
          channelId: "order_status_channel",
          ongoing: false,
          autoCancel: true,
          sound: "default",
          smallIcon: "res://drawable/splash"
        }
      ]
    });
  } catch (err) {
    // 2. Web Notification API fallback (for PWA / Mobile Chrome / Desktop)
    if ("Notification" in window && Notification.permission === "granted") {
      try {
        new Notification(title, {
          body,
          icon: "/dashit-app-icon.png",
          badge: "/dashit-mark-navy.png",
          tag: `dashit-order-placed-${orderId}`
        });
      } catch (e) {}
    }
  }
}

