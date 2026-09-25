import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import SEO from "../components/SEO";
import { 
  ArrowLeft, 
  Search, 
  Share2, 
  Clock, 
  CheckCircle2, 
  ChevronRight, 
  ChevronUp, 
  ShieldCheck, 
  Plus, 
  Minus, 
  ShoppingBag, 
  Users, 
  Tag, 
  UserCheck, 
  Trash2, 
  AlertTriangle, 
  LogIn, 
  ArrowRight,
  Home,
  Briefcase,
  Building2,
  Star,
  X,
  Zap
} from "lucide-react";
import confetti from "canvas-confetti";
import PaymentMethodModal from "../components/PaymentMethodModal";
import LocationPickerModal from "../components/LocationPickerModal";
import CheckoutLoginModal from "../components/CheckoutLoginModal";
import OrderProcessingModal from "../components/OrderProcessingModal";
import OrderingForSomeoneElseModal from "../components/OrderingForSomeoneElseModal";
import CouponsDrawer from "../components/CouponsDrawer";
import FreeDeliveryCelebrationModal from "../components/FreeDeliveryCelebrationModal";
import MinOrderValueModal from "../components/MinOrderValueModal";
import { hapticOrderPlaced, hapticMedium, hapticLight } from "../lib/haptics";
import { submitOrder } from "../lib/api";
import { newOrderCode } from "../lib/db";
import { showOrderPlacedNotification } from "../lib/notifications";
import { addToWishlist } from "../lib/wishlist";
import { useStoreDetails } from "../lib/storeStatus";
import { calculateDeliveryEta } from "../lib/deliveryEta";
import { ALL_PRODUCTS } from "../data/products";

const FREE_DELIVERY_THRESHOLD = 299;

const parsePrice = (val) => {
  if (typeof val === "number") return val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^0-9.]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

