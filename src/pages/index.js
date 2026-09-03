import { useState, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Search, Mic } from "lucide-react";
import AppHeader from "../components/AppHeader";
import CategoryScroller from "../components/CategoryScroller";
import PromoBanner from "../components/PromoBanner";
import CategoryGridSixPack from "../components/CategoryGridSixPack";
import ProductCard from "../components/ProductCard";
import HomeScreenLiveOrderCard from "../components/HomeScreenLiveOrderCard";
import FloatingCartBar from "../components/FloatingCartBar";
import BottomNav from "../components/BottomNav";
import QuickProductSheet from "../components/QuickProductSheet";
import LocationPickerModal from "../components/LocationPickerModal";
import InteractiveMapModal from "../components/InteractiveMapModal";
import { ALL_PRODUCTS } from "../data/products";

export default function StorefrontHome() {
  const router = useRouter();
  const [activeCategory, setActiveCategory] = useState("All");
  const [cart, setCart] = useState([]);
  const [selectedQuickProduct, setSelectedQuickProduct] = useState(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [isInteractiveMapOpen, setIsInteractiveMapOpen] = useState(false);
  const [location, setLocation] = useState({
    nickname: "HOME",
    address: "b-3,jamia appqrtment, Anantnag",
    lat: 33.7311,
    lng: 75.1487
  });

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("dashit_cart");
      if (savedCart) setCart(JSON.parse(savedCart));

      const savedAddress = localStorage.getItem("dashit_user_address");
      if (savedAddress) setLocation(JSON.parse(savedAddress));
    } catch (e) {}
  }, []);

  const saveCart = (newCart) => {
    setCart(newCart);
    try {
      localStorage.setItem("dashit_cart", JSON.stringify(newCart));
    } catch (e) {}
  };

  const handleAddToCart = (product) => {
    const existing = cart.find((i) => i.id === product.id);
    if (existing) {
      saveCart(cart.map((i) => (i.id === product.id ? { ...i, qty: i.qty + 1 } : i)));
    } else {
      saveCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const handleUpdateQty = (productId, delta) => {
    const item = cart.find((i) => i.id === productId);
    if (!item) return;
    const newQty = item.qty + delta;
    if (newQty <= 0) {
      saveCart(cart.filter((i) => i.id !== productId));
    } else {
      saveCart(cart.map((i) => (i.id === productId ? { ...i, qty: newQty } : i)));
    }
  };

  const filteredProducts = ALL_PRODUCTS.filter((p) => {
    if (activeCategory === "All") return true;
    if (activeCategory === "Snacks") return p.cat === "Snacks";
    if (activeCategory === "Grocery") return p.cat === "Grocery";
    if (activeCategory === "Bakery") return p.cat === "Bakery";
    if (activeCategory === "Dairy") return p.cat === "Dairy";
    if (activeCategory === "Drinks") return p.cat === "Drinks";
    return p.cat.toLowerCase().includes(activeCategory.toLowerCase());
  });

  return (
    <div className="min-h-screen bg-[#FFFDF5] text-slate-900 font-sans pb-32">
      <Head>
        <title>Dashit — Instant Grocery Delivery in 8 Mins</title>
      </Head>

      {/* 1. TOP DELIVERY BAR (Natural scroll: scrolls away smoothly without any DOM height shift or jitter) */}
      <AppHeader
        location={location}
        onOpenLocation={() => setIsLocationModalOpen(true)}
        hideStickySearch={true}
      />

      {/* 2. STICKY SEARCH & CATEGORY BAR (Pinned at top: 0 forever across the entire page!) */}
      <div className="sticky top-0 z-40 bg-[#FFFDF5]/98 backdrop-blur-xl border-b border-amber-100/60 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
        <div className="max-w-md mx-auto px-4 pt-1.5 pb-2">
          <div
            onClick={() => router.push("/search")}
            className="relative flex items-center bg-white text-slate-900 rounded-2xl px-3.5 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-200/90 cursor-pointer active:scale-[0.99] transition-transform"
          >
            <Search className="w-4 h-4 stroke-[2.5] text-slate-400 mr-2.5 shrink-0" />
            <span className="text-xs font-semibold text-slate-400 select-none">
              Search for atta, dal, coke and more
            </span>
            <Mic className="w-4 h-4 stroke-[2.5] text-slate-500 ml-auto shrink-0 hover:text-[#0c831f] transition-colors" />
          </div>
        </div>

        <CategoryScroller
          activeCategory={activeCategory}
          onSelectCategory={setActiveCategory}
        />
      </div>

      {/* MAIN BODY CONTENT */}
      <main className="max-w-md mx-auto px-4 pt-3 space-y-5">
        {/* 3. DISMISSABLE LIVE TRACKING CARD */}
        <HomeScreenLiveOrderCard />

        {/* 4. PROMOTIONAL HERO BANNER */}
        <PromoBanner onSelectPromo={(promo) => setActiveCategory(promo)} />

        {/* 5. 6-PACK CATEGORY GRID */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-black text-sm text-slate-900 tracking-tight">Explore Categories</h3>
            <button
              onClick={() => router.push("/categories")}
              className="text-xs font-extrabold text-[#0c831f] hover:underline"
            >
              See all →
            </button>
          </div>
          <CategoryGridSixPack onSelectCategory={(cat) => setActiveCategory(cat)} />
        </section>

        {/* 6. BESTSELLERS SECTION */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-black text-base text-slate-900 tracking-tight">Bestsellers</h3>
            <span className="text-xs font-extrabold text-[#0c831f]">See all</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {filteredProducts.map((p) => {
              const inCart = cart.find((i) => i.id === p.id);
              return (
                <ProductCard
                  key={p.id}
                  product={p}
                  qty={inCart ? inCart.qty : 0}
                  onAdd={() => handleAddToCart(p)}
                  onIncrement={() => handleUpdateQty(p.id, 1)}
                  onDecrement={() => handleUpdateQty(p.id, -1)}
                  onQuickView={() => setSelectedQuickProduct(p)}
                />
              );
            })}
          </div>
        </section>
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
        onSelectLocation={(newLoc) => setLocation(newLoc)}
      />

      {/* 9. INTERACTIVE MAP MODAL */}
      <InteractiveMapModal
        isOpen={isInteractiveMapOpen}
        onClose={() => setIsInteractiveMapOpen(false)}
        onConfirmLocation={(newLoc) => setLocation(newLoc)}
      />

      {/* 10. FLOATING VIEW CART BAR (Smaller pill with ShoppingBag icon) */}
      <FloatingCartBar cart={cart} />

      {/* 11. FLOATING BOTTOM NAVIGATION */}
      <BottomNav />
    </div>
  );
}
