import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, ChevronRight, Bike, Package, Clock, Shield } from "lucide-react";
import {
  showOrderLiveNotification,
  clearOrderLiveNotification,
  showOutForDeliveryNotification,
} from "../lib/notifications";
import { hapticLight, hapticMedium } from "../lib/haptics";
import { SPRING_SNAPPY, EASE_OUT } from "../lib/motion";
import { watchOrder, watchOrderTracking, retireFinishedOrder } from "../lib/db";
import { calculateDeliveryEta, computeOrderProgress } from "../lib/deliveryEta";
import { useStoredJson } from "../lib/useStoredJson";
import { useScrollChrome } from "../context/ScrollChromeContext";

const FINISHED_HOLD_MS = 6000;
const NAVBAR_ROUTES = ["/shop", "/order-again", "/categories"];

function stageIconFor(status) {
  const norm = String(status || "").toLowerCase();
  if (norm.includes("deliver")) return Check;
  if (norm.includes("way") || norm.includes("out") || norm.includes("rider") || norm.includes("dispatched")) return Bike;
  if (norm.includes("pack") || norm.includes("bag")) return Package;
  return Clock;
}

export const resolveOrderStatusDetails = (status, etaMinutes, riderName, activeOrder) => {
  const norm = String(status || "Placed").toLowerCase();

  if (norm.includes("deliver")) {
    return {
      headline: "Order delivered",
      subtitle: "Handed over safely",
      stage: "Delivered",
      progress: 1.0,
      accent: "#22C55E",
    };
  }
  if (norm.includes("cancel")) {
    return {
      headline: activeOrder?.rejectionReason ? "Order rejected by store" : "Order cancelled",
      subtitle: activeOrder?.rejectionReason ? `Reason: ${activeOrder.rejectionReason}` : "This order won't be delivered",
      stage: "Cancelled",
      progress: 1.0,
      accent: "#EF4444",
    };
  }
  if (norm.includes("way") || norm.includes("out") || norm.includes("rider") || norm.includes("dispatched")) {
    const etaText = !etaMinutes || etaMinutes <= 1 ? "Arriving now" : `Arriving in ${etaMinutes} mins`;
    return {
      headline: riderName ? `${riderName} is on the way` : "On the way to you",
      subtitle: `On time · ${etaText}`,
      stage: "Out for Delivery",
      progress: 0.75,
      accent: "#FF5B00",
    };
  }
  if (norm.includes("pack") || norm.includes("bag")) {
    const count = activeOrder?.items?.length;
    return {
      headline: "Packing your order",
      subtitle: count
        ? `Packing ${count} item${count > 1 ? "s" : ""} at hub`
        : "Items are being packed & sealed",
      stage: "Packed",
      progress: 0.45,
      accent: "#FF5B00",
    };
  }
  // Placed / Processing
  return {
    headline: "Order placed",
    subtitle: "Hub is picking fresh items",
    stage: "Placed",
    progress: 0.18,
    accent: "#FF5B00",
  };
};

