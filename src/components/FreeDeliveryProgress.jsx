import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Truck, CircleCheck, Sparkles } from "lucide-react";

import {
  HANDLING_FEE,
  FREE_DELIVERY_THRESHOLD,
  DELIVERY_FEE,
  calculateDeliveryCharges,
} from "../lib/deliveryCharges";

// The fee rules live in src/lib/deliveryCharges.js; these names stay importable from here.
export { HANDLING_FEE, FREE_DELIVERY_THRESHOLD, DELIVERY_FEE, calculateDeliveryCharges };

export default function FreeDeliveryProgress({ subtotal, orderCount = 0 }) {
  const reduceMotion = useReducedMotion();
  if (!subtotal) return null;

  const charges = calculateDeliveryCharges(subtotal, orderCount);
  const spring = reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 170, damping: 26 };
  const swap = reduceMotion
    ? {}
    : { initial: { opacity: 0, y: 4 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -4 } };

  if (charges.isFirstFivePromo) {
    return (
      <div className="mt-3 border-t border-slate-100 pt-3 dark:border-line-soft">
        <div className="flex items-center gap-2 text-[13px] font-semibold text-emerald-600 dark:text-emerald-400">
          <Sparkles className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>
            Free delivery unlocked! (Order #{charges.orderNumber} of your first 5 free orders)
          </span>
        </div>
      </div>
    );
  }

  // For users past first 5 orders
  const isAbove299 = subtotal > 299;
  const isAbove180 = subtotal >= 180;
  const nextTarget = !isAbove180 ? 180 : 300;
  const needed = Math.max(0, nextTarget - subtotal);
  const percent = isAbove299
    ? 100
    : !isAbove180
    ? Math.min(100, (subtotal / 180) * 100)
    : Math.min(100, ((subtotal - 180) / (300 - 180)) * 100);

  return (
    <div className="mt-3 border-t border-slate-100 pt-3 dark:border-line-soft" aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        {isAbove299 ? (
          <motion.div
            key="unlocked"
            {...swap}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-2 text-[13px] font-semibold text-emerald-600 dark:text-emerald-400"
          >
            <CircleCheck className="h-4 w-4 shrink-0" strokeWidth={2.4} />
            Lowest ₹25 delivery rate unlocked
          </motion.div>
        ) : (
          <motion.div key="progress" {...swap} transition={{ duration: 0.18 }}>
            <div className="flex items-center gap-2 text-[13px] text-slate-600 dark:text-slate-300">
              <Truck className="h-4 w-4 shrink-0 text-[#FF5B00]" strokeWidth={2.2} />
              <span>
                Add{" "}
                <span className="font-bold text-slate-900 dark:text-white">
                  ₹{needed}
                </span>{" "}
                more for {isAbove180 ? "lowest ₹25 delivery" : "flat ₹35 delivery"}
              </span>
            </div>
            <div className="mt-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10" style={{ height: 3 }}>
              <motion.div
                className="h-full rounded-full bg-[#FF5B00]"
                initial={false}
                animate={{ width: `${percent}%` }}
                transition={spring}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
