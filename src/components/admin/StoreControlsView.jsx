import React, { useState } from "react";
import {
  Store,
  Power,
  ShieldAlert,
  Volume2,
  Bell,
  CheckCircle2,
  AlertTriangle,
  Moon,
  Boxes,
  CloudRain,
  Zap,
  Wrench,
  Edit3,
  X
} from "lucide-react";

export default function StoreControlsView({
  isStoreOpen = true,
  currentCloseReason = "",
  onToggleStoreClick,
  codBlacklist = [],
  onAddBlacklist,
  onRemoveBlacklist,
  soundEnabled = true,
  onToggleSound,
  onTestChime,
  darkMode = false,
}) {
  const [newBlacklistNumber, setNewBlacklistNumber] = useState("");

  const handleBlacklistSubmit = (e) => {
    e.preventDefault();
    const clean = newBlacklistNumber.replace(/\D/g, "");
    if (clean.length === 10) {
      onAddBlacklist(clean);
      setNewBlacklistNumber("");
    } else {
      alert("Please enter a valid 10-digit Indian mobile number.");
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* 1. Store Operations Card */}
      <div
        className={`rounded-2xl border p-5 space-y-4 transition-colors ${
          darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
        }`}
      >
        <div className="flex items-center space-x-2">
          <Store className="w-5 h-5 text-[#FF5B00]" />
          <h3 className="font-black text-sm text-slate-900 dark:text-white">
            Store Operations
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-zinc-400">
          Control live customer order acceptance for the Anantnag hub. When paused, customers see a store-closed notice with reopening estimates.
        </p>

        {/* Neutral panel: the state is carried by one dot and a sentence, and the
            button says what it will do rather than restating the state. */}
        <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-4">
          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center space-x-2">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isStoreOpen ? "bg-emerald-500" : "bg-rose-500"
                }`}
              />
              <span className="font-semibold text-sm text-slate-900 dark:text-white">
                {isStoreOpen ? "Store is open" : "Store is closed"}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 pl-4">
              {isStoreOpen
                ? "Customers can place orders right now."
                : `Customers see: "${currentCloseReason || 'Reopening shortly'}"`}
            </p>
          </div>

          <button
            type="button"
            onClick={onToggleStoreClick}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 whitespace-nowrap ${
              isStoreOpen
                ? "border border-slate-300 dark:border-zinc-700 text-slate-800 dark:text-zinc-100 hover:bg-slate-50 dark:hover:bg-zinc-800"
                : "bg-[#FF5B00] hover:bg-[#E04E00] text-white"
            }`}
          >
            {isStoreOpen ? "Close store" : "Open store"}
          </button>
        </div>
      </div>

      {/* 2. Audio Chime & Notifications Alert */}
      <div
        className={`rounded-2xl border p-5 space-y-4 transition-colors ${
          darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
        }`}
      >
        <div className="flex items-center space-x-2">
          <Volume2 className="w-5 h-5 text-amber-500" />
          <h3 className="font-black text-sm text-slate-900 dark:text-white">
            Audio Chime & Live Order Alerts
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-zinc-400">
          A sound plays the moment a new order arrives, so pickers hear it straight away.
        </p>

        <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200/50 bg-slate-50 dark:bg-zinc-800/40">
          <div>
            <span className="font-black text-xs text-slate-900 dark:text-white block">
              Audio Chime Status: {soundEnabled ? "Active & Sounding" : "Muted"}
            </span>
            <span className="text-[11px] text-slate-400 font-medium">
              Web Audio synthesizer chiming upon order placed
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onToggleSound}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                soundEnabled
                  ? "bg-slate-200 dark:bg-zinc-700 text-slate-800 dark:text-zinc-100"
                  : "bg-amber-500/20 text-amber-500 border-amber-500/30"
              }`}
            >
              {soundEnabled ? "Mute Chime" : "Unmute Chime"}
            </button>
            <button
              type="button"
              onClick={onTestChime}
              className="bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700 px-3.5 py-1.5 rounded-xl text-xs font-black shadow-xs cursor-pointer transition-colors"
            >
              Test Chime
            </button>
          </div>
        </div>
      </div>

      {/* 3. COD Fraud Prevention Blacklist */}
      <div
        className={`md:col-span-2 rounded-2xl border p-5 space-y-4 transition-colors ${
          darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
        }`}
      >
        <div className="flex items-center space-x-2">
          <ShieldAlert className="w-5 h-5 text-rose-500" />
          <h3 className="font-black text-sm text-slate-900 dark:text-white">
            COD Fraud Prevention Blacklist
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-zinc-400">
          Prevent bogus orders or habitual COD delivery refusals. Customers with these phone numbers cannot choose Cash on Delivery at checkout.
        </p>

        <form onSubmit={handleBlacklistSubmit} className="flex items-center space-x-2 max-w-md">
          <input
            type="tel"
            maxLength={10}
            placeholder="10-digit customer mobile number"
            value={newBlacklistNumber}
            onChange={(e) => setNewBlacklistNumber(e.target.value.replace(/\D/g, ""))}
            className={`flex-1 text-xs font-bold px-3 py-2 rounded-xl border outline-none ${
              darkMode
                ? "bg-[#1A1D26] border-zinc-700 text-white focus:border-rose-500"
                : "bg-slate-50 border-slate-200 text-slate-900 focus:border-rose-500"
            }`}
          />
          <button
            type="submit"
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-black px-4 py-2 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            Block Phone
          </button>
        </form>

        <div className="flex flex-wrap gap-2 pt-1">
          {codBlacklist.length === 0 ? (
            <span className="text-xs text-slate-400 italic">No numbers blacklisted</span>
          ) : (
            codBlacklist.map((num) => (
              <span
                key={num}
                className="inline-flex items-center space-x-2 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-mono font-bold px-3 py-1 rounded-xl"
              >
                <span>+91 {num}</span>
                <button
                  type="button"
                  onClick={() => onRemoveBlacklist(num)}
                  className="text-rose-400 hover:text-rose-600 font-black cursor-pointer"
                  title="Remove from blacklist"
                >
                  ×
                </button>
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
