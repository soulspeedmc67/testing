import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Mic, ChevronDown, Store, Clock, TrendingUp, User } from "lucide-react";
import { setDeviceSystemBars } from "../lib/systemBars";

export default function AppHeader({
  location = { nickname: "HOME", address: "b-3,jamia appqrtment, Anantnag" },
  onOpenLocation,
  searchQuery = "",
  onSearchChange,
  isSearchClickable = true,
  hideStickySearch = false,
  isHighDemand = false,
  children
}) {
  const router = useRouter();
  const [showTopWarning, setShowTopWarning] = useState(isHighDemand);
  const [showSmallBadge, setShowSmallBadge] = useState(false);

  useEffect(() => {
    if (isHighDemand) {
      setShowTopWarning(true);
      setShowSmallBadge(false);
      // Synchronize top phone bar to crimson delay banner
      setDeviceSystemBars({
        topColor: "#8B1A1A",
        topDarkIcons: false,
        bottomColor: "#FFFDF5",
        bottomDarkIcons: true,
      });

      // Auto-vanish after exactly 7 seconds
      const timer = setTimeout(() => {
        setShowTopWarning(false);
        // Switch top phone bar to header gradient cream color
        setDeviceSystemBars({
          topColor: "#FFE8D6",
          topDarkIcons: true,
          bottomColor: "#FFFDF5",
          bottomDarkIcons: true,
        });

        // Small badge only reveals after the top bar has finished vanishing
        setTimeout(() => {
          setShowSmallBadge(true);
        }, 400);
      }, 7000);
      return () => clearTimeout(timer);
    } else {
      setShowTopWarning(false);
      setShowSmallBadge(false);
      setDeviceSystemBars({
        topColor: "#FFE8D6",
        topDarkIcons: true,
        bottomColor: "#FFFDF5",
        bottomDarkIcons: true,
      });
    }
  }, [isHighDemand]);

  const handleSearchClick = () => {
    if (isSearchClickable) {
      router.push("/search");
    }
  };

  return (
    <header className="w-full bg-gradient-to-b from-[#FFE8D6] via-[#FFF5EB] to-[#FFFDF5] transition-colors duration-500">
      {/* 0. HIGH DEMAND TOP BANNER WITH WAVY BOTTOM (Visible for 7 seconds, then vanishes) */}
      <AnimatePresence>
        {showTopWarning && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="w-full relative z-30 select-none drop-shadow-xs"
          >
            <div className="w-full bg-[#8B1A1A] text-white">
              <div className="max-w-md mx-auto px-4 pt-2.5 pb-1 text-xs font-black flex items-center justify-center space-x-2 text-center tracking-tight">
                <Clock className="w-3.5 h-3.5 text-red-200 shrink-0" />
                <span>Longer delivery time due to high demand</span>
              </div>
            </div>

            {/* Scalloped Wavy Bottom projecting downward onto background */}
            <div className="w-full h-2.5 overflow-hidden -mt-px pointer-events-none">
              <svg
                viewBox="0 0 1200 120"
                preserveAspectRatio="none"
                className="w-full h-full fill-[#8B1A1A]"
              >
                <path d="M0,0 C50,120 100,0 150,0 C200,120 250,0 300,0 C350,120 400,0 450,0 C500,120 550,0 600,0 C650,120 700,0 750,0 C800,120 850,0 900,0 C950,120 1000,0 1050,0 C1100,120 1150,0 1200,0 L1200,0 L0,0 Z" />
              </svg>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 1. TOP DELIVERY ROW (Natural flow: smoothly scrolls away with zero layout jitter) */}
      <div className="max-w-md mx-auto px-4 pt-[max(10px,env(safe-area-inset-top,10px))] pb-2">
        <div className="flex items-center justify-between">
          <div>
            <motion.span
              initial={{ opacity: 0, filter: "blur(4px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.3 }}
              className="text-[10px] font-black uppercase tracking-wider text-slate-500 block leading-tight"
            >
              Dashit in
            </motion.span>
            <div className="flex items-center space-x-2 mt-0.5">
              <motion.h1
                key={isHighDemand ? "18-mins" : "8-mins"}
                initial={{ opacity: 0, y: 4, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="text-[28px] font-black tracking-tight text-slate-900 leading-none"
              >
                {isHighDemand ? "18 minutes" : "8 minutes"}
              </motion.h1>

              {/* Redesigned High Demand badge (Revealed ONLY after top banner vanishes, non-blinking) */}
              <AnimatePresence>
                {showSmallBadge && (
                  <motion.div
                    initial={{ scale: 0.7, opacity: 0, filter: "blur(5px)" }}
                    animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
                    exit={{ scale: 0.7, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 420, damping: 22 }}
                    className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-red-600 to-rose-600 text-white text-[10px] font-black pl-1.5 pr-2.5 py-0.5 rounded-full shadow-xs border border-red-400/40 shrink-0 select-none"
                  >
                    <div className="w-4 h-4 rounded-full bg-white text-red-600 flex items-center justify-center shrink-0">
                      <TrendingUp className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                    <span className="tracking-tight text-[10px] font-bold">High demand</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {!isHighDemand && (
                <span className="inline-flex items-center space-x-1 bg-sky-50 text-[#061838] text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-sky-200">
                  <Store className="w-2.5 h-2.5 stroke-[2.5] shrink-0 text-[#061838]" />
                  <span>870 m away</span>
                </span>
              )}
            </div>
          </div>

          {/* Account profile button with solid filled person icon (not hollow) */}
          <button
            type="button"
            onClick={() => router.push("/account")}
            aria-label="Account Profile"
            className="w-9 h-9 rounded-full bg-white/90 hover:bg-white border border-amber-200/80 flex items-center justify-center text-slate-800 shadow-2xs active:scale-95 transition-all"
          >
            <User className="w-5 h-5 fill-slate-800 text-slate-800 stroke-none" />
          </button>
        </div>

        {/* Location selector with iOS text blur reveal */}
        <button
          type="button"
          onClick={onOpenLocation}
          className="flex items-center space-x-1 text-slate-800 text-left group active:opacity-75 transition-opacity pt-1.5"
        >
          <span className="font-black text-xs text-slate-900 uppercase tracking-tight">
            {location.nickname || "HOME"}
          </span>
          <span className="text-slate-400 font-bold text-xs">-</span>
          <span
            key={location.address}
            className="text-xs text-slate-600 font-semibold truncate max-w-[220px] animate-ios-blur"
          >
            {location.address || "Select your delivery address"}
          </span>
          <ChevronDown className="w-3.5 h-3.5 stroke-[2.5] text-slate-500 group-hover:translate-y-0.5 transition-transform" />
        </button>
      </div>

      {/* 2. OPTIONAL STICKY SEARCH BAR (When rendered standalone) */}
      {!hideStickySearch && (
        <div className="sticky top-0 z-40 bg-[#FFFDF5]/98 backdrop-blur-xl border-b border-amber-100/60 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
          <div className="max-w-md mx-auto px-4 pt-1.5 pb-2">
            <div
              onClick={handleSearchClick}
              className="relative flex items-center bg-white text-slate-900 rounded-2xl px-3.5 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-200/90 cursor-pointer active:scale-[0.99] transition-transform"
            >
              <Search className="w-4 h-4 stroke-[2.5] text-slate-400 mr-2.5 shrink-0" />
              <input
                type="text"
                placeholder="Search for atta, dal, coke and more"
                value={searchQuery}
                onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                readOnly={isSearchClickable}
                className="w-full bg-transparent text-xs font-semibold text-slate-900 focus:outline-none placeholder-slate-400 cursor-pointer"
              />
              <Mic className="w-4 h-4 stroke-[2.5] text-slate-500 ml-2 shrink-0 hover:text-[#0c831f] transition-colors" />
            </div>
          </div>

          {/* Embedded Sticky Scroller */}
          {children}
        </div>
      )}
    </header>
  );
}
