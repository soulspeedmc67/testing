import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ArrowRight, Zap, MapPin, ShoppingBag } from "lucide-react";
import { hapticSuccess } from "../lib/haptics";

export default function OrderProcessingModal({
  isOpen,
  orderDetails,
  onComplete,
  isSubmitting = false,
}) {
  useEffect(() => {
    if (!isOpen || isSubmitting) return;
    hapticSuccess();
    const timer = setTimeout(() => {
      if (onComplete) onComplete();
    }, 2200);
    return () => clearTimeout(timer);
  }, [isOpen, isSubmitting, onComplete]);

  if (!isOpen) return null;

  const itemCount = (orderDetails?.items || []).reduce(
    (s, i) => s + (Number(i.qty) || 1),
    0
  );
  const total =
    orderDetails?.finalTotal ||
    orderDetails?.totalAmount ||
    orderDetails?.total ||
    0;
  const eta = orderDetails?.etaMinutes || 10;
  const address = orderDetails?.location?.address || orderDetails?.userAddress?.address || "Delivery Address";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
        {/* Soft Dark Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
          onClick={onComplete}
        />

        {/* Apple / Android Native Style Card */}
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          transition={{ type: "spring", damping: 26, stiffness: 320 }}
          className="relative w-full sm:max-w-sm bg-[#15161A] text-white rounded-t-[32px] sm:rounded-[32px] p-6 pb-[calc(env(safe-area-inset-bottom,0px)+24px)] sm:pb-6 shadow-[0_20px_50px_rgba(0,0,0,0.8)] border border-white/12 overflow-hidden z-10"
        >
          {/* Top Sheet Notch Pill */}
          <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-4 sm:hidden" />

          {/* Centered Success Checkmark */}
          <div className="flex flex-col items-center text-center">
            <div className="relative flex items-center justify-center mb-3">
              {/* Soft Pulsing Ripple */}
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: [1, 1.35, 1.2], opacity: [0.5, 0.15, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
                className="absolute w-20 h-20 rounded-full bg-[#22C55E]/25"
              />
              {/* Circle check badge */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", damping: 14, stiffness: 220 }}
                className="w-16 h-16 rounded-full bg-gradient-to-tr from-[#22C55E] to-emerald-400 text-white flex items-center justify-center shadow-lg shadow-[#22C55E]/30"
              >
                <Check className="w-8 h-8 stroke-[3.2]" />
              </motion.div>
            </div>

            <motion.h3
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-2xl font-black text-white tracking-tight"
            >
              Order Placed!
            </motion.h3>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="text-xs font-mono font-bold text-white/50 mt-1 tracking-wider uppercase"
            >
              #{orderDetails?.orderId || "DSH-PROCESSING"}
            </motion.p>
          </div>

          {/* Obsidian Info Card */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-5 bg-white/[0.06] border border-white/[0.08] rounded-2xl p-4 space-y-3"
          >
            {/* ETA & Status pill */}
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center space-x-2 text-white">
                <span className="w-6 h-6 rounded-lg bg-orange-500/15 text-[#FF5B00] flex items-center justify-center shrink-0">
                  <Zap className="w-3.5 h-3.5 fill-[#FF5B00]" />
                </span>
                <span className="text-xs font-black text-white">
                  Arriving in ~{eta} mins
                </span>
              </div>
              <span className="text-[10px] font-black uppercase tracking-wider text-[#22C55E] bg-[#22C55E]/15 border border-[#22C55E]/30 px-2 py-0.5 rounded-full">
                Confirmed
              </span>
            </div>

            {/* Items and Address snippet */}
            <div className="space-y-1.5 text-left text-xs text-white/75">
              <div className="flex items-center space-x-2">
                <ShoppingBag className="w-3.5 h-3.5 text-white/50 shrink-0" />
                <span className="font-semibold truncate">
                  {itemCount} {itemCount === 1 ? "item" : "items"} • ₹{total}
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className="w-3.5 h-3.5 text-white/50 shrink-0" />
                <span className="font-medium text-white/60 truncate text-[11.5px]">
                  {address}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Action Button */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="mt-4"
          >
            <button
              type="button"
              onClick={onComplete}
              className="w-full py-3.5 rounded-2xl bg-[#FF5B00] hover:bg-[#E04E00] text-white font-extrabold text-xs shadow-lg shadow-[#FF5B00]/25 transition-all active:scale-[0.98] flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>Track Live Delivery</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </motion.div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
