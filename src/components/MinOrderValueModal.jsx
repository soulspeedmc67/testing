import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, ArrowRight, X, Zap, ShieldCheck } from "lucide-react";
import { hapticMedium, hapticLight } from "../lib/haptics";
import { SPRING_SNAPPY, EASE_OUT } from "../lib/motion";

const MIN_ORDER_VALUE = 299;

export default function MinOrderValueModal({
  isOpen,
  onClose,
  subtotal = 0,
}) {
  const router = useRouter();

  if (!isOpen) return null;

  const currentSubtotal = Math.max(0, Number(subtotal) || 0);
  const remaining = Math.max(0, MIN_ORDER_VALUE - currentSubtotal);
  const progressPercent = Math.min(100, Math.round((currentSubtotal / MIN_ORDER_VALUE) * 100));

  const handleContinueShopping = () => {
    hapticMedium();
    onClose();
    router.push("/shop");
  };

  const handleClose = () => {
    hapticLight();
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-auto">
        {/* Backdrop with Frosted Glass */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          onClick={handleClose}
          className="fixed inset-0 bg-[#061838]/60 backdrop-blur-md"
        />

        {/* Modal Card / Bottom Sheet */}
        <motion.div
          initial={{ y: "100%", opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: "100%", opacity: 0, scale: 0.95 }}
          transition={SPRING_SNAPPY}
          className="relative w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl border border-slate-100 z-10 overflow-hidden dark:bg-[#16171B] dark:border-white/10"
          style={{
            paddingBottom: "max(1.75rem, calc(1.25rem + env(safe-area-inset-bottom, 16px)))",
          }}
        >
          {/* Subtle Orange Glow Backdrop */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-44 h-44 rounded-full bg-gradient-to-br from-[#FF5B00]/20 to-amber-500/10 blur-2xl pointer-events-none" />

          {/* Mobile Sheet Handle Bar */}
          <div className="sm:hidden w-full flex justify-center mb-4">
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-neutral-700 rounded-full" />
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close modal"
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-neutral-300 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Hero Icon with Pulse Ring */}
          <div className="flex items-center space-x-3.5 mb-4">
            <div className="relative">
              <span className="absolute inset-0 rounded-2xl bg-[#FF5B00]/25 animate-ping" />
              <div className="relative w-13 h-13 rounded-2xl bg-gradient-to-br from-[#FF6F1E] to-[#FF5B00] shadow-[0_4px_14px_rgba(255,91,0,0.35)] flex items-center justify-center text-white">
                <ShoppingBag className="w-6 h-6 stroke-[2.5]" />
              </div>
            </div>

            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-[#FF5B00] bg-[#FF5B00]/10 px-2 py-0.5 rounded-full inline-block dark:bg-[#FF5B00]/20">
                Minimum Order Policy
              </span>
              <h2 className="text-xl font-extrabold text-[#061838] dark:text-white tracking-tight leading-tight mt-0.5">
                Minimum order is ₹{MIN_ORDER_VALUE}
              </h2>
            </div>
          </div>

          {/* Subtitle explanation */}
          <p className="text-[13.5px] text-slate-600 dark:text-neutral-300 leading-relaxed mb-5">
            To ensure lightning-fast 10-minute delivery with dedicated express riders, we have a minimum order value of <span className="font-bold text-[#061838] dark:text-white">₹{MIN_ORDER_VALUE}</span>.
          </p>

          {/* Aesthetic Progress Card */}
          <div className="bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-2xl p-4 mb-5">
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className="text-slate-500 dark:text-neutral-400">Current Cart Total</span>
              <span className="font-mono font-black text-slate-900 dark:text-white">
                ₹{currentSubtotal} <span className="text-slate-400 font-normal">/ ₹{MIN_ORDER_VALUE}</span>
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-2.5 w-full bg-slate-200 dark:bg-white/10 rounded-full overflow-hidden relative">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.7, ease: EASE_OUT }}
                className="h-full bg-gradient-to-r from-[#FF6F1E] via-[#FF5B00] to-emerald-500 rounded-full"
              />
            </div>

            {/* Deficit Pill */}
            <div className="mt-3 flex items-center justify-between pt-1">
              <span className="text-xs text-slate-600 dark:text-neutral-300">
                Add <span className="font-extrabold text-[#FF5B00] font-mono">₹{remaining}</span> more to proceed
              </span>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Zap className="w-3 h-3 fill-current" />
                Free Express Delivery
              </span>
            </div>
          </div>

          {/* Perks Row */}
          <div className="grid grid-cols-2 gap-2 mb-6">
            <div className="flex items-center space-x-2 text-[11.5px] text-slate-600 dark:text-neutral-300">
              <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <span className="font-medium">100% Quality Fresh</span>
            </div>
            <div className="flex items-center space-x-2 text-[11.5px] text-slate-600 dark:text-neutral-300">
              <div className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Zap className="w-3.5 h-3.5 stroke-[2.5]" />
              </div>
              <span className="font-medium">Under 10 Mins Arrival</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <motion.button
              whileTap={{ scale: 0.97 }}
              type="button"
              onClick={handleContinueShopping}
              className="w-full h-[52px] rounded-2xl bg-gradient-to-r from-[#FF6F1E] via-[#FF5B00] to-[#E24800] text-white font-extrabold text-[15px] shadow-[0_6px_20px_rgba(255,91,0,0.35)] flex items-center justify-center space-x-2 cursor-pointer transition-transform"
            >
              <span>Add Items to Reach ₹{MIN_ORDER_VALUE}</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </motion.button>

            <button
              type="button"
              onClick={handleClose}
              className="w-full h-11 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-600 dark:text-neutral-300 font-bold text-xs tracking-tight transition-colors cursor-pointer"
            >
              Review My Cart
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
