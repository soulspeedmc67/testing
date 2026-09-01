import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { ShoppingBag, Search, Clock, MapPin, Trash2, ArrowRight, ShieldCheck, Tag, CheckCircle2, Phone, Plus, Minus, Edit3, ChevronRight } from "lucide-react";

const MapTracking = dynamic(() => import("../components/MapTracking"), { ssr: false });

const CATEGORIES = [
  { id: "all", name: "All Items" },
  { id: "bakery", name: "Bakery (6am - 8am)" },
  { id: "groceries", name: "Fresh Groceries" },
  { id: "snacks", name: "Snacks & Drinks" },
  { id: "essentials", name: "Daily Essentials" }
];

const INITIAL_PRODUCTS = [
  { id: 1, name: "Fresh Kashmiri Lavas Bread (4 pcs)", category: "bakery", price: 30, originalPrice: 40, time: "10 mins", image: "🥐" },
  { id: 2, name: "Fresh Milk 1L", category: "groceries", price: 66, originalPrice: 75, time: "10 mins", image: "🥛" },
  { id: 3, name: "Fresh Kashmiri Apples (1kg)", category: "groceries", price: 120, originalPrice: 150, time: "10 mins", image: "🍎" },
  { id: 4, name: "Potato Chips - Salted", category: "snacks", price: 20, originalPrice: 25, time: "8 mins", image: "🥔" },
  { id: 5, name: "Cold Drink (750ml)", category: "snacks", price: 45, originalPrice: 55, time: "10 mins", image: "🥤" },
  { id: 6, name: "Lays Magic Masala", category: "snacks", price: 20, originalPrice: 20, time: "8 mins", image: "🍟" }
];

