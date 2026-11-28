import React, { useCallback, useEffect, useState } from "react";
import { BellRing, RefreshCw, Send, X, PackageCheck, PackageX } from "lucide-react";
import AdminSheet from "./AdminSheet";
import { getFirebaseAuth } from "../../lib/firebase";

const ENDPOINT = "https://dashit.co.in/api/restock/list.php";

/** Calls restock/list.php as the signed-in staff member. */
async function callRestock(action, productId) {
  const user = getFirebaseAuth()?.currentUser;
  if (!user) throw new Error("Please sign in again.");
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: await user.getIdToken(), action, productId }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

const ago = (seconds) => {
  if (!seconds) return "";
  const mins = Math.max(0, Math.round((Date.now() / 1000 - seconds) / 60));
  if (mins < 60) return `${mins || 1} min ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? "yesterday" : `${days} days ago`;
};

/**
 * "Restock requests": the out-of-stock items shoppers tapped "Notify me" on
 * (website and both apps), most wanted first, so the owner knows what to buy.
 * Once an item has stock again, "Tell them it's back" sends everyone who asked
 * a notification; "Remove" closes the requests without one.
 * Same screen as the iPhone admin app (AdminRestockView.swift).
 */
export default function RestockRequestsView({ darkMode = false, showToast, onNavigateTab }) {
  const [items, setItems] = useState(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(null); // { item, action: "notify" | "dismiss" }
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await callRestock("list");
      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch (e) {
      setError(e.message);
      setItems((prev) => prev || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const run = async () => {
    if (!confirm) return;
    setWorking(true);
    setError("");
    try {
      const data = await callRestock(confirm.action, confirm.item.productId);
      if (confirm.action === "notify") {
        const n = data.sent || 0;
        showToast?.(n === 0 ? "Closed. None of them has the app's notifications on." : `Told ${n} phone${n === 1 ? "" : "s"} it's back`);
      } else {
        showToast?.("Removed from the list");
      }
      setConfirm(null);
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setWorking(false);
    }
  };

  const card = darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs";
  const muted = darkMode ? "text-zinc-400" : "text-slate-500";
  const strong = darkMode ? "text-white" : "text-slate-900";
  const ghost = darkMode ? "border-zinc-800 text-zinc-300 hover:bg-zinc-800" : "border-slate-200 text-slate-600 hover:bg-slate-50";

  return (
    <div className="space-y-4 mt-4">
      <div className={`rounded-2xl p-5 border flex flex-wrap items-center justify-between gap-3 ${card}`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-[#FF5B00]/10 flex items-center justify-center shrink-0">
            <BellRing className="w-5 h-5 text-[#FF5B00]" />
          </div>
          <div className="min-w-0">
            <h2 className={`font-black text-base ${strong}`}>Restock requests</h2>
            <p className={`text-xs ${muted}`}>
              {items === null
                ? "Checking…"
                : items.length === 0
                  ? "Nobody is waiting for an item right now."
                  : `${items.length} item${items.length === 1 ? "" : "s"} wanted · ${total} request${total === 1 ? "" : "s"} from shoppers who tapped "Notify me".`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-black disabled:opacity-50 cursor-pointer ${ghost}`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
        </button>
      </div>

      {error && !confirm && <p className="text-sm font-semibold text-red-500">{error}</p>}

      {items && items.length > 0 && (
        <ul className="space-y-2.5">
          {items.map((item) => (
            <li key={item.productId} className={`rounded-2xl border p-3.5 flex flex-wrap sm:flex-nowrap items-center gap-3 ${card}`}>
              <div className="w-14 h-14 rounded-xl bg-white border border-slate-100 overflow-hidden shrink-0 flex items-center justify-center">
                {item.img ? (
                  <img src={item.img} alt="" className="w-full h-full object-contain" loading="lazy" />
                ) : (
                  <span className="text-lg font-black text-slate-300">{(item.name || "?").slice(0, 1)}</span>
                )}
              </div>
              <div className="flex-1 min-w-[160px]">
                <p className={`text-sm font-black leading-snug ${strong}`}>{item.name}</p>
                <p className={`text-[11px] font-semibold ${muted}`}>
                  {item.unit ? `${item.unit} · ` : ""}last asked {ago(item.lastAt)}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded-lg bg-[#FF5B00]/10 text-[#FF5B00] text-[11px] font-black">
                    {item.count} {item.count === 1 ? "person wants" : "people want"} it
                  </span>
                  {item.inStock ? (
                    <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-black inline-flex items-center gap-1">
                      <PackageCheck className="w-3 h-3" /> In stock now{item.stock != null ? ` (${item.stock})` : ""}
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 text-[11px] font-black inline-flex items-center gap-1">
                      <PackageX className="w-3 h-3" /> Still out of stock
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                {item.inStock ? (
                  <button
                    type="button"
                    onClick={() => setConfirm({ item, action: "notify" })}
                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-black text-white bg-[#FF5B00] hover:bg-[#E04800] cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" /> Tell them it&apos;s back
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onNavigateTab?.("inventory")}
                    className={`flex-1 sm:flex-none px-3.5 py-2.5 rounded-xl border text-xs font-black cursor-pointer ${ghost}`}
                  >
                    Add stock
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setConfirm({ item, action: "dismiss" })}
                  aria-label={`Remove ${item.name} from the list`}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-black cursor-pointer ${ghost}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AdminSheet open={Boolean(confirm)} onClose={() => !working && setConfirm(null)} labelledBy="restock-confirm-title" darkMode={darkMode}>
        {confirm && (
          <div className="px-5 pt-2 pb-5 space-y-4">
            <h3 id="restock-confirm-title" className={`text-lg font-black ${strong}`}>
              {confirm.action === "notify"
                ? `Tell ${confirm.item.count} ${confirm.item.count === 1 ? "person" : "people"} ${confirm.item.name} is back?`
                : `Remove ${confirm.item.name} from the list?`}
            </h3>
            <p className={`text-sm ${muted}`}>
              {confirm.action === "notify"
                ? "Each gets one notification right away: \"Back in stock\". The requests are then closed."
                : "Nobody is told anything. Do this for an item the shop won't stock again."}
            </p>
            {error && <p className="text-sm font-semibold text-red-500">{error}</p>}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirm(null)}
                disabled={working}
                className={`flex-1 py-3 rounded-xl text-sm font-bold border cursor-pointer ${ghost}`}
              >
                Not yet
              </button>
              <button
                type="button"
                onClick={run}
                disabled={working}
                className="flex-1 py-3 rounded-xl text-sm font-black text-white bg-[#FF5B00] hover:bg-[#E04800] disabled:opacity-60 cursor-pointer"
              >
                {working ? "Working…" : confirm.action === "notify" ? "Send now" : "Remove"}
              </button>
            </div>
          </div>
        )}
      </AdminSheet>
    </div>
  );
}
