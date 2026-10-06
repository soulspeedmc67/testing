import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Truck, CircleCheck, Sparkles } from "lucide-react";

import {
  HANDLING_FEE,
  FREE_DELIVERY_THRESHOLD,
  DELIVERY_FEE,
  SHOP_RULE_DEFAULTS,
  calculateDeliveryCharges,
  deliveryFeeWords,
} from "../lib/deliveryCharges";

// The fee rules live in src/lib/deliveryCharges.js; these names stay importable from here.
export { HANDLING_FEE, FREE_DELIVERY_THRESHOLD, DELIVERY_FEE, calculateDeliveryCharges };

/** `rules` are the shop's current fees (`useShopRules`). */
export default function FreeDeliveryProgress({ subtotal, orderCount = 0, rules = SHOP_RULE_DEFAULTS }) {
  const reduceMotion = useReducedMotion();
  if (!subtotal) return null;

  const charges = calculateDeliveryCharges(subtotal, orderCount, null, rules);
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
            Free delivery unlocked! (Order #{charges.orderNumber} of your first {charges.freeOrders} free orders)
          </span>
        </div>
      </div>
    );
  }

  // Past the free first orders: the bar counts towards the next, lower fee.
  const smallBelow = rules.deliverySmallBelow;
  const lowFrom = rules.deliveryLowFrom;
  const isAbove299 = subtotal >= lowFrom;
  const isAbove180 = subtotal >= smallBelow;
  const nextTarget = !isAbove180 ? smallBelow : lowFrom;
  const needed = Math.max(0, nextTarget - subtotal);
  const percent = isAbove299
    ? 100
    : !isAbove180
    ? Math.min(100, (subtotal / Math.max(1, smallBelow)) * 100)
    : Math.min(100, ((subtotal - smallBelow) / Math.max(1, lowFrom - smallBelow)) * 100);
  const lowestWords = rules.deliveryLowFee > 0 ? `lowest ${deliveryFeeWords(rules.deliveryLowFee)}` : "free delivery";
  const midWords = rules.deliveryMidFee > 0 ? `flat ${deliveryFeeWords(rules.deliveryMidFee)}` : "free delivery";

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
            {rules.deliveryLowFee > 0 ? `Lowest ₹${rules.deliveryLowFee} delivery rate unlocked` : "Free delivery unlocked"}
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
                more for {isAbove180 ? lowestWords : midWords}
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
