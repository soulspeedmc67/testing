import React, { useCallback, useEffect, useState } from "react";
import { Megaphone, Send, CheckCircle2, AlertTriangle } from "lucide-react";
import AdminSheet from "./AdminSheet";
import { getFirebaseAuth } from "../../lib/firebase";

const ENDPOINT = "https://dashit.co.in/api/push/broadcast.php";
const TITLE_MAX = 60;
const TEXT_MAX = 180;

/** Calls broadcast.php as the signed-in owner. */
async function callBroadcast(payload) {
  const user = getFirebaseAuth()?.currentUser;
  if (!user) throw new Error("Please sign in again.");
  const idToken = await user.getIdToken();
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken, ...payload }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data.error || "Something went wrong."), { data });
  return data;
}

function timeAgo(seconds) {
  const diff = Math.max(0, Date.now() / 1000 - seconds);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h ago`;
  return new Date(seconds * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/**
 * "Notify customers": one message to every shopper's phone (Android and
 * iPhone). Write it, see how it will look, confirm, send.
 */
export default function NotifyCustomersView({ darkMode = false, showToast }) {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [history, setHistory] = useState([]);
  const [perDay, setPerDay] = useState(10);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState("");

  const loadHistory = useCallback(async () => {
    try {
      const data = await callBroadcast({ action: "history" });
      setHistory(data.history || []);
      if (data.perDay) setPerDay(data.perDay);
    } catch (e) {
      // The list is a nicety; sending still works without it.
    }
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const sentToday = history.filter((b) => b.sent && b.at > Date.now() / 1000 - 86400).length;
  const left = Math.max(0, perDay - sentToday);
  const canSend = title.trim() !== "" && text.trim() !== "" && left > 0 && !isSending;

  const send = async () => {
    setIsSending(true);
    setError("");
    try {
      const data = await callBroadcast({ title: title.trim(), text: text.trim() });
      setHistory(data.history || []);
      setTitle("");
      setText("");
      setIsConfirmOpen(false);
      showToast?.("Sent to all customers");
    } catch (e) {
      setError(e.message);
      if (e.data?.history) setHistory(e.data.history);
    } finally {
      setIsSending(false);
    }
  };

  const card = darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs";
  const subtle = darkMode ? "text-zinc-400" : "text-slate-500";
  const inputCls = `w-full px-3.5 py-3 rounded-xl text-sm border outline-none focus:border-[#FF5B00] transition-colors ${
    darkMode
      ? "bg-[#0D0E12] border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
      : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
  }`;

  return (
    <div className="space-y-4 max-w-2xl">
      <div className={`rounded-2xl p-5 border space-y-1 ${card}`}>
        <div className="flex items-center space-x-2">
          <Megaphone className="w-5 h-5 text-[#FF5B00]" />
          <h2 className="font-black text-base text-slate-900 dark:text-white">Notify customers</h2>
        </div>
        <p className={`text-xs ${subtle}`}>
          Sends one notification to every customer who has the DASHit app, on Android and iPhone. Good for offers, new
          items or shop news. You can send {perDay} a day; {left} left today.
        </p>
      </div>

      <div className={`rounded-2xl p-5 border space-y-4 ${card}`}>
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Title</span>
          <input
            value={title}
            maxLength={TITLE_MAX}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Fresh apples are in"
            className={inputCls}
          />
          <span className={`block text-right text-[11px] ${subtle}`}>{title.length}/{TITLE_MAX}</span>
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Message</span>
          <textarea
            value={text}
            maxLength={TEXT_MAX}
            rows={3}
            onChange={(e) => setText(e.target.value)}
            placeholder="Kashmiri apples at ₹120 a kilo today only. Delivered in minutes."
            className={`${inputCls} resize-none`}
          />
          <span className={`block text-right text-[11px] ${subtle}`}>{text.length}/{TEXT_MAX}</span>
        </label>

        {/* How it shows on a phone */}
        <div className="space-y-1.5">
          <span className={`text-[11px] font-bold uppercase tracking-wider ${subtle}`}>Preview</span>
          <div className={`rounded-2xl p-3.5 flex gap-3 ${darkMode ? "bg-zinc-800/70" : "bg-slate-100"}`}>
            <img src="/dashit-mark-white.png" alt="" className="w-9 h-9 rounded-lg bg-[#061838] p-1.5 shrink-0" />
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">{title.trim() || "Title"}</p>
              <p className={`text-[13px] leading-snug ${darkMode ? "text-zinc-300" : "text-slate-600"}`}>
                {text.trim() || "Your message"}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          disabled={!canSend}
          onClick={() => setIsConfirmOpen(true)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black text-white bg-[#FF5B00] hover:bg-[#E04800] disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
        >
          <Send className="w-4 h-4" />
          Send to all customers
        </button>
        {left === 0 && (
          <p className={`text-xs text-center ${subtle}`}>You've sent {perDay} today. You can send more tomorrow.</p>
        )}
      </div>

      {history.length > 0 && (
        <div className={`rounded-2xl p-5 border space-y-3 ${card}`}>
          <h3 className="text-sm font-black text-slate-900 dark:text-white">Sent recently</h3>
          <ul className="space-y-3">
            {history.map((b) => (
              <li key={`${b.at}-${b.title}`} className="flex gap-3">
                {b.sent ? (
                  <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
                ) : (
                  <AlertTriangle className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" />
                )}
                <div className="min-w-0">
                  <p className="text-[13px] font-bold text-slate-900 dark:text-white">{b.title}</p>
                  <p className={`text-[13px] ${darkMode ? "text-zinc-300" : "text-slate-600"}`}>{b.text}</p>
                  <p className={`text-[11px] mt-0.5 ${subtle}`}>
                    {timeAgo(b.at)}
                    {b.sent ? "" : " · didn't go out"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <AdminSheet open={isConfirmOpen} onClose={() => !isSending && setIsConfirmOpen(false)} labelledBy="notify-confirm-title" darkMode={darkMode}>
        <div className="px-5 pt-2 pb-5 space-y-4">
          <h3 id="notify-confirm-title" className="text-lg font-black text-slate-900 dark:text-white">
            Send to every customer?
          </h3>
          <p className={`text-sm ${subtle}`}>
            &ldquo;{title.trim()}&rdquo; goes to everyone with the DASHit app right away. It can&apos;t be taken back.
          </p>
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
