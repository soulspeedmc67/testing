import React, { useState, useRef } from "react";
import { Wallet, Search, Loader2, Check, User } from "lucide-react";
import { findCustomers, readWallet, giveWalletMoney, WALLET_GRANT_MAX } from "../../lib/walletAdmin";

const rupees = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

/**
 * Add money to one customer's wallet: type their mobile number, email or name,
 * pick them, enter the amount and confirm. The customer's apps show it at once.
 * Every addition is kept as a record (src/lib/walletAdmin.js).
 */
export default function WalletGrantCard({ darkMode = false, showToast }) {
  const [text, setText] = useState("");
  const [results, setResults] = useState(null);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState(null);
  const [wallet, setWallet] = useState(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const typing = useRef(0);

  const input = `w-full text-xs font-bold px-3 py-2 rounded-xl border outline-none ${
    darkMode ? "bg-[#1A1D26] border-zinc-700 text-white focus:border-[#FF5B00]" : "bg-slate-50 border-slate-200 text-slate-900 focus:border-[#FF5B00]"
  }`;
  const button =
    "inline-flex items-center justify-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer";

  const search = async (e) => {
    e?.preventDefault();
    const run = ++typing.current;
    setMessage("");
    setPicked(null);
    setSearching(true);
    try {
      const hits = await findCustomers(text);
      if (run === typing.current) setResults(hits);
    } catch (err) {
      if (run === typing.current) {
        setResults([]);
        setMessage("Couldn't search. Check your connection and that you're signed in as the owner.");
      }
    } finally {
      if (run === typing.current) setSearching(false);
    }
  };

  const pick = async (hit) => {
    setPicked(hit);
    setAmount("");
    setNote("");
    setMessage("");
    try {
      setWallet(await readWallet(hit.uid));
    } catch (e) {
      setWallet(null);
    }
  };

  const give = async (e) => {
    e.preventDefault();
    if (!picked || saving) return;
    const whole = Math.floor(Number(amount));
    const who = picked.name || picked.mobile || picked.email;
    if (!window.confirm(`Add ${rupees(whole)} to ${who}'s wallet?`)) return;
    setSaving(true);
    try {
      const added = await giveWalletMoney(picked, whole, note);
      setWallet(await readWallet(picked.uid));
      setAmount("");
      setNote("");
      setMessage(`Done. ${rupees(added)} added to ${who}'s wallet. They see it in the app now.`);
      showToast?.(`${rupees(added)} added to ${who}'s wallet`);
    } catch (err) {
      setMessage(err?.message || "It couldn't be added. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={`rounded-2xl border p-5 space-y-4 ${darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"}`}>
      <div className="flex items-center space-x-2">
        <Wallet className="w-5 h-5 text-[#FF5B00]" />
        <h3 className="font-black text-sm text-slate-900 dark:text-white">Add money to a customer&apos;s wallet</h3>
      </div>
      <p className="text-xs text-slate-500 dark:text-zinc-400">
        Find the customer by their mobile number, email or name, then put money in their wallet. It comes off their next orders
        by itself, on top of any welcome credit, and it works even while the welcome credit is off.
      </p>

      <form onSubmit={search} className="flex gap-2">
        <div className="relative grow">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Mobile number, email or name"
            className={`${input} pl-9`}
            aria-label="Find a customer"
          />
        </div>
        <button type="submit" disabled={searching || text.trim().length < 2} className={`${button} bg-[#FF5B00] hover:bg-[#E04E00] text-white`}>
          {searching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : "Find"}
        </button>
      </form>

      {results && results.length === 0 && !searching && (
        <p className="text-xs text-slate-500 dark:text-zinc-400">
          No customer found. A mobile number works with or without +91; a name has to start the way it is saved.
        </p>
      )}

      {results && results.length > 0 && !picked && (
        <ul className={`rounded-xl border divide-y overflow-hidden ${darkMode ? "border-zinc-800 divide-zinc-800" : "border-slate-200 divide-slate-100"}`}>
          {results.map((r) => (
            <li key={r.uid}>
              <button type="button" onClick={() => pick(r)} className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer">
                <span className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-slate-500" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-black text-slate-900 dark:text-white truncate">{r.name || "No name"}</span>
                  <span className="block text-[11px] text-slate-500 dark:text-zinc-400 truncate">{[r.mobile, r.email].filter(Boolean).join(" · ") || r.uid}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {picked && (
        <form onSubmit={give} className="space-y-3 rounded-xl border border-slate-200 dark:border-zinc-800 p-4">
          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">{picked.name || "No name"}</p>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">{[picked.mobile, picked.email].filter(Boolean).join(" · ")}</p>
            {wallet && (
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                Added so far: {rupees(wallet.bonus)}. Spent: {rupees(wallet.used)}.
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="grant-amount" className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-1">Amount to add (₹)</label>
              <input id="grant-amount" type="number" inputMode="numeric" min="1" max={WALLET_GRANT_MAX} step="1" value={amount} onChange={(e) => setAmount(e.target.value)} className={input} placeholder="50" />
            </div>
            <div>
              <label htmlFor="grant-note" className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-1">Note (only you see it)</label>
              <input id="grant-note" type="text" maxLength={120} value={note} onChange={(e) => setNote(e.target.value)} className={input} placeholder="e.g. late order, sorry" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button type="submit" disabled={saving || !(Number(amount) >= 1)} className={`${button} bg-emerald-600 hover:bg-emerald-700 text-white`}>
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Add to wallet
            </button>
            <button type="button" onClick={() => { setPicked(null); setWallet(null); }} className={`${button} border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300`}>
              Choose someone else
            </button>
          </div>
        </form>
      )}

      {message && <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{message}</p>}
    </div>
  );
}
