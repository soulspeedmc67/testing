import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { Home, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { showOrderLiveNotification, clearOrderLiveNotification } from "../lib/notifications";
import { hapticLight, hapticMedium } from "../lib/haptics";
import DashitAnimatedLogo, { DashitProgressBadge } from "./DashitAnimatedLogo";
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

  // Hide completely on checkout, full order tracking page, driver console, login
  const isHiddenPage =
    router.pathname === "/orders" ||
    router.pathname === "/checkout" ||
    router.pathname === "/driver" ||
    router.pathname === "/login" ||
    router.pathname === "/confirm-location";

  if (!activeOrder || isHiddenPage) return null;

  // Horizontal drag-to-dock handle
  const handleDragEnd = (_, info) => {
    const threshold = 35;
    const velocityThreshold = 160;
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

  const handleMinimize = (side = "right") => {
    hapticLight();
    setDockSide(side);
    setIsMinimized(true);
  };

  const handleExpand = () => {
    hapticMedium();
    setIsMinimized(false);
  };

  return (
    <AnimatePresence initial={false}>
      {isMinimized ? (
        /* SLEEK FLOATING EDGE TAB (Docked to screen border with Dashit Logo) */
        <motion.div
          key="miui-edge-tab"
          initial={{
            x: dockSide === "right" ? 80 : -80,
            opacity: 0,
            scale: 0.7,
            filter: "blur(6px)",
          }}
          animate={{
            x: 0,
            opacity: 1,
            scale: 1,
            filter: "blur(0px)",
          }}
          exit={{
            x: dockSide === "right" ? 80 : -80,
            opacity: 0,
            scale: 0.7,
            filter: "blur(6px)",
          }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 25,
            mass: 0.75,
          }}
          drag="y"
          dragConstraints={{ top: 80, bottom: 450 }}
          dragElastic={0.12}
          onClick={handleExpand}
          className={`fixed z-[250] cursor-pointer select-none active:scale-95 transition-transform ${
            dockSide === "right" ? "right-0" : "left-0"
          }`}
          style={{ top: "45%" }}
        >
          <div
            className={`flex items-center space-x-2.5 bg-gradient-to-r from-[#06142A] via-[#081833] to-[#051124] text-white py-2 shadow-[0_14px_36px_rgba(2,10,24,0.55)] border border-slate-700/80 backdrop-blur-md ${
              dockSide === "right"
                ? "rounded-l-2xl pl-3 pr-2 border-r-0"
                : "rounded-r-2xl pl-2 pr-3 border-l-0"
            }`}
          >
            {dockSide === "left" && <ChevronRight className="w-3.5 h-3.5 text-[#FF5B00]" />}

            {/* Mini Dashit animated emblem */}
            <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm ring-1.5 ring-[#FF5B00]/70 p-0.5 overflow-hidden">
              <DashitAnimatedLogo size="xs" showGlow={false} />
            </div>

            <div className="flex flex-col text-left">
              <span className="font-mono font-black text-xs text-white leading-tight">
                {etaMinutes > 0 ? `${etaMinutes}m` : "Ready"}
              </span>
              <span className="text-[7.5px] font-black text-[#FF5B00] uppercase tracking-wider leading-none mt-0.5">
                LIVE ORDER
              </span>
            </div>

            {dockSide === "right" && <ChevronRight className="w-3.5 h-3.5 text-[#FF5B00]" />}
          </div>
        </motion.div>
      ) : (
        /* EXPANDED ULTRA-SLEEK TOP NOTIFICATION (Smooth morph & close) */
        <motion.div
          key="zomato-tracker-full"
          initial={{
            y: -80,
            opacity: 0,
            scale: 0.92,
            filter: "blur(8px)",
          }}
          animate={{
            y: 0,
            opacity: 1,
            scale: 1,
            filter: "blur(0px)",
          }}
          exit={{
            y: 90,
            x: dockSide === "right" ? 120 : -120,
            opacity: 0,
            scale: 0.6,
            filter: "blur(10px)",
          }}
          transition={{
            type: "spring",
            stiffness: 280,
            damping: 26,
            mass: 0.8,
          }}
          drag="x"
          dragConstraints={{ left: -70, right: 70 }}
          dragElastic={0.25}
          onDragEnd={handleDragEnd}
          className="fixed left-3.5 right-3.5 z-[250] max-w-md mx-auto pointer-events-none"
          style={{ top: "max(14px, calc(env(safe-area-inset-top, 0px) + 12px))" }}
        >
          <div className="pointer-events-auto bg-gradient-to-b from-[#08152C] via-[#061124] to-[#040C1A] text-white rounded-[26px] px-4 py-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.5),0_1px_0_rgba(255,255,255,0.12)_inset] border border-slate-700/70 overflow-hidden select-none backdrop-blur-xl">
            {/* TOP ROW: Outlet name + Sleek Slide-to-side Pill */}
            <div className="flex items-center justify-between mb-2 border-b border-white/10 pb-2">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#FF5B00] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF5B00]" />
                </span>
                <span className="text-[11px] font-extrabold text-slate-300 tracking-tight">
                  Dashit Central Hub · Anantnag
                </span>
              </div>

              {/* Sleeker, smoother Slide to side pill */}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleMinimize(dockSide);
                }}
                className="flex items-center space-x-1.5 bg-white/10 hover:bg-white/20 active:scale-95 px-2.5 py-1 rounded-full cursor-pointer transition-all border border-white/10"
              >
                <ChevronsLeft className="w-2.5 h-2.5 text-slate-300" />
                <span className="text-[9.5px] font-bold text-slate-200 tracking-tight">
                  Slide to side
                </span>
                <ChevronsRight className="w-2.5 h-2.5 text-slate-300" />
              </button>
            </div>

            {/* STATUS + ETA */}
            <div
              onClick={() => {
                hapticMedium();
                router.push(`/orders?id=${activeOrder?.orderId || ""}`);
              }}
              className="cursor-pointer active:opacity-90 transition-opacity"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-[16.5px] font-black text-white tracking-tight leading-tight">
                    {statusLabel}
                  </h2>
                  <div className="flex items-center space-x-1.5 mt-0.5">
                    <span className="text-[#FF5B00] font-black text-[12px]">
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

              {/* PROGRESS TRACK (Zomato-Style Route with Animated Dashit Logo) */}
              <div className="relative mt-3.5 h-[30px] flex items-center">
                {/* Dotted route track */}
                <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none">
                  {[...Array(15)].map((_, i) => (
                    <span
                      key={i}
                      className="shrink-0 h-[2.5px] rounded-full bg-slate-800"
                      style={{ width: "7px" }}
                    />
                  ))}
                </div>

                {/* Filled progress beam */}
                <motion.div
                  className="absolute left-5 top-1/2 -translate-y-1/2 h-[3px] bg-gradient-to-r from-[#FF5B00]/70 to-[#FF5B00] rounded-full shadow-[0_0_8px_rgba(255,91,0,0.5)]"
                  initial={{ width: "0%" }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
                />

                {/* Origin point (Central Hub) */}
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-slate-900 border border-slate-700 flex items-center justify-center shadow-xs">
                  <span className="w-2 h-2 rounded-full bg-[#FF5B00]" />
                </div>

                {/* ANIMATED DASHIT PROGRESS BADGE */}
                <motion.div
                  className="absolute top-1/2 -translate-y-1/2 z-10"
                  initial={{ left: "6%" }}
                  animate={{ left: `calc(${progressPct}% + 4px)` }}
                  transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
                >
                  <DashitProgressBadge size="sm" />
                </motion.div>

                {/* Destination point (Customer Home) */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white flex items-center justify-center shadow-md ring-1 ring-slate-200">
                  <Home className="w-3.5 h-3.5 stroke-[2.8] text-[#061838]" />
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
