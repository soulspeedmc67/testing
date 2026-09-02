import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { Search, ArrowLeft, X, Plus, Minus, Heart, Mic } from "lucide-react";
import confetti from "canvas-confetti";
import BottomNav from "../components/BottomNav";

const ALL_SEARCH_PRODUCTS = [
  { id: 1, name: "Lay's Magic Masala Potato Chips", unit: "50g", price: 20, originalPrice: 20, time: "10 mins", img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=300&auto=format&fit=crop&q=80", cat: "Snacks" },
  { id: 2, name: "Fresh Kashmiri Lavas Bread (4 pcs)", unit: "4 pcs", price: 30, originalPrice: 40, time: "10 mins", img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=300&auto=format&fit=crop&q=80", cat: "Bakery" },
  { id: 3, name: "Amul Taaza Fresh Toned Milk 1L", unit: "1L", price: 66, originalPrice: 70, time: "10 mins", img: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=300&auto=format&fit=crop&q=80", cat: "Grocery" },
  { id: 4, name: "Fresh Kashmiri Red Apples (1kg)", unit: "1 kg", price: 140, originalPrice: 170, time: "10 mins", img: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=300&auto=format&fit=crop&q=80", cat: "Grocery" },
  { id: 5, name: "Cadbury Dairy Milk Silk Chocolate", unit: "150g", price: 175, originalPrice: 190, time: "8 mins", img: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=300&auto=format&fit=crop&q=80", cat: "Grocery" },
  { id: 6, name: "Maggi 2-Minute Masala Noodles (4-Pack)", unit: "280g", price: 56, originalPrice: 60, time: "8 mins", img: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=300&auto=format&fit=crop&q=80", cat: "Snacks" },
  { id: 7, name: "Amul Pasteurised Salted Butter 100g", unit: "100g", price: 58, originalPrice: 60, time: "10 mins", img: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=300&auto=format&fit=crop&q=80", cat: "Grocery" }
];

const POPULAR_SEARCH_CHIPS = ["Milk", "Lavas Bread", "Chips", "Apples", "Silk Chocolate", "Maggi"];

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const savedCart = localStorage.getItem("dashit_cart");
    if (savedCart) {
      try { setCart(JSON.parse(savedCart)); } catch (e) {}
    }
  }, []);

  const saveCart = (newCart) => {
    if (cart.length === 0 && newCart.length > 0) {
      try { confetti({ particleCount: 80, spread: 60, origin: { y: 0.85 } }); } catch (e) {}
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

  const filteredProducts = ALL_SEARCH_PRODUCTS.filter((p) =>
    p.name.toLowerCase().includes(query.toLowerCase()) || p.cat.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-32">
      {/* Search Header Bar */}
      <header className="sticky top-0 z-40 bg-[#061838] px-4 py-3.5 shadow-md">
        <div className="max-w-md mx-auto flex items-center space-x-3">
          <Link href="/" className="p-1 rounded-full text-slate-300 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>

          <div className="relative grow flex items-center bg-white rounded-full px-4 py-2 shadow-inner">
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
            <input
              type="text"
              autoFocus
              placeholder="Search for milk, chips, bread, apples..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-transparent text-xs font-bold text-slate-900 focus:outline-none placeholder-slate-400"
            />
            {query ? (
              <button onClick={() => setQuery("")} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-3.5 h-3.5" />
              </button>
            ) : (
              <Mic className="w-4 h-4 text-slate-500" />
            )}
          </div>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 mt-4 space-y-4">
        {/* Popular Quick Search Chips */}
        {!query && (
          <div className="space-y-2">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Popular Searches</h3>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SEARCH_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => setQuery(chip)}
                  className="bg-white border border-slate-200 hover:border-[#0c831f] text-xs font-bold text-slate-700 px-3.5 py-1.5 rounded-full shadow-sm active:scale-95 transition-all"
                >
                  {chip}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Live Filtered Search Results */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
              {query ? `Search Results for "${query}" (${filteredProducts.length})` : "All Products"}
            </h3>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="bg-white rounded-3xl p-8 text-center space-y-2 border border-slate-200 shadow-sm">
              <Search className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-xs font-extrabold text-slate-700">No items found matching "{query}"</p>
              <p className="text-[11px] text-slate-400">Try searching for "Milk", "Lavas", "Chips", or "Apples"</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map((p) => {
                const inCart = cart.find((i) => i.id === p.id);
                return (
                  <div key={p.id} className="bg-white border border-slate-200 rounded-3xl p-3 flex flex-col justify-between shadow-sm space-y-2">
                    <div className="bg-slate-50 rounded-2xl p-2 h-28 flex items-center justify-center">
                      <img src={p.img} alt={p.name} className="h-20 w-20 object-contain rounded-lg" />
                    </div>

                    <div>
                      <span className="text-[9px] font-bold text-slate-400">{p.unit}</span>
                      <h4 className="font-bold text-xs text-slate-900 leading-snug line-clamp-2">{p.name}</h4>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                      <span className="text-xs font-black text-slate-900 font-mono">₹{p.price}</span>

                      {inCart ? (
                        <div className="flex items-center space-x-1 bg-[#0c831f] text-white rounded-xl px-2 py-1 font-extrabold text-xs shadow">
                          <button onClick={() => updateQty(p.id, -1)}>
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span>{inCart.qty}</span>
                          <button onClick={() => updateQty(p.id, 1)}>
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => addToCart(p)}
                          className="bg-emerald-50 hover:bg-[#0c831f] hover:text-white text-[#0c831f] border border-emerald-300 font-black text-xs px-3 py-1.5 rounded-xl transition-all shadow-sm active:scale-95"
                        >
                          ADD
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
