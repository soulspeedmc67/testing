import { useState, useEffect, useMemo } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Mic, Sparkles, Flame } from "lucide-react";
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
import VariantSelectorModal from "../components/VariantSelectorModal";
import VoiceSearchModal from "../components/VoiceSearchModal";
import { ALL_PRODUCTS } from "../data/products";
import { reverseGeocodeCoords } from "../lib/maps";
import { watchProducts } from "../lib/db";
import { isFirebaseConfigured } from "../lib/firebase";
import { stagger, fadeUp, fadeUpTight, inViewOnce, EASE_OUT, SPRING_SNAPPY, TAP_SOFT } from "../lib/motion";

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
  const [selectedVariantProduct, setSelectedVariantProduct] = useState(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isInteractiveMapOpen, setIsInteractiveMapOpen] = useState(false);
  const [isSearchPulsing, setIsSearchPulsing] = useState(false);
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [isHighDemand, setIsHighDemand] = useState(false);
  const [activeDealPromo, setActiveDealPromo] = useState(null);

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
    if (isFirebaseConfigured) {
      const unsub = watchProducts((liveProducts) => {
        if (liveProducts && liveProducts.length > 0) {
          setProductsList(liveProducts);
        }
      });
      return () => {
        if (typeof unsub === "function") unsub();
      };
    }
  }, []);

  // Support ?cat=Snacks navigation from categories page
  useEffect(() => {
    if (router.query.cat) {
      setActiveCategory(router.query.cat);
    }
  }, [router.query.cat]);

  // Support ?deal=Snacks navigation for in-page exclusive deals
  useEffect(() => {
    if (router.query.deal) {
      const dealCat = router.query.deal;
      setActiveDealPromo({
        category: dealCat,
        title: `Dashit Exclusive ${dealCat} Specials`,
        priceTag: "Special Discounts Active",
      });
      setActiveCategory(dealCat);
      setTimeout(() => {
        const el = document.getElementById("products-section");
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 250);
    }
  }, [router.query.deal]);

  const handleSelectPromo = (promo) => {
    if (!promo) return;
    if (typeof promo === "string") {
      setActiveCategory(promo === "Chips & Crisps" ? "Snacks" : promo);
      return;
    }
    // Object: Exclusive Offer from Admin
    setActiveDealPromo(promo);
    if (promo.category && promo.category !== "All") {
      setActiveCategory(promo.category);
    }
    setTimeout(() => {
      const el = document.getElementById("products-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 150);
  };

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

  const filteredProducts = useMemo(() => {
    let list = [...productsList];

    if (activeCategory !== "All") {
      const activeLower = activeCategory.toLowerCase();
      list = list.filter((p) => {
        if (!p.cat) return true;
        const catLower = p.cat.toLowerCase();
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
    }

    // When an exclusive deal promo is active: sort so discounted & matching deal items appear first!
    if (activeDealPromo) {
      const dealCat = (activeDealPromo.category || "").toLowerCase();
      list.sort((a, b) => {
        const aCat = (a.cat || "").toLowerCase();
        const bCat = (b.cat || "").toLowerCase();
        const aCatMatch = aCat.includes(dealCat) || dealCat.includes(aCat);
        const bCatMatch = bCat.includes(dealCat) || dealCat.includes(bCat);
        if (aCatMatch && !bCatMatch) return -1;
        if (!aCatMatch && bCatMatch) return 1;

        const aDiscount = a.mrp && a.price ? (a.mrp - a.price) : 0;
        const bDiscount = b.mrp && b.price ? (b.mrp - b.price) : 0;
        return bDiscount - aDiscount;
      });
    }

    return list;
  }, [productsList, activeCategory, activeDealPromo]);

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

      {/* 2. STICKY SEARCH & CATEGORY BAR (Stops cleanly below status bar when scrolling) */}
      <div className="sticky top-[max(62px,calc(env(safe-area-inset-top,0px)+54px))] z-40 bg-[#FFFDF5] border-b border-amber-100/60 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
        <div className="max-w-md mx-auto px-4 pt-1.5 pb-2">
          <div
            onClick={() => router.push("/search")}
            className={`relative flex items-center bg-white text-slate-900 rounded-2xl px-3.5 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-200/90 cursor-pointer active:scale-[0.99] transition-all ${
              isSearchPulsing ? "animate-search-pulse ring-2 ring-[#FF5B00]/40" : ""
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
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="text-xs font-semibold text-slate-400 select-none truncate block absolute w-full"
                >
                  {SEARCH_SUGGESTIONS[suggestionIdx]}
                </motion.span>
              </AnimatePresence>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                hapticMedium();
                setIsVoiceModalOpen(true);
              }}
              className="p-1 rounded-full text-[#FF5B00] hover:text-[#e05f00] ml-auto shrink-0 active:scale-90 transition-transform cursor-pointer"
              title="Search with voice"
            >
              <Mic className="w-4 h-4 stroke-[2.5]" />
            </button>
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
      <main className="max-w-md mx-auto px-4 pt-5 space-y-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeCategory}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{
              duration: 0.28,
              ease: EASE_OUT,
            }}
            className="space-y-8"
          >
            {/* Selected Category Header (when activeCategory !== 'All') */}
            {activeCategory !== "All" && (
              <div className="flex items-center justify-between px-1 pt-1 pb-0">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF5B00]" />
                  <h2 className="font-black text-base text-[#061838] tracking-tight">
                    {activeCategory}
                  </h2>
                  <span className="text-xs font-bold text-slate-400">
                    ({filteredProducts.length} items)
                  </span>
                </div>
                <button
                  onClick={() => setActiveCategory("All")}
                  className="text-xs font-black text-[#FF5B00] hover:underline flex items-center space-x-1 cursor-pointer active:scale-95 transition-transform"
                >
                  <span>Show All</span>
                  <span>✕</span>
                </button>
              </div>
            )}

            {/* 4. PROMOTIONAL HERO BANNER (Only visible when activeCategory === 'All') */}
            {activeCategory === "All" && (
              <PromoBanner
                onSelectPromo={(promo) => handleSelectPromo(promo)}
              />
            )}

            {/* 5. 6-PACK CATEGORY GRID (Only visible when activeCategory === 'All') */}
            {activeCategory === "All" && (
              <section className="space-y-3">
                <motion.div variants={fadeUp} {...inViewOnce} className="flex items-center justify-between px-1">
                  <h3 className="font-black text-[17px] text-[#061838] tracking-tight">
                    Grocery &amp; Kitchen
                  </h3>
                  <motion.button
                    whileTap={TAP_SOFT}
                    transition={SPRING_SNAPPY}
                    onClick={() => router.push("/categories")}
                    className="text-[11px] font-black text-[#FF5B00] bg-orange-50 hover:bg-orange-100 border border-orange-200/70 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    See all →
                  </motion.button>
                </motion.div>
                <CategoryGridSixPack
                  onSelectCategory={(cat) =>
                    setActiveCategory(cat === "Chips" || cat === "Biscuits" ? "Snacks" : cat)
                  }
                />
              </section>
            )}

            {/* 6. PRODUCT SECTION WITH SKELETON SUPPORT */}
            <section id="products-section" className="space-y-3 pt-1">
              {/* Active Deal Banner */}
              {activeDealPromo && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-amber-50/70 border border-amber-200/70 rounded-2xl p-3 flex items-center justify-between shadow-[0_1px_3px_rgba(15,23,42,0.03)] mb-3"
                >
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500 to-[#FF5B00] text-white flex items-center justify-center font-black shadow-xs shrink-0">
                      <Sparkles className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                          DASHIT EXCLUSIVE APPLIED
                        </span>
                        {activeDealPromo.promoCode && (
                          <span className="text-[10px] font-mono font-bold text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                            {activeDealPromo.promoCode}
                          </span>
                        )}
                      </div>
                      <p className="text-xs font-black text-slate-900 mt-0.5">
                        {activeDealPromo.title} · <span className="text-[#FF5B00]">{activeDealPromo.priceTag || "Special Deals"}</span>
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDealPromo(null);
                      setActiveCategory("All");
                    }}
                    className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200 active:scale-95 transition-all cursor-pointer shadow-2xs"
                  >
                    Clear ✕
                  </button>
                </motion.div>
              )}

              <motion.div variants={fadeUp} {...inViewOnce} className="flex items-center justify-between px-1">
                <h3 className="font-black text-[17px] text-slate-900 tracking-tight">
                  {activeCategory === "All" ? "Bestsellers" : activeCategory}
                </h3>
                {activeCategory !== "All" && (
                  <motion.button
                    whileTap={TAP_SOFT}
                    transition={SPRING_SNAPPY}
                    onClick={() => setActiveCategory("All")}
                    className="text-[11px] font-black text-[#FF5B00] bg-orange-50 hover:bg-orange-100 border border-orange-200/70 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    Back to All
                  </motion.button>
                )}
              </motion.div>

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
                        onSelectVariants={(prod) => setSelectedVariantProduct(prod)}
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
        /* Cart ids are normalised to strings on add, so compare as strings —
           a strict === against a numeric product id never matched, which left
           the sheet showing ADD for an item already in the cart. */
        cartQty={
          selectedQuickProduct
            ? cart.find(
                (i) =>
                  String(i.id || i.barcode) ===
                  String(selectedQuickProduct.id || selectedQuickProduct.barcode)
              )?.qty || 0
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

      {/* 10. VARIANT SELECTOR MODAL (Clean size/price selection for multi-option products) */}
      <VariantSelectorModal
        isOpen={Boolean(selectedVariantProduct)}
        onClose={() => setSelectedVariantProduct(null)}
        product={selectedVariantProduct}
        cart={cart}
        onAddToCart={handleAddToCart}
        onUpdateQty={(id, delta) => handleUpdateQty(id, delta)}
      />

      {/* 11. VOICE SEARCH MODAL */}
      <VoiceSearchModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onResult={(spokenText) => {
          router.push(`/search?q=${encodeURIComponent(spokenText)}`);
        }}
      />


    </div>
  );
}
