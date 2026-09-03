import { Star, Clock, ShieldCheck } from "lucide-react";
import VaulDrawer from "./ui/VaulDrawer";
import ProductCardStepper from "./ProductCardStepper";

export default function QuickProductSheet({ product, isOpen, onClose, cart = [], onAddToCart, onUpdateQty }) {
  if (!product) return null;

  const cartItem = cart.find((i) => i.id === product.id);
  const qty = cartItem ? cartItem.qty : 0;

  return (
    <VaulDrawer
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={product.cat || "Fresh Grocery"}
      description="Guaranteed 10-minute delivery in Anantnag"
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
            <div className="flex items-center space-x-1 text-[11px] text-[#0c831f] font-bold">
              <Clock className="w-3 h-3" />
              <span>{product.time || "10 mins"}</span>
            </div>
          </div>
        </div>

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
              onAdd={onAddToCart}
              onUpdateQty={onUpdateQty}
            />
          </div>
        </div>
      </div>
    </VaulDrawer>
  );
}
