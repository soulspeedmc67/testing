import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Home, Bike, Package, Clock } from "lucide-react";
import {
  showOrderLiveNotification,
  clearOrderLiveNotification,
  showOutForDeliveryNotification,
} from "../lib/notifications";
import { hapticLight, hapticMedium } from "../lib/haptics";
import DeliveryStatusIcon, { statusToMark } from "./DeliveryStatusIcon";
import { SPRING_SNAPPY, SPRING_SOFT, EASE_OUT } from "../lib/motion";
import { watchOrder, watchOrderTracking, retireFinishedOrder } from "../lib/db";
import { calculateDeliveryEta, computeOrderProgress } from "../lib/deliveryEta";
import { useStoredJson } from "../lib/useStoredJson";

/**
 * DASHit Live Order Activity Tracker.
 *
 * Supports two distinct presentations:
 *   1. Minimized Side Widget: Pinned to the side of the screen with animated 3-mode
 *      icons (Order Processing, Packing, Delivery Guy Riding).
 *   2. Full Expanded Order Popup: Rich stage rail, delivery OTP, and live map link.
 *
 * Route-Change Persistence:
 *   Once minimized or closed by the customer, the state is persisted in sessionStorage
 *   and will NEVER automatically pop open when switching between screens.
 */

const FINISHED_HOLD_MS = 20000;

const STAGES = [
  { key: "Placed", short: "Processing", caption: "Order confirmed at the hub" },
  { key: "Packed", short: "Packing", caption: "Your items are being bagged" },
  { key: "Out for Delivery", short: "On the way", caption: "Rider is heading to you" },
  { key: "Delivered", short: "Delivered", caption: "Handed over at your door" },
];

const advanceStatus = (prev, next) => {
  if (!next) return prev || "Placed";
  return next;
};

const stageIndexFor = (status) => {
  const idx = STAGES.findIndex((s) => s.key === status);
  if (idx >= 0) return idx;
  if (status === "Packing") return 1;
  return 0;
};

export const resolveOrderStatusDetails = (status, etaMinutes, riderName, activeOrder) => {
  const norm = String(status || "Placed").toLowerCase();

  if (norm.includes("deliver")) {
    return {
      headline: "Order delivered",
      subtitle: "Delivered at your doorstep",
      stage: "Delivered",
      progressWidth: "100%",
      badgeText: "Delivered",
    };
  }
  if (norm.includes("cancel")) {
    return {
      headline: "Order cancelled",
      subtitle: "This order has been cancelled",
      stage: "Cancelled",
      progressWidth: "0%",
      badgeText: "Cancelled",
    };
  }
  if (norm.includes("way") || norm.includes("out") || norm.includes("rider") || norm.includes("dispatched")) {
    const etaText = !etaMinutes || etaMinutes <= 1 ? "Arriving now" : `Arriving in ${etaMinutes} mins`;
    return {
      headline: riderName ? `${riderName} is on the way` : "On the way to you",
      subtitle: `On time | ${etaText}`,
      stage: "Out for Delivery",
      progressWidth: "75%",
      badgeText: "On time",
    };
  }
  if (norm.includes("pack") || norm.includes("bag")) {
    const count = activeOrder?.items?.length;
    return {
      headline: "Packing your order",
      subtitle: count
        ? `Packing ${count} item${count > 1 ? "s" : ""} at hub · On time`
        : "Items are packed & sealed · On time",
      stage: "Packed",
      progressWidth: "50%",
      badgeText: "On time",
    };
  }
  // Placed / Processing
  return {
    headline: "Order placed",
    subtitle: "Hub is picking fresh items · On time",
    stage: "Placed",
    progressWidth: "25%",
    badgeText: "Confirmed",
  };
};

