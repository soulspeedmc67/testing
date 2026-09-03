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
    globalTriggerFly = (imgUrl, startRect) => {
      if (!startRect) return;
      const id = Date.now() + Math.random();
      const targetX = (typeof window !== "undefined" ? window.innerWidth / 2 : 200) - (startRect.left + startRect.width / 2);
      const targetY = (typeof window !== "undefined" ? window.innerHeight - 110 : 600) - (startRect.top + startRect.height / 2);

      setFlyingItems((prev) => [
        ...prev,
        {
          id,
          imgUrl,
          startX: startRect.left + startRect.width / 2 - 20,
          startY: startRect.top + startRect.height / 2 - 20,
          targetX,
          targetY,
        },
      ]);
    };

    return () => {
      globalTriggerFly = null;
    };
  }, []);

  const handleAnimationComplete = (id) => {
    setFlyingItems((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="fixed inset-0 pointer-events-none z-[100] overflow-hidden">
      <AnimatePresence>
        {flyingItems.map((item) => (
          <motion.div
            key={item.id}
            initial={{
              x: item.startX,
              y: item.startY,
              scale: 1,
              opacity: 1,
            }}
            animate={{
              x: item.startX + item.targetX,
              y: item.startY + item.targetY,
              scale: 0.25,
              opacity: 0.1,
            }}
            exit={{ opacity: 0 }}
            transition={{
              type: "spring",
              stiffness: 220,
              damping: 22,
              mass: 0.8,
            }}
            onAnimationComplete={() => handleAnimationComplete(item.id)}
            className="absolute w-10 h-10 rounded-2xl bg-white shadow-xl border border-emerald-300 overflow-hidden flex items-center justify-center p-1"
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
