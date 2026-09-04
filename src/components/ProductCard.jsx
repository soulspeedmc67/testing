import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, Star } from "lucide-react";
import ProductCardStepper from "./ProductCardStepper";
import { isItemInWishlist, toggleWishlistItem } from "../lib/wishlist";
import { fadeUpTight, inViewOnce, SPRING_SNAPPY, SPRING_BOUNCY } from "../lib/motion";

export default function ProductCard({
  product,
  qty = 0,
  onAdd,
  onUpdateQty,
  onIncrement,
  onDecrement,
  onOpenQuickView,
  onQuickView,
  onSelectVariants,
  isFavorite = false,
  onToggleFavorite
}) {
  const [favorite, setFavorite] = useState(() => {
    return isFavorite || isItemInWishlist(product?.id || product?.barcode);
  });

  useEffect(() => {
    const syncFav = () => {
      setFavorite(isItemInWishlist(product?.id || product?.barcode));
    };
    syncFav();
    window.addEventListener("dashit_wishlist_updated", syncFav);
    return () => window.removeEventListener("dashit_wishlist_updated", syncFav);
  }, [product]);

  /* Callers have used both names for this; accept either so a card is never
     silently inert. (index.js passed onQuickView while this read onOpenQuickView,
     which made home-screen cards untappable.) */
  const openQuickView = onOpenQuickView || onQuickView;

  const handleHeartClick = (e) => {
    e.stopPropagation();
    const nextState = toggleWishlistItem(product);
    setFavorite(nextState);
    if (onToggleFavorite) onToggleFavorite(product.id || product.barcode, nextState);
  };

  const discountPercent =
    product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;

  return (
    <motion.div
      variants={fadeUpTight}
      {...inViewOnce}
      whileTap={{ scale: 0.985 }}
      transition={SPRING_SNAPPY}
      onClick={() => openQuickView && openQuickView(product)}
      className="bg-white rounded-2xl border border-slate-200/80 p-2.5 flex flex-col justify-between shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-[0_10px_24px_rgba(15,23,42,0.09)] hover:border-slate-300/80 transition-[box-shadow,border-color] duration-200 cursor-pointer group select-none relative"
    >
      {/* Top Image Container */}
      <div className="relative w-full aspect-square bg-slate-50/80 rounded-xl overflow-hidden flex items-center justify-center p-2 border border-slate-100">
        <img
          src={product.img}
          alt={product.name}
          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
        />

        {/* Favorite Heart Button */}
        <motion.button
          type="button"
          whileTap={{ scale: 1.3 }}
          transition={SPRING_BOUNCY}
          onClick={handleHeartClick}
          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-white/90 backdrop-blur-xs text-slate-400 hover:text-rose-500 shadow-2xs transition-colors"
        >
          <Heart
            className={`w-3.5 h-3.5 ${
              favorite ? "fill-rose-500 text-rose-500" : "stroke-[2]"
            }`}
          />
        </motion.button>

        {/* Discount Tag */}
        {discountPercent && (
          <span className="absolute bottom-1.5 left-1.5 text-[8.5px] font-black text-white bg-[#FF5B00] px-1.5 py-0.5 rounded-md shadow-2xs">
            {discountPercent}% OFF
          </span>
        )}
      </div>

      {/* Unit & Add Button Row */}
      <div className="flex items-center justify-between mt-2.5 min-h-[32px]">
        <span className="text-[10px] font-bold text-slate-500 bg-slate-100/80 border border-slate-200/60 px-2 py-0.5 rounded-md whitespace-nowrap shrink-0">
          {product.unit}
        </span>

        {/* Morphing Stepper / ADD Button (Rigid dimensions to prevent layout reflow) */}
        <div className="w-20 h-8 shrink-0 relative overflow-hidden">
          <ProductCardStepper
            product={product}
            qty={qty}
            onAdd={onAdd}
            onUpdateQty={onUpdateQty}
            onIncrement={onIncrement}
            onDecrement={onDecrement}
            onSelectVariants={onSelectVariants}
            subtext={product.variants?.length > 1 ? `${product.variants.length} sizes` : product.options}
          />
        </div>
      </div>

      {/* Price & Name Info */}
      <div className="mt-1.5 space-y-1">
        <div className="flex items-baseline space-x-1.5">
          <span className="text-sm font-black text-[#061838] font-mono">
            ₹{product.price}
          </span>
          {product.originalPrice > product.price && (
            <span className="text-[10.5px] text-slate-400 line-through font-mono">
              ₹{product.originalPrice}
            </span>
          )}
        </div>

        <h3 className="text-xs font-semibold text-slate-800 line-clamp-2 leading-snug min-h-[32px]">
          {product.name}
        </h3>

        {/* Badge & Rating */}
        <div className="flex items-center justify-between pt-0.5">
          {product.badge ? (
            <span className="text-[9px] font-bold text-amber-900 bg-amber-50 border border-amber-200/70 px-1.5 py-0.5 rounded-md">
              {product.badge}
            </span>
          ) : <div />}

          {product.rating && (
            <div className="flex items-center space-x-0.5 text-amber-500">
              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
              <span className="text-[9px] font-bold text-slate-600">
                {product.rating}
              </span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
