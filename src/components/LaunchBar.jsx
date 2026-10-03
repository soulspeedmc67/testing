import { useEffect, useState } from "react";
import { isBeforeLaunch, LAUNCH_LABEL } from "../lib/launch";

/**
 * The line across the top of the shop until launch: orders aren't taken
 * before then. Decided after mount (the static HTML can't know the time), and
 * gone by itself once launch passes.
 */
export default function LaunchBar() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(isBeforeLaunch());
    const timer = setInterval(() => setShow(isBeforeLaunch()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

  if (!show) return null;
  return (
    <div
      role="status"
      className="w-full bg-[#061838] text-white pt-[env(safe-area-inset-top,0px)] dark:bg-[#0E1626]"
    >
      <p className="max-w-7xl mx-auto px-4 py-2 text-center text-[12px] sm:text-[13px] font-semibold leading-snug [text-wrap:balance]">
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#FF5B00] align-middle mr-2" aria-hidden="true" />
        We start taking orders on <span className="text-[#FFB27F]">{LAUNCH_LABEL}</span>. Browse and fill your cart now.
      </p>
    </div>
  );
}
