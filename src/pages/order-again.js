import { useState, useEffect } from "react";
import Head from "next/head";
import { ShoppingBag } from "lucide-react";
import AppHeader from "../components/AppHeader";
import BottomNav from "../components/BottomNav";
import ProductCard from "../components/ProductCard";
import QuickProductSheet from "../components/QuickProductSheet";
import LocationPickerModal from "../components/LocationPickerModal";
import { ALL_PRODUCTS } from "../data/products";

export default function OrderAgainPage() {
  const [cart, setCart] = useState([]);
  const [selectedQuickProduct, setSelectedQuickProduct] = useState(null);
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
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
        {/* REORDERING WILL BE EASY HERO CARD matching Screenshot 3 */}
        <div className="bg-gradient-to-b from-amber-50/80 to-white border border-amber-100/90 rounded-3xl p-6 text-center shadow-xs space-y-3">
          {/* Grocery Bag Icon Container */}
          <div className="w-24 h-24 mx-auto bg-amber-100/60 rounded-3xl flex items-center justify-center p-3 shadow-inner border border-amber-200/60">
            <ShoppingBag className="w-12 h-12 stroke-[2.2] text-amber-600" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Reordering will be easy
            </h2>
            <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto leading-relaxed">
              Items you order will show up here so you can buy them again easily with a single tap.
            </p>
          </div>
        </div>

        {/* BESTSELLERS PRODUCT RAIL / GRID */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 tracking-tight">
              Bestsellers
            </h3>
            <span className="text-xs font-bold text-[#0c831f]">See all</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {ALL_PRODUCTS.map((prod) => {
              const cartItem = cart.find((i) => i.id === prod.id);
              const qty = cartItem ? cartItem.qty : 0;

              return (
                <ProductCard
                  key={prod.id}
                  product={prod}
                  qty={qty}
                  onAdd={handleAddToCart}
                  onUpdateQty={handleUpdateQty}
                  onOpenQuickView={setSelectedQuickProduct}
                />
              );
            })}
          </div>
        </section>
      </main>

      <QuickProductSheet
        product={selectedQuickProduct}
        isOpen={!!selectedQuickProduct}
        onClose={() => setSelectedQuickProduct(null)}
        onAddToCart={handleAddToCart}
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
