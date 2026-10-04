import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { Search, ArrowLeft, X, Mic, History, LayoutGrid } from "lucide-react";
import SEO from "../components/SEO";
import confetti from "canvas-confetti";
import ProductCardStepper from "../components/ProductCardStepper";
import ProductImage from "../components/ProductImage";
import QuickProductSheet from "../components/QuickProductSheet";
import VoiceSearchModal from "../components/VoiceSearchModal";
import { EmptySearchState } from "../components/ui/EmptyState";
import ProductCardSkeleton from "../components/ProductCardSkeleton";
import { ALL_PRODUCTS } from "../data/products";
import TobaccoSearchBanner from "../components/TobaccoSearchBanner";
import { useAgeGate } from "../context/AgeGateContext";
import { hapticLight, hapticMedium } from "../lib/haptics";
import { goBack } from "../lib/navigation";
import { watchShopProducts as watchProducts, isSoldOut } from "../lib/catalogueFile";
import { browseable, isTobaccoSectionEnabled, tobaccoMatches, TOBACCO_ROUTE } from "../lib/tobacco";
import { isPlaceholderImage } from "../lib/productPhotoMatch";
import { buildAisles, buildAisleGroups, featuredAisles } from "../lib/shopAisles";
import { getRecentSearches, addRecentSearch, removeRecentSearch, clearRecentSearches } from "../lib/recentSearches";

const POPULAR_SEARCH_CHIPS = ["Milk", "Lavas Bread", "Chips", "Apples", "Silk Chocolate", "Maggi", "Butter", "Biscuits"];

