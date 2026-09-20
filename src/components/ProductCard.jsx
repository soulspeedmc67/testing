import { useState, useEffect, memo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { motion } from "framer-motion";
import { Heart, ImageOff } from "lucide-react";
import ProductCardStepper from "./ProductCardStepper";
import { isItemInWishlist, toggleWishlistItem } from "../lib/wishlist";
import { SPRING_BOUNCY } from "../lib/motion";
import { isAgeRestricted } from "../lib/ageGate";

function ProductCard({
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
  onToggleFavorite,
  compact = false
}) {
  const router = useRouter();
  const pId = product?.id || product?.barcode;

  /* Seeded from the prop only. isItemInWishlist() reads localStorage, which the
     server cannot do, so calling it here made the heart render differently on
     the server and the client — a hydration mismatch that made React throw away
     the server HTML and re-render the whole page. The effect below reads the
     wishlist immediately after mount, so the state is still correct. */
  const [favorite, setFavorite] = useState(Boolean(isFavorite));

  /* Catalogue images are remote and a few of them 404. Without this the card
     rendered the browser's broken-image glyph next to the alt text, which is
     the single most "unfinished" thing a storefront can show. */
  const [imgFailed, setImgFailed] = useState(false);

  const ageRestricted = isAgeRestricted(product);

  useEffect(() => {
    const syncFav = () => {
      setFavorite(isItemInWishlist(pId));
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

  const handleCardClick = () => {
    const pId = product?.id || product?.barcode;
    if (pId) {
      router.push(`/product/${pId}`);
    } else if (onOpenQuickView || onQuickView) {
      (onOpenQuickView || onQuickView)(product);
    }
  };

  const discountPercent =
    product.originalPrice > product.price
      ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100)
      : null;

  const isOutOfStock = product.stock !== undefined && Number(product.stock) <= 0;
  const isLowStock =
    product.stock !== undefined && Number(product.stock) > 0 && Number(product.stock) <= 5;

  return (
    <motion.div
      whileTap={{ scale: 0.985 }}
      onClick={handleCardClick}
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: compact ? "140px 210px" : "170px 260px",
      }}
      className={`group bg-white border flex flex-col overflow-hidden cursor-pointer select-none relative will-change-transform transition-[box-shadow,border-color] duration-200 ${
        compact ? "rounded-xl" : "rounded-2xl"
      } ${
        isOutOfStock
          ? "border-slate-200 opacity-80 shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
          : "border-slate-200/80 shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:border-slate-300 hover:shadow-[0_6px_18px_-8px_rgba(15,23,42,0.18)]"
      } dark:bg-surface-raised dark:hover:border-line-strong`}
    >
      {/* Photo well.
          Every product photo fills this square edge to edge via object-cover, so
          the imagery is identically sized and framed on every card in the grid.
          The previous object-contain fit let each photo keep its own aspect
          ratio inside the square, so a wide shot became a thin letterboxed strip
          next to a square one and the grid read as ragged. */}
      <div className="relative w-full aspect-square bg-slate-100 overflow-hidden dark:bg-surface-muted">
        {imgFailed || !product.img ? (
          <div
            role="img"
            aria-label={product.name}
            className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-slate-50 text-slate-300 dark:bg-surface-raised dark:text-content-faint"
          >
            <ImageOff className={compact ? "w-5 h-5" : "w-6 h-6"} strokeWidth={1.75} />
          </div>
        ) : (
          <img
            src={product.img}
            alt={product.name}
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
            className={`absolute inset-0 h-full w-full object-cover transition-transform duration-500 ease-out ${
              isOutOfStock ? "grayscale-[40%]" : "group-hover:scale-[1.04]"
            }`}
          />
        )}

        {/* Favorite Heart Button */}
        <motion.button
          type="button"
          whileTap={{ scale: 1.3 }}
          transition={SPRING_BOUNCY}
          onClick={handleHeartClick}
          aria-label={favorite ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          aria-pressed={favorite}
          className={`tap-target-44 absolute ${compact ? "top-1.5 right-1.5 p-1" : "top-2 right-2 p-1.5"} rounded-full bg-white/85 backdrop-blur-sm text-slate-600 hover:text-rose-500 shadow-2xs transition-colors dark:bg-surface-raised/85 dark:text-content-secondary`}
        >
          <Heart
            className={`${compact ? "w-3 h-3" : "w-3.5 h-3.5"} ${
              favorite ? "fill-rose-500 text-rose-500" : "stroke-[2]"
            }`}
          />
        </motion.button>

        {/* Discount Tag — solid fill, so it stays legible on any photograph
            without needing a scrim laid over the image. */}
        {discountPercent && !isOutOfStock && (
          <span className={`absolute ${compact ? "top-1.5 left-1.5 text-[8px] px-1.5 py-0.5" : "top-2 left-2 text-[9px] px-2 py-[3px]"} font-black text-white bg-[#FF5B00] rounded-full shadow-sm tracking-wide`}>
            {discountPercent}% OFF
          </span>
        )}

        {/* 18+ marker — bottom corner, so it never collides with the discount tag */}
        {ageRestricted && !isOutOfStock && (
          <span
            aria-label="Age restricted, 18 plus"
            className={`absolute ${compact ? "bottom-1.5 left-1.5 text-[8px] px-1.5 py-0.5" : "bottom-2 left-2 text-[9px] px-2 py-[3px]"} font-black text-white bg-[#061838] rounded-full shadow-sm tracking-wide`}
          >
            18+
          </span>
        )}

        {/* Out of Stock Overlay */}
        {isOutOfStock && (
          <div className="absolute inset-0 bg-slate-900/45 backdrop-blur-[1px] flex items-center justify-center p-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-white bg-rose-600/95 px-2.5 py-1 rounded-lg shadow-sm">
              Out of Stock
            </span>
          </div>
        )}
      </div>

      {/* Name → unit → price + action: one calm top-to-bottom reading order.
          grow + mt-auto on the price row pins the ADD button to the bottom of
          every card, so a two-line name and a one-line name still line up
          across a row. */}
      <div className={`flex flex-col grow ${compact ? "p-2" : "p-2.5"}`}>
        <h3
          className={`${
            compact ? "text-[11px] min-h-[28px]" : "text-[12.5px] min-h-[34px]"
          } font-semibold text-[#061838] line-clamp-2 leading-snug tracking-tight dark:text-content`}
        >
          {pId ? (
            <Link
              href={`/product/${pId}/`}
              onClick={(e) => e.stopPropagation()}
              className="hover:text-[#FF5B00] transition-colors"
            >
              {product.name}
            </Link>
          ) : (
            product.name
          )}
        </h3>

        {/* Single quiet metadata line — stock warning replaces the unit only when it matters */}
        <p
          className={`${compact ? "text-[9.5px]" : "text-[10.5px]"} mt-0.5 font-medium truncate ${
            isLowStock ? "text-amber-700" : "text-slate-500 dark:text-content-muted"
          }`}
        >
          {isLowStock ? `Only ${product.stock} left` : product.unit}
        </p>

        {ageRestricted && (
          <p className={`${compact ? "text-[9px]" : "text-[9.5px]"} font-semibold text-slate-400 truncate dark:text-content-faint`}>
            Age verification required
          </p>
        )}

        <div className={`flex items-end justify-between gap-2 ${compact ? "mt-auto pt-1.5" : "mt-auto pt-2"}`}>
          <div className="flex flex-col min-w-0 leading-none">
            {product.originalPrice > product.price && (
              <span
                className={`${
                  compact ? "text-[9px]" : "text-[10px]"
                } text-slate-400 line-through font-mono mb-0.5 dark:text-content-faint`}
              >
                ₹{product.originalPrice}
              </span>
            )}
            <span
              className={`${
                compact ? "text-[13px]" : "text-[15px]"
              } font-black text-[#061838] font-mono tracking-tight dark:text-content`}
            >
              ₹{product.price}
            </span>
          </div>

          {/* Morphing Stepper / ADD Button (Rigid dimensions to prevent layout reflow) */}
          <div className={`${compact ? "w-[62px] h-7" : "w-[70px] h-8"} shrink-0 relative overflow-hidden`}>
            <ProductCardStepper
              product={product}
              qty={qty}
              onAdd={onAdd}
              onUpdateQty={onUpdateQty}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
              onSelectVariants={onSelectVariants}
              className="h-full"
              subtext={product.variants?.length > 1 ? `${product.variants.length} sizes` : product.options}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default memo(ProductCard);
