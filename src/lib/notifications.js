let lastNotificationKey = null;
let outForDeliveryAnnounced = null;

/**
 * Initializes notification permissions.
 * On Android, strictly requests standard POST_NOTIFICATIONS via the native bridge,
 * never touching exact alarm settings or prompting for Alarms & Reminders.
 */
export async function initNotificationPermissions() {
  if (typeof window === "undefined") return;

  // 1. Android Native Bridge (Strictly standard POST_NOTIFICATIONS, zero alarms)
  if (
    window.AndroidNotifications &&
    typeof window.AndroidNotifications.requestNotificationPermission === "function"
  ) {
    try {
      if (!window.AndroidNotifications.hasNotificationPermission()) {
        window.AndroidNotifications.requestNotificationPermission();
      }
      return;
    } catch (e) {}
  }

  // 2. Web browser fallback (PWA / Chrome Desktop)
  if ("Notification" in window && Notification.permission === "default") {
    try {
      await Notification.requestPermission();
    } catch (err) {}
  }
}

/**
 * Live persistent status bar & notification drawer widget for active orders.
 * Shows store name, live stage status, progress bar (0-100%), ETA, and visual progress line.
 */
export async function showOrderLiveNotification({
  orderId = "DASH-98214",
  storeName = "DASHit Express Hub · Anantnag",
  headline = "Order processing",
  subtitle = "On time",
  etaMinutes = 7,
  progressPct = 35,
  status = "Order processing",
  riderName = "",
  isDelivered = false,
}) {
  if (typeof window === "undefined") return;

  const currentKey = `${orderId}_${etaMinutes}_${progressPct}_${status}_${isDelivered}`;
  if (lastNotificationKey === currentKey) {
    return;
  }
  lastNotificationKey = currentKey;

  // 1. Android Native Live Widget
  if (
    window.AndroidNotifications &&
    typeof window.AndroidNotifications.postLiveOrderNotification === "function"
  ) {
    try {
      window.AndroidNotifications.postLiveOrderNotification(
        String(orderId),
        String(storeName || "DASHit Express Hub · Anantnag"),
        String(headline || status || "Order processing"),
        String(subtitle || "On time"),
        Number(progressPct) || 0,
        Number(etaMinutes) || 0,
        Boolean(isDelivered)
      );
      return;
    } catch (e) {
      console.warn("Native live notification update note:", e?.message || e);
    }
  }

  // 2. Web browser Notification fallback
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      const title = isDelivered ? "Order Delivered! · DASHit" : `${headline || status} · DASHit`;
      const body = isDelivered
        ? "Your DASHit delivery has arrived. Enjoy!"
        : `${subtitle || `Arriving in ${etaMinutes} mins`}`;

      new Notification(title, {
        body,
        icon: "/favicon.ico",
        tag: "dashit-live-order",
        silent: true,
      });
    } catch (e) {}
  }
}

/**
 * Alerts the customer the moment an order leaves the hub.
 */
export async function showOutForDeliveryNotification({
  orderId,
  riderName = "",
  etaMinutes = 0,
} = {}) {
  if (typeof window === "undefined" || !orderId) return;
  if (outForDeliveryAnnounced === orderId) return;
  outForDeliveryAnnounced = orderId;

  const who = riderName ? `${riderName} is on the way` : "Your rider is on the way";
  const eta = etaMinutes > 0 ? ` · arriving in ~${etaMinutes} mins` : "";
  const title = "Out for Delivery · DASHit";
  const body = `${who}${eta}. Order #${orderId}`;

  // 1. Android Native Alert
  if (
    window.AndroidNotifications &&
    typeof window.AndroidNotifications.postAlertNotification === "function"
  ) {
    try {
      window.AndroidNotifications.postAlertNotification(title, body);
      return;
    } catch (e) {}
  }

  // 2. Web Notification fallback
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, { body, icon: "/favicon.ico" });
    } catch (e) {}
  }
}

/**
 * Clears the persistent live order notification when an order is retired or dismissed.
 */
export async function clearOrderLiveNotification() {
  if (typeof window === "undefined") return;
  lastNotificationKey = null;
  outForDeliveryAnnounced = null;

  if (
    window.AndroidNotifications &&
    typeof window.AndroidNotifications.clearLiveOrderNotification === "function"
  ) {
    try {
      window.AndroidNotifications.clearLiveOrderNotification();
    } catch (e) {}
  }
}

/**
 * Instant high-priority alert when an order is placed.
 */
export async function showOrderPlacedNotification(order) {
  if (typeof window === "undefined" || !order) return;

  const orderId = order.orderId || "DSH-Order";
  const eta = order.etaMinutes || 10;
  const total = order.totalAmount || order.finalTotal || order.total || 0;
  const itemCount = order.items?.length || 1;

  const title = "Order Placed Successfully!";
  const body = `Order #${orderId} confirmed (₹${total} · ${itemCount} item${
    itemCount > 1 ? "s" : ""
  }). Arriving in ~${eta} mins!`;

  // 1. Android Native Alert
  if (
    window.AndroidNotifications &&
    typeof window.AndroidNotifications.postAlertNotification === "function"
  ) {
    try {
      window.AndroidNotifications.postAlertNotification(title, body);
      return;
    } catch (e) {}
  }

  // 2. Web Notification fallback
  if ("Notification" in window && Notification.permission === "granted") {
    try {
      new Notification(title, {
        body,
        icon: "/favicon.ico",
        tag: `dashit-order-placed-${orderId}`,
      });
    } catch (e) {}
  }
}

