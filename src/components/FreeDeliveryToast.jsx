import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import confetti from "canvas-confetti";
import { useStoredJson } from "../lib/useStoredJson";
import { hapticMedium } from "../lib/haptics";
import { FREE_DELIVERY_THRESHOLD, DELIVERY_FEE } from "./FreeDeliveryProgress";

const EMPTY_CART = [];
const VISIBLE_MS = 2600;
const HIDDEN_ON = ["/xcyop", "/driver", "/login"];

function cartSubtotal(cart) {
  if (!Array.isArray(cart)) return 0;
  return cart.reduce((sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 0), 0);
}

/* Mounted once in _app. When the cart crosses ₹299 on any screen, a toast
   drops in under the status bar with a short confetti burst. It celebrates
   once per cart: emptying the cart (or placing the order) re-arms it. */
export default function FreeDeliveryToast() {
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const cart = useStoredJson("dashit_cart", {
    events: ["dashit_cart_updated"],
    intervalMs: 4000,
    fallback: EMPTY_CART,
  });
  const previousRef = useRef(null);
  const celebratedRef = useRef(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Read storage itself: the hook starts on an empty fallback before its
    // first sync, which would look like the cart filling up on page load.
    let subtotal;
    try {
      subtotal = cartSubtotal(JSON.parse(localStorage.getItem("dashit_cart") || "[]"));
    } catch (e) {
      return;
    }
    const previous = previousRef.current;
    previousRef.current = subtotal;
    if (subtotal === 0) celebratedRef.current = false;
    if (previous === null) {
      celebratedRef.current = subtotal >= FREE_DELIVERY_THRESHOLD;
      return;
    }
    if (previous < FREE_DELIVERY_THRESHOLD && subtotal >= FREE_DELIVERY_THRESHOLD && !celebratedRef.current) {
      celebratedRef.current = true;
      if (HIDDEN_ON.includes(router.pathname)) return;
      setVisible(true);
      hapticMedium();
      if (!reduceMotion) {
        try {
          confetti({
            particleCount: 70,
            spread: 70,
            startVelocity: 32,
            gravity: 1.1,
            ticks: 160,
            scalar: 0.85,
            origin: { x: 0.5, y: 0.08 },
            colors: ["#FF5B00", "#22C55E", "#FFFFFF", "#FDBA74"],
            disableForReducedMotion: true,
          });
        } catch (e) {}
      }
    }
  }, [cart, reduceMotion, router.pathname]);

  useEffect(() => {
    if (!visible) return undefined;
    const timer = setTimeout(() => setVisible(false), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [visible]);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[140] flex justify-center px-4"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 10px)" }}
    >
      <AnimatePresence>
        {visible && (
          <motion.div
            role="status"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="flex items-center gap-3 rounded-full border border-slate-200/80 bg-white py-2 pl-2 pr-5 shadow-[0_12px_32px_-8px_rgba(15,23,42,0.28)] dark:border-white/15 dark:bg-[#1E2430] dark:shadow-[0_12px_32px_-6px_rgba(0,0,0,0.6)]"
          >
            <span className="relative grid h-8 w-8 shrink-0 place-items-center">
              {!reduceMotion && (
                <motion.span
                  className="absolute inset-0 rounded-full border-2 border-emerald-500"
                  initial={{ scale: 0.7, opacity: 0.9 }}
                  animate={{ scale: 1.9, opacity: 0 }}
                  transition={{ duration: 0.9, delay: 0.15, ease: "easeOut" }}
                />
              )}
              <motion.span
                className="grid h-8 w-8 place-items-center rounded-full bg-emerald-500 text-white"
                initial={reduceMotion ? false : { scale: 0.4 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 520, damping: 17, delay: 0.05 }}
              >
                <Check className="h-4 w-4" strokeWidth={3.2} />
              </motion.span>
            </span>
            <span className="leading-tight">
              <span className="block text-sm font-bold text-slate-900 dark:text-white">
                Free delivery unlocked
              </span>
              <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">
                You&apos;re saving ₹{DELIVERY_FEE} on this order
              </span>
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
