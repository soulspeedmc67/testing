import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Search, Clock, MapPin, ArrowRight, CheckCircle2, Plus, Minus, LayoutDashboard, Navigation, Sparkles, SlidersHorizontal } from "lucide-react";
import LocationPickerModal from "../components/LocationPickerModal";

const MapTracking = dynamic(() => import("../components/MapTracking"), { ssr: false });

const CATEGORIES = [
  { id: "all", name: "All Items" },
  { id: "bakery", name: "Fresh Bakery (6-8 AM)" },
  { id: "groceries", name: "Fresh Groceries" },
  { id: "snacks", name: "Snacks & Drinks" },
  { id: "essentials", name: "Daily Essentials" }
];

const PRODUCTS = [
  { id: 1, name: "Fresh Kashmiri Lavas Bread (4 pcs)", category: "bakery", price: 30, originalPrice: 40, time: "10 mins", tag: "Bakery", emoji: "🥐" },
  { id: 2, name: "Fresh Milk 1L", category: "groceries", price: 66, originalPrice: 75, time: "10 mins", tag: "Dairy", emoji: "🥛" },
  { id: 3, name: "Fresh Kashmiri Apples (1kg)", category: "groceries", price: 120, originalPrice: 150, time: "10 mins", tag: "Produce", emoji: "🍎" },
  { id: 4, name: "Potato Chips - Salted", category: "snacks", price: 20, originalPrice: 25, time: "8 mins", tag: "Snacks", emoji: "🥔" },
  { id: 5, name: "Cold Drink (750ml)", category: "snacks", price: 45, originalPrice: 55, time: "10 mins", tag: "Beverage", emoji: "🥤" },
  { id: 6, name: "Lays Magic Masala", category: "snacks", price: 20, originalPrice: 20, time: "8 mins", tag: "Snacks", emoji: "🍟" }
];

