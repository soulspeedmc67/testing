import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Bike,
  Navigation,
  Radio,
  Zap,
  Check,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Coffee,
  Sparkles,
  Smartphone,
  ArrowUpRight,
  MapPin,
  Flame,
  Store,
  Gauge,
  Percent
} from "lucide-react";
import { hapticLight, hapticSuccess } from "../lib/haptics";

export default function ArtisticBentoFeatures() {
  const [reordered, setReordered] = useState(false);
  const [activeTelemetryTab, setActiveTelemetryTab] = useState("kp-road");
  const [etaSeconds, setEtaSeconds] = useState(214); // 3m 34s

  // Live countdown tick for GPS telemetry HUD
  useEffect(() => {
    const timer = setInterval(() => {
      setEtaSeconds((prev) => (prev > 45 ? prev - 1 : 240));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatMinSec = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}m ${s < 10 ? "0" : ""}${s}s`;
  };

  const handleReorderClick = (e) => {
    e.preventDefault();
    hapticSuccess();
    setReordered(true);
    setTimeout(() => {
      setReordered(false);
    }, 4500);
  };

  return (
    <section id="app-features" className="mt-24 sm:mt-32 relative scroll-mt-24 sm:scroll-mt-28">
      {/* Glow aura backdrops */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-3/4 h-72 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-blue-500/5 blur-3xl pointer-events-none -z-10" />

      {/* Section Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-center max-w-2xl mx-auto mb-12 sm:mb-16 px-4"
      >
        <div className="inline-flex items-center space-x-2 bg-orange-100 dark:bg-orange-950/60 border border-orange-300/80 dark:border-orange-500/30 rounded-full px-3.5 py-1 mb-3">
          <Sparkles className="w-3.5 h-3.5 text-[#FF5B00]" />
          <span className="text-[11px] font-black uppercase tracking-widest text-[#FF5B00]">
            The Mobile Advantage
          </span>
        </div>
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#061838] dark:text-white tracking-tight leading-[1.12]">
          Built like a work of art. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF5B00] via-[#FF7A29] to-[#F59E0B]">
            Engineered for Anantnag.
          </span>
        </h2>
        <p className="mt-3.5 text-sm sm:text-base text-slate-600 dark:text-slate-300 font-medium max-w-xl mx-auto leading-relaxed">
          Skip slow browser loads. The native DASHIT app unlocks real-time GPS telemetry, zero price markups, and 1-tap Kashmiri morning delivery rituals.
        </p>
      </motion.div>

      {/* BENTO GRID: 4 Handcrafted, Asymmetric Masterpiece Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
        {/* =========================================================================
            BENTO CARD 1 (Col span 7): HYPERLOCAL LIVE GPS RADAR & TELEMETRY
           ========================================================================= */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-7 bg-white dark:bg-[#10141E] rounded-[32px] p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-black/[0.03] dark:shadow-black/40 relative overflow-hidden flex flex-col justify-between group transform-gpu hover:border-orange-500/40 transition-colors"
        >
          {/* Subtle grid background texture */}
          <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.07] pointer-events-none bg-[radial-gradient(#FF5B00_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Card Top Pill & Controls */}
          <div className="flex flex-wrap items-center justify-between gap-3 relative z-10">
            <div className="flex items-center space-x-2.5">
              <div className="w-10 h-10 rounded-2xl bg-orange-100 dark:bg-orange-950/60 text-[#FF5B00] flex items-center justify-center shadow-inner">
                <Navigation className="w-5 h-5 stroke-[2.4]" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#FF5B00] block">
                  Live Dispatch Telemetry
                </span>
                <h3 className="text-lg sm:text-xl font-black text-[#061838] dark:text-white tracking-tight">
                  Real-Time Rider Radar (PIN 192101)
                </h3>
              </div>
            </div>

            {/* Quick destination switcher */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl text-[11px] font-bold">
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setActiveTelemetryTab("kp-road");
                }}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeTelemetryTab === "kp-road"
                    ? "bg-white dark:bg-[#1E2433] text-[#FF5B00] shadow-xs font-black"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                KP Road Hub
              </button>
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setActiveTelemetryTab("khanabal");
                }}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  activeTelemetryTab === "khanabal"
                    ? "bg-white dark:bg-[#1E2433] text-[#FF5B00] shadow-xs font-black"
                    : "text-slate-500 hover:text-slate-900 dark:text-slate-400"
                }`}
              >
                Khanabal Express
              </button>
            </div>
          </div>

          {/* INTERACTIVE RADAR & ROUTE VISUALIZATION CANVAS */}
          <div className="relative mt-6 my-4 h-48 sm:h-56 rounded-2xl bg-gradient-to-br from-slate-900 via-[#0B101C] to-[#060A14] border border-slate-800/80 overflow-hidden p-4 text-white select-none">
            {/* Radar Circular Sweep Pulse */}
            <div className="absolute right-12 top-1/2 -translate-y-1/2 w-48 h-48 rounded-full border border-orange-500/20 flex items-center justify-center">
              <div className="w-32 h-32 rounded-full border border-orange-500/30 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full border border-orange-500/40 bg-orange-500/5 animate-pulse" />
              </div>
            </div>

            {/* SVG Animated Route Path */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none"
              viewBox="0 0 500 200"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient id="routeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#FF5B00" stopOpacity="0.2" />
                  <stop offset="50%" stopColor="#FF7A29" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#10B981" stopOpacity="1" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="glow" />
                  <feComposite in="SourceGraphic" in2="glow" operator="over" />
                </filter>
              </defs>

              {/* Road background track */}
              <path
                d="M 50,140 Q 180,40 320,110 T 450,60"
                fill="none"
                stroke="#1E293B"
                strokeWidth="8"
                strokeLinecap="round"
              />

              {/* Glowing active delivery path */}
              <path
                d="M 50,140 Q 180,40 320,110 T 450,60"
                fill="none"
                stroke="url(#routeGradient)"
                strokeWidth="4"
                strokeLinecap="round"
                filter="url(#glow)"
                strokeDasharray="8 6"
                className="animate-[dash_20s_linear_infinite]"
              />

              {/* Hub Node */}
              <circle cx="50" cy="140" r="7" fill="#FF5B00" />
              <circle cx="50" cy="140" r="14" fill="#FF5B00" opacity="0.2" className="animate-ping" />

              {/* Destination Doorstep Node */}
              <circle cx="450" cy="60" r="7" fill="#10B981" />
              <circle cx="450" cy="60" r="14" fill="#10B981" opacity="0.2" className="animate-ping" />
            </svg>

            {/* Hub Marker Label */}
            <div className="absolute left-4 bottom-4 bg-black/60 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/10 flex items-center space-x-1.5">
              <Store className="w-3.5 h-3.5 text-[#FF5B00]" />
              <span className="text-[11px] font-bold text-slate-200">
                {activeTelemetryTab === "kp-road" ? "Nai Basti Hub" : "Khanabal Station"}
              </span>
            </div>

            {/* Live Moving Rider Telemetry Badge */}
            <div className="absolute left-1/2 top-14 -translate-x-1/2 bg-gradient-to-r from-[#FF5B00] to-[#E04E00] text-white px-3 py-1.5 rounded-full shadow-lg shadow-[#FF5B00]/40 flex items-center space-x-2 text-xs font-black animate-bounce [animation-duration:2.5s]">
              <Bike className="w-3.5 h-3.5" />
              <span>Rider Shafi · 32 km/h</span>
            </div>

            {/* Destination Doorstep Marker */}
            <div className="absolute right-4 top-3 bg-emerald-950/80 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-emerald-500/30 flex items-center space-x-1.5">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-[11px] font-bold text-emerald-300">
                {activeTelemetryTab === "kp-road" ? "Ashajipora Doorstep" : "Mattan Chowk Doorstep"}
              </span>
            </div>

            {/* Floating Live Telemetry HUD Bar */}
            <div className="absolute bottom-3 right-4 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 flex items-center space-x-3 text-[10px] font-mono">
              <div className="flex items-center space-x-1.5 text-amber-400 font-bold">
                <Clock className="w-3 h-3" />
                <span>ETA: {formatMinSec(etaSeconds)}</span>
              </div>
              <span className="text-slate-600">|</span>
              <div className="flex items-center space-x-1 text-emerald-400">
                <Radio className="w-3 h-3 animate-pulse" />
                <span>GPS LOCK 99.4%</span>
              </div>
            </div>
          </div>

          {/* Description footer */}
          <div className="mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <p>
              Direct sub-second socket link connects your phone directly to the rider&apos;s turn-by-turn navigation.
            </p>
            <span className="shrink-0 font-bold text-[#FF5B00] inline-flex items-center space-x-1">
              <span>Zero refresh needed</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </span>
          </div>
        </motion.div>

        {/* =========================================================================
            BENTO CARD 2 (Col span 5): THE KASHMIRI MORNING RITUAL (1-TAP REORDER)
           ========================================================================= */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5 bg-gradient-to-br from-[#FFF8F2] via-white to-[#FFF4EB] dark:from-[#141824] dark:via-[#10141E] dark:to-[#17131B] rounded-[32px] p-6 sm:p-8 border border-orange-200/70 dark:border-slate-800 shadow-xl shadow-black/[0.03] dark:shadow-black/40 flex flex-col justify-between relative overflow-hidden group transform-gpu hover:border-orange-500/40 transition-colors"
        >
          <div className="relative z-10">
            <div className="flex items-center space-x-2.5 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 flex items-center justify-center shadow-inner">
                <Coffee className="w-5 h-5 stroke-[2.4]" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-[#FF5B00] block">
                  Morning Kandur Ritual
                </span>
                <h3 className="text-lg sm:text-xl font-black text-[#061838] dark:text-white tracking-tight">
                  1-Tap Daily Reorder
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium mb-4">
              Wake up to hot Kashmiri bakery and dairy. One tap replenishes your standard morning breakfast batch from your favorite local Kandur.
            </p>

            {/* Interactive Morning Essentials Stack */}
            <div className="space-y-2 mb-5">
              {/* Item 1 */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white dark:bg-[#1A2030] border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
                <div className="flex items-center space-x-2.5">
                  <span className="text-xl">🥖</span>
                  <div>
                    <h5 className="text-xs font-black text-[#061838] dark:text-white">
                      Fresh Kashmiri Lavas (4 pcs)
                    </h5>
                    <span className="text-[10px] text-slate-400 font-medium">Local Kandur Bake · Hot</span>
                  </div>
                </div>
                <span className="text-xs font-black text-[#061838] dark:text-white">₹40</span>
              </div>

              {/* Item 2 */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white dark:bg-[#1A2030] border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
                <div className="flex items-center space-x-2.5">
                  <span className="text-xl">🥛</span>
                  <div>
                    <h5 className="text-xs font-black text-[#061838] dark:text-white">
                      Amul Taaza Milk 500ml
                    </h5>
                    <span className="text-[10px] text-slate-400 font-medium">Chilled Pouch · Morning batch</span>
                  </div>
                </div>
                <span className="text-xs font-black text-[#061838] dark:text-white">₹33</span>
              </div>

              {/* Item 3 */}
              <div className="flex items-center justify-between p-2.5 rounded-2xl bg-white dark:bg-[#1A2030] border border-slate-200/80 dark:border-slate-700/60 shadow-xs">
                <div className="flex items-center space-x-2.5">
                  <span className="text-xl">🥚</span>
                  <div>
                    <h5 className="text-xs font-black text-[#061838] dark:text-white">
                      Farm Fresh Eggs (6 Pack)
                    </h5>
                    <span className="text-[10px] text-slate-400 font-medium">Daily Farm Direct</span>
                  </div>
                </div>
                <span className="text-xs font-black text-[#061838] dark:text-white">₹48</span>
              </div>
            </div>
          </div>

          {/* Interactive Reorder Action Button */}
          <div className="relative z-10 pt-2 border-t border-orange-200/60 dark:border-slate-800">
            <button
              type="button"
              onClick={handleReorderClick}
              disabled={reordered}
              className={`w-full py-3.5 px-4 rounded-2xl font-black text-xs transition-all duration-300 flex items-center justify-center space-x-2 shadow-md cursor-pointer active:scale-95 ${
                reordered
                  ? "bg-emerald-600 text-white shadow-emerald-500/20"
                  : "bg-gradient-to-r from-[#FF5B00] to-[#E04E00] text-white hover:shadow-lg hover:shadow-[#FF5B00]/30"
              }`}
            >
              {reordered ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white animate-scale-in" />
                  <span>Morning Batch Confirmed for 6:30 AM!</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 fill-white" />
                  <span>Tap to Test 1-Tap Reorder (₹121)</span>
                </>
              )}
            </button>
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 text-center block mt-2">
              Saved to your personal daily essentials slot. Reorder anytime in 1 tap.
            </span>
          </div>
        </motion.div>

        {/* =========================================================================
            BENTO CARD 3 (Col span 5): FAIR LOCAL PRICING GUARANTEE (NO GOUGING)
           ========================================================================= */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-5 bg-white dark:bg-[#10141E] rounded-[32px] p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-black/[0.03] dark:shadow-black/40 flex flex-col justify-between relative overflow-hidden group transform-gpu hover:border-emerald-500/40 transition-colors"
        >
          <div className="relative z-10">
            <div className="flex items-center space-x-2.5 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-inner">
                <ShieldCheck className="w-5 h-5 stroke-[2.4]" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 block">
                  Honest Local Commerce
                </span>
                <h3 className="text-lg sm:text-xl font-black text-[#061838] dark:text-white tracking-tight">
                  Zero Dark-Store Markup
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed font-medium mb-5">
              Unlike metropolitan quick apps that inflate prices by 15-25%, DASHIT matches the exact offline mandi and store prices in Anantnag.
            </p>

            {/* Price Match Comparison Meter */}
            <div className="bg-slate-50 dark:bg-[#161C2A] rounded-2xl p-4 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-500 dark:text-slate-400">Anantnag Offline Mandi MRP</span>
                <span className="font-mono font-bold text-slate-700 dark:text-slate-300">₹100</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-[#FF5B00] flex items-center space-x-1">
                  <span>DASHIT App Price</span>
                  <span className="text-[9px] bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-1.5 py-0.2 rounded font-black">MATCH</span>
                </span>
                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">₹100</span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full w-full rounded-full" />
              </div>
              <div className="pt-1 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                <span>Hidden Surge Fees</span>
                <span className="font-mono font-black text-emerald-600 dark:text-emerald-400">₹0.00</span>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
            <span className="flex items-center space-x-1.5">
              <Store className="w-3.5 h-3.5 text-[#FF5B00]" />
              <span>40+ Verified Local Vendors</span>
            </span>
            <span className="text-[11px] text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full">
              Fair Trade
            </span>
          </div>
        </motion.div>

        {/* =========================================================================
            BENTO CARD 4 (Col span 7): 15-SECOND LIGHTNING CHECKOUT FLOW
           ========================================================================= */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="lg:col-span-7 bg-white dark:bg-[#10141E] rounded-[32px] p-6 sm:p-8 border border-slate-200/90 dark:border-slate-800 shadow-xl shadow-black/[0.03] dark:shadow-black/40 flex flex-col justify-between relative overflow-hidden group transform-gpu hover:border-blue-500/40 transition-colors"
        >
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center shadow-inner">
                  <Gauge className="w-5 h-5 stroke-[2.4]" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 block">
                    Zero-Friction Ergonomics
                  </span>
                  <h3 className="text-lg sm:text-xl font-black text-[#061838] dark:text-white tracking-tight">
                    15-Second Mobile Checkout
                  </h3>
                </div>
              </div>

              {/* Speed benchmark badge */}
              <div className="hidden sm:flex items-center space-x-1.5 bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-xs font-black">
                <Flame className="w-3.5 h-3.5 text-[#FF5B00] fill-[#FF5B00]" />
                <span>3.4x Faster than Web</span>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed max-w-xl mb-6">
              Designed from scratch for one-handed thumb navigation. No multi-step forms, no cumbersome redirects.
            </p>

            {/* Interactive 3-Stage Progress Timeline */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 relative">
              {/* Step 1 */}
              <div className="bg-slate-50 dark:bg-[#161C2A] p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-[#FF5B00] text-white text-[10px] font-black flex items-center justify-center">
                    1
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">0s - 4s</span>
                </div>
                <h5 className="text-xs font-black text-[#061838] dark:text-white mb-0.5">
                  Smart Instant Add
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Instant search suggestions with 1-tap cart buttons.
                </p>
              </div>

              {/* Step 2 */}
              <div className="bg-slate-50 dark:bg-[#161C2A] p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center">
                    2
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">4s - 10s</span>
                </div>
                <h5 className="text-xs font-black text-[#061838] dark:text-white mb-0.5">
                  Saved Doorstep Pin
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Exact house GPS pinpointed without re-typing address.
                </p>
              </div>

              {/* Step 3 */}
              <div className="bg-slate-50 dark:bg-[#161C2A] p-3.5 rounded-2xl border border-slate-200/70 dark:border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center">
                    3
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">10s - 15s</span>
                </div>
                <h5 className="text-xs font-black text-[#061838] dark:text-white mb-0.5">
                  1-Tap COD or UPI
                </h5>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                  Instant order confirmation with zero payment lag.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium">
            <span className="flex items-center space-x-1.5">
              <Smartphone className="w-3.5 h-3.5 text-[#FF5B00]" />
              <span>Optimized for both high-end and budget smartphones</span>
            </span>
            <span className="font-mono text-xs font-bold text-slate-700 dark:text-slate-300">
              Avg: 14.8 seconds
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
