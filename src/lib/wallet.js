/**
 * The wallet: a welcome credit every customer has, spent on their orders.
 *
 * Nothing is stored for the credit itself. The shop sets the amount on
 * `config/store` (`walletWelcomeAmount`, ₹50 unless changed, 0 ends it) and a
 * customer's balance is that amount minus `used` on their `wallets/{uid}`
 * document, which only exists once they have spent some. So every customer,
 * new or old, has the credit with no write, and changing the amount reaches
 * everyone at once. firestore.rules keep `used` from going down except when
 * an order that used the wallet is cancelled, which gives it back.
 *
 * The same rules are in `android-compose/.../data/Wallet.kt` and
 * `ios-swift/DASHit/Core/Utils/Wallet.swift`: keep the three in step.
 */
import { useEffect, useState } from "react";

const WELCOME_SEEN_KEY = "dashit_wallet_welcome_seen";
const USED_CACHE_KEY = "dashit_wallet_used";

const wholeRupees = (value) => {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) && n > 0 ? n : 0;
};

/** What is left in the wallet: the welcome credit minus what has been spent. */
export function walletBalance(rules, used) {
  return Math.max(0, wholeRupees(rules?.walletWelcomeAmount) - wholeRupees(used));
}

/**
 * How much of the wallet this order uses: all it can, up to the shop's
 * per-order limit and never more than the order costs.
 */
export function walletToUse(rules, used, payable) {
  return Math.min(walletBalance(rules, used), wholeRupees(rules?.walletMaxPerOrder), wholeRupees(payable));
}

export function walletWelcomeSeen() {
  try {
    return localStorage.getItem(WELCOME_SEEN_KEY) === "1";
  } catch (e) {
    return true;
  }
}

export function markWalletWelcomeSeen() {
  try {
    localStorage.setItem(WELCOME_SEEN_KEY, "1");
  } catch (e) {}
}

function cachedUsed(uid) {
  try {
    const saved = JSON.parse(localStorage.getItem(USED_CACHE_KEY) || "null");
    return saved && saved.uid === uid ? wholeRupees(saved.used) : 0;
  } catch (e) {
    return 0;
  }
}

/**
 * The signed-in customer's `used`, read from the server: a number, or null
 * when nobody is signed in or the read failed. Saves what it read.
 */
let lastRead = { uid: null, at: 0, used: 0 };
const READ_AGAIN_AFTER_MS = 5 * 60 * 1000;

export async function fetchWalletUsed({ force = false } = {}) {
  try {
    const [{ isFirebaseConfigured, getDb, getFirebaseAuth }, { doc, getDoc }] = await Promise.all([
      import("./firebase"),
      import("firebase/firestore"),
    ]);
    if (!isFirebaseConfigured) return null;
    const auth = getFirebaseAuth();
    if (auth && typeof auth.authStateReady === "function") await auth.authStateReady();
    const user = auth?.currentUser;
    if (!user || user.isAnonymous) return null;
    // Pages share one read for a few minutes; placing or cancelling an order forces a new one.
    if (!force && lastRead.uid === user.uid && Date.now() - lastRead.at < READ_AGAIN_AFTER_MS) return lastRead.used;
    const snap = await getDoc(doc(getDb(), "wallets", user.uid));
    const used = snap.exists() ? wholeRupees(snap.data().used) : 0;
    lastRead = { uid: user.uid, at: Date.now(), used };
    try {
      localStorage.setItem(USED_CACHE_KEY, JSON.stringify({ uid: user.uid, used }));
    } catch (e) {}
    return used;
  } catch (e) {
    return null;
  }
}

/**
 * The customer's `used`, read once (not a listener) and again whenever an
 * order is placed or cancelled. Signed out, or before the read lands, it is
 * what this browser last saw, else 0: the full credit.
 */
export function useWalletUsed() {
  const [used, setUsed] = useState(0);

  useEffect(() => {
    let alive = true;
    const load = async (event) => {
      const force = Boolean(event && event.type);
      try {
        const auth = (await import("./firebase")).getFirebaseAuth();
        const uid = auth?.currentUser?.uid;
        if (uid && alive) setUsed(cachedUsed(uid));
      } catch (e) {}
      const next = await fetchWalletUsed({ force });
      if (alive && next !== null) setUsed(next);
    };
    load();
    const events = ["dashit_orders_updated", "dashit_user_updated", "dashit_wallet_changed"];
    events.forEach((name) => window.addEventListener(name, load));
    return () => {
      alive = false;
      events.forEach((name) => window.removeEventListener(name, load));
    };
  }, []);

  return used;
}
