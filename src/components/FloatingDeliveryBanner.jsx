import { useState } from "react";
import { X, CloudRain, Snowflake, Zap, AlertTriangle } from "lucide-react";
import { useStoreDetails } from "../lib/storeStatus";

export default function FloatingDeliveryBanner() {
  const [isDismissed, setIsDismissed] = useState(false);
  const { weatherAlert } = useStoreDetails();

  if (isDismissed) return null;

  // Weather / Surge delivery alert takes precedence
  if (weatherAlert && weatherAlert.active) {
    const isSnow = weatherAlert.type === "snow";
    const isRain = weatherAlert.type === "rain";
    const isSurge = weatherAlert.type === "surge";

    return (
      <aside aria-label="Delivery status notice" className="fixed bottom-[74px] left-4 right-4 z-40 max-w-md mx-auto animate-bottom-sheet">
        <div className={`backdrop-blur-xl border shadow-xl rounded-2xl px-4 py-3 flex items-start justify-between gap-3 text-xs ${
          isSnow
            ? "bg-sky-950/90 border-sky-400/40 text-sky-100"
            : isRain
            ? "bg-slate-900/95 border-blue-400/40 text-slate-100"
            : "bg-amber-950/90 border-amber-500/40 text-amber-100"
        }`}>
          <div className="flex items-start gap-2.5 min-w-0">
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
              isSnow ? "bg-sky-500/20 text-sky-300" : isRain ? "bg-blue-500/20 text-blue-300" : "bg-amber-500/20 text-amber-400"
            }`}>
              {isSnow ? (
                <Snowflake className="w-4 h-4 animate-spin-slow" />
              ) : isRain ? (
                <CloudRain className="w-4 h-4" />
              ) : isSurge ? (
                <Zap className="w-4 h-4" />
              ) : (
                <AlertTriangle className="w-4 h-4" />
              )}
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-[12px] block tracking-tight">
                {weatherAlert.title || (isSnow ? "Snow Advisory · Anantnag ❄️" : isRain ? "Rain Advisory · Anantnag 🌧️" : "High Demand Surge ⚡")}
              </span>
              <p className="text-[11px] leading-snug mt-0.5 opacity-90">
                {weatherAlert.message || "Riders are navigating carefully. Deliveries may take 10–15 mins longer to prioritize safety."}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsDismissed(true)}
            aria-label="Dismiss weather alert"
            className="p-1 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside aria-label="Special offer notice" className="fixed bottom-[74px] left-6 right-6 z-40 max-w-xs mx-auto animate-bottom-sheet">
      <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-xl rounded-full px-4 py-2 flex items-center justify-between space-x-2 text-xs dark:bg-surface-raised/95 dark:border-line/90">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 bg-orange-500/10 rounded-full flex items-center justify-center p-0.5 shrink-0 overflow-hidden">
            <img src="/rider/rider_moving.png" alt="Free Delivery" className="w-full h-full object-contain filter drop-shadow-xs" />
          </div>
          <span className="font-extrabold text-[11px] text-slate-800 dark:text-content">
            Get <span className="text-[#FF5B00] font-black">FREE delivery</span> on order above ₹299
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsDismissed(true)}
          aria-label="Dismiss special offer notice"
          className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors dark:text-content-faint dark:hover:text-content-secondary dark:hover:bg-surface-muted"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </aside>
  );
}
