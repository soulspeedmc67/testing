import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Search, Clock, MapPin, ArrowRight, CheckCircle2, Plus, Minus, Mic, User, ShoppingBag, AlertCircle, RefreshCw, X } from "lucide-react";
import LocationPickerModal from "../components/LocationPickerModal";
import LocationPermissionModal from "../components/LocationPermissionModal";
import BottomNav from "../components/BottomNav";

const MapTracking = dynamic(() => import("../components/MapTracking"), { ssr: false });

const CATEGORY_SECTIONS = [
  {
    title: "Grocery & Kitchen",
    items: [
      { id: "cat-veg", name: "Vegetables & Fruits", img: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200&auto=format&fit=crop&q=80", bg: "bg-emerald-50" },
      { id: "cat-dal", name: "Atta, Rice & Dal", img: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=200&auto=format&fit=crop&q=80", bg: "bg-amber-50" },
      { id: "cat-oil", name: "Oil, Ghee & Masala", img: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=200&auto=format&fit=crop&q=80", bg: "bg-yellow-50" },
      { id: "cat-dairy", name: "Dairy, Bread & Eggs", img: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200&auto=format&fit=crop&q=80", bg: "bg-sky-50" },
      { id: "cat-bakery", name: "Bakery & Biscuits", img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=200&auto=format&fit=crop&q=80", bg: "bg-orange-50" },
      { id: "cat-instant", name: "Instant Food", img: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=200&auto=format&fit=crop&q=80", bg: "bg-rose-50" }
    ]
  },
  {
    title: "Snacks & Drinks",
    items: [
      { id: "cat-chips", name: "Chips & Namkeen", img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=200&auto=format&fit=crop&q=80", bg: "bg-sky-50" },
      { id: "cat-sweets", name: "Sweets & Chocolates", img: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=200&auto=format&fit=crop&q=80", bg: "bg-purple-50" },
      { id: "cat-drinks", name: "Drinks & Juices", img: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=200&auto=format&fit=crop&q=80", bg: "bg-emerald-50" },
      { id: "cat-tea", name: "Tea, Coffee & Milk", img: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=200&auto=format&fit=crop&q=80", bg: "bg-amber-50" }
    ]
  }
];

const PRODUCTS = [
  { id: 1, name: "Lay's Magic Masala Potato Chips", unit: "50g", price: 20, originalPrice: 20, time: "10 mins", img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300&auto=format&fit=crop&q=80", cat: "Snacks" },
  { id: 2, name: "Fresh Kashmiri Lavas Bread (4 pcs)", unit: "4 pcs", price: 30, originalPrice: 40, time: "10 mins", img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=300&auto=format&fit=crop&q=80", cat: "Bakery" },
  { id: 3, name: "Amul Taaza Fresh Toned Milk 1L", unit: "1L", price: 66, originalPrice: 70, time: "10 mins", img: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300&auto=format&fit=crop&q=80", cat: "Dairy" },
  { id: 4, name: "Fresh Kashmiri Red Apples (1kg)", unit: "1 kg", price: 140, originalPrice: 170, time: "10 mins", img: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=300&auto=format&fit=crop&q=80", cat: "Produce" },
  { id: 5, name: "Cadbury Dairy Milk Silk Chocolate", unit: "150g", price: 175, originalPrice: 190, time: "8 mins", img: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=300&auto=format&fit=crop&q=80", cat: "Sweets" },
  { id: 6, name: "Maggi 2-Minute Masala Noodles (4-Pack)", unit: "280g", price: 56, originalPrice: 60, time: "8 mins", img: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=300&auto=format&fit=crop&q=80", cat: "Instant" },
  { id: 7, name: "Coca-Cola Original Soft Drink", unit: "750ml", price: 45, originalPrice: 50, time: "10 mins", img: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=300&auto=format&fit=crop&q=80", cat: "Drinks" },
  { id: 8, name: "Amul Pasteurised Butter", unit: "100g", price: 58, originalPrice: 60, time: "10 mins", img: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=300&auto=format&fit=crop&q=80", cat: "Dairy" }
];

export default function StorefrontHome() {
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState([]);
  const [activeLocation, setActiveLocation] = useState({
    nickname: "Home",
    address: "Nai Basti, Near Petrol Pump, Anantnag",
    lat: 33.7311,
    lng: 75.1487
  });

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);

  const [activeOrder, setActiveOrder] = useState(null);
  const [cancellationSeconds, setCancellationSeconds] = useState(120);

  useEffect(() => {
    const savedCart = localStorage.getItem("dashit_cart");
    if (savedCart) {
      try { setCart(JSON.parse(savedCart)); } catch (e) {}
    }
    const savedActiveOrder = localStorage.getItem("dashit_active_order");
    if (savedActiveOrder) {
      try { setActiveOrder(JSON.parse(savedActiveOrder)); } catch (e) {}
    }

    const hasAskedLocation = localStorage.getItem("dashit_location_asked");
    if (!hasAskedLocation) {
      setIsPermissionModalOpen(true);
    }
  }, []);

  useEffect(() => {
    let timer;
    if (activeOrder && cancellationSeconds > 0) {
      timer = setInterval(() => setCancellationSeconds((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [activeOrder, cancellationSeconds]);

  const saveCart = (newCart) => {
    setCart(newCart);
    localStorage.setItem("dashit_cart", JSON.stringify(newCart));
  };

  const addToCart = (product) => {
    const existing = cart.find((i) => i.id === product.id);
    let updated;
    if (existing) {
      updated = cart.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      updated = [...cart, { ...product, qty: 1 }];
    }
    saveCart(updated);
  };

  const updateQty = (id, delta) => {
    const updated = cart
      .map((i) => (i.id === id ? { ...i, qty: i.qty + delta } : i))
      .filter((i) => i.qty > 0);
    saveCart(updated);
  };

  const cancelOrder = () => {
    if (confirm("Are you sure you want to cancel this order? The 2-minute cancellation window is active.")) {
      localStorage.removeItem("dashit_active_order");
      setActiveOrder(null);
      alert("Order cancelled successfully.");
    }
  };

  const handleGrantLocation = () => {
    localStorage.setItem("dashit_location_asked", "true");
    setIsPermissionModalOpen(false);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setActiveLocation({
            nickname: "Current Location",
            address: "Nai Basti Petrol Pump Area, Anantnag",
            lat: pos.coords.latitude,
            lng: pos.coords.longitude
          });
        },
        () => {
          setIsLocationModalOpen(true);
        }
      );
    } else {
      setIsLocationModalOpen(true);
    }
  };

  const handleSetManually = () => {
    localStorage.setItem("dashit_location_asked", "true");
    setIsPermissionModalOpen(false);
    setIsLocationModalOpen(true);
  };

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-32">
      {/* Blinkit-Style Yellow Top Header Banner */}
      <header className="bg-[#f7c400] px-4 pt-3 pb-4 shadow-sm">
        <div className="max-w-md mx-auto space-y-2.5">
          {/* Top Bar: Delivery Time & Location Selector & Profile Link */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-baseline space-x-1">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-slate-900">dashit in</span>
                <span className="text-xl font-black text-slate-900 tracking-tight">10 minutes</span>
              </div>
              <button
                onClick={() => setIsLocationModalOpen(true)}
                className="flex items-center space-x-1 text-xs font-extrabold text-slate-800 hover:text-slate-950 mt-0.5"
              >
                <span className="truncate max-w-[180px]">{activeLocation.nickname} - {activeLocation.address}</span>
                <span className="text-[10px]">▼</span>
              </button>
            </div>

            <div className="flex items-center space-x-2">
              <Link href="/login" className="p-2 bg-white/90 rounded-full text-slate-900 shadow-sm hover:bg-white transition-all active:scale-95">
                <User className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* Search Input Bar with Voice Mic */}
          <div className="relative flex items-center bg-white rounded-2xl p-2.5 shadow-md border border-amber-200">
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              placeholder='Search "lavas bread", "lays", "milk"...'
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs font-semibold text-slate-900 focus:outline-none placeholder-slate-400"
            />
            <Mic className="w-4 h-4 text-slate-500 ml-2 shrink-0 cursor-pointer hover:text-emerald-600 transition-colors" />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-md mx-auto px-4 mt-4 space-y-5">
        {/* Initial Location Permission Modal */}
        <LocationPermissionModal
          isOpen={isPermissionModalOpen}
          onGrantLocation={handleGrantLocation}
          onSetManually={handleSetManually}
          onClose={() => setIsPermissionModalOpen(false)}
        />

        {/* Interactive Location Picker Modal */}
        <LocationPickerModal
          isOpen={isLocationModalOpen}
          onClose={() => setIsLocationModalOpen(false)}
          onSelectLocation={(loc) => setActiveLocation(loc)}
          currentLocation={activeLocation}
        />

        {/* ACTIVE ORDER PROCESSING & 2-MINUTE CANCELLATION WINDOW CARD */}
        {activeOrder && (
          <div className="bg-amber-50/90 border-2 border-amber-400 rounded-3xl p-4 space-y-3 shadow-md animate-slide-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-amber-500 text-slate-950 rounded-2xl font-bold">
                  <Clock className="w-4 h-4 animate-spin" />
                </div>
                <div>
                  <h3 className="font-extrabold text-xs text-amber-950">ORDER PROCESSING IN DARKSTORE</h3>
                  <p className="text-[11px] text-amber-800 font-semibold">Order #{activeOrder.orderId} • OTP: <b className="font-mono text-slate-950">{activeOrder.otp}</b></p>
                </div>
              </div>
              <span className="bg-amber-200/90 text-amber-950 font-black text-xs px-3 py-1 rounded-full border border-amber-300 font-mono shadow-sm">
                {cancellationSeconds > 0 ? `${Math.floor(cancellationSeconds / 60)}:${cancellationSeconds % 60 < 10 ? '0' : ''}${cancellationSeconds % 60}s` : "Packed"}
              </span>
            </div>

            <div className="bg-white rounded-2xl p-3 text-xs space-y-1.5 border border-amber-200 shadow-sm">
              <div className="flex items-center space-x-1 font-extrabold text-slate-900">
                <span className="text-amber-500">⚡</span>
                <span>2-Minute Edit & Cancel Window Active</span>
              </div>
              <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                {cancellationSeconds > 0
                  ? "Your order is being packed right now! You can add more items to your cart or cancel the order before the 2-minute packing window expires."
                  : "Order packing complete! Awaiting darkstore admin dispatch for delivery."}
              </p>
            </div>

            <div className="flex space-x-2 pt-0.5">
              <Link
                href="/cart"
                className="grow bg-emerald-700 text-white text-center text-xs font-extrabold py-2.5 rounded-2xl hover:bg-emerald-800 transition-all shadow-md active:scale-95"
              >
                + Add More Items to Order
              </Link>
              {cancellationSeconds > 0 && (
                <button
                  onClick={cancelOrder}
                  className="bg-rose-100 hover:bg-rose-600 hover:text-white text-rose-700 text-xs font-extrabold px-3 py-2.5 rounded-2xl transition-all active:scale-95"
                >
                  Cancel Order
                </button>
              )}
            </div>
          </div>
        )}

        {/* CATEGORY GRID SECTIONS */}
        {CATEGORY_SECTIONS.map((sec, secIdx) => (
          <div key={secIdx} className="space-y-3">
            <h2 className="font-extrabold text-sm text-slate-900 tracking-tight">{sec.title}</h2>
            <div className="grid grid-cols-4 gap-2.5">
              {sec.items.map((cat) => (
                <div
                  key={cat.id}
                  onClick={() => setSearch(cat.name.split(" ")[0])}
                  className={`${cat.bg} p-2 rounded-2xl flex flex-col items-center justify-between h-24 border border-slate-200/60 shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-95`}
                >
                  <img src={cat.img} alt={cat.name} className="h-12 w-12 object-contain rounded-lg" />
                  <span className="text-[10px] font-bold text-slate-800 text-center leading-tight line-clamp-2">
                    {cat.name}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* BESTSELLERS & PRODUCT GRID */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-sm text-slate-900 tracking-tight">Market Bestsellers</h2>
            <span className="text-xs font-bold text-emerald-600 cursor-pointer hover:underline">See all &rarr;</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {PRODUCTS.filter((p) => p.name.toLowerCase().includes(search.toLowerCase())).map((p) => {
              const inCart = cart.find((i) => i.id === p.id);
              return (
                <div key={p.id} className="bg-white border border-slate-200 rounded-3xl p-3 flex flex-col justify-between shadow-sm hover:shadow-md transition-all active:scale-[0.99]">
                  {/* Product Image Box */}
                  <div className="relative bg-slate-100/70 rounded-2xl p-4 flex items-center justify-center mb-2 h-32 overflow-hidden">
                    <img src={p.img} alt={p.name} className="h-24 w-24 object-contain transform hover:scale-105 transition-transform" />
                    <span className="absolute bottom-1.5 left-1.5 bg-slate-900/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                      ⚡ {p.time}
                    </span>
                  </div>

                  {/* Product Details */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400">{p.unit}</span>
                    <h4 className="font-bold text-xs text-slate-900 leading-snug line-clamp-2">{p.name}</h4>
                  </div>

                  {/* Price & Add Button */}
                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-100">
                    <div>
                      <span className="text-xs font-extrabold text-slate-900">₹{p.price}</span>
                      <span className="text-[10px] text-slate-400 line-through ml-1">₹{p.originalPrice}</span>
                    </div>

                    {inCart ? (
                      <div className="flex items-center space-x-1.5 bg-emerald-600 text-white rounded-xl px-2 py-1 font-bold text-xs shadow">
                        <button onClick={() => updateQty(p.id, -1)} className="hover:opacity-80">
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span>{inCart.qty}</span>
                        <button onClick={() => updateQty(p.id, 1)} className="hover:opacity-80">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => addToCart(p)}
                        className="bg-emerald-50 hover:bg-emerald-600 hover:text-white text-emerald-700 border border-emerald-300 font-extrabold text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-sm active:scale-95"
                      >
                        ADD
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Floating View Cart Banner */}
      {cartCount > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-40 max-w-md mx-auto">
          <Link
            href="/cart"
            className="flex items-center justify-between bg-emerald-700 text-white p-3.5 rounded-2xl shadow-xl hover:bg-emerald-800 transition-all active:scale-95"
          >
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5" />
              <span className="text-xs font-extrabold">{cartCount} ITEMS • ₹{cartTotal}</span>
            </div>
            <div className="flex items-center space-x-1 text-xs font-extrabold">
              <span>View Cart</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>
      )}

      {/* Persistent Floating Bottom Navigation Bar */}
      <BottomNav cartCount={cartCount} />
    </div>
  );
}
