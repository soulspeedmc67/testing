import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import SEO from "../components/SEO";
import { BreadcrumbJsonLd } from "../components/JsonLd";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Mic, Sparkles, Flame, ArrowLeft, Store } from "lucide-react";
import AppHeader from "../components/AppHeader";
import CategoryScroller from "../components/CategoryScroller";
import PromoBanner from "../components/PromoBanner";
import CategoryGridSixPack from "../components/CategoryGridSixPack";
import ProductCard from "../components/ProductCard";
import ProductCardSkeleton from "../components/ProductCardSkeleton";
import QuickProductSheet from "../components/QuickProductSheet";
import LocationPickerModal from "../components/LocationPickerModal";
import InteractiveMapModal from "../components/InteractiveMapModal";
import VariantSelectorModal from "../components/VariantSelectorModal";
import VoiceSearchModal from "../components/VoiceSearchModal";
import { ALL_PRODUCTS } from "../data/products";
import { reverseGeocodeCoords } from "../lib/maps";
import { watchProducts } from "../lib/db";
import { isFirebaseConfigured } from "../lib/firebase";
import { useStoreDetails } from "../lib/storeStatus";
import { hapticMedium } from "../lib/haptics";
import { stagger, fadeUp, fadeUpTight, inViewOnce, EASE_OUT, SPRING_SNAPPY, TAP_SOFT } from "../lib/motion";
import { forceUnlockBodyScroll } from "../lib/useBodyScrollLock";

const SEARCH_SUGGESTIONS = [
  '"milk, curd & paneer"',
  '"atta, dal & cooking oil"',
  '"coca cola & cold drinks"',
  '"chips & namkeen snacks"',
  '"chocolates & ice cream"',
  '"fresh kashmiri lavas bread"'
];

