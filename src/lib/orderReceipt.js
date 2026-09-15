
/* Node and the browser default to different time zones, so an unpinned
   toLocaleString renders one time on the server and another on the client —
   a hydration mismatch that makes React re-render the whole page. The store
   is India-only, so the zone is fixed. */
const IST = "Asia/Kolkata";

/**
 * Plain-text order receipt, and a WhatsApp link that pre-fills it.
 *
 * Why a wa.me link rather than automated sending: sending a WhatsApp message
 * from software needs the WhatsApp Cloud API, whose access token has to live on
 * a server. This project is a static export on the Spark plan, so there is
 * nowhere to keep a token that customers could not read. A wa.me link needs no
 * token at all — it opens WhatsApp with the message already written and the
 * customer's number selected, and the operator presses send.
 */

const money = (n) => "₹" + Number(n || 0).toLocaleString("en-IN");

/**
 * The delivery address for an order, whatever shape it was saved in.
 *
 * Checkout writes the pin as `location`, but the admin console was reading
 * `userAddress` / `deliveryAddress` — fields nothing ever writes — so every
 * order in the console showed the fallback string "Anantnag" instead of the
 * customer's actual address.
 */
export function orderAddress(order, fallback = "") {
  if (!order) return fallback;
  const candidates = [
    order.location?.address,
    order.userAddress?.address,
    order.deliveryAddress,
    order.address,
    typeof order.location === "string" ? order.location : null,
  ];
  const found = candidates.find((v) => typeof v === "string" && v.trim());
  return found ? found.trim() : fallback;
}

/** Coordinates for an order's drop, or null when it has none. */
export function orderCoords(order) {
  const loc = order?.location || order?.userAddress || null;
  const lat = Number(loc?.lat ?? loc?.latitude);
  const lng = Number(loc?.lng ?? loc?.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  return null;
}

/** Order time in ms from a Firestore Timestamp, ISO string, Date or number. */
export function orderTimeMs(order) {
  const ts = order?.createdAt ?? order?.timestamp;
  if (!ts) return null;
  if (typeof ts === "number") return ts;
  if (typeof ts === "string") {
    const p = Date.parse(ts);
    return Number.isNaN(p) ? null : p;
  }
  if (typeof ts.toMillis === "function") return ts.toMillis();
  if (typeof ts.seconds === "number") return ts.seconds * 1000;
  if (ts instanceof Date) return ts.getTime();
  return null;
}

/** Builds the message body. Plain text — WhatsApp renders *bold* with asterisks. */
export function buildReceiptText(order, { origin = "" } = {}) {
  if (!order) return "";

  const orderId = order.orderId || order.id || "";
  const items = order.items || [];
  const name = order.customerName || "there";

  const ms = orderTimeMs(order);
  const when = ms
    ? new Date(ms).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: IST })
    : "";

  const lineTotal = (it) => (Number(it.price) || 0) * (it.qty || it.quantity || 1);
  const subtotal = items.reduce((s, it) => s + lineTotal(it), 0);
  const total = Number(order.totalAmount ?? order.total ?? subtotal) || 0;
  const deliveryFee = Number(order.deliveryFee ?? 0);
  const discount = Number(order.discount ?? order.couponDiscount ?? 0);
  const isPaid = /online|upi|card/i.test(order.paymentMethod || "");
  const address = order.location?.address || order.userAddress?.address || "";

  const lines = [];
  lines.push(`Hi ${name}, thanks for ordering from DASHit!`);
  lines.push("");
  lines.push(`*Order ${orderId ? "#" + orderId : ""}*`);
  if (when) lines.push(when);
  lines.push("");

  items.forEach((it) => {
    const qty = it.qty || it.quantity || 1;
    lines.push(`${qty} x ${it.name} - ${money(lineTotal(it))}`);
  });

  lines.push("");
  lines.push(`Subtotal: ${money(subtotal)}`);
  if (discount > 0) lines.push(`Discount: -${money(discount)}`);
  lines.push(`Delivery: ${deliveryFee > 0 ? money(deliveryFee) : "Free"}`);
  lines.push(
    isPaid ? `*Total paid: ${money(total)}*` : `*To pay on delivery: ${money(total)}*`
  );

  if (order.otp) {
    lines.push("");
    lines.push(`Your OTP: *${order.otp}*`);
    lines.push("Share this with the rider when your order arrives.");
  }

  if (address) {
    lines.push("");
    lines.push(`Delivering to: ${address}`);
  }

  if (origin) {
    lines.push("");
    lines.push(`Track it here: ${origin}/orders`);
  }

  return lines.join("\n");
}

/** Digits-only E.164-ish number for wa.me (India default). */
function waNumber(raw) {
  const digits = String(raw || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return "91" + digits;
  return digits.replace(/^0+/, "");
}

/**
 * wa.me link that opens WhatsApp with the receipt written out.
 * Returns null when the order has no usable phone number.
 */
export function whatsappReceiptLink(order, { origin = "" } = {}) {
  const phone = waNumber(
    order?.customerPhone || order?.mobile || order?.userAddress?.phone
  );
  if (!phone) return null;
  const text = encodeURIComponent(buildReceiptText(order, { origin }));
  return `https://wa.me/${phone}?text=${text}`;
}