export default function StorefrontHome() {
  const [selectedCat, setSelectedCat] = useState("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [couponCode, setCouponCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);

  const [activeLocation, setActiveLocation] = useState({
    nickname: "Home",
    address: "Nai Basti, Near Petrol Pump, Anantnag",
    lat: 33.7311,
    lng: 75.1487
  });
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const [currentHour] = useState(new Date().getHours());
  const isBakeryTimeOnly = currentHour >= 6 && currentHour < 8;
  const isNightTime = currentHour >= 22 || currentHour < 6;

  const [activeOrder, setActiveOrder] = useState(null);
  const [cancellationSeconds, setCancellationSeconds] = useState(120);
  const [showThankYou, setShowThankYou] = useState(false);

  useEffect(() => {
    let timer;
    if (activeOrder && cancellationSeconds > 0) {
      timer = setInterval(() => setCancellationSeconds((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [activeOrder, cancellationSeconds]);

  const filteredProducts = PRODUCTS.filter((p) => {
    const matchesCat = selectedCat === "all" || p.category === selectedCat;
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const addToCart = (product) => {
    if (isBakeryTimeOnly && product.category !== "bakery") {
      alert("Only Bakery items are available between 6:00 AM and 8:00 AM.");
      return;
    }
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) => (item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
      }
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateCartQty = (id, delta) => {
    setCart((prev) =>
      prev
        .map((item) => (item.id === id ? { ...item, qty: item.qty + delta } : item))
        .filter((item) => item.qty > 0)
    );
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const originalSubtotal = cart.reduce((sum, item) => sum + item.originalPrice * item.qty, 0);
  const totalSavings = (originalSubtotal - subtotal) + discountAmount;
  const deliveryFee = subtotal >= 399 || subtotal >= 200 ? 0 : 25;
  const finalTotal = Math.max(0, subtotal + deliveryFee - discountAmount);

  const applyCoupon = () => {
    if (couponCode.toUpperCase() === "ANANTNAG10") {
      setDiscountAmount(20);
      alert("Coupon ANANTNAG10 Applied! ₹20 Discount Added.");
    } else {
      alert("Invalid Coupon Code! Try ANANTNAG10");
    }
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;
    const newOrderId = "DASH-" + Math.floor(100000 + Math.random() * 900000);
    setActiveOrder({
      orderId: newOrderId,
      items: cart,
      totalAmount: finalTotal,
      savings: totalSavings,
      method: paymentMethod,
      location: activeLocation,
      otp: Math.floor(1000 + Math.random() * 9000)
    });
    setCancellationSeconds(120);
    setShowThankYou(true);
    setCart([]);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans antialiased pb-36">
      {/* Sticky Header with Navigation Portals & Clean Logo */}
      <header className="sticky top-0 z-40 bg-[#09090b]/90 backdrop-blur-xl border-b border-zinc-800/80 px-4 py-3">
        <div className="max-w-md mx-auto space-y-2.5">
          {/* Quick Navigation Bar */}
          <div className="flex items-center justify-between text-[11px] bg-zinc-900/90 px-3 py-1.5 rounded-xl border border-zinc-800/80">
            <span className="text-zinc-400 font-medium">Quick Access:</span>
            <div className="flex items-center space-x-3">
              <Link href="/admin" className="text-orange-400 font-semibold hover:underline flex items-center space-x-1">
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Admin</span>
              </Link>
              <Link href="/driver" className="text-sky-400 font-semibold hover:underline flex items-center space-x-1">
                <Navigation className="w-3.5 h-3.5" />
                <span>Rider</span>
              </Link>
            </div>
          </div>

          {/* Logo & Location Bar */}
          <div className="flex items-center justify-between">
            <div>
              {/* Minimal Brand Logo */}
              <div className="flex items-baseline space-x-0.5 text-2xl font-black tracking-tight">
                <span className="text-orange-500">DASH</span>
                <span className="text-sky-400">it</span>
                <span className="text-[9px] text-zinc-400 font-mono ml-2 uppercase tracking-wider bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">10-MIN</span>
              </div>

              {/* Delivery ETA indicator */}
              <div className="flex items-center space-x-1.5 text-xs text-zinc-400 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                <span>Delivery in <strong className="text-zinc-200">13 Mins (10+3 mins)</strong></span>
              </div>
            </div>

            {/* Location Selector Button */}
            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="flex items-center space-x-1.5 text-xs bg-zinc-900 hover:bg-zinc-800/80 text-zinc-200 px-3 py-2 rounded-xl border border-zinc-800/90 transition-all shadow-sm"
            >
              <MapPin className="w-3.5 h-3.5 text-orange-500 shrink-0" />
              <span className="font-semibold max-w-[100px] truncate">{activeLocation.nickname}</span>
              <span className="text-[10px] text-orange-400 font-bold">Edit</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search apples, Kashmiri lavas, milk..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900 text-zinc-100 pl-10 pr-4 py-2 rounded-xl text-xs border border-zinc-800/90 focus:outline-none focus:border-orange-500/50"
            />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-md mx-auto px-4 mt-4 space-y-4">
        {/* Interactive Location Picker Modal */}
        <LocationPickerModal
          isOpen={isLocationModalOpen}
          onClose={() => setIsLocationModalOpen(false)}
          onSelectLocation={(newLoc) => setActiveLocation(newLoc)}
          currentLocation={activeLocation}
        />

        {/* Active Order Driver Tracking */}
        {activeOrder && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3 shadow-xl">
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="font-bold text-orange-500">Order #{activeOrder.orderId}</span>
                <p className="text-[11px] text-zinc-400 mt-0.5">OTP Code: <b className="text-zinc-100 font-mono">{activeOrder.otp}</b></p>
              </div>

              {cancellationSeconds > 0 && !isNightTime ? (
                <div className="text-right">
                  <span className="text-[10px] text-zinc-500 block">Edit / Cancel Window</span>
                  <span className="text-xs font-mono font-bold text-amber-400">{Math.floor(cancellationSeconds / 60)}:{cancellationSeconds % 60 < 10 ? '0' : ''}{cancellationSeconds % 60}s</span>
                </div>
              ) : (
                <span className="text-[10px] text-emerald-400 bg-zinc-800 px-2 py-0.5 rounded font-medium">In Transit</span>
              )}
            </div>

            <MapTracking orderId={activeOrder.orderId} initialLat={activeLocation.lat} initialLng={activeLocation.lng} />

            {cancellationSeconds > 0 && !isNightTime && (
              <button
                onClick={() => { setActiveOrder(null); setShowThankYou(false); alert("Order cancelled."); }}
                className="w-full bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-semibold py-2 rounded-xl hover:bg-rose-500 hover:text-white transition-all"
              >
                Cancel Order ({cancellationSeconds}s)
              </button>
            )}
          </div>
        )}

        {/* Thank You Card */}
        {showThankYou && activeOrder && (
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 text-center space-y-1.5">
            <CheckCircle2 className="w-7 h-7 text-orange-500 mx-auto" />
            <h3 className="font-bold text-sm text-zinc-100">Order Placed Successfully!</h3>
            <p className="text-xs text-zinc-400">Delivering to: <b className="text-zinc-200">{activeLocation.address}</b></p>
            <p className="text-xs font-bold text-orange-400">Saved ₹{activeOrder.savings} on this order!</p>
          </div>
        )}

        {/* Category Filter Pills */}
        <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCat === cat.id
                  ? "bg-orange-500 text-zinc-950 font-bold shadow-md shadow-orange-500/20"
                  : "bg-zinc-900 text-zinc-400 border border-zinc-800/80 hover:text-zinc-200"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-2 gap-3">
          {filteredProducts.map((p) => {
            const inCart = cart.find((item) => item.id === p.id);
            return (
              <div key={p.id} className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-3 flex flex-col justify-between hover:border-zinc-700 transition-all">
                <div className="text-4xl text-center py-5 bg-zinc-950/60 rounded-xl mb-2.5">{p.emoji}</div>
                <div>
                  <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                    <span>⚡ {p.time}</span>
                    <span className="bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded text-[9px]">{p.tag}</span>
                  </div>
                  <h4 className="font-semibold text-xs text-zinc-100 mt-1 line-clamp-1">{p.name}</h4>
                  <div className="flex items-baseline space-x-1.5 mt-1">
                    <span className="text-xs font-bold text-zinc-100">₹{p.price}</span>
                    <span className="text-[10px] text-zinc-500 line-through">₹{p.originalPrice}</span>
                  </div>
                </div>

                {inCart ? (
                  <div className="mt-3 flex items-center justify-between bg-orange-500 text-zinc-950 rounded-xl p-1 font-bold text-xs">
                    <button onClick={() => updateCartQty(p.id, -1)} className="p-1 hover:bg-orange-600 rounded-lg">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span>{inCart.qty}</span>
                    <button onClick={() => updateCartQty(p.id, 1)} className="p-1 hover:bg-orange-600 rounded-lg">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => addToCart(p)}
                    className="mt-3 w-full bg-zinc-800 hover:bg-orange-500 hover:text-zinc-950 text-zinc-200 text-xs font-bold py-2 rounded-xl border border-zinc-700/60 transition-all"
                  >
                    ADD
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </main>

      {/* Cart Fixed Bottom Drawer */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-[#09090b]/95 backdrop-blur-xl border-t border-zinc-800/90 shadow-2xl">
          <div className="max-w-md mx-auto space-y-2.5">
            {/* Coupon Box */}
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Coupon Code (e.g. ANANTNAG10)..."
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="bg-zinc-900 border border-zinc-800 text-xs px-3 py-2 rounded-xl text-white grow focus:outline-none focus:border-sky-500/50"
              />
              <button onClick={applyCoupon} className="bg-sky-500/10 border border-sky-500/40 text-sky-400 text-xs font-bold px-3 py-2 rounded-xl hover:bg-sky-500 hover:text-zinc-950 transition-all">
                APPLY
              </button>
            </div>

            {/* Payment Method Selector */}
            <div className="flex items-center justify-between text-xs text-zinc-300 bg-zinc-900/90 p-2 rounded-xl border border-zinc-800/80">
              <span className="font-semibold">Payment:</span>
              <div className="flex space-x-1.5">
                <button
                  onClick={() => setPaymentMethod("upi")}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${paymentMethod === "upi" ? "bg-orange-500 text-zinc-950" : "bg-zinc-800 text-zinc-400"}`}
                >
                  ⚡ UPI
                </button>
                <button
                  onClick={() => setPaymentMethod("card")}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${paymentMethod === "card" ? "bg-orange-500 text-zinc-950" : "bg-zinc-800 text-zinc-400"}`}
                >
                  💳 Card
                </button>
                <button
                  onClick={() => setPaymentMethod("cod")}
                  disabled={isNightTime}
                  className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all ${
                    paymentMethod === "cod" ? "bg-orange-500 text-zinc-950" : "bg-zinc-800 text-zinc-400"
                  } ${isNightTime ? "opacity-40 cursor-not-allowed" : ""}`}
                >
                  💵 COD
                </button>
              </div>
            </div>

            {/* Checkout CTA */}
            <div className="flex items-center justify-between bg-orange-500 text-zinc-950 p-3 rounded-xl shadow-xl">
              <div>
                <p className="text-xs font-bold">{cart.reduce((s, i) => s + i.qty, 0)} ITEMS • ₹{finalTotal}</p>
                <p className="text-[10px] text-zinc-950/80 font-semibold">Saved ₹{totalSavings} today</p>
              </div>

              <button
                onClick={handleCheckout}
                className="bg-zinc-950 text-orange-400 px-4 py-2 rounded-lg text-xs font-bold flex items-center space-x-1 hover:bg-zinc-900 transition-colors"
              >
                <span>Checkout</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
