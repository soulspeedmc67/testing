import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { Home, Bike, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { showOrderLiveNotification, clearOrderLiveNotification } from "../lib/notifications";
import { hapticLight, hapticMedium } from "../lib/haptics";
import io from "socket.io-client";

export default function LiveOrderFloatingTracker() {
  const router = useRouter();
  const [activeOrder, setActiveOrder] = useState(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [dockSide, setDockSide] = useState("right"); // "right" or "left"
  const [etaMinutes, setEtaMinutes] = useState(7);
  const [progressPct, setProgressPct] = useState(32);
  const [statusLabel, setStatusLabel] = useState("Preparing your fresh order");
  const [riderName, setRiderName] = useState("Tariq Ahmad");

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
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5001";
      socket = io(socketUrl);

      if (activeOrder?.orderId) {
        socket.emit("join_order_room", activeOrder.orderId);
      }

      // Driver broadcasts live GPS
      socket.on("driver_location_changed", (data) => {
        if (data.driverName) setRiderName(data.driverName);
        setStatusLabel("On the way on Scooter");
        setProgressPct((prev) => {
          const next = Math.min(95, prev + 6);
          const remainingEta = Math.max(1, Math.round(7 * (1 - next / 100)));
          setEtaMinutes(remainingEta);

          showOrderLiveNotification({
            orderId: activeOrder?.orderId || "DASH-LIVE",
            etaMinutes: remainingEta,
            progressPct: next,
            status: "On the way on Scooter",
            riderName: data.driverName || "Tariq Ahmad",
          });
          return next;
        });
      });

      // Admin or Driver updates status
      socket.on("order_status_changed", (data) => {
        if (data.orderId === activeOrder?.orderId) {
          if (data.status === "Delivered") {
            setStatusLabel("Order Delivered!");
            setProgressPct(100);
            setEtaMinutes(0);
          } else if (data.status === "Out for Delivery") {
            setStatusLabel("On the way on Scooter");
            setProgressPct(60);
            setEtaMinutes(4);
          }
        }
      });
    } catch (e) {}

    return () => {
      if (socket) socket.disconnect();
    };
  }, [activeOrder?.orderId]);

  // Don't render on /orders, /checkout, or /confirm-location page
  if (
    !activeOrder ||
    router.pathname === "/orders" ||
    router.pathname === "/checkout" ||
    router.pathname === "/confirm-location"
  ) {
    return null;
  }

  // Handle horizontal swipe to minimize to side (MIUI Floating Style)
  const handleDragEnd = (_, info) => {
    const threshold = 40;
    const velocityThreshold = 180;
    if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
      hapticLight();
      setDockSide("right");
      setIsMinimized(true);
    } else if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
      hapticLight();
      setDockSide("left");
      setIsMinimized(true);
    }
  };

  return (
    <AnimatePresence mode="wait">
      {isMinimized ? (
        /* MIUI STYLE FLOATING EDGE TAB (Docked to screen side) */
        <motion.div
          key="miui-edge-tab"
          initial={{
            x: dockSide === "right" ? 80 : -80,
            opacity: 0,
            scale: 0.85,
          }}
          animate={{ x: 0, opacity: 1, scale: 1 }}
          exit={{
            x: dockSide === "right" ? 80 : -80,
            opacity: 0,
            scale: 0.85,
          }}
          transition={{ type: "spring", stiffness: 450, damping: 28 }}
          drag="y"
          dragConstraints={{ top: 80, bottom: 420 }}
          dragElastic={0.15}
          onClick={() => {
            hapticMedium();
            setIsMinimized(false);
          }}
          className={`fixed z-[250] cursor-pointer active:scale-95 transition-transform ${
            dockSide === "right" ? "right-0" : "left-0"
          }`}
          style={{ top: "45%" }}
        >
          <div
            className={`flex items-center space-x-2.5 bg-[#061838] text-white py-2.5 shadow-[0_12px_32px_rgba(6,24,56,0.5)] border border-amber-500/40 select-none ${
              dockSide === "right"
                ? "rounded-l-2xl pl-3.5 pr-2.5 border-r-0"
                : "rounded-r-2xl pl-2.5 pr-3.5 border-l-0"
            }`}
          >
            {dockSide === "left" && <ChevronRight className="w-3.5 h-3.5 text-amber-400" />}
            <div className="w-7 h-7 rounded-full bg-[#FF6B00] flex items-center justify-center shrink-0 shadow-xs ring-1 ring-white/30">
              <Bike className="w-4 h-4 text-white stroke-[2.8]" />
            </div>
            <div className="flex flex-col text-left">
              <span className="font-mono font-black text-xs text-white leading-tight">
                {etaMinutes > 0 ? `${etaMinutes}m` : "Ready"}
              </span>
              <span className="text-[8px] font-extrabold text-amber-400 uppercase tracking-wider leading-none">
                LIVE
              </span>
            </div>
            {dockSide === "right" && <ChevronRight className="w-3.5 h-3.5 text-amber-400" />}
          </div>
        </motion.div>
      ) : (
        /* EXPANDED ZOMATO STYLE TOP TRACKING BAR (Slide to minimize) */
        <motion.div
          key="zomato-tracker-full"
          initial={{ y: -120, opacity: 0, scale: 0.95 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: -120, opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 360, damping: 28 }}
          drag="x"
          dragConstraints={{ left: -70, right: 70 }}
          dragElastic={0.4}
          onDragEnd={handleDragEnd}
          className="fixed left-3 right-3 z-[250] max-w-md mx-auto pointer-events-none"
          style={{ top: "max(14px, calc(env(safe-area-inset-top, 0px) + 12px))" }}
        >
          <div className="pointer-events-auto bg-[#061838] text-white rounded-[24px] px-4 py-3.5 shadow-[0_18px_48px_rgba(6,24,56,0.45)] border border-slate-700/70 overflow-hidden select-none">
            {/* TOP ROW: Outlet name + Swipe Hint (No Cross Button) */}
            <div className="flex items-center justify-between mb-1.5 border-b border-white/10 pb-1.5">
              <div className="flex items-center space-x-1.5">
                <span className="w-2 h-2 rounded-full bg-[#FF6B00] animate-pulse" />
                <span className="text-[11px] font-bold text-slate-300 tracking-tight">
                  Dashit Central Hub · Anantnag
                </span>
              </div>

              {/* Swipe to minimize indicator */}
              <div
                onClick={() => {
                  hapticLight();
                  setIsMinimized(true);
                }}
                className="flex items-center space-x-1 bg-white/10 hover:bg-white/20 active:bg-white/25 px-2 py-0.5 rounded-full cursor-pointer transition-colors"
              >
                <ChevronsLeft className="w-2.5 h-2.5 text-slate-300" />
                <span className="text-[9px] font-semibold text-slate-200">Slide to side</span>
                <ChevronsRight className="w-2.5 h-2.5 text-slate-300" />
              </div>
            </div>

            {/* STATUS + ETA (Click to view live full tracking screen) */}
            <div
              onClick={() => {
                hapticMedium();
                router.push(`/orders?id=${activeOrder?.orderId || ""}`);
              }}
              className="cursor-pointer active:opacity-90 transition-opacity"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[17px] font-black text-white tracking-tight leading-tight">
                    {statusLabel}
                  </h2>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <span className="text-[#FF6B00] font-black text-[12px]">
                      {activeOrder?.status === "Out for Delivery" ? "On time" : "Preparing fresh"}
                    </span>
                    <span className="text-slate-500 text-[12px] font-semibold">·</span>
                    <span className="text-slate-200 text-[12px] font-bold">
                      {activeOrder?.status === "Out for Delivery"
                        ? `Arriving in ${etaMinutes} mins`
                        : `Estimated in ${etaMinutes} mins`}
                    </span>
                  </div>
                </div>

                <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white shrink-0 shadow-xs border border-white/15">
                  <ChevronRight className="w-4 h-4 stroke-[2.5]" />
                </div>
              </div>

              {/* PROGRESS TRACK (Zomato Style Route) */}
              <div className="relative mt-3 h-[28px] flex items-center">
                {/* Dotted / dashed track behind */}
                <div className="absolute left-5 right-5 top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none">
                  {[...Array(14)].map((_, i) => (
                    <span
                      key={i}
                      className="shrink-0 h-[2px] rounded-full bg-slate-700"
                      style={{ width: "8px" }}
                    />
                  ))}
                </div>

                {/* Filled progress bar */}
                <motion.div
                  className="absolute left-5 top-1/2 -translate-y-1/2 h-[2.5px] bg-[#FF6B00] rounded-full"
                  initial={{ width: "0%" }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                />

                {/* Origin badge (store point) */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-800 border border-slate-600 flex items-center justify-center shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#FF6B00]" />
                </div>

                {/* Animated Courier Bike icon */}
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2 z-10"
                  initial={{ left: "6%" }}
                  animate={{ left: `calc(${progressPct}% + 6px)` }}
                  transition={{ duration: 1.2, ease: "easeInOut" }}
                >
                  <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-lg ring-2 ring-[#FF6B00]">
                    <Bike className="w-3.5 h-3.5 stroke-[2.8] text-[#061838]" />
                  </div>
                </motion.div>

                {/* Destination (white circle with home icon) */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-md">
                  <Home className="w-3 h-3 stroke-[2.8] text-[#061838]" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
