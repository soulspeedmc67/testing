import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ChevronRight, X, Clock, Bike } from "lucide-react";
import { showOrderLiveNotification, clearOrderLiveNotification } from "../lib/notifications";

export default function LiveOrderFloatingTracker() {
  const router = useRouter();
  const [activeOrder, setActiveOrder] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);
  const [etaMinutes, setEtaMinutes] = useState(7);

  useEffect(() => {
    const checkOrder = () => {
      try {
        const active = localStorage.getItem("dashit_active_order");
        if (active) {
          const parsed = JSON.parse(active);
          setActiveOrder(parsed);
          // Push notification to Android status bar like Zomato
          showOrderLiveNotification({
            orderId: parsed.orderId,
            etaMinutes: 7,
            riderName: "Tariq Ahmad"
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

  // Don't render floating top pill on orders page or home page (home has its own dismissable card)
  if (!activeOrder || isDismissed || router.pathname === "/orders" || router.pathname === "/") {
    return null;
  }

  return (
    <div className="fixed top-3 left-4 right-4 z-50 max-w-md mx-auto animate-fade-in pointer-events-none">
      <div className="pointer-events-auto bg-slate-900/95 backdrop-blur-2xl text-white rounded-2xl p-2.5 shadow-2xl border border-slate-700/80 flex items-center justify-between space-x-3">
        {/* Left: Rider & ETA */}
        <Link href="/orders" className="flex items-center space-x-2.5 grow">
          <div className="w-8 h-8 rounded-xl bg-[#0c831f] flex items-center justify-center shrink-0 shadow-sm">
            <Bike className="w-4 h-4 stroke-[2.8] text-white" />
          </div>
          <div className="leading-tight">
            <div className="flex items-center space-x-1.5">
              <span className="text-xs font-black tracking-tight text-white">
                Arriving in {etaMinutes} mins
              </span>
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </div>
            <p className="text-[10px] text-slate-400 font-medium">
              Order #{activeOrder.orderId} · On the way
            </p>
          </div>
        </Link>

        {/* Right: Track Action & Dismiss */}
        <div className="flex items-center space-x-1.5 shrink-0">
          <Link
            href="/orders"
            className="bg-[#0c831f] hover:bg-emerald-700 text-white font-extrabold text-[11px] px-3 py-1.5 rounded-xl transition-all active:scale-95 flex items-center space-x-1"
          >
            <span>Track</span>
            <ChevronRight className="w-3 h-3" />
          </Link>
          <button
            onClick={() => setIsDismissed(true)}
            className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
