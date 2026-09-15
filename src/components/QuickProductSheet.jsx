import { useRouter } from "next/router";
import { Star, Clock, ShieldCheck, ChevronRight } from "lucide-react";
import VaulDrawer from "./ui/VaulDrawer";
import ProductCardStepper from "./ProductCardStepper";

/**
 * Quick-view bottom sheet.
 *
 * Call sites historically passed two different prop shapes (`cart`+`onAddToCart`
 * vs `cartQty`+`onAdd`/`onIncrement`/`onDecrement`), which silently left the
 * stepper reading qty 0 and the ADD button wired to nothing. This accepts both
 * and normalises them, so neither caller can be quietly broken again.
 */
export default function QuickProductSheet({
  product,
  isOpen,
  onClose,
  cart,
  cartQty,
  onAddToCart,
  onAdd,
  onUpdateQty,
  onIncrement,
  onDecrement,
}) {
  const router = useRouter();
  if (!product) return null;

  const productId = product.id || product.barcode;
  const derivedQty = Array.isArray(cart)
    ? cart.find((i) => String(i.id || i.barcode) === String(productId))?.qty || 0
    : 0;
  const qty = typeof cartQty === "number" ? cartQty : derivedQty;

  const handleAdd = onAddToCart || onAdd;
  const handleUpdateQty =
    onUpdateQty ||
    ((id, delta) => (delta > 0 ? onIncrement?.(id) : onDecrement?.(id)));

  return (
    <VaulDrawer
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={product.cat || "Fresh Grocery"}
      description="Fast delivery across Anantnag"
    >
      <div className="space-y-4 pt-1">
        {/* Product Image Box */}
        <div className="w-full h-52 bg-slate-50 rounded-2xl flex items-center justify-center p-4 border border-slate-100">
          <img
            src={product.img}
            alt={product.name}
            className="max-h-44 max-w-full object-contain"
          />
        </div>

        {/* Product Name & Details */}
        <div className="space-y-1.5">
          <div className="flex items-center space-x-1.5 text-xs text-amber-500 font-bold">
            <Star className="w-3.5 h-3.5 fill-amber-400" />
            <span className="text-slate-800 font-extrabold">4.8</span>
            <span className="text-slate-400 font-medium">(2,410 ratings)</span>
          </div>

          <h2 className="font-extrabold text-base text-slate-900 leading-snug">
            {product.name}
          </h2>

          <div className="flex items-center space-x-2 pt-1">
            <span className="text-slate-500 text-xs font-semibold">{product.unit || "1 unit"}</span>
            <span className="text-slate-300">•</span>
            <div className="flex items-center space-x-1 text-[11px] text-[#FF5B00] font-bold">
              <Clock className="w-3 h-3" />
              <span>{product.time || "Fast delivery"}</span>
            </div>
          </div>
        </div>

        {/* Link to Full Product Details & Variants */}
        <button
          type="button"
          onClick={() => {
            onClose?.();
            router.push(`/product/${productId}`);
          }}
          className="w-full py-2.5 px-3.5 bg-slate-50 hover:bg-slate-100 active:scale-[0.99] border border-slate-200/80 rounded-xl text-slate-800 text-xs font-black flex items-center justify-between transition-all cursor-pointer shadow-2xs"
        >
          <span className="flex items-center space-x-1.5">
            <Star className="w-3.5 h-3.5 fill-[#FF5B00] text-[#FF5B00] shrink-0" />
            <span>View Full Details, Sizes &amp; Specs</span>
          </span>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </button>

        {/* Price & Morphing Stepper Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
          <div>
            <div className="flex items-baseline space-x-1.5">
              <span className="font-mono font-black text-xl text-slate-900">₹{product.price}</span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-xs text-slate-400 line-through font-medium">₹{product.originalPrice}</span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-medium">Inclusive of all taxes</span>
          </div>

          <div className="w-32">
            <ProductCardStepper
              product={product}
              qty={qty}
              onAdd={handleAdd}
              onUpdateQty={handleUpdateQty}
              onIncrement={onIncrement}
              onDecrement={onDecrement}
            />
          </div>
        </div>
      </div>
    </VaulDrawer>
  );
}
