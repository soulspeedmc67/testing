import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { ArrowLeft, Search, Share2, Clock, CheckCircle2, ChevronRight, ChevronUp, ShieldCheck, Plus, Minus, ShoppingBag, Users, Tag, Sparkles, UserCheck, Trash2 } from "lucide-react";
import confetti from "canvas-confetti";
import PaymentMethodModal from "../components/PaymentMethodModal";
import LocationPickerModal from "../components/LocationPickerModal";
import CheckoutLoginModal from "../components/CheckoutLoginModal";
import OrderingForSomeoneElseModal from "../components/OrderingForSomeoneElseModal";
import CouponsDrawer from "../components/CouponsDrawer";
import FreeDeliveryCelebrationModal from "../components/FreeDeliveryCelebrationModal";
import { hapticOrderPlaced, hapticMedium, hapticLight } from "../lib/haptics";
import { submitOrder } from "../lib/api";
import { addToWishlist } from "../lib/wishlist";

const YOU_MIGHT_ALSO_LIKE = [
  {
    id: 101,
    name: "Portronics Luxcell B12 10K MAH Power Bank",
    spec: "12 W",
    price: 629,
    originalPrice: 1499,
    discount: "₹870 OFF",
    rating: "4.8",
    ratingCount: "11,602",
    badge: "10000 mAh",
    img: "https://images.unsplash.com/photo-1609592426861-f3b1451f28b7?w=300&auto=format&fit=crop&q=80"
  },
  {
    id: 102,
    name: "Bella Vita Organic Women's Luxury Perfume Gift Set",
    spec: "4 x 20 ml",
    price: 549,
    originalPrice: 849,
    discount: "₹300 OFF",
    rating: "4.7",
    ratingCount: "20,604",
    badge: "Top Rated",
    img: "https://images.unsplash.com/photo-1592945403244-b3fbafd7f539?w=300&auto=format&fit=crop&q=80"
  },
  {
    id: 103,
    name: "Bella Vita Organic CEO Men's Eau de Parfum",
    spec: "100 ml",
    price: 485,
    originalPrice: 899,
    discount: "₹414 OFF",
    rating: "4.7",
    ratingCount: "13,780",
    badge: "Woody",
    img: "https://images.unsplash.com/photo-1523293182086-7651a899d37f?w=300&auto=format&fit=crop&q=80"
  }
];

