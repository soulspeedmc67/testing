import { createContext, useCallback, useContext, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldCheck, AlertTriangle, X, ShieldAlert } from "lucide-react";
import { hapticMedium, hapticLight } from "../lib/haptics";
import { confirmAge, hasConfirmedAge, isAgeRestricted, MIN_AGE } from "../lib/ageGate";
import { SPRING_SNAPPY, SPRING_SOFT } from "../lib/motion";

const AgeGateContext = createContext(null);

/**
 * Falls back to letting the action through *only* when the product is not
 * restricted. On a screen mounted outside the provider (the admin console, say)
 * a restricted item is refused rather than silently sold.
 */
const FALLBACK = {
  requireAgeConfirmation: (product, onConfirmed) => {
    if (!isAgeRestricted(product)) onConfirmed?.();
  },
};

export function useAgeGate() {
  return useContext(AgeGateContext) || FALLBACK;
}

export function AgeGateProvider({ children }) {
  const [pendingProduct, setPendingProduct] = useState(null);
  const onConfirmRef = useRef(null);

  const requireAgeConfirmation = useCallback((product, onConfirmed) => {
    if (!isAgeRestricted(product) || hasConfirmedAge()) {
      onConfirmed?.();
      return;
    }
    onConfirmRef.current = onConfirmed || null;
    setPendingProduct(product);
  }, []);

  const close = () => {
    onConfirmRef.current = null;
    setPendingProduct(null);
  };

  const handleConfirm = () => {
    hapticMedium();
    confirmAge();
    const cb = onConfirmRef.current;
    onConfirmRef.current = null;
    setPendingProduct(null);
    cb?.();
  };

  const handleDecline = () => {
    hapticLight();
    close();
  };

  return (
    <AgeGateContext.Provider value={{ requireAgeConfirmation }}>
      {children}

      <AnimatePresence>
        {Boolean(pendingProduct) && (
          <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-auto">
            {/* Backdrop with Frosted Glass */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              onClick={handleDecline}
              className="fixed inset-0 bg-slate-950/70 backdrop-blur-md"
            />

            {/* Modal Card / Bottom Sheet with Spring Physics */}
            <motion.div
              initial={{ y: "100%", opacity: 0, scale: 0.92 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: "100%", opacity: 0, scale: 0.92 }}
              transition={SPRING_SNAPPY}
              className="relative w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl border border-slate-100 z-10 overflow-hidden dark:bg-[#16171B] dark:border-white/10"
              style={{
                paddingBottom: "max(1.75rem, calc(1.25rem + env(safe-area-inset-bottom, 16px)))",
              }}
            >
              {/* Subtle Crimson Warning Glow */}
              <div className="absolute top-0 right-0 -mr-16 -mt-16 w-48 h-48 rounded-full bg-red-500/15 blur-2xl pointer-events-none" />

              {/* Mobile Drag Indicator */}
              <div className="sm:hidden w-full flex justify-center mb-3">
                <div className="w-12 h-1.5 bg-slate-200 dark:bg-neutral-700 rounded-full" />
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={handleDecline}
                aria-label="Close"
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-neutral-300 hover:text-slate-800 dark:hover:text-white flex items-center justify-center transition-transform active:scale-90 cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>

              {/* Glowing 18+ Warning Badge */}
              <div className="flex flex-col items-center text-center pt-1 mb-4">
                <div className="relative mb-3">
                  <span className="absolute inset-0 rounded-full bg-red-500/25 animate-ping" />
                  <div className="relative w-16 h-16 rounded-full bg-gradient-to-br from-red-600 to-rose-700 shadow-[0_4px_18px_rgba(225,29,72,0.4)] flex items-center justify-center text-white ring-4 ring-red-100 dark:ring-red-950/50">
                    <span className="font-black text-2xl tracking-tighter">18+</span>
                  </div>
                </div>

                <span className="text-[10px] font-black uppercase tracking-widest text-red-600 bg-red-50 px-2.5 py-0.5 rounded-full inline-block dark:bg-red-950/40 dark:text-red-400 border border-red-200/60 dark:border-red-800/40">
                  Statutory Age Verification
                </span>

                <h2 className="text-xl font-black text-[#061838] dark:text-white tracking-tight mt-1.5">
                  Are you 18 or older?
                </h2>

                <p className="text-[13px] text-slate-600 dark:text-neutral-300 leading-relaxed mt-1.5 max-w-xs">
                  {pendingProduct?.name ? (
                    <>
                      <span className="font-bold text-[#061838] dark:text-white">{pendingProduct.name}</span> is an age-restricted item under statutory laws.
                    </>
                  ) : (
                    <>This item is strictly restricted to customers aged 18 and above.</>
                  )}
                </p>
              </div>

              {/* ID Check Mandatory Callout */}
              <div className="rounded-2xl bg-amber-50/90 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 p-3.5 mb-5 flex items-start space-x-2.5 text-left">
                <ShieldAlert className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div className="text-[12px] leading-snug">
                  <span className="font-bold text-amber-950 dark:text-amber-200 block">
                    Government Photo ID Required on Delivery
                  </span>
                  <span className="text-amber-800 dark:text-amber-300/80 mt-0.5 block">
                    Our express rider is legally required to check government photo ID. Orders without age proof cannot be handed over.
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <motion.button
                  whileTap={{ scale: 0.98 }}
                  type="button"
                  onClick={handleConfirm}
                  className="w-full h-[52px] rounded-2xl bg-[#061838] dark:bg-[#FF5B00] text-white font-extrabold text-[15px] tracking-tight flex items-center justify-center space-x-2 shadow-md active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                  <span>I am 18 or older — Confirm</span>
                </motion.button>

                <button
                  type="button"
                  onClick={handleDecline}
                  className="w-full h-11 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-white/10 dark:hover:bg-white/15 text-slate-600 dark:text-neutral-300 font-bold text-xs tracking-tight transition-colors cursor-pointer"
                >
                  I am under 18 (Cancel)
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AgeGateContext.Provider>
  );
}
