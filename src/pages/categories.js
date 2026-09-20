import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import SEO from "../components/SEO";
import { BreadcrumbJsonLd } from "../components/JsonLd";
import { motion, AnimatePresence } from "framer-motion";
import { fadeUp, EASE_OUT, SPRING_SOFT, SPRING_SNAPPY, TAP_SOFT } from "../lib/motion";
import {
  ArrowLeft,
  Search,
  Milk,
  Apple,
  Carrot,
  Drumstick,
  Home,
  Utensils,
  Package,
  Flame,
  Check
} from "lucide-react";
import ProductCard from "../components/ProductCard";
import QuickProductSheet from "../components/QuickProductSheet";
import { ALL_PRODUCTS } from "../data/products";
import { hapticLight, hapticCartAdd } from "../lib/haptics";
import { watchProducts } from "../lib/db";
import { isFirebaseConfigured } from "../lib/firebase";
import { useStoreDetails } from "../lib/storeStatus";
import { goBack } from "../lib/navigation";

export const CATEGORIES_CATALOG = [
  {
    id: "All",
    label: "All Items",
    shortName: "All",
    icon: Flame,
    img: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=120&auto=format&fit=crop&q=80",
    aliases: ["all", "everything"]
  },
  {
    id: "Home Care",
    label: "Home Care",
    shortName: "Home",
    icon: Home,
    img: "https://images.unsplash.com/photo-1584813470613-5b1c1cad3d69?w=120&auto=format&fit=crop&q=80",
    aliases: ["home care", "household", "cleaning", "detergent", "floor cleaner", "toilet cleaner", "freshener"]
  },
  {
    id: "Kitchen Care",
    label: "Kitchen Care",
    shortName: "Kitchen",
    icon: Utensils,
    img: "https://images.unsplash.com/photo-1615397349754-cfa2066a298e?w=120&auto=format&fit=crop&q=80",
    aliases: ["kitchen care", "dishwash", "scrub", "foil", "tissue", "garbage bag"]
  },
  {
    id: "Vegetables",
    label: "Vegetables",
    shortName: "Veggies",
    icon: Carrot,
    img: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=120&auto=format&fit=crop&q=80",
    aliases: ["vegetables", "veggies", "onion", "potato", "tomato", "haakh", "capsicum", "coriander"]
  },
  {
    id: "Fresh Fruits",
    label: "Fresh Fruits",
    shortName: "Fruits",
    icon: Apple,
    img: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=120&auto=format&fit=crop&q=80",
    aliases: ["fresh fruits", "fruits", "apple", "banana", "orange", "grapes", "cherries", "coconut"]
  },
  {
    id: "Chicken",
    label: "Chicken",
    shortName: "Chicken",
    icon: Drumstick,
    img: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=120&auto=format&fit=crop&q=80",
    aliases: ["chicken", "kebab", "curry cut"]
  },
  {
    id: "Dairy",
    label: "Dairy",
    shortName: "Dairy",
    icon: Milk,
    img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=120&auto=format&fit=crop&q=80",
    aliases: ["dairy", "milk", "eggs", "butter", "curd", "paneer", "cheese"]
  }
];


