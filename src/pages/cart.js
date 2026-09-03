import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ShoppingBag, ArrowRight, MapPin, Plus, Minus, Trash2, ArrowLeft, Tag, ShieldCheck, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import LocationPickerModal from "../components/LocationPickerModal";
import ProductCardStepper from "../components/ProductCardStepper";
import { EmptyCartState } from "../components/ui/EmptyState";

const CART_SUGGESTIONS = [
  { id: 10, name: "Amul Pasteurised Salted Butter 100g", price: 58, originalPrice: 60, unit: "100g", img: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=200&auto=format&fit=crop&q=80" },
  { id: 11, name: "Fresh Kashmiri Lavas Bread (4 pcs)", price: 30, originalPrice: 40, unit: "4 pcs", img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=200&auto=format&fit=crop&q=80" },
  { id: 12, name: "Lay's Magic Masala Potato Chips", price: 20, originalPrice: 20, unit: "50g", img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=200&auto=format&fit=crop&q=80" },
  { id: 13, name: "Cadbury Dairy Milk Silk Chocolate", price: 175, originalPrice: 190, unit: "150g", img: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=200&auto=format&fit=crop&q=80" }
];

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState([]);
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);

  const [location, setLocation] = useState({
    nickname: "Home",
    address: "Nai Basti, Near Petrol Pump, Anantnag",
    lat: 33.7311,
    lng: 75.1487
  });
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  useEffect(() => {
    const savedCart = localStorage.getItem("dashit_cart");
    if (savedCart) {
      try { setCart(JSON.parse(savedCart)); } catch (e) {}
    }
  }, []);

  const saveCartState = (updated) => {
    setCart(updated);
    try {
      localStorage.setItem("dashit_cart", JSON.stringify(updated));
      window.dispatchEvent(new Event("dashit_cart_updated"));
    } catch (e) {}
  };

  const updateQty = (id, delta) => {
    const updated = cart
      .map((item) => (item.id === id ? { ...item, qty: item.qty + delta } : item))
      .filter((item) => item.qty > 0);
    saveCartState(updated);
  };

  const addSuggestedItem = (prod) => {
    const existing = cart.find((i) => i.id === prod.id);
    let updated;
    if (existing) {
      updated = cart.map((i) => (i.id === prod.id ? { ...i, qty: i.qty + 1 } : i));
    } else {
      updated = [...cart, { ...prod, qty: 1 }];
    }
    saveCartState(updated);
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const originalSubtotal = cart.reduce((sum, item) => sum + (item.originalPrice || item.price + 10) * item.qty, 0);
  const deliveryFee = subtotal >= 399 || subtotal === 0 ? 0 : 25;
  const handlingFee = subtotal > 0 ? 5 : 0;
  const totalSavings = (originalSubtotal - subtotal) + discount;
  const grandTotal = Math.max(0, subtotal + deliveryFee + handlingFee - discount);

  const applyCoupon = () => {
    if (couponCode.toUpperCase() === "ANANTNAG10") {
      setDiscount(20);
      alert("Coupon ANANTNAG10 Applied! ₹20 Discount.");
    } else {
      alert("Invalid Code! Try ANANTNAG10");
    }
  };

  const proceedToCheckout = () => {
    if (cart.length === 0) return;
    localStorage.setItem("dashit_checkout_data", JSON.stringify({
      cart,
      subtotal,
      deliveryFee,
      handlingFee,
      discount,
      grandTotal,
      savings: totalSavings,
      location
    }));
    router.push("/checkout");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 pt-[max(12px,env(safe-area-inset-top,12px))] pb-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              if (window.history.length > 1) {
                router.back();
              } else {
                router.push("/");
              }
            }}
            className="p-1 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 active:scale-90 transition-transform"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-extrabold text-base text-slate-900">My Cart ({cart.reduce((s, i) => s + i.qty, 0)})</h1>
        </div>
        <button
          onClick={() => setIsLocationModalOpen(true)}
          className="flex items-center space-x-1 text-xs text-[#0c831f] bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 font-bold"
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>{location.nickname}</span>
        </button>
      </header>

      <main className="max-w-md mx-auto px-4 mt-4 space-y-4">
        <LocationPickerModal
          isOpen={isLocationModalOpen}
          onClose={() => setIsLocationModalOpen(false)}
          onSelectLocation={(loc) => setLocation(loc)}
          currentLocation={location}
        />

        {cart.length === 0 ? (
          <EmptyCartState />
        ) : (
          <>
            {/* Delivery Address Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-100 text-[#0c831f] rounded-2xl">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-extrabold text-slate-900">Deliver to {location.nickname}</span>
                  <p className="text-[11px] font-medium text-slate-500 truncate max-w-[200px]">{location.address}</p>
                </div>
              </div>
              <button
                onClick={() => setIsLocationModalOpen(true)}
                className="text-xs font-bold text-[#0c831f] hover:underline"
              >
                Change
              </button>
            </div>

            {/* Cart Items List with Smooth Physics Removal */}
            <div className="bg-white border border-slate-200 rounded-3xl p-4 space-y-3 shadow-sm divide-y divide-slate-100 overflow-hidden">
              <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider pb-1">Selected Items</h3>
              <AnimatePresence initial={false}>
                {cart.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.9, marginTop: 0, paddingTop: 0, paddingBottom: 0 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className="pt-3 flex items-center justify-between overflow-hidden"
                  >
                    <div className="flex items-center space-x-3">
                      <img src={item.img} alt={item.name} className="w-12 h-12 object-contain bg-slate-50 p-1 rounded-xl border border-slate-100" />
                      <div>
                        <h4 className="font-bold text-xs text-slate-900">{item.name}</h4>
                        <p className="text-[11px] font-semibold text-slate-500">₹{item.price} x {item.qty}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 text-[#0c831f] rounded-xl px-2 py-1 font-bold">
                      <motion.button whileTap={{ scale: 0.75 }} onClick={() => updateQty(item.id, -1)} className="hover:opacity-80 p-0.5">
                        <Minus className="w-3.5 h-3.5" />
                      </motion.button>
                      <motion.span
                        key={`qty-${item.qty}`}
                        initial={{ scale: 1.3 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 400, damping: 20 }}
                        className="text-xs font-extrabold px-1 font-mono"
                      >
                        {item.qty}
                      </motion.span>
                      <motion.button whileTap={{ scale: 0.75 }} onClick={() => updateQty(item.id, 1)} className="hover:opacity-80 p-0.5">
                        <Plus className="w-3.5 h-3.5" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Coupon Code Section */}
            <div className="bg-white border border-slate-200 rounded-3xl p-3 flex space-x-2 shadow-sm">
              <div className="flex items-center pl-2 text-slate-400">
                <Tag className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Enter Promo Code (e.g. ANANTNAG10)..."
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-900 grow focus:outline-none placeholder-slate-400"
              />
              <button
                onClick={applyCoupon}
                className="bg-emerald-50 text-[#0c831f] text-xs font-extrabold px-4 py-2 rounded-2xl border border-emerald-200 hover:bg-[#0c831f] hover:text-white transition-all shadow-sm"
              >
                APPLY
              </button>
            </div>

            {/* Bill Summary */}
            <div className="bg-white border border-slate-200 rounded-3xl p-4 space-y-2.5 text-xs shadow-sm">
              <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider mb-2">Bill Details</h3>
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Item Subtotal</span>
                <span className="text-slate-900 font-bold font-mono">₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Delivery Charge (Free above ₹399)</span>
                <span className="text-[#0c831f] font-bold font-mono">{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}</span>
              </div>
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Handling & Store Charge</span>
                <span className="text-slate-900 font-bold font-mono">₹{handlingFee}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-[#0c831f] font-bold">
                  <span>Coupon Discount</span>
                  <span className="font-mono">-₹{discount}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-100 flex justify-between font-extrabold text-sm text-slate-900">
                <span>To Pay</span>
                <span className="text-[#0c831f] font-mono text-base">₹{grandTotal}</span>
              </div>
              <div className="bg-emerald-50 text-[#0c831f] text-[11px] font-extrabold px-3 py-2 rounded-2xl text-center border border-emerald-200 flex items-center justify-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 stroke-[2.5] shrink-0" />
                <span>You are saving ₹{totalSavings} on this order!</span>
              </div>
            </div>

            {/* ITEM SUGGESTIONS UNDER BILL DETAILS */}
            <div className="bg-white border border-slate-200 rounded-3xl p-4 space-y-3 shadow-sm">
              <div className="flex items-center space-x-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="font-black text-xs text-slate-900 uppercase tracking-wider">Frequently Added Together</h3>
              </div>

              <div className="flex space-x-3 overflow-x-auto scrollbar-none pb-1">
                {CART_SUGGESTIONS.map((sug) => (
                  <div
                    key={sug.id}
                    className="w-[130px] shrink-0 bg-slate-50 border border-slate-200 rounded-2xl p-2.5 flex flex-col justify-between space-y-1.5"
                  >
                    <img src={sug.img} alt={sug.name} className="w-16 h-16 object-contain mx-auto bg-white rounded-xl p-1" />
                    <div>
                      <span className="text-[9px] font-bold text-slate-400">{sug.unit}</span>
                      <h4 className="font-bold text-[11px] text-slate-900 leading-tight line-clamp-2">{sug.name}</h4>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span className="text-xs font-black text-slate-900 font-mono">₹{sug.price}</span>
                      <div className="w-14">
                        <ProductCardStepper
                          product={sug}
                          qty={cart.find((i) => i.id === sug.id)?.qty || 0}
                          onAdd={() => addSuggestedItem(sug)}
                          onUpdateQty={updateQty}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Security Badge */}
            <div className="flex items-center justify-center space-x-1.5 text-[11px] font-semibold text-slate-500 py-1 mb-20">
              <ShieldCheck className="w-4 h-4 text-[#0c831f]" />
              <span>100% Safe & Contactless Delivery</span>
            </div>

            {/* Sticky Proceed to Payment CTA */}
            <div className="fixed bottom-0 left-0 right-0 z-40 bg-white/98 backdrop-blur-md border-t border-slate-200 p-4 pb-[max(14px,env(safe-area-inset-bottom,14px))] shadow-[0_-10px_30px_rgba(0,0,0,0.08)]">
              <div className="max-w-md mx-auto">
                <button
                  onClick={proceedToCheckout}
                  className="w-full bg-[#0c831f] hover:bg-emerald-800 text-white font-extrabold text-sm py-3.5 rounded-2xl shadow-lg transition-all active:scale-[0.98] flex items-center justify-center space-x-2"
                >
                  <span>Proceed to Payment (₹{grandTotal})</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
