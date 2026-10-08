import React, { useState } from "react";
import { RotateCcw, Loader2 } from "lucide-react";
import { clearSavedCopies, rememberCacheVersion } from "../../lib/cacheRefresh";

const when = (ms) =>
  new Date(ms).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

/**
 * "Refresh the website for everyone": saves a new cacheVersion on config/store.
 * Every open website that hears it drops the copies it saved and loads fresh
 * (src/lib/cacheRefresh.js). This console does the same straight away.
 */
export default function RefreshWebsiteCard({ storeConfig = null, onSave, darkMode = false }) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const last = Number(storeConfig?.cacheVersion) || 0;

  const refresh = async () => {
    if (!onSave || busy || done) return;
    setBusy(true);
    const version = Date.now();
    // This browser is on the new version already, so it isn't asked to reload twice.
    rememberCacheVersion(version);
    try {
      await onSave({ cacheVersion: version }, "Done. Every open website loads fresh from now.");
      clearSavedCopies();
      setDone(true);
      setTimeout(() => window.location.reload(), 1500);
    } catch (e) {
      // Not saved: the console shows why, and nothing was refreshed.
      rememberCacheVersion(last || null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className={`md:col-span-2 rounded-2xl border p-5 space-y-3 transition-colors ${
        darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
      }`}
    >
      <div className="flex items-center space-x-2">
        <RotateCcw className="w-5 h-5 text-[#FF5B00]" />
        <h3 className="font-black text-sm text-slate-900 dark:text-white">Refresh the website for everyone</h3>
      </div>
      <p className="text-xs text-slate-500 dark:text-zinc-400">
        Press this if customers see old prices, old fees or an old screen. Every open website drops what it had saved
        and loads fresh the next time the customer moves to another page or comes back to it. Carts, addresses and
        sign-ins are kept. It does not reach the phone apps.
      </p>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[11px] text-slate-500 dark:text-zinc-400">
          {done
            ? "Done. This screen reloads in a moment."
            : last > 0
            ? `Last refreshed ${when(last)}.`
            : "Not used yet."}
        </p>
        <button
          type="button"
          onClick={refresh}
          disabled={busy || done}
          className="inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap bg-[#FF5B00] hover:bg-[#E04E00] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
          Refresh the website
        </button>
      </div>
    </div>
  );
}
