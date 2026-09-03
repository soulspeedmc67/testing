import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ShoppingBag, ArrowRight, MapPin, Plus, Minus, ShieldCheck, Tag } from "lucide-react";
import VaulDrawer from "./ui/VaulDrawer";
import { EmptyCartState } from "./ui/EmptyState";
import { motion, AnimatePresence } from "framer-motion";

export default function CartDrawerSheet({
  isOpen,
  onClose,
  cart = [],
  onUpdateQty,
  location = { nickname: "Home", address: "Nai Basti, Near Petrol Pump, Anantnag" },
  onChangeLocation
}) {
  const router = useRouter();
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const originalSubtotal = cart.reduce((sum, item) => sum + (item.originalPrice || item.price + 10) * item.qty, 0);
  const deliveryFee = subtotal >= 399 || subtotal === 0 ? 0 : 25;
  const handlingFee = subtotal > 0 ? 5 : 0;
  const totalSavings = (originalSubtotal - subtotal) + discount;
  const grandTotal = Math.max(0, subtotal + deliveryFee + handlingFee - discount);

  const proceedToCheckout = () => {
    if (cart.length === 0) return;
    localStorage.setItem(
      "dashit_checkout_data",
      JSON.stringify({
        cart,
        subtotal,
        deliveryFee,
        handlingFee,
        discount,
        grandTotal,
        savings: totalSavings,
        location,
      })
    );
    onClose();
    router.push("/checkout");
  };

  return (
    <VaulDrawer
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={`My Cart (${cart.reduce((s, i) => s + i.qty, 0)})`}
      description="Delivery in 10 minutes from Anantnag Central Hub"
    >
      <div className="space-y-4 pt-1">
        {cart.length === 0 ? (
          <EmptyCartState />
        ) : (
          <>
            {/* Delivery Address Pill */}
            <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3 flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2.5">
                <MapPin className="w-4 h-4 text-[#FF6B00] shrink-0" />
                <div>
                  <span className="font-extrabold text-slate-900">Deliver to {location.nickname}</span>
                  <p className="text-[10px] text-slate-500 font-medium truncate max-w-[210px]">{location.address}</p>
                </div>
              </div>
              {onChangeLocation && (
                <button
                  onClick={onChangeLocation}
                  className="text-[11px] font-bold text-[#0c831f] hover:underline"
                >
                  Change
                </button>
              )}
            </div>

            {/* Selected Items */}
            <div className="space-y-2.5 divide-y divide-slate-100">
              <AnimatePresence initial={false}>
                {cart.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, height: 0, scale: 0.9 }}
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className="pt-2.5 flex items-center justify-between first:pt-0"
                  >
                    <div className="flex items-center space-x-2.5">
                      <img
                        src={item.img}
                        alt={item.name}
                        className="w-10 h-10 object-contain bg-slate-50 p-1 rounded-xl border border-slate-100"
                      />
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 line-clamp-1">{item.name}</h4>
                        <p className="text-[10px] font-semibold text-slate-500">₹{item.price} x {item.qty}</p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 text-[#0c831f] rounded-xl px-2 py-1 font-bold">
                      <motion.button
                        whileTap={{ scale: 0.75 }}
                        onClick={() => onUpdateQty(item.id, -1)}
                        className="hover:opacity-80 p-0.5"
                      >
                        <Minus className="w-3 h-3" />
                      </motion.button>
                      <span className="text-xs font-black px-1 font-mono">{item.qty}</span>
                      <motion.button
                        whileTap={{ scale: 0.75 }}
                        onClick={() => onUpdateQty(item.id, 1)}
                        className="hover:opacity-80 p-0.5"
                      >
                        <Plus className="w-3 h-3" />
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* Bill Summary */}
            <div className="bg-slate-50 rounded-2xl p-3.5 space-y-1.5 text-xs border border-slate-200/80">
              <div className="flex justify-between text-slate-600">
                <span>Item Subtotal</span>
                <span className="font-mono font-bold">₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Delivery Charge</span>
                <span className="font-mono font-bold text-[#0c831f]">{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Handling Fee</span>
                <span className="font-mono font-bold">₹{handlingFee}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-sm text-slate-900">
                <span>Total to Pay</span>
                <span className="font-mono text-[#0c831f]">₹{grandTotal}</span>
              </div>
            </div>

            {/* Checkout CTA */}
            <button
              onClick={proceedToCheckout}
              className="w-full bg-[#061838] hover:bg-[#0c2552] text-white font-extrabold text-xs py-3.5 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center space-x-2"
            >
              <span>Proceed to Checkout (₹{grandTotal})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>
    </VaulDrawer>
  );
}
