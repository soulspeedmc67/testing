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

/* Whole rupees that may be below 0: what a customer has spent, less any money an
   admin added to their wallet, is below 0 until that money starts to be used. */
const signedRupees = (value) => {
  const n = Math.floor(Number(value));
  return Number.isFinite(n) ? n : 0;
};

/**
 * What is left in the wallet: the welcome credit, plus any money an admin added,
 * minus what has been spent. `spent` is `used - bonus` from the customer's wallet
 * document (see `fetchWalletUsed`), which is why it can be below 0.
 */
export function walletBalance(rules, spent) {
  return Math.max(0, wholeRupees(rules?.walletWelcomeAmount) - signedRupees(spent));
}

/**
 * How much of the wallet this order uses: all it can, up to the shop's
 * per-order limit, taken off the whole bill (items, delivery and handling).
 * It never takes the bill below ₹1, so an order is never free.
 */
export function walletToUse(rules, spent, payable) {
  // A per-order limit of 0 means there is none.
  const cap = wholeRupees(rules?.walletMaxPerOrder) || Infinity;
  return Math.min(walletBalance(rules, spent), cap, Math.max(0, wholeRupees(payable) - 1));
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
    return saved && saved.uid === uid ? signedRupees(saved.used) : 0;
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
    // What was spent, less any money an admin added: below 0 while that money is unspent.
    const used = snap.exists() ? signedRupees(snap.data().used) - wholeRupees(snap.data().bonus) : 0;
    lastRead = { uid: user.uid, at: Date.now(), used };
    try {
      localStorage.setItem(USED_CACHE_KEY, JSON.stringify({ uid: user.uid, used }));
    } catch (e) {}
    return used;
  } catch (e) {
    return null;
  }
}

/* ---- Money an admin adds ------------------------------------------------
   One listener on the customer's own wallet document, shared by the whole page: it keeps
   the balance current the moment the shop adds money, and tells the screen when `bonus`
   goes UP (and only then: spending, refunds and cancelled orders don't count) so it can
   celebrate. The last bonus seen is kept in this browser; with none kept, the first
   look only records it, so an old addition isn't celebrated again on a new device. */
const creditListeners = new Set();
let watchStarting = null;
let watchAuthUnsub = null;
let watchDocUnsub = null;

/** The rupees just added, given the bonus last seen (null when never seen) and the bonus now: 0 unless it went up. */
export function bonusAdded(lastSeen, bonus) {
  if (lastSeen === null || lastSeen === undefined) return 0;
  const before = Math.floor(Number(lastSeen));
  return Number.isFinite(before) && bonus > before ? bonus - before : 0;
}

function bonusIncrease(uid, bonus) {
  const key = `dashit_wallet_bonus_seen_${uid}`;
  try {
    const raw = localStorage.getItem(key);
    localStorage.setItem(key, String(bonus));
    return bonusAdded(raw, bonus);
  } catch (e) {
    return 0;
  }
}

async function startWalletWatch() {
  if (watchAuthUnsub || watchStarting) return;
  watchStarting = (async () => {
    try {
      const [{ isFirebaseConfigured, getDb, getFirebaseAuth }, { doc, onSnapshot }, { onAuthStateChanged }] = await Promise.all([
        import("./firebase"),
        import("firebase/firestore"),
        import("firebase/auth"),
      ]);
      if (!isFirebaseConfigured) return;
      const auth = getFirebaseAuth();
      if (!auth) return;
      watchAuthUnsub = onAuthStateChanged(auth, (user) => {
        if (watchDocUnsub) watchDocUnsub();
        watchDocUnsub = null;
        if (!user || user.isAnonymous) return;
        watchDocUnsub = onSnapshot(
          doc(getDb(), "wallets", user.uid),
          (snap) => {
            const data = snap.exists() ? snap.data() : {};
            const bonus = wholeRupees(data.bonus);
            const net = signedRupees(data.used) - bonus;
            lastRead = { uid: user.uid, at: Date.now(), used: net };
            try {
              localStorage.setItem(USED_CACHE_KEY, JSON.stringify({ uid: user.uid, used: net }));
            } catch (e) {}
            window.dispatchEvent(new Event("dashit_wallet_synced"));
            const added = bonusIncrease(user.uid, bonus);
            // Both header buttons on a page listen; only one of them celebrates.
            if (added > 0) {
              const [first] = creditListeners;
              if (first) first(added);
            }
          },
          () => {}
        );
      });
    } catch (e) {
      // Without it the balance still updates when the app reads the wallet.
    } finally {
      watchStarting = null;
    }
  })();
}

function stopWalletWatch() {
  if (watchDocUnsub) watchDocUnsub();
  if (watchAuthUnsub) watchAuthUnsub();
  watchDocUnsub = null;
  watchAuthUnsub = null;
}

/** Calls `onCredit(rupees)` each time the shop adds money to this customer's wallet. Returns the stop function. */
export function watchWalletCredit(onCredit) {
  creditListeners.add(onCredit);
  startWalletWatch();
  return () => {
    creditListeners.delete(onCredit);
    if (creditListeners.size === 0) stopWalletWatch();
  };
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
    // The wallet listener (above) keeps the balance current the moment the shop adds money.
    const synced = () => {
      if (alive && lastRead.uid) setUsed(lastRead.used);
    };
    window.addEventListener("dashit_wallet_synced", synced);
    return () => {
      alive = false;
      events.forEach((name) => window.removeEventListener(name, load));
      window.removeEventListener("dashit_wallet_synced", synced);
    };
  }, []);

  return used;
}