export default function CategoriesPage() {
  const router = useRouter();
  const { isOpen: isStoreOpen, closeReason } = useStoreDetails();
  const [selectedCatId, setSelectedCatId] = useState("Home Care");
  const [productsList, setProductsList] = useState(ALL_PRODUCTS);
  const [cart, setCart] = useState([]);
  const [selectedQuickProduct, setSelectedQuickProduct] = useState(null);

  // Sync cart from localStorage
  useEffect(() => {
    const syncCart = () => {
      try {
        const saved = localStorage.getItem("dashit_cart");
        if (saved) setCart(JSON.parse(saved));
      } catch (e) {}
    };
    syncCart();
    window.addEventListener("dashit_cart_updated", syncCart);
    return () => window.removeEventListener("dashit_cart_updated", syncCart);
  }, []);

  // Subscribe to live products (Firestore + custom admin products)
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

  // Handle incoming query param ?cat=...
  useEffect(() => {
    if (!router.isReady) return;
    const qCat = router.query.cat;
    if (qCat) {
      const match = CATEGORIES_CATALOG.find(
        (c) =>
          c.id.toLowerCase() === qCat.toLowerCase() ||
          c.label.toLowerCase().includes(qCat.toLowerCase()) ||
          c.aliases.some((a) => a.toLowerCase() === qCat.toLowerCase())
      );
      if (match) {
        setSelectedCatId(match.id);
      }
    }
  }, [router.isReady, router.query.cat]);

  const activeCategoryObj = useMemo(() => {
    return CATEGORIES_CATALOG.find((c) => c.id === selectedCatId) || CATEGORIES_CATALOG[0];
  }, [selectedCatId]);

  // Filter products for the active category
  const filteredProducts = useMemo(() => {
    if (selectedCatId === "All") return productsList;

    const aliases = activeCategoryObj.aliases || [selectedCatId.toLowerCase()];
    return productsList.filter((p) => {
      const pCat = (p.cat || "").toLowerCase();
      const pName = (p.name || "").toLowerCase();
      return aliases.some(
        (alias) => pCat.includes(alias) || pName.includes(alias)
      );
    });
  }, [selectedCatId, productsList, activeCategoryObj]);

  const saveCart = (newCart) => {
    setCart(newCart);
    try {
      localStorage.setItem("dashit_cart", JSON.stringify(newCart));
      window.dispatchEvent(new Event("dashit_cart_updated"));
    } catch (e) {}
  };

  const handleAddToCart = (product) => {
    if (!isStoreOpen) {
      alert(`Store Reopening Schedule: ${closeReason || "We will reopen shortly!"}`);
      return;
    }
    hapticCartAdd();
    const pId = String(product.id || product.barcode);
    const existingIndex = cart.findIndex(
      (item) => String(item.id || item.barcode) === pId
    );
    let newCart;
    if (existingIndex > -1) {
      newCart = [...cart];
      newCart[existingIndex].qty += 1;
    } else {
      newCart = [...cart, { ...product, qty: 1 }];
    }
    saveCart(newCart);
  };

  const handleUpdateQty = (pId, delta) => {
    const item = cart.find((i) => String(i.id || i.barcode) === String(pId));
    if (!item) return;
    const newQty = item.qty + delta;
    if (newQty <= 0) {
      saveCart(cart.filter((i) => String(i.id || i.barcode) !== String(pId)));
    } else {
      saveCart(
        cart.map((i) =>
          String(i.id || i.barcode) === String(pId) ? { ...i, qty: newQty } : i
        )
      );
    }
  };

  const handleSelectCategory = (catId) => {
    hapticLight();
    setSelectedCatId(catId);
  };

  return (
    <div className="flex flex-col h-screen bg-[#F7F8FA] text-slate-900 font-sans overflow-hidden dark:bg-surface dark:text-content">
      <SEO
        title={`${activeCategoryObj.label} — Grocery Categories`}
        description={`Explore ${activeCategoryObj.label} on DASHIT. Fresh items delivered directly from our Anantnag fulfillment store in 8 minutes.`}
        canonical="/categories/"
        ogType="website"
        keywords={`${activeCategoryObj.label}, groceries Anantnag, buy ${activeCategoryObj.shortName} Kashmir, DASHIT categories 192101`}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Categories", url: "/categories/" },
          { name: activeCategoryObj.label, url: `/categories/` },
        ]}
      />

      {/* 1. TOP HEADER */}
      <header className="bg-white px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-2.5 flex items-center justify-between border-b border-slate-200/90 shadow-2xs z-30 shrink-0 dark:bg-surface-raised dark:border-line/90">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => goBack(router, "/shop")}
            className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-700 active:scale-95 transition-transform dark:border-line dark:text-content-secondary"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <div>
            <h1 className="text-base font-black text-slate-900 leading-tight dark:text-content">
              Categories
            </h1>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-content-muted">
              Instant delivery in 8 mins
            </span>
          </div>
        </div>

        <Link
          href="/search"
          className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 active:scale-95 transition-transform dark:bg-surface-muted dark:text-content-secondary dark:border dark:border-line"
        >
          <Search className="w-4 h-4 stroke-[2.5]" />
        </Link>
      </header>

      {/* 2. SPLIT SCREEN BODY: Left Menu Bar + Right Items List */}
      <div className="flex grow overflow-hidden relative">
        {/* LEFT SIDEBAR: Categories Menu Bar */}
        <aside className="w-[88px] sm:w-24 shrink-0 bg-[#F0F2F5] border-r border-slate-200/90 overflow-y-auto scrollbar-none pb-dock dark:bg-surface dark:border-line/90">
          <div className="flex flex-col py-1.5 divide-y divide-slate-200/50 dark:divide-line/50">
            {CATEGORIES_CATALOG.map((cat) => {
              const isSelected = selectedCatId === cat.id;
              const Icon = cat.icon;

              return (
                <motion.button
                  key={cat.id}
                  whileTap={TAP_SOFT}
                  transition={SPRING_SNAPPY}
                  onClick={() => handleSelectCategory(cat.id)}
                  className={`flex flex-col items-center text-center p-2.5 relative transition-colors duration-300 select-none ${
                    isSelected
                      ? "bg-white text-slate-950 font-black shadow-xs dark:bg-surface-raised dark:text-content"
                      : "text-slate-600 hover:bg-slate-200/60 font-semibold dark:text-content-secondary"
                  }`}
                >
                  {/* Active Indicator Bar — slides between categories */}
                  {isSelected && (
                    <motion.span
                      layoutId="categorySidebarIndicator"
                      transition={SPRING_SOFT}
                      className="absolute left-0 top-1 bottom-1 w-1 bg-[#FF5B00] rounded-r-full"
                    />
                  )}

                  {/* Thumbnail Container: square cropped */}
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center overflow-hidden mb-1.5 transition-all duration-300 ${
                      isSelected
                        ? "scale-105 ring-2 ring-[#FF5B00] shadow-xs"
                        : "border border-slate-200/90 shadow-2xs"
                    } dark:border-line/90`}
                  >
                    <img
                      src={cat.img}
                      alt={cat.label}
                      className="w-full h-full object-cover aspect-square"
                      loading="lazy"
                    />
                  </div>

                  {/* Short Name Label */}
                  <span
                    className={`text-[10px] leading-tight tracking-tight max-w-[70px] ${
                      isSelected ? "text-slate-950 font-black dark:text-content" : "text-slate-600 dark:text-content-secondary"
                    }`}
                  >
                    {cat.shortName}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </aside>

        {/* RIGHT CONTENT: Products List for Selected Category */}
        <main className="grow bg-white overflow-y-auto px-3 pt-3 pb-dock dark:bg-surface-raised">
          <AnimatePresence mode="wait">
          <motion.div
            key={selectedCatId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.26, ease: EASE_OUT }}
          >
          {/* Header of Active Category */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100 dark:border-line-soft">
            <div>
              <h2 className="text-base font-extrabold text-slate-900 dark:text-content">
                {activeCategoryObj.label}
              </h2>
              <span className="text-[11px] font-semibold text-slate-400 dark:text-content-faint">
                {filteredProducts.length} items available
              </span>
            </div>
            <span className="text-[10px] font-black text-[#FF5B00] bg-orange-50 px-2 py-0.5 rounded-full border border-orange-200/70">
              8 Mins Hub
            </span>
          </div>

          {/* Products Grid */}
          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 px-4 space-y-3">
              <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto text-amber-600">
                <Package className="w-8 h-8" />
              </div>
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-content">
                Restocking fresh items
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto dark:text-content-muted">
                We are restocking items for {activeCategoryObj.label}. Check back shortly!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 sm:gap-2.5">
              {filteredProducts.map((p) => {
                const pId = String(p.id || p.barcode);
                const inCart = cart.find((i) => String(i.id || i.barcode) === pId);

                return (
                  <ProductCard
                    key={pId}
                    product={p}
                    compact={true}
                    qty={inCart ? inCart.qty : 0}
                    onAdd={() => handleAddToCart(p)}
                    onUpdateQty={(id, delta) => handleUpdateQty(id, delta)}
                    onIncrement={() => handleUpdateQty(pId, 1)}
                    onDecrement={() => handleUpdateQty(pId, -1)}
                    onQuickView={() => setSelectedQuickProduct(p)}
                    onOpenQuickView={() => setSelectedQuickProduct(p)}
                  />
                );
              })}
            </div>
          )}
          </motion.div>
          </AnimatePresence>
        </main>
      </div>

      {/* QUICK VIEW SHEET */}
      {selectedQuickProduct && (
        <QuickProductSheet
          product={selectedQuickProduct}
          isOpen={Boolean(selectedQuickProduct)}
          onClose={() => setSelectedQuickProduct(null)}
          cartQty={
            cart.find(
              (i) =>
                String(i.id || i.barcode) ===
                String(selectedQuickProduct.id || selectedQuickProduct.barcode)
            )?.qty || 0
          }
          onAddToCart={() => handleAddToCart(selectedQuickProduct)}
          onUpdateQty={(id, delta) =>
            handleUpdateQty(
              selectedQuickProduct.id || selectedQuickProduct.barcode,
              delta
            )
          }
        />
      )}
    </div>
  );
}
