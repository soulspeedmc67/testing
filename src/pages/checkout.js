import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowLeft, Search, Share2, Clock, CheckCircle2, ChevronRight, ChevronUp, ShieldCheck, Plus, Minus, ShoppingBag } from "lucide-react";
import confetti from "canvas-confetti";
import PaymentMethodModal from "../components/PaymentMethodModal";
import LocationPickerModal from "../components/LocationPickerModal";

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
  const [isProcessing, setIsProcessing] = useState(false);
  const [cartItems, setCartItems] = useState([]);

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
          const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
          setCartItems(cart);
          setCheckoutData({
            cart,
            subtotal,
            grandTotal: subtotal + 30,
            location: {
              nickname: "Home",
              address: "b-3,jamia appqrtment,flat no 207,okhla, Abul Fazal Enclave Part 1, Okhla, Anantnag"
            }
          });
        }
      }
    } catch (e) {}
  }, []);

  const updateItemQty = (id, delta) => {
    const updated = cartItems
      .map((item) => (item.id === id ? { ...item, qty: item.qty + delta } : item))
      .filter((item) => item.qty > 0);
    setCartItems(updated);
    try {
      localStorage.setItem("dashit_cart", JSON.stringify(updated));
      window.dispatchEvent(new Event("dashit_cart_updated"));
    } catch (e) {}
    if (updated.length === 0) {
      router.push("/cart");
    }
  };

  const grandTotal = cartItems.reduce((s, i) => s + i.price * i.qty, 0) + (cartItems.length > 0 ? 30 : 0);

  const handlePlaceOrder = () => {
    if (cartItems.length === 0 || isProcessing) return;
    setIsProcessing(true);

    try {
      confetti({ particleCount: 120, spread: 70, origin: { y: 0.6 } });
    } catch (e) {}

    setTimeout(() => {
      const newOrderId = "DASH-" + Math.floor(100000 + Math.random() * 900000);
      const newOrder = {
        orderId: newOrderId,
        date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
        items: cartItems,
        totalAmount: grandTotal,
        savings: 140,
        paymentMethod: selectedMethod.label,
        location: checkoutData?.location || { nickname: "Home", address: "Anantnag" },
        otp: Math.floor(1000 + Math.random() * 9000),
        status: "Packing"
      };

      const existingOrders = JSON.parse(localStorage.getItem("dashit_orders_history") || "[]");
      localStorage.setItem("dashit_orders_history", JSON.stringify([newOrder, ...existingOrders]));
      localStorage.setItem("dashit_active_order", JSON.stringify(newOrder));
      localStorage.removeItem("dashit_cart");
      localStorage.removeItem("dashit_checkout_data");
      window.dispatchEvent(new Event("dashit_cart_updated"));

      setIsProcessing(false);
      router.push("/orders");
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-[#F4F6F8] text-slate-900 font-sans pb-36">
      {/* 1. TOP HEADER matching media_1788424288168.png */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200/80 px-4 pt-[max(12px,env(safe-area-inset-top,12px))] pb-3 flex items-center justify-between shadow-2xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-90 transition-transform"
          >
            <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
          </button>
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
      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* 2. DELIVERY IN 12 MINUTES BANNER */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-start space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-[#0c831f] flex items-center justify-center shrink-0 border border-emerald-100">
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

          {/* Open box delivery badge */}
          <div className="bg-[#e8f5e9]/70 border border-emerald-200/60 rounded-2xl p-3">
            <span className="font-extrabold text-xs text-slate-900 block leading-tight">
              Open box delivery eligible
            </span>
            <div className="flex items-center justify-between text-[11px] text-slate-600 mt-0.5">
              <span>Check & accept at doorstep</span>
              <span className="text-[#0c831f] font-bold underline cursor-pointer">Know more</span>
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
                  <button className="text-[11px] font-bold text-slate-400 hover:text-slate-700 underline mt-1">
                    Move to wishlist
                  </button>
                </div>

                <div className="flex flex-col items-end space-y-1.5 shrink-0">
                  <div className="flex items-center space-x-2 bg-[#0c831f] text-white rounded-xl px-2.5 py-1 font-bold text-xs shadow-xs">
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

        {/* 3. "YOU MIGHT ALSO LIKE" CAROUSEL matching media_1788424288168.png */}
        <section className="space-y-2.5">
          <h3 className="font-black text-sm text-slate-900 tracking-tight px-1">
            You might also like
          </h3>

          <div className="flex space-x-3 overflow-x-auto scrollbar-none pb-2">
            {YOU_MIGHT_ALSO_LIKE.map((sug) => (
              <div
                key={sug.id}
                className="w-[170px] shrink-0 bg-white border border-slate-200/90 rounded-3xl p-3 flex flex-col justify-between space-y-2 shadow-2xs"
              >
                <div className="relative">
                  <span className="absolute top-0 left-0 bg-amber-100 text-amber-900 font-black text-[9px] px-2 py-0.5 rounded-md">
                    {sug.badge}
                  </span>
                  <img
                    src={sug.img}
                    alt={sug.name}
                    className="w-24 h-24 object-contain mx-auto bg-slate-50 rounded-2xl p-2 mt-2"
                  />
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400">{sug.spec}</span>
                  <h4 className="font-bold text-xs text-slate-900 leading-tight line-clamp-2 mt-0.5">
                    {sug.name}
                  </h4>
                  <div className="flex items-center space-x-1 mt-1 text-[10px] text-amber-500 font-black">
                    <span>★ {sug.rating}</span>
                    <span className="text-slate-400 font-medium">({sug.ratingCount})</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-black text-blue-600 block leading-none">
                      {sug.discount}
                    </span>
                    <span className="text-xs font-black text-slate-900 font-mono">
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
                    className="bg-white border-2 border-[#0c831f] text-[#0c831f] font-black text-xs px-3.5 py-1 rounded-xl hover:bg-emerald-50 active:scale-95 shadow-2xs"
                  >
                    ADD
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* 4. STICKY BOTTOM BAR matching media_1788424288168.png */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200/90 shadow-[0_-10px_30px_rgba(0,0,0,0.1)] pb-[max(12px,env(safe-area-inset-bottom,12px))]">
        <div className="max-w-md mx-auto">
          {/* Address Strip */}
          <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2.5 overflow-hidden">
              <span className="text-xl shrink-0">🏡</span>
              <div className="overflow-hidden">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-black text-slate-900">
                    Delivering to {checkoutData?.location?.nickname || "Home"}
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium truncate max-w-[220px]">
                  {checkoutData?.location?.address || "b-3,jamia appqrtment, Anantnag"}
                </p>
                <p className="text-[10px] text-amber-700 font-bold leading-none truncate">
                  Selected address is 0.8 km away from your location
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="text-xs font-black text-[#0c831f] hover:underline shrink-0 pl-2"
            >
              Change
            </button>
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
                <span className="text-xs font-black text-slate-900">{selectedMethod.label}</span>
              </div>
            </button>

            {/* Right: Dual Green CTA Button */}
            <button
              onClick={handlePlaceOrder}
              disabled={isProcessing}
              className="grow bg-[#0c831f] hover:bg-emerald-800 text-white rounded-2xl py-3 px-4 shadow-lg active:scale-[0.98] transition-all flex items-center justify-between"
            >
              <div className="text-left pr-3 border-r border-white/25">
                <span className="font-mono font-black text-sm block leading-tight">
                  ₹{grandTotal}
                </span>
                <span className="text-[9px] font-extrabold text-emerald-100 uppercase tracking-wider block leading-tight">
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

      {/* Modals */}
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
    </div>
  );
}
