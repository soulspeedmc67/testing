import { useEffect, useState } from "react";
import { BellRing } from "lucide-react";
import { onOrderAlarmChange, isOrderAlarmRinging, stopOrderAlarm } from "../lib/orderAlarm";

/**
 * A big flashing bar across the top while the new-order alarm rings
 * (src/lib/orderAlarm.js): one tap anywhere on it silences the alarm.
 */
export default function OrderAlarmBanner({ label = "New order!", hint = "Tap to silence the alarm" }) {
  const [ringing, setRinging] = useState(false);
  useEffect(() => {
    setRinging(isOrderAlarmRinging());
    return onOrderAlarmChange(setRinging);
  }, []);
  if (!ringing) return null;
  return (
    <button
      type="button"
      onClick={() => stopOrderAlarm()}
      className="fixed inset-x-0 top-0 z-[400] flex items-center justify-center gap-3 px-4 pt-[calc(env(safe-area-inset-top,0px)+14px)] pb-4 bg-[#E11D48] text-white shadow-2xl animate-pulse cursor-pointer"
      role="alert"
    >
      <BellRing className="w-7 h-7 shrink-0" aria-hidden="true" />
      <span className="text-left leading-tight">
        <span className="block text-lg font-black">{label}</span>
        <span className="block text-sm font-semibold text-white/90">{hint}</span>
      </span>
    </button>
  );
}