export default function ProfessionalDashItHome() {
  const [selectedCat, setSelectedCat] = useState("all");
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [couponCode, setCouponCode] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);

  const [userSavedLocations, setUserSavedLocations] = useState([
    { nickname: "Home", address: "Near Petrol Pump, Nai Basti, Anantnag" },
    { nickname: "Work", address: "Main Market, Khannabal" }
  ]);
  const [activeLocation, setActiveLocation] = useState(userSavedLocations[0]);
  const [showLocationModal, setShowLocationModal] = useState(false);

  const [currentHour] = useState(new Date().getHours());
  const isBakeryTimeOnly = currentHour >= 6 && currentHour < 8;
  const isNightTime = currentHour >= 22 || currentHour < 6;

  const [activeOrder, setActiveOrder] = useState(null);
  const [cancellationSeconds, setCancellationSeconds] = useState(120);
  const [showThankYouScreen, setShowThankYouScreen] = useState(false);

  useEffect(() => {
    let timer;
    if (activeOrder && cancellationSeconds > 0) {
      timer = setInterval(() => setCancellationSeconds((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [activeOrder, cancellationSeconds]);

  const addToCart = (product) => {
    if (isBakeryTimeOnly && product.category !== "bakery") {
      alert("Only Bakery items can be ordered between 6:00 AM and 8:00 AM.");
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
    setShowThankYouScreen(true);
    setCart([]);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-orange-500 selection:text-white antialiased pb-32">
      {/* Sleek Minimal Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/80 px-4 py-3">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            {/* Minimalist Logo */}
            <div className="flex items-baseline space-x-0.5 text-2xl font-bold tracking-tight">
              <span className="text-orange-500">DASH</span>
              <span className="text-sky-400">it</span>
              <span className="text-[10px] text-zinc-500 font-medium ml-2 uppercase tracking-wider">Anantnag</span>
            </div>

            {/* Time Indicator */}
            <div className="flex items-center space-x-1.5 text-xs text-zinc-400 mt-0.5">
              <Clock className="w-3.5 h-3.5 text-orange-500" />
              <span>Delivering in <strong className="text-zinc-200">13 Mins</strong></span>
            </div>
          </div>

          {/* Clean Location Selector */}
          <button
            onClick={() => setShowLocationModal(true)}
            className="flex items-center space-x-1.5 text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-300 px-3 py-1.5 rounded-lg border border-zinc-800 transition-colors"
          >
            <MapPin className="w-3.5 h-3.5 text-orange-500" />
            <span className="font-medium max-w-[90px] truncate">{activeLocation.nickname}</span>
            <ChevronRight className="w-3 h-3 text-zinc-500" />
          </button>
        </div>

        {/* Clean Search Input */}
        <div className="max-w-md mx-auto mt-3 relative">
          <Search className="absolute left-3.5 top-2.5 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search products in Anantnag..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 text-zinc-100 pl-10 pr-4 py-2 rounded-xl text-xs border border-zinc-800/80 focus:outline-none focus:border-orange-500/50 transition-colors"
          />
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 mt-4 space-y-4">
        {/* Active Order & Live Driver Map */}
        {activeOrder && (
          <div className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div>
                <span className="font-semibold text-orange-500">Order #{activeOrder.orderId}</span>
                <p className="text-[11px] text-zinc-400 mt-0.5">OTP: <b className="text-zinc-100 font-mono">{activeOrder.otp}</b></p>
              </div>

              {cancellationSeconds > 0 && !isNightTime ? (
                <span className="text-[11px] font-mono text-zinc-400">Cancel ({cancellationSeconds}s)</span>
              ) : (
                <span className="text-[10px] text-zinc-400 bg-zinc-800 px-2 py-0.5 rounded">In Transit</span>
              )}
            </div>

            <MapTracking orderId={activeOrder.orderId} initialLat={33.7311} initialLng={75.1487} />
          </div>
        )}

        {/* Thank You Card */}
        {showThankYouScreen && activeOrder && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-orange-500 mx-auto" />
            <h3 className="font-semibold text-sm text-zinc-100">Thank You for Shopping on DASHit</h3>
            <p className="text-xs text-zinc-400">Order dispatched from Nai Basti Dark Room.</p>
            <p className="text-xs font-semibold text-orange-400">You saved ₹{activeOrder.savings} on this order!</p>
          </div>
        )}

        {/* Category Pills */}
        <div className="flex space-x-2 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCat(cat.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedCat === cat.id
                  ? "bg-orange-500 text-zinc-950 font-semibold"
                  : "bg-zinc-900 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div className="grid grid-cols-2 gap-3">
          {INITIAL_PRODUCTS.map((p) => (
            <div key={p.id} className="bg-zinc-900/60 border border-zinc-800/80 rounded-xl p-3 flex flex-col justify-between hover:border-zinc-700/60 transition-colors">
              <div className="text-4xl text-center py-4 bg-zinc-950/40 rounded-lg mb-2">{p.image}</div>
              <div>
                <span className="text-[10px] text-zinc-500 font-mono">⚡ {p.time}</span>
                <h4 className="font-medium text-xs text-zinc-200 mt-0.5 line-clamp-1">{p.name}</h4>
                <div className="flex items-baseline space-x-1.5 mt-1">
                  <span className="text-xs font-semibold text-zinc-100">₹{p.price}</span>
                  <span className="text-[10px] text-zinc-500 line-through">₹{p.originalPrice}</span>
                </div>
              </div>

              <button
                onClick={() => addToCart(p)}
                className="mt-3 w-full bg-zinc-800 hover:bg-orange-500 hover:text-zinc-950 text-zinc-200 text-xs font-semibold py-1.5 rounded-lg border border-zinc-700/60 transition-all"
              >
                Add
              </button>
            </div>
          ))}
        </div>
      </main>

      {/* Cart Bottom Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-50 p-4 bg-zinc-950/90 backdrop-blur-xl border-t border-zinc-800/80">
          <div className="max-w-md mx-auto flex items-center justify-between bg-orange-500 text-zinc-950 p-3 rounded-xl shadow-lg">
            <div>
              <p className="text-xs font-bold">{cart.reduce((s, i) => s + i.qty, 0)} ITEMS • ₹{finalTotal}</p>
              <p className="text-[10px] text-zinc-900 font-medium">Saved ₹{totalSavings}</p>
            </div>

            <button
              onClick={handleCheckout}
              className="bg-zinc-950 text-orange-400 px-4 py-2 rounded-lg text-xs font-semibold flex items-center space-x-1 hover:bg-zinc-900 transition-colors"
            >
              <span>Checkout</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
