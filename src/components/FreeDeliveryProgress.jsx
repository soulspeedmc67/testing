import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Truck, CircleCheck, Sparkles } from "lucide-react";

export const HANDLING_FEE = 11;
export const FREE_DELIVERY_THRESHOLD = 300;
export const DELIVERY_FEE = 25;

/**
 * Calculates delivery fee based on user order history and cart subtotal:
 * 1. First 5 orders of a user: FREE delivery!
 * 2. Orders below ₹180: 30% of subtotal.
 * 3. Orders between ₹180 and ₹299: ₹35 flat.
 * 4. Orders above ₹299: ₹25 flat.
 * 5. ₹11 handling fee across all orders.
 */
export function calculateDeliveryCharges(subtotal, orderCount = 0, coupon = null) {
  if (coupon?.waivesDelivery || coupon?.code === "FREEDEL") {
    return {
      fee: 0,
      standardFee: 0,
      isFree: true,
      reason: "Coupon discount",
    };
  }

  // Standard tier calculation:
  let standardFee = 25;
  let tierLabel = "₹25 delivery on orders above ₹299";
  if (subtotal < 180) {
    standardFee = Math.round(subtotal * 0.40);
    tierLabel = "40% delivery charge (orders under ₹180)";
  } else if (subtotal <= 299) {
    standardFee = 35;
    tierLabel = "₹35 delivery charge (orders ₹180 - ₹299)";
  } else {
    standardFee = 25;
    tierLabel = "₹25 delivery charge (orders above ₹299)";
  }

  // First 5 orders promo:
  if (orderCount < 5) {
    return {
      fee: 0,
      standardFee,
      isFree: true,
      isFirstFivePromo: true,
      orderNumber: orderCount + 1,
      ordersRemaining: 5 - orderCount,
      tierLabel,
      reason: `Free delivery on first 5 orders (Order ${orderCount + 1} of 5)`,
    };
  }

  return {
    fee: standardFee,
    standardFee,
    isFree: false,
    isFirstFivePromo: false,
    tierLabel,
    reason: tierLabel,
  };
}

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
