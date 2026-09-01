import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Search, Clock, MapPin, ArrowRight, CheckCircle2, Plus, Minus, LayoutDashboard, Navigation, ShoppingBag } from "lucide-react";
import LocationPickerModal from "../components/LocationPickerModal";
import BottomNav from "../components/BottomNav";

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

  const [activeLocation, setActiveLocation] = useState({
    nickname: "Home",
    address: "Nai Basti, Near Petrol Pump, Anantnag",
    lat: 33.7311,
    lng: 75.1487
  });
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  const [currentHour] = useState(new Date().getHours());
  const isBakeryTimeOnly = currentHour >= 6 && currentHour < 8;

  useEffect(() => {
    const savedCart = localStorage.getItem("dashit_cart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {}
    }
  }, []);

  const saveCartToStorage = (updatedCart) => {
    setCart(updatedCart);
    localStorage.setItem("dashit_cart", JSON.stringify(updatedCart));
  };

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
    const existing = cart.find((item) => item.id === product.id);
    let updated;
    if (existing) {
      updated = cart.map((item) => (item.id === product.id ? { ...item, qty: item.qty + 1 } : item));
    } else {
      updated = [...cart, { ...product, qty: 1 }];
    }
    saveCartToStorage(updated);
  };

  const updateCartQty = (id, delta) => {
    const updated = cart
      .map((item) => (item.id === id ? { ...item, qty: item.qty + delta } : item))
      .filter((item) => item.qty > 0);
    saveCartToStorage(updated);
  };

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartSubtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans antialiased pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#09090b]/90 backdrop-blur-xl border-b border-zinc-800/80 px-4 py-3">
        <div className="max-w-md mx-auto space-y-2.5">
          {/* Quick Access Portal links */}
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
              <div className="flex items-baseline space-x-0.5 text-2xl font-black tracking-tight">
                <span className="text-orange-500">DASH</span>
                <span className="text-sky-400">it</span>
                <span className="text-[9px] text-zinc-400 font-mono ml-2 uppercase tracking-wider bg-zinc-900 px-2 py-0.5 rounded-full border border-zinc-800">10-MIN</span>
              </div>
              <div className="flex items-center space-x-1.5 text-xs text-zinc-400 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-orange-500 animate-pulse" />
                <span>Delivery in <strong className="text-zinc-200">13 Mins</strong></span>
              </div>
            </div>

            <button
              onClick={() => setIsLocationModalOpen(true)}
              className="flex items-center space-x-1.5 text-xs bg-zinc-900 hover:bg-zinc-800/80 text-zinc-200 px-3 py-2 rounded-xl border border-zinc-800/90 transition-all"
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

      {/* Main Content */}
      <main className="max-w-md mx-auto px-4 mt-4 space-y-4">
        <LocationPickerModal
          isOpen={isLocationModalOpen}
          onClose={() => setIsLocationModalOpen(false)}
          onSelectLocation={(newLoc) => setActiveLocation(newLoc)}
          currentLocation={activeLocation}
        />

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

        {/* Product Grid */}
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

      {/* Floating View Cart Banner */}
      {cartCount > 0 && (
        <div className="fixed bottom-16 left-4 right-4 z-40 max-w-md mx-auto">
          <Link
            href="/cart"
            className="flex items-center justify-between bg-orange-500 text-zinc-950 p-3 rounded-2xl shadow-2xl hover:bg-orange-400 transition-all"
          >
            <div className="flex items-center space-x-2">
              <ShoppingBag className="w-5 h-5" />
              <span className="text-xs font-bold">{cartCount} ITEMS • ₹{cartSubtotal}</span>
            </div>
            <div className="flex items-center space-x-1 text-xs font-bold">
              <span>View Cart</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </Link>
        </div>
      )}

      {/* Persistent Bottom Navigation */}
      <BottomNav cartCount={cartCount} />
    </div>
  );
}
