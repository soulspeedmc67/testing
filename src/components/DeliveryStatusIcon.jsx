import { motion } from "framer-motion";
import { Package, Bike, Check, Clock } from "lucide-react";

/**
 * Animated live-delivery status mark supporting 3 distinct live modes:
 *   - "processing" → order placed, payment verified, sent to hub (animated spinner + pulsing clock)
 *   - "packing"    → items being picked and sealed in the bag at the hub (animated tamping parcel + tape sweep)
 *   - "riding"     → courier on the scooter heading to doorstep (animated bobbing bike + speed streak lines)
 *   - "delivered"  → order delivered at doorstep (emerald check)
 */

/** Maps an order status string to the mark it should show. */
export const statusToMark = (status = "") => {
  const s = String(status).toLowerCase();
  if (s.includes("delivered")) {
    return "delivered";
  }
  if (s.includes("way") || s.includes("delivery") || s.includes("scooter") || s.includes("rider") || s.includes("dispatched")) {
    return "riding";
  }
  if (s.includes("pack") || s.includes("bag")) {
    return "packing";
  }
  // Placed / Confirmed / Processing / Created
  return "processing";
};

const SIZES = {
  sm: { box: "w-7 h-7", icon: "w-3.5 h-3.5" },
  md: { box: "w-10 h-10", icon: "w-[22px] h-[22px]" },
  lg: { box: "w-11 h-11", icon: "w-6 h-6" },
};

export default function DeliveryStatusIcon({
  status = "packing",
  size = "sm",
  className = "",
  iconColor,
  bgColor,
}) {
  const mark = ["riding", "packing", "processing", "delivered"].includes(status)
    ? status
    : statusToMark(status);
  const s = SIZES[size] || SIZES.sm;
  const isDelivered = mark === "delivered";

  const resolvedIconColor = isDelivered
    ? "text-emerald-500"
    : iconColor || "text-[#FF5B00]";

  const resolvedBgColor = bgColor || "bg-white dark:bg-surface-raised";

  return (
    <span
      className={`relative inline-flex items-center justify-center ${s.box} rounded-full ${resolvedBgColor} ${resolvedIconColor} ${className}`}
    >
      {mark === "riding" ? (
        <Bike className={`${s.icon} stroke-[2.6]`} />
      ) : mark === "packing" ? (
        <Package className={`${s.icon} stroke-[2.6]`} />
      ) : mark === "processing" ? (
        <Clock className={`${s.icon} stroke-[2.6]`} />
      ) : (
        <Check className={`${s.icon} stroke-[2.8] text-emerald-500`} />
      )}
    </span>
  );
}

