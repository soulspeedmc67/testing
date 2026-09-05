import { useState, useEffect, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { fadeUp, EASE_OUT, SPRING_SOFT, SPRING_SNAPPY, TAP_SOFT } from "../lib/motion";
import {
  ArrowLeft,
  Search,
  Sparkles,
  Cookie,
  Coffee,
  Milk,
  Apple,
  Package,
  Heart,
  Home,
  Croissant,
  Utensils,
  Flame,
  Check
} from "lucide-react";
import ProductCard from "../components/ProductCard";
import QuickProductSheet from "../components/QuickProductSheet";
import { ALL_PRODUCTS } from "../data/products";
import { hapticLight, hapticCartAdd } from "../lib/haptics";

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
    id: "Dairy",
    label: "Dairy & Eggs",
    shortName: "Dairy",
    icon: Milk,
    img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=120&auto=format&fit=crop&q=80",
    aliases: ["dairy", "milk", "eggs", "butter", "curd", "paneer"]
  },
  {
    id: "Chips",
    label: "Chips & Crisps",
    shortName: "Chips",
    icon: Sparkles,
    img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=120&auto=format&fit=crop&q=80",
    aliases: ["chips", "crisps", "wafers", "lays", "kurkure"]
  },
  {
    id: "Snacks",
    label: "Snacks & Munchies",
    shortName: "Snacks",
    icon: Cookie,
    img: "https://images.unsplash.com/photo-1599490659213-e2b9527bd087?w=120&auto=format&fit=crop&q=80",
    aliases: ["snacks", "munchies", "namkeen", "sev"]
  },
  {
    id: "Biscuits",
    label: "Bakery & Biscuits",
    shortName: "Biscuits",
    icon: Croissant,
    img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=120&auto=format&fit=crop&q=80",
    aliases: ["biscuits", "cookies", "toast", "bakery", "bread", "rusk"]
  },
  {
    id: "Drinks",
    label: "Cold Drinks & Juices",
    shortName: "Drinks",
    icon: Coffee,
    img: "https://images.unsplash.com/photo-1554866585-cd94860890b7?w=120&auto=format&fit=crop&q=80",
    aliases: ["drinks", "beverages", "cold drink", "juice", "soda", "coke"]
  },
  {
    id: "Chocolates",
    label: "Sweets & Chocolates",
    shortName: "Sweets",
    icon: Heart,
    img: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=120&auto=format&fit=crop&q=80",
    aliases: ["chocolates", "chocolate", "sweets", "candy", "treats"]
  },
  {
    id: "Grocery",
    label: "Grocery & Kitchen",
    shortName: "Grocery",
    icon: Package,
    img: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=120&auto=format&fit=crop&q=80",
    aliases: ["grocery", "staples", "atta", "rice", "oil", "ghee", "masala", "salt"]
  },
  {
    id: "Vegetables",
    label: "Vegetables & Fruits",
    shortName: "Fresh",
    icon: Apple,
    img: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=120&auto=format&fit=crop&q=80",
    aliases: ["vegetables", "fruits", "veggies", "produce", "fresh"]
  },
  {
    id: "Instant Food",
    label: "Instant & Frozen Food",
    shortName: "Instant",
    icon: Utensils,
    img: "https://images.unsplash.com/photo-1612927601601-6638404737ce?w=120&auto=format&fit=crop&q=80",
    aliases: ["instant food", "noodles", "maggi", "pasta", "ready to eat"]
  },
  {
    id: "Personal Care",
    label: "Personal Care & Hygiene",
    shortName: "Personal",
    icon: Sparkles,
    img: "https://images.unsplash.com/photo-1556228720-195a672e8a03?w=120&auto=format&fit=crop&q=80",
    aliases: ["personal care", "soap", "shampoo", "toothpaste", "hygiene"]
  },
  {
    id: "Household Items",
    label: "Home & Cleaning",
    shortName: "Household",
    icon: Home,
    img: "https://images.unsplash.com/photo-1584813470613-5b1c1cad3d69?w=120&auto=format&fit=crop&q=80",
    aliases: ["household items", "household", "cleaning", "detergent"]
  }
];

export default function CategoriesPage() {
  const router = useRouter();
  const [selectedCatId, setSelectedCatId] = useState("Dairy");
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

  // Fetch live products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetch("http://192.168.217.22:5001/api/products");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.products?.length > 0) {
            setProductsList(data.products);
            return;
          }
        }
      } catch (e) {}

      try {
        const res = await fetch("http://localhost:5001/api/products");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.products?.length > 0) {
            setProductsList(data.products);
          }
        }
      } catch (e) {}
    };
    loadProducts();
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
    <div className="flex flex-col h-screen bg-[#F7F8FA] text-slate-900 font-sans overflow-hidden">
      <Head>
        <title>{activeCategoryObj.label} — Dashit Categories</title>
      </Head>

      {/* 1. TOP HEADER */}
      <header className="bg-white px-4 pt-[max(46px,calc(env(safe-area-inset-top,0px)+40px))] pb-2.5 flex items-center justify-between border-b border-slate-200/90 shadow-2xs z-30 shrink-0">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-700 active:scale-95 transition-transform"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <div>
            <h1 className="text-base font-black text-slate-900 leading-tight">
              Categories
            </h1>
            <span className="text-[11px] font-semibold text-slate-500">
              Instant delivery in 8 mins
            </span>
          </div>
        </div>

        <Link
          href="/search"
          className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 active:scale-95 transition-transform"
        >
          <Search className="w-4 h-4 stroke-[2.5]" />
        </Link>
      </header>

      {/* 2. SPLIT SCREEN BODY: Left Menu Bar + Right Items List */}
      <div className="flex grow overflow-hidden relative">
        {/* LEFT SIDEBAR: Categories Menu Bar */}
        <aside className="w-[88px] sm:w-24 shrink-0 bg-[#F0F2F5] border-r border-slate-200/90 overflow-y-auto scrollbar-none pb-32">
          <div className="flex flex-col py-1.5 divide-y divide-slate-200/50">
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
                      ? "bg-white text-slate-950 font-black shadow-xs"
                      : "text-slate-600 hover:bg-slate-200/60 font-semibold"
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
                    }`}
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
                      isSelected ? "text-slate-950 font-black" : "text-slate-600"
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
        <main className="grow bg-white overflow-y-auto px-3 pt-3 pb-36">
          <AnimatePresence mode="wait">
          <motion.div
            key={selectedCatId}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.26, ease: EASE_OUT }}
          >
          {/* Header of Active Category */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-100">
            <div>
              <h2 className="text-base font-extrabold text-slate-900">
                {activeCategoryObj.label}
              </h2>
              <span className="text-[11px] font-semibold text-slate-400">
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
              <h3 className="font-extrabold text-sm text-slate-800">
                Restocking fresh items
              </h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Our Nai Basti dark store is restocking items for {activeCategoryObj.label}. Check back shortly!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2.5">
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
