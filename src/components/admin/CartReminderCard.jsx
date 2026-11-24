import React, { useCallback, useEffect, useState } from "react";
import { ShoppingCart, Send } from "lucide-react";
import AdminSheet from "./AdminSheet";
import { getFirebaseAuth } from "../../lib/firebase";

const ENDPOINT = "https://dashit.co.in/api/push/cart-remind.php";

/** Calls cart-remind.php as the signed-in owner ("preview" or "send"). */
async function callCartRemind(action) {
  const user = getFirebaseAuth()?.currentUser;
  if (!user) throw new Error("Please sign in again.");
  const idToken = await user.getIdToken();
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken, action }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || "Something went wrong."), { data });
  return data;
}

/**
 * "Cart reminders": "Your cart is waiting" to every shopper who left items in
 * their cart, the same as the iPhone admin app (AdminCartRemindView.swift).
 * The server sends only between 9 AM and 9 PM, skips anyone reminded in the
 * last 20 hours and allows two sends a day.
 */
export default function CartReminderCard({ darkMode = false, showToast }) {
  const [waiting, setWaiting] = useState(null);
  const [history, setHistory] = useState([]);
  const [perDay, setPerDay] = useState(2);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const apply = (data) => {
    if (typeof data?.waiting === "number") setWaiting(data.waiting);
    if (Array.isArray(data?.history)) setHistory(data.history);
    if (data?.perDay) setPerDay(data.perDay);
  };

  const load = useCallback(async () => {
    try {
      apply(await callCartRemind("preview"));
    } catch (e) {
      apply(e.data);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const sentToday = history.filter((h) => h.sent > 0 && h.at > Date.now() / 1000 - 86400).length;
  const left = Math.max(0, perDay - sentToday);
  const canSend = (waiting || 0) > 0 && left > 0 && !isSending;

  const send = async () => {
    setIsSending(true);
    setError("");
    try {
      const data = await callCartRemind("send");
      apply(data);
      setIsConfirmOpen(false);
      const n = data.sent || 0;
      showToast?.(n === 0 ? "Nobody to remind right now" : `Sent to ${n} shopper${n === 1 ? "" : "s"}`);
    } catch (e) {
      setError(e.message);
      apply(e.data);
    } finally {
      setIsSending(false);
    }
  };

  const card = darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs";
  const subtle = darkMode ? "text-zinc-400" : "text-slate-500";

  return (
    <div className={`rounded-2xl p-5 border space-y-4 ${card}`}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#FF5B00]/10 flex items-center justify-center shrink-0">
          <ShoppingCart className="w-5 h-5 text-[#FF5B00]" />
        </div>
        <div className="min-w-0">
          <h2 className="font-black text-base text-slate-900 dark:text-white">Cart reminders</h2>
          <p className={`text-xs ${subtle}`}>
            {waiting === null
              ? "Checking carts…"
              : waiting === 0
                ? "Nobody has a cart waiting right now."
                : `${waiting} shopper${waiting === 1 ? " has" : "s have"} items waiting in their cart.`}
          </p>
        </div>
      </div>
      <p className={`text-xs ${subtle}`}>
        Sends &ldquo;Your cart is waiting&rdquo; with how many items they left. Only between 9 AM and 9 PM, never to someone
        reminded in the last 20 hours. {left} of {perDay} left today.
      </p>
      <button
        type="button"
        disabled={!canSend}
        onClick={() => setIsConfirmOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black text-white bg-[#FF5B00] hover:bg-[#E04800] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
      >
        <Send className="w-4 h-4" />
        Send cart reminder
      </button>
      {error && !isConfirmOpen && <p className="text-sm font-semibold text-red-500">{error}</p>}

      <AdminSheet open={isConfirmOpen} onClose={() => !isSending && setIsConfirmOpen(false)} labelledBy="cart-remind-title" darkMode={darkMode}>
        <div className="px-5 pt-2 pb-5 space-y-4">
          <h3 id="cart-remind-title" className="text-lg font-black text-slate-900 dark:text-white">
            Remind {waiting} shopper{waiting === 1 ? "" : "s"} about their cart?
          </h3>
          <p className={`text-sm ${subtle}`}>Each gets one notification right away. It can&apos;t be taken back.</p>
          {error && <p className="text-sm font-semibold text-red-500">{error}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setIsConfirmOpen(false)}
              disabled={isSending}
              className={`flex-1 py-3 rounded-xl text-sm font-bold border cursor-pointer ${
                darkMode ? "border-zinc-800 text-zinc-300" : "border-slate-200 text-slate-600"
              }`}
            >
              Not yet
            </button>
            <button
              type="button"
              onClick={send}
              disabled={isSending}
              className="flex-1 py-3 rounded-xl text-sm font-black text-white bg-[#FF5B00] hover:bg-[#E04800] disabled:opacity-60 cursor-pointer"
            >
              {isSending ? "Sending…" : "Send now"}
            </button>
          </div>
        </div>
      </AdminSheet>
    </div>
  );
}
