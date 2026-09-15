import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { ChevronRight, X, Navigation, Zap, KeyRound } from "lucide-react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import DashitAnimatedLogo from "./DashitAnimatedLogo";
import { calculateDeliveryEta } from "../lib/deliveryEta";

export default function HomeScreenLiveOrderCard() {
  const [activeOrder, setActiveOrder] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);

  const etaData = useMemo(() => {
    if (!activeOrder) return { etaMinutes: 10, distanceFormatted: "1.2 km away" };
    const loc = activeOrder.location || activeOrder.userAddress || null;
    return calculateDeliveryEta(loc);
  }, [activeOrder]);

  useEffect(() => {
    // Check if dismissed in this session
    if (typeof window !== "undefined") {
      const dismissed = sessionStorage.getItem("dashit_home_order_dismissed");
      if (dismissed === "true") {
        setIsDismissed(true);
      }
    }

    const checkOrder = () => {
      try {
        const saved = localStorage.getItem("dashit_active_order");
        if (saved) {
          setActiveOrder(JSON.parse(saved));
        } else {
          setActiveOrder(null);
        }
      } catch (e) {}
    };

    checkOrder();
    const interval = setInterval(checkOrder, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    if (typeof window !== "undefined") {
      sessionStorage.setItem("dashit_home_order_dismissed", "true");
    }
  };

  if (!activeOrder || isDismissed) {
    return null;
  }

  return (
    <div className="bg-white border border-slate-200/90 rounded-3xl p-4 shadow-sm space-y-3 animate-fade-in relative overflow-hidden">
      {/* Subtle orange highlight strip */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-[#FF5B00]" />

      {/* Header: Title, Order ID, Dismiss X */}
      <div className="flex items-center justify-between pt-0.5">
        <div className="flex items-center space-x-2.5">
          <div className="w-8 h-8 rounded-xl bg-white shadow-2xs flex items-center justify-center shrink-0 border border-slate-200/90 p-0.5">
            <DashitAnimatedLogo size="xs" showGlow={false} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-extrabold text-xs text-slate-900">Live Order Tracking</h3>
              <Badge variant="success">
                ON THE WAY
              </Badge>
            </div>
            <p className="text-[10px] font-mono text-slate-400 font-semibold">
              #{activeOrder.orderId}
            </p>
          </div>
        </div>

        {/* Dismiss Button */}
        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
          title="Dismiss from home screen"
        >
          <X className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Status & ETA & OTP */}
      <div className="bg-slate-50 rounded-2xl p-3 flex items-center justify-between border border-slate-100/90 gap-2">
        <div>
          <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
            Estimated Arrival
          </span>
          <div className="flex items-center space-x-1 mt-0.5">
            <Zap className="w-3.5 h-3.5 stroke-[2.8] text-amber-500 fill-amber-500 shrink-0" />
            <span className="font-mono font-black text-sm text-slate-900">
              ~{etaData.etaMinutes} Mins
            </span>
            <span className="text-[10px] text-slate-500 font-medium ml-1">
              ({etaData.distanceFormatted})
            </span>
          </div>
        </div>

        {/* OTP Callout */}
        {activeOrder.otp && (
          <div className="bg-white border border-slate-200/90 px-2.5 py-1 rounded-xl text-center shadow-2xs">
            <span className="text-[8.5px] font-bold uppercase tracking-wider text-slate-400 block leading-tight">
              OTP
            </span>
            <span className="font-mono text-xs font-black text-slate-900 tracking-wider">
              {activeOrder.otp}
            </span>
          </div>
        )}

        <Link
          href="/orders"
          className="bg-[#061838] hover:bg-slate-900 text-white font-extrabold text-xs px-3.5 py-2 rounded-xl transition-all shadow-sm active:scale-95 flex items-center space-x-1 shrink-0"
        >
          <Navigation className="w-3.5 h-3.5" />
          <span>Track Live</span>
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>

      {/* Mini Progress Track */}
      <div className="pt-0.5">
        <div className="grid grid-cols-3 gap-1.5">
          <div className="space-y-1 text-center">
            <div className="h-1 w-full bg-[#061838] rounded-full" />
            <span className="text-[9px] font-bold text-[#061838] block">Placed</span>
          </div>
          <div className="space-y-1 text-center">
            <div className="h-1 w-full bg-[#FF5B00] animate-pulse rounded-full" />
            <span className="text-[9px] font-bold text-[#FF5B00] block">Processing</span>
          </div>
          <div className="space-y-1 text-center">
            <div
              className={`h-1 w-full ${
                activeOrder?.status === "Out for Delivery" ? "bg-[#FF5B00]" : "bg-slate-200"
              } rounded-full`}
            />
            <span
              className={`text-[9px] font-bold ${
                activeOrder?.status === "Out for Delivery" ? "text-[#061838]" : "text-slate-400"
              } block`}
            >
              On Way
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
