import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { X, Home, Bike } from "lucide-react";
import { showOrderLiveNotification, clearOrderLiveNotification } from "../lib/notifications";

const STATUS_STAGES = [
  { key: "placed",   label: "Order Placed" },
  { key: "packing",  label: "Preparing your order" },
  { key: "rider",    label: "Rider picked up" },
  { key: "arriving", label: "Almost there" },
];

export default function LiveOrderFloatingTracker() {
  const router = useRouter();
  const [activeOrder, setActiveOrder] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [etaMinutes, setEtaMinutes] = useState(7);
  const [stageIndex, setStageIndex] = useState(1);

  useEffect(() => {
    const checkOrder = () => {
      try {
        const active = localStorage.getItem("dashit_active_order");
        if (active) {
          const parsed = JSON.parse(active);
          setActiveOrder(parsed);
          setIsDismissed(false);
          showOrderLiveNotification({
            orderId: parsed.orderId,
            etaMinutes: 7,
            riderName: "Tariq Ahmad",
          });
        } else {
          setActiveOrder(null);
          clearOrderLiveNotification();
        }
      } catch (e) {}
    };

    checkOrder();
    const interval = setInterval(checkOrder, 4000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!activeOrder) return;
    const t = setInterval(() => {
      setEtaMinutes((m) => Math.max(1, m - 1));
    }, 60_000);
    return () => clearInterval(t);
  }, [activeOrder]);

  // Don't render on /orders or /checkout page
  if (!activeOrder || isDismissed || router.pathname === "/orders" || router.pathname === "/checkout") return null;

  const progressPct = [12, 32, 60, 82][stageIndex] ?? 32;
  const statusLabel = STATUS_STAGES[stageIndex]?.label ?? "Preparing your order";

  return (
    <AnimatePresence>
      <motion.div
        key="zomato-tracker"
        initial={{ y: -120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -120, opacity: 0 }}
        transition={{ type: "spring", stiffness: 360, damping: 28 }}
        className="fixed left-3 right-3 z-[200] max-w-md mx-auto pointer-events-none"
        style={{ top: "max(12px, calc(env(safe-area-inset-top, 0px) + 8px))" }}
      >
        <div className="pointer-events-auto bg-[#18181b] text-white rounded-[26px] px-5 py-4 shadow-[0_24px_64px_rgba(0,0,0,0.6)] border border-white/10 overflow-hidden select-none">
          {/* TOP ROW: Outlet name + Brand */}
          <div className="flex items-center justify-between mb-1">
            <span className="text-[12px] font-semibold text-zinc-400 tracking-tight">
              Dashit Darkstore · Anantnag
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-[13px] font-black text-white tracking-tighter lowercase">dashit</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDismissed(true);
                }}
                className="p-1 text-zinc-500 hover:text-white rounded-full transition-colors active:scale-90"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* STATUS + ETA (Click to view live order details) */}
          <div
            onClick={() => router.push("/orders")}
            className="cursor-pointer active:opacity-90 transition-opacity"
          >
            <h2 className="text-[19px] font-black text-white tracking-tight leading-tight mt-0.5">
              {statusLabel}
            </h2>
            <div className="flex items-center space-x-1.5 mt-1">
              <span className="text-[#22c55e] font-extrabold text-[13px]">On time</span>
              <span className="text-zinc-600 text-[13px] font-semibold">|</span>
              <span className="text-zinc-300 text-[13px] font-medium">
                Arriving in {etaMinutes} minute{etaMinutes !== 1 ? "s" : ""}
              </span>
            </div>

            {/* PROGRESS TRACK (Zomato Style) */}
            <div className="relative mt-4 h-[32px] flex items-center">
              {/* Dotted / dashed track behind */}
              <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 flex items-center justify-between pointer-events-none">
                {[...Array(16)].map((_, i) => (
                  <span
                    key={i}
                    className="shrink-0 h-[2.5px] rounded-full bg-zinc-700"
                    style={{ width: "8px" }}
                  />
                ))}
              </div>

              {/* Filled progress bar */}
              <motion.div
                className="absolute left-6 top-1/2 -translate-y-1/2 h-[2.5px] bg-zinc-400 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
              />

              {/* Origin badge (store point) */}
              <div className="absolute left-1 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
              </div>

              {/* Animated Courier Bike icon */}
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 z-10"
                initial={{ left: "6%" }}
                animate={{ left: `calc(${progressPct}% + 10px)` }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
              >
                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-lg ring-2 ring-zinc-800">
                  <Bike className="w-3.5 h-3.5 stroke-[2.8] text-[#18181b]" />
                </div>
              </motion.div>

              {/* Destination (white circle with home icon) */}
              <div className="absolute right-1 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-md">
                <Home className="w-3.5 h-3.5 stroke-[2.8] text-[#18181b]" />
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
