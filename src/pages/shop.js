import { useState, useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import SEO from "../components/SEO";
import { BreadcrumbJsonLd } from "../components/JsonLd";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Mic, Sparkles, Flame, Tag, ArrowRight, LayoutGrid } from "lucide-react";
import { buildAisles, aisleFor, featuredAisles } from "../lib/shopAisles";
import AppHeader from "../components/AppHeader";
import CategoryScroller from "../components/CategoryScroller";
import ProductCard from "../components/ProductCard";
import ProductImage from "../components/ProductImage";
import ProductCardSkeleton from "../components/ProductCardSkeleton";
import QuickProductSheet from "../components/QuickProductSheet";
import LocationPickerModal from "../components/LocationPickerModal";
import InteractiveMapModal from "../components/InteractiveMapModal";
import VariantSelectorModal from "../components/VariantSelectorModal";
import VoiceSearchModal from "../components/VoiceSearchModal";
import { reverseGeocodeCoords } from "../lib/maps";
import { watchShopProducts as watchProducts, isSoldOut } from "../lib/catalogueFile";
import { browseable } from "../lib/tobacco";
import { useStoreDetails } from "../lib/storeStatus";
import { hapticMedium } from "../lib/haptics";
import { stagger, fadeUp, fadeUpTight, inViewOnce, EASE_OUT, SPRING_SNAPPY, TAP_SOFT } from "../lib/motion";
import { forceUnlockBodyScroll } from "../lib/useBodyScrollLock";
import WhatsAppSupportButton from "../components/WhatsAppSupportButton";
import FloatingDeliveryBanner from "../components/FloatingDeliveryBanner";

const PAGE_SIZE = 48;

