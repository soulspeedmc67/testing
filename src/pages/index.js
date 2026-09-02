import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import { Search, MapPin, ArrowRight, Plus, Minus, Mic, User, ShoppingBag, Heart, ChevronDown, Sparkles, Apple, Droplet, Coffee, Cookie, Home as HomeIcon, Tag } from "lucide-react";
import confetti from "canvas-confetti";
import LocationPickerModal from "../components/LocationPickerModal";
import LocationPermissionModal from "../components/LocationPermissionModal";
import BottomNav from "../components/BottomNav";

const CATEGORY_TABS = [
  { id: "All", label: "All", icon: Sparkles, bg: "bg-amber-100 text-amber-800" },
  { id: "Fruits", label: "Fruits & Ve...", icon: Apple, bg: "bg-emerald-100 text-emerald-800" },
  { id: "Dairy", label: "Dairy", icon: Droplet, bg: "bg-sky-100 text-sky-800" },
  { id: "Drinks", label: "Drinks", icon: Coffee, bg: "bg-orange-100 text-amber-900" },
  { id: "Snacks", label: "Snacks", icon: Cookie, bg: "bg-rose-100 text-rose-800" },
];

const CATEGORY_GRID = [
  { title: "Fruits & Vegetables", img: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=200&auto=format&fit=crop&q=80" },
  { title: "Dairy", img: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200&auto=format&fit=crop&q=80" },
  { title: "Drinks", img: "https://images.unsplash.com/photo-1544145945-f90425340c7e?w=200&auto=format&fit=crop&q=80" },
  { title: "Snacks", img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=200&auto=format&fit=crop&q=80" },
  { title: "Household", img: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?w=200&auto=format&fit=crop&q=80" },
  { title: "Offers", img: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?w=200&auto=format&fit=crop&q=80" }
];

const PRODUCTS = [
  { id: 1, name: "Lay's Magic Masala Potato Chips", unit: "50g", price: 20, originalPrice: 20, time: "10 mins", img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300&auto=format&fit=crop&q=80", cat: "Snacks" },
  { id: 2, name: "Fresh Kashmiri Lavas Bread (4 pcs)", unit: "4 pcs", price: 30, originalPrice: 40, time: "10 mins", img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=300&auto=format&fit=crop&q=80", cat: "Dairy" },
  { id: 3, name: "Amul Taaza Fresh Toned Milk 1L", unit: "1L", price: 66, originalPrice: 70, time: "10 mins", img: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300&auto=format&fit=crop&q=80", cat: "Dairy" },
  { id: 4, name: "Fresh Kashmiri Red Apples (1kg)", unit: "1 kg", price: 140, originalPrice: 170, time: "10 mins", img: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=300&auto=format&fit=crop&q=80", cat: "Fruits" },
  { id: 5, name: "Cadbury Dairy Milk Silk Chocolate", unit: "150g", price: 175, originalPrice: 190, time: "8 mins", img: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=300&auto=format&fit=crop&q=80", cat: "Snacks" },
  { id: 6, name: "Maggi 2-Minute Masala Noodles (4-Pack)", unit: "280g", price: 56, originalPrice: 60, time: "8 mins", img: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=300&auto=format&fit=crop&q=80", cat: "Snacks" }
];

export default function StorefrontHome() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [cart, setCart] = useState([]);
  const [favorites, setFavorites] = useState({});

  const [activeLocation, setActiveLocation] = useState({
    nickname: "HOME",
    address: "Add address",
    lat: 33.7311,
    lng: 75.1487
  });

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isPermissionModalOpen, setIsPermissionModalOpen] = useState(false);

  useEffect(() => {
    const savedCart = localStorage.getItem("dashit_cart");
    if (savedCart) {
      try { setCart(JSON.parse(savedCart)); } catch (e) {}
    }

    const hasAskedLocation = localStorage.getItem("dashit_location_asked");
    if (!hasAskedLocation) {
      setIsPermissionModalOpen(true);
    }
  }, []);

  const saveCart = (newCart) => {
    if (cart.length === 0 && newCart.length > 0) {
      try {
        confetti({
          particleCount: 100,
          spread: 60,
          origin: { y: 0.85 }
        });
      } catch (e) {}
    }
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

  const handleGrantLocation = () => {
    localStorage.setItem("dashit_location_asked", "true");
    setIsPermissionModalOpen(false);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setActiveLocation({
            nickname: "HOME",
            address: "Nai Basti, Anantnag",
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
      {/* 1. TOP HEADER BAR (EXACT DARK NAVY COLOR #091b36 FROM REFERENCE SCREENSHOT) */}
      <header className="bg-[#091b36] text-white px-4 pt-4 pb-5 shadow-lg">
        <div className="max-w-md mx-auto space-y-3">
          {/* Line 1 & Line 2: "Dash It in 10 minutes" + Avatar */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-300">Dash It in</p>
              <h1 className="text-3xl font-black text-white tracking-tight leading-tight">10 minutes</h1>
            </div>

            {/* Orange Avatar Circle */}
            <Link href="/login" className="w-10 h-10 rounded-full bg-[#f97316] text-white font-extrabold text-sm flex items-center justify-center shadow-md border-2 border-white/20 hover:opacity-90 transition-opacity">
              AA
            </Link>
          </div>

          {/* Line 3: Location Dropdown "HOME · Add address ˅" */}
          <button
            onClick={() => setIsLocationModalOpen(true)}
            className="flex items-center space-x-1.5 text-xs font-bold text-slate-200 hover:text-white transition-colors"
          >
            <span>{activeLocation.nickname} · {activeLocation.address}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {/* Line 4: Search Bar "Search for milk, snacks, drinks..." */}
          <div className="relative flex items-center bg-white rounded-full p-3 shadow-md">
            <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0 ml-1" />
            <input
              type="text"
              placeholder="Search for milk, snacks, drinks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-xs font-semibold text-slate-900 focus:outline-none placeholder-slate-400"
            />
            <Mic className="w-4 h-4 text-slate-500 mr-1 shrink-0 cursor-pointer hover:text-[#ea580c]" />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 mt-4 space-y-5">
        {/* Modals */}
        <LocationPermissionModal
          isOpen={isPermissionModalOpen}
          onGrantLocation={handleGrantLocation}
          onSetManually={handleSetManually}
          onClose={() => setIsPermissionModalOpen(false)}
        />

        <LocationPickerModal
          isOpen={isLocationModalOpen}
          onClose={() => setIsLocationModalOpen(false)}
          onSelectLocation={(loc) => setActiveLocation(loc)}
          currentLocation={activeLocation}
        />

        {/* 2. CATEGORY ICON PILLS (ALL, FRUITS & VEG, DAIRY, DRINKS, SNACKS) */}
        <div className="flex justify-between items-center space-x-2 overflow-x-auto scrollbar-none py-1">
          {CATEGORY_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex flex-col items-center space-y-1.5 shrink-0"
              >
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-sm transition-all ${
                    isActive ? "ring-2 ring-[#ea580c] scale-105 " + tab.bg : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  }`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <span className={`text-[11px] font-extrabold ${isActive ? "text-[#ea580c]" : "text-slate-700"}`}>
                  {tab.label}
                </span>
                {isActive && <div className="w-4 h-0.5 bg-[#ea580c] rounded-full" />}
              </button>
            );
          })}
        </div>

        {/* 3. HERO BANNER ("Groceries in 10 minutes") */}
        <div className="bg-[#091b36] rounded-3xl p-5 text-white relative overflow-hidden shadow-xl flex items-center justify-between border border-slate-700/50">
          <div className="space-y-1 z-10 max-w-[200px]">
            <h3 className="font-black text-xl leading-tight">Groceries in 10 minutes</h3>
            <p className="text-xs font-semibold text-slate-300">Milk, fruit and daily essentials</p>
            <button className="bg-white text-slate-950 font-black text-xs px-4 py-2 rounded-full mt-2 shadow hover:bg-slate-100 transition-colors">
              Shop now
            </button>
          </div>

          <div className="w-24 h-24 rounded-full bg-amber-700/40 absolute -right-4 -bottom-4 blur-xl pointer-events-none" />
        </div>

        {/* 4. SHOP BY CATEGORY GRID */}
        <div id="categories" className="space-y-3 pt-2">
          <h2 className="font-black text-base text-slate-900 tracking-tight">Shop by category</h2>
          <div className="grid grid-cols-4 gap-3">
            {CATEGORY_GRID.map((c, idx) => (
              <div
                key={idx}
                className="flex flex-col items-center text-center space-y-1.5 cursor-pointer group active:scale-95 transition-transform"
              >
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200 shadow-sm group-hover:shadow-md transition-shadow">
                  <img src={c.img} alt={c.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                </div>
                <span className="text-[10px] font-extrabold text-slate-800 leading-snug">{c.title}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 5. TOP DEALS PRODUCT RAILS */}
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
                  </div>

                  <div className="space-y-0.5">
                    <span className="text-[10px] font-extrabold text-slate-400">{p.unit}</span>
                    <Link href={`/product/${p.id}`}>
                      <h4 className="font-extrabold text-xs text-slate-900 leading-snug line-clamp-2 hover:text-[#0c831f]">
                        {p.name}
                      </h4>
                    </Link>
                  </div>

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

      {/* Floating View Cart Banner (Matching Screenshot Dark Navy View Cart Bar) */}
      {cartCount > 0 && (
        <div className="fixed bottom-[64px] left-4 right-4 z-40 max-w-md mx-auto animate-bottom-sheet">
          <Link
            href="/cart"
            className="flex items-center justify-between bg-[#091b36] text-white p-3.5 rounded-2xl shadow-2xl hover:bg-slate-900 transition-all active:scale-98 border border-slate-700/60"
          >
            <div className="space-y-0.5">
              <span className="text-xs font-black block">View cart</span>
              <span className="text-[11px] font-bold text-slate-300">{cartCount} items • ₹{cartTotal}.00</span>
            </div>
            <div className="p-1 rounded-full text-white">
              <ArrowRight className="w-5 h-5" />
            </div>
          </Link>
        </div>
      )}

      {/* Floating Bottom Navigation */}
      <BottomNav cartCount={cartCount} />
    </div>
  );
}
