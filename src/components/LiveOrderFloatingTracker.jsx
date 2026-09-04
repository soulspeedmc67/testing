import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence, useMotionValue } from "framer-motion";
import { Home, ChevronRight } from "lucide-react";
import { showOrderLiveNotification, clearOrderLiveNotification } from "../lib/notifications";
import { hapticLight, hapticMedium } from "../lib/haptics";
import { DashitProgressBadge } from "./DashitAnimatedLogo";
import DeliveryStatusIcon, { statusToMark } from "./DeliveryStatusIcon";
import { SPRING_SNAPPY, SPRING_SOFT, EASE_OUT } from "../lib/motion";
import io from "socket.io-client";

/** Edge rail bounds — keeps the docked semicircle clear of the status bar and
 *  the FloatingCartBar / BottomNav dock at the bottom of the screen. */
const RAIL_MIN_Y = 80;
const RAIL_BOTTOM_GAP = 120;

const clampRailY = (y) => {
  if (typeof window === "undefined") return y;
  const max = window.innerHeight - RAIL_BOTTOM_GAP;
  return Math.min(Math.max(y, RAIL_MIN_Y), Math.max(RAIL_MIN_Y, max));
};

export default function LiveOrderFloatingTracker() {
  const router = useRouter();
  const [activeOrder, setActiveOrder] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [dockSide, setDockSide] = useState("right"); // "right" or "left"
  const [viewportH, setViewportH] = useState(812);
  /**
   * Absolute Y of the docked puck, in viewport pixels.
   *
   * This is the SINGLE source of truth for its vertical position — the element
   * is anchored at `top: 0` and moved purely by this transform. Do not also set
   * a CSS `top`: Framer owns this value during a drag and re-applies it on the
   * elastic settle, so a CSS offset would double-count and walk the puck
   * off-screen.
   */
  const railY = useMotionValue(220);
  const [etaMinutes, setEtaMinutes] = useState(7);
  const [progressPct, setProgressPct] = useState(32);
  const [statusLabel, setStatusLabel] = useState("Preparing your fresh order");
  const [riderName, setRiderName] = useState("Tariq Ahmad");

  /* Track viewport height so the rail's lower bound follows rotation, resize and
     the virtual keyboard — matching the dock policy of FloatingCartBar. */
  useEffect(() => {
    if (typeof window === "undefined") return;
    const syncViewport = () => {
      const h = window.visualViewport?.height || window.innerHeight;
      setViewportH(h);
      railY.set(Math.min(railY.get(), Math.max(RAIL_MIN_Y, h - RAIL_BOTTOM_GAP)));
    };
    syncViewport();
    window.addEventListener("resize", syncViewport);
    window.visualViewport?.addEventListener("resize", syncViewport);
    return () => {
      window.removeEventListener("resize", syncViewport);
      window.visualViewport?.removeEventListener("resize", syncViewport);
    };
  }, []);

  useEffect(() => {
    const checkOrder = () => {
      try {
        const active = localStorage.getItem("dashit_active_order");
        if (active) {
          const parsed = JSON.parse(active);
          setActiveOrder(parsed);

          if (parsed.status === "Delivered") {
            setStatusLabel("Order Delivered!");
            setProgressPct(100);
            setEtaMinutes(0);
          } else if (parsed.status === "Out for Delivery") {
            setStatusLabel("On the way on Scooter");
            setProgressPct((p) => Math.max(55, p));
          } else {
            setStatusLabel("Packing at Dashit Central Hub");
            setProgressPct(28);
          }

          showOrderLiveNotification({
            orderId: parsed.orderId,
            etaMinutes: parsed.status === "Delivered" ? 0 : etaMinutes,
            progressPct: parsed.status === "Delivered" ? 100 : progressPct,
            status: parsed.status === "Delivered" ? "Delivered" : statusLabel,
            riderName,
          });
        } else {
          setActiveOrder(null);
          clearOrderLiveNotification();
        }
      } catch (e) {}
    };

    checkOrder();
    const interval = setInterval(checkOrder, 3000);
    return () => clearInterval(interval);
  }, [etaMinutes, progressPct, statusLabel, riderName]);

  // Real-time socket listener for driver movement and status
  useEffect(() => {
    let socket;
    try {
      socket = io("http://localhost:3000");
      socket.on("connect", () => {
        if (activeOrder?.orderId) {
          socket.emit("join_order", activeOrder.orderId);
        }
      });

      socket.on("driver_location_update", (data) => {
        if (data.eta !== undefined) setEtaMinutes(data.eta);
        if (data.progress !== undefined) setProgressPct(data.progress);
        if (data.status) {
          setStatusLabel(data.status);
          try {
            const raw = localStorage.getItem("dashit_active_order");
            if (raw) {
              const ord = JSON.parse(raw);
              ord.status = data.status;
              localStorage.setItem("dashit_active_order", JSON.stringify(ord));
            }
          } catch (e) {}
        }
        if (data.driverName) setRiderName(data.driverName);
      });
    } catch (e) {}

    return () => {
      if (socket) socket.disconnect();
    };
  }, [activeOrder?.orderId]);

  // Hide completely on checkout, full order tracking page, driver console, login, exclusive story deck, admin
  const isHiddenPage =
    router.pathname === "/orders" ||
    router.pathname === "/checkout" ||
    router.pathname === "/driver" ||
    router.pathname === "/login" ||
    router.pathname === "/confirm-location" ||
    router.pathname === "/admin";

  if (!activeOrder || isHiddenPage) return null;

  /**
   * Omnidirectional dismissal: a flick or drag in ANY direction shrinks the card
   * into the edge semicircle. The nearest horizontal border wins, and the dock
   * anchors at the release Y so the puck lands where the finger left it.
   */
  const handleDragEnd = (_, info) => {
    const DISTANCE = 48;
    const VELOCITY = 380;

    const travelled = Math.hypot(info.offset.x, info.offset.y);
    const flicked = Math.hypot(info.velocity.x, info.velocity.y);
    if (travelled < DISTANCE && flicked < VELOCITY) return; // snap back

    hapticLight();
    const releaseX =
      typeof info.point?.x === "number" ? info.point.x : window.innerWidth / 2;
    const releaseY =
      typeof info.point?.y === "number" ? info.point.y : RAIL_MIN_Y * 2;

    setDockSide(releaseX > window.innerWidth / 2 ? "right" : "left");
    railY.set(clampRailY(releaseY));
    setIsMinimized(true);
  };

  /** Safety clamp after a rail drag, in case constraints were bypassed. */
  const handleRailDragEnd = () => {
    railY.set(clampRailY(railY.get()));
  };

  const handleExpand = () => {
    hapticMedium();
    setIsMinimized(false);
  };

  return (
    <AnimatePresence initial={false}>
      {isMinimized ? (
        /* DOCKED EDGE SEMICIRCLE — flush at 90° against the nearest border */
        <motion.div
          key="dashit-edge-dock"
          initial={{ x: dockSide === "right" ? 60 : -60, opacity: 0, scale: 0.6 }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{ x: dockSide === "right" ? 60 : -60, opacity: 0, scale: 0.6 }}
          transition={SPRING_SNAPPY}
          drag="y"
          dragMomentum={false}
          dragElastic={0.06}
          /* Absolute rail bounds — `y` is the viewport Y, so these are static:
             never above RAIL_MIN_Y, never below the cart-dock keep-out zone. */
          dragConstraints={{
            top: RAIL_MIN_Y,
            bottom: Math.max(RAIL_MIN_Y, viewportH - RAIL_BOTTOM_GAP),
          }}
          onDragEnd={handleRailDragEnd}
          whileTap={{ scale: 0.93 }}
          onClick={handleExpand}
          aria-label={`Live order, ${etaMinutes} minutes away. Tap to expand.`}
          className={`fixed top-0 z-[250] cursor-pointer select-none touch-none ${
            dockSide === "right" ? "right-0" : "left-0"
          }`}
          style={{ y: railY }}
        >
          <div
            className={`relative flex flex-col items-center justify-center w-[52px] h-[76px] bg-neutral-950/95 backdrop-blur-xl border border-neutral-800 shadow-[0_12px_34px_rgba(0,0,0,0.55)] ${
              dockSide === "right"
                ? "rounded-l-[26px] border-r-0 pl-1"
                : "rounded-r-[26px] border-l-0 pr-1"
            }`}
          >
            {/* Grab rail — signals the puck can be slid along the edge */}
            <span
              className={`absolute top-1/2 -translate-y-1/2 w-[3px] h-6 rounded-full bg-white/15 ${
                dockSide === "right" ? "right-1.5" : "left-1.5"
              }`}
            />

            <div className={`flex flex-col items-center ${dockSide === "right" ? "pr-1.5" : "pl-1.5"}`}>
              {/* Animated status mark — packing at the hub, or rider en route */}
              <DeliveryStatusIcon status={statusToMark(statusLabel)} size="md" />

              {/* ETA with a quiet unit, so the number carries the weight */}
              <span className="mt-1.5 flex items-baseline text-white leading-none">
                <span className="font-black text-[13px] tabular-nums tracking-tight">
                  {etaMinutes > 0 ? etaMinutes : "•"}
                </span>
                <span className="text-[9px] font-bold text-white/45 ml-[1px]">
                  {etaMinutes > 0 ? "m" : ""}
                </span>
              </span>
            </div>
          </div>
        </motion.div>
      ) : (
        /* EXPANDED OBSIDIAN CARD — beacon, status, ETA, route line. Nothing else. */
        <motion.div
          key="dashit-tracker-full"
          initial={{ scale: 0.94, opacity: 0, y: -10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.7, opacity: 0 }}
          transition={SPRING_SOFT}
          drag
          dragSnapToOrigin
          dragElastic={0.35}
          onDragEnd={handleDragEnd}
          className="fixed left-3.5 right-3.5 z-[250] max-w-md mx-auto pointer-events-auto touch-none"
          style={{ top: "max(46px, calc(env(safe-area-inset-top, 0px) + 14px))" }}
        >
          <div className="bg-neutral-950/95 backdrop-blur-2xl text-white rounded-[26px] px-4 py-4 shadow-[0_24px_60px_rgba(0,0,0,0.85)] border border-neutral-800 overflow-hidden select-none">
            <div
              onClick={() => {
                hapticMedium();
                router.push(`/orders?id=${activeOrder?.orderId || ""}`);
              }}
              className="cursor-pointer active:opacity-90 transition-opacity"
            >
              {/* STATUS + ETA */}
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center space-x-2.5">
                    {/* Animated status mark — packing at the hub, or rider en route */}
                    <DeliveryStatusIcon status={statusToMark(statusLabel)} size="md" />
                    <h2 className="text-[16px] font-black text-white tracking-tight leading-tight truncate">
                      {statusLabel}
                    </h2>
                  </div>

                  {/* Arrival countdown */}
                  <p className="text-[12.5px] font-bold text-slate-400 mt-1.5 ml-[46px]">
                    {etaMinutes > 0 ? (
                      <>
                        Arriving in{" "}
                        <span className="text-[#FF5B00] font-black">{etaMinutes} min</span>
                      </>
                    ) : (
                      <span className="text-[#FF5B00] font-black">Arriving now</span>
                    )}
                  </p>
                </div>

                <div className="w-8 h-8 rounded-full bg-white/[0.08] flex items-center justify-center text-white shrink-0 border border-white/10">
                  <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                </div>
              </div>

              {/* MINIMAL ROUTE PROGRESS LINE */}
              <div className="relative mt-4 h-6 flex items-center">
                {/* Rail */}
                <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 h-[2px] rounded-full bg-neutral-800" />

                {/* Filled beam */}
                <motion.div
                  className="absolute left-0 top-1/2 -translate-y-1/2 h-[2px] bg-[#FF5B00] rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.9, ease: EASE_OUT }}
                />

                {/* Travelling badge */}
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
                  initial={{ left: "0%" }}
                  animate={{ left: `${progressPct}%` }}
                  transition={{ duration: 0.9, ease: EASE_OUT }}
                >
                  <DashitProgressBadge size="sm" />
                </motion.div>

                {/* Destination */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-neutral-900 border border-neutral-700 flex items-center justify-center">
                  <Home className="w-2.5 h-2.5 stroke-[2.8] text-slate-400" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