function RotatingSearchPlaceholder() {
  const [suggestionIdx, setSuggestionIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setSuggestionIdx((prev) => (prev + 1) % SEARCH_SUGGESTIONS.length);
    }, 2800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="grow overflow-hidden h-5 relative flex items-center">
      <AnimatePresence mode="wait">
        <motion.span
          key={suggestionIdx}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -5 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="text-xs font-semibold text-slate-500 select-none truncate block absolute w-full dark:text-content-muted"
        >
          {SEARCH_SUGGESTIONS[suggestionIdx]}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

export default function ShopPage() {
  const router = useRouter();
  const { isOpen: isStoreOpen, closeReason } = useStoreDetails();
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
  const [isScrolled, setIsScrolled] = useState(false);

  const [location, setLocation] = useState({
    nickname: "LOCATION",
    address: "Select delivery location",
    lat: 33.735832,
    lng: 75.143614
  });

  const handleSelectLocation = (newLoc) => {
    setLocation(newLoc);
    try {
      localStorage.setItem("dashit_user_address", JSON.stringify(newLoc));
      localStorage.setItem("dashit_selected_location", JSON.stringify(newLoc));

      const savedList = JSON.parse(localStorage.getItem("dashit_saved_addresses") || "[]");
      const updatedList = [
        newLoc,
        ...savedList.filter((s) => (s.id || s.address) !== (newLoc.id || newLoc.address)),
      ].slice(0, 10);
      localStorage.setItem("dashit_saved_addresses", JSON.stringify(updatedList));

      const userStr = localStorage.getItem("dashit_user");
      if (userStr) {
        const u = JSON.parse(userStr);
        u.address = newLoc.address;
        u.location = newLoc;
        localStorage.setItem("dashit_user", JSON.stringify(u));
      }

      window.dispatchEvent(new CustomEvent("dashit_address_updated", { detail: newLoc }));
    } catch (e) {}
    setIsSearchPulsing(true);
    setTimeout(() => setIsSearchPulsing(false), 600);
  };

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("dashit_cart");
      if (savedCart) setCart(JSON.parse(savedCart));

      /* Location is never requested on open.

         This branch used to call getCurrentPosition() the moment the storefront
         mounted, so a first-time visitor met the OS location prompt before they
         had seen the app or been told why it wanted their position. Google Play
         requires a prominent in-app disclosure before that prompt, and an
         unexplained prompt on launch is a routine rejection.

         The header shows "LOCATION" until the customer taps it, and the picker
         asks for GPS only when they choose "Use my current location". */
      const savedAddress = localStorage.getItem("dashit_user_address");
      if (savedAddress) {
        setLocation(JSON.parse(savedAddress));
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

  useEffect(() => {
    forceUnlockBodyScroll();
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const [productsList, setProductsList] = useState(ALL_PRODUCTS);

  useEffect(() => {
    try {
      const custom = JSON.parse(localStorage.getItem("dashit_custom_products") || "[]");
      if (custom.length > 0) {
        const customIds = new Set(custom.map((c) => String(c.id || c.barcode)));
        setProductsList([...custom, ...ALL_PRODUCTS.filter((p) => !customIds.has(String(p.id || p.barcode)))]);
      }
    } catch (e) {}

    const unsub = watchProducts((liveProducts) => {
      if (liveProducts && liveProducts.length > 0) {
        setProductsList(liveProducts);
      }
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
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
    if (!isStoreOpen) {
      alert(`Store Reopening Schedule: ${closeReason || "Reopening shortly!"}`);
      return;
    }
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
    <div className="min-h-screen bg-[#FFFDF5] text-slate-900 font-sans pb-dock dark:bg-surface dark:text-content">
      <SEO
        title="Online Grocery Store Anantnag — Fresh Essentials in 8 Mins"
        description="Shop farm milk, curd, Kashmiri lavas bread, snacks, beverages, and pantry staples online with DASHIT. 8-minute delivery across Anantnag (PIN: 192101)."
        canonical="/shop/"
        ogType="website"
        keywords="DASHIT storefront, buy groceries Anantnag, online supermarket Kashmir, milk delivery 192101, bread, snacks"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Shop", url: "/shop/" },
        ]}
      />

      {/* 1. APP HEADER */}
      <AppHeader
        location={location}
        onOpenLocationPicker={() => setIsLocationModalOpen(true)}
        onOpenInteractiveMap={() => setIsInteractiveMapOpen(true)}
        onOpenVoiceSearch={() => setIsVoiceModalOpen(true)}
        isHighDemand={isHighDemand}
        hideStickySearch={true}
      />

      {/* STORE CLOSED BANNER */}
      {!isStoreOpen && (
        <div className="bg-[#061838] text-white px-4 py-2.5 shadow-md flex items-center justify-between text-xs font-black sticky top-[env(safe-area-inset-top,0px)] z-50">
          <div className="max-w-7xl mx-auto w-full flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping shrink-0" />
              <span>Deliveries Paused · Store Reopening Schedule: {closeReason || "Reopening shortly"}</span>
            </div>
            <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded font-mono uppercase tracking-wider">Closed</span>
          </div>
        </div>
      )}

      {/* 2. STICKY SEARCH BAR & CATEGORIES SCROLLER */}
      <div className={`sticky top-0 md:top-[74px] z-40 bg-[#FFFDF5]/95 dark:bg-surface/95 backdrop-blur-md shadow-[0_4px_16px_rgba(0,0,0,0.05)] transition-all duration-300 ${
        isScrolled ? "pt-[env(safe-area-inset-top,0px)]" : ""
      }`}
        style={{
          /* Subtle border that fades out when scrolled */
          borderBottom: isScrolled ? "1px solid transparent" : "1px solid rgba(245,158,11,0.15)",
          transition: "border-color 0.4s ease, padding 0.15s ease",
        }}
      >
        <div className="max-w-md mx-auto px-4 pt-1.5 pb-2 md:hidden">
          <div
            onClick={() => router.push("/search")}
            className={`relative flex items-center bg-white text-slate-900 rounded-2xl px-3.5 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-200/90 cursor-pointer active:scale-[0.99] transition-all ${
              isSearchPulsing ? "animate-search-pulse ring-2 ring-[#FF5B00]/40" : ""
            } dark:bg-surface-raised dark:text-content dark:border-line/90`}
          >
            <Search className="w-4 h-4 stroke-[2.5] text-[#061838]/60 mr-2 shrink-0 dark:text-content" />
            <span className="text-xs font-bold text-slate-800 select-none shrink-0 mr-1.5 dark:text-content">
              Search
            </span>
            <RotatingSearchPlaceholder />
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

      {/* MAIN BODY CONTENT (Responsive: max-w-md on mobile, expands to max-w-7xl on desktop) */}
      <main className="max-w-md md:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 space-y-8">
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
            className="space-y-6"
          >
            {/* Selected Category Header (when activeCategory !== 'All') */}
            {activeCategory !== "All" && (
              <div className="flex items-baseline justify-between px-1 pt-1 pb-0">
                <div className="flex items-baseline space-x-2 min-w-0">
                  <h2 className="font-bold text-[17px] md:text-xl text-[#061838] tracking-tight truncate dark:text-content">
                    {activeCategory}
                  </h2>
                  <span className="text-[11px] font-medium text-slate-500 shrink-0 dark:text-content-muted">
                    {filteredProducts.length} items
                  </span>
                </div>
                <button
                  onClick={() => setActiveCategory("All")}
                  className="text-[12px] font-semibold text-[#FF5B00] hover:underline shrink-0 cursor-pointer active:scale-95 transition-transform"
                >
                  Clear
                </button>
              </div>
            )}

            {/* 4. PROMOTIONAL HERO BANNER (Only visible when activeCategory === 'All') */}
            {activeCategory === "All" && (
              <div className="w-full">
                <PromoBanner
                  onSelectPromo={(promo) => handleSelectPromo(promo)}
                />
              </div>
            )}

            {/* 5. 6-PACK CATEGORY GRID (Only visible when activeCategory === 'All') */}
            {activeCategory === "All" && (
              <section className="space-y-3">
                <motion.div variants={fadeUp} {...inViewOnce} className="flex items-center justify-between px-1">
                  <h3 className="font-bold text-[15px] md:text-lg text-[#061838] tracking-tight dark:text-content">
                    Shop by category
                  </h3>
                  <motion.button
                    whileTap={TAP_SOFT}
                    transition={SPRING_SNAPPY}
                    onClick={() => router.push("/categories")}
                    className="text-[12px] font-semibold text-[#FF5B00] hover:underline transition-colors"
                  >
                    See all
                  </motion.button>
                </motion.div>
                <CategoryGridSixPack
                  onSelectCategory={(cat) => setActiveCategory(cat)}
                />
              </section>
            )}

            {/* 6. PRODUCT SECTION WITH SKELETON SUPPORT */}
            <section id="products-section" className="space-y-4 pt-1">
              {/* Active Deal Banner */}
              {activeDealPromo && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border border-slate-200 rounded-2xl p-3 flex items-center justify-between mb-3 dark:bg-surface-raised dark:border-line"
                >
                  <div className="flex items-center space-x-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-[#FF5B00] text-white flex items-center justify-center shadow-xs shrink-0">
                      <Sparkles className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[12.5px] font-semibold text-[#061838] truncate dark:text-content">
                        {activeDealPromo.title}
                      </p>
                      <p className="text-[10.5px] font-medium text-slate-500 mt-0.5 truncate dark:text-content-muted">
                        {activeDealPromo.priceTag || "Special deals"}
                        {activeDealPromo.promoCode ? ` · ${activeDealPromo.promoCode}` : ""}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDealPromo(null);
                      setActiveCategory("All");
                    }}
                    className="text-[12px] font-semibold text-slate-500 hover:text-slate-900 shrink-0 ml-3 active:scale-95 transition-all cursor-pointer dark:text-content-muted dark:hover:text-content"
                  >
                    Clear
                  </button>
                </motion.div>
              )}

              {/* Only "All" needs a heading here — a picked category already has one above */}
              {activeCategory === "All" && (
                <motion.div variants={fadeUp} {...inViewOnce} className="flex items-center justify-between px-1">
                  <h3 className="font-bold text-[15px] md:text-lg text-[#061838] tracking-tight dark:text-content">
                    Bestsellers
                  </h3>
                </motion.div>
              )}

              {/* RESPONSIVE GRID: 2 cols on mobile, 3 on sm, 4 on md, 5 on lg, 6 on xl */}
              {isLoadingProducts ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
                  {[...Array(12)].map((_, i) => (
                    <ProductCardSkeleton key={i} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
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
        onOpenMap={() => {
          setIsLocationModalOpen(false);
          setIsInteractiveMapOpen(true);
        }}
      />

      {/* 9. INTERACTIVE MAP MODAL */}
      <InteractiveMapModal
        isOpen={isInteractiveMapOpen}
        onClose={() => setIsInteractiveMapOpen(false)}
        onConfirmLocation={handleSelectLocation}
      />

      {/* 10. VARIANT SELECTOR MODAL */}
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
