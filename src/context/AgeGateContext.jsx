import { createContext, useCallback, useContext, useRef, useState } from "react";
import TobaccoDeclarationSheet from "../components/TobaccoDeclarationSheet";
import { hapticMedium, hapticLight } from "../lib/haptics";
import { confirmAge, hasConfirmedAge, isAgeRestricted } from "../lib/ageGate";
import { isTobaccoSectionEnabled } from "../lib/tobacco";

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
  requestTobaccoAccess: () => {},
};

export function useAgeGate() {
  return useContext(AgeGateContext) || FALLBACK;
}

export function AgeGateProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const onConfirmRef = useRef(null);
  const onCancelRef = useRef(null);

  const openSheet = useCallback((onConfirmed, onCancelled) => {
    onConfirmRef.current = onConfirmed || null;
    onCancelRef.current = onCancelled || null;
    setIsOpen(true);
  }, []);

  /** Gate a single add-to-cart / product view on the declaration. */
  const requireAgeConfirmation = useCallback(
    (product, onConfirmed, onCancelled) => {
      if (!isAgeRestricted(product)) {
        onConfirmed?.();
        return;
      }
      // Where the section is switched off (the iOS app by default) a restricted
      // item that slipped through a deep link or an old cart is never sold.
      if (!isTobaccoSectionEnabled()) {
        onCancelled?.();
        return;
      }
      if (hasConfirmedAge()) {
        onConfirmed?.();
        return;
      }
      openSheet(onConfirmed, onCancelled);
    },
    [openSheet]
  );

  /** "View items" on the search banner, and entry to the /tobacco section. */
  const requestTobaccoAccess = useCallback(
    (onConfirmed, onCancelled) => {
      if (!isTobaccoSectionEnabled()) {
        onCancelled?.();
        return;
      }
      if (hasConfirmedAge()) {
        onConfirmed?.();
        return;
      }
      openSheet(onConfirmed, onCancelled);
    },
    [openSheet]
  );

  const settle = useCallback((confirmed) => {
    const cb = confirmed ? onConfirmRef.current : onCancelRef.current;
    onConfirmRef.current = null;
    onCancelRef.current = null;
    setIsOpen(false);
    cb?.();
  }, []);

  const handleConfirm = useCallback(() => {
    hapticMedium();
    confirmAge();
    settle(true);
  }, [settle]);

  const handleCancel = useCallback(() => {
    hapticLight();
    settle(false);
  }, [settle]);

  /* Following the terms link is neither a yes nor a no: close without running
     either callback, so a cancel handler's goBack() does not race the link. */
  const handleReadTerms = useCallback(() => {
    onConfirmRef.current = null;
    onCancelRef.current = null;
    setIsOpen(false);
  }, []);

  return (
    <AgeGateContext.Provider value={{ requireAgeConfirmation, requestTobaccoAccess }}>
      {children}
      <TobaccoDeclarationSheet
        isOpen={isOpen}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        onReadTerms={handleReadTerms}
      />
    </AgeGateContext.Provider>
  );
}
