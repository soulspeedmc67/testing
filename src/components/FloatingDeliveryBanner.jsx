import { useState } from "react";
import { X, Bike } from "lucide-react";

export default function FloatingDeliveryBanner() {
  const [isDismissed, setIsDismissed] = useState(false);

  if (isDismissed) return null;

  return (
    <div className="fixed bottom-[68px] left-6 right-6 z-40 max-w-xs mx-auto animate-bottom-sheet">
      <div className="bg-white/95 backdrop-blur-xl border border-slate-200/90 shadow-xl rounded-full px-4 py-2 flex items-center justify-between space-x-2 text-xs">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-orange-100 text-[#FF5B00] rounded-full">
            <Bike className="w-4 h-4" />
          </div>
          <span className="font-extrabold text-[11px] text-slate-800">
            Get <span className="text-[#FF5B00] font-black">FREE delivery</span> on order above ₹399
          </span>
        </div>

        <button
          onClick={() => setIsDismissed(true)}
          className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
