import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, ArrowRight, X, Clock } from "lucide-react";
import { hapticMedium, hapticLight } from "../lib/haptics";
import { SPRING_SNAPPY, EASE_OUT } from "../lib/motion";
import { calculateDeliveryEta } from "../lib/deliveryEta";

const FREE_DELIVERY_THRESHOLD = 299;

export default function MinOrderValueModal({
  isOpen,
  onClose,
  subtotal = 0,
  eta = null,
  location = null,
}) {
  const router = useRouter();
  const [resolvedLocation, setResolvedLocation] = useState(location);

  useEffect(() => {
    if (location) {
      setResolvedLocation(location);
      return;
    }
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("dashit_user_address");
        if (saved) {
          setResolvedLocation(JSON.parse(saved));
          return;
        }
      } catch (e) {}
      try {
        const co = localStorage.getItem("dashit_checkout_data");
        if (co) {
          const parsed = JSON.parse(co);
          if (parsed?.location) {
            setResolvedLocation(parsed.location);
          }
        }
      } catch (e) {}
    }
  }, [location, isOpen]);

  const currentSubtotal = Math.max(0, Number(subtotal) || 0);
  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - currentSubtotal);
  const progressPercent = Math.min(100, Math.round((currentSubtotal / FREE_DELIVERY_THRESHOLD) * 100));

  const activeEta = eta || calculateDeliveryEta(resolvedLocation);
  const etaMinutes = activeEta?.etaMinutes || 12;
  const distanceFormatted = activeEta?.distanceFormatted || "1.2 km away";
  const areaName =
    resolvedLocation?.area ||
    resolvedLocation?.nickname ||
    resolvedLocation?.alias ||
    (resolvedLocation?.address ? resolvedLocation.address.split(",")[0].trim() : "Anantnag");

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
      {isOpen && (
        <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-auto">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={handleClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />

          {/* Modal Dialog / Bottom Sheet */}
          <motion.div
            initial={{ y: "100%", opacity: 0, scale: 0.96 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: "100%", opacity: 0, scale: 0.96 }}
            transition={SPRING_SNAPPY}
            className="relative w-full max-w-md bg-white dark:bg-[#12161F] rounded-t-[28px] sm:rounded-3xl p-6 shadow-2xl border border-slate-200/90 dark:border-slate-800 z-10 select-none"
            style={{
              paddingBottom: "max(1.5rem, calc(1.25rem + env(safe-area-inset-bottom, 16px)))",
            }}
          >
            {/* Mobile Sheet Handle */}
            <div className="sm:hidden w-full flex justify-center mb-3">
              <div className="w-10 h-1 bg-slate-200 dark:bg-slate-700 rounded-full" />
            </div>

            {/* Close button */}
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close modal"
              className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4 stroke-[2.2]" />
            </button>

            {/* Header */}
            <div className="flex items-start gap-3.5 pr-8">
              <div className="w-11 h-11 rounded-2xl bg-orange-500/10 text-[#FF5B00] border border-orange-500/20 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-black text-[#061838] dark:text-white tracking-tight leading-snug">
                  Free delivery on orders above ₹{FREE_DELIVERY_THRESHOLD}
                </h2>
                <p className="text-[13px] text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                  Add items worth <span className="font-extrabold text-[#061838] dark:text-white">₹{remaining}</span> more to get <span className="text-emerald-500 font-bold">FREE delivery</span>.
                </p>
              </div>
            </div>

            {/* Authentic Transit Time Card */}
            <div className="mt-4 p-3 rounded-2xl bg-slate-50 dark:bg-[#0c1017] border border-slate-200/80 dark:border-slate-800/90 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-[#FF5B00] flex items-center justify-center shrink-0">
                  <Clock className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block truncate">
                    Delivery to {areaName}
                  </span>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200 truncate block">
                    ~{etaMinutes} minutes <span className="font-medium text-slate-400">({distanceFormatted})</span>
                  </span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold shrink-0">
                Lal Chowk Hub
              </span>
            </div>

            {/* Cart Progress Indicator */}
            <div className="mt-4 p-3.5 rounded-2xl bg-slate-50/60 dark:bg-[#0c1017]/60 border border-slate-200/60 dark:border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-slate-500 dark:text-slate-400">Current Cart</span>
                <span className="font-black text-slate-800 dark:text-white">
                  ₹{currentSubtotal} <span className="text-slate-400 font-normal">/ ₹{FREE_DELIVERY_THRESHOLD}</span>
                </span>
              </div>

              {/* Solid DASHit Orange Progress Bar */}
              <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPercent}%` }}
                  transition={{ duration: 0.5, ease: EASE_OUT }}
                  className="h-full bg-emerald-500 rounded-full"
                />
              </div>

              <div className="flex items-center justify-between text-[11px] pt-0.5">
                <span className="font-semibold text-slate-500 dark:text-slate-400">
                  Add <span className="font-black text-[#FF5B00]">₹{remaining}</span> more for free delivery
                </span>
                <span className="font-bold text-slate-400 dark:text-slate-500">
                  {progressPercent}%
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="mt-5 space-y-2">
              <motion.button
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={handleContinueShopping}
                className="w-full h-12 rounded-2xl bg-[#FF5B00] hover:bg-[#E04E00] text-white font-black text-sm shadow-xs flex items-center justify-center gap-2 cursor-pointer transition-colors"
              >
                <span>Add Items (+₹{remaining})</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </motion.button>

              <button
                type="button"
                onClick={handleClose}
                className="w-full h-10 rounded-2xl bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 font-bold text-xs transition-colors cursor-pointer"
              >
                Review My Cart
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
