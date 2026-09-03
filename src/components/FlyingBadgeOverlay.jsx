import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

let globalTriggerFly = null;

export function triggerFlyToCart(imgUrl, startRect) {
  if (globalTriggerFly) {
    globalTriggerFly(imgUrl, startRect);
  }
}

export default function FlyingBadgeOverlay() {
  const [flyingItems, setFlyingItems] = useState([]);

  useEffect(() => {
    globalTriggerFly = (imgUrl) => {
      const id = Date.now() + Math.random();

      // Locate the actual View Cart bar thumbnail on screen
      let destX = typeof window !== "undefined" ? window.innerWidth / 2 - 40 : 160;
      let destY = typeof window !== "undefined" ? window.innerHeight - 80 : 600;

      const cartBarEl = document.getElementById("global-cart-bar-target");
      if (cartBarEl) {
        const cartRect = cartBarEl.getBoundingClientRect();
        // Land directly inside the left circular thumbnail of the View Cart pill
        destX = cartRect.left + 24;
        destY = cartRect.top + cartRect.height / 2;
      }

      setFlyingItems((prev) => [
        ...prev,
        {
          id,
          imgUrl,
          dropX: destX - 18,
          dropStartY: destY - 80,
          dropEndY: destY - 18,
        },
      ]);
    };

    return () => {
      globalTriggerFly = null;
    };
  }, []);

  const handleAnimationComplete = (id) => {
    try {
      window.dispatchEvent(new Event("dashit_cart_bounce"));
    } catch (e) {}
    setFlyingItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      <AnimatePresence>
        {flyingItems.map((item) => (
          <motion.div
            key={item.id}
            initial={{
              x: item.dropX,
              y: item.dropStartY,
              scale: 1.1,
              opacity: 0,
            }}
            animate={{
              x: item.dropX,
              y: [item.dropStartY, item.dropEndY],
              scale: [1.1, 0.38],
              opacity: [0, 1, 0.95],
            }}
            exit={{ opacity: 0 }}
            transition={{
              duration: 0.28,
              ease: [0.22, 1, 0.36, 1],
            }}
            onAnimationComplete={() => handleAnimationComplete(item.id)}
            className="absolute w-10 h-10 rounded-full bg-white shadow-[0_4px_12px_rgba(0,0,0,0.18)] border-2 border-[#061838] overflow-hidden flex items-center justify-center p-1"
          >
            <img
              src={item.imgUrl}
              alt=""
              className="w-full h-full object-contain"
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
