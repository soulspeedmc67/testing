import { useState, useEffect } from "react";
import Link from "next/link";
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

  if (!activeOrder || isDismissed || router.pathname === "/orders") return null;

  const progressPct = [10, 28, 58, 80][stageIndex] ?? 28;
  const statusLabel = STATUS_STAGES[stageIndex]?.label ?? "Preparing your order";

  return (
    <AnimatePresence>
      <motion.div
        key="zomato-tracker"
        initial={{ y: -110, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -110, opacity: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
        className="fixed left-4 right-4 z-[200] max-w-md mx-auto pointer-events-none"
        style={{ top: "max(12px, env(safe-area-inset-top, 12px))" }}
      >
        <div className="pointer-events-auto bg-[#1c1c1e] backdrop-blur-2xl text-white rounded-[24px] px-4 py-3.5 shadow-[0_20px_60px_rgba(0,0,0,0.55)] border border-white/10 overflow-hidden">
          {/* TOP ROW */}
          <div className="flex items-center justify-between mb-0.5">
            <span className="text-[11px] font-semibold text-slate-400 tracking-tight">
              Dashit Darkstore · Anantnag
            </span>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-black text-white tracking-tighter">dashit</span>
              <button
                onClick={() => setIsDismissed(true)}
                className="p-0.5 text-slate-500 hover:text-white rounded-full transition-colors active:scale-90"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* STATUS + ETA */}
          <Link href="/orders" className="block">
            <h2 className="text-[17px] font-black text-white tracking-tight leading-snug mt-0.5">
              {statusLabel}
            </h2>
            <div className="flex items-center space-x-1.5 mt-0.5">
              <span className="text-[#34c759] font-extrabold text-[12px]">On time</span>
              <span className="text-slate-600 text-[12px] font-semibold">|</span>
              <span className="text-slate-300 text-[12px] font-semibold">
                Arriving in {etaMinutes} minute{etaMinutes !== 1 ? "s" : ""}
              </span>
            </div>

            {/* PROGRESS TRACK */}
            <div className="relative mt-3.5 h-[36px]">
              {/* Background dashed line */}
              <div className="absolute top-1/2 -translate-y-1/2 left-5 right-5 flex items-center h-[2px]">
                {[...Array(18)].map((_, i) => (
                  <span
                    key={i}
                    className="shrink-0 h-[2px] rounded-full bg-white/18"
                    style={{ width: "8px", marginRight: "3px" }}
                  />
                ))}
              </div>

              {/* Filled progress */}
              <motion.div
                className="absolute top-1/2 -translate-y-1/2 left-5 h-[2px] bg-white/40 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
              />

              {/* Courier bike icon */}
              <motion.div
                className="absolute top-1/2 -translate-y-1/2"
                initial={{ left: "4%" }}
                animate={{ left: `calc(${progressPct}% - 10px)` }}
                transition={{ duration: 1.2, ease: "easeInOut" }}
              >
                <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shadow-lg">
                  <Bike className="w-3.5 h-3.5 stroke-[2.5] text-[#1c1c1e]" />
                </div>
              </motion.div>

              {/* Origin dot */}
              <div className="absolute left-4 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-white/30" />

              {/* Home destination */}
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                <Home className="w-3.5 h-3.5 stroke-[2.2] text-white/60" />
              </div>
            </div>
          </Link>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
