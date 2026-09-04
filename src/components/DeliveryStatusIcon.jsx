import { motion } from "framer-motion";
import { Package, Bike } from "lucide-react";

/**
 * Animated live-delivery status mark.
 *
 * Replaces the old blinking dot with a contained circle that actually says what
 * is happening to the order:
 *   - "packing"  → the parcel is being tamped and sealed at the hub
 *   - "riding"   → the rider is on the way
 *
 * Both loops animate transform/opacity only (GPU-composited, WebView-safe) and
 * are inherited-motion aware: the app wraps everything in
 * <MotionConfig reducedMotion="user">, so these stop for users who ask the OS
 * to reduce motion.
 */

/** Maps an order status string to the mark it should show. */
export const statusToMark = (status = "") => {
  const s = String(status).toLowerCase();
  if (s.includes("way") || s.includes("delivery") || s.includes("scooter") || s.includes("rider")) {
    return "riding";
  }
  return "packing";
};

const SIZES = {
  sm: { box: "w-7 h-7", icon: "w-3.5 h-3.5" },
  md: { box: "w-9 h-9", icon: "w-[18px] h-[18px]" },
};

export default function DeliveryStatusIcon({ status = "packing", size = "sm", className = "" }) {
  const mark = status === "riding" || status === "packing" ? status : statusToMark(status);
  const s = SIZES[size] || SIZES.sm;

  return (
    <span className={`relative inline-flex ${s.box} shrink-0 ${className}`}>
      {/* Soft breathing halo — replaces the hard ping of the old dot */}
      <motion.span
        className="absolute inset-0 rounded-full bg-[#FF5B00]/30"
        animate={{ scale: [1, 1.35, 1], opacity: [0.55, 0, 0.55] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }}
      />

      {/* Contained circle — white face, orange mark */}
      <span className="relative inline-flex items-center justify-center w-full h-full rounded-full bg-white text-[#FF5B00] overflow-hidden ring-1 ring-black/5 shadow-[0_2px_10px_rgba(0,0,0,0.28)]">
        {mark === "riding" ? (
          <>
            {/* Speed lines streaking past the rider */}
            {[0, 1].map((i) => (
              <motion.span
                key={i}
                className="absolute h-[1.5px] rounded-full bg-[#FF5B00]/55"
                style={{ width: 6, top: `${38 + i * 22}%` }}
                animate={{ x: [8, -10], opacity: [0, 0.9, 0] }}
                transition={{
                  duration: 0.75,
                  repeat: Infinity,
                  ease: "linear",
                  delay: i * 0.28,
                }}
              />
            ))}

            {/* Rider bobbing over the road */}
            <motion.span
              className="relative"
              animate={{ x: [-0.8, 0.8, -0.8], y: [0, -1.1, 0], rotate: [-2, 1.5, -2] }}
              transition={{ duration: 0.9, repeat: Infinity, ease: "easeInOut" }}
            >
              <Bike className={`${s.icon} stroke-[2.6]`} />
            </motion.span>
          </>
        ) : (
          <>
            {/* Seal sweep across the parcel */}
            <motion.span
              className="absolute inset-x-0 h-[2px] bg-[#FF5B00]/30"
              animate={{ y: [-10, 10], opacity: [0, 0.8, 0] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            />

            {/* Parcel being tamped down and sealed */}
            <motion.span
              className="relative"
              animate={{ y: [0, -1.6, 0], scale: [1, 0.94, 1], rotate: [0, -3, 0, 3, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <Package className={`${s.icon} stroke-[2.6]`} />
            </motion.span>
          </>
        )}
      </span>
    </span>
  );
}
