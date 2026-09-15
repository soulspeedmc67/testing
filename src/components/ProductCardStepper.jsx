import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import { triggerFlyToCart } from "./FlyingBadgeOverlay";
import { hapticMedium, hapticLight, hapticHeavy } from "../lib/haptics";
import { useAgeGate } from "../context/AgeGateContext";

export default function ProductCardStepper({
  product,
  qty = 0,
  onAdd,
  onUpdateQty,
  onIncrement,
  onDecrement,
  className = "",
  subtext = "",
  onSelectVariants
}) {
  const { requireAgeConfirmation } = useAgeGate();
  const prodId = product?.id || product?.barcode;
  const isOutOfStock = product?.stock !== undefined && Number(product.stock) <= 0;
  const maxStock = product?.stock !== undefined ? Number(product.stock) : Infinity;

  // Local optimistic state so the button flips immediately on tap
  const [optimisticQty, setOptimisticQty] = useState(null);

  useEffect(() => {
    setOptimisticQty(null);
  }, [qty]);

  const displayQty = optimisticQty !== null ? optimisticQty : qty;

  const handleAdd = (e) => {
    e.stopPropagation();
    if (isOutOfStock) return;
    hapticMedium();

    if (product?.variants && product.variants.length > 1 && onSelectVariants) {
      onSelectVariants(product);
      return;
    }

    const commitAdd = () => {
      if (onAdd) {
        onAdd(product);
      } else if (onUpdateQty) {
        onUpdateQty(prodId, 1);
      } else if (onIncrement) {
        onIncrement();
      }
    };

    /* The rect is read before any await — after the age sheet closes the button
       may have re-rendered, and the fly-to-cart animation needs its origin. */
    const imgSrc = product?.img || product?.image;
    const rect = imgSrc ? e.currentTarget.getBoundingClientRect() : null;

    const proceed = () => {
      setOptimisticQty(1);
      if (rect) {
        triggerFlyToCart(imgSrc, rect, commitAdd);
      } else {
        commitAdd();
      }
    };

    /* Age-restricted lines cannot go in the cart until the shopper declares
       they are over 18. Declining leaves the button untouched, so the optimistic
       flip to the stepper only happens once the add is actually allowed. */
    requireAgeConfirmation(product, proceed);
  };

  const handleMinus = (e) => {
    e.stopPropagation();
    if (displayQty <= 1) {
      hapticHeavy();
      setOptimisticQty(0);
    } else {
      hapticLight();
      setOptimisticQty(displayQty - 1);
    }
    if (onUpdateQty) {
      onUpdateQty(prodId, -1);
    } else if (onDecrement) {
      onDecrement();
    }
  };

  const handlePlus = (e) => {
    e.stopPropagation();
    if (displayQty >= maxStock) {
      hapticHeavy();
      return;
    }
    hapticLight();
    const nextVal = displayQty + 1;
    setOptimisticQty(nextVal);

    const commitPlus = () => {
      if (onUpdateQty) {
        onUpdateQty(prodId, 1);
      } else if (onIncrement) {
        onIncrement();
      }
    };

    const imgSrc = product?.img || product?.image;
    if (imgSrc) {
      const rect = e.currentTarget.getBoundingClientRect();
      triggerFlyToCart(imgSrc, rect, commitPlus);
    } else {
      commitPlus();
    }
  };

  if (isOutOfStock) {
    return (
      <div
        onClick={(e) => e.stopPropagation()}
        className={`relative ${className.includes("h-") ? "" : "h-8"} w-full shrink-0 overflow-hidden rounded-xl select-none ${className}`}
      >
        <button
          disabled
          className="w-full h-full bg-slate-100 text-slate-400 font-black text-[10px] uppercase rounded-xl flex items-center justify-center cursor-not-allowed border border-slate-200"
        >
          Sold Out
        </button>
      </div>
    );
  }

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className={`relative ${className.includes("h-") ? "" : "h-8"} w-full shrink-0 overflow-hidden rounded-xl select-none ${className}`}
    >
      <AnimatePresence initial={false}>
        {displayQty === 0 ? (
          <motion.button
            key="add-btn"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            whileTap={{ scale: 0.94 }}
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.15 }}
            onClick={handleAdd}
            className="absolute inset-0 w-full h-full bg-white hover:bg-slate-50 text-[#061838] border-[1.5px] border-[#061838] font-black text-[11px] rounded-xl flex flex-col items-center justify-center shadow-xs uppercase tracking-wider transition-colors py-0.5"
          >
            <span className="leading-tight">ADD</span>
            {subtext && (
              <span className="text-[7.5px] font-semibold text-slate-500 -mt-0.5 normal-case">
                {subtext}
              </span>
            )}
          </motion.button>
        ) : (
          <motion.div
            key="stepper-controls"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-0 w-full h-full bg-[#061838] text-white rounded-xl flex items-center justify-between px-1.5 shadow-sm"
          >
            <motion.button
              type="button"
              whileTap={{ scale: 0.75 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              onClick={handleMinus}
              aria-label={`Remove one ${product?.name || "item"}`}
              /* The pill keeps its compact size — grid density depends on it —
                 but the pseudo-element extends the touch area to ~40px so the
                 control the whole catalogue is operated with is not a 24px
                 target. It stops short of the quantity label, so a stray tap
                 cannot hit the opposite button. */
              className="relative w-6 h-6 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center active:bg-slate-900 before:absolute before:-inset-2 before:content-['']"
            >
              <Minus className="w-3.5 h-3.5 stroke-[3]" />
            </motion.button>

            <motion.span
              key={`qty-${displayQty}`}
              initial={{ scale: 1.3, y: -2 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              aria-live="polite"
              aria-label={`Quantity ${displayQty}`}
              className="font-mono font-black text-xs px-1 select-none text-center min-w-[14px]"
            >
              {displayQty}
            </motion.span>

            <motion.button
              type="button"
              whileTap={{ scale: 0.75 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              onClick={handlePlus}
              aria-label={`Add one more ${product?.name || "item"}`}
              className="relative w-6 h-6 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center active:bg-slate-900 before:absolute before:-inset-2 before:content-['']"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
