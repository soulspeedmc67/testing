import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  ArrowLeft,
  Plus,
  Minus,
  MapPin,
  Tag,
  ChevronRight,
  X,
  Smartphone,
  Banknote,
  CheckCircle2,
  Circle,
  Users,
  ShoppingBag,
  AlertTriangle,
  Clock,
} from "lucide-react";
import SEO from "../components/SEO";
import ProductImage from "../components/ProductImage";
import ProductCard from "../components/ProductCard";
import LocationPickerModal from "../components/LocationPickerModal";
import CheckoutLoginModal from "../components/CheckoutLoginModal";
import OrderProcessingModal from "../components/OrderProcessingModal";
import OrderingForSomeoneElseModal from "../components/OrderingForSomeoneElseModal";
import CouponsDrawer from "../components/CouponsDrawer";
import FreeDeliveryProgress, { calculateDeliveryCharges, HANDLING_FEE, FREE_DELIVERY_THRESHOLD, DELIVERY_FEE } from "../components/FreeDeliveryProgress";
import { hapticOrderPlaced, hapticMedium, hapticLight } from "../lib/haptics";
import { submitOrder } from "../lib/api";
import { newOrderCode } from "../lib/db";
import { showOrderPlacedNotification } from "../lib/notifications";
import { useStoreDetails } from "../lib/storeStatus";
import { calculateDeliveryEta } from "../lib/deliveryEta";
import { browseable } from "../lib/tobacco";
import { watchShopProducts, isSoldOut } from "../lib/catalogueFile";
import { payOnline } from "../lib/razorpayWeb";
import { hasLiveSession, finishRedirectSignIn, readShopper } from "../lib/shopperAuth";
import { isBeforeLaunch, LAUNCH_LABEL } from "../lib/launch";
import { getStaffRole } from "../lib/auth";

// Suggestions come from the everyday aisles only, never the unsorted shelf.
const EVERYDAY_AISLES = new Set([
  "Dairy", "Bakery", "Vegetables", "Fruits", "Snacks", "Chips", "Biscuits", "Beverages", "Staples",
  "Instant Food", "Sweets & Chocolates", "Ice Cream", "Dry Fruits", "Sauces & Spreads",
]);

const PAYMENTS = [
  { id: "online", title: "Pay online", detail: "UPI, cards, net banking, wallets", icon: Smartphone },
  { id: "cod", title: "Cash on delivery", detail: "Cash or UPI to the rider", icon: Banknote },
];

const mixKey = (id) => {
  let h = 0;
  for (const ch of String(id)) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return h;
};

