import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Heart, Star } from "lucide-react";
import ProductCardStepper from "./ProductCardStepper";
import { isItemInWishlist, toggleWishlistItem } from "../lib/wishlist";

export default function ProductCard({
  product,
  qty = 0,
  onAdd,
  onUpdateQty,
  onIncrement,
  onDecrement,
  onOpenQuickView,
  onQuickView,
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

  const handleHeartClick = (e) => {
    e.stopPropagation();
    const nextState = toggleWishlistItem(product);
    setFavorite(nextState);
    if (onToggleFavorite) onToggleFavorite(product.id || product.barcode, nextState);
  };

  return (
    <div
      onClick={() => onOpenQuickView && onOpenQuickView(product)}
      className="bg-white rounded-2xl border border-slate-200/80 p-2.5 flex flex-col justify-between shadow-xs hover:shadow-md transition-all active:scale-[0.99] cursor-pointer group select-none relative"
    >
      {/* Top Image Container */}
      <div className="relative w-full aspect-square bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center p-2 border border-slate-100">
        <img
          src={product.img}
          alt={product.name}
          className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
        />

        {/* Favorite Heart Button with Scale Bounce */}
        <motion.button
          type="button"
          whileTap={{ scale: 1.3 }}
          onClick={handleHeartClick}
          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-white/80 backdrop-blur-xs text-slate-400 hover:text-rose-500 shadow-xs transition-colors"
        >
          <Heart
            className={`w-3.5 h-3.5 ${
              favorite ? "fill-rose-500 text-rose-500" : "stroke-[2]"
            }`}
          />
        </motion.button>

        {/* Pagination Dots */}
        <div className="absolute bottom-1.5 flex items-center space-x-1">
          <span className="w-1.5 h-1.5 rounded-full bg-slate-800 shadow-xs" />
          <span className="w-1 h-1 rounded-full bg-slate-300" />
          <span className="w-1 h-1 rounded-full bg-slate-300" />
        </div>
      </div>

      {/* Unit & Add Button Row */}
      <div className="flex items-center justify-between mt-2">
        <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
          {product.unit}
        </span>

        {/* Morphing Stepper / ADD Button */}
        <div className="w-20">
          <ProductCardStepper
            product={product}
            qty={qty}
            onAdd={onAdd}
            onUpdateQty={onUpdateQty}
            onIncrement={onIncrement}
            onDecrement={onDecrement}
            subtext={product.options}
          />
        </div>
      </div>

      {/* Price & Name Info */}
      <div className="mt-1.5 space-y-1">
        <div className="flex items-baseline space-x-1.5">
          <span className="text-sm font-black text-slate-900 font-mono">
            ₹{product.price}
          </span>
          {product.originalPrice > product.price && (
            <span className="text-[10px] text-slate-400 line-through font-mono">
              ₹{product.originalPrice}
            </span>
          )}
        </div>

        <h3 className="text-xs font-bold text-slate-800 line-clamp-2 leading-snug">
          {product.name}
        </h3>

        {/* Badge & Rating */}
        <div className="flex items-center justify-between pt-0.5">
          {product.badge ? (
            <span className="text-[9px] font-extrabold text-amber-800 bg-amber-50 border border-amber-200/80 px-1.5 py-0.5 rounded-md">
              {product.badge}
            </span>
          ) : <div />}

          {product.rating && (
            <div className="flex items-center space-x-0.5 text-amber-500">
              <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
              <span className="text-[9px] font-extrabold text-slate-600">
                {product.rating}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