const PERSONAL_CARE_SUB_CATEGORIES = [
  { id: "all", label: "All" },
  { id: "skin", label: "Skin Care", regex: /\b(face ?wash|facewash|moisturi[sz]er|sunscreen|lotion|serum|scrub|face pack|rose water|sheet mask|cleanser|night cream|day cream|cold cream|lip balm)\b/i },
  { id: "hair", label: "Hair Care", regex: /\b(shampoo|shmp|conditioner|hair ?oil|hair ?colou?r|hair mask|hair spray|hair spa|scalp)\b/i },
  { id: "bath", label: "Bath & Body", regex: /\b(soap|bath|body ?wash|shower gel|loofah|sponge)\b/i },
  { id: "fragrance", label: "Fragrances & Deos", regex: /\b(deo|deodorant|perfume|body ?spray|body ?mist|attar|edp|edt|cologne)\b/i },
  { id: "oral", label: "Oral Care", regex: /\b(toothpaste|tooth ?brush|mouthwash|tongue cleaner|floss|dente?|dentoshine|sensodyne|colgate)\b/i },
  { id: "shaving", label: "Men's Grooming", regex: /\b(razor|blade|shaving|after ?shave|beard|trimmer|foam|gillette)\b/i },
  { id: "makeup", label: "Makeup & Beauty", regex: /\b(lipstick|kajal|mascara|eyeliner|nail|foundation|compact|concealer|makeup|bleach)\b/i },
];

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
  const [personalCareSubCat, setPersonalCareSubCat] = useState("all");
  const [cart, setCart] = useState([]);
  const [selectedQuickProduct, setSelectedQuickProduct] = useState(null);
  const [selectedVariantProduct, setSelectedVariantProduct] = useState(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isInteractiveMapOpen, setIsInteractiveMapOpen] = useState(false);
  const [isSearchPulsing, setIsSearchPulsing] = useState(false);
  const [isHighDemand, setIsHighDemand] = useState(false);
  const [activeDealPromo, setActiveDealPromo] = useState(null);
  const [isScrolled, setIsScrolled] = useState(false);

  const [location, setLocation] = useState({
    nickname: "LOCATION",
    address: "Select delivery location",
    lat: 33.748413,
    lng: 75.150839
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
    let isScrolledRef = false;
    const handleScroll = () => {
      const nextScrolled = window.scrollY > 20;
      if (nextScrolled !== isScrolledRef) {
        isScrolledRef = nextScrolled;
        setIsScrolled(nextScrolled);
      }
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const [productsList, setProductsList] = useState([]);
  const isLoadingProducts = productsList.length === 0;
  // The grid grows as the shopper scrolls: 4,600 cards at once would stall the page.
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const moreRef = useRef(null);
  const isFirstPaint = useRef(true);
  useEffect(() => {
    isFirstPaint.current = false;
  }, []);

  useEffect(() => {
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

  const openAisle = (cat) => {
    setActiveDealPromo(null);
    setActiveCategory(cat);
    setPersonalCareSubCat("all");
    router.replace({ pathname: "/shop", query: { cat } }, undefined, { shallow: true });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveCart = (newCart) => {
    setCart(newCart);
    try {
      localStorage.setItem("dashit_cart", JSON.stringify(newCart));
      window.dispatchEvent(new Event("dashit_cart_updated"));
    } catch (e) {}
  };

  const handleAddToCart = (product) => {
    // A closed store still fills carts; checkout is where ordering waits.
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

  const shopProducts = useMemo(() => browseable(productsList), [productsList]);
  const aisles = useMemo(() => buildAisles(shopProducts), [shopProducts]);
  /* The home page leads with a few aisles, not all of them: twenty-five tiles,
     a twenty-five-item strip and a product row for each was a wall of choices.
     The rest are one tap away on the Categories page. */
  const featured = useMemo(() => featuredAisles(aisles, 7), [aisles]);
  const aisleStrip = useMemo(() => {
    const shown = [...featured];
    // An aisle opened from Categories or search stays in the strip while it is picked.
    const picked = aisles.find((a) => a.cat === activeCategory);
    if (picked && !shown.includes(picked)) shown.push(picked);
    return [
      { id: "All", label: "All", icon: Flame },
      { id: "Offers", label: "Offers", icon: Tag, route: "/offers", highlight: true },
      ...shown.map((a) => ({ id: a.cat, label: a.label, icon: a.icon })),
      { id: "More", label: "More", icon: LayoutGrid, route: "/categories" },
    ];
  }, [aisles, featured, activeCategory]);

  const filteredProducts = useMemo(() => {
    // Tobacco is never listed on the website (browseable drops it).
    let list = shopProducts;

    if (activeCategory !== "All") {
      if (activeCategory === "Vegetables") {
        return [];
      }
      list = list.filter((p) => String(p.cat || p.category || "Others").trim() === activeCategory);
      if (activeCategory === "Personal Care" && personalCareSubCat !== "all") {
        const sub = PERSONAL_CARE_SUB_CATEGORIES.find((s) => s.id === personalCareSubCat);
        if (sub && sub.regex) {
          list = list.filter((p) => sub.regex.test(p.name || ""));
        }
      }
    }

    if (activeDealPromo) {
      const dealCat = (activeDealPromo.category || "").toLowerCase();
      list = [...list].sort((a, b) => {
        const aCat = (a.cat || "").toLowerCase();
        const bCat = (b.cat || "").toLowerCase();
        const aCatMatch = aCat.includes(dealCat) || dealCat.includes(aCat);
        const bCatMatch = bCat.includes(dealCat) || dealCat.includes(bCat);
        if (aCatMatch && !bCatMatch) return -1;
        if (!aCatMatch && bCatMatch) return 1;
        const aDiscount = (a.originalPrice || a.mrp || 0) - (a.price || 0);
        const bDiscount = (b.originalPrice || b.mrp || 0) - (b.price || 0);
        return bDiscount - aDiscount;
      });
    }

    // In-stock items with confirmed photos first, in-stock without photos next, sold-out last.
    const inStock = list.filter((p) => !isSoldOut(p));
    const soldOut = list.filter(isSoldOut);
    const hasPhoto = (p) => Boolean(p && typeof p.img === "string" && p.img.trim());
    return [...inStock.filter(hasPhoto), ...inStock.filter((p) => !hasPhoto(p)), ...soldOut];
  }, [shopProducts, activeCategory, personalCareSubCat, activeDealPromo]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [activeCategory, personalCareSubCat, activeDealPromo]);

  useEffect(() => {
    const el = moreRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setVisibleCount((n) => n + PAGE_SIZE);
      },
      { rootMargin: "800px 0px" }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [filteredProducts.length, visibleCount]);

  return (
    <div className="min-h-screen bg-[#FFFDF5] text-slate-900 font-sans pb-dock dark:bg-surface dark:text-content">
      <SEO
        title="Online Grocery Store Anantnag — #1 Fastest Grocery Delivery"
        description="Shop farm milk, curd, Kashmiri lavas bread, snacks, beverages, and pantry staples online with DASHIT. Fastest delivery across Anantnag (PIN: 192101)."
        canonical="/shop/"
        ogType="website"
        keywords="DASHIT storefront, buy groceries Anantnag, fastest delivery Anantnag, online supermarket Kashmir, milk delivery 192101, bread, snacks"
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
              <span>The store is closed right now. {closeReason || "Please check back shortly."}</span>
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
          categories={aisleStrip}
          activeCategory={activeCategory}
          onSelectCategory={(cat) => {
            setActiveCategory(cat);
          }}
        />
      </div>

      {/* MAIN BODY CONTENT (Responsive: max-w-md on mobile, expands to max-w-7xl on desktop) */}
      <main className="max-w-md md:max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5 space-y-8">
        {/* A picked category shows straight away with a short fade-in. It used
            to wait for the old list to fade out first, which added half a
            second to every tap. No fade on the very first paint. */}
          <motion.div
            key={activeCategory}
            initial={isFirstPaint.current ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, ease: EASE_OUT }}
            className="space-y-6"
          >
            {/* Selected Category Header (when activeCategory !== 'All') */}
            {activeCategory !== "All" && (
              <div className="space-y-3">
                <div className="flex items-baseline justify-between px-1 pt-1 pb-0">
                  <div className="flex items-baseline space-x-2 min-w-0">
                    <h2 className="font-bold text-[17px] md:text-xl text-[#061838] tracking-tight truncate dark:text-content">
                      {aisleFor(activeCategory).label}
                    </h2>
                    <span className="text-[11px] font-medium text-slate-500 shrink-0 dark:text-content-muted">
                      {filteredProducts.length} items
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setActiveCategory("All");
                      setPersonalCareSubCat("all");
                      router.replace("/shop", undefined, { shallow: true });
                    }}
                    className="text-[12px] font-semibold text-[#FF5B00] hover:underline shrink-0 cursor-pointer active:scale-95 transition-transform"
                  >
                    Clear
                  </button>
                </div>

                {/* Sub-Category Filter Pills for Personal Care */}
                {activeCategory === "Personal Care" && (
                  <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-2 overflow-x-auto scrollbar-none py-1">
                    {PERSONAL_CARE_SUB_CATEGORIES.map((sub) => {
                      const isSelected = personalCareSubCat === sub.id;
                      return (
                        <button
                          key={sub.id}
                          type="button"
                          onClick={() => {
                            setPersonalCareSubCat(sub.id);
                            setVisibleCount(PAGE_SIZE);
                          }}
                          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shrink-0 cursor-pointer ${
                            isSelected
                              ? "bg-[#061838] text-white shadow-xs dark:bg-white dark:text-slate-900"
                              : "bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50 dark:bg-surface-raised dark:text-content-secondary dark:border-line"
                          }`}
                        >
                          {sub.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* A few aisles, each with a real product from its shelf, and one
                tile for the rest. */}
            {activeCategory === "All" && (
              <section className="space-y-3">
                <div className="flex items-baseline justify-between px-1">
                  <h2 className="font-bold text-[16px] md:text-lg text-[#061838] tracking-tight dark:text-content">
                    Shop by category
                  </h2>
                  <Link href="/categories" className="text-[12.5px] font-semibold text-[#FF5B00] hover:underline">
                    See all
                  </Link>
                </div>
                {isLoadingProducts ? (
                  <div className="grid grid-cols-4 md:grid-cols-8 gap-2.5 sm:gap-3" aria-hidden="true">
                    {[...Array(8)].map((_, i) => (
                      <div key={i} className="aspect-[4/5] rounded-2xl bg-slate-100 dark:bg-surface-raised animate-pulse" />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-4 md:grid-cols-8 gap-2.5 sm:gap-3">
                    {featured.map((aisle) => (
                      <button
                        key={aisle.cat}
                        type="button"
                        onClick={() => openAisle(aisle.cat)}
                        className="group flex flex-col items-center text-center rounded-2xl p-1.5 sm:p-2 transition-colors hover:bg-white dark:hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF5B00]"
                      >
                        <ProductImage
                          src={aisle.cover}
                          name={aisle.label}
                          className="rounded-2xl border border-slate-200/80 dark:border-line"
                          imgClassName="p-[14%] transition-transform duration-300 group-hover:scale-105"
                        />
                        <span className="mt-1.5 text-[11px] sm:text-[12.5px] font-semibold leading-tight text-[#061838] dark:text-content line-clamp-2">
                          {aisle.label}
                        </span>
                      </button>
                    ))}
                    <Link
                      href="/categories"
                      className="group flex flex-col items-center text-center rounded-2xl p-1.5 sm:p-2 transition-colors hover:bg-white dark:hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#FF5B00]"
                    >
                      <span className="w-full aspect-square rounded-2xl border border-slate-200/80 bg-white flex items-center justify-center text-[#061838] dark:bg-surface-raised dark:border-line dark:text-content">
                        <LayoutGrid className="w-6 h-6 stroke-[1.8]" />
                      </span>
                      <span className="mt-1.5 text-[11px] sm:text-[12.5px] font-semibold leading-tight text-[#061838] dark:text-content line-clamp-2">
                        All categories
                      </span>
                    </Link>
                  </div>
                )}
              </section>
            )}

            {/* A row for each of those aisles: what's in stock, with photos. */}
            {activeCategory === "All" && !activeDealPromo &&
              featured.map((aisle) => (
                <section key={aisle.cat} className="space-y-3">
                  <div className="flex items-baseline justify-between px-1">
                    <h2 className="font-bold text-[16px] md:text-lg text-[#061838] tracking-tight dark:text-content">
                      {aisle.label}
                    </h2>
                    <button
                      type="button"
                      onClick={() => openAisle(aisle.cat)}
                      className="text-[12.5px] font-semibold text-[#FF5B00] hover:underline"
                    >
                      See all {aisle.count}
                    </button>
                  </div>
                  <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-3 overflow-x-auto scrollbar-none snap-x pb-1">
                    {aisle.rail.map((p) => {
                      const pId = String(p.id || p.barcode);
                      const inCart = cart.find((i) => String(i.id || i.barcode) === pId);
                      return (
                        <div key={pId} className="w-[150px] sm:w-[172px] shrink-0 snap-start">
                          <ProductCard
                            product={p}
                            qty={inCart ? inCart.qty : 0}
                            onAdd={() => handleAddToCart(p)}
                            onUpdateQty={(id, delta) => handleUpdateQty(id, delta)}
                            onIncrement={() => handleUpdateQty(pId, 1)}
                            onDecrement={() => handleUpdateQty(pId, -1)}
                            onQuickView={() => setSelectedQuickProduct(p)}
                            onSelectVariants={(prod) => setSelectedVariantProduct(prod)}
                          />
                        </div>
                      );
                    })}
                    {aisle.count > aisle.rail.length && (
                      <button
                        type="button"
                        onClick={() => openAisle(aisle.cat)}
                        className="w-[140px] sm:w-[160px] shrink-0 snap-start flex flex-col items-center justify-center text-center p-4 rounded-2xl border border-slate-200/80 bg-white hover:border-[#FF5B00]/40 transition-colors group cursor-pointer dark:bg-surface-raised dark:border-line"
                      >
                        <div className="w-10 h-10 rounded-full bg-[#FF5B00]/10 flex items-center justify-center text-[#FF5B00] mb-2 group-hover:scale-110 transition-transform">
                          <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                        </div>
                        <span className="text-[13px] font-bold text-[#061838] dark:text-content">
                          See all
                        </span>
                        <span className="text-[11px] font-medium text-slate-500 mt-0.5 dark:text-content-muted">
                          {aisle.count} items
                        </span>
                      </button>
                    )}
                  </div>
                </section>
              ))}

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
              {activeCategory === "All" && !isLoadingProducts && (
                <motion.div variants={fadeUp} {...inViewOnce} className="flex items-center justify-between px-1">
                  <h3 className="font-bold text-[15px] md:text-lg text-[#061838] tracking-tight dark:text-content">
                    Everything in the shop
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
              ) : filteredProducts.length === 0 ? (
                activeCategory === "Vegetables" ? (
                  <div className="text-center py-16 px-4 space-y-4 max-w-md mx-auto">
                    <div className="w-16 h-16 mx-auto rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-3xl">
                      🥕
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">
                        Fresh Farm Vegetables Arriving Soon
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
                        We are onboarding local growers across Anantnag to bring fresh organic vegetables to your doorstep daily.
                      </p>
                    </div>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveCategory("All");
                          router.replace("/shop", undefined, { shallow: true });
                        }}
                        className="px-5 py-2.5 rounded-xl bg-[#FF5B00] hover:bg-[#e04f00] text-white text-xs font-bold transition-all active:scale-95 shadow-xs cursor-pointer"
                      >
                        Explore Other Aisles
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-slate-400 text-xs font-semibold">
                    No products found in this aisle.
                  </div>
                )
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 lg:gap-5">
                  {filteredProducts.slice(0, visibleCount).map((p) => {
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
              {visibleCount < filteredProducts.length && <div ref={moreRef} aria-hidden="true" className="h-10" />}

              {filteredProducts.length > PAGE_SIZE && (
                <div className="flex flex-col items-center justify-center pt-4 pb-8 space-y-2.5">
                  <p className="text-xs font-medium text-slate-500 dark:text-content-muted">
                    Showing {Math.min(visibleCount, filteredProducts.length)} of {filteredProducts.length} items
                  </p>
                  {visibleCount < filteredProducts.length && (
                    <button
                      type="button"
                      onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                      className="px-5 py-2 rounded-xl text-xs font-bold text-[#FF5B00] bg-[#FF5B00]/10 hover:bg-[#FF5B00]/15 active:scale-95 transition-all cursor-pointer"
                    >
                      Load more
                    </button>
                  )}
                </div>
              )}
            </section>
          </motion.div>
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

      {/* 12. FLOATING WHATSAPP SUPPORT CONCIERGE */}
      <WhatsAppSupportButton />

      {/* 13. FLOATING WEATHER / SURGE ALERT BANNER */}
      <FloatingDeliveryBanner />
    </div>
  );
}
