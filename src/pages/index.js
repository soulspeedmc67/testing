import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Search, Clock, MapPin, ArrowRight, CheckCircle2, Plus, Minus, Mic, User, ShoppingBag, Coins, Sparkles, Heart } from "lucide-react";
import LocationPickerModal from "../components/LocationPickerModal";
import LocationPermissionModal from "../components/LocationPermissionModal";
import AnimatedSearchBar from "../components/AnimatedSearchBar";
import CategoryNavigationTabs from "../components/CategoryNavigationTabs";
import PromoCardsCarousel from "../components/PromoCardsCarousel";
import CampaignSection from "../components/CampaignSection";
import FloatingDeliveryBanner from "../components/FloatingDeliveryBanner";
import BottomNav from "../components/BottomNav";

const MapTracking = dynamic(() => import("../components/MapTracking"), { ssr: false });

const PRODUCTS = [
  { id: 1, name: "Lay's Magic Masala Potato Chips", unit: "50g", price: 20, originalPrice: 20, time: "10 mins", img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300&auto=format&fit=crop&q=80", cat: "Electronics" },
  { id: 2, name: "Fresh Kashmiri Lavas Bread (4 pcs)", unit: "4 pcs", price: 30, originalPrice: 40, time: "10 mins", img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=300&auto=format&fit=crop&q=80", cat: "Beauty" },
  { id: 3, name: "Amul Taaza Fresh Toned Milk 1L", unit: "1L", price: 66, originalPrice: 70, time: "10 mins", img: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300&auto=format&fit=crop&q=80", cat: "Ganeshotsav" },
  { id: 4, name: "Fresh Kashmiri Red Apples (1kg)", unit: "1 kg", price: 140, originalPrice: 170, time: "10 mins", img: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=300&auto=format&fit=crop&q=80", cat: "Gifting" },
  { id: 5, name: "Cadbury Dairy Milk Silk Chocolate", unit: "150g", price: 175, originalPrice: 190, time: "8 mins", img: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=300&auto=format&fit=crop&q=80", cat: "Gifting" },
  { id: 6, name: "Maggi 2-Minute Masala Noodles (4-Pack)", unit: "280g", price: 56, originalPrice: 60, time: "8 mins", img: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=300&auto=format&fit=crop&q=80", cat: "Electronics" }
];

export default function StorefrontHome() {
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [cart, setCart] = useState([]);
  const [favorites, setFavorites] = useState({});

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

  const toggleFav = (id) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const cancelOrder = () => {
    if (confirm("Are you sure you want to cancel this order? The 2-minute packing window is active.")) {
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

  const filteredProducts = PRODUCTS.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === "All" || p.cat === activeTab;
    return matchesSearch && matchesTab;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-32">
      {/* 1. Header (Matching Brief Section 2) */}
      <header className="bg-[#f7c400] px-4 pt-3.5 pb-4 shadow-md transition-colors duration-300">
        <div className="max-w-md mx-auto space-y-3">
          {/* Top Row: Delivery ETA (Blinkit/DASHit in 25 minutes) & Status Pill & Rewards & Profile */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {/* Creative Outfit Logo Badge */}
              <div className="bg-white px-3 py-1 rounded-2xl logo-box-shadow border border-white flex items-center space-x-0.5">
                <span className="font-logo font-black text-xl text-[#ea580c] logo-shadow">DASH</span>
                <span className="font-logo font-black text-xl text-[#0284c7] logo-shadow">it</span>
              </div>

              <div>
                <div className="flex items-baseline space-x-1">
                  <span className="text-[9px] uppercase tracking-wider font-extrabold text-slate-900">in</span>
                  <span className="text-sm font-black text-slate-900 tracking-tight">25 minutes</span>
                  <span className="bg-emerald-800 text-white font-black text-[8px] px-1.5 py-0.2 rounded-full uppercase tracking-wider">
                    SURGE
                  </span>
                </div>
                <button
                  onClick={() => setIsLocationModalOpen(true)}
                  className="flex items-center space-x-1 text-[11px] font-extrabold text-slate-800 hover:text-slate-950 mt-0.5"
                >
                  <span className="truncate max-w-[130px]">{activeLocation.nickname} - {activeLocation.address}</span>
                  <span className="text-[9px]">▼</span>
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <div className="p-2 bg-amber-100 text-amber-900 rounded-2xl flex items-center space-x-1 shadow-sm border border-amber-300">
                <Coins className="w-3.5 h-3.5 fill-amber-500 text-amber-600" />
                <span className="text-[11px] font-black font-mono">₹0</span>
              </div>

              <Link href="/login" className="p-2 bg-white rounded-2xl text-slate-900 shadow-sm hover:bg-slate-100 transition-all active:scale-95">
                <User className="w-4 h-4" />
              </Link>
            </div>
          </div>

          {/* 2. Animated Search Bar */}
          <AnimatedSearchBar
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            isFocused={isSearchFocused}
          />
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-md mx-auto px-4 mt-3 space-y-5">
        {/* 3. Category Navigation Tabs */}
        <CategoryNavigationTabs
          activeTab={activeTab}
          onSelectTab={(tabId) => setActiveTab(tabId)}
        />

        {/* Initial Location Permission Modal */}
        <LocationPermissionModal
          isOpen={isPermissionModalOpen}
          onGrantLocation={handleGrantLocation}
          onSetManually={handleSetManually}
          onClose={() => setIsPermissionModalOpen(false)}
        />

        {/* Location Selection Sheet */}
        <LocationPickerModal
          isOpen={isLocationModalOpen}
          onClose={() => setIsLocationModalOpen(false)}
          onSelectLocation={(loc) => setActiveLocation(loc)}
          currentLocation={activeLocation}
        />

        {/* ACTIVE ORDER PACKING CARD */}
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
                className="grow bg-[#0c831f] text-white text-center text-xs font-extrabold py-2.5 rounded-2xl hover:bg-emerald-800 transition-all shadow-md active:scale-95"
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

        {/* 4. Horizontal Promotional Cards (Tall rounded cards with partial right reveal) */}
        <PromoCardsCarousel />

        {/* 5. Teacher's Day / Ganeshotsav Themed Campaign Section */}
        <CampaignSection onAddToCart={addToCart} cart={cart} />

        {/* 6. Top Deals Product Rails (Matching Brief Section 5) */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between">
            <h2 className="font-black text-base text-slate-900 tracking-tight">Top Deals</h2>
            <span className="text-xs font-extrabold text-[#0c831f] cursor-pointer hover:underline">See all &rarr;</span>
          </div>

          <div className="flex space-x-3 overflow-x-auto scrollbar-none pb-2">
            {filteredProducts.map((p) => {
              const inCart = cart.find((i) => i.id === p.id);
              const isFav = favorites[p.id];
              return (
                <div
                  key={p.id}
                  className="w-[145px] shrink-0 bg-white border border-slate-200/90 rounded-3xl p-3 flex flex-col justify-between shadow-sm hover:shadow-md transition-all relative"
                >
                  {/* Product Image Container */}
                  <div className="relative bg-slate-50 rounded-2xl p-3 flex items-center justify-center h-32 overflow-hidden mb-1">
                    <button
                      onClick={() => toggleFav(p.id)}
                      className="absolute top-1.5 right-1.5 p-1 bg-white/90 rounded-full shadow-sm text-slate-400 hover:text-rose-500 transition-colors"
                    >
                      <Heart className={`w-3.5 h-3.5 ${isFav ? "fill-rose-500 text-rose-500" : ""}`} />
                    </button>

                    <Link href={`/product/${p.id}`}>
                      <img src={p.img} alt={p.name} className="h-24 w-24 object-contain rounded-lg transform hover:scale-105 transition-transform" />
                    </Link>

                    <div className="absolute bottom-1 flex space-x-1">
                      <div className="w-1 h-1 bg-slate-900 rounded-full" />
                      <div className="w-1 h-1 bg-slate-300 rounded-full" />
                      <div className="w-1 h-1 bg-slate-300 rounded-full" />
                    </div>
                  </div>

                  {/* Quantity Unit & Title */}
                  <div className="space-y-0.5">
                    <span className="text-[10px] font-extrabold text-slate-400">{p.unit}</span>
                    <Link href={`/product/${p.id}`}>
                      <h4 className="font-extrabold text-xs text-slate-900 leading-snug line-clamp-2 hover:text-[#0c831f]">
                        {p.name}
                      </h4>
                    </Link>
                  </div>

                  {/* Price & ADD Button with Spring Motion Physics */}
                  <div className="mt-3 flex items-center justify-between pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-xs font-black text-slate-900">₹{p.price}</span>
                      <span className="text-[9px] text-slate-400 line-through block">₹{p.originalPrice}</span>
                    </div>

                    {inCart ? (
                      <div className="flex items-center space-x-1 bg-[#0c831f] text-white rounded-xl px-2 py-1 font-extrabold text-xs shadow">
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
                        className="bg-emerald-50 hover:bg-[#0c831f] hover:text-white text-[#0c831f] border border-emerald-300 font-black text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-sm active:scale-[0.94]"
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

      {/* 8. Floating Free Delivery Banner */}
      <FloatingDeliveryBanner />

      {/* 7. Floating Bottom Navigation */}
      <BottomNav cartCount={cartCount} />
    </div>
  );
}
