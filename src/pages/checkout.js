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
import { hapticOrderPlaced, hapticMedium, hapticLight } from "../lib/haptics";
import { submitOrder } from "../lib/api";
import { newOrderCode } from "../lib/db";
import { showOrderPlacedNotification } from "../lib/notifications";
import { addToWishlist } from "../lib/wishlist";
import { useStoreDetails } from "../lib/storeStatus";
import { calculateDeliveryEta } from "../lib/deliveryEta";
import { ALL_PRODUCTS } from "../data/products";

export default function CheckoutPage() {
  const router = useRouter();
  const { isOpen: isStoreOpen, closeReason } = useStoreDetails();
  const [checkoutData, setCheckoutData] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState({ id: "cod", label: "Cash on Delivery (COD)" });
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
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
    const cartIds = new Set(cartItems.map((i) => i.id));
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

    const available = ALL_PRODUCTS.filter((p) => !cartIds.has(p.id));
    const complementary = available.filter((p) => targetCats.has(p.cat));
    const popularStaples = available.filter((p) => !targetCats.has(p.cat));

    const pairs = complementary.length >= 4 
      ? complementary 
      : [...complementary, ...popularStaples];
    const pairsSlice = pairs.slice(0, 8);
    const pairsIds = new Set(pairsSlice.map((p) => p.id));

    const popular = available.filter((p) => !pairsIds.has(p.id));

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

      const savedCheckout = localStorage.getItem("dashit_checkout_data");
      if (savedCheckout) {
        const parsed = JSON.parse(savedCheckout);
        setCheckoutData(parsed);
        setCartItems(parsed.cart || []);
      } else {
        const savedCart = localStorage.getItem("dashit_cart");
        if (savedCart) {
          const cart = JSON.parse(savedCart);
          const sub = cart.reduce((s, i) => s + i.price * i.qty, 0);
          setCartItems(cart);
          setCheckoutData({
            cart,
            subtotal: sub,
            grandTotal: sub + 25,
            location: savedAddress || {
              nickname: "Home",
              address: ""
            }
          });
        }
      }
    } catch (e) {}
  }, []);

  const subtotal = cartItems.reduce(
    (s, i) => s + (Number(i.price) || 0) * (Number(i.qty) || 0),
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
    subtotal >= 199 || effectiveCoupon?.waivesDelivery || effectiveCoupon?.code === "FREEDEL"
      ? 0
      : 25;
  const couponDiscount = effectiveCoupon
    ? Math.min(subtotal, Number(effectiveCoupon.discount) || 0)
    : 0;
  const grandTotal = Math.max(0, subtotal + deliveryFee - couponDiscount);

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

  // Trigger Free Delivery Celebration when cart reaches ₹199 (Shown only once until order placed)
  useEffect(() => {
    try {
      const alreadyShown = localStorage.getItem("dashit_free_delivery_seen");
      if (subtotal >= 199 && !alreadyShown && !hasShownFreeDelivery) {
        setIsFreeDeliveryModalOpen(true);
        localStorage.setItem("dashit_free_delivery_seen", "true");
        setHasShownFreeDelivery(true);
      }
    } catch (e) {}
  }, [subtotal, hasShownFreeDelivery]);

  const updateItemQty = (id, delta) => {
    if (delta > 0) {
      hapticLight();
    } else {
      const current = cartItems.find((i) => i.id === id);
      if (current && current.qty <= 1) {
        hapticMedium();
      } else {
        hapticLight();
      }
    }
    const updated = cartItems
      .map((item) => (item.id === id ? { ...item, qty: item.qty + delta } : item))
      .filter((item) => item.qty > 0);
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
      alert(`Store will be available: ${closeReason || "Please check back shortly!"}`);
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

    try {
      // 1. Submit directly to Firestore & await confirmation
      const res = await submitOrder(newOrder);
      const finalOrderId = res?.orderId || generatedCode;
      const confirmedOrder = { ...newOrder, orderId: finalOrderId };
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
      localStorage.setItem("dashit_orders_history", JSON.stringify([confirmedOrder, ...filtered]));
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

  return (
    <div className="min-h-screen bg-[#F4F6F8] text-slate-900 font-sans relative flex flex-col justify-between">
      <SEO title="Checkout" noindex={true} />
      {/* 1. TOP HEADER with Smooth Return */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center space-x-3">
          <motion.button
            whileTap={{ scale: 0.88 }}
            type="button"
            onClick={handleSmoothClose}
            aria-label="Go back"
            /* Icon-only controls carried no accessible name and sat under the
               44px target: the circle keeps its size, the button grows around
               it, and the negative margin keeps the header spacing intact. */
            className="w-9 h-9 min-w-[44px] min-h-[44px] -m-[3.5px] rounded-full border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-transform cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </motion.button>
          <h1 className="font-extrabold text-base text-slate-900">
            Checkout
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            aria-label="Search products"
            onClick={() => router.push("/search")}
            className="w-9 h-9 min-w-[44px] min-h-[44px] rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 active:scale-90 transition-transform"
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
            className="flex items-center space-x-1.5 px-3 min-h-[44px] rounded-full border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 active:scale-95 transition-transform"
          >
            <ShoppingBag className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Share</span>
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      {cartItems.length === 0 ? (
        <main className="max-w-md mx-auto p-6 py-20 text-center space-y-4">
          <div className="w-20 h-20 rounded-3xl bg-blue-50 text-[#061838] mx-auto flex items-center justify-center border border-blue-100 shadow-sm">
            <ShoppingBag className="w-10 h-10 stroke-[1.5]" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-black text-slate-900">Your cart is empty</h2>
            <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto">
              You haven't added any items to your cart yet. Explore our fresh categories with fastest delivery in Anantnag!
            </p>
          </div>
          <Link
            href="/shop"
            className="inline-block bg-[#061838] hover:bg-slate-900 text-white font-black text-xs px-6 py-3 rounded-2xl shadow-md active:scale-95 transition-all"
          >
            Browse Storefront →
          </Link>
        </main>
      ) : (
        <main className="max-w-2xl mx-auto w-full p-4 sm:p-6 space-y-4 pb-64">
        {/* STORE CLOSED BANNER */}
        {!isStoreOpen && (
          <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-start space-x-3 text-slate-800">
            <div className="w-8 h-8 rounded-full bg-slate-100 text-rose-600 flex items-center justify-center shrink-0">
              <X className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-slate-900">Ordering paused</h3>
              <p className="text-xs text-red-700 font-medium mt-0.5 leading-relaxed">
                Store will be available: {closeReason || "Reopening shortly"}
              </p>
            </div>
          </div>
        )}

        {/* 2. DELIVERY IN 12 MINUTES BANNER */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#061838] flex items-center justify-center shrink-0 border border-blue-100">
                <Clock className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="font-black text-base text-slate-900 leading-tight">
                  Delivery in 12 minutes
                </h2>
                <p className="text-slate-500 font-semibold text-xs mt-0.5">
                  Shipment of {cartItems.reduce((s, i) => s + i.qty, 0)} item{cartItems.length !== 1 ? "s" : ""}
                </p>
              </div>
            </div>

            {/* Red Bin Remove All Button */}
            <button
              type="button"
              onClick={handleClearAllCart}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-200/80 text-xs font-black active:scale-95 transition-all cursor-pointer shadow-2xs shrink-0"
              title="Remove all items from cart"
            >
              <Trash2 className="w-3.5 h-3.5 stroke-[2.5] text-red-600" />
              <span>Remove all</span>
            </button>
          </div>

          {/* Open box delivery badge */}
          <div className="bg-[#f0f7ff] border border-blue-200/60 rounded-2xl p-3">
            <span className="font-extrabold text-xs text-slate-900 block leading-tight">
              Open box delivery eligible
            </span>
            <div className="flex items-center justify-between text-[11px] text-slate-600 mt-0.5">
              <span>Check & accept at doorstep</span>
              <span className="text-blue-600 font-bold underline cursor-pointer">Know more</span>
            </div>
          </div>

          {/* Product Items List matching screenshot */}
          <div className="divide-y divide-slate-100 pt-1">
            {cartItems.map((item) => (
              <div key={item.id} className="py-3 flex items-start justify-between space-x-3">
                <img
                  src={item.img}
                  alt={item.name}
                  className="w-16 h-16 object-contain bg-slate-50 rounded-2xl p-1.5 border border-slate-100 shrink-0"
                />

                <div className="grow">
                  <h3 className="font-extrabold text-xs text-slate-900 leading-snug line-clamp-2">
                    {item.name}
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-500 block mt-0.5">
                    {item.unit || "1 unit"}
                  </span>
                  <button
                    onClick={() => {
                      addToWishlist(item);
                      updateItemQty(item.id, -item.qty);
                    }}
                    className="text-[11px] font-bold text-slate-400 hover:text-[#061838] underline mt-1 py-1.5 -my-0.5 text-left active:scale-95 transition-transform"
                  >
                    Move to wishlist
                  </button>
                </div>

                <div className="flex flex-col items-end space-y-1.5 shrink-0">
                  <div className="flex items-center space-x-2 bg-[#061838] text-white rounded-xl px-2.5 py-1 font-bold text-xs shadow-xs">
                    {/* These were 16px targets with no accessible name, on the
                        control customers use most before paying. The pill keeps
                        its size; the pseudo-element carries the touch area. */}
                    <button
                      type="button"
                      aria-label={`Remove one ${item.name || "item"}`}
                      onClick={() => updateItemQty(item.id, -1)}
                      className="relative p-0.5 active:scale-75 transition-transform before:absolute before:-inset-3 before:content-['']"
                    >
                      <Minus className="w-3 h-3 stroke-[3]" />
                    </button>
                    <span className="font-mono px-1" aria-live="polite" aria-label={`Quantity ${item.qty}`}>
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      aria-label={`Add one more ${item.name || "item"}`}
                      onClick={() => updateItemQty(item.id, 1)}
                      className="relative p-0.5 active:scale-75 transition-transform before:absolute before:-inset-3 before:content-['']"
                    >
                      <Plus className="w-3 h-3 stroke-[3]" />
                    </button>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 line-through mr-1 font-mono">
                      ₹{(item.originalPrice || item.price + 20) * item.qty}
                    </span>
                    <span className="font-black text-xs text-slate-900 font-mono">
                      ₹{item.price * item.qty}
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
          className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-4 flex items-center justify-between shadow-2xs cursor-pointer active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center border border-blue-200 dark:border-blue-900">
              <Tag className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <span className="text-xs font-black text-slate-900 dark:text-white block">
                {appliedCoupon ? `Coupon '${appliedCoupon.code}' Applied!` : "Avail Offers and Coupons"}
              </span>
              <span className="text-[11px] font-bold text-[#FF5B00] block">
                {appliedCoupon ? `You are saving ₹${couponDiscount} with this order` : "Save up to ₹50 with GET30 & DASHIT50"}
              </span>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </div>

        {/* Bill Details */}
        <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-4 space-y-2.5 shadow-2xs text-xs">
          <h4 className="font-black text-slate-900 dark:text-white text-xs">Bill Details</h4>
          <div className="flex justify-between text-slate-600 dark:text-zinc-400">
            <span>Items total</span>
            <span className="font-mono font-bold text-slate-900 dark:text-white">₹{subtotal}</span>
          </div>
          <div className="flex justify-between text-slate-600 dark:text-zinc-400">
            <span>Delivery fee</span>
            <span className="font-mono font-bold text-[#2563EB]">
              {deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}
            </span>
          </div>
          {couponDiscount > 0 && (
            <div className="flex justify-between text-[#FF5B00] font-bold">
              <span>Coupon discount ({appliedCoupon?.code})</span>
              <span className="font-mono">-₹{couponDiscount}</span>
            </div>
          )}
          <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex justify-between font-black text-sm text-slate-900 dark:text-white">
            <span>To Pay</span>
            <span className="font-mono text-[#061838] dark:text-white">₹{grandTotal}</span>
          </div>
        </div>

        {/* 3. SMART RECOMMENDATIONS: PAIRS WELL WITH YOUR BASKET */}
        {pairsWell.length > 0 && (
          <section className="space-y-3 pt-2">
            <div className="flex items-center justify-between px-1">
              <div>
                <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white tracking-tight">
                  Pairs Well with Your Items
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                  Smart additions tailored to your cart
                </p>
              </div>
            </div>

            <div className="flex space-x-3 overflow-x-auto no-scrollbar pb-2 pt-1 px-1">
              {pairsWell.map((prod) => {
                const inCart = cartItems.find((i) => i.id === prod.id);
                const savings = prod.originalPrice && prod.originalPrice > prod.price 
                  ? prod.originalPrice - prod.price 
                  : 0;

                return (
                  <div
                    key={prod.id}
                    className="w-[175px] shrink-0 bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-3 flex flex-col justify-between space-y-2 shadow-2xs hover:shadow-sm transition-shadow"
                  >
                    <div className="relative">
                      {savings > 0 && (
                        <span className="absolute top-0 left-0 bg-emerald-50 text-emerald-700 font-bold text-[9.5px] px-2 py-0.5 rounded-md border border-emerald-200/70">
                          Save ₹{savings}
                        </span>
                      )}
                      <img
                        src={prod.img}
                        alt={prod.name}
                        className="w-24 h-24 object-contain mx-auto bg-slate-50 dark:bg-zinc-800 rounded-2xl p-2 mt-2"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400">{prod.unit || "1 unit"}</span>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-tight line-clamp-2 mt-0.5">
                        {prod.name}
                      </h4>
                      <div className="flex items-center space-x-1 mt-1 text-[10px] text-amber-500 font-black">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                        <span>{prod.rating || "4.8"}</span>
                        <span className="text-slate-400 font-medium">({prod.ratingCount || "10k"})</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                      <div>
                        {prod.originalPrice > prod.price && (
                          <span className="text-[9px] font-semibold text-slate-400 line-through block leading-none">
                            ₹{prod.originalPrice}
                          </span>
                        )}
                        <span className="text-xs font-black text-slate-900 dark:text-white font-mono">
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
                          onClick={() => {
                            const updated = [...cartItems, { ...prod, qty: 1 }];
                            setCartItems(updated);
                            localStorage.setItem("dashit_cart", JSON.stringify(updated));
                            window.dispatchEvent(new Event("dashit_cart_updated"));
                            hapticLight();
                          }}
                          className="bg-white dark:bg-zinc-800 border-2 border-[#061838] text-[#061838] dark:text-white font-black text-xs px-3.5 py-1 rounded-xl hover:bg-slate-50 active:scale-95 shadow-2xs transition-all"
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
                <h3 className="font-black text-sm sm:text-base text-slate-900 dark:text-white tracking-tight">
                  Frequently Ordered in Anantnag
                </h3>
                <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
                  Popular pantry staples, snacks & beverages customers often add
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-1">
              {popularAdditions.map((prod) => {
                const inCart = cartItems.find((i) => i.id === prod.id);
                const savings = prod.originalPrice && prod.originalPrice > prod.price 
                  ? prod.originalPrice - prod.price 
                  : 0;

                return (
                  <div
                    key={prod.id}
                    className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-3 flex flex-col justify-between space-y-2 shadow-2xs hover:shadow-sm transition-shadow"
                  >
                    <div className="relative">
                      {savings > 0 && (
                        <span className="absolute top-0 left-0 bg-emerald-50 text-emerald-700 font-bold text-[9.5px] px-2 py-0.5 rounded-md border border-emerald-200/70">
                          Save ₹{savings}
                        </span>
                      )}
                      <img
                        src={prod.img}
                        alt={prod.name}
                        className="w-24 h-24 object-contain mx-auto bg-slate-50 dark:bg-zinc-800 rounded-2xl p-2 mt-2"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400">{prod.unit || "1 unit"}</span>
                      <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-tight line-clamp-2 mt-0.5">
                        {prod.name}
                      </h4>
                      <div className="flex items-center space-x-1 mt-1 text-[10px] text-amber-500 font-black">
                        <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                        <span>{prod.rating || "4.8"}</span>
                        <span className="text-slate-400 font-medium">({prod.ratingCount || "10k"})</span>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                      <div>
                        {prod.originalPrice > prod.price && (
                          <span className="text-[9px] font-semibold text-slate-400 line-through block leading-none">
                            ₹{prod.originalPrice}
                          </span>
                        )}
                        <span className="text-xs font-black text-slate-900 dark:text-white font-mono">
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
                          onClick={() => {
                            const updated = [...cartItems, { ...prod, qty: 1 }];
                            setCartItems(updated);
                            localStorage.setItem("dashit_cart", JSON.stringify(updated));
                            window.dispatchEvent(new Event("dashit_cart_updated"));
                            hapticLight();
                          }}
                          className="bg-white dark:bg-zinc-800 border-2 border-[#061838] text-[#061838] dark:text-white font-black text-xs px-3.5 py-1 rounded-xl hover:bg-slate-50 active:scale-95 shadow-2xs transition-all"
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
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-slate-200/90 dark:border-zinc-800 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] pb-[max(12px,env(safe-area-inset-bottom,12px))]">
          <div className="max-w-2xl mx-auto px-2">
            {/* Address Strip */}
            <div className="px-3 py-2 border-b border-slate-100 dark:border-zinc-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5 overflow-hidden">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-zinc-700">
                    {checkoutData?.location?.alias === "Work" ? (
                      <Briefcase className="w-4 h-4 text-[#061838] dark:text-white" />
                    ) : checkoutData?.location?.alias === "Parents" ? (
                      <Users className="w-4 h-4 text-[#061838] dark:text-white" />
                    ) : checkoutData?.location?.alias === "Shop" ? (
                      <Building2 className="w-4 h-4 text-[#061838] dark:text-white" />
                    ) : (
                      <Home className="w-4 h-4 text-[#061838] dark:text-white" />
                    )}
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex items-center space-x-1.5 flex-wrap">
                      <span className="text-xs font-black text-slate-900 dark:text-white uppercase">
                        Delivering to {checkoutData?.location?.alias || checkoutData?.location?.nickname || "Home"}
                      </span>
                      {checkoutEta.isDeliverable ? (
                        <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80 flex items-center space-x-1">
                          <Zap className="w-2.5 h-2.5 fill-emerald-600 text-emerald-600 shrink-0" />
                          <span>{checkoutEta.pillText} ({checkoutEta.distanceFormatted})</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-black uppercase text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200/80 flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                          <span>Beyond 5km ({checkoutEta.distanceFormatted})</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium truncate max-w-[280px]">
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

              {/*
                Outside the service area.

                This must never be a dead end. The Place Order button is disabled
                here, so without an obvious way forward anyone opening the app from
                outside Anantnag — an App Store or Play reviewer included — simply
                cannot reach checkout, which is an automatic rejection under
                Apple's Guideline 2.1. The button below sets the pin to a
                serviceable address in one tap.
              */}
              {!checkoutEta.isDeliverable && (
                <div className="mt-2 space-y-2">
                  <div className="flex items-start space-x-2 text-slate-600">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div className="min-w-0 text-left">
                      <span className="text-[11px] font-semibold block leading-tight text-slate-900">
                        Not available in your area yet
                      </span>
                      <p className="text-[10.5px] text-slate-500 font-medium leading-snug mt-0.5">
                        DASHit currently delivers around Anantnag, Jammu &amp; Kashmir.
                        We are expanding soon.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsLocationModalOpen(true)}
                    className="w-full text-[11px] font-semibold text-[#061838] border border-slate-200 rounded-lg py-2 hover:bg-slate-50 cursor-pointer"
                  >
                    Choose an address in our delivery area
                  </button>
                </div>
              )}

              {/* Ordering for someone else button */}
              <div className="pt-1 flex items-center justify-between border-t border-slate-100 dark:border-zinc-800/80">
                <button
                  type="button"
                  onClick={() => setIsOrderingForSomeoneElseOpen(true)}
                  className="flex items-center space-x-1.5 text-[11px] font-black text-[#061838] hover:underline cursor-pointer"
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
                <div className="bg-white border border-slate-200 rounded-2xl p-2.5 flex items-center justify-between">
                  <div className="flex items-center space-x-2.5 min-w-0 pr-2">
                    <div className="w-7 h-7 rounded-xl bg-[#061838] text-white flex items-center justify-center shrink-0">
                      <LogIn className="w-3.5 h-3.5 text-[#FF5B00] stroke-[2.5]" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-black text-slate-900 truncate">Account Verification Required</h4>
                      <p className="text-[10px] text-slate-600 font-medium truncate">Sign in to confirm delivery address &amp; place order.</p>
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
                <span className="text-[9px] font-black text-slate-400 flex items-center space-x-1 uppercase tracking-wider">
                  <span>PAY USING</span>
                  <ChevronUp className="w-3 h-3 text-slate-500 stroke-[3]" />
                </span>
                <div className="flex items-center space-x-1.5 mt-0.5">
                  {selectedMethod?.id === "cod" ? (
                    <span className="w-4 h-4 rounded-md bg-emerald-100 text-emerald-700 flex items-center justify-center text-[10px] font-black leading-none font-mono">
                      ₹
                    </span>
                  ) : (
                    <span className="text-xs font-black text-blue-600">UPI</span>
                  )}
                  <span className="text-xs font-black text-slate-900 dark:text-white truncate max-w-[110px]">
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
                    ? "bg-slate-300 border-slate-400 text-slate-600 cursor-not-allowed opacity-90"
                    : !isUserLoggedIn
                    ? "bg-[#FF5B00] hover:bg-[#E04E00] text-white shadow-sm border-orange-500/40 active:scale-[0.98] cursor-pointer"
                    : "bg-[#061838] hover:bg-[#0A2450] text-white shadow-sm border-slate-700/60 active:scale-[0.98] cursor-pointer"
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
                      : selectedMethod?.id === "cod"
                      ? "Place Order (COD)"
                      : "Place Order"}
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
    </div>
  );
}