export default function CheckoutPage() {
  const router = useRouter();
  const [checkoutData, setCheckoutData] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState({ id: "gpay", label: "Google Pay UPI" });
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
  const [cartItems, setCartItems] = useState([]);
  const [isClosing, setIsClosing] = useState(false);

  const handleSmoothClose = () => {
    hapticLight();
    setIsClosing(true);
    setTimeout(() => {
      router.push("/");
    }, 220);
  };

  useEffect(() => {
    try {
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
            location: {
              nickname: "Home",
              address: "Nai Basti, Near Petrol Pump, Anantnag"
            }
          });
        }
      }
    } catch (e) {}
  }, []);

  const subtotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0);
  const deliveryFee = subtotal >= 199 || appliedCoupon?.code === "FREEDEL" ? 0 : 25;
  const couponDiscount = appliedCoupon ? Math.min(subtotal, appliedCoupon.discount) : 0;
  const grandTotal = Math.max(0, subtotal + deliveryFee - couponDiscount);

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
      router.push("/");
    }
  };

  const handleClearAllCart = () => {
    hapticMedium();
    setCartItems([]);
    try {
      localStorage.removeItem("dashit_cart");
      window.dispatchEvent(new Event("dashit_cart_updated"));
    } catch (e) {}
    router.push("/");
  };

  const handlePlaceOrder = () => {
    if (!cartItems || cartItems.length === 0) {
      alert("Your cart is empty! Please add items before placing an order.");
      return;
    }
    
    if (cartItems.length === 0 || isProcessing) return;

    // Login is strictly mandatory before placing an order
    const hasPhone = typeof window !== "undefined" && (localStorage.getItem("dashit_user_phone") || sessionStorage.getItem("dashit_checkout_authenticated"));
    if (!hasPhone) {
      setIsLoginModalOpen(true);
      return;
    }

    executeOrderPlacement();
  };

  const executeOrderPlacement = (authenticatedUser) => {
    setIsProcessing(true);
    hapticOrderPlaced();

    try {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    } catch (e) {}

    setTimeout(() => {
      const newOrderId = "DASH-" + Math.floor(100000 + Math.random() * 900000);
      let userObj = authenticatedUser;
      if (!userObj) {
        try {
          const u = localStorage.getItem("dashit_user");
          if (u) userObj = JSON.parse(u);
        } catch (e) {}
      }

      const newOrder = {
        orderId: newOrderId,
        date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
        items: cartItems,
        totalAmount: grandTotal,
        savings: 140 + couponDiscount,
        paymentMethod: selectedMethod.label,
        location: checkoutData?.location || { nickname: "Home", address: "Anantnag" },
        otp: Math.floor(1000 + Math.random() * 9000),
        status: "Packing",
        customerName: userObj?.name || "Azan Iqbal Mir",
        mobile: userObj?.mobile || localStorage.getItem("dashit_user_phone") || "9622720283",
        receiverContact: receiverDetails
      };

      const existingOrders = JSON.parse(localStorage.getItem("dashit_orders_history") || "[]");
      localStorage.setItem("dashit_orders_history", JSON.stringify([newOrder, ...existingOrders]));
      localStorage.setItem("dashit_active_order", JSON.stringify(newOrder));
      submitOrder(newOrder);
      localStorage.removeItem("dashit_cart");
      localStorage.removeItem("dashit_checkout_data");
      // Reset free delivery popup so future orders can see it again
      localStorage.removeItem("dashit_free_delivery_seen");
      window.dispatchEvent(new Event("dashit_cart_updated"));

      setIsProcessing(false);
      router.push("/orders");
    }, 1200);
  };

  return (
    <motion.div
      initial={{ y: "100%", opacity: 0.8 }}
      animate={isClosing ? { y: "100%", opacity: 0 } : { y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 340, damping: 32 }}
      className="min-h-screen bg-[#F4F6F8] text-slate-900 font-sans pb-36"
    >
      {/* 1. TOP HEADER with Smooth Return */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 px-4 pt-[max(12px,env(safe-area-inset-top,12px))] pb-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center space-x-3">
          <motion.button
            whileTap={{ scale: 0.88 }}
            type="button"
            onClick={handleSmoothClose}
            className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 transition-transform cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </motion.button>
          <h1 className="font-extrabold text-base text-slate-900">
            Checkout
          </h1>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => router.push("/search")}
            className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 active:scale-90 transition-transform"
          >
            <Search className="w-4 h-4 stroke-[2.5]" />
          </button>
          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: "My Dashit Cart", text: "Check out what I am ordering on Dashit!" });
              }
            }}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 active:scale-95 transition-transform"
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
              You haven't added any items to your cart yet. Explore our fresh categories to order in 8 mins!
            </p>
          </div>
          <Link
            href="/"
            className="inline-block bg-[#061838] hover:bg-slate-900 text-white font-black text-xs px-6 py-3 rounded-2xl shadow-md active:scale-95 transition-all"
          >
            Browse Storefront →
          </Link>
        </main>
      ) : (
        <main className="max-w-md mx-auto p-4 space-y-4">
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
                    className="text-[11px] font-bold text-slate-400 hover:text-[#061838] underline mt-1 text-left active:scale-95 transition-transform"
                  >
                    Move to wishlist
                  </button>
                </div>

                <div className="flex flex-col items-end space-y-1.5 shrink-0">
                  <div className="flex items-center space-x-2 bg-[#061838] text-white rounded-xl px-2.5 py-1 font-bold text-xs shadow-xs">
                    <button
                      onClick={() => updateItemQty(item.id, -1)}
                      className="p-0.5 active:scale-75 transition-transform"
                    >
                      <Minus className="w-3 h-3 stroke-[3]" />
                    </button>
                    <span className="font-mono px-1">{item.qty}</span>
                    <button
                      onClick={() => updateItemQty(item.id, 1)}
                      className="p-0.5 active:scale-75 transition-transform"
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

        {/* 3. "YOU MIGHT ALSO LIKE" CAROUSEL matching media_1788424288168.png */}
        <section className="space-y-2.5">
          <h3 className="font-black text-sm text-slate-900 dark:text-white tracking-tight px-1">
            You might also like
          </h3>

          <div className="flex space-x-3 overflow-x-auto scrollbar-none pb-2">
            {YOU_MIGHT_ALSO_LIKE.map((sug) => (
              <div
                key={sug.id}
                className="w-[170px] shrink-0 bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-3xl p-3 flex flex-col justify-between space-y-2 shadow-2xs"
              >
                <div className="relative">
                  <span className="absolute top-0 left-0 bg-amber-100 text-amber-900 font-black text-[9px] px-2 py-0.5 rounded-md">
                    {sug.badge}
                  </span>
                  <img
                    src={sug.img}
                    alt={sug.name}
                    className="w-24 h-24 object-contain mx-auto bg-slate-50 dark:bg-zinc-800 rounded-2xl p-2 mt-2"
                  />
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400">{sug.spec}</span>
                  <h4 className="font-bold text-xs text-slate-900 dark:text-white leading-tight line-clamp-2 mt-0.5">
                    {sug.name}
                  </h4>
                  <div className="flex items-center space-x-1 mt-1 text-[10px] text-amber-500 font-black">
                    <span>★ {sug.rating}</span>
                    <span className="text-slate-400 font-medium">({sug.ratingCount})</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-black text-blue-600 block leading-none">
                      {sug.discount}
                    </span>
                    <span className="text-xs font-black text-slate-900 dark:text-white font-mono">
                      ₹{sug.price}
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      const existing = cartItems.find((i) => i.id === sug.id);
                      if (existing) {
                        updateItemQty(sug.id, 1);
                      } else {
                        const updated = [...cartItems, { ...sug, qty: 1 }];
                        setCartItems(updated);
                        localStorage.setItem("dashit_cart", JSON.stringify(updated));
                        window.dispatchEvent(new Event("dashit_cart_updated"));
                      }
                    }}
                    className="bg-white dark:bg-zinc-800 border-2 border-[#061838] text-[#061838] font-black text-xs px-3.5 py-1 rounded-xl hover:bg-slate-50 active:scale-95 shadow-2xs"
                  >
                    ADD
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
      )}

      {/* 4. STICKY BOTTOM BAR (Only visible when items are in cart) */}
      {cartItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-zinc-900 border-t border-slate-200/90 dark:border-zinc-800 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] pb-[max(12px,env(safe-area-inset-bottom,12px))]">
        <div className="max-w-md mx-auto">
          {/* Address Strip */}
          <div className="px-4 py-2 border-b border-slate-100 dark:border-zinc-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5 overflow-hidden">
                <span className="text-xl shrink-0">🏡</span>
                <div className="overflow-hidden">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      Delivering to {checkoutData?.location?.nickname || "Home"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium truncate max-w-[220px]">
                    {checkoutData?.location?.address || "Nai Basti, Anantnag"}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsLocationModalOpen(true)}
                className="text-xs font-black text-[#FF5B00] hover:underline shrink-0 pl-2"
              >
                Change
              </button>
            </div>

            {/* Ordering for someone else button matching Screenshot 2 */}
            <div className="pt-1 flex items-center justify-between border-t border-slate-100 dark:border-zinc-800/80">
              <button
                type="button"
                onClick={() => setIsOrderingForSomeoneElseOpen(true)}
                className="flex items-center space-x-1.5 text-[11px] font-black text-[#061838] hover:underline"
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

          {/* Payment Method & Dual Place Order CTA */}
          <div className="p-3 px-4 flex items-center justify-between space-x-3">
            {/* Left: Pay Using Button */}
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="text-left active:scale-95 transition-transform"
            >
              <span className="text-[9px] font-black text-slate-400 flex items-center space-x-1 uppercase tracking-wider">
                <span>PAY USING</span>
                <ChevronUp className="w-3 h-3 text-slate-500 stroke-[3]" />
              </span>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className="text-xs font-black text-blue-600">G</span>
                <span className="text-xs font-black text-slate-900 dark:text-white">{selectedMethod.label}</span>
              </div>
            </button>

            {/* Right: Dual Trust Navy CTA Button */}
            <button
              onClick={handlePlaceOrder}
              disabled={isProcessing}
              className="grow bg-gradient-to-r from-[#061838] via-[#0A2558] to-[#061838] hover:opacity-95 text-white rounded-2xl py-3 px-4 shadow-[0_8px_24px_rgba(6,24,56,0.28)] border border-slate-700/60 active:scale-[0.98] transition-all flex items-center justify-between"
            >
              <div className="text-left pr-3 border-r border-white/25">
                <span className="font-mono font-black text-sm block leading-tight">
                  ₹{grandTotal}
                </span>
                <span className="text-[9px] font-extrabold text-amber-200 uppercase tracking-wider block leading-tight">
                  TOTAL
                </span>
              </div>

              <div className="flex items-center space-x-1 pl-3">
                <span className="font-black text-sm">
                  {isProcessing ? "Processing..." : "Place Order"}
                </span>
                <ChevronRight className="w-4 h-4 stroke-[3]" />
              </div>
            </button>
          </div>
        </div>
      </div>
      )}

      {/* Modals & Bottom Sheets */}
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
          localStorage.setItem("dashit_checkout_data", JSON.stringify(updated));
        }}
      />

      {/* Skippable iOS Login Bottom Sheet */}
      <CheckoutLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onAuthenticated={(user) => {
          try {
            sessionStorage.setItem("dashit_checkout_authenticated", "true");
          } catch (e) {}
          executeOrderPlacement(user);
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
    </motion.div>
  );
}
