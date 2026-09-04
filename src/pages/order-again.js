import { useState, useEffect, useMemo } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import {
  RotateCcw,
  Sparkles,
  ShoppingBag,
  Clock,
  TrendingUp,
  Plus,
  Minus,
  Check,
  ChevronRight,
  Truck
} from "lucide-react";
import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import ProductCard from "../components/ProductCard";
import QuickProductSheet from "../components/QuickProductSheet";
import LocationPickerModal from "../components/LocationPickerModal";
import { ALL_PRODUCTS } from "../data/products";
import { hapticLight, hapticSuccess } from "../lib/haptics";

export default function OrderAgainPage() {
  const router = useRouter();
  const [cart, setCart] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [ordersHistory, setOrdersHistory] = useState([]);
  const [selectedQuickProduct, setSelectedQuickProduct] = useState(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [suggestionCategory, setSuggestionCategory] = useState("Snacks");
  const [location, setLocation] = useState({
    nickname: "HOME",
    address: "b-3,jamia appqrtment, Anantnag",
    lat: 33.7311,
    lng: 75.1487,
  });

  useEffect(() => {
    try {
      const savedCart = localStorage.getItem("dashit_cart");
      if (savedCart) setCart(JSON.parse(savedCart));

      const savedAddress = localStorage.getItem("dashit_user_address");
      if (savedAddress) setLocation(JSON.parse(savedAddress));

      const active = localStorage.getItem("dashit_active_order");
      if (active) setActiveOrder(JSON.parse(active));

      const history = localStorage.getItem("dashit_orders_history");
      if (history) setOrdersHistory(JSON.parse(history));
    } catch (e) {}

    const syncCart = () => {
      try {
        const c = localStorage.getItem("dashit_cart");
        if (c) setCart(JSON.parse(c));
      } catch (e) {}
    };

    window.addEventListener("dashit_cart_updated", syncCart);
    return () => window.removeEventListener("dashit_cart_updated", syncCart);
  }, []);

  const saveCart = (newCart) => {
    setCart(newCart);
    try {
      localStorage.setItem("dashit_cart", JSON.stringify(newCart));
      window.dispatchEvent(new Event("dashit_cart_updated"));
    } catch (e) {}
  };

  const handleAddToCart = (product) => {
    hapticLight();
    const pId = product.id || product.barcode;
    const existing = cart.find((i) => (i.id || i.barcode) === pId);
    if (existing) {
      saveCart(cart.map((i) => ((i.id || i.barcode) === pId ? { ...i, qty: i.qty + 1 } : i)));
    } else {
      saveCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const handleUpdateQty = (productId, delta) => {
    hapticLight();
    const item = cart.find((i) => (i.id || i.barcode) === productId);
    if (!item) return;
    const newQty = item.qty + delta;
    if (newQty <= 0) {
      saveCart(cart.filter((i) => (i.id || i.barcode) !== productId));
    } else {
      saveCart(cart.map((i) => ((i.id || i.barcode) === productId ? { ...i, qty: newQty } : i)));
    }
  };

  // Extract distinct items previously ordered by the user
  const reorderItems = useMemo(() => {
    const itemMap = new Map();

    // From active order
    if (activeOrder && Array.isArray(activeOrder.items)) {
      activeOrder.items.forEach((item) => {
        const id = item.id || item.barcode;
        if (id && !itemMap.has(id)) {
          itemMap.set(id, {
            ...item,
            fromOrder: activeOrder.orderId,
            orderDate: activeOrder.createdAt || "Recent",
          });
        }
      });
    }

    // From orders history
    if (Array.isArray(ordersHistory)) {
      ordersHistory.forEach((ord) => {
        if (Array.isArray(ord.items)) {
          ord.items.forEach((item) => {
            const id = item.id || item.barcode;
            if (id && !itemMap.has(id)) {
              itemMap.set(id, {
                ...item,
                fromOrder: ord.orderId,
                orderDate: ord.createdAt || "Past order",
              });
            }
          });
        }
      });
    }

    return Array.from(itemMap.values());
  }, [activeOrder, ordersHistory]);

  // Reorder entire last order
  const handleReorderLastOrder = () => {
    hapticSuccess();
    const sourceOrder = activeOrder || ordersHistory[0];
    if (!sourceOrder || !sourceOrder.items) return;

    const merged = [...cart];
    sourceOrder.items.forEach((newItem) => {
      const existingIdx = merged.findIndex((i) => (i.id || i.barcode) === (newItem.id || newItem.barcode));
      if (existingIdx >= 0) {
        merged[existingIdx].qty += newItem.qty || 1;
      } else {
        merged.push({ ...newItem, qty: newItem.qty || 1 });
      }
    });

    saveCart(merged);
    router.push("/checkout");
  };

  // Suggestions for "Buy More" section
  const suggestions = useMemo(() => {
    if (suggestionCategory === "Snacks") {
      return ALL_PRODUCTS.filter((p) => p.cat === "Snacks");
    } else if (suggestionCategory === "Drinks") {
      return ALL_PRODUCTS.filter((p) => p.cat === "Drinks");
    } else if (suggestionCategory === "Bakery") {
      return ALL_PRODUCTS.filter((p) => p.cat === "Bakery");
    }
    return ALL_PRODUCTS.slice(0, 6);
  }, [suggestionCategory]);

  const cartSubtotal = cart.reduce((sum, item) => sum + (item.price || 0) * (item.qty || 1), 0);
  const freeDeliveryThreshold = 199;
  const remainingForFree = Math.max(0, freeDeliveryThreshold - cartSubtotal);

  return (
    <div className="min-h-screen bg-[#FFFDF5] text-slate-900 font-sans pb-32">
      <Head>
        <title>Order Again — Dashit</title>
      </Head>

      <AppHeader
        location={location}
        onOpenLocation={() => setIsLocationModalOpen(true)}
      />

      <main className="max-w-md mx-auto px-4 pt-3 space-y-5">
        {/* FREE DELIVERY / SAVINGS PROGRESS CHIP */}
        <div className="bg-gradient-to-r from-blue-50 via-sky-50/60 to-white border border-blue-200/80 rounded-2xl p-3 shadow-xs">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center space-x-2">
              <Truck className="w-4 h-4 text-[#061838]" />
              <span className="font-extrabold text-[#061838]">
                {remainingForFree > 0
                  ? `Add ₹${remainingForFree} more for FREE delivery`
                  : "🎉 Free Delivery Unlocked on this basket!"}
              </span>
            </div>
            <span className="font-mono font-black text-xs text-[#FF5B00]">
              Cart: ₹{cartSubtotal}
            </span>
          </div>
          <div className="h-1.5 w-full bg-slate-100 rounded-full mt-2 overflow-hidden">
            <motion.div
              className="h-full bg-[#FF5B00] rounded-full"
              initial={{ width: 0 }}
              animate={{
                width: `${Math.min(100, Math.round((cartSubtotal / freeDeliveryThreshold) * 100))}%`,
              }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* 1. RECENT BASKET 1-TAP REORDER HERO */}
        {(activeOrder || ordersHistory.length > 0) ? (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-4 shadow-sm space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-[#FF5B00] flex items-center justify-center border border-amber-200/60 shadow-2xs">
                  <RotateCcw className="w-4 h-4 stroke-[2.8]" />
                </div>
                <div>
                  <h2 className="font-black text-xs text-slate-900 tracking-tight">
                    Reorder Your Recent Order
                  </h2>
                  <p className="text-[10px] font-mono text-slate-400 font-semibold">
                    #{(activeOrder || ordersHistory[0])?.orderId} · {((activeOrder || ordersHistory[0])?.items || []).length} items
                  </p>
                </div>
              </div>

              <span className="font-mono font-black text-sm text-[#061838]">
                ₹{(activeOrder || ordersHistory[0])?.grandTotal || 0}
              </span>
            </div>

            {/* Preview of items in recent order */}
            <div className="flex space-x-2 overflow-x-auto scrollbar-none py-1">
              {((activeOrder || ordersHistory[0])?.items || []).map((it) => (
                <div
                  key={it.id || it.barcode}
                  className="w-16 shrink-0 bg-slate-50 border border-slate-100 rounded-2xl p-1.5 text-center"
                >
                  <img
                    src={it.img}
                    alt={it.name}
                    className="w-10 h-10 object-contain mx-auto rounded-lg"
                  />
                  <span className="text-[9px] font-extrabold text-slate-700 block truncate mt-1">
                    {it.name}
                  </span>
                  <span className="text-[9px] font-mono font-bold text-slate-500 block">
                    ₹{it.price}
                  </span>
                </div>
              ))}
            </div>

            {/* 1-Tap Reorder Basket Button in Trust Navy */}
            <button
              onClick={handleReorderLastOrder}
              className="w-full py-3 rounded-2xl bg-[#061838] hover:bg-slate-900 text-white font-black text-xs flex items-center justify-center space-x-2 shadow-md active:scale-[0.98] transition-transform cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 stroke-[2.8] text-[#FF5B00]" />
              <span>Reorder Entire Basket to Checkout</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <div className="bg-gradient-to-b from-amber-50/80 to-white border border-amber-100/90 rounded-3xl p-6 text-center shadow-xs space-y-3">
            <div className="w-20 h-20 mx-auto bg-amber-100/70 rounded-3xl flex items-center justify-center p-3 shadow-inner border border-amber-200/60">
              <ShoppingBag className="w-10 h-10 stroke-[2] text-amber-600" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                Reordering will be easy
              </h2>
              <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto leading-relaxed">
                Items you order will show up here so you can reorder fresh essentials in 8 minutes with 1 tap.
              </p>
            </div>
          </div>
        )}

        {/* 2. PREVIOUSLY ORDERED ITEMS GRID */}
        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center space-x-1.5">
              <span className="w-2 h-2 rounded-full bg-[#FF5B00]" />
              <h3 className="text-sm font-black text-[#061838] tracking-tight">
                {reorderItems.length > 0
                  ? `Previously Ordered by You (${reorderItems.length})`
                  : "Frequently Reordered Essentials"}
              </h3>
            </div>
            <span className="text-[11px] font-bold text-slate-400">1-Tap Add</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {(reorderItems.length > 0 ? reorderItems : ALL_PRODUCTS.slice(0, 6)).map((prod) => {
              const pId = prod.id || prod.barcode;
              const inCart = cart.find((i) => (i.id || i.barcode) === pId);
              const qty = inCart ? inCart.qty : 0;

              return (
                <div
                  key={pId}
                  className="bg-white rounded-2xl border border-slate-200/90 p-3 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow relative overflow-hidden"
                >
                  <div className="relative w-full h-28 bg-slate-50 rounded-xl p-2 flex items-center justify-center border border-slate-100 mb-2 overflow-hidden shrink-0">
                    <img
                      src={prod.img}
                      alt={prod.name}
                      className="w-full h-full object-contain pointer-events-none select-none"
                    />
                    {prod.fromOrder && (
                      <span className="absolute top-1 left-1 bg-blue-50 text-[#061838] font-mono text-[8px] font-black px-1.5 py-0.5 rounded-md border border-blue-200/60 shadow-2xs">
                        #{prod.fromOrder}
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 block">
                      {prod.unit || "1 unit"}
                    </span>
                    <h4 className="text-xs font-black text-slate-800 line-clamp-2 leading-snug">
                      {prod.name}
                    </h4>
                    <div className="flex items-baseline space-x-1 pt-0.5">
                      <span className="text-xs font-black text-slate-900 font-mono">
                        ₹{prod.price}
                      </span>
                      {prod.originalPrice > prod.price && (
                        <span className="text-[10px] text-slate-400 line-through font-mono">
                          ₹{prod.originalPrice}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Trust Navy 1-Tap Reorder Button or Active Stepper */}
                  <div className="mt-2.5">
                    {qty === 0 ? (
                      <button
                        type="button"
                        onClick={() => handleAddToCart(prod)}
                        className="w-full py-1.5 rounded-xl border-2 border-[#061838] bg-white hover:bg-slate-50 text-[#061838] font-black text-xs flex items-center justify-center space-x-1 active:scale-95 transition-transform cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Reorder</span>
                      </button>
                    ) : (
                      <div className="flex items-center justify-between bg-[#061838] text-white rounded-xl px-2 py-1 shadow-xs">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(pId, -1)}
                          className="p-0.5 active:scale-75 transition-transform cursor-pointer"
                        >
                          <Minus className="w-3 h-3 stroke-[3]" />
                        </button>
                        <span className="font-mono font-black text-xs">{qty}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(pId, 1)}
                          className="p-0.5 active:scale-75 transition-transform cursor-pointer"
                        >
                          <Plus className="w-3 h-3 stroke-[3]" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 3. "SUGGESTIONS TO BUY MORE" (Smart Additions Rail) */}
        <section className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <div>
              <div className="flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#FF5B00] stroke-[2.5]" />
                <h3 className="text-sm font-black text-[#061838] tracking-tight">
                  Suggested Additions · Buy More
                </h3>
              </div>
              <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                Popular items frequently bought together
              </p>
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex space-x-2 overflow-x-auto scrollbar-none pb-1">
            {["Snacks", "Drinks", "Bakery"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  hapticLight();
                  setSuggestionCategory(cat);
                }}
                className={`px-3 py-1 rounded-full text-xs font-black transition-all cursor-pointer ${
                  suggestionCategory === cat
                    ? "bg-[#061838] text-white shadow-xs"
                    : "bg-white text-slate-600 border border-slate-200/90 hover:border-slate-400"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Suggestions Cards Rail */}
          <div className="flex space-x-3 overflow-x-auto scrollbar-none pb-2">
            {suggestions.map((sug) => {
              const pId = sug.id || sug.barcode;
              const inCart = cart.find((i) => (i.id || i.barcode) === pId);
              const qty = inCart ? inCart.qty : 0;

              return (
                <div
                  key={pId}
                  className="w-[160px] shrink-0 bg-white border border-slate-200/90 rounded-2xl p-2.5 flex flex-col justify-between shadow-2xs space-y-2 overflow-hidden"
                >
                  <div className="relative w-full h-28 bg-slate-50 rounded-xl p-2 flex items-center justify-center border border-slate-100 overflow-hidden shrink-0">
                    <img
                      src={sug.img}
                      alt={sug.name}
                      className="w-full h-full object-contain pointer-events-none select-none"
                    />
                    {sug.badge && (
                      <span className="absolute top-1 left-1 bg-amber-100 text-amber-900 font-extrabold text-[8px] px-1.5 py-0.5 rounded-md shadow-2xs">
                        {sug.badge}
                      </span>
                    )}
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-slate-400 block">{sug.unit}</span>
                    <h4 className="text-xs font-bold text-slate-800 line-clamp-2 leading-tight">
                      {sug.name}
                    </h4>
                    <span className="text-xs font-black text-slate-900 font-mono block mt-0.5">
                      ₹{sug.price}
                    </span>
                  </div>

                  <div>
                    {qty === 0 ? (
                      <button
                        type="button"
                        onClick={() => handleAddToCart(sug)}
                        className="w-full py-1.5 rounded-xl border-2 border-[#061838] bg-white hover:bg-slate-50 text-[#061838] font-black text-xs flex items-center justify-center space-x-1 active:scale-95 transition-transform cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Add</span>
                      </button>
                    ) : (
                      <div className="flex items-center justify-between bg-[#061838] text-white rounded-xl px-2 py-1 shadow-xs">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(pId, -1)}
                          className="p-0.5 active:scale-75 transition-transform cursor-pointer"
                        >
                          <Minus className="w-3 h-3 stroke-[3]" />
                        </button>
                        <span className="font-mono font-black text-xs">{qty}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(pId, 1)}
                          className="p-0.5 active:scale-75 transition-transform cursor-pointer"
                        >
                          <Plus className="w-3 h-3 stroke-[3]" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      <QuickProductSheet
        product={selectedQuickProduct}
        isOpen={Boolean(selectedQuickProduct)}
        onClose={() => setSelectedQuickProduct(null)}
        cartQty={
          selectedQuickProduct
            ? cart.find((i) => (i.id || i.barcode) === (selectedQuickProduct.id || selectedQuickProduct.barcode))?.qty || 0
            : 0
        }
        onAdd={() => selectedQuickProduct && handleAddToCart(selectedQuickProduct)}
        onIncrement={() => selectedQuickProduct && handleUpdateQty(selectedQuickProduct.id || selectedQuickProduct.barcode, 1)}
        onDecrement={() => selectedQuickProduct && handleUpdateQty(selectedQuickProduct.id || selectedQuickProduct.barcode, -1)}
      />

      <LocationPickerModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSelectLocation={(loc) => setLocation(loc)}
        currentLocation={location}
      />
    </div>
  );
}