export default function CheckoutPage() {
  const router = useRouter();
  const { isOpen: isStoreOpen, closeReason } = useStoreDetails();
  const [checkoutData, setCheckoutData] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState({ id: "cod", label: "Cash on Delivery (COD)" });
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isMinOrderModalOpen, setIsMinOrderModalOpen] = useState(false);
  const [isOrderingForSomeoneElseOpen, setIsOrderingForSomeoneElseOpen] = useState(false);
  const [receiverDetails, setReceiverDetails] = useState(null);
  const [isCouponsOpen, setIsCouponsOpen] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [isFreeDeliveryModalOpen, setIsFreeDeliveryModalOpen] = useState(false);
  const [hasShownFreeDelivery, setHasShownFreeDelivery] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  /* `isProcessing` only disables the button on the next render, which leaves a
     frame in which a second tap — or the login modal's callback racing the
     button — can start a second order. A ref closes that window synchronously:
     placing an order twice charges the customer twice. */
  const placingRef = useRef(false);
  const [showProcessingModal, setShowProcessingModal] = useState(false);
  const [processedOrder, setProcessedOrder] = useState(null);
  const [cartItems, setCartItems] = useState([]);
  const [isClosing, setIsClosing] = useState(false);
  const [isUserLoggedIn, setIsUserLoggedIn] = useState(false);

  // Dynamic smart recommendations based on cart items
  const { pairsWell, popularAdditions } = useMemo(() => {
    const cartIds = new Set(cartItems.map((i) => String(i.id || i.barcode)));
    const cartCats = new Set(cartItems.map((i) => i.cat).filter(Boolean));
    const cartNames = cartItems.map((i) => (i.name || "").toLowerCase()).join(" ");

    const targetCats = new Set();
    if (cartCats.has("Dairy") || cartNames.includes("milk") || cartNames.includes("curd") || cartNames.includes("butter")) {
      targetCats.add("Bakery");
      targetCats.add("Snacks");
    }
    if (cartCats.has("Bakery") || cartNames.includes("bread") || cartNames.includes("lavas")) {
      targetCats.add("Dairy");
      targetCats.add("Snacks");
    }
    if (cartCats.has("Snacks") || cartNames.includes("chips") || cartNames.includes("kurkure")) {
      targetCats.add("Drinks");
      targetCats.add("Dairy");
    }
    if (cartCats.has("Drinks") || cartNames.includes("coke") || cartNames.includes("red bull")) {
      targetCats.add("Snacks");
      targetCats.add("Bakery");
    }
    if (cartCats.has("Grocery") || cartNames.includes("noodle") || cartNames.includes("maggi") || cartNames.includes("rice") || cartNames.includes("apple")) {
      targetCats.add("Dairy");
      targetCats.add("Bakery");
      targetCats.add("Snacks");
      targetCats.add("Drinks");
    }

    const available = ALL_PRODUCTS.filter((p) => !cartIds.has(String(p.id || p.barcode)));
    const complementary = available.filter((p) => targetCats.has(p.cat));
    const popularStaples = available.filter((p) => !targetCats.has(p.cat));

    const pairs = complementary.length >= 4 
      ? complementary 
      : [...complementary, ...popularStaples];
    const pairsSlice = pairs.slice(0, 8);
    const pairsIds = new Set(pairsSlice.map((p) => String(p.id || p.barcode)));

    const popular = available.filter((p) => !pairsIds.has(String(p.id || p.barcode)));

    return {
      pairsWell: pairsSlice,
      popularAdditions: popular.length > 0 ? popular.slice(0, 10) : available.slice(0, 8),
    };
  }, [cartItems]);

  // Sync login status
  useEffect(() => {
    const checkAuth = () => {
      try {
        const u = localStorage.getItem("dashit_user");
        if (u) {
          const parsed = JSON.parse(u);
          setIsUserLoggedIn(Boolean(parsed && parsed.isLoggedIn && parsed.mobile));
        } else {
          setIsUserLoggedIn(false);
        }
      } catch (e) {
        setIsUserLoggedIn(false);
      }
    };
    checkAuth();
    window.addEventListener("dashit_user_updated", checkAuth);
    window.addEventListener("storage", checkAuth);
    return () => {
      window.removeEventListener("dashit_user_updated", checkAuth);
      window.removeEventListener("storage", checkAuth);
    };
  }, []);

  const handleSmoothClose = () => {
    hapticLight();
    setIsClosing(true);
    setTimeout(() => {
      router.push("/shop");
    }, 220);
  };

  // 1. Initial Load: Read cart from master dashit_cart as single source of truth
  useEffect(() => {
    try {
      const savedAddress = (() => {
        try {
          const a = localStorage.getItem("dashit_user_address");
          return a ? JSON.parse(a) : null;
        } catch (e) {
          return null;
        }
      })();

      // Single source of truth: dashit_cart
      let activeCart = [];
      const savedCart = localStorage.getItem("dashit_cart");
      if (savedCart) {
        try {
          const parsed = JSON.parse(savedCart);
          if (Array.isArray(parsed)) activeCart = parsed;
        } catch (e) {}
      }

      // Fallback only if dashit_cart was never set
      if (activeCart.length === 0) {
        try {
          const savedCheckout = localStorage.getItem("dashit_checkout_data");
          if (savedCheckout) {
            const parsed = JSON.parse(savedCheckout);
            if (Array.isArray(parsed?.cart) && parsed.cart.length > 0) {
              activeCart = parsed.cart;
              localStorage.setItem("dashit_cart", JSON.stringify(activeCart));
            }
          }
        } catch (e) {}
      }

      setCartItems(activeCart);

      let loc = savedAddress;
      try {
        const savedCheckout = localStorage.getItem("dashit_checkout_data");
        if (savedCheckout) {
          const parsed = JSON.parse(savedCheckout);
          if (parsed?.location && (!loc || !loc.address)) {
            loc = parsed.location;
          }
        }
      } catch (e) {}

      const sub = activeCart.reduce(
        (s, i) => s + parsePrice(i.price) * (Number(i.qty) || 0),
        0
      );

      setCheckoutData({
        cart: activeCart,
        subtotal: sub,
        grandTotal: sub >= 299 ? sub : sub + 25,
        location: loc || {
          nickname: "Home",
          address: ""
        }
      });
    } catch (e) {}
  }, []);

  // 2. React to external cart changes from shop / drawers / background events
  useEffect(() => {
    const handleCartSync = () => {
      try {
        const raw = localStorage.getItem("dashit_cart");
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            setCartItems(parsed);
          }
        } else {
          setCartItems([]);
        }
      } catch (e) {}
    };

    window.addEventListener("dashit_cart_updated", handleCartSync);
    window.addEventListener("storage", handleCartSync);
    return () => {
      window.removeEventListener("dashit_cart_updated", handleCartSync);
      window.removeEventListener("storage", handleCartSync);
    };
  }, []);

  const subtotal = cartItems.reduce(
    (s, i) => s + parsePrice(i.price) * (Number(i.qty) || 0),
    0
  );

  /* A coupon is re-validated against the live subtotal on every render. It used
     to be validated only at the moment it was applied, so a customer could add
     items to clear the minimum, apply the coupon, then remove those items and
     still check out with the discount. */
  const isCouponValid =
    Boolean(appliedCoupon) && subtotal >= (Number(appliedCoupon?.minOrder) || 0);
  const effectiveCoupon = isCouponValid ? appliedCoupon : null;

  const deliveryFee =
    subtotal >= 299 || effectiveCoupon?.waivesDelivery || effectiveCoupon?.code === "FREEDEL"
      ? 0
      : 25;
  const couponDiscount = effectiveCoupon
    ? Math.min(subtotal, Number(effectiveCoupon.discount) || 0)
    : 0;
  const grandTotal = Math.max(0, subtotal + deliveryFee - couponDiscount);

  // Sync checkoutData and localStorage dashit_checkout_data with live calculations
  useEffect(() => {
    setCheckoutData((prev) => ({
      ...prev,
      cart: cartItems,
      subtotal,
      grandTotal,
      location: prev?.location || null,
    }));

    try {
      const coStr = localStorage.getItem("dashit_checkout_data");
      const co = coStr ? JSON.parse(coStr) : {};
      localStorage.setItem(
        "dashit_checkout_data",
        JSON.stringify({
          ...co,
          cart: cartItems,
          subtotal,
          grandTotal,
          deliveryFee,
          discount: couponDiscount,
        })
      );
    } catch (e) {}
  }, [cartItems, subtotal, grandTotal, deliveryFee, couponDiscount]);

  // Drop a coupon that the cart no longer qualifies for, so the UI stops
  // showing it as applied.
  useEffect(() => {
    if (appliedCoupon && !isCouponValid) setAppliedCoupon(null);
  }, [appliedCoupon, isCouponValid]);

  // Sync address if updated externally or via map
  useEffect(() => {
    const handleAddressUpdated = (e) => {
      try {
        const newLoc = e?.detail || JSON.parse(localStorage.getItem("dashit_user_address") || "null");
        if (newLoc) {
          setCheckoutData((prev) => ({ ...prev, location: newLoc }));
        }
      } catch (err) {}
    };
    window.addEventListener("dashit_address_updated", handleAddressUpdated);
    window.addEventListener("storage", handleAddressUpdated);
    return () => {
      window.removeEventListener("dashit_address_updated", handleAddressUpdated);
      window.removeEventListener("storage", handleAddressUpdated);
    };
  }, []);

  const checkoutEta = calculateDeliveryEta(checkoutData?.location);

  // Trigger Free Delivery Celebration when cart reaches ₹299 (Shown only once until order placed)
  useEffect(() => {
    try {
      const alreadyShown = localStorage.getItem("dashit_free_delivery_seen");
      if (subtotal >= 299 && !alreadyShown && !hasShownFreeDelivery) {
        setIsFreeDeliveryModalOpen(true);
        localStorage.setItem("dashit_free_delivery_seen", "true");
        setHasShownFreeDelivery(true);
      }
    } catch (e) {}
  }, [subtotal, hasShownFreeDelivery]);

  const handleAddToCart = (prod) => {
    hapticLight();
    const prodId = String(prod.id || prod.barcode);
    const existingIndex = cartItems.findIndex(
      (i) => String(i.id || i.barcode) === prodId
    );

    let updated;
    if (existingIndex > -1) {
      updated = cartItems.map((item, idx) =>
        idx === existingIndex
          ? { ...item, qty: (Number(item.qty) || 1) + 1 }
          : item
      );
    } else {
      const newItem = {
        ...prod,
        id: prod.id,
        price: parsePrice(prod.price),
        originalPrice: parsePrice(prod.originalPrice || prod.price),
        img: prod.img || prod.image || "",
        image: prod.img || prod.image || "",
        qty: 1,
      };
      updated = [...cartItems, newItem];
    }

    setCartItems(updated);
    try {
      localStorage.setItem("dashit_cart", JSON.stringify(updated));
      window.dispatchEvent(new Event("dashit_cart_updated"));
    } catch (e) {}
  };

  const updateItemQty = (id, delta) => {
    const idStr = String(id);
    if (delta > 0) {
      hapticLight();
    } else {
      const current = cartItems.find((i) => String(i.id || i.barcode) === idStr);
      if (current && (Number(current.qty) || 0) <= 1) {
        hapticMedium();
      } else {
        hapticLight();
      }
    }
    const updated = cartItems
      .map((item) =>
        String(item.id || item.barcode) === idStr
          ? { ...item, qty: Math.max(0, (Number(item.qty) || 0) + delta) }
          : item
      )
      .filter((item) => (Number(item.qty) || 0) > 0);

    setCartItems(updated);
    try {
      localStorage.setItem("dashit_cart", JSON.stringify(updated));
      window.dispatchEvent(new Event("dashit_cart_updated"));
    } catch (e) {}
    if (updated.length === 0) {
      router.push("/shop");
    }
  };

  const handleClearAllCart = () => {
    hapticMedium();
    setCartItems([]);
    try {
      localStorage.removeItem("dashit_cart");
      window.dispatchEvent(new Event("dashit_cart_updated"));
    } catch (e) {}
    router.push("/shop");
  };

  const handlePlaceOrder = () => {
    if (!isStoreOpen) {
      alert(`Store Reopening Schedule: ${closeReason || "Please check back shortly!"}`);
      return;
    }

    if (!cartItems || cartItems.length === 0) {
      alert("Your cart is empty! Please add items before placing an order.");
      return;
    }
    
    if (cartItems.length === 0 || isProcessing) return;

    // Login is strictly mandatory before placing an order
    let userObj = null;
    try {
      const u = localStorage.getItem("dashit_user");
      if (u) userObj = JSON.parse(u);
    } catch (e) {}

    const loggedIn = Boolean(userObj && userObj.isLoggedIn && userObj.mobile);
    if (!loggedIn) {
      try {
        localStorage.setItem(
          "dashit_checkout_data",
          JSON.stringify({
            cart: cartItems,
            subtotal,
            deliveryFee,
            handlingFee: 0,
            discount: couponDiscount,
            grandTotal,
            location: checkoutData?.location,
          })
        );
      } catch (e) {}
      setIsLoginModalOpen(true);
      return;
    }

    executeOrderPlacement();
  };

  const executeOrderPlacement = async (authenticatedUser) => {
    if (placingRef.current) return;

    placingRef.current = true;
    setIsProcessing(true);
    hapticOrderPlaced();

    const generatedCode = newOrderCode();
    let userObj = authenticatedUser;
    if (!userObj) {
      try {
        const u = localStorage.getItem("dashit_user");
        if (u) userObj = JSON.parse(u);
      } catch (e) {}
    }

    let orderLocation = checkoutData?.location;
    if (!orderLocation || !orderLocation.address) {
      try {
        const saved = localStorage.getItem("dashit_user_address");
        if (saved) orderLocation = JSON.parse(saved);
      } catch (e) {}
    }
    /* A missing pin used to default to the dark store's own coordinates. That
       made the ETA and the 5 km serviceability check meaningless, and handed
       the rider a map pinned on the shop rather than the customer's door. The
       customer is asked to drop a pin instead. */
    if (!orderLocation || !orderLocation.lat || !orderLocation.lng || !orderLocation.address) {
      placingRef.current = false;
      setIsProcessing(false);
      setIsLocationModalOpen(true);
      return;
    }

    const orderEta = calculateDeliveryEta(orderLocation);
    if (!orderEta.isDeliverable) {
      placingRef.current = false;
      setIsProcessing(false);
      alert("Delivery is not available in your area yet.\n\nWe are expanding across Anantnag and will reach you soon. Please pick another address for now.");
      return;
    }

    const newOrder = {
      orderId: generatedCode,
      date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
      createdAt: new Date().toISOString(),
      items: cartItems,
      totalAmount: grandTotal,
      total: grandTotal,
      finalTotal: grandTotal,
      /* Real savings: the sum of per-item MRP gaps plus the coupon, rather than
         a flat ₹140 that was printed on every receipt regardless of the cart. */
      savings:
        cartItems.reduce((sum, i) => {
          const mrp = Number(i.originalPrice || i.mrp || i.price) || 0;
          const paid = Number(i.price) || 0;
          return sum + Math.max(0, mrp - paid) * (Number(i.qty) || 0);
        }, 0) +
        couponDiscount +
        (deliveryFee === 0 ? 25 : 0),
      paymentMethod: selectedMethod.label,
      location: orderLocation,
      etaMinutes: orderEta.etaMinutes,
      distanceKm: orderEta.distanceKm,
      otp: Math.floor(1000 + Math.random() * 9000),
      status: "Placed",
      customerName: userObj?.name || "Customer",
      mobile: userObj?.mobile || (typeof window !== "undefined" ? localStorage.getItem("dashit_user_phone") : "") || "",
      email: userObj?.email || (typeof window !== "undefined" ? localStorage.getItem("dashit_user_email") : "") || "",
      receiverContact: receiverDetails || null,
    };

    setProcessedOrder(newOrder);

    const finalizeOrder = async (orderPayload) => {
      try {
        // 1. Submit directly to Firestore & await confirmation
        const res = await submitOrder(orderPayload);
        const finalOrderId = res?.orderId || generatedCode;
        const confirmedOrder = { ...orderPayload, orderId: finalOrderId };
        setProcessedOrder(confirmedOrder);
        placingRef.current = false;
        setIsProcessing(false);
        setShowProcessingModal(true);

        try {
          showOrderPlacedNotification(confirmedOrder);
        } catch (notifErr) {
          console.warn("Could not dispatch placed order notification:", notifErr);
        }

        const existingOrders = JSON.parse(localStorage.getItem("dashit_orders_history") || "[]");
        const filtered = existingOrders.filter((o) => o.orderId !== finalOrderId);
        localStorage.setItem("dashit_orders_history", JSON.stringify([confirmedOrder, ...filtered].slice(0, 20)));
        localStorage.setItem("dashit_active_order", JSON.stringify(confirmedOrder));

        localStorage.removeItem("dashit_cart");
        localStorage.removeItem("dashit_checkout_data");
        // Reset free delivery popup so future orders can see it again
        localStorage.removeItem("dashit_free_delivery_seen");
        window.dispatchEvent(new Event("dashit_cart_updated"));
      } catch (err) {
        console.error("Order placement error:", err);
        placingRef.current = false;
        setIsProcessing(false);
        setShowProcessingModal(false);
        alert(err?.message || "Unable to process order. Please check your connection and try again.");
      }
    };

    // Process order with Cash on Delivery
    await finalizeOrder(newOrder);
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] text-slate-900 font-sans relative flex flex-col justify-between dark:bg-surface dark:text-content">
      <SEO title="Checkout" noindex={true} />
      {/* 1. TOP HEADER with Smooth Return */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3 flex items-center justify-between shadow-2xs dark:bg-surface dark:border-line/80">
        <div className="flex items-center space-x-3">
          <motion.button
            whileTap={{ scale: 0.88 }}
            type="button"
            onClick={handleSmoothClose}
            aria-label="Go back"
            /* Icon-only controls carried no accessible name and sat under the
               44px target: the circle keeps its size, the button grows around
               it, and the negative margin keeps the header spacing intact. */
            className="w-9 h-9 min-w-[44px] min-h-[44px] -m-[3.5px] rounded-full border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-transform cursor-pointer dark:border-line dark:text-content-secondary dark:hover:bg-surface-muted"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </motion.button>
          <h1 className="font-extrabold text-base text-slate-900 dark:text-content">
            Checkout
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            aria-label="Search products"
            onClick={() => router.push("/search")}
            className="w-9 h-9 min-w-[44px] min-h-[44px] rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 active:scale-90 transition-transform dark:border-line dark:text-content-secondary dark:hover:bg-surface-muted"
          >
            <Search className="w-4 h-4 stroke-[2.5]" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: "My Dashit Cart", text: "Check out what I am ordering on Dashit!" });
              }
            }}
            className="flex items-center space-x-1.5 px-3 min-h-[44px] rounded-full border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 active:scale-95 transition-transform dark:border-line dark:text-content-secondary dark:hover:bg-surface-muted"
          >
            <ShoppingBag className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Share</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      {cartItems.length === 0 ? (
        <main className="max-w-md mx-auto p-6 py-20 text-center space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-blue-50 text-[#061838] mx-auto flex items-center justify-center border border-blue-100 shadow-sm dark:bg-surface-raised dark:text-content dark:border-line">
            <ShoppingBag className="w-10 h-10 stroke-[1.5]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-black text-slate-900 dark:text-content">Your cart is empty</h2>
            <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto dark:text-content-muted">
              You haven't added any items to your cart yet. Explore our fresh categories with fastest delivery in Anantnag!
            </p>
          </div>
          <Link
            href="/shop"
            className="inline-block bg-[#061838] hover:bg-slate-900 dark:bg-accent dark:hover:bg-[#e05000] text-white font-black text-xs px-6 py-3 rounded-2xl shadow-md active:scale-95 transition-all"
          >
            Browse Storefront →
          </Link>
        </main>
      ) : (
        <main className="max-w-2xl mx-auto w-full p-4 sm:p-6 space-y-4 pb-64">
        {/* STORE CLOSED BANNER */}
        {!isStoreOpen && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-start space-x-3 text-slate-800 dark:bg-surface-raised dark:border-line dark:text-content">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-rose-600 flex items-center justify-center shrink-0 dark:bg-surface-muted">
              <X className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900 dark:text-content">Ordering paused</h3>
              <p className="text-xs text-red-700 font-medium mt-0.5 leading-relaxed dark:text-rose-400">
                Store Reopening Schedule: {closeReason || "Reopening shortly"}
              </p>
            </div>
          </div>
        )}

        {/* Delivery Summary Banner */}
        <div className="bg-white dark:bg-[#12161F] rounded-2xl p-4 border border-slate-200/80 dark:border-slate-800 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-[#FF5B00] flex items-center justify-center shrink-0">
                <Clock className="w-4 h-4 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="font-extrabold text-sm sm:text-base text-slate-900 dark:text-white leading-tight">
                  Delivery in {checkoutEta.isDeliverable ? `${checkoutEta.etaMinutes || 12} minutes` : "Unavailable"}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium text-xs mt-0.5">
                  Shipment of {cartItems.reduce((s, i) => s + (Number(i.qty) || 0), 0)} item{cartItems.length !== 1 ? "s" : ""} • Doorstep delivery
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClearAllCart}
              className="text-xs font-semibold text-slate-400 hover:text-rose-500 transition-colors cursor-pointer py-1 px-1.5"
              title="Remove all items from cart"
            >
              Clear all
            </button>
          </div>

          {/* Free Delivery Progress (Shown when below ₹299 threshold) */}
          {subtotal < FREE_DELIVERY_THRESHOLD && subtotal > 0 && (
            <div className="bg-slate-50 dark:bg-[#161B26] border border-slate-200/70 dark:border-slate-800/80 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 dark:text-white block">
                  Free Delivery on orders above ₹{FREE_DELIVERY_THRESHOLD}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  Add items worth <span className="font-bold text-[#FF5B00]">₹{FREE_DELIVERY_THRESHOLD - subtotal}</span> more for <span className="text-emerald-500 font-bold">FREE delivery</span>
                </span>
              </div>
              <button
                type="button"
                onClick={() => router.push("/shop")}
                className="px-3 py-1.5 text-xs font-bold bg-[#FF5B00] hover:bg-[#E04E00] text-white rounded-xl transition-colors cursor-pointer"
              >
                Add Items
              </button>
            </div>

            <div className="space-y-1">
              <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 transition-all duration-300 rounded-full"
                  style={{ width: `${Math.min(100, Math.round((subtotal / FREE_DELIVERY_THRESHOLD) * 100))}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-semibold text-slate-400">
                <span>Current: ₹{subtotal}</span>
                <span>Free Delivery: ₹{FREE_DELIVERY_THRESHOLD}</span>
              </div>
            </div>
          </div>
        )}

          {/* Product Items List matching screenshot */}
          <div className="divide-y divide-slate-100 pt-1 dark:divide-line-soft">
            {cartItems.map((item) => (
              <div key={item.id} className="py-3 flex items-start justify-between space-x-3">
                <img
                  src={item.img || item.image || "/products/milk.png"}
                  alt={item.name}
                  className="w-16 h-16 object-contain bg-slate-50 rounded-2xl p-1.5 border border-slate-100 shrink-0 dark:bg-surface-raised dark:border-line-soft"
                />

                <div className="grow">
                  <h3 className="font-extrabold text-xs text-slate-900 leading-snug line-clamp-2 dark:text-content">
                    {item.name}
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-500 block mt-0.5 dark:text-content-muted">
                    {item.unit || "1 unit"}
                  </span>
                  <button
                    onClick={() => {
                      addToWishlist(item);
                      updateItemQty(item.id, -item.qty);
                    }}
                    className="text-[11px] font-bold text-slate-400 hover:text-[#061838] underline mt-1 py-1.5 -my-0.5 text-left active:scale-95 transition-transform dark:text-content-faint"
                  >
                    Move to wishlist
                  </button>
                </div>

                <div className="flex flex-col items-end space-y-1.5 shrink-0">
                  <div className="flex items-center space-x-1.5 border border-slate-200 dark:border-slate-700/80 rounded-xl bg-white dark:bg-[#161B26] text-slate-800 dark:text-white px-2 py-1 font-bold text-xs shadow-2xs">
                    <button
                      type="button"
                      aria-label={`Remove one ${item.name || "item"}`}
                      onClick={() => updateItemQty(item.id, -1)}
                      className="p-0.5 hover:text-[#FF5B00] active:scale-75 transition-transform"
                    >
                      <Minus className="w-3 h-3 stroke-[2.5]" />
                    </button>
                    <span className="font-mono px-1.5 text-xs" aria-live="polite" aria-label={`Quantity ${item.qty}`}>
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      aria-label={`Add one more ${item.name || "item"}`}
                      onClick={() => updateItemQty(item.id, 1)}
                      className="p-0.5 hover:text-[#FF5B00] active:scale-75 transition-transform"
                    >
                      <Plus className="w-3 h-3 stroke-[2.5]" />
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 line-through mr-1 font-mono dark:text-content-faint">
                      ₹{parsePrice(item.originalPrice || parsePrice(item.price) + 20) * (Number(item.qty) || 0)}
                    </span>
                    <span className="font-black text-xs text-slate-900 font-mono dark:text-content">
                      ₹{parsePrice(item.price) * (Number(item.qty) || 0)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Coupons & Offers Banner matching Screenshot 3 */}
        <div
          onClick={() => setIsCouponsOpen(true)}
          className="bg-white dark:bg-[#12161F] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-3.5 flex items-center justify-between shadow-2xs cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-colors"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-[#FF5B00] flex items-center justify-center shrink-0">
              <Tag className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                {appliedCoupon ? `Coupon '${appliedCoupon.code}' applied` : "Avail Offers & Coupons"}
              </span>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 block">
                {appliedCoupon ? `You are saving ₹${couponDiscount} with this order` : "Save up to ₹50 on this order"}
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        {/* Bill Details */}
        <div className="bg-white dark:bg-[#12161F] border border-slate-200/80 dark:border-slate-800 rounded-2xl p-4 space-y-2.5 shadow-2xs text-xs">
          <h4 className="font-extrabold text-slate-900 dark:text-white text-xs">Bill Details</h4>
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Items total</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">₹{subtotal}</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-slate-400">
            <span>Delivery fee</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">
              {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
            </span>
          </div>
          {couponDiscount > 0 && (
            <div className="flex justify-between text-[#FF5B00] font-bold">
              <span>Coupon discount ({appliedCoupon?.code})</span>
              <span className="font-mono">-₹{couponDiscount}</span>
            </div>
          )}
          <div className="pt-2 border-t border-slate-100 dark:border-line flex justify-between font-black text-sm text-slate-900 dark:text-content">
            <span>To Pay</span>
            <span className="font-mono text-[#061838] dark:text-[#FF6A1A]">₹{grandTotal}</span>
          </div>
        </div>

        {/* 3. SMART RECOMMENDATIONS: PAIRS WELL WITH YOUR BASKET */}
        {pairsWell.length > 0 && (
          <section className="space-y-3 pt-2">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-content tracking-tight">
                  Pairs Well with Your Items
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-content-secondary font-medium">
                  Smart additions tailored to your cart
                </p>
              </div>
            </div>

            <div className="flex space-x-3 overflow-x-auto no-scrollbar pb-2 pt-1 px-1">
              {pairsWell.map((prod) => {
                const inCart = cartItems.find((i) => String(i.id || i.barcode) === String(prod.id || prod.barcode));
                const savings = prod.originalPrice && prod.originalPrice > prod.price 
                  ? prod.originalPrice - prod.price 
                  : 0;

                return (
                  <div
                    key={prod.id}
                    className="w-[175px] shrink-0 bg-white dark:bg-surface-raised border border-slate-200/90 dark:border-line rounded-3xl p-3 flex flex-col justify-between space-y-2 shadow-2xs hover:shadow-sm transition-shadow"
                  >
                    <div className="relative">
                      {savings > 0 && (
                        <span className="absolute top-0 left-0 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 font-bold text-[9.5px] px-1.5 py-0.5 rounded-md">
                          Save ₹{savings}
                        </span>
                      )}
                      <img
                        src={prod.img || prod.image || "/products/milk.png"}
                        alt={prod.name}
                        className="w-24 h-24 object-contain mx-auto bg-slate-50 dark:bg-surface-muted rounded-2xl p-2 mt-2"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-content-faint">{prod.unit || "1 unit"}</span>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-content leading-tight line-clamp-2 mt-0.5">
                        {prod.name}
                      </h4>
                      <div className="flex items-center space-x-1 mt-1 text-[10px] text-amber-500 font-black">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                        <span>{prod.rating || "4.8"}</span>
                        <span className="text-slate-400 font-medium dark:text-content-faint">({prod.ratingCount || "10k"})</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-line flex items-center justify-between">
                      <div>
                        {prod.originalPrice > prod.price && (
                          <span className="text-[9px] font-semibold text-slate-400 line-through block leading-none dark:text-content-faint">
                            ₹{prod.originalPrice}
                          </span>
                        )}
                        <span className="text-xs font-black text-slate-900 dark:text-content font-mono">
                          ₹{prod.price}
                        </span>
                      </div>

                      {inCart ? (
                        <div className="flex items-center space-x-1 bg-[#061838] text-white rounded-xl px-2 py-1 font-bold text-xs shadow-xs">
                          <button
                            type="button"
                            aria-label={`Remove one ${prod.name || "item"}`}
                            onClick={() => updateItemQty(prod.id, -1)}
                            className="relative p-0.5 active:scale-75 transition-transform before:absolute before:-inset-3 before:content-['']"
                          >
                            <Minus className="w-3 h-3 stroke-[3]" />
                          </button>
                          <span className="font-mono px-1" aria-live="polite">{inCart.qty}</span>
                          <button
                            type="button"
                            aria-label={`Add one more ${prod.name || "item"}`}
                            onClick={() => updateItemQty(prod.id, 1)}
                            className="relative p-0.5 active:scale-75 transition-transform before:absolute before:-inset-3 before:content-['']"
                          >
                            <Plus className="w-3 h-3 stroke-[3]" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddToCart(prod)}
                          className="bg-white dark:bg-surface-muted border-2 border-[#061838] dark:border-line-strong text-[#061838] dark:text-content font-black text-xs px-3.5 py-1 rounded-xl hover:bg-slate-50 dark:hover:bg-surface-raised active:scale-95 shadow-2xs transition-all"
                        >
                          ADD
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* 4. FREQUENTLY ADDED IN ANANTNAG (HIGH-DENSITY SUGGESTIONS AT BOTTOM) */}
        {popularAdditions.length > 0 && (
          <section className="space-y-3 pt-2">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-content tracking-tight">
                  Frequently Ordered in Anantnag
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-content-secondary font-medium">
                  Popular pantry staples, snacks & beverages customers often add
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              {popularAdditions.map((prod) => {
                const inCart = cartItems.find((i) => String(i.id || i.barcode) === String(prod.id || prod.barcode));
                const savings = prod.originalPrice && prod.originalPrice > prod.price 
                  ? prod.originalPrice - prod.price 
                  : 0;

                return (
                  <div
                    key={prod.id}
                    className="bg-white dark:bg-surface-raised border border-slate-200/90 dark:border-line rounded-3xl p-3 flex flex-col justify-between space-y-2 shadow-2xs hover:shadow-sm transition-shadow"
                  >
                    <div className="relative">
                      {savings > 0 && (
                        <span className="absolute top-0 left-0 bg-emerald-500/10 text-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-400 font-bold text-[9.5px] px-1.5 py-0.5 rounded-md">
                          Save ₹{savings}
                        </span>
                      )}
                      <img
                        src={prod.img || prod.image || "/products/milk.png"}
                        alt={prod.name}
                        className="w-24 h-24 object-contain mx-auto bg-slate-50 dark:bg-surface-muted rounded-2xl p-2 mt-2"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-content-faint">{prod.unit || "1 unit"}</span>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-content leading-tight line-clamp-2 mt-0.5">
                        {prod.name}
                      </h4>
                      <div className="flex items-center space-x-1 mt-1 text-[10px] text-amber-500 font-black">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                        <span>{prod.rating || "4.8"}</span>
                        <span className="text-slate-400 font-medium dark:text-content-faint">({prod.ratingCount || "10k"})</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-line flex items-center justify-between">
                      <div>
                        {prod.originalPrice > prod.price && (
                          <span className="text-[9px] font-semibold text-slate-400 line-through block leading-none dark:text-content-faint">
                            ₹{prod.originalPrice}
                          </span>
                        )}
                        <span className="text-xs font-black text-slate-900 dark:text-content font-mono">
                          ₹{prod.price}
                        </span>
                      </div>

                      {inCart ? (
                        <div className="flex items-center space-x-1 bg-[#061838] text-white rounded-xl px-2 py-1 font-bold text-xs shadow-xs">
                          <button
                            type="button"
                            onClick={() => updateItemQty(prod.id, -1)}
                            className="p-0.5 active:scale-75 transition-transform"
                          >
                            <Minus className="w-3 h-3 stroke-[3]" />
                          </button>
                          <span className="font-mono px-1">{inCart.qty}</span>
                          <button
                            type="button"
                            onClick={() => updateItemQty(prod.id, 1)}
                            className="p-0.5 active:scale-75 transition-transform"
                          >
                            <Plus className="w-3 h-3 stroke-[3]" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddToCart(prod)}
                          className="bg-white dark:bg-surface-muted border-2 border-[#061838] dark:border-line-strong text-[#061838] dark:text-content font-black text-xs px-3.5 py-1 rounded-xl hover:bg-slate-50 dark:hover:bg-surface-raised active:scale-95 shadow-2xs transition-all"
                        >
                          ADD
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </main>
      )}

      {/* 5. STICKY BOTTOM BAR (Always anchored to viewport bottom) */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-surface-overlay/95 backdrop-blur-md border-t border-slate-200/90 dark:border-line shadow-[0_-10px_30px_rgba(0,0,0,0.1)] pb-[max(12px,env(safe-area-inset-bottom,12px))]">
          <div className="max-w-2xl mx-auto px-2">
            {/* Address Strip */}
            <div className="px-3 py-2 border-b border-slate-100 dark:border-line space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-surface-muted flex items-center justify-center shrink-0 border border-slate-200 dark:border-line">
                    {checkoutData?.location?.alias === "Work" ? (
                      <Briefcase className="w-4 h-4 text-[#061838] dark:text-content" />
                    ) : checkoutData?.location?.alias === "Parents" ? (
                      <Users className="w-4 h-4 text-[#061838] dark:text-content" />
                    ) : checkoutData?.location?.alias === "Shop" ? (
                      <Building2 className="w-4 h-4 text-[#061838] dark:text-content" />
                    ) : (
                      <Home className="w-4 h-4 text-[#061838] dark:text-content" />
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      <span className="text-xs font-black text-slate-900 dark:text-content uppercase">
                        Delivering to {checkoutData?.location?.alias || checkoutData?.location?.nickname || "Home"}
                      </span>
                      {checkoutEta.isDeliverable ? (
                        <span className="text-[11px] font-medium text-slate-500 dark:text-content-muted flex items-center space-x-1">
                          <span>•</span>
                          <span className="text-slate-700 dark:text-content-secondary font-semibold">{checkoutEta.pillText}</span>
                          <span className="text-slate-400 dark:text-content-faint">({checkoutEta.distanceFormatted})</span>
                        </span>
                      ) : (
                        <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 flex items-center space-x-1">
                          <span>•</span>
                          <span>Beyond 5km ({checkoutEta.distanceFormatted})</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-content-secondary font-medium truncate max-w-[280px]">
                      {checkoutData?.location?.address || "Tap to set delivery address"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsLocationModalOpen(true)}
                  className="text-xs font-black text-[#FF5B00] hover:underline shrink-0 pl-2 cursor-pointer"
                >
                  Change
                </button>
              </div>

              {/* Outside the service area warning */}
              {!checkoutEta.isDeliverable && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-start space-x-2 text-slate-600 dark:text-content-secondary">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div className="min-w-0 text-left">
                      <span className="text-[11px] font-semibold block leading-tight text-slate-900 dark:text-content">
                        Not available in your area yet
                      </span>
                      <p className="text-[10.5px] text-slate-500 font-medium leading-snug mt-0.5 dark:text-content-muted">
                        DASHit currently delivers around Anantnag, Jammu &amp; Kashmir.
                        We are expanding soon.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsLocationModalOpen(true)}
                    className="w-full text-[11px] font-semibold text-[#061838] border border-slate-200 rounded-lg py-2 hover:bg-slate-50 cursor-pointer dark:border-line dark:hover:bg-surface-muted dark:text-content"
                  >
                    Choose an address in our delivery area
                  </button>
                </div>
              )}

              {/* Ordering for someone else button */}
              <div className="pt-1 flex items-center justify-between border-t border-slate-100 dark:border-line">
                <button
                  type="button"
                  onClick={() => setIsOrderingForSomeoneElseOpen(true)}
                  className="flex items-center space-x-1.5 text-[11px] font-black text-[#061838] hover:underline cursor-pointer dark:text-content"
                >
                  <Users className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>
                    {receiverDetails
                      ? `Recipient: ${receiverDetails.name} (${receiverDetails.phone})`
                      : "Ordering for someone else?"}
                  </span>
                </button>
              </div>
            </div>

            {/* Account Verification Prompt if not logged in */}
            {!isUserLoggedIn && (
              <div className="px-3 pt-2">
                <div className="bg-white border border-slate-200 rounded-2xl p-2.5 flex items-center justify-between dark:bg-surface-raised dark:border-line">
                  <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                    <div className="w-7 h-7 rounded-xl bg-[#061838] text-white flex items-center justify-center shrink-0">
                      <LogIn className="w-3.5 h-3.5 text-[#FF5B00] stroke-[2.5]" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-900 truncate dark:text-content">Account Verification Required</h4>
                      <p className="text-[10px] text-slate-600 font-medium truncate dark:text-content-secondary">Sign in to confirm delivery address &amp; place order.</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsLoginModalOpen(true)}
                    className="px-3 py-1.5 rounded-xl bg-[#FF5B00] text-white text-xs font-black shrink-0 shadow-xs cursor-pointer active:scale-95 transition-all"
                  >
                    Sign In
                  </button>
                </div>
              </div>
            )}

            <div className="p-3 px-3 flex items-center justify-between space-x-3">
              {/* Left: Pay Using Button */}
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(true)}
                className="text-left active:scale-95 transition-transform cursor-pointer"
              >
                <span className="text-[9px] font-black text-slate-400 flex items-center space-x-1 uppercase tracking-wider dark:text-content-faint">
                  <span>PAY USING</span>
                  <ChevronUp className="w-3 h-3 text-slate-500 stroke-[3] dark:text-content-muted" />
                </span>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <span className="w-4 h-4 rounded-md bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[10px] font-black leading-none font-mono">
                    ₹
                  </span>
                  <span className="text-xs font-black text-slate-900 dark:text-content truncate max-w-[110px]">
                    {selectedMethod.label}
                  </span>
                </div>
              </button>

              {/* Right: Dual Trust Navy / Orange CTA Button */}
              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={isProcessing || !isStoreOpen || !checkoutEta.isDeliverable}
                className={`grow rounded-2xl py-3 px-4 border transition-all flex items-center justify-between ${
                  !isStoreOpen || !checkoutEta.isDeliverable
                    ? "bg-slate-300 border-slate-400 text-slate-600 cursor-not-allowed opacity-90 dark:bg-surface-muted dark:border-line dark:text-content-faint"
                    : !isUserLoggedIn
                    ? "bg-[#FF5B00] hover:bg-[#E04E00] text-white shadow-sm border-orange-500/40 active:scale-[0.98] cursor-pointer"
                    : "bg-[#061838] hover:bg-[#0A2450] dark:bg-[#FF5B00] dark:hover:bg-[#E04E00] text-white shadow-sm border-slate-700/60 dark:border-orange-500/40 active:scale-[0.98] cursor-pointer"
                }`}
              >
                <div className="text-left pr-3 border-r border-white/25">
                  <span className="font-mono font-black text-sm block leading-tight">
                    ₹{grandTotal}
                  </span>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider block leading-tight opacity-80">
                    TOTAL
                  </span>
                </div>

                <div className="flex items-center space-x-1 pl-3">
                  {isProcessing && (
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1 shrink-0" />
                  )}
                  <span className="font-black text-xs sm:text-sm">
                    {isProcessing
                      ? "Securing Order..."
                      : !checkoutEta.isDeliverable
                      ? "Beyond 5km Service Area"
                      : !isStoreOpen
                      ? "Store Closed"
                      : !isUserLoggedIn
                      ? "Sign In to Place Order"
                      : "Place Order (COD)"}
                  </span>
                  {!isProcessing && isStoreOpen && checkoutEta.isDeliverable && (
                    !isUserLoggedIn ? (
                      <ArrowRight className="w-4 h-4 stroke-[3]" />
                    ) : (
                      <ChevronRight className="w-4 h-4 stroke-[3]" />
                    )
                  )}
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals & Bottom Sheets */}
      <CheckoutLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onAuthenticated={(user) => {
          setIsUserLoggedIn(true);
          setIsLoginModalOpen(false);
          executeOrderPlacement(user);
        }}
      />

      <PaymentMethodModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        selectedMethod={selectedMethod}
        onSelectMethod={(method) => setSelectedMethod(method)}
        grandTotal={grandTotal}
      />

      <LocationPickerModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocation={checkoutData?.location}
        onSelectLocation={(newLoc) => {
          const updated = { ...checkoutData, location: newLoc };
          setCheckoutData(updated);
          try {
            localStorage.setItem("dashit_checkout_data", JSON.stringify(updated));
            localStorage.setItem("dashit_user_address", JSON.stringify(newLoc));
            localStorage.setItem("dashit_selected_location", JSON.stringify(newLoc));
            window.dispatchEvent(new CustomEvent("dashit_address_updated", { detail: newLoc }));
          } catch (e) {}
        }}
      />

      {/* Ordering For Someone Else Modal (Screenshot 2) */}
      <OrderingForSomeoneElseModal
        isOpen={isOrderingForSomeoneElseOpen}
        onClose={() => setIsOrderingForSomeoneElseOpen(false)}
        onSaveReceiver={(details) => setReceiverDetails(details)}
      />

      {/* Coupons Drawer (Screenshot 3) */}
      <CouponsDrawer
        isOpen={isCouponsOpen}
        onClose={() => setIsCouponsOpen(false)}
        cartTotal={subtotal}
        appliedCoupon={appliedCoupon}
        onApplyCoupon={(coupon) => setAppliedCoupon(coupon)}
      />

      {/* Free Delivery Celebration Popup (Screenshot 5) */}
      <FreeDeliveryCelebrationModal
        isOpen={isFreeDeliveryModalOpen}
        onClose={() => setIsFreeDeliveryModalOpen(false)}
      />

      {/* Animated Order Processing & Email Confirmation Modal */}
      <OrderProcessingModal
        isOpen={showProcessingModal}
        orderDetails={processedOrder}
        onComplete={() => {
          setShowProcessingModal(false);
          placingRef.current = false;
          setIsProcessing(false);
          router.push("/orders");
        }}
      />

      {/* Minimum Order Value Modal */}
      <MinOrderValueModal
        isOpen={isMinOrderModalOpen}
        onClose={() => setIsMinOrderModalOpen(false)}
        subtotal={subtotal}
        eta={checkoutEta}
        location={checkoutData?.location}
      />
    </div>
  );
}
