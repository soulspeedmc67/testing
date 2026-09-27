import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Truck, CircleCheck } from "lucide-react";

export const FREE_DELIVERY_THRESHOLD = 299;
export const DELIVERY_FEE = 25;

/* Free-delivery progress in the checkout summary: one line of copy over a
   hairline bar. It never blocks checkout; under ₹299 the order just carries
   the ₹25 fee. */
export default function FreeDeliveryProgress({ subtotal }) {
  const reduceMotion = useReducedMotion();
  if (!subtotal) return null;

  const unlocked = subtotal >= FREE_DELIVERY_THRESHOLD;
  const percent = Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100);
  const spring = reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 170, damping: 26 };
  const swap = reduceMotion
    ? {}
    : { initial: { opacity: 0, y: 4 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -4 } };

  return (
    <div className="mt-3 border-t border-slate-100 pt-3 dark:border-line-soft" aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        {unlocked ? (
          <motion.div
            key="unlocked"
            {...swap}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-2 text-[13px] font-semibold text-emerald-600 dark:text-emerald-400"
          >
            <CircleCheck className="h-4 w-4 shrink-0" strokeWidth={2.4} />
            You&apos;ve unlocked free delivery
          </motion.div>
        ) : (
          <motion.div key="progress" {...swap} transition={{ duration: 0.18 }}>
            <div className="flex items-center gap-2 text-[13px] text-slate-600 dark:text-slate-300">
              <Truck className="h-4 w-4 shrink-0 text-[#FF5B00]" strokeWidth={2.2} />
              <span>
                Add{" "}
                <span className="font-bold text-slate-900 dark:text-white">
                  ₹{FREE_DELIVERY_THRESHOLD - subtotal}
                </span>{" "}
                more for free delivery
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
