import { motion, AnimatePresence } from "framer-motion";
import { X, Check, ShoppingBag, Sparkles } from "lucide-react";
import { hapticMedium, hapticLight } from "../lib/haptics";
import { triggerFlyToCart } from "./FlyingBadgeOverlay";

export default function VariantSelectorModal({
  isOpen,
  onClose,
  product,
  cart = [],
  onAddToCart,
}) {
  if (!isOpen || !product) return null;

  const variants = product.variants || [
    { id: product.id, unit: product.unit, price: product.price, originalPrice: product.originalPrice }
  ];

  const handleSelectVariant = (e, variant) => {
    hapticMedium();
    const imgSrc = product.img || product.image;
    if (imgSrc) {
      const rect = e.currentTarget.getBoundingClientRect();
      triggerFlyToCart(imgSrc, rect);
    }

    const itemToAdd = {
      ...product,
      id: `${product.id}-${variant.unit.replace(/\s+/g, "")}`,
      name: `${product.name} (${variant.unit})`,
      unit: variant.unit,
      price: variant.price,
      originalPrice: variant.originalPrice || variant.price,
    };

    if (onAddToCart) onAddToCart(itemToAdd);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[280] flex items-end sm:items-center justify-center pointer-events-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ y: "100%", opacity: 0.8 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 320 }}
          className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-100 z-10 space-y-4 pb-[max(20px,env(safe-area-inset-bottom,20px))]"
        >
          {/* Header Row */}
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 p-1 flex items-center justify-center shrink-0">
                <img
                  src={product.img}
                  alt={product.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#FF6B00]">
                  Select Option
                </span>
                <h3 className="text-sm font-black text-[#061838] leading-tight line-clamp-1">
                  {product.name}
                </h3>
                <p className="text-[11px] font-semibold text-slate-400">
                  {variants.length} sizes available
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                hapticLight();
                onClose();
              }}
              className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Variant Selection List */}
          <div className="space-y-2 pt-1">
            {variants.map((variant) => {
              const variantId = `${product.id}-${variant.unit.replace(/\s+/g, "")}`;
              const inCartItem = cart.find(
                (c) => String(c.id) === String(variantId) || (c.name === `${product.name} (${variant.unit})`)
              );
              const qtyInCart = inCartItem?.qty || 0;

              return (
                <div
                  key={variant.id || variant.unit}
                  className="flex items-center justify-between p-3 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-[#061838]/40 transition-all shadow-2xs"
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-black text-slate-800">
                      {variant.unit}
                    </span>
                    <div className="flex items-baseline space-x-1.5">
                      <span className="text-sm font-black text-slate-900 font-mono">
                        ₹{variant.price}
                      </span>
                      {variant.originalPrice > variant.price && (
                        <span className="text-xs font-bold text-slate-400 line-through font-mono">
                          ₹{variant.originalPrice}
                        </span>
                      )}
                      {variant.originalPrice > variant.price && (
                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-1.5 py-0.2 rounded">
                          {Math.round(((variant.originalPrice - variant.price) / variant.originalPrice) * 100)}% OFF
                        </span>
                      )}
                    </div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.94 }}
                    onClick={(e) => handleSelectVariant(e, variant)}
                    className="flex items-center space-x-1 px-4 py-2 bg-[#061838] hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer tracking-wider"
                  >
                    <span>{qtyInCart > 0 ? `ADD MORE (${qtyInCart})` : "ADD"}</span>
                  </motion.button>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
