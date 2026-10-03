/**
 * Paying online on the website: Razorpay Standard Checkout (UPI, cards,
 * netbanking, wallets), on the same server endpoints as the apps.
 *
 *  1. create-order.php makes the Razorpay order for the amount, stamped with
 *     the signed-in shopper (Firebase ID token). The key id comes back from
 *     the server, so test and live keys switch there, not here.
 *  2. Razorpay's own window takes the payment.
 *  3. verify-payment.php checks the signature and records payments/{id} in
 *     Firestore, which the order rules require before an order may say it was
 *     paid online. If the answer gets lost, payment-status.php asks Razorpay.
 */
import { idToken, API_ORIGIN } from "./shopperAuth";

const SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";
let scriptLoading = null;

function loadScript() {
  if (typeof window !== "undefined" && window.Razorpay) return Promise.resolve();
  if (!scriptLoading) {
    scriptLoading = new Promise((resolve, reject) => {
      const el = document.createElement("script");
      el.src = SCRIPT_URL;
      el.async = true;
      el.onload = () => resolve();
      el.onerror = () => {
        scriptLoading = null;
        reject(new Error("The payment page didn't load. Check your connection and try again."));
      };
      document.head.appendChild(el);
    });
  }
  return scriptLoading;
}

async function post(path, body) {
  let res;
  try {
    res = await fetch(`${API_ORIGIN}/api/razorpay/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (e) {
    throw new Error("Couldn't reach DASHIT. Check your connection and try again.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error || "The payment couldn't be started. Please try again.");
    err.status = res.status;
    throw err;
  }
  return data;
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/** Asks Razorpay (through the server) whether this order was paid. */
async function checkPaid(razorpayOrderId) {
  for (let i = 0; i < 4; i += 1) {
    try {
      const status = await post("payment-status.php", { razorpay_order_id: razorpayOrderId });
      if (status?.paid) {
        return {
          razorpayOrderId,
          razorpayPaymentId: status.razorpay_payment_id,
          amountPaidPaise: status.amount_paid,
        };
      }
      if (status && status.paid === false) return null;
    } catch (e) {}
    await wait(1500 * (i + 1));
  }
  return null;
}

/**
 * Takes the payment. Resolves { razorpayOrderId, razorpayPaymentId, amountPaidPaise }
 * once the server has confirmed it; rejects with `cancelled: true` when the
 * shopper closes the window without paying.
 */
export async function payOnline({ amountRupees, receipt, customer }) {
  const paise = Math.round(Number(amountRupees) * 100);
  const [, created] = await Promise.all([
    loadScript(),
    post("create-order.php", { amount: paise, receipt, id_token: await idToken() }),
  ]);

  return new Promise((resolve, reject) => {
    let settled = false;
    const done = (fn, value) => {
      if (settled) return;
      settled = true;
      fn(value);
    };

    const rzp = new window.Razorpay({
      key: created.key_id,
      order_id: created.order_id,
      amount: created.amount,
      currency: created.currency || "INR",
      name: "DASHIT",
      description: `Order ${receipt}`,
      image: "https://dashit.co.in/dashit-mark-white.png",
      prefill: {
        name: customer?.name || "",
        email: customer?.email || "",
        contact: customer?.mobile ? `+91${customer.mobile}` : "",
      },
      notes: { dashit_order: receipt },
      theme: { color: "#FF5B00" },
      handler: async (resp) => {
        try {
          await post("verify-payment.php", {
            razorpay_order_id: resp.razorpay_order_id,
            razorpay_payment_id: resp.razorpay_payment_id,
            razorpay_signature: resp.razorpay_signature,
          });
          done(resolve, {
            razorpayOrderId: resp.razorpay_order_id,
            razorpayPaymentId: resp.razorpay_payment_id,
            amountPaidPaise: created.amount,
          });
        } catch (e) {
          // The payment may still have gone through: ask Razorpay directly.
          const paid = await checkPaid(created.order_id);
          if (paid) done(resolve, paid);
          else done(reject, new Error("We couldn't confirm the payment. If money left your account, it is refunded automatically."));
        }
      },
      modal: {
        confirm_close: true,
        ondismiss: async () => {
          // Closed after paying in a UPI app, before the answer came back.
          const paid = await checkPaid(created.order_id);
          if (paid) done(resolve, paid);
          else {
            const err = new Error("Payment cancelled.");
            err.cancelled = true;
            done(reject, err);
          }
        },
      },
    });
    rzp.on("payment.failed", (resp) => {
      // Razorpay keeps its window open so the shopper can try another way.
      console.warn("Razorpay payment failed:", resp?.error?.description);
    });
    rzp.open();
  });
}