export default function LiveOrderFloatingTracker() {
  const router = useRouter();
  const { isNavVisible } = useScrollChrome();

  if (router.pathname === "/orders" || router.pathname?.startsWith("/orders")) {
    return null;
  }

  const [etaMinutes, setEtaMinutes] = useState(null);
  const [progressPct, setProgressPct] = useState(18);
  const [orderStatus, setOrderStatus] = useState("Placed");
  const [riderName, setRiderName] = useState("");
  const [isDismissed, setIsDismissed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const check = () => setIsDesktop(window.innerWidth >= 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const activeOrder = useStoredJson("dashit_active_order", {
    events: ["dashit_orders_updated", "dashit_order_updated"],
  });

  const cart = useStoredJson("dashit_cart", {
    events: ["dashit_cart_updated"],
    fallback: [],
  });

  const hasCart = Array.isArray(cart) && cart.length > 0;
  const isNavPage = !isDesktop && NAVBAR_ROUTES.includes(router.pathname) && isNavVisible;

  const targetOrderId = activeOrder?.orderId || activeOrder?.id;

  const seedFromOrder = useCallback((parsed) => {
    const loc = parsed?.location || parsed?.userAddress || null;
    const seeded = parsed?.etaMinutes || calculateDeliveryEta(loc)?.etaMinutes || null;
    setEtaMinutes((prev) => prev ?? seeded);
  }, []);

  useEffect(() => {
    if (!targetOrderId) {
      clearOrderLiveNotification();
      return;
    }
    setOrderStatus((prev) => activeOrder.status || prev || "Placed");
    seedFromOrder(activeOrder);
    setIsDismissed(false);
  }, [targetOrderId, activeOrder, seedFromOrder]);

  const orderStatusNorm = String(orderStatus || activeOrder?.status || "").trim().toLowerCase();
  const isDelivered = orderStatusNorm.includes("deliver");
  const isCancelled = orderStatusNorm.includes("cancel");
  const isFinished = isDelivered || isCancelled;

  // Real-time synchronization via watchOrder & watchOrderTracking
  useEffect(() => {
    if (!targetOrderId) return;

    const unsubOrder = watchOrder(targetOrderId, (data) => {
      if (!data) return;
      if (data.status) {
        setOrderStatus(data.status);
        setProgressPct((prev) => Math.max(prev, computeOrderProgress({ status: data.status })));
        const stNorm = String(data.status || "").toLowerCase();
        if (stNorm.includes("deliver")) {
          setProgressPct(100);
          setEtaMinutes(0);
        }
        if (data.status === "Out for Delivery") {
          showOutForDeliveryNotification({
            orderId: targetOrderId,
            riderName: data.driverName || riderName,
            etaMinutes: etaMinutes,
          });
        }
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
      if (data.driverName) setRiderName(data.driverName);
      if (data.status) setOrderStatus(data.status);
    });

    return () => {
      if (typeof unsubOrder === "function") unsubOrder();
      if (typeof unsubTracking === "function") unsubTracking();
    };
  }, [targetOrderId, riderName, etaMinutes]);

  const statusDetails = resolveOrderStatusDetails(orderStatus, etaMinutes, riderName, activeOrder);

  // Background notifications
  useEffect(() => {
    if (!targetOrderId) return;
    showOrderLiveNotification({
      orderId: targetOrderId,
      storeName: activeOrder?.storeName || "DASHit Express Hub · Anantnag",
      headline: statusDetails.headline,
      subtitle: statusDetails.subtitle,
      etaMinutes: isDelivered ? 0 : etaMinutes || 0,
      progressPct: isDelivered ? 100 : progressPct,
      status: statusDetails.headline,
      riderName,
      isDelivered,
    });
  }, [
    targetOrderId,
    activeOrder?.storeName,
    statusDetails.headline,
    statusDetails.subtitle,
    etaMinutes,
    progressPct,
    riderName,
    isDelivered,
  ]);

  // Hold finished order briefly before retirement
  useEffect(() => {
    if (!targetOrderId || !isFinished) return undefined;
    const timer = setTimeout(() => {
      if (retireFinishedOrder(targetOrderId, orderStatus)) {
        clearOrderLiveNotification();
        setIsDismissed(true);
      }
    }, FINISHED_HOLD_MS);
    return () => clearTimeout(timer);
  }, [targetOrderId, isFinished, orderStatus]);

  if (!activeOrder || isDismissed) return null;

  const isCustomerPage = !["/xcyop", "/driver", "/login", "/orders", "/track"].includes(router.pathname) && !router.pathname.startsWith("/track");
  if (!isCustomerPage) return null;

  const StageIcon = stageIconFor(orderStatus);
  const otpCode = activeOrder.otp?.trim();
  const effectiveProgress = isDelivered ? 1 : Math.max(0.12, Math.min(1, progressPct / 100, statusDetails.progress));

  const handleOpenTracking = () => {
    hapticMedium();
    router.push(`/track?id=${targetOrderId}`);
  };

  const handleDismiss = (e) => {
    e.stopPropagation();
    hapticLight();
    if (isFinished) {
      retireFinishedOrder(targetOrderId, orderStatus);
      clearOrderLiveNotification();
    }
    setIsDismissed(true);
  };

  // Docking position:
  // Mobile with navbar: sits above navbar (+cart bar if visible)
  // Mobile without navbar: sits at bottom (+cart bar if visible)
  // Desktop: sits at bottom right
  let bottomY = 0;
  if (!isDesktop) {
    if (isNavPage) {
      bottomY = hasCart ? -132 : -72;
    } else {
      bottomY = hasCart ? -60 : 0;
    }
  }

  const radius = 17;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - effectiveProgress);

  return (
    <AnimatePresence>
      <motion.div
        key="dashit-order-status-pill"
        initial={{ y: 80, opacity: 0, scale: 0.92 }}
        animate={{
          y: bottomY,
          opacity: 1,
          scale: 1,
        }}
        exit={{ y: 80, opacity: 0, scale: 0.92 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="fixed left-0 right-0 md:left-auto md:right-8 z-[50] flex justify-center md:justify-end pointer-events-none px-3.5 sm:px-4"
        style={{
          bottom: "max(12px, calc(8px + env(safe-area-inset-bottom, 8px)))",
        }}
      >
        {/* Native Android / iOS Parity: OrderStatusPill */}
        <div
          onClick={handleOpenTracking}
          role="button"
          tabIndex={0}
          aria-label={`${statusDetails.headline}. ${statusDetails.subtitle}. Tap to open live tracking.`}
          className="pointer-events-auto w-full max-w-sm sm:max-w-md h-[58px] bg-[#15161A] text-white rounded-full px-3 py-1.5 shadow-[0_16px_36px_rgba(0,0,0,0.65)] border border-white/15 flex items-center justify-between gap-3 cursor-pointer select-none transition-transform active:scale-[0.98]"
        >
          {/* Left: Stage Icon with Circular Progress Ring */}
          <div className="relative w-[42px] h-[42px] flex items-center justify-center shrink-0">
            <svg className="w-[39px] h-[39px] -rotate-90 transform" viewBox="0 0 42 42">
              {/* Soft background track */}
              <circle
                cx="21"
                cy="21"
                r={radius}
                className="stroke-white/10"
                strokeWidth="3"
                fill="rgba(255, 255, 255, 0.04)"
              />
              {/* Dynamic filled progress arc with round caps */}
              <circle
                cx="21"
                cy="21"
                r={radius}
                stroke={statusDetails.accent}
                strokeWidth="3.2"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                fill="none"
                className="transition-all duration-700 ease-out"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-white">
              <StageIcon className="w-4 h-4 stroke-[2.4]" />
            </div>
          </div>

          {/* Center: Live Headline & Subtitle */}
          <div className="grow min-w-0 text-left">
            <h4 className="text-[14px] font-bold text-white tracking-tight leading-snug truncate">
              {statusDetails.headline}
            </h4>
            <div className="flex items-center gap-1.5 text-[11.5px] text-[#C7C7CC] truncate">
              {!isFinished && (
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] shrink-0 animate-pulse" />
              )}
              <span className="truncate">{statusDetails.subtitle}</span>
            </div>
          </div>

          {/* Right Side: OTP Badge, ETA or Actions */}
          <div className="flex items-center gap-2 shrink-0">
            {/* OTP Code Badge */}
            {otpCode && !isFinished && (
              <div
                className="bg-white/10 border border-white/15 rounded-xl px-2.5 py-1 text-center select-none"
                title="Delivery OTP"
              >
                <span className="block text-[8px] font-black uppercase text-[#C7C7CC] tracking-wider leading-none">
                  OTP
                </span>
                <span className="block font-mono text-[13px] font-black text-white tracking-widest leading-tight mt-0.5">
                  {otpCode}
                </span>
              </div>
            )}

            {/* Out For Delivery ETA Badge */}
            {orderStatus === "Out for Delivery" && etaMinutes !== null && (
              <div className="w-11 h-10 rounded-xl bg-[#FF5B00] text-white flex flex-col items-center justify-center shadow-sm select-none">
                <span className="text-[15px] font-black leading-none">{etaMinutes}</span>
                <span className="text-[8px] font-black tracking-wider uppercase leading-none mt-0.5">MIN</span>
              </div>
            )}

            {/* Dismiss Close Button (if finished) or Right Chevron */}
            {isFinished ? (
              <button
                type="button"
                onClick={handleDismiss}
                aria-label="Dismiss tracking pill"
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 active:scale-90 flex items-center justify-center text-[#C7C7CC] hover:text-white transition-all cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            ) : orderStatus !== "Out for Delivery" ? (
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-[#C7C7CC]">
                <ChevronRight className="w-4 h-4 stroke-[2.5]" />
              </div>
            ) : null}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
