import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, ChevronRight } from "lucide-react";
import AnimatedCounter from "./AnimatedCounter";
import { useScrollChrome } from "../context/ScrollChromeContext";
import { hapticMedium } from "../lib/haptics";

const STOREFRONT_ROUTES = ["/", "/order-again", "/categories", "/wishlist"];

export default function FloatingCartBar() {
  const router = useRouter();
  const { isNavVisible } = useScrollChrome();
  const [cart, setCart] = useState([]);
  const [isBouncing, setIsBouncing] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const prevRouteRef = useRef(router.pathname);
  const prevCountRef = useRef(0);

  // Detect virtual keyboard opening to immediately hide above keyboard
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleViewportResize = () => {
      if (window.visualViewport) {
        const heightDiff = window.innerHeight - window.visualViewport.height;
        setIsKeyboardOpen(heightDiff > 120);
      }
    };

    const handleFocusIn = (e) => {
      const tag = e.target.tagName?.toLowerCase();
      const type = e.target.type?.toLowerCase();
      if (tag === "input" || tag === "textarea") {
        if (type !== "checkbox" && type !== "radio") {
          setIsKeyboardOpen(true);
        }
      }
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        const active = document.activeElement?.tagName?.toLowerCase();
        if (active !== "input" && active !== "textarea") {
          setIsKeyboardOpen(false);
        }
      }, 100);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleViewportResize);
    }
    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleViewportResize);
      }
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

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

    const handleBounce = () => {
      setIsBouncing(true);
      setTimeout(() => setIsBouncing(false), 450);
    };

    syncCart();
    window.addEventListener("dashit_cart_updated", syncCart);
    window.addEventListener("dashit_cart_bounce", handleBounce);
    window.addEventListener("storage", syncCart);
    const interval = setInterval(syncCart, 2000);

    return () => {
      window.removeEventListener("dashit_cart_updated", syncCart);
      window.removeEventListener("dashit_cart_bounce", handleBounce);
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

  if (!isStorefront || itemCount <= 0 || isKeyboardOpen) return null;

  return (
    <motion.div
      key="global-floating-cart-bar"
      id="global-cart-bar-target"
      initial={isFirstAppearance ? { y: 60, opacity: 0, scale: 0.8 } : false}
      animate={{
        // When navbar is visible: docked above navbar with a clean 12px breathing gap (-70px).
        // When navbar hides on scroll: glides down smoothly to screen bottom (0px) and stays visible!
        y: isNavVisible ? -70 : 0,
        opacity: 1,
        scale: isBouncing ? [1, 1.15, 0.94, 1.05, 1] : 1,
      }}
      exit={{ y: 80, opacity: 0, scale: 0.85 }}
      transition={{
        y: { type: "spring", stiffness: 320, damping: 28 },
        scale: isBouncing
          ? { duration: 0.42, ease: "easeOut" }
          : { type: "spring", stiffness: 320, damping: 28 },
        opacity: { duration: 0.18 },
      }}
      className="fixed left-0 right-0 z-[55] flex justify-center pointer-events-none px-4"
      style={{
        bottom: "max(12px, calc(8px + env(safe-area-inset-bottom, 8px)))",
      }}
    >
      <div
        onClick={() => {
          hapticMedium();
          router.push("/checkout");
        }}
        role="button"
        tabIndex={0}
        className="pointer-events-auto relative overflow-hidden bg-gradient-to-r from-[#16a34a] via-[#1bb338] to-[#16a34a] text-white rounded-full py-2 px-3.5 shadow-[0_4px_16px_rgba(0,0,0,0.12)] border border-white/20 flex items-center space-x-3 transition-transform active:scale-[0.97] cursor-pointer select-none"
      >
        {/* Left: Last 3 items added to cart in overlapping circular shapes */}
        <div className="flex items-center -space-x-2.5 shrink-0 py-0.5 pl-0.5">
          {cart.length > 0 ? (
            cart.slice(-3).reverse().map((item, idx) => (
              <div
                key={item.id || idx}
                className="w-8 h-8 rounded-full bg-white border-2 border-[#16a34a] overflow-hidden flex items-center justify-center shadow-xs shrink-0"
                style={{ zIndex: 10 - idx }}
              >
                {item.image || item.img ? (
                  <img
                    src={item.image || item.img}
                    alt={item.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-xs font-black text-[#16a34a]">
                    {item.name ? item.name.charAt(0) : "🛍️"}
                  </span>
                )}
              </div>
            ))
          ) : (
            <div className="w-8 h-8 rounded-full bg-white text-[#16a34a] flex items-center justify-center shrink-0 shadow-xs">
              <ShoppingBag className="w-4 h-4 stroke-[2.8]" />
            </div>
          )}
        </div>

        {/* Middle: View cart & Item count */}
        <div className="text-left pr-1 pl-0.5">
          <span className="font-black text-xs md:text-sm text-white block leading-tight tracking-tight drop-shadow-xs">
            View cart
          </span>
          <span className="text-[11px] font-bold text-emerald-100 block leading-tight">
            <AnimatedCounter value={itemCount} /> {itemCount === 1 ? "Item" : "Items"}
          </span>
        </div>

        {/* Right: Chevron arrow circle */}
        <div className="w-7 h-7 rounded-full bg-[#15803d] flex items-center justify-center text-white shrink-0 shadow-xs ring-1 ring-white/25">
          <ChevronRight className="w-4 h-4 stroke-[3]" />
        </div>
      </div>
    </motion.div>
  );
}
