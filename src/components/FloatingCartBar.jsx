import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/router";
import { ShoppingBag, ChevronRight } from "lucide-react";
import AnimatedCounter from "./AnimatedCounter";
import { useScrollChrome } from "../context/ScrollChromeContext";

export default function FloatingCartBar({ cart = [], onOpenCart }) {
  const router = useRouter();
  const { isNavVisible } = useScrollChrome();

  const itemCount = cart.reduce((sum, item) => sum + (item.qty || 0), 0);

  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (onOpenCart) {
      onOpenCart();
    } else {
      router.push("/cart");
    }
  };

  return (
    <AnimatePresence>
      {itemCount > 0 && (
        <motion.div
          key="floating-cart-bar-pill"
          initial={{ y: 80, opacity: 0, scale: 0.92 }}
          animate={{
            y: 0,
            opacity: 1,
            scale: 1,
            bottom: isNavVisible ? "84px" : "max(18px, calc(14px + env(safe-area-inset-bottom, 14px)))",
          }}
          exit={{ y: 80, opacity: 0, scale: 0.92 }}
          transition={{ type: "spring", stiffness: 320, damping: 26 }}
          className="fixed left-0 right-0 z-[55] flex justify-center pointer-events-none px-4"
        >
          <div
            onClick={handleClick}
            role="button"
            tabIndex={0}
            className="pointer-events-auto bg-[#0c831f] hover:bg-[#0a6f1a] text-white rounded-full py-1.5 px-2.5 shadow-[0_8px_24px_rgba(12,131,31,0.4)] flex items-center space-x-2.5 transition-transform active:scale-[0.97] cursor-pointer select-none border border-emerald-400/30"
          >
            {/* Left: Bag Icon in pure white circle (replaces last item thumbnail) */}
            <div className="w-7 h-7 rounded-full bg-white text-[#0c831f] flex items-center justify-center shrink-0 shadow-xs">
              <ShoppingBag className="w-3.5 h-3.5 stroke-[2.8]" />
            </div>

            {/* Middle: View cart & Item count */}
            <div className="text-left pr-1">
              <span className="font-black text-xs text-white block leading-tight">
                View cart
              </span>
              <span className="text-[10px] font-bold text-emerald-100/90 block leading-tight">
                <AnimatedCounter value={itemCount} /> {itemCount === 1 ? "Item" : "Items"}
              </span>
            </div>

            {/* Right: Darker Green Circular Button with Chevron */}
            <div className="w-6 h-6 rounded-full bg-[#085a15] flex items-center justify-center text-white shrink-0 shadow-2xs">
              <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