export default function SearchPage() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [isInputFocused, setIsInputFocused] = useState(false);
  const [selectedQuickProduct, setSelectedQuickProduct] = useState(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [allProducts, setAllProducts] = useState(ALL_PRODUCTS || []);
  const [tobaccoEnabled, setTobaccoEnabled] = useState(false);
  const { requestTobaccoAccess } = useAgeGate();
  /* What an empty search box shows: this shopper's recent searches first, and
     the categories behind the small button on the right. */
  const [recent, setRecent] = useState([]);
  const [showCategories, setShowCategories] = useState(false);

  // Read after mount: the exported page has no saved searches.
  useEffect(() => {
    setRecent(getRecentSearches());
  }, []);

  // Platform-dependent (off in the iOS app), so it is only known after mount.
  useEffect(() => {
    setTobaccoEnabled(isTobaccoSectionEnabled());
  }, []);

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
    try {
      localStorage.setItem("dashit_cart", JSON.stringify(newCart));
      // Tells the cart bar straight away, instead of on its next 3-second check.
      window.dispatchEvent(new Event("dashit_cart_updated"));
    } catch (e) {}
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
  // Tobacco is never a search result; a tobacco query gets the banner instead.
  const browseProducts = useMemo(() => browseable(allProducts), [allProducts]);

  const hasValidPhoto = (p) => {
    if (!p || !p.img) return false;
    const str = String(p.img).trim();
    if (!str) return false;
    return !isPlaceholderImage(str);
  };

  /* When the user opens search, only products with verified pictures are shown
     at the top. When searching, in-stock products with genuine photos strictly rank
     ahead of items without photos, followed by prefix and length match. */
  const aisles = useMemo(() => buildAisles(browseProducts), [browseProducts]);

  /* What an empty search shows under the recent searches: a couple of in-stock
     items from each everyday aisle (milk, bread, snacks…), not simply the
     first twelve products in the catalogue, which were whatever sorted first. */
  const everydayPicks = useMemo(() => {
    const rails = featuredAisles(aisles, 6).map((a) => a.rail);
    const picks = [];
    for (let i = 0; i < 2; i += 1) {
      for (const rail of rails) if (rail[i]) picks.push(rail[i]);
    }
    return picks;
  }, [aisles]);

  const filteredProducts = useMemo(() => {
    if (!cleanQuery) {
      if (everydayPicks.length > 0) return everydayPicks;
      return browseProducts
        .filter((p) => hasValidPhoto(p) && !isSoldOut(p))
        .slice(0, 12);
    }
    const words = cleanQuery.split(/\s+/).filter(Boolean);
    const hits = [];
    for (const p of browseProducts) {
      const name = (p.name || "").toLowerCase();
      const hay = `${name} ${(p.cat || "").toLowerCase()} ${(p.brand || "").toLowerCase()}`;
      if (!words.every((w) => hay.includes(w))) continue;
      const stockPenalty = isSoldOut(p) ? 40 : 0;
      const photoPenalty = hasValidPhoto(p) ? 0 : 10;
      const nameMatchRank = name.startsWith(words[0]) ? 0 : name.includes(` ${words[0]}`) ? 1 : 2;
      const rank = stockPenalty + photoPenalty + nameMatchRank;
      hits.push([rank, name.length, p]);
    }
    hits.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    return hits.slice(0, 120).map((h) => h[2]);
  }, [browseProducts, cleanQuery, everydayPicks]);

  /* A search is remembered once typing has paused and it found something, so
     half-typed words don't fill the list. */
  useEffect(() => {
    if (cleanQuery.length < 2 || filteredProducts.length === 0) return undefined;
    const timer = setTimeout(() => setRecent(addRecentSearch(query)), 1200);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanQuery, filteredProducts.length]);

  // Only worked out when the shopper asks to see the categories.
  const categoryGroups = useMemo(
    () => (showCategories ? buildAisleGroups(aisles) : []),
    [showCategories, aisles]
  );

  const tobaccoHits = tobaccoEnabled ? tobaccoMatches(cleanQuery, allProducts) : [];
  const showTobaccoPrompt = tobaccoHits.length > 0;
  // "No results" with the banner still shows products with pictures underneath.
  const showPopularInstead = showTobaccoPrompt && filteredProducts.length === 0;
  const gridProducts = showPopularInstead
    ? browseProducts.filter((p) => hasValidPhoto(p) && !isSoldOut(p)).slice(0, 8)
    : filteredProducts;

  const openTobaccoSection = () => {
    hapticLight();
    requestTobaccoAccess(() => router.push(TOBACCO_ROUTE));
  };

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
      <header
        className="sticky top-0 z-40 bg-[#061838] px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3.5 shadow-md dark:bg-surface-raised dark:border-b dark:border-line/80"
      >
        <div className="max-w-md md:max-w-none mx-auto md:px-2 lg:px-4 flex items-center space-x-3">
          <motion.button
            whileTap={{ scale: 0.88 }}
            type="button"
            onClick={() => goBack(router, "/shop")}
            className="p-1.5 rounded-full text-slate-300 hover:text-white transition-colors cursor-pointer dark:text-content-secondary dark:hover:text-white"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </motion.button>

          <div
            className={`relative grow flex items-center bg-white rounded-full px-4 py-2 shadow-inner transition-all dark:bg-surface-muted dark:border dark:border-line-strong ${
              isInputFocused ? "ring-2 ring-[#FF5B00]" : ""
            }`}
          >
            <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0 dark:text-content-secondary" />
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
          </div>

          <motion.button
            whileTap={{ scale: 0.88 }}
            type="button"
            onClick={() => setIsVoiceModalOpen(true)}
            className="p-2 rounded-full bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer dark:bg-surface-muted dark:text-content-secondary dark:hover:text-white"
          >
            <Mic className="w-5 h-5" />
          </motion.button>
        </div>
      </header>

      {/* Voice Search Modal Component */}
      <VoiceSearchModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onResult={(spokenText) => {
          setQuery(spokenText);
        }}
      />

      <main className="max-w-md md:max-w-none mx-auto px-4 md:px-6 lg:px-8 mt-4 space-y-4">
        {/* Nothing typed yet: recent searches, with the categories one tap away. */}
        {!query && (
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[14px] font-bold text-[#061838] dark:text-content">
                {showCategories ? "Categories" : recent.length > 0 ? "Recent searches" : "Popular searches"}
              </h2>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setShowCategories((v) => !v);
                  }}
                  aria-pressed={showCategories}
                  className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-[12.5px] font-semibold text-[#061838] inline-flex items-center gap-1.5 hover:border-slate-300 active:scale-[0.98] transition cursor-pointer dark:bg-surface-raised dark:border-line dark:text-content"
                >
                  {showCategories ? <History className="w-4 h-4" /> : <LayoutGrid className="w-4 h-4" />}
                  {showCategories ? "History" : "Categories"}
                </button>
                {!showCategories && recent.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setRecent(clearRecentSearches())}
                    className="h-9 px-3 rounded-xl text-[12.5px] font-semibold text-[#FF5B00] hover:bg-[#FF5B00]/10 active:scale-[0.98] transition cursor-pointer"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {showCategories ? (
              <div className="space-y-4">
                {categoryGroups.map((group) => (
                  <div key={group.id} className="space-y-2">
                    <h3 className="text-[12px] font-semibold text-slate-500 dark:text-content-muted">{group.label}</h3>
                    <div className="flex flex-wrap gap-2">
                      {group.aisles.map((aisle) => {
                        const AisleIcon = aisle.icon;
                        return (
                          <Link
                            key={aisle.cat}
                            href={`/shop/?cat=${encodeURIComponent(aisle.cat)}`}
                            className="h-10 px-3 rounded-xl bg-white border border-slate-200 text-[13px] font-semibold text-[#061838] inline-flex items-center gap-1.5 hover:border-slate-300 active:scale-[0.98] transition dark:bg-surface-raised dark:border-line dark:text-content"
                          >
                            <AisleIcon className="w-4 h-4 text-slate-500 dark:text-content-muted" />
                            {aisle.label}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {recent.length > 0 && (
                  <div className="space-y-2">
                    <ul className="rounded-2xl bg-white border border-slate-200/80 divide-y divide-slate-100 overflow-hidden dark:bg-surface-raised dark:border-line dark:divide-line-soft">
                      {recent.map((term) => (
                        <li key={term} className="flex items-center">
                          <button
                            type="button"
                            onClick={() => setQuery(term)}
                            className="grow min-w-0 h-11 pl-3.5 pr-2 flex items-center gap-3 text-left cursor-pointer"
                          >
                            <History className="w-4 h-4 shrink-0 text-slate-400 dark:text-content-faint" />
                            <span className="truncate text-[14px] font-medium text-slate-800 dark:text-content">{term}</span>
                          </button>
                          <button
                            type="button"
                            aria-label={`Remove ${term} from recent searches`}
                            onClick={() => setRecent(removeRecentSearch(term))}
                            className="w-11 h-11 shrink-0 flex items-center justify-center text-slate-400 hover:text-slate-700 cursor-pointer dark:text-content-faint dark:hover:text-content"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="space-y-2">
                  {recent.length > 0 && (
                    <h3 className="pt-1 text-[14px] font-bold text-[#061838] dark:text-content">Popular searches</h3>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {POPULAR_SEARCH_CHIPS.map((chip) => (
                      <button
                        key={chip}
                        type="button"
                        onClick={() => setQuery(chip)}
                        className="h-9 px-3.5 rounded-xl bg-white border border-slate-200 text-[13px] font-semibold text-slate-700 hover:border-slate-300 active:scale-[0.98] transition cursor-pointer dark:bg-surface-raised dark:border-line dark:text-content-secondary"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </section>
        )}

        {showTobaccoPrompt && (
          <TobaccoSearchBanner
            query={query.trim()}
            showNoResults={showPopularInstead}
            onViewItems={openTobaccoSection}
          />
        )}

        {/* Live Filtered Search Results */}
        {(query || !showCategories) && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider dark:text-content-faint">
              {showPopularInstead
                ? "Showing popular products"
                : query
                  ? `Search Results for "${query}" (${filteredProducts.length})`
                  : "Everyday items"}
            </h3>
          </div>

          {gridProducts.length === 0 ? (
            cleanQuery ? (
              <EmptySearchState query={query} onSelectChip={(chip) => setQuery(chip)} />
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-8 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <ProductCardSkeleton key={i} />
                ))}
              </div>
            )
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 2xl:grid-cols-8 gap-3">
              {gridProducts.map((p) => {
                const inCart = cart.find((i) => i.id === p.id);
                return (
                  <div key={p.id} className="bg-white border border-slate-200/90 rounded-3xl p-3 flex flex-col justify-between shadow-sm space-y-2 dark:bg-surface-raised dark:border-line/90">
                    <button
                      onClick={() => setSelectedQuickProduct(p)}
                      className="bg-slate-50 rounded-2xl p-2 h-28 flex items-center justify-center cursor-pointer w-full relative overflow-hidden dark:bg-surface-raised"
                    >
                      <div className="w-20 h-20 relative flex items-center justify-center">
                        <ProductImage
                          src={p.img}
                          name={p.name}
                          fill
                          letterClassName="text-xl"
                          imgClassName="transform hover:scale-105 transition-transform"
                        />
                      </div>
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
        )}
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