export default function LiveOrderFloatingTracker() {
  const router = useRouter();
  if (router.pathname === "/orders" || router.pathname?.startsWith("/orders")) {
    return null;
  }
  const [isExpanded, setIsExpanded] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true); // Default to minimized side pill

  const [etaMinutes, setEtaMinutes] = useState(null);
  const [progressPct, setProgressPct] = useState(12);
  const [orderStatus, setOrderStatus] = useState("Placed");
  const [riderName, setRiderName] = useState("");
  const [distanceLabel, setDistanceLabel] = useState("");

  const liveRef = useRef({ etaMinutes: null, progressPct: 12, status: "Placed", riderName: "" });
  useEffect(() => {
    liveRef.current = { etaMinutes, progressPct, status: orderStatus, riderName };
  }, [etaMinutes, progressPct, orderStatus, riderName]);

  const stageIndex = stageIndexFor(orderStatus);
  const isDelivered = orderStatus === "Delivered";

  const seedFromOrder = useCallback((parsed) => {
    const loc = parsed?.location || parsed?.userAddress || null;
    const seeded = parsed?.etaMinutes || calculateDeliveryEta(loc)?.etaMinutes || null;
    setEtaMinutes((prev) => prev ?? seeded);
  }, []);

  const activeOrder = useStoredJson("dashit_active_order", {
    events: ["dashit_orders_updated", "dashit_order_updated"],
  });

  const initializedOrderRef = useRef(null);

  // Read minimized state from sessionStorage on mount or when order changes
  useEffect(() => {
    const orderId = activeOrder?.orderId || activeOrder?.id;
    if (!orderId) {
      clearOrderLiveNotification();
      return;
    }

    setOrderStatus((prev) => advanceStatus(prev, activeOrder.status));
    seedFromOrder(activeOrder);

    if (initializedOrderRef.current !== activeOrder.orderId) {
      initializedOrderRef.current = activeOrder.orderId;
      try {
        const stored = sessionStorage.getItem(`dashit_tracker_minimized_${activeOrder.orderId}`);
        if (stored !== null) {
          setIsMinimized(stored === "true");
        } else {
          const genericClosed = sessionStorage.getItem("dashit_tracker_closed");
          setIsMinimized(genericClosed === "true");
        }
      } catch (e) {}
    }
  }, [activeOrder, seedFromOrder]);

  const minimizeTracker = () => {
    hapticLight();
    setIsMinimized(true);
    setIsExpanded(false);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("dashit_tracker_closed", "true");
        if (activeOrder?.orderId) {
          sessionStorage.setItem(`dashit_tracker_minimized_${activeOrder.orderId}`, "true");
        }
      } catch (e) {}
      window.__dashit_tracker_minimized = true;
      window.dispatchEvent(
        new CustomEvent("dashit_tracker_minimized_changed", {
          detail: { isMinimized: true, hasOrder: true },
        })
      );
    }
  };

  const expandTracker = () => {
    hapticMedium();
    setIsMinimized(false);
    setIsExpanded(true);
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("dashit_tracker_closed", "false");
        if (activeOrder?.orderId) {
          sessionStorage.setItem(`dashit_tracker_minimized_${activeOrder.orderId}`, "false");
        }
      } catch (e) {}
      window.__dashit_tracker_minimized = false;
      window.dispatchEvent(
        new CustomEvent("dashit_tracker_minimized_changed", {
          detail: { isMinimized: false, hasOrder: true },
        })
      );
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      window.__dashit_tracker_minimized = isMinimized;
      window.dispatchEvent(
        new CustomEvent("dashit_tracker_minimized_changed", {
          detail: { isMinimized, hasOrder: Boolean(activeOrder?.orderId) },
        })
      );
    }
  }, [isMinimized, activeOrder?.orderId]);

  const statusDetails = resolveOrderStatusDetails(orderStatus, etaMinutes, riderName, activeOrder);

  useEffect(() => {
    if (!activeOrder?.orderId) return;
    showOrderLiveNotification({
      orderId: activeOrder.orderId,
      storeName: activeOrder.storeName || "DASHit Express Hub · Anantnag",
      headline: statusDetails.headline,
      subtitle: statusDetails.subtitle,
      etaMinutes: isDelivered ? 0 : etaMinutes || 0,
      progressPct: isDelivered ? 100 : progressPct,
      status: statusDetails.headline,
      riderName,
      isDelivered,
    });
  }, [
    activeOrder?.orderId,
    activeOrder?.storeName,
    statusDetails.headline,
    statusDetails.subtitle,
    etaMinutes,
    progressPct,
    riderName,
    isDelivered,
  ]);

  useEffect(() => {
    const orderId = activeOrder?.orderId;
    if (!orderId) return undefined;
    if (orderStatus !== "Delivered" && orderStatus !== "Cancelled") return undefined;

    const timer = setTimeout(() => {
      if (retireFinishedOrder(orderId, orderStatus)) {
        clearOrderLiveNotification();
      }
    }, FINISHED_HOLD_MS);
    return () => clearTimeout(timer);
  }, [activeOrder?.orderId, orderStatus]);

  // Customer pages where tracking should be alive — hide completely on /orders page
  const isCustomerPage = !["/xcyop", "/driver", "/login", "/orders"].includes(router.pathname);

  // Auto-collapse order popup after 10 seconds into the circular widget
  useEffect(() => {
    if (!isMinimized && isCustomerPage && activeOrder?.orderId) {
      const autoCollapseTimer = setTimeout(() => {
        minimizeTracker();
      }, 10000);
      return () => clearTimeout(autoCollapseTimer);
    }
  }, [isMinimized, isCustomerPage, activeOrder?.orderId]);

  const targetOrderId = activeOrder?.orderId || activeOrder?.id;

  useEffect(() => {
    if (!targetOrderId || !isCustomerPage) return;

    const unsubOrder = watchOrder(targetOrderId, (data) => {
      if (!data) return;
      if (data.status) {
        setOrderStatus((prev) => advanceStatus(prev, data.status));
        setProgressPct((prev) =>
          Math.max(prev, computeOrderProgress({ status: data.status }))
        );
        if (data.status === "Delivered") {
          setProgressPct(100);
          setEtaMinutes(0);
        }
        if (data.status === "Out for Delivery") {
          showOutForDeliveryNotification({
            orderId: targetOrderId,
            riderName: data.driverName || liveRef.current.riderName,
            etaMinutes: liveRef.current.etaMinutes,
          });
        }

        // Persist incoming status update back to localStorage and notify UI listeners
        try {
          const stored = localStorage.getItem("dashit_active_order");
          if (stored) {
            const parsed = JSON.parse(stored);
            if (String(parsed.orderId || parsed.id) === String(targetOrderId)) {
              const merged = { ...parsed, ...data };
              localStorage.setItem("dashit_active_order", JSON.stringify(merged));
              window.dispatchEvent(
                new CustomEvent("dashit_orders_updated", { detail: merged })
              );
              window.dispatchEvent(
                new CustomEvent("dashit_order_updated", { detail: merged })
              );
            }
          }
        } catch (e) {}
      }
      if (data.driverName) setRiderName(data.driverName);
    });

    const unsubTracking = watchOrderTracking(targetOrderId, (data) => {
      if (!data) return;
      if (Number(data.etaMinutes) >= 0 && data.etaMinutes !== null && data.etaMinutes !== undefined) {
        setEtaMinutes(Number(data.etaMinutes));
      }
      if (data.progress !== undefined) {
        setProgressPct(Number(data.progress) || 0);
      }
      if (data.distanceFormatted) setDistanceLabel(String(data.distanceFormatted));
      else if (data.distanceKm) setDistanceLabel(`${Number(data.distanceKm).toFixed(1)} km away`);
      if (data.driverName) setRiderName(data.driverName);
      if (data.status) setOrderStatus((prev) => advanceStatus(prev, data.status));
    });

    return () => {
      if (typeof unsubOrder === "function") unsubOrder();
      if (typeof unsubTracking === "function") unsubTracking();
    };
  }, [targetOrderId, isCustomerPage]);

  if (!activeOrder || !isCustomerPage) return null;

  const displayProgress = Math.min(
    100,
    Math.max(progressPct, computeOrderProgress({ status: orderStatus }))
  );

  const caption = isDelivered
    ? "Enjoy your order"
    : distanceLabel && orderStatus === "Out for Delivery"
    ? `${riderName || "Your rider"} · ${distanceLabel}`
    : STAGES[stageIndex]?.caption || "";

  const currentMark = isDelivered
    ? "delivered"
    : statusToMark(orderStatus);

  const modeCaption = currentMark === "riding"
    ? "On the Way"
    : currentMark === "packing"
    ? "Packing"
    : currentMark === "delivered"
    ? "Delivered"
    : "Processing";

  const openFullTracking = () => {
    hapticMedium();
    router.push(`/orders?id=${activeOrder?.orderId || ""}`);
  };

  const DISMISS_PX = 36;
  const handleDragEnd = (_, info) => {
    if (info.offset.y < -DISMISS_PX || info.velocity.y < -500) {
      minimizeTracker();
    }
  };

  return (
    <>
      <AnimatePresence initial={false} mode="wait">
        {isMinimized ? (
          /* MINIMIZED FLOATING CIRCLE WIDGET — docked beside bottom navbar */
          <motion.div
            key="dashit-bottom-docked-circle"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={SPRING_SNAPPY}
            className="fixed right-3.5 sm:right-5 z-[60] md:hidden pointer-events-auto select-none flex items-center justify-center"
            style={{
              bottom: "max(12px, calc(8px + env(safe-area-inset-bottom, 8px)))",
            }}
          >
            {/* Subtle animated ambient beacon ring behind circle */}
            <span className="absolute w-[44px] h-[44px] rounded-full bg-[#FF5B00]/35 animate-ping pointer-events-none" />

            <motion.button
              type="button"
              whileTap={{ scale: 0.92 }}
              onClick={expandTracker}
              aria-label={`Order status: ${statusDetails.headline}. Tap to view live order details.`}
              className="relative w-[50px] h-[50px] rounded-full bg-gradient-to-br from-[#FF6F1E] via-[#FF5B00] to-[#E24800] shadow-[0_6px_18px_rgba(255,91,0,0.45),0_2px_6px_rgba(0,0,0,0.22)] flex items-center justify-center cursor-pointer select-none transition-transform active:scale-95 ring-1 ring-inset ring-white/35"
            >
              <DeliveryStatusIcon
                status={currentMark}
                size="md"
                iconColor="text-[#061838]"
                bgColor="bg-transparent"
              />
            </motion.button>
          </motion.div>
        ) : (
          /* EXPANDED LIVE ACTIVITY POPUP — ZOMATO STYLE */
          <div
            key="dashit-zomato-tracker-container"
            className="fixed left-0 right-0 z-[250] flex justify-center px-4 pointer-events-none"
            style={{ top: "calc(env(safe-area-inset-top, 0px) + 12px)" }}
          >
            <motion.div
              key="dashit-zomato-card"
              initial={{ opacity: 0, scale: 0.95, y: -12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -12 }}
              transition={SPRING_SOFT}
              drag="y"
              dragSnapToOrigin
              dragElastic={0.25}
              onDragEnd={handleDragEnd}
              onClick={openFullTracking}
              className="pointer-events-auto w-full max-w-sm sm:max-w-md bg-[#16171B] border border-white/10 rounded-[26px] p-4.5 sm:p-5 shadow-[0_16px_40px_rgba(0,0,0,0.65)] cursor-pointer select-none touch-none"
            >
              {/* TOP ROW: Store name on left, brand + close on right */}
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-neutral-400 truncate max-w-[200px]">
                  {activeOrder?.storeName || "DASHit Express Hub · Anantnag"}
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-black italic text-[15px] sm:text-base tracking-tight text-white">
                    dash<span className="text-[#FF5B00]">it</span>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      minimizeTracker();
                    }}
                    title="Collapse to circle"
                    aria-label="Collapse to circle"
                    className="w-6 h-6 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center text-neutral-300 hover:text-white transition-all ml-1 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5 stroke-[2.5]" />
                  </button>
                </div>
              </div>

              {/* HEADLINE: Actual dynamic real-time status */}
              <h3 className="text-[20px] sm:text-[22px] font-bold text-white tracking-tight leading-snug mt-2">
                {statusDetails.headline}
              </h3>

              {/* SUBTITLE: Actual dynamic subtitle details */}
              <div className="flex items-center gap-2 mt-1 text-[13px]">
                <span className="text-[#22C55E] font-semibold">{statusDetails.badgeText}</span>
                <span className="text-neutral-500 font-light">|</span>
                <span className="text-neutral-300 font-medium">
                  {statusDetails.subtitle}
                </span>
              </div>

              {/* ZOMATO-STYLE PROGRESS TIMELINE */}
              <div className="mt-4 mb-0.5 relative flex items-center w-full">
                <div className="relative w-full flex items-center">
                  {/* Completed path (solid white bar) */}
                  <motion.div
                    className="h-[3.5px] bg-white rounded-l-full shrink-0"
                    initial={{ width: "25%" }}
                    animate={{
                      width: statusDetails.progressWidth,
                    }}
                    transition={{ duration: 0.6, ease: EASE_OUT }}
                  />

                  {/* Current Status Avatar Marker */}
                  {!isDelivered && (
                    <div className="w-7 h-7 rounded-full bg-white text-[#061838] shadow-md flex items-center justify-center shrink-0 -mx-1 z-10">
                      {orderStatus === "Out for Delivery" ? (
                        <img src="/rider/rider_moving.png" alt="Rider" className="w-4 h-4 object-contain" />
                      ) : orderStatus === "Packed" || orderStatus === "Packing" ? (
                        <Package className="w-3.5 h-3.5 stroke-[2.4]" />
                      ) : (
                        <Clock className="w-3.5 h-3.5 stroke-[2.4]" />
                      )}
                    </div>
                  )}

                  {/* Remaining path (dashed gray line) */}
                  {!isDelivered && (
                    <div className="flex-1 border-t-[2.5px] border-dashed border-neutral-600 my-auto" />
                  )}

                  {/* Destination Home Marker at the far right end */}
                  <div
                    className={`w-7 h-7 rounded-full shadow-md flex items-center justify-center shrink-0 z-10 ${
                      isDelivered
                        ? "bg-[#22C55E] text-white"
                        : "bg-white text-[#061838]"
                    }`}
                  >
                    {isDelivered ? (
                      <Check className="w-4 h-4 stroke-[3]" />
                    ) : (
                      <Home className="w-3.5 h-3.5 stroke-[2.5]" />
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
