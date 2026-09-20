import { motion, AnimatePresence } from "framer-motion";
import { Percent, Sparkles } from "lucide-react";
import confetti from "canvas-confetti";
import { useEffect } from "react";
import { hapticMedium } from "../lib/haptics";

export default function FreeDeliveryCelebrationModal({ isOpen, onClose }) {
  useEffect(() => {
    if (isOpen) {
      hapticMedium();
      try {
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.5 },
          colors: ["#22c55e", "#ef4444", "#3b82f6", "#eab308"]
        });
      } catch (e) {}
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[130] flex items-center justify-center p-6 bg-black/70 backdrop-blur-xs">
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          className="relative max-w-xs w-full text-center text-white flex flex-col items-center"
        >
          {/* Star burst percentage badge */}
          <div className="w-16 h-16 rounded-full bg-white text-zinc-900 flex items-center justify-center mb-5 shadow-2xl ring-4 ring-white/20 dark:bg-surface-raised dark:text-content">
            <Percent className="w-8 h-8 stroke-[3]" />
          </div>

          <h3 className="text-xl font-black text-white leading-tight tracking-tight mb-6 px-2">
            FREE Delivery Unlocked for your order!
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="bg-white text-zinc-900 hover:bg-zinc-100 px-8 py-3.5 rounded-full font-black text-xs uppercase tracking-wider shadow-xl active:scale-95 transition-transform dark:bg-surface-raised dark:text-content dark:hover:bg-surface-muted"
          >
            Yay! Thanks
          </button>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
