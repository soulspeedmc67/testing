import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronRight, KeyRound, Check } from "lucide-react";
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
 * DASHit Live Activity.
 *
 * Modelled on an iOS live activity (the way Zomato's delivery card behaves on
 * iPhone): it lives at the TOP of the screen, over the app chrome, and has two
 * sizes — a compact capsule with the arrival time, and an expanded card with the
 * full stage rail. It is not a bottom sheet; a live activity is a notification,
 * and notifications belong at the top edge.
 *
 * Every number it shows comes from the rider's telemetry, which is rewritten on
 * a fixed cadence while a rider is assigned — the ETA and the progress bar move
 * with the scooter, they are not interpolated from a timer.
 */

/** Order lifecycle, in the order the customer experiences it. */
/* How long the finished activity stays on screen before it retires itself. Long
   enough for the customer to register that the order arrived, short enough that
   it is gone by their next visit to the shop. */
const FINISHED_HOLD_MS = 20000;

const STAGES = [
  { key: "Placed", short: "Placed", caption: "Order confirmed at the hub" },
  { key: "Packed", short: "Packing", caption: "Your items are being bagged" },
  { key: "Out for Delivery", short: "On the way", caption: "Rider is heading to you" },
  { key: "Delivered", short: "Delivered", caption: "Handed over at your door" },
];

/**
 * Status changes only ever move forward, except for the two terminal states.
 *
 * The widget reads status from two places — the order document in Firestore and
 * the copy in localStorage — and they can disagree for a moment. Taking the
 * furthest-along of the two keeps the stage rail from flicking backwards while
 * still letting a locally written change through, which matters when Firestore
 * is unreachable and localStorage is the only source the app has.
 */
const advanceStatus = (prev, next) => {
  if (!next) return prev;
  if (next === "Delivered" || next === "Cancelled") return next;
  if (prev === "Delivered" || prev === "Cancelled") return prev;
  return stageIndexFor(next) > stageIndexFor(prev) ? next : prev;
};

const stageIndexFor = (status) => {
  const idx = STAGES.findIndex((s) => s.key === status);
  if (idx >= 0) return idx;
  if (status === "Packing") return 1; // legacy alias
  return 0;
};

/** Headline copy for each stage — short enough to survive the compact capsule. */
const titleFor = (status, etaMinutes) => {
  if (status === "Delivered") return "Delivered";
  if (status === "Cancelled") return "Order cancelled";
  if (status === "Out for Delivery") {
    if (!etaMinutes || etaMinutes <= 1) return "Arriving now";
    return `Arriving in ${etaMinutes} min`;
  }
  return "Packing your order";
};

