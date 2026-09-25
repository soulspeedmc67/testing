import React, { useEffect, useState } from "react";
import { Check, Plus, User, Truck } from "lucide-react";
import AdminSheet from "./AdminSheet";
import { SELF_DISTRIBUTOR_NAME } from "../../lib/db";

const NEW = "__new__";

/**
 * "Who did you get this stock from?" — Myself, a distributor added before, or
 * a new one (saved on the spot). Calls onConfirm with the chosen name.
 */
export default function StockSourceSheet({
  open,
  distributors = [],
  initial = SELF_DISTRIBUTOR_NAME,
  subtitle,
  onAddDistributor,
  onConfirm,
  onClose,
  darkMode = false,
}) {
  const [choice, setChoice] = useState(initial);
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setChoice(initial || SELF_DISTRIBUTOR_NAME);
    setNewName("");
    setNewPhone("");
  }, [open, initial]);

  const others = distributors.filter((d) => !d.isSelf && d.name);
  const canContinue = choice !== NEW || newName.trim().length > 0;

  const handleContinue = async () => {
    if (!canContinue || isSaving) return;
    if (choice !== NEW) {
      onConfirm(choice);
      return;
    }
    const name = newName.trim();
    // Typed a name that's already on the list: use that one.
    const existing = others.find((d) => d.name.toLowerCase() === name.toLowerCase());
    if (existing) {
      onConfirm(existing.name);
      return;
    }
    setIsSaving(true);
    try {
      if (onAddDistributor) await onAddDistributor({ name, phone: newPhone.trim() });
    } finally {
      setIsSaving(false);
    }
    onConfirm(name);
  };

  const rowCls = (selected) =>
    `w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl border text-left transition-colors cursor-pointer ${
      selected
        ? "border-emerald-500 bg-emerald-500/10"
        : darkMode
        ? "border-zinc-800 hover:border-zinc-700"
        : "border-slate-200 hover:border-slate-300"
    }`;
  const inputCls = `w-full px-3.5 py-3 rounded-xl text-sm border outline-none focus:border-emerald-500 transition-colors ${
    darkMode
      ? "bg-[#0D0E12] border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
      : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
  }`;
  const subtle = darkMode ? "text-zinc-400" : "text-slate-500";

  const Tick = ({ on }) => (
    <span
      className={`ml-auto w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${
        on ? "border-emerald-500 bg-emerald-500" : darkMode ? "border-zinc-700" : "border-slate-300"
      }`}
    >
      {on && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
    </span>
  );

  return (
    <AdminSheet open={open} onClose={() => !isSaving && onClose()} labelledBy="stock-source-title" darkMode={darkMode}>
      <div className="px-5 pt-2 pb-3">
        <h3 id="stock-source-title" className="text-lg font-black text-slate-900 dark:text-white leading-tight">
          Who did you get this stock from?
        </h3>
        <p className={`text-xs mt-1 ${subtle}`}>
          {subtitle || "Every item in this file will be marked as from them."}
        </p>
      </div>

      <div className="px-5 pb-2 space-y-2 overflow-y-auto">
        <button type="button" onClick={() => setChoice(SELF_DISTRIBUTOR_NAME)} className={rowCls(choice === SELF_DISTRIBUTOR_NAME)}>
          <span className="w-9 h-9 shrink-0 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <User className="w-4 h-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-sm font-bold text-slate-900 dark:text-white">Myself</span>
            <span className={`block text-xs ${subtle}`}>My own stock</span>
          </span>
          <Tick on={choice === SELF_DISTRIBUTOR_NAME} />
        </button>

        {others.length > 0 && (
          <>
            <p className={`pt-2 px-1 text-[11px] font-bold ${subtle}`}>Distributors you added</p>
            {others.map((d) => (
              <button key={d.id || d.name} type="button" onClick={() => setChoice(d.name)} className={rowCls(choice === d.name)}>
                <span
                  className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${
                    darkMode ? "bg-zinc-800 text-zinc-300" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  <Truck className="w-4 h-4" />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold text-slate-900 dark:text-white truncate">{d.name}</span>
                  {d.phone && <span className={`block text-xs ${subtle}`}>{d.phone}</span>}
                </span>
                <Tick on={choice === d.name} />
              </button>
            ))}
          </>
        )}

        <div className={`${rowCls(choice === NEW)} !block`}>
          <button type="button" onClick={() => setChoice(NEW)} className="w-full flex items-center gap-3 text-left cursor-pointer">
            <span
              className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${
                darkMode ? "bg-zinc-800 text-zinc-300" : "bg-slate-100 text-slate-600"
              }`}
            >
              <Plus className="w-4 h-4" />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-slate-900 dark:text-white">New distributor</span>
              <span className={`block text-xs ${subtle}`}>Add someone new</span>
            </span>
            <Tick on={choice === NEW} />
          </button>
          {choice === NEW && (
            <div className="mt-3 space-y-2">
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleContinue()}
                placeholder="Name"
                aria-label="Distributor name"
                className={inputCls}
              />
              <input
                type="tel"
                value={newPhone}
                onChange={(e) => setNewPhone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleContinue()}
                placeholder="Phone (optional)"
                aria-label="Distributor phone"
                className={inputCls}
              />
            </div>
          )}
        </div>
      </div>

      <div className="px-5 pt-3 pb-[max(20px,calc(12px+env(safe-area-inset-bottom,0px)))] grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onClose}
          disabled={isSaving}
          className={`min-h-[48px] rounded-2xl text-sm font-bold border transition-colors cursor-pointer ${
            darkMode ? "border-zinc-700 text-zinc-200 hover:bg-zinc-800" : "border-slate-200 text-slate-700 hover:bg-slate-50"
          }`}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={!canContinue || isSaving}
          className="min-h-[48px] rounded-2xl text-sm font-black bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSaving ? "Saving…" : "Continue"}
        </button>
      </div>
    </AdminSheet>
  );
}
