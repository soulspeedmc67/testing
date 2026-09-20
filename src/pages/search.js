import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ArrowLeft, X, Plus, Minus, Heart, Mic, ShoppingBag, ArrowRight } from "lucide-react";
import SEO from "../components/SEO";
import confetti from "canvas-confetti";
import BottomNav from "../components/BottomNav";
import ProductCardStepper from "../components/ProductCardStepper";
import FloatingCartBar from "../components/FloatingCartBar";
import QuickProductSheet from "../components/QuickProductSheet";
import VoiceSearchModal from "../components/VoiceSearchModal";
import { EmptySearchState } from "../components/ui/EmptyState";
import { hapticLight, hapticMedium } from "../lib/haptics";
import { goBack } from "../lib/navigation";
import { ALL_PRODUCTS } from "../data/products";
import { watchProducts } from "../lib/db";

const POPULAR_SEARCH_CHIPS = ["Milk", "Lavas Bread", "Chips", "Apples", "Silk Chocolate", "Maggi", "Butter", "Biscuits"];

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [selectedQuickProduct, setSelectedQuickProduct] = useState(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [allProducts, setAllProducts] = useState(ALL_PRODUCTS);

  useEffect(() => {
    const unsub = watchProducts((liveList) => {
      if (liveList && liveList.length > 0) {
        setAllProducts(liveList);
      }
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  useEffect(() => {
    const savedCart = localStorage.getItem("dashit_cart");
    if (savedCart) {
      try { setCart(JSON.parse(savedCart)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (router.isReady) {
      if (router.query.voice === "true") {
        setIsVoiceModalOpen(true);
      }
      if (router.query.q) {
        setQuery(String(router.query.q));
      }
    }
  }, [router.isReady, router.query]);

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

  const cleanQuery = (query || "").trim().toLowerCase();
  const filteredProducts = cleanQuery
    ? allProducts.filter((p) =>
        (p.name || "").toLowerCase().includes(cleanQuery) ||
        (p.cat || "").toLowerCase().includes(cleanQuery) ||
        (p.brand || "").toLowerCase().includes(cleanQuery)
      )
    : allProducts.slice(0, 16);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);
  const cartTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-32 dark:bg-surface dark:text-content">
      <SEO
        title="Search Groceries"
        description="Search groceries, Kashmiri bakery, dairy, beverages, and daily essentials on DASHIT Anantnag."
        canonical="/search/"
        noindex="follow"
      />
      {/* Search Header Bar with Smooth Entry Animation & Safe Area */}
      <motion.header
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 350, damping: 28 }}
        className="sticky top-0 z-40 bg-[#061838] px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3.5 shadow-md"
      >
        <div className="max-w-md md:max-w-4xl mx-auto flex items-center space-x-3">
          <motion.button
            whileTap={{ scale: 0.88 }}
            type="button"
            onClick={() => goBack(router, "/shop")}
            className="p-1.5 rounded-full text-slate-300 hover:text-white transition-colors cursor-pointer dark:text-content-faint"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </motion.button>

          <motion.div
            initial={{ scale: 0.94, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 26, delay: 0.05 }}
            className={`relative grow flex items-center bg-white rounded-full px-4 py-2 shadow-inner transition-all ${
              isInputFocused ? "ring-2 ring-[#FF5B00]" : ""
            }`}
          >
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0 dark:text-content-faint" />
            <input
              type="text"
              placeholder="Search 'milk', 'chips', 'bread'..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onFocus={() => setIsInputFocused(true)}
              onBlur={() => setIsInputFocused(false)}
              className="w-full bg-transparent text-sm font-semibold text-slate-800 placeholder-slate-400 focus:outline-none dark:text-content dark:placeholder-content-faint"
              autoFocus
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="p-1 text-slate-400 hover:text-slate-600 ml-1 dark:text-content-faint dark:hover:text-content-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </motion.div>

          <motion.button
            whileTap={{ scale: 0.88 }}
            type="button"
            onClick={() => setIsVoiceModalOpen(true)}
            className="p-2 rounded-full bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <Mic className="w-5 h-5" />
          </motion.button>
        </div>
      </motion.header>

      {/* Voice Search Modal Component */}
      <VoiceSearchModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onResult={(spokenText) => {
          setQuery(spokenText);
        }}
      />

      <main className="max-w-md md:max-w-4xl mx-auto px-4 mt-4 space-y-4">
        {/* Popular Quick Search Chips */}
        {!query && (
          <div className="space-y-2">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider dark:text-content-faint">Popular Searches</h3>
            <div className="flex flex-wrap gap-2">
              {POPULAR_SEARCH_CHIPS.map((chip, idx) => (
                <button
                  key={idx}
                  onClick={() => setQuery(chip)}
                  className="bg-white border border-slate-200 hover:border-[#FF5B00] text-xs font-bold text-slate-700 px-3.5 py-1.5 rounded-full shadow-sm active:scale-95 transition-all dark:bg-surface-raised dark:border-line dark:text-content-secondary"
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
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider dark:text-content-faint">
              {query ? `Search Results for "${query}" (${filteredProducts.length})` : "All Products"}
            </h3>
          </div>

          {filteredProducts.length === 0 ? (
            <EmptySearchState query={query} onSelectChip={(chip) => setQuery(chip)} />
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {filteredProducts.map((p) => {
                const inCart = cart.find((i) => i.id === p.id);
                return (
                  <div key={p.id} className="bg-white border border-slate-200/90 rounded-3xl p-3 flex flex-col justify-between shadow-sm space-y-2 dark:bg-surface-raised dark:border-line/90">
                    <button
                      onClick={() => setSelectedQuickProduct(p)}
                      className="bg-slate-50 rounded-2xl p-2 h-28 flex items-center justify-center cursor-pointer w-full dark:bg-surface-raised"
                    >
                      <img src={p.img} alt={p.name} className="h-20 w-20 object-contain rounded-lg transform hover:scale-105 transition-transform" />
                    </button>

                    <div>
                      <span className="text-[9px] font-bold text-slate-400 dark:text-content-faint">{p.unit}</span>
                      <button
                        onClick={() => setSelectedQuickProduct(p)}
                        className="text-left w-full cursor-pointer"
                      >
                        <h4 className="font-bold text-xs text-slate-900 leading-snug line-clamp-2 hover:text-[#FF5B00] dark:text-content">{p.name}</h4>
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-line-soft">
                      <span className="text-xs font-black text-slate-900 font-mono dark:text-content">₹{p.price}</span>

                      <div className="w-16">
                        <ProductCardStepper
                          product={p}
                          qty={inCart ? inCart.qty : 0}
                          onAdd={addToCart}
                          onUpdateQty={updateQty}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>

      {/* Quick Interactive Product Detail Sheet */}
      <QuickProductSheet
        product={selectedQuickProduct}
        isOpen={!!selectedQuickProduct}
        onClose={() => setSelectedQuickProduct(null)}
        cart={cart}
        onAddToCart={addToCart}
        onUpdateQty={updateQty}
      />

    </div>
  );
}
