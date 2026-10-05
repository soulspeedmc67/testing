import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { ShoppingBag, ChevronRight } from "lucide-react";
import AnimatedCounter from "./AnimatedCounter";
import { useScrollChrome } from "../context/ScrollChromeContext";
import { hapticMedium } from "../lib/haptics";
import { useStoredJson } from "../lib/useStoredJson";
import { productImageUrl } from "./ProductImage";

/* Stable identity so an empty cart does not produce a new array each render. */
const EMPTY_CART = [];

const STOREFRONT_ROUTES = ["/shop", "/order-again", "/categories", "/wishlist", "/search", "/offers", "/product", "/tobacco"];
const NAVBAR_ROUTES = ["/shop", "/order-again", "/categories"];

export default function FloatingCartBar() {
  const router = useRouter();
  const { isNavVisible } = useScrollChrome();
  /* The bar sits in _app, so it is mounted on every screen: it reads the cart
     through the shared store hook, which only re-renders when the stored cart
     actually changes instead of on a 2-second timer. */
  const cart = useStoredJson("dashit_cart", {
    events: ["dashit_cart_updated"],
    intervalMs: 4000,
    fallback: EMPTY_CART,
  });
  const [isBouncing, setIsBouncing] = useState(false);
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const prevRouteRef = useRef(router.pathname);
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 768);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);
    return () => window.removeEventListener("resize", checkDesktop);
  }, []);

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

  // Bounce is a one-off animation cue, independent of the cart contents
  useEffect(() => {
    const handleBounce = () => {
      setIsBouncing(true);
      setTimeout(() => setIsBouncing(false), 450);
    };
    window.addEventListener("dashit_cart_bounce", handleBounce);
    return () => window.removeEventListener("dashit_cart_bounce", handleBounce);
  }, []);

  /* Storage can hold anything a previous build wrote; never trust its shape. */
  const items = Array.isArray(cart) ? cart : EMPTY_CART;
  const itemCount = items.reduce((sum, item) => sum + (item.qty || 0), 0);
  const subtotal = items.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 0),
    0
  );
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
      initial={isFirstAppearance ? { y: 60, opacity: 0, scale: 0.8 } : false}
      animate={{
        // When navbar is visible on pages with navbar on mobile: docked above navbar with a clean breathing gap (-72px).
        // On desktop or pages without navbar: glides down smoothly to screen bottom (0px).
        y: (!isDesktop && NAVBAR_ROUTES.includes(router.pathname) && isNavVisible) ? -72 : 0,
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
      className="fixed left-0 right-0 md:right-auto md:left-6 z-[55] flex justify-center md:justify-start pointer-events-none px-4 md:px-0"
      style={{
        bottom: "max(12px, calc(8px + env(safe-area-inset-bottom, 8px)))",
      }}
    >
      <div
        id="global-cart-bar-target"
        onClick={() => {
          hapticMedium();
          router.push("/checkout");
        }}
        role="button"
        tabIndex={0}
        aria-label={`View cart: ${itemCount} ${itemCount === 1 ? "item" : "items"}, ₹${subtotal}`}
        className="pointer-events-auto bg-[#FF5B00] hover:bg-[#E04E00] text-white rounded-full pl-2 pr-4 py-2 shadow-[0_12px_32px_-6px_rgba(255,91,0,0.55),0_4px_12px_rgba(0,0,0,0.15)] border border-white/25 flex items-center gap-3 min-w-[240px] transition-all active:scale-[0.97] cursor-pointer select-none"
      >
        {/* The last few things added, as small white packshots */}
        <div className="flex items-center -space-x-2 shrink-0">
          {items.slice(-3).reverse().map((item, idx) => (
            <div
              key={item.id || idx}
              className="w-9 h-9 rounded-lg bg-white ring-2 ring-[#FF5B00] overflow-hidden flex items-center justify-center shrink-0"
              style={{ zIndex: 10 - idx }}
            >
              {item.image || item.img ? (
                <img src={productImageUrl(item.image || item.img)} alt="" className="w-full h-full object-contain p-0.5" />
              ) : (
                <ShoppingBag className="w-4 h-4 text-[#FF5B00]" />
              )}
            </div>
          ))}
        </div>

        <div className="grow text-left leading-tight">
          <span className="block text-[15px] font-bold">View cart</span>
          <span className="block text-[12px] font-medium text-white/85 tabular-nums">
            <AnimatedCounter value={itemCount} /> {itemCount === 1 ? "item" : "items"} · ₹{subtotal}
          </span>
        </div>

        <ChevronRight className="w-5 h-5 shrink-0" />
      </div>
    </motion.div>
  );
}
