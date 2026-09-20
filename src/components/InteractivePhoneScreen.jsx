import { useState } from "react";
import { Plus, Minus, ShoppingBag, MapPin, Search, Sparkles, Check, ChevronRight } from "lucide-react";

const DEMO_PRODUCTS = [
  {
    id: 1,
    name: "Amul Gold Full Cream Milk",
    unit: "500 ml",
    price: 36,
    badge: "Bestseller",
    cat: "Dairy",
    img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=240&auto=format&fit=crop&q=80",
  },
  {
    id: 2,
    name: "Fresh Kashmiri Lavas Bread",
    unit: "Pack of 4",
    price: 20,
    badge: "Fresh Morning",
    cat: "Bakery",
    img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=240&auto=format&fit=crop&q=80",
  },
  {
    id: 3,
    name: "Lay's Magic Masala",
    unit: "50 g",
    price: 20,
    badge: "Snacks",
    cat: "Snacks",
    img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=240&auto=format&fit=crop&q=80",
  },
  {
    id: 4,
    name: "Mother Dairy Classic Curd",
    unit: "390 g",
    price: 35,
    badge: "Chilled",
    cat: "Dairy",
    img: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=240&auto=format&fit=crop&q=80",
  },
  {
    id: 5,
    name: "Kashmiri Morning Girda",
    unit: "Pack of 2",
    price: 15,
    badge: "Bakery",
    cat: "Bakery",
    img: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=240&auto=format&fit=crop&q=80",
  },
  {
    id: 6,
    name: "Coca-Cola Refreshing Can",
    unit: "300 ml",
    price: 40,
    badge: "Chilled",
    cat: "Drinks",
    img: "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=240&auto=format&fit=crop&q=80",
  },
];

const CATEGORIES = ["All", "Bakery", "Dairy", "Snacks", "Drinks"];

