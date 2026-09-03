import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, ChevronRight } from "lucide-react";
import AnimatedCounter from "./AnimatedCounter";
import { useScrollChrome } from "../context/ScrollChromeContext";
import { hapticMedium } from "../lib/haptics";

const STOREFRONT_ROUTES = ["/", "/order-again", "/categories", "/search"];

export default function FloatingCartBar() {
  const router = useRouter();
  const { isNavVisible } = useScrollChrome();
  const [cart, setCart] = useState([]);
  const prevRouteRef = useRef(router.pathname);
  const prevCountRef = useRef(0);

  // Sync cart from localStorage and custom event
  useEffect(() => {
    const syncCart = () => {
      try {
        const saved = localStorage.getItem("dashit_cart");
        if (saved) {
          setCart(JSON.parse(saved));
        } else {
          setCart([]);
        }
      } catch (e) {
        setCart([]);
      }
    };

    syncCart();
    window.addEventListener("dashit_cart_updated", syncCart);
    window.addEventListener("storage", syncCart);
    const interval = setInterval(syncCart, 2000);

    return () => {
      window.removeEventListener("dashit_cart_updated", syncCart);
      window.removeEventListener("storage", syncCart);
      clearInterval(interval);
    };
  }, []);

  const itemCount = cart.reduce((sum, item) => sum + (item.qty || 0), 0);
  const isStorefront = STOREFRONT_ROUTES.includes(router.pathname);

  // Determine if this is a "first appearance" (from 0 items or from non-storefront page)
  const isFirstAppearance =
    (prevCountRef.current === 0 && itemCount > 0) ||
    (!STOREFRONT_ROUTES.includes(prevRouteRef.current) && isStorefront);

  useEffect(() => {
    prevRouteRef.current = router.pathname;
    prevCountRef.current = itemCount;
  }, [router.pathname, itemCount]);

  if (!isStorefront || itemCount <= 0) return null;

  return (
    <motion.div
      key="global-floating-cart-bar"
      initial={isFirstAppearance ? { y: 90, opacity: 0, scale: 0.7 } : false}
      animate={{
        y: 0,
        opacity: 1,
        scale: 1,
        bottom: isNavVisible ? "84px" : "max(18px, calc(14px + env(safe-area-inset-bottom, 14px)))",
      }}
      exit={{ y: 80, opacity: 0, scale: 0.85 }}
      transition={{
        y: { type: "spring", stiffness: 420, damping: 24 },
        scale: { type: "spring", stiffness: 380, damping: 18 },
        opacity: { duration: 0.16 },
        bottom: { duration: 0.2, ease: [0.32, 0.72, 0, 1] },
      }}
      className="fixed left-0 right-0 z-[55] flex justify-center pointer-events-none px-4"
    >
      <div
        onClick={() => {
          hapticMedium();
          router.push("/checkout");
        }}
        role="button"
        tabIndex={0}
        className="pointer-events-auto bg-[#0c831f] hover:bg-[#0a6f1a] text-white rounded-full py-1.5 px-2.5 shadow-[0_8px_24px_rgba(12,131,31,0.4)] flex items-center space-x-2.5 transition-transform active:scale-[0.97] cursor-pointer select-none border border-emerald-400/30"
      >
        {/* Left: Bag Icon in pure white circle */}
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

        {/* Right: Chevron */}
        <div className="w-6 h-6 rounded-full bg-[#085a15] flex items-center justify-center text-white shrink-0 shadow-2xs">
          <ChevronRight className="w-3.5 h-3.5 stroke-[3]" />
        </div>
      </div>
    </motion.div>
  );
}
