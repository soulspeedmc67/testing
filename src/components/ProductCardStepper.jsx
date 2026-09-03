import { motion, AnimatePresence } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import { triggerFlyToCart } from "./FlyingBadgeOverlay";
import { hapticMedium, hapticLight, hapticHeavy } from "../lib/haptics";

export default function ProductCardStepper({ product, qty = 0, onAdd, onUpdateQty, className = "", subtext = "" }) {
  const handleAdd = (e) => {
    e.stopPropagation();
    hapticMedium();
    if (product?.img) {
      const rect = e.currentTarget.getBoundingClientRect();
      triggerFlyToCart(product.img, rect);
    }
    onAdd(product);
  };

  return (
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`relative h-8 flex items-center justify-center overflow-hidden rounded-xl ${className}`}
    >
      <AnimatePresence mode="wait" initial={false}>
        {qty === 0 ? (
          <motion.button
            key="add-btn"
            layout
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            whileTap={{ scale: 0.94 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            onClick={handleAdd}
            className="w-full h-full bg-white hover:bg-emerald-50 text-[#0c831f] border-[1.5px] border-[#0c831f] font-black text-[11px] rounded-xl flex flex-col items-center justify-center shadow-xs uppercase tracking-wide transition-colors py-0.5"
          >
            <span className="leading-tight">ADD</span>
            {subtext && (
              <span className="text-[7.5px] font-semibold text-emerald-700/80 -mt-0.5 normal-case">
                {subtext}
              </span>
            )}
          </motion.button>
        ) : (
          <motion.div
            key="stepper-controls"
            layout
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.85, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="w-full h-full bg-[#0c831f] text-white rounded-xl flex items-center justify-between px-2 shadow-sm"
          >
            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 350, damping: 18 }}
              onClick={(e) => {
                e.stopPropagation();
                if (qty === 1) {
                  hapticHeavy();
                } else {
                  hapticLight();
                }
                onUpdateQty(product.id, -1);
              }}
              className="p-1 rounded-md hover:bg-emerald-800 transition-colors flex items-center justify-center"
            >
              <Minus className="w-3.5 h-3.5 stroke-[3]" />
            </motion.button>

            <motion.span
              key={`qty-${qty}`}
              initial={{ scale: 1 }}
              animate={{ scale: [1, 1.15, 1] }}
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 300, damping: 18 }}
              className="font-mono font-black text-xs px-1 select-none"
            >
              {qty}
            </motion.span>

            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              transition={{ type: "spring", stiffness: 350, damping: 18 }}
              onClick={(e) => {
                e.stopPropagation();
                hapticLight();
                if (product?.img) {
                  const rect = e.currentTarget.getBoundingClientRect();
                  triggerFlyToCart(product.img, rect);
                }
                onUpdateQty(product.id, 1);
              }}
              className="p-1 rounded-md hover:bg-emerald-800 transition-colors flex items-center justify-center"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