export default function InteractivePhoneScreen() {
  const [cart, setCart] = useState({ 2: 1 }); // Start with 1 Kashmiri Lavas pre-added
  const [activeCategory, setActiveCategory] = useState("All");
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  const triggerToast = (msg) => {
    setToastMessage(msg);
    setShowToast(true);
    clearTimeout(window.__dashit_screen_toast);
    window.__dashit_screen_toast = setTimeout(() => setShowToast(false), 2400);
  };

  const addItem = (id, e) => {
    e?.stopPropagation?.();
    setCart((prev) => {
      const next = { ...prev, [id]: (prev[id] || 0) + 1 };
      return next;
    });
    triggerToast("Added to Cart!");
  };

  const removeItem = (id, e) => {
    e?.stopPropagation?.();
    setCart((prev) => {
      const cur = prev[id] || 0;
      if (cur <= 1) {
        const next = { ...prev };
        delete next[id];
        return next;
      }
      return { ...prev, [id]: cur - 1 };
    });
  };

  const filteredProducts =
    activeCategory === "All"
      ? DEMO_PRODUCTS
      : DEMO_PRODUCTS.filter((p) => p.cat === activeCategory);

  const totalCount = Object.values(cart).reduce((sum, q) => sum + q, 0);
  const totalPrice = Object.entries(cart).reduce((sum, [id, q]) => {
    const p = DEMO_PRODUCTS.find((item) => String(item.id) === String(id));
    return sum + (p ? p.price * q : 0);
  }, 0);

  // Non-cart clicks do nothing
  const handleNoop = (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
  };

  return (
    <div
      onClick={handleNoop}
      className="w-full h-full select-none bg-[#0E121A] text-white flex flex-col font-sans overflow-hidden text-left relative"
      style={{
        borderRadius: "44px",
      }}
    >
      {/* iOS STATUS BAR & DYNAMIC ISLAND MOCKUP */}
      <div className="pt-3 px-6 flex items-center justify-between z-30 shrink-0 text-white/90">
        <span className="text-[11px] font-bold tracking-tight">9:41</span>
        {/* Dynamic Island Pill */}
        <div className="w-24 h-5 bg-black rounded-full flex items-center justify-center space-x-1.5 shadow-sm border border-white/5">
          <div className="w-2.5 h-2.5 rounded-full bg-[#1A1E29] flex items-center justify-center">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-950" />
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/80" />
        </div>
        <div className="flex items-center space-x-1.5 text-[10px]">
          <span className="font-bold">5G</span>
          <div className="w-4 h-2.5 border border-white/80 rounded-xs p-0.5 flex items-center">
            <div className="w-full h-full bg-emerald-400 rounded-2xs" />
          </div>
        </div>
      </div>

      {/* DASHIT APP TOP HEADER */}
      <div className="px-4 pt-2.5 pb-2 z-20 shrink-0 border-b border-white/10 bg-[#0E121A]">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-6 h-6 rounded-lg bg-[#FF5B00] flex items-center justify-center font-black text-xs text-white shadow-xs">
              D
            </div>
            <div>
              <div className="flex items-center space-x-1">
                <span className="text-[11px] font-black tracking-tight text-white leading-tight">
                  KP Road, Anantnag
                </span>
                <span className="text-[9px] text-[#FF5B00] font-bold">▾</span>
              </div>
              <span className="text-[9px] text-slate-400 block font-medium">
                PIN: 192101
              </span>
            </div>
          </div>
          <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 px-2 py-0.5 rounded-full text-[9px] font-black flex items-center space-x-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Fastest Delivery</span>
          </div>
        </div>

        {/* Search Bar */}
        <div
          onClick={handleNoop}
          className="mt-2.5 bg-white/10 border border-white/10 rounded-xl px-3 py-1.5 flex items-center space-x-2 text-slate-300"
        >
          <Search className="w-3.5 h-3.5 text-[#FF5B00]" />
          <span className="text-[10px] font-medium text-slate-300 truncate">
            Search &quot;kashmiri lavas, amul milk...&quot;
          </span>
        </div>
      </div>

      {/* CATEGORY SELECTOR CHIPS */}
      <div className="px-3 py-2 flex space-x-1.5 overflow-x-auto scrollbar-none shrink-0 border-b border-white/5 bg-[#121622]">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setActiveCategory(cat);
            }}
            className={`px-2.5 py-1 rounded-full text-[9.5px] font-bold transition-all shrink-0 cursor-pointer ${
              activeCategory === cat
                ? "bg-[#FF5B00] text-white shadow-xs"
                : "bg-white/5 text-slate-300 hover:bg-white/10"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* PRODUCTS SCROLLABLE FEED */}
      <div className="flex-1 overflow-y-auto px-3 py-2.5 space-y-2 scrollbar-none pb-20">
        <div className="flex items-center justify-between px-1 mb-1">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            {activeCategory === "All" ? "Essential Picks" : activeCategory}
          </span>
          <span className="text-[9px] font-bold text-emerald-400">
            ✓ In Stock
          </span>
        </div>

        {filteredProducts.map((p) => {
          const qty = cart[p.id] || 0;
          return (
            <div
              key={p.id}
              className="bg-[#161B26] border border-white/10 rounded-2xl p-2 flex items-center space-x-2.5 transition-all hover:border-white/20"
            >
              <img
                src={p.img}
                alt={p.name}
                className="w-12 h-12 rounded-xl object-cover shrink-0 bg-white/5"
              />
              <div className="flex-1 min-w-0">
                <p className="text-[10.5px] font-extrabold text-white truncate leading-tight">
                  {p.name}
                </p>
                <p className="text-[9px] text-slate-400 mt-0.5">
                  {p.unit} • {p.badge}
                </p>
                <div className="flex items-center space-x-1.5 mt-1">
                  <span className="text-[11px] font-black text-[#FF5B00]">
                    ₹{p.price}
                  </span>
                </div>
              </div>

              {/* ONLY INTERACTIVE ADD TO CART BUTTON */}
              <div className="shrink-0">
                {qty === 0 ? (
                  <button
                    type="button"
                    onClick={(e) => addItem(p.id, e)}
                    className="bg-[#FF5B00] hover:bg-[#e04f00] text-white text-[10px] font-black px-3 py-1.5 rounded-xl flex items-center space-x-1 shadow-md active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-3 h-3 stroke-[3]" />
                    <span>ADD</span>
                  </button>
                ) : (
                  <div className="bg-[#061838] border border-[#FF5B00] rounded-xl flex items-center text-white overflow-hidden shadow-sm">
                    <button
                      type="button"
                      onClick={(e) => removeItem(p.id, e)}
                      className="px-2 py-1 hover:bg-white/10 text-white active:scale-90 transition-all cursor-pointer"
                    >
                      <Minus className="w-2.5 h-2.5 stroke-[3]" />
                    </button>
                    <span className="px-1.5 text-[10px] font-black text-[#FF5B00]">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => addItem(p.id, e)}
                      className="px-2 py-1 hover:bg-white/10 text-[#FF5B00] active:scale-90 transition-all cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5 stroke-[3]" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* FLOATING CART PILL AT BOTTOM OF PHONE */}
      {totalCount > 0 && (
        <div className="absolute bottom-4 left-3 right-3 z-30 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div
            onClick={(e) => {
              e.stopPropagation();
              triggerToast("Live order available in DASHIT app!");
            }}
            className="bg-gradient-to-r from-[#FF5B00] to-[#FF7A29] text-white p-2.5 rounded-2xl shadow-xl flex items-center justify-between cursor-pointer border border-white/20 active:scale-98 transition-all"
          >
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-lg bg-black/20 flex items-center justify-center">
                <ShoppingBag className="w-3.5 h-3.5 text-white" />
              </div>
              <div>
                <span className="text-[10.5px] font-black block leading-none">
                  {totalCount} {totalCount === 1 ? "Item" : "Items"} • ₹{totalPrice}
                </span>
                <span className="text-[8.5px] text-white/80 block mt-0.5">
                  Direct From Store
                </span>
              </div>
            </div>
            <div className="flex items-center space-x-1 text-[10px] font-black bg-white/20 px-2 py-1 rounded-xl">
              <span>View Cart</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          </div>
        </div>
      )}

      {/* INTERACTIVE TOAST FEEDBACK */}
      {showToast && (
        <div className="absolute top-16 left-4 right-4 z-40 bg-black/90 text-white border border-white/20 rounded-xl px-3 py-1.5 shadow-2xl flex items-center justify-center space-x-1.5 text-[10px] font-bold animate-in fade-in slide-in-from-top-1">
          <Sparkles className="w-3 h-3 text-[#FF5B00]" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HOME INDICATOR BAR */}
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-28 h-1 bg-white/40 rounded-full z-40 pointer-events-none" />
    </div>
  );
}
