import { motion, AnimatePresence } from "framer-motion";
import { X, Minus, Plus } from "lucide-react";
import { hapticMedium, hapticLight } from "../lib/haptics";
import { triggerFlyToCart } from "./FlyingBadgeOverlay";
import { SPRING_SNAPPY, SPRING_BOUNCY } from "../lib/motion";
import { useBodyScrollLock } from "../lib/useBodyScrollLock";

/** Stable cart id for a given product + size, shared by add and qty updates. */
export const variantCartId = (product, variant) =>
  `${product.id}-${String(variant.unit).replace(/\s+/g, "")}`;

export default function VariantSelectorModal({
  isOpen,
  onClose,
  product,
  cart = [],
  onAddToCart,
  onUpdateQty,
}) {
  /* Must run before the early return — hooks cannot be called conditionally.
     Passing the open state in means the lock engages and releases with the sheet. */
  useBodyScrollLock(Boolean(isOpen && product));

  if (!isOpen || !product) return null;

  const variants = product.variants || [
    { id: product.id, unit: product.unit, price: product.price, originalPrice: product.originalPrice }
  ];

  /**
   * Adding a size keeps the sheet OPEN so several sizes can be picked in one
   * visit — closing on every tap forced the user to reopen the sheet for each
   * item. The sheet is dismissed explicitly via the close button or backdrop.
   */
  const handleAddVariant = (e, variant) => {
    hapticMedium();

    const itemToAdd = {
      ...product,
      id: variantCartId(product, variant),
      name: `${product.name} (${variant.unit})`,
      unit: variant.unit,
      price: variant.price,
      originalPrice: variant.originalPrice || variant.price,
    };

    const commit = () => {
      if (onAddToCart) onAddToCart(itemToAdd);
    };

    const imgSrc = product.img || product.image;
    if (imgSrc) {
      const rect = e.currentTarget.getBoundingClientRect();
      triggerFlyToCart(imgSrc, rect, commit);
    } else {
      commit();
    }
  };

  const handleStep = (variant, delta) => {
    hapticLight();
    if (onUpdateQty) onUpdateQty(variantCartId(product, variant), delta);
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
          /* max-h + overflow-y-auto give the sheet its OWN scroll area, and
             overscroll-contain stops a scroll that reaches the end of this list
             from chaining out to the page behind it. */
          className="relative w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl border border-slate-100 z-10 space-y-4 pb-[max(20px,env(safe-area-inset-bottom,20px))] max-h-[85vh] overflow-y-auto overscroll-contain dark:bg-surface-overlay dark:border-line-soft"
        >
          {/* Header Row — sticks while the variant list scrolls under it */}
          <div className="flex items-start justify-between sticky -top-5 -mx-5 px-5 -mt-5 pt-5 pb-3 bg-white z-10 dark:bg-surface">
            <div className="flex items-center space-x-3">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 border border-slate-100 p-1 flex items-center justify-center shrink-0 dark:bg-surface-raised dark:border-line-soft">
                <img
                  src={product.img}
                  alt={product.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-[#FF5B00]">
                  Select Option
                </span>
                <h3 className="text-sm font-black text-[#061838] leading-tight line-clamp-1 dark:text-content">
                  {product.name}
                </h3>
                <p className="text-[11px] font-semibold text-slate-400 dark:text-content-faint">
                  {variants.length} sizes available
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                hapticLight();
                onClose();
              }}
              className="p-1.5 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors dark:bg-surface-muted dark:hover:bg-surface-muted"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Variant Selection List */}
          <div className="space-y-2 pt-1">
            {variants.map((variant) => {
              const variantId = variantCartId(product, variant);
              const inCartItem = cart.find(
                (c) => String(c.id) === String(variantId) || (c.name === `${product.name} (${variant.unit})`)
              );
              const qtyInCart = inCartItem?.qty || 0;

              return (
                <div
                  key={variant.id || variant.unit}
                  className="flex items-center justify-between p-3 rounded-2xl border border-slate-200/90 bg-slate-50/50 hover:bg-white hover:border-[#061838]/40 transition-all shadow-2xs dark:border-line/90 dark:hover:bg-surface-muted"
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
                        <span className="text-[9px] font-black text-orange-600 bg-orange-50 px-1.5 py-0.2 rounded">
                          {Math.round(((variant.originalPrice - variant.price) / variant.originalPrice) * 100)}% OFF
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Inline stepper once the size is in the cart — no reopening */}
                  <AnimatePresence mode="wait" initial={false}>
                    {qtyInCart > 0 ? (
                      <motion.div
                        key="stepper"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        transition={SPRING_SNAPPY}
                        className="flex items-center bg-[#FF5B00] text-white rounded-xl shadow-xs overflow-hidden"
                      >
                        <motion.button
                          whileTap={{ scale: 0.86 }}
                          transition={SPRING_BOUNCY}
                          onClick={() => handleStep(variant, -1)}
                          aria-label={`Remove one ${variant.unit}`}
                          className="px-2.5 py-2 hover:bg-[#E04E00] transition-colors cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5 stroke-[3]" />
                        </motion.button>

                        <span className="min-w-[26px] text-center text-xs font-black tabular-nums select-none">
                          {qtyInCart}
                        </span>

                        <motion.button
                          whileTap={{ scale: 0.86 }}
                          transition={SPRING_BOUNCY}
                          onClick={(e) => handleAddVariant(e, variant)}
                          aria-label={`Add one more ${variant.unit}`}
                          className="px-2.5 py-2 hover:bg-[#E04E00] transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        </motion.button>
                      </motion.div>
                    ) : (
                      <motion.button
                        key="add"
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        whileTap={{ scale: 0.94 }}
                        transition={SPRING_SNAPPY}
                        onClick={(e) => handleAddVariant(e, variant)}
                        className="px-4 py-2 bg-[#061838] hover:bg-slate-800 text-white rounded-xl text-xs font-black shadow-xs cursor-pointer tracking-wider"
                      >
                        ADD
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
