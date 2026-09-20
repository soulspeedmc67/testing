import { createContext, useCallback, useContext, useRef, useState } from "react";
import { ShieldCheck, CircleAlert } from "lucide-react";
import { Drawer } from "vaul";
import { hapticMedium, hapticLight } from "../lib/haptics";
import { confirmAge, hasConfirmedAge, isAgeRestricted, MIN_AGE } from "../lib/ageGate";

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

      <Drawer.Root
        open={Boolean(pendingProduct)}
        onOpenChange={(open) => {
          if (!open) close();
        }}
      >
        <Drawer.Portal>
          <Drawer.Overlay className="fixed inset-0 bg-slate-950/50 z-[80] backdrop-blur-xs transition-opacity duration-300 ease-out" />
          <Drawer.Content
            className="bg-white flex flex-col rounded-t-[32px] fixed bottom-0 left-0 right-0 z-[80] max-w-md mx-auto border-t border-slate-100 outline-none shadow-2xl transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
          >
            {/* Grabber, matching every other sheet in the app */}
            <div className="w-full pt-3 pb-1 flex justify-center touch-none select-none">
              <div className="w-12 h-1.5 shrink-0 rounded-full bg-slate-300" />
            </div>

            {/* The dock sits above the home indicator on iOS */}
            <div className="px-6 pt-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 rounded-[22px] bg-[#061838] flex items-center justify-center mb-4">
                  <span className="text-white font-black text-xl tracking-tight">{MIN_AGE}+</span>
                </div>

                <Drawer.Title className="text-[19px] font-black text-[#061838] tracking-tight dark:text-content">
                  Confirm your age
                </Drawer.Title>

                <Drawer.Description className="text-[13.5px] text-slate-500 leading-relaxed mt-2 max-w-[18rem]">
                  {pendingProduct?.name ? (
                    <>
                      <span className="font-semibold text-slate-700">{pendingProduct.name}</span>{" "}
                      is an age-restricted product. It can only be sold to customers aged{" "}
                      {MIN_AGE} or over.
                    </>
                  ) : (
                    <>This product can only be sold to customers aged {MIN_AGE} or over.</>
                  )}
                </Drawer.Description>

                <div className="mt-4 w-full flex items-start space-x-2.5 rounded-2xl bg-slate-50 border border-slate-200/80 px-3.5 py-3 text-left">
                  <CircleAlert className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                  <p className="text-[11.5px] text-slate-500 leading-snug">
                    Our rider may ask for a valid photo ID on delivery. Orders without proof
                    of age will be returned.
                  </p>
                </div>
              </div>

              {/* Stacked full-width actions — the iOS action-sheet shape */}
              <div className="mt-5 space-y-2.5">
                <button
                  type="button"
                  onClick={handleConfirm}
                  className="w-full h-[52px] rounded-2xl bg-[#061838] text-white font-black text-[15px] tracking-tight flex items-center justify-center space-x-2 active:scale-[0.98] transition-transform"
                >
                  <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                  <span>I am {MIN_AGE} or older</span>
                </button>

                <button
                  type="button"
                  onClick={handleDecline}
                  className="w-full h-[52px] rounded-2xl bg-slate-100 text-slate-600 font-bold text-[15px] tracking-tight active:scale-[0.98] transition-transform"
                >
                  Not now
                </button>
              </div>
            </div>
          </Drawer.Content>
        </Drawer.Portal>
      </Drawer.Root>
    </AgeGateContext.Provider>
  );
}
