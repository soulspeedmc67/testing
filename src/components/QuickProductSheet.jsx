import { useState } from "react";
import { Star, Clock, ShieldCheck, ChevronDown, Package, CheckCircle2, Truck } from "lucide-react";
import VaulDrawer from "./ui/VaulDrawer";
import ProductCardStepper from "./ProductCardStepper";

/**
 * Quick-view bottom sheet (native quick-commerce pattern).
 * Keeps customer in the shopping flow without full-page browser navigations.
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
  const [showDetails, setShowDetails] = useState(false);
  if (!product) return null;

  const productId = product.id || product.barcode;
  const isOutOfStock = product.stock !== undefined && Number(product.stock) <= 0;
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
        if (!open) {
          setShowDetails(false);
          onClose();
        }
      }}
      title={product.cat || "Fresh Grocery"}
      description="Fast delivery across Anantnag"
    >
      <div className="space-y-4 pt-1">
        {/* Product Image Box */}
        <div className="w-full h-52 bg-slate-50 rounded-2xl flex items-center justify-center p-4 border border-slate-100 relative overflow-hidden dark:bg-surface-raised dark:border-line-soft">
          <img
            src={product.img}
            alt={product.name}
            className={`max-h-44 max-w-full object-contain ${isOutOfStock ? "grayscale-[35%]" : ""}`}
          />
          {isOutOfStock && (
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[1px] flex items-center justify-center">
              <span className="text-xs font-black uppercase tracking-wider text-white bg-rose-600 px-3 py-1 rounded-lg shadow-sm">
                Out of Stock
              </span>
            </div>
          )}
        </div>

        {/* Product Name & Details */}
        <div className="space-y-1.5">
          <div className="flex items-center space-x-1.5 text-xs text-amber-500 font-bold">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
            <span className="text-slate-800 font-extrabold dark:text-content">{product.rating || "4.8"}</span>
            <span className="text-slate-400 font-medium dark:text-content-faint">({product.ratingCount || "1,250"} ratings)</span>
          </div>

          <h2 className="font-extrabold text-base text-slate-900 leading-snug dark:text-content">
            {product.name}
          </h2>

          <div className="flex items-center space-x-2 pt-1">
            <span className="text-slate-500 text-xs font-semibold dark:text-content-muted">{product.unit || "1 unit"}</span>
            <span className="text-slate-300 dark:text-content-faint">•</span>
            <div className="flex items-center space-x-1 text-[11px] text-[#FF5B00] font-bold">
              <Clock className="w-3 h-3" />
              <span>{product.time || "8-15 mins"}</span>
            </div>
          </div>
        </div>

        {/* Out of Stock Notice */}
        {isOutOfStock && (
          <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-3 py-2 flex items-center space-x-2 text-xs text-rose-600 font-bold dark:text-rose-400">
            <Package className="w-4 h-4 shrink-0 text-rose-500" />
            <span>Currently Out of Stock · Restocking shortly at Anantnag Hub</span>
          </div>
        )}

        {/* Expandable Product Details & Specifications */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden dark:border-line/80">
          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            className="w-full py-2.5 px-3.5 bg-slate-50 hover:bg-slate-100 active:scale-[0.99] text-slate-800 text-xs font-black flex items-center justify-between transition-all cursor-pointer shadow-2xs dark:bg-surface-raised dark:hover:bg-surface-muted dark:text-content"
          >
            <span className="flex items-center space-x-1.5">
              <Star className="w-3.5 h-3.5 fill-[#FF5B00] text-[#FF5B00] shrink-0" />
              <span>Product Details, Specs &amp; Guarantee</span>
            </span>
            <ChevronDown className={`w-4 h-4 text-slate-400 dark:text-content-faint transition-transform duration-200 ${showDetails ? "rotate-180" : ""}`} />
          </button>

          {showDetails && (
            <div className="p-3.5 space-y-3 text-xs bg-white border-t border-slate-100 dark:bg-surface-overlay dark:border-line-soft animate-in fade-in slide-in-from-top-1 duration-150">
              {product.description && (
                <div>
                  <h4 className="font-bold text-slate-900 dark:text-content mb-1">Description</h4>
                  <p className="text-slate-600 dark:text-content-secondary leading-relaxed">{product.description}</p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-slate-50 p-2 rounded-xl dark:bg-surface-muted">
                  <span className="text-slate-400 dark:text-content-faint block">Category</span>
                  <span className="font-bold text-slate-800 dark:text-content">{product.cat || "Daily Grocery"}</span>
                </div>
                <div className="bg-slate-50 p-2 rounded-xl dark:bg-surface-muted">
                  <span className="text-slate-400 dark:text-content-faint block">Pack Size</span>
                  <span className="font-bold text-slate-800 dark:text-content">{product.unit || "Standard pack"}</span>
                </div>
                {product.brand && (
                  <div className="bg-slate-50 p-2 rounded-xl dark:bg-surface-muted">
                    <span className="text-slate-400 dark:text-content-faint block">Brand</span>
                    <span className="font-bold text-slate-800 dark:text-content">{product.brand}</span>
                  </div>
                )}
                <div className="bg-slate-50 p-2 rounded-xl dark:bg-surface-muted">
                  <span className="text-slate-400 dark:text-content-faint block">Quality Check</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> 100% Genuine
                  </span>
                </div>
              </div>
              <div className="pt-2 border-t border-slate-100 dark:border-line-soft space-y-1 text-[11px] text-slate-500 dark:text-content-muted">
                <div className="flex items-center space-x-1.5">
                  <Truck className="w-3.5 h-3.5 text-[#FF5B00] shrink-0" />
                  <span>8-15 min fastest doorstep delivery across Anantnag</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Cash on Delivery (COD) supported</span>
                </div>
              </div>
            </div>
          )}
        </div>


        {/* Price & Morphing Stepper Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between dark:border-line-soft">
          <div>
            <div className="flex items-baseline space-x-1.5">
              <span className="font-mono font-black text-xl text-slate-900 dark:text-content">₹{product.price}</span>
              {product.originalPrice && product.originalPrice > product.price && (
                <span className="text-xs text-slate-400 line-through font-medium dark:text-content-faint">₹{product.originalPrice}</span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 font-medium dark:text-content-faint">Inclusive of all taxes</span>
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