const price = (val) => {
  const n = typeof val === "number" ? val : parseFloat(String(val || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const rupees = (n) => `₹${Number.isInteger(n) ? n : n.toFixed(2)}`;

/** More than the shop has of it (or none at all). */
function shortOf(item) {
  if (isSoldOut(item)) return true;
  const left = Number(item.stock);
  return item.stock !== undefined && item.stock !== null && Number.isFinite(left) && left < (Number(item.qty) || 1);
}

function readJson(key, fallback) {
  try {
    const v = JSON.parse(localStorage.getItem(key) || "null");
    return v ?? fallback;
  } catch (e) {
    return fallback;
  }
}

function Card({ children, className = "" }) {
  return (
    <section className={`rounded-2xl bg-white border border-slate-200/80 dark:bg-surface-raised dark:border-line ${className}`}>
      {children}
    </section>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { isOpen: isStoreOpen, closeReason } = useStoreDetails();
  const [cartItems, setCartItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [liveProducts, setLiveProducts] = useState([]);
  const [location, setLocation] = useState(null);
  const [method, setMethod] = useState("cod");
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [receiverDetails, setReceiverDetails] = useState(null);
  const [shopper, setShopper] = useState(null);
  const [launchGate, setLaunchGate] = useState(false);
  /* Admin accounts can place real orders before launch, to test the whole
     flow (Razorpay is in test mode until the live keys go in). Customers
     still wait for LAUNCH_AT. */
  const [earlyAccess, setEarlyAccess] = useState(false);
  const earlyRef = useRef(false);
  const beforeLaunch = launchGate && !earlyAccess;
  const isLaunchBlocked = () => isBeforeLaunch() && !earlyRef.current;
  const [resumeUser, setResumeUser] = useState(null);

  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isLocationOpen, setIsLocationOpen] = useState(false);
  const [isCouponsOpen, setIsCouponsOpen] = useState(false);
  const [isReceiverOpen, setIsReceiverOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [processedOrder, setProcessedOrder] = useState(null);
  /* `isProcessing` only disables the button on the next render; a ref closes
     that gap synchronously, since placing an order twice charges twice. */
  const placingRef = useRef(false);

  // ---- Loading -------------------------------------------------------------

  useEffect(() => {
    setCartItems(readJson("dashit_cart", []).filter((i) => i && (Number(i.qty) || 0) > 0));
    setLocation(readJson("dashit_user_address", null));
    setShopper(readShopper());
    setLoaded(true);

    const syncCart = () => setCartItems(readJson("dashit_cart", []));
    const syncUser = () => setShopper(readShopper());
    const syncAddress = (e) => setLocation(e?.detail || readJson("dashit_user_address", null));
    window.addEventListener("dashit_cart_updated", syncCart);
    window.addEventListener("dashit_user_updated", syncUser);
    window.addEventListener("dashit_address_updated", syncAddress);
    window.addEventListener("storage", syncCart);
    return () => {
      window.removeEventListener("dashit_cart_updated", syncCart);
      window.removeEventListener("dashit_user_updated", syncUser);
      window.removeEventListener("dashit_address_updated", syncAddress);
      window.removeEventListener("storage", syncCart);
    };
  }, []);

  useEffect(() => {
    setLaunchGate(isBeforeLaunch());
    const timer = setInterval(() => setLaunchGate(isBeforeLaunch()), 30 * 1000);
    return () => clearInterval(timer);
  }, []);

  // One read of the shopper's own staff record, only before launch.
  useEffect(() => {
    if (!launchGate || !shopper?.uid) return;
    let alive = true;
    getStaffRole(shopper.uid).then((role) => {
      if (!alive) return;
      earlyRef.current = role === "admin";
      setEarlyAccess(role === "admin");
    });
    return () => {
      alive = false;
    };
  }, [launchGate, shopper?.uid]);

  // Back from Google's own sign-in page (pop-up blocked): carry on to the number.
  useEffect(() => {
    finishRedirectSignIn().then((res) => {
      if (res?.user) {
        setResumeUser(res.user);
        setIsLoginOpen(true);
      }
    });
  }, []);

  // Today's prices and stock, from the catalogue file (no Firestore reads).
  useEffect(() => watchShopProducts(setLiveProducts), []);

  const saveCart = (next) => {
    setCartItems(next);
    try {
      localStorage.setItem("dashit_cart", JSON.stringify(next));
      window.dispatchEvent(new Event("dashit_cart_updated"));
    } catch (e) {}
  };

  /* A cart can be days old: prices, stock and switched-off items are brought
     up to date from the catalogue, so the order is placed at today's prices. */
  useEffect(() => {
    if (liveProducts.length === 0 || cartItems.length === 0) return;
    const byId = new Map(liveProducts.map((p) => [String(p.id), p]));
    let changed = false;
    const next = [];
    for (const item of cartItems) {
      const live = byId.get(String(item.id || item.barcode));
      if (!live) {
        changed = true;
        continue;
      }
      const updated = {
        ...item,
        name: live.name || item.name,
        price: live.price,
        originalPrice: live.originalPrice ?? null,
        stock: live.stock,
        inStock: live.inStock,
        img: live.img || item.img,
        unit: live.unit || item.unit,
      };
      if (updated.price !== item.price || updated.stock !== item.stock || updated.originalPrice !== item.originalPrice) changed = true;
      next.push(updated);
    }
    if (changed) saveCart(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveProducts]);

  // ---- Money ---------------------------------------------------------------

  const itemCount = cartItems.reduce((s, i) => s + (Number(i.qty) || 0), 0);
  const subtotal = cartItems.reduce((s, i) => s + price(i.price) * (Number(i.qty) || 0), 0);
  const mrpSavings = cartItems.reduce((s, i) => {
    const mrp = price(i.originalPrice || i.mrp);
    return s + (mrp > price(i.price) ? (mrp - price(i.price)) * (Number(i.qty) || 0) : 0);
  }, 0);

  /* The coupon is re-checked against the live subtotal on every render, so
     removing items after applying it can't keep a discount the cart no longer
     earns. */
  const coupon = appliedCoupon && subtotal >= (Number(appliedCoupon.minOrder) || 0) ? appliedCoupon : null;
  useEffect(() => {
    if (appliedCoupon && !coupon) setAppliedCoupon(null);
  }, [appliedCoupon, coupon]);

  const userOrdersCount = useMemo(() => {
    const history = readJson("dashit_orders_history", []);
    return Array.isArray(history) ? history.length : 0;
  }, [cartItems]);

  const deliveryCharges = useMemo(() => {
    return calculateDeliveryCharges(subtotal, userOrdersCount, coupon);
  }, [subtotal, userOrdersCount, coupon]);

  const deliveryFee = deliveryCharges.fee;
  const handlingFee = HANDLING_FEE;
  const couponDiscount = coupon ? Math.min(subtotal, Number(coupon.discount) || 0) : 0;
  const grandTotal = Math.max(0, subtotal + deliveryFee + handlingFee - couponDiscount);
  const toFreeDelivery = deliveryCharges.isFirstFivePromo ? 0 : Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);

  const eta = calculateDeliveryEta(location);
  const hasAddress = Boolean(location?.address && location?.lat && location?.lng);
  const shortItems = cartItems.filter(shortOf);
  const isSignedIn = Boolean(shopper?.mobile);

  // ---- Suggestions -----------------------------------------------------------

  const suggestions = useMemo(() => {
    const inCart = new Set(cartItems.map((i) => String(i.id || i.barcode)));
    const cats = new Set(cartItems.map((i) => i.cat).filter(Boolean));
    return browseable(liveProducts)
      .filter((p) => !inCart.has(String(p.id)) && !isSoldOut(p) && p.img && EVERYDAY_AISLES.has(String(p.cat || "")))
      .sort((a, b) => Number(!cats.has(a.cat)) - Number(!cats.has(b.cat)) || mixKey(a.id) - mixKey(b.id))
      .slice(0, 10);
  }, [cartItems, liveProducts]);

  // ---- Cart actions ----------------------------------------------------------

  const changeQty = (id, delta) => {
    const key = String(id);
    const current = cartItems.find((i) => String(i.id || i.barcode) === key);
    if (!current) return;
    if (delta < 0 && (Number(current.qty) || 0) <= 1) hapticMedium();
    else hapticLight();
    if (delta > 0 && current.stock != null && Number(current.qty) >= Number(current.stock)) return;
    saveCart(
      cartItems
        .map((i) => (String(i.id || i.barcode) === key ? { ...i, qty: Math.max(0, (Number(i.qty) || 0) + delta) } : i))
        .filter((i) => (Number(i.qty) || 0) > 0)
    );
  };

  const addSuggestion = (p) => {
    hapticLight();
    const key = String(p.id);
    if (cartItems.some((i) => String(i.id) === key)) changeQty(key, 1);
    else saveCart([...cartItems, { ...p, id: key, qty: 1 }]);
  };

  const qtyOf = (p) => cartItems.find((i) => String(i.id) === String(p.id))?.qty || 0;

  const clearCart = () => {
    if (window.confirm("Remove everything from your cart?")) saveCart([]);
  };

  const chooseLocation = (loc) => {
    setLocation(loc);
    try {
      localStorage.setItem("dashit_user_address", JSON.stringify(loc));
      localStorage.setItem("dashit_selected_location", JSON.stringify(loc));
      window.dispatchEvent(new CustomEvent("dashit_address_updated", { detail: loc }));
    } catch (e) {}
  };

  // ---- Placing the order -----------------------------------------------------

  const fail = (message) => {
    placingRef.current = false;
    setIsProcessing(false);
    if (message) alert(message);
  };

  const placeOrder = async (authenticatedUser) => {
    if (placingRef.current) return;
    if (isLaunchBlocked()) return alert(`We start taking orders on ${LAUNCH_LABEL}. Your cart is saved until then.`);
    if (!isStoreOpen) return alert(`The store is closed right now. ${closeReason || "Please check back shortly."}`);
    if (cartItems.length === 0) return;

    // The saved session must still have a Google sign-in behind it.
    const user = authenticatedUser || readShopper();
    if (!user?.mobile || !(await hasLiveSession())) {
      setIsLoginOpen(true);
      return;
    }
    /* No pin, no order: a missing pin used to default to the store's own
       position, which made the ETA and the 5 km check meaningless. */
    const orderLocation = location;
    if (!orderLocation?.address || !orderLocation.lat || !orderLocation.lng) {
      setIsLocationOpen(true);
      return;
    }
    const short = cartItems.find(shortOf);
    if (short) {
      return alert(
        isSoldOut(short)
          ? `${short.name} has just sold out. Please remove it to continue.`
          : `Only ${short.stock} of ${short.name} left. Please lower the quantity to continue.`
      );
    }
    const orderEta = calculateDeliveryEta(orderLocation);
    if (!orderEta.isDeliverable) {
      return alert("We don't deliver to this address yet. Please choose an address in Anantnag town.");
    }

    placingRef.current = true;
    setIsProcessing(true);
    hapticOrderPlaced();

    const code = newOrderCode();
    const order = {
      orderId: code,
      date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
      createdAt: new Date().toISOString(),
      items: cartItems,
      subtotal,
      deliveryFee,
      handlingFee,
      discount: couponDiscount,
      couponCode: coupon?.code || null,
      totalAmount: grandTotal,
      total: grandTotal,
      finalTotal: grandTotal,
      savings: mrpSavings + couponDiscount + (deliveryCharges.standardFee - deliveryFee),
      paymentMethod: "Cash on Delivery",
      location: orderLocation,
      etaMinutes: orderEta.etaMinutes,
      distanceKm: orderEta.distanceKm,
      otp: Math.floor(1000 + Math.random() * 9000),
      status: "Placed",
      customerName: user.name || "Customer",
      mobile: user.mobile,
      email: user.email || "",
      receiverContact: receiverDetails || null,
      platform: "web",
    };
    setProcessedOrder(order);

    const finish = async (payload) => {
      try {
        // A paid order is tried a few times: the money has already been taken.
        let res;
        for (let attempt = 0; ; attempt += 1) {
          try {
            res = await submitOrder(payload);
            break;
          } catch (writeErr) {
            if (!payload.razorpayOrderId || attempt >= 2) throw writeErr;
            await new Promise((r) => setTimeout(r, 2600));
          }
        }
        const confirmed = { ...payload, orderId: res?.orderId || code };
        setProcessedOrder(confirmed);
        placingRef.current = false;
        setIsProcessing(false);
        setShowProcessingModal(true);
        try {
          showOrderPlacedNotification(confirmed);
        } catch (e) {}
        const history = readJson("dashit_orders_history", []).filter((o) => o.orderId !== confirmed.orderId);
        localStorage.setItem("dashit_orders_history", JSON.stringify([confirmed, ...history].slice(0, 20)));
        localStorage.setItem("dashit_active_order", JSON.stringify(confirmed));
        localStorage.removeItem("dashit_cart");
        localStorage.removeItem("dashit_checkout_data");
        window.dispatchEvent(new Event("dashit_cart_updated"));
      } catch (err) {
        console.error("Order placement error:", err);
        setShowProcessingModal(false);
        fail(
          payload.razorpayOrderId
            ? `Your payment went through, but the order didn't reach the store. Please email support@dashit.co.in with payment reference ${payload.razorpayPaymentId || payload.razorpayOrderId}. If the order can't be placed, the money is refunded.`
            : err?.message || "We couldn't place the order. Please check your connection and try again."
        );
      }
    };

    if (method !== "online") {
      await finish(order);
      return;
    }
    // Paid online: the order goes in only once the server has confirmed the
    // payment (firestore.rules check payments/{razorpay order id}).
    try {
      const paid = await payOnline({ amountRupees: grandTotal, receipt: code, customer: user });
      await finish({
        ...order,
        paymentMethod: "Paid online",
        paymentStatus: "paid",
        razorpayOrderId: paid.razorpayOrderId,
        razorpayPaymentId: paid.razorpayPaymentId,
        amountPaid: (Number(paid.amountPaidPaise) || Math.round(grandTotal * 100)) / 100,
      });
    } catch (err) {
      fail(err?.cancelled ? "" : err?.message || "The payment didn't go through. Please try again.");
    }
  };

  // ---- The button ------------------------------------------------------------

  const blocked = beforeLaunch || !isStoreOpen || (hasAddress && !eta.isDeliverable) || shortItems.length > 0;
  const buttonLabel = isProcessing
    ? method === "online"
      ? "Waiting for payment…"
      : "Placing your order…"
    : beforeLaunch
    ? "Orders open 5 Oct, 10 am"
    : !isStoreOpen
    ? "Store closed right now"
    : shortItems.length > 0
    ? "Remove sold-out items"
    : !isSignedIn
    ? "Sign in to place order"
    : !hasAddress
    ? "Add delivery address"
    : !eta.isDeliverable
    ? "Outside our delivery area"
    : method === "online"
    ? `Pay ${rupees(grandTotal)}`
    : "Place order";

  const placeButton = (className) => (
    <button
      type="button"
      onClick={() => placeOrder()}
      disabled={isProcessing || blocked}
      className={`h-12 rounded-xl px-5 text-[15px] font-bold transition-colors items-center justify-center gap-2 ${
        blocked
          ? "bg-slate-200 text-slate-600 cursor-not-allowed dark:bg-white/10 dark:text-white/70"
          : "bg-[#FF5B00] hover:bg-[#E04E00] text-white active:scale-[0.99]"
      } ${className}`}
    >
      {isProcessing && <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />}
      {buttonLabel}
    </button>
  );

  // ---- Render ----------------------------------------------------------------

  if (loaded && cartItems.length === 0 && !showProcessingModal) {
    return (
      <div className="min-h-screen bg-[#F6F5F1] dark:bg-surface flex flex-col items-center justify-center px-6 text-center">
        <SEO title="Your cart" noindex={true} />
        <span className="w-16 h-16 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-[#061838] dark:bg-surface-raised dark:border-line dark:text-content">
          <ShoppingBag className="w-7 h-7" />
        </span>
        <h1 className="mt-5 text-[20px] font-bold text-[#061838] dark:text-content">Your cart is empty</h1>
        <p className="mt-1.5 text-[14.5px] text-slate-600 dark:text-content-muted">Add a few things from the shop and they&apos;ll show up here.</p>
        <Link href="/shop" className="mt-6 h-11 px-6 rounded-xl bg-[#FF5B00] hover:bg-[#E04E00] text-white text-[15px] font-bold flex items-center">
          Go to the shop
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F5F1] text-slate-900 pb-28 lg:pb-12 dark:bg-surface dark:text-content">
      <SEO title="Your cart" noindex={true} />

      <header className="sticky top-0 z-40 bg-[#F6F5F1]/90 backdrop-blur-md border-b border-slate-200/70 pt-[env(safe-area-inset-top,0px)] dark:bg-surface/90 dark:border-line">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/shop")}
            aria-label="Back to the shop"
            className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center text-[#061838] hover:bg-black/5 dark:text-content dark:hover:bg-white/10"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[17px] font-bold tracking-tight text-[#061838] dark:text-content">Your cart</h1>
          <span className="text-[13px] text-slate-500 dark:text-content-muted">
            · {itemCount} item{itemCount === 1 ? "" : "s"}
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-5 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-5 items-start">
        {/* Left: what's in the cart */}
        <div className="space-y-5 min-w-0">
          {launchGate && earlyAccess && (
            <div className="rounded-2xl border border-[#FF5B00]/40 bg-white px-4 py-3 flex items-start gap-3 dark:bg-surface-raised">
              <Clock className="w-5 h-5 text-[#FF5B00] shrink-0 mt-0.5" />
              <p className="text-[14px] leading-snug text-slate-700 dark:text-content-secondary">
                <strong className="text-[#061838] dark:text-content">Test mode.</strong> You&apos;re signed in as an admin, so you can place orders before launch. Customers can&apos;t until {LAUNCH_LABEL}.
              </p>
            </div>
          )}
          {beforeLaunch && (
            <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 flex items-start gap-3 dark:bg-surface-raised dark:border-line">
              <Clock className="w-5 h-5 text-[#FF5B00] shrink-0 mt-0.5" />
              <p className="text-[14px] leading-snug text-slate-700 dark:text-content-secondary">
                We start taking orders on <strong className="text-[#061838] dark:text-content">{LAUNCH_LABEL}</strong>. Your cart stays saved on this device until then.
              </p>
            </div>
          )}

          <Card>
            <div className="px-4 sm:px-5 pt-4 pb-3 flex items-center justify-between">
              <div>
                <h2 className="text-[15px] font-bold text-[#061838] dark:text-content">Items</h2>
                <p className="text-[12.5px] text-slate-500 dark:text-content-muted">
                  {hasAddress && eta.isDeliverable ? `Delivery in about ${eta.etaMinutes} minutes` : "From our Anantnag store"}
                </p>
              </div>
              <button type="button" onClick={clearCart} className="text-[13px] font-semibold text-slate-500 hover:text-slate-900 dark:text-content-muted dark:hover:text-content">
                Clear cart
              </button>
            </div>

            <div className="px-4 sm:px-5 pb-3">
              <p className="text-[13px] font-medium text-slate-600 dark:text-content-secondary">
                {deliveryCharges.isFirstFivePromo ? (
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">
                    Free delivery on your first 5 orders (Order #{deliveryCharges.orderNumber} of 5)
                  </span>
                ) : toFreeDelivery > 0 ? (
                  <>
                    Add <strong className="text-[#061838] dark:text-content">{rupees(toFreeDelivery)}</strong> more for lowest ₹25 delivery
                  </>
                ) : (
                  <span className="text-emerald-700 dark:text-emerald-400 font-semibold">Lowest ₹25 delivery tier unlocked</span>
                )}
              </p>
              <div className="mt-2 h-1 rounded-full bg-slate-100 dark:bg-white/10 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-[width] duration-500 ${toFreeDelivery > 0 && !deliveryCharges.isFirstFivePromo ? "bg-[#FF5B00]" : "bg-emerald-500"}`}
                  style={{ width: `${deliveryCharges.isFirstFivePromo ? 100 : Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100)}%` }}
                />
              </div>
            </div>

            <ul className="divide-y divide-slate-100 dark:divide-line border-t border-slate-100 dark:border-line">
              {cartItems.map((item) => {
                const key = String(item.id || item.barcode);
                const qty = Number(item.qty) || 0;
                const unitPrice = price(item.price);
                const mrp = price(item.originalPrice || item.mrp);
                const problem = shortOf(item);
                return (
                  <li key={key} className="px-4 sm:px-5 py-3.5 flex items-center gap-3.5">
                    <div className="w-16 h-16 shrink-0">
                      <ProductImage src={item.img || item.image} name={item.name} className="rounded-xl border border-slate-100 dark:border-line" letterClassName="text-xl" />
                    </div>
                    <div className="min-w-0 grow">
                      <p className="text-[14px] font-semibold leading-snug text-slate-900 line-clamp-2 dark:text-content">{item.name}</p>
                      <p className="text-[12.5px] text-slate-500 dark:text-content-muted">
                        {item.unit ? `${item.unit} · ` : ""}
                        {rupees(unitPrice)} each
                      </p>
                      {problem && (
                        <p className="mt-0.5 text-[12.5px] font-semibold text-red-600 dark:text-red-400 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          {isSoldOut(item) ? "Sold out" : `Only ${item.stock} left`}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <div className="h-9 rounded-lg bg-[#061838] text-white flex items-center dark:bg-[#FF5B00]">
                        <button type="button" onClick={() => changeQty(key, -1)} aria-label={`One less ${item.name}`} className="w-9 h-9 flex items-center justify-center">
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-6 text-center text-[14px] font-bold tabular-nums">{qty}</span>
                        <button type="button" onClick={() => changeQty(key, 1)} aria-label={`One more ${item.name}`} className="w-9 h-9 flex items-center justify-center">
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                      <p className="text-[14px] font-bold tabular-nums text-slate-900 dark:text-content">
                        {mrp > unitPrice && <span className="mr-1.5 text-[12px] font-medium text-slate-400 line-through">{rupees(mrp * qty)}</span>}
                        {rupees(unitPrice * qty)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </Card>

          {suggestions.length > 0 && (
            <section>
              <h2 className="px-1 text-[15px] font-bold text-[#061838] dark:text-content">You might also need</h2>
              <div className="mt-3 -mx-4 px-4 lg:mx-0 lg:px-0 flex gap-3 overflow-x-auto scrollbar-none pb-1">
                {suggestions.map((p) => (
                  <div key={p.id} className="w-[148px] shrink-0">
                    <ProductCard
                      product={p}
                      qty={qtyOf(p)}
                      onAdd={() => addSuggestion(p)}
                      onUpdateQty={(id, d) => changeQty(id, d)}
                      onIncrement={() => changeQty(p.id, 1)}
                      onDecrement={() => changeQty(p.id, -1)}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Right: delivery, offer, bill, payment */}
        <div className="space-y-4 lg:sticky lg:top-20">
          <Card className="p-4">
            <div className="flex items-start gap-3">
              <span className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-[#061838] shrink-0 dark:bg-white/10 dark:text-content">
                <MapPin className="w-[18px] h-[18px]" />
              </span>
              <div className="min-w-0 grow">
                <p className="text-[13px] font-semibold text-slate-500 dark:text-content-muted">Deliver to</p>
                {hasAddress ? (
                  <>
                    <p className="text-[14px] font-semibold text-slate-900 line-clamp-2 dark:text-content">{location.address}</p>
                    {!eta.isDeliverable && <p className="mt-0.5 text-[12.5px] font-semibold text-red-600 dark:text-red-400">We don&apos;t deliver here yet</p>}
                  </>
                ) : (
                  <p className="text-[14px] font-semibold text-slate-900 dark:text-content">No address yet</p>
                )}
              </div>
              <button type="button" onClick={() => setIsLocationOpen(true)} className="shrink-0 text-[13.5px] font-bold text-[#FF5B00] hover:underline">
                {hasAddress ? "Change" : "Add"}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setIsReceiverOpen(true)}
              className="mt-3 pt-3 w-full border-t border-slate-100 flex items-center gap-2 text-[13px] font-semibold text-slate-600 hover:text-slate-900 dark:border-line dark:text-content-muted dark:hover:text-content"
            >
              <Users className="w-4 h-4" />
              <span className="truncate">{receiverDetails ? `For ${receiverDetails.name} (${receiverDetails.phone})` : "Ordering for someone else?"}</span>
            </button>
          </Card>

          <Card>
            <div className="flex items-center">
              <button type="button" onClick={() => setIsCouponsOpen(true)} className="grow min-w-0 px-4 py-3.5 flex items-center gap-3 text-left">
                <Tag className="w-[18px] h-[18px] text-[#FF5B00] shrink-0" />
                <span className="grow min-w-0">
                  {coupon ? (
                    <>
                      <span className="block text-[14px] font-semibold text-slate-900 dark:text-content">{coupon.code} applied</span>
                      <span className="block text-[12.5px] text-emerald-700 dark:text-emerald-400">
                        {couponDiscount > 0 ? `You save ${rupees(couponDiscount)}` : "Delivery is free"}
                      </span>
                    </>
                  ) : (
                    <span className="block text-[14px] font-semibold text-slate-900 dark:text-content">Apply an offer code</span>
                  )}
                </span>
                {!coupon && <ChevronRight className="w-4 h-4 text-slate-400" />}
              </button>
              {coupon && (
                <button
                  type="button"
                  aria-label="Remove offer code"
                  onClick={() => setAppliedCoupon(null)}
                  className="mr-3 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <h2 className="text-[15px] font-bold text-[#061838] dark:text-content">Bill details</h2>
            <dl className="mt-3 space-y-2.5 text-[14px]">
              <div className="flex justify-between">
                <dt className="text-slate-600 dark:text-content-secondary">Items ({itemCount})</dt>
                <dd className="tabular-nums font-semibold">{rupees(subtotal)}</dd>
              </div>

              {/* Delivery Fee */}
              <div className="flex justify-between items-start">
                <div>
                  <dt className="text-slate-600 dark:text-content-secondary">Delivery fee</dt>
                  {deliveryCharges.isFirstFivePromo ? (
                    <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 block">
                      Free on first 5 orders (Order #{deliveryCharges.orderNumber} of 5)
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400 dark:text-content-faint block">
                      {deliveryCharges.tierLabel}
                    </span>
                  )}
                </div>
                <dd className="tabular-nums text-right">
                  {deliveryFee === 0 ? (
                    <span className="flex items-center space-x-1.5 justify-end">
                      {deliveryCharges.standardFee > 0 && (
                        <span className="line-through text-slate-400 text-xs font-normal">
                          {rupees(deliveryCharges.standardFee)}
                        </span>
                      )}
                      <span className="text-emerald-700 dark:text-emerald-400 font-bold">Free</span>
                    </span>
                  ) : (
                    <span className="font-semibold">{rupees(deliveryFee)}</span>
                  )}
                </dd>
              </div>

              {/* Handling Fee */}
              <div className="flex justify-between items-start">
                <div>
                  <dt className="text-slate-600 dark:text-content-secondary">Handling fee</dt>
                  <span className="text-[11px] text-slate-400 dark:text-content-faint block">
                    Fixed fee on every order
                  </span>
                </div>
                <dd className="tabular-nums font-semibold">{rupees(handlingFee)}</dd>
              </div>

              {couponDiscount > 0 && (
                <div className="flex justify-between">
                  <dt className="text-slate-600 dark:text-content-secondary">Offer {coupon.code}</dt>
                  <dd className="tabular-nums text-emerald-700 dark:text-emerald-400 font-semibold">−{rupees(couponDiscount)}</dd>
                </div>
              )}

              <FreeDeliveryProgress subtotal={subtotal} orderCount={userOrdersCount} />

              <div className="pt-2.5 mt-1 border-t border-slate-100 dark:border-line flex justify-between text-[16px] font-bold text-[#061838] dark:text-content">
                <dt>To pay</dt>
                <dd className="tabular-nums">{rupees(grandTotal)}</dd>
              </div>
            </dl>
            {mrpSavings + couponDiscount + (deliveryCharges.standardFee - deliveryFee) > 0 && (
              <p className="mt-3 text-[12px] font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 p-2.5 rounded-xl border border-emerald-200/60 dark:border-emerald-900/40">
                You save {rupees(mrpSavings + couponDiscount + (deliveryCharges.standardFee - deliveryFee))} on this order
              </p>
            )}
          </Card>

          <Card className="p-4">
            <h2 className="text-[15px] font-bold text-[#061838] dark:text-content">Payment</h2>
            <div className="mt-3 space-y-2" role="radiogroup" aria-label="Payment method">
              {PAYMENTS.map((p) => {
                const Icon = p.icon;
                const active = method === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => {
                      hapticLight();
                      setMethod(p.id);
                    }}
                    className={`w-full flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-colors ${
                      active ? "border-[#FF5B00] bg-[#FF5B00]/[0.05]" : "border-slate-200 hover:border-slate-300 dark:border-line dark:hover:border-line-strong"
                    }`}
                  >
                    <Icon className="w-5 h-5 text-[#061838] shrink-0 dark:text-content" />
                    <span className="grow min-w-0">
                      <span className="block text-[14px] font-semibold text-slate-900 dark:text-content">{p.title}</span>
                      <span className="block text-[12.5px] text-slate-500 dark:text-content-muted">{p.detail}</span>
                    </span>
                    {active ? <CheckCircle2 className="w-5 h-5 text-[#FF5B00] shrink-0" /> : <Circle className="w-5 h-5 text-slate-300 shrink-0 dark:text-content-faint" />}
                  </button>
                );
              })}
            </div>

            {!isSignedIn && (
              <button type="button" onClick={() => setIsLoginOpen(true)} className="mt-3 w-full text-left text-[13px] text-slate-600 dark:text-content-muted">
                You&apos;ll sign in with Google before ordering. <span className="font-semibold text-[#FF5B00]">Sign in now</span>
              </button>
            )}

            {placeButton("hidden lg:flex w-full mt-4")}
          </Card>
        </div>
      </main>

      {/* Phones: total and the button, always in reach */}
      <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 pb-[env(safe-area-inset-bottom,0px)] dark:bg-surface-raised/95 dark:border-line">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="shrink-0">
            <p className="text-[17px] font-bold tabular-nums text-[#061838] dark:text-content">{rupees(grandTotal)}</p>
            <p className="text-[11.5px] text-slate-500 dark:text-content-muted">{method === "online" ? "Pay online" : "Cash on delivery"}</p>
          </div>
          {placeButton("flex grow")}
        </div>
      </div>

      <CheckoutLoginModal
        isOpen={isLoginOpen}
        resumeUser={resumeUser}
        onClose={() => setIsLoginOpen(false)}
        onAuthenticated={(user) => {
          setShopper(user);
          setIsLoginOpen(false);
          if (!isLaunchBlocked()) placeOrder(user);
        }}
      />
      <LocationPickerModal isOpen={isLocationOpen} onClose={() => setIsLocationOpen(false)} currentLocation={location} onSelectLocation={chooseLocation} />
      <OrderingForSomeoneElseModal isOpen={isReceiverOpen} onClose={() => setIsReceiverOpen(false)} onSaveReceiver={(details) => setReceiverDetails(details)} />
      <CouponsDrawer
        isOpen={isCouponsOpen}
        onClose={() => setIsCouponsOpen(false)}
        cartTotal={subtotal}
        appliedCoupon={appliedCoupon}
        onApplyCoupon={(c) => setAppliedCoupon(c)}
      />
      <OrderProcessingModal
        isOpen={showProcessingModal}
        orderDetails={processedOrder}
        onComplete={() => {
          setShowProcessingModal(false);
          const targetId = processedOrder?.id || processedOrder?.orderId;
          router.push(targetId ? `/track?id=${targetId}` : "/track");
        }}
      />
    </div>
  );
}
