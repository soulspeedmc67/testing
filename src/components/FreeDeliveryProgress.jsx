import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Bike, Check } from "lucide-react";

export const FREE_DELIVERY_THRESHOLD = 299;

const glide = { type: "spring", stiffness: 140, damping: 22 };

/* A slim line with a rider that moves toward free delivery as the cart grows.
   It never blocks checkout: under ₹299 the order just carries the ₹25 fee. */
export default function FreeDeliveryProgress({ subtotal }) {
  const reduceMotion = useReducedMotion();
  if (!subtotal) return null;

  const unlocked = subtotal >= FREE_DELIVERY_THRESHOLD;
  const percent = Math.min(100, (subtotal / FREE_DELIVERY_THRESHOLD) * 100);
  const transition = reduceMotion ? { duration: 0 } : glide;
  const swap = reduceMotion
    ? {}
    : { initial: { opacity: 0, y: 6 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -6 } };

  return (
    <div className="mt-3 px-0.5" aria-live="polite">
      <div className="h-4 text-xs font-semibold">
        <AnimatePresence mode="wait" initial={false}>
          {unlocked ? (
            <motion.p
              key="unlocked"
              {...swap}
              className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400"
            >
              <motion.span
                initial={reduceMotion ? false : { scale: 0, rotate: -90 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 520, damping: 16 }}
                className="grid h-4 w-4 place-items-center rounded-full bg-emerald-500 text-white"
              >
                <Check className="h-2.5 w-2.5" strokeWidth={4} />
              </motion.span>
              Free delivery unlocked
            </motion.p>
          ) : (
            <motion.p key="progress" {...swap} className="text-slate-500 dark:text-slate-400">
              <span className="font-extrabold text-slate-900 dark:text-white">
                ₹{FREE_DELIVERY_THRESHOLD - subtotal}
              </span>{" "}
              away from free delivery
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <div className="relative mt-4 mb-5 h-1 rounded-full bg-slate-100 dark:bg-slate-800">
        <motion.div
          className={`absolute inset-y-0 left-0 rounded-full transition-colors duration-300 ${
            unlocked ? "bg-emerald-500" : "bg-[#FF5B00]"
          }`}
          initial={false}
          animate={{ width: `${percent}%` }}
          transition={transition}
        />
        <div className="absolute inset-y-0 left-3 right-3">
          <motion.div
            className="absolute grid h-6 w-6 place-items-center rounded-full bg-white shadow-sm ring-1 ring-slate-200 dark:bg-[#161B26] dark:ring-slate-700"
            // Centred on the line; the track is inset by half the dot so it never overhangs.
            style={{ top: -10, marginLeft: -12 }}
            initial={false}
            animate={{ left: `${percent}%` }}
            transition={transition}
          >
            <Bike
              className={`h-3.5 w-3.5 transition-colors duration-300 ${
                unlocked ? "text-emerald-500" : "text-[#FF5B00]"
              }`}
              strokeWidth={2.4}
            />
          </motion.div>
        </div>
      </div>
    </div>
  );
}
