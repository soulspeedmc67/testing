import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import { triggerFlyToCart } from "./FlyingBadgeOverlay";
import { hapticMedium, hapticLight, hapticHeavy } from "../lib/haptics";

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
  const prodId = product?.id || product?.barcode;

  const handleAdd = (e) => {
    e.stopPropagation();
    hapticMedium();

    if (product?.variants && product.variants.length > 1 && onSelectVariants) {
      onSelectVariants(product);
      return;
    }

    const imgSrc = product?.img || product?.image;
    if (imgSrc) {
      const rect = e.currentTarget.getBoundingClientRect();
      triggerFlyToCart(imgSrc, rect);
    }
    if (onAdd) {
      onAdd(product);
    } else if (onUpdateQty) {
      onUpdateQty(prodId, 1);
    } else if (onIncrement) {
      onIncrement();
    }
  };

  const handleMinus = (e) => {
    e.stopPropagation();
    if (qty === 1) {
      hapticHeavy();
    } else {
      hapticLight();
    }
    if (onUpdateQty) {
      onUpdateQty(prodId, -1);
    } else if (onDecrement) {
      onDecrement();
    }
  };

  const handlePlus = (e) => {
    e.stopPropagation();
    hapticLight();
    const imgSrc = product?.img || product?.image;
    if (imgSrc) {
      const rect = e.currentTarget.getBoundingClientRect();
      triggerFlyToCart(imgSrc, rect);
    }
    if (onUpdateQty) {
      onUpdateQty(prodId, 1);
    } else if (onIncrement) {
      onIncrement();
    }
  };

  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 450, damping: 28 }}
      className={`relative h-8 flex items-center justify-center overflow-hidden rounded-xl ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {qty === 0 ? (
          <motion.button
            key="add-btn"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            whileTap={{ scale: 0.9 }}
            whileHover={{ scale: 1.02 }}
            transition={{ type: "spring", stiffness: 450, damping: 25 }}
            onClick={handleAdd}
            className="w-full h-full bg-white hover:bg-slate-50 text-[#061838] border-[1.5px] border-[#061838] font-black text-[11px] rounded-xl flex flex-col items-center justify-center shadow-xs uppercase tracking-wider transition-colors py-0.5"
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
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 450, damping: 25 }}
            className="w-full h-full bg-[#061838] text-white rounded-xl flex items-center justify-between px-1.5 shadow-sm"
          >
            <motion.button
              type="button"
              whileTap={{ scale: 0.75 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              onClick={handleMinus}
              className="w-6 h-6 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center active:bg-slate-900"
            >
              <Minus className="w-3.5 h-3.5 stroke-[3]" />
            </motion.button>

            <motion.span
              key={`qty-${qty}`}
              initial={{ scale: 1.3, y: -2 }}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              className="font-mono font-black text-xs px-1 select-none text-center min-w-[14px]"
            >
              {qty}
            </motion.span>

            <motion.button
              type="button"
              whileTap={{ scale: 0.75 }}
              transition={{ type: "spring", stiffness: 500, damping: 20 }}
              onClick={handlePlus}
              className="w-6 h-6 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center active:bg-slate-900"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