export default function LiveOrderFloatingTracker() {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);
  /* Pulled up out of the way by the customer. The capsule leaves a grab handle
     behind so a tucked activity is always recoverable — a live order must never
     become unreachable. */
  const [isTucked, setIsTucked] = useState(false);

  const [etaMinutes, setEtaMinutes] = useState(null);
  const [progressPct, setProgressPct] = useState(12);
  const [orderStatus, setOrderStatus] = useState("Placed");
  const [riderName, setRiderName] = useState("");
  const [distanceLabel, setDistanceLabel] = useState("");

  /* Latest figures, readable from inside the Firestore listener below without
     listing them as dependencies — naming them there would tear the snapshot
     subscription down and rebuild it on every ETA tick. */
  const liveRef = useRef({ etaMinutes: null, progressPct: 12, status: "Placed", riderName: "" });
  useEffect(() => {
    liveRef.current = { etaMinutes, progressPct, status: orderStatus, riderName };
  }, [etaMinutes, progressPct, orderStatus, riderName]);

  const stageIndex = stageIndexFor(orderStatus);
  const isDelivered = orderStatus === "Delivered";

  /** Fallback ETA from the customer's own address, used until the rider's first
      live fix lands. */
  const seedFromOrder = useCallback((parsed) => {
    const loc = parsed?.location || parsed?.userAddress || null;
    const seeded = parsed?.etaMinutes || calculateDeliveryEta(loc)?.etaMinutes || null;
    setEtaMinutes((prev) => prev ?? seeded);
  }, []);

  /* Active order presence — localStorage is the offline-capable source of truth.
     The shared hook republishes only when the stored order really changes, so
     this component is no longer re-rendered every three seconds for nothing. */
  const activeOrder = useStoredJson("dashit_active_order", {
    events: ["dashit_orders_updated"],
  });

  useEffect(() => {
    if (!activeOrder) {
      clearOrderLiveNotification();
      return;
    }
    setOrderStatus((prev) => advanceStatus(prev, activeOrder.status));
    seedFromOrder(activeOrder);
  }, [activeOrder, seedFromOrder]);

  /* Keep the OS notification in step with the live figures rather than with a
     polling tick — it used to be rewritten every three seconds regardless. */
  useEffect(() => {
    if (!activeOrder?.orderId) return;
    showOrderLiveNotification({
      orderId: activeOrder.orderId,
      etaMinutes: isDelivered ? 0 : etaMinutes || 0,
      progressPct: isDelivered ? 100 : progressPct,
      status: isDelivered ? "Delivered" : titleFor(orderStatus, etaMinutes),
      riderName,
    });
  }, [activeOrder?.orderId, orderStatus, etaMinutes, progressPct, riderName, isDelivered]);

  /* A delivered order is not an active one. It lingers briefly so the customer
     sees the confirmation, then moves to history and the capsule leaves. */
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

  // Only show on the shopping page (/shop) as explicitly requested by user
  const isShoppingPage = router.pathname === "/shop";

  /* Real-time Firestore listeners for driver movement and status.
     Skipped when not on /shop — this component renders null elsewhere, but hooks
     always run regardless of an early return further down, so without this
     guard a stale localStorage order would still open Firestore listeners. */
  useEffect(() => {
    if (!activeOrder?.orderId || !isShoppingPage) return;

    const unsubOrder = watchOrder(activeOrder.orderId, (data) => {
      if (!data) return;
      if (data.status) {
        setOrderStatus((prev) => advanceStatus(prev, data.status));
        /* Stage floors only — the fine-grained value comes from the rider's
           distance-based progress below, so this never drags the bar back. */
        setProgressPct((prev) =>
          Math.max(prev, computeOrderProgress({ status: data.status }))
        );
        if (data.status === "Delivered") {
          setProgressPct(100);
          setEtaMinutes(0);
        }
        if (data.status === "Out for Delivery") {
          /* The ongoing tracking notification is silent by design, so this is
             the one moment the customer actually gets alerted. It de-dupes on
             the order id internally — this listener re-fires on every snapshot. */
          showOutForDeliveryNotification({
            orderId: activeOrder.orderId,
            riderName: data.driverName || liveRef.current.riderName,
            etaMinutes: liveRef.current.etaMinutes,
          });
        }
      }
      if (data.driverName) setRiderName(data.driverName);
    });

    const unsubTracking = watchOrderTracking(activeOrder.orderId, (data) => {
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
  }, [activeOrder?.orderId, isShoppingPage]);

  if (!activeOrder || !isShoppingPage) return null;

  /* Never show less than the stage itself guarantees: with Firestore
     unavailable (offline, or a local-only order) no telemetry arrives, and the
     bar would otherwise sit at the "Placed" sliver while the rail says the rider
     is on the way. */
  const displayProgress = Math.min(
    100,
    Math.max(progressPct, computeOrderProgress({ status: orderStatus }))
  );

  const title = titleFor(orderStatus, etaMinutes);
  const caption = isDelivered
    ? "Enjoy your order"
    : distanceLabel && orderStatus === "Out for Delivery"
    ? `${riderName || "Your rider"} · ${distanceLabel}`
    : STAGES[stageIndex]?.caption || "";

  const openFullTracking = () => {
    hapticMedium();
    router.push(`/orders?id=${activeOrder?.orderId || ""}`);
  };

  /* A drag that clears this threshold upward tucks the activity away; the same
     gesture downward on the handle brings it back. */
  const DISMISS_PX = 36;

  const handleDragEnd = (_, info) => {
    if (info.offset.y < -DISMISS_PX || info.velocity.y < -500) {
      hapticLight();
      setIsExpanded(false);
      setIsTucked(true);
    }
  };

  return (
    <div
      className="fixed left-0 right-0 z-[250] flex justify-center px-3 sm:px-4 pointer-events-none"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 8px)" }}
    >
      <AnimatePresence initial={false} mode="wait">
        {isTucked ? (
          /* TUCKED — a grab handle, the only trace left on screen */
          <motion.button
            key="dashit-activity-handle"
            type="button"
            initial={{ y: -16, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -16, opacity: 0 }}
            transition={SPRING_SNAPPY}
            onClick={() => {
              hapticLight();
              setIsTucked(false);
            }}
            aria-label="Show live order status"
            /* The pill stays visually small, but the padding (cancelled out by
               the negative margin) gives it a ~44px tap target: this handle is
               the only way back to a live order, so it must not be fiddly. */
            className="pointer-events-auto flex items-center justify-center px-2 py-2 -mx-2 -my-2"
          >
            <span className="flex items-center gap-2 h-7 px-3 rounded-full bg-neutral-950/90 backdrop-blur-xl border border-neutral-800 shadow-[0_8px_24px_rgba(0,0,0,0.45)]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#FF5B00]" />
              <span className="text-[11px] font-bold text-white/80 tabular-nums">
                {isDelivered ? "Delivered" : etaMinutes > 0 ? `${etaMinutes} min` : "Live"}
              </span>
            </span>
          </motion.button>
        ) : (
          /* LIVE ACTIVITY — compact capsule that grows into the full card.
             Deliberately no `layout` prop: the body animates its own height, and
             a layout animation here fought the drag transform and left the
             capsule parked above the safe area. */
          <motion.div
            key="dashit-activity"
            /* Entry animates opacity and scale only. `y` belongs to the drag
               gesture on this element — animating it here left the transform
               parked at the initial offset, which is what pushed the expanded
               card's title above the top of the screen. */
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={SPRING_SOFT}
            drag="y"
            dragSnapToOrigin
            /* No dragConstraints: a zero-height constraint box is re-resolved
               every time the card grows, and Framer was re-applying it as a
               standing -28px offset — the expanded card sat with its title
               clipped above the safe area. Snap-to-origin alone returns it. */
            dragElastic={0.25}
            onDragEnd={handleDragEnd}
            className="pointer-events-auto w-full max-w-md touch-none select-none"
          >
            <div className="overflow-hidden rounded-[24px] bg-neutral-950/95 backdrop-blur-2xl border border-neutral-800 shadow-[0_18px_48px_rgba(0,0,0,0.6)]">
              {/* COMPACT ROW — always visible, tap to toggle the full card */}
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setIsExpanded((v) => !v);
                }}
                aria-expanded={isExpanded}
                aria-label={`${title}. Tap to ${isExpanded ? "collapse" : "expand"} order details.`}
                className="w-full flex items-center gap-3 px-3.5 py-3 text-left active:opacity-90 transition-opacity"
              >
                <DeliveryStatusIcon
                  status={isDelivered ? "packing" : statusToMark(orderStatus)}
                  size="md"
                />

                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-black text-white tracking-tight leading-tight truncate">
                    {title}
                  </span>
                  <span className="block text-[11.5px] font-semibold text-neutral-400 leading-tight truncate mt-0.5">
                    {caption}
                  </span>
                </span>

                <motion.span
                  animate={{ rotate: isExpanded ? 180 : 0 }}
                  transition={SPRING_SNAPPY}
                  className="w-7 h-7 rounded-full bg-white/[0.07] border border-white/10 flex items-center justify-center shrink-0"
                >
                  <ChevronDown className="w-4 h-4 text-white stroke-[2.5]" />
                </motion.span>
              </button>

              {/* HAIRLINE PROGRESS — the compact state's only chrome */}
              <div className="h-[2px] w-full bg-neutral-800">
                <motion.div
                  className={`h-full ${isDelivered ? "bg-emerald-400" : "bg-[#FF5B00]"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${displayProgress}%` }}
                  transition={{ duration: 0.8, ease: EASE_OUT }}
                />
              </div>

              {/* EXPANDED BODY */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    key="dashit-activity-body"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: EASE_OUT }}
                    className="overflow-hidden"
                  >
                    <div className="px-3.5 pt-3.5 pb-3.5">
                      {/* STAGE RAIL */}
                      <div className="relative">
                        {/* The track runs centre-to-centre between the first and
                            last markers — the stages sit in four equal columns,
                            so their centres are at 12.5% and 87.5%. */}
                        <div className="absolute left-[12.5%] right-[12.5%] top-[10px] h-[2px] bg-neutral-800 rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-[#FF5B00] rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${(stageIndex / (STAGES.length - 1)) * 100}%` }}
                            transition={{ duration: 0.6, ease: EASE_OUT }}
                          />
                        </div>

                        <ol className="relative grid grid-cols-4">
                          {STAGES.map((stage, i) => {
                            const done = i < stageIndex || isDelivered;
                            const current = i === stageIndex && !isDelivered;
                            return (
                              <li key={stage.key} className="flex flex-col items-center gap-1.5">
                                <span
                                  className={`w-[21px] h-[21px] rounded-full flex items-center justify-center border ${
                                    done
                                      ? "bg-[#FF5B00] border-[#FF5B00] text-white"
                                      : current
                                      ? "bg-neutral-950 border-[#FF5B00] text-[#FF5B00]"
                                      : "bg-neutral-950 border-neutral-700 text-neutral-600"
                                  }`}
                                >
                                  {done ? (
                                    <Check className="w-3 h-3 stroke-[3]" />
                                  ) : (
                                    <span
                                      className={`w-[7px] h-[7px] rounded-full ${
                                        current ? "bg-[#FF5B00]" : "bg-neutral-700"
                                      }`}
                                    />
                                  )}
                                </span>
                                <span
                                  className={`text-[9.5px] font-bold tracking-tight text-center leading-tight ${
                                    done || current ? "text-white" : "text-neutral-500"
                                  }`}
                                >
                                  {stage.short}
                                </span>
                              </li>
                            );
                          })}
                        </ol>
                      </div>

                      {/* DELIVERY OTP */}
                      {!isDelivered && (
                        <div className="mt-3.5 flex items-center justify-between gap-2 rounded-2xl bg-neutral-900 border border-neutral-800 p-3">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-8 h-8 rounded-xl bg-neutral-800 border border-neutral-700 text-neutral-300 flex items-center justify-center shrink-0">
                              <KeyRound className="w-4 h-4 stroke-[2]" />
                            </span>
                            <span className="min-w-0">
                              <span className="block text-[9.5px] font-bold uppercase tracking-wider text-neutral-400">
                                Delivery OTP
                              </span>
                              <span className="block text-[11px] text-neutral-300 font-medium truncate">
                                Share with the rider on arrival
                              </span>
                            </span>
                          </div>
                          <span className="shrink-0 rounded-xl bg-neutral-800 border border-neutral-700 px-3 py-1.5 font-mono text-base font-black tracking-[0.2em] text-white">
                            {activeOrder?.otp || "4821"}
                          </span>
                        </div>
                      )}

                      {/* FULL TRACKING */}
                      <button
                        type="button"
                        onClick={openFullTracking}
                        className="mt-2.5 w-full flex items-center justify-between gap-2 rounded-2xl bg-white/[0.06] border border-white/10 px-3.5 py-2.5 active:opacity-85 transition-opacity"
                      >
                        <span className="text-[12.5px] font-bold text-white">
                          Track live on map
                        </span>
                        <ChevronRight className="w-4 h-4 text-white/70 stroke-[2.5]" />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
