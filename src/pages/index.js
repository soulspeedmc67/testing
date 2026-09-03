import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Mic } from "lucide-react";
import AppHeader from "../components/AppHeader";
import CategoryScroller from "../components/CategoryScroller";
import PromoBanner from "../components/PromoBanner";
import CategoryGridSixPack from "../components/CategoryGridSixPack";
import ProductCard from "../components/ProductCard";
import ProductCardSkeleton from "../components/ProductCardSkeleton";
import BottomNav from "../components/BottomNav";
import QuickProductSheet from "../components/QuickProductSheet";
import LocationPickerModal from "../components/LocationPickerModal";
import InteractiveMapModal from "../components/InteractiveMapModal";
import { ALL_PRODUCTS } from "../data/products";
import { reverseGeocodeCoords } from "../lib/maps";

const SEARCH_SUGGESTIONS = [
  '"milk, curd & paneer"',
  '"atta, dal & cooking oil"',
  '"coca cola & cold drinks"',
  '"chips & namkeen snacks"',
  '"chocolates & ice cream"',
  '"fresh kashmiri lavas bread"'
];

export default function StorefrontHome() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [selectedQuickProduct, setSelectedQuickProduct] = useState(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isInteractiveMapOpen, setIsInteractiveMapOpen] = useState(false);
  const [isSearchPulsing, setIsSearchPulsing] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isHighDemand, setIsHighDemand] = useState(false);

  // Smooth blurry suggestion rotation state
  const [suggestionIdx, setSuggestionIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSuggestionIdx((prev) => (prev + 1) % SEARCH_SUGGESTIONS.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);
  const [location, setLocation] = useState({
    nickname: "HOME",
    address: "b-3,jamia appqrtment, Anantnag",
    lat: 33.7311,
    lng: 75.1487
  });

  const handleSelectLocation = (newLoc) => {
    setLocation(newLoc);
    try {
      localStorage.setItem("dashit_user_address", JSON.stringify(newLoc));
    } catch (e) {}
    setIsSearchPulsing(true);
    setTimeout(() => setIsSearchPulsing(false), 600);
  };

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("dashit_cart");
      if (savedCart) setCart(JSON.parse(savedCart));

      const savedAddress = localStorage.getItem("dashit_user_address");
      if (savedAddress) {
        setLocation(JSON.parse(savedAddress));
      } else if (navigator.geolocation) {
        // Auto self-locate user when they open the app for the first time
        navigator.geolocation.getCurrentPosition(
          async (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const geocoded = await reverseGeocodeCoords(lat, lng);
            const userLoc = {
              nickname: geocoded.area || "CURRENT LOCATION",
              address: geocoded.address,
              lat,
              lng
            };
            setLocation(userLoc);
            try {
              localStorage.setItem("dashit_user_address", JSON.stringify(userLoc));
            } catch (e) {}
          },
          () => {},
          { enableHighAccuracy: true, timeout: 8000 }
        );
      }
    } catch (e) {}

    const handleAddressUpdate = () => {
      try {
        const savedAddress = localStorage.getItem("dashit_user_address");
        if (savedAddress) setLocation(JSON.parse(savedAddress));
      } catch (e) {}
    };
    window.addEventListener("dashit_address_updated", handleAddressUpdate);
    return () => window.removeEventListener("dashit_address_updated", handleAddressUpdate);
  }, []);

  const [productsList, setProductsList] = useState(ALL_PRODUCTS);

  useEffect(() => {
    const loadLiveProducts = async () => {
      try {
        const res = await fetch("http://192.168.217.22:5001/api/products");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.products && data.products.length > 0) {
            setProductsList(data.products);
            return;
          }
        }
      } catch (e) {}

      try {
        const res = await fetch("http://localhost:5001/api/products");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.products && data.products.length > 0) {
            setProductsList(data.products);
          }
        }
      } catch (e) {}
    };

    loadLiveProducts();
  }, []);

  // Support ?cat=Snacks navigation from categories page
  useEffect(() => {
    if (router.query.cat) {
      setActiveCategory(router.query.cat);
    }
  }, [router.query.cat]);

  const saveCart = (newCart) => {
    setCart(newCart);
    try {
      localStorage.setItem("dashit_cart", JSON.stringify(newCart));
      window.dispatchEvent(new Event("dashit_cart_updated"));
    } catch (e) {}
  };

  const handleAddToCart = (product) => {
    const pId = String(product.id || product.barcode);
    const existing = cart.find((i) => String(i.id || i.barcode) === pId);
    if (existing) {
      saveCart(cart.map((i) => (String(i.id || i.barcode) === pId ? { ...i, qty: i.qty + 1 } : i)));
    } else {
      saveCart([...cart, { ...product, id: pId, qty: 1 }]);
    }
  };

  const handleUpdateQty = (productId, delta) => {
    const pId = String(productId);
    const item = cart.find((i) => String(i.id || i.barcode) === pId);
    if (!item) return;
    const newQty = item.qty + delta;
    if (newQty <= 0) {
      saveCart(cart.filter((i) => String(i.id || i.barcode) !== pId));
    } else {
      saveCart(cart.map((i) => (String(i.id || i.barcode) === pId ? { ...i, qty: newQty } : i)));
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % SEARCH_PLACEHOLDERS.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  const filteredProducts = productsList.filter((p) => {
    if (activeCategory === "All") return true;
    if (!p.cat) return true;
    const catLower = p.cat.toLowerCase();
    const activeLower = activeCategory.toLowerCase();
    if (activeLower === "snacks") {
      return (
        catLower.includes("snack") ||
        catLower.includes("chip") ||
        catLower.includes("biscuit") ||
        catLower.includes("cookie") ||
        catLower.includes("munch") ||
        catLower.includes("namkeen")
      );
    }
    return catLower === activeLower || catLower.includes(activeLower) || activeLower.includes(catLower);
  });

  return (
    <div className="min-h-screen bg-[#FFFDF5] text-slate-900 font-sans pb-32">
      <Head>
        <title>Dashit — Instant Grocery Delivery in 8 Mins</title>
      </Head>

      {/* 1. TOP DELIVERY BAR (With High Demand Alert Bar & Red Trend Badge) */}
      <AppHeader
        location={location}
        onOpenLocation={() => setIsLocationModalOpen(true)}
        hideStickySearch={true}
        isHighDemand={isHighDemand}
      />

      {/* 2. STICKY SEARCH & CATEGORY BAR (Protected against iPhone status bar clipping on scroll) */}
      <div className="sticky top-0 z-40 bg-[#FFFDF5] border-b border-amber-100/60 shadow-[0_2px_10px_rgba(0,0,0,0.03)] -mt-[env(safe-area-inset-top,0px)] pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-md mx-auto px-4 pt-1.5 pb-2">
          <div
            onClick={() => router.push("/search")}
            className={`relative flex items-center bg-white text-slate-900 rounded-2xl px-3.5 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-200/90 cursor-pointer active:scale-[0.99] transition-all ${
              isSearchPulsing ? "animate-search-pulse ring-2 ring-[#0c831f]/40" : ""
            }`}
          >
            <Search className="w-4 h-4 stroke-[2.5] text-[#061838]/60 mr-2 shrink-0" />
            <span className="text-xs font-bold text-slate-800 select-none shrink-0 mr-1.5">
              Search
            </span>
            <div className="grow overflow-hidden h-5 relative flex items-center">
              <AnimatePresence mode="wait">
                <motion.span
                  key={suggestionIdx}
                  initial={{ opacity: 0, y: 6, filter: "blur(6px)" }}
                  animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                  exit={{ opacity: 0, y: -6, filter: "blur(6px)" }}
                  transition={{ duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
                  className="text-xs font-semibold text-slate-400 select-none truncate block absolute w-full"
                >
                  {SEARCH_SUGGESTIONS[suggestionIdx]}
                </motion.span>
              </AnimatePresence>
            </div>
            <Mic className="w-4 h-4 stroke-[2.5] text-[#FF6B00] ml-auto shrink-0 hover:text-[#0c831f] transition-colors" />
          </div>
        </div>

        <CategoryScroller
          activeCategory={activeCategory}
          onSelectCategory={(cat) => {
            setActiveCategory(cat);
          }}
        />
      </div>

      {/* MAIN BODY CONTENT */}
      <main className="max-w-md mx-auto px-4 pt-3 space-y-5">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, filter: "blur(12px)", y: 12 }}
            animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
            exit={{ opacity: 0, filter: "blur(8px)", y: -8 }}
            transition={{
              duration: 0.36,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="space-y-5"
          >
            {/* Selected Category Header (when activeCategory !== 'All') */}
            {activeCategory !== "All" && (
              <div className="flex items-center justify-between px-1 pt-1 pb-0">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF6B00]" />
                  <h2 className="font-black text-base text-[#061838] tracking-tight">
                    {activeCategory}
                  </h2>
                  <span className="text-xs font-bold text-slate-400">
                    ({filteredProducts.length} items)
                  </span>
                </div>
                <button
                  onClick={() => setActiveCategory("All")}
                  className="text-xs font-black text-[#FF6B00] hover:underline flex items-center space-x-1 cursor-pointer active:scale-95 transition-transform"
                >
                  <span>Show All</span>
                  <span>✕</span>
                </button>
              </div>
            )}

            {/* 4. PROMOTIONAL HERO BANNER (Only visible when activeCategory === 'All') */}
            {activeCategory === "All" && (
              <PromoBanner
                onSelectPromo={(promo) =>
                  setActiveCategory(promo === "Chips & Crisps" ? "Snacks" : promo)
                }
              />
            )}

            {/* 5. 6-PACK CATEGORY GRID (Only visible when activeCategory === 'All') */}
            {activeCategory === "All" && (
              <section className="space-y-2.5">
                <div className="flex items-center justify-between px-1">
                  <h3 className="font-black text-sm text-[#061838] tracking-tight">
                    Explore Categories
                  </h3>
                  <button
                    onClick={() => router.push("/categories")}
                    className="text-xs font-black text-[#FF6B00] hover:underline"
                  >
                    See all →
                  </button>
                </div>
                <CategoryGridSixPack
                  onSelectCategory={(cat) =>
                    setActiveCategory(cat === "Chips" || cat === "Biscuits" ? "Snacks" : cat)
                  }
                />
              </section>
            )}

            {/* 6. PRODUCT SECTION WITH SKELETON SUPPORT */}
            <section className="space-y-3 pt-1">
              <div className="flex items-center justify-between px-1">
                <h3 className="font-black text-base text-slate-900 tracking-tight">
                  {activeCategory === "All" ? "Bestsellers" : activeCategory}
                </h3>
                {activeCategory !== "All" && (
                  <button
                    onClick={() => setActiveCategory("All")}
                    className="text-xs font-black text-[#FF6B00] hover:underline active:scale-95 transition-transform"
                  >
                    Back to All
                  </button>
                )}
              </div>

              {isLoadingProducts ? (
                <div className="grid grid-cols-2 gap-3">
                  {[...Array(6)].map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {filteredProducts.map((p) => {
                    const pId = String(p.id || p.barcode);
                    const inCart = cart.find((i) => String(i.id || i.barcode) === pId);
                    return (
                      <ProductCard
                        key={pId}
                        product={p}
                        qty={inCart ? inCart.qty : 0}
                        onAdd={() => handleAddToCart(p)}
                        onUpdateQty={(id, delta) => handleUpdateQty(id, delta)}
                        onIncrement={() => handleUpdateQty(pId, 1)}
                        onDecrement={() => handleUpdateQty(pId, -1)}
                        onQuickView={() => setSelectedQuickProduct(p)}
                      />
                    );
                  })}
                </div>
              )}
            </section>
          </motion.div>
        </AnimatePresence>
      </main>

      {/* 7. QUICK PRODUCT SHEET (Vaul gesture sheet) */}
      <QuickProductSheet
        product={selectedQuickProduct}
        isOpen={Boolean(selectedQuickProduct)}
        onClose={() => setSelectedQuickProduct(null)}
        cartQty={
          selectedQuickProduct
            ? cart.find((i) => i.id === selectedQuickProduct.id)?.qty || 0
            : 0
        }
        onAdd={() => selectedQuickProduct && handleAddToCart(selectedQuickProduct)}
        onIncrement={() => selectedQuickProduct && handleUpdateQty(selectedQuickProduct.id, 1)}
        onDecrement={() => selectedQuickProduct && handleUpdateQty(selectedQuickProduct.id, -1)}
      />

      {/* 8. LOCATION PICKER DRAWER */}
      <LocationPickerModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        currentLocation={location}
        onSelectLocation={handleSelectLocation}
      />

      {/* 9. INTERACTIVE MAP MODAL */}
      <InteractiveMapModal
        isOpen={isInteractiveMapOpen}
        onClose={() => setIsInteractiveMapOpen(false)}
        onConfirmLocation={handleSelectLocation}
      />


    </div>
  );
}
