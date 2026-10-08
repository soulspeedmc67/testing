import React, { useState, useEffect } from "react";
import { Umbrella, Minus, Plus, Check, Loader2 } from "lucide-react";
import { shopRules, extraChargeLabel, EXTRA_CHARGE_LABEL, EXTRA_CHARGE_MAX } from "../../lib/deliveryCharges";
import { Switch } from "./ShopRulesSettings";

const QUICK_AMOUNTS = [10, 20, 30, 50];
const QUICK_NAMES = ["Rain charge", "Snow charge", "Busy-hours charge"];
const STEP = 5;

/**
 * The extra charge for rain, snow or a rush: a switch, the amount and the name
 * the customer sees on the bill. While it is on, every order pays it on top of
 * the bill, free delivery included. Saved on config/store
 * (src/lib/deliveryCharges.js); the website and both apps follow at once.
 */
export default function ExtraChargeSettings({ storeConfig = null, onSave, darkMode = false }) {
  const saved = shopRules(storeConfig);
  const on = saved.extraChargeOn;

  const [amount, setAmount] = useState(String(saved.extraChargeAmount));
  const [name, setName] = useState(saved.extraChargeLabel);
  const [saving, setSaving] = useState("");

  // Another device may change the settings while this screen is open.
  useEffect(() => {
    setAmount(String(saved.extraChargeAmount));
    setName(saved.extraChargeLabel);
  }, [saved.extraChargeAmount, saved.extraChargeLabel]);

  const save = async (key, patch, message) => {
    if (!onSave || saving) return;
    setSaving(key);
    try {
      await onSave(patch, message);
    } catch (e) {
      // The console shows why; the fields keep what was typed.
    } finally {
      setSaving("");
    }
  };

  const typedAmount = Number(amount);
  const amountOk = amount.trim() !== "" && Number.isInteger(typedAmount) && typedAmount >= 1 && typedAmount <= EXTRA_CHARGE_MAX;
  const typedName = name.trim();
  const shownName = extraChargeLabel(typedName);
  const changed = typedAmount !== saved.extraChargeAmount || typedName !== saved.extraChargeLabel;

  const step = (by) => {
    const from = amountOk ? typedAmount : saved.extraChargeAmount;
    setAmount(String(Math.min(EXTRA_CHARGE_MAX, Math.max(STEP, from + by))));
  };

  const wrongAmount = () => alert(`Enter the extra charge in whole rupees, from 1 to ${EXTRA_CHARGE_MAX}.`);

  const toggle = () => {
    if (on) {
      save("switch", { extraChargeOn: false }, "Extra charge is off. Customers pay the normal bill.");
      return;
    }
    if (!amountOk) return wrongAmount();
    save(
      "switch",
      { extraChargeOn: true, extraChargeAmount: typedAmount, extraChargeLabel: typedName },
      `Extra charge is on: ₹${typedAmount} on every order, shown as "${shownName}".`
    );
  };

  const saveCharge = (e) => {
    e.preventDefault();
    if (!amountOk) return wrongAmount();
    save(
      "charge",
      { extraChargeAmount: typedAmount, extraChargeLabel: typedName },
      on
        ? `Saved. Every order now pays ₹${typedAmount} extra, shown as "${shownName}".`
        : `Saved. ₹${typedAmount} will be charged when you switch it on.`
    );
  };

  const input = `text-xs font-bold px-3 py-2 rounded-xl border outline-none ${
    darkMode
      ? "bg-[#1A1D26] border-zinc-700 text-white focus:border-[#FF5B00]"
      : "bg-slate-50 border-slate-200 text-slate-900 focus:border-[#FF5B00]"
  }`;
  const label = "block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-1";
  const hint = "text-[11px] text-slate-500 dark:text-zinc-400";
  const stepButton =
    "w-9 h-9 shrink-0 rounded-xl border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 hover:bg-slate-50 dark:hover:bg-zinc-800 flex items-center justify-center cursor-pointer";
  const quickPick = (active) =>
    `px-2.5 py-1.5 rounded-lg border text-[11px] font-bold transition-colors cursor-pointer ${
      active
        ? "bg-[#FF5B00] border-[#FF5B00] text-white"
        : "border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
    }`;

  return (
    <div
      className={`md:col-span-2 rounded-2xl border p-5 space-y-4 transition-colors ${
        darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
      }`}
    >
      <div className="flex items-center space-x-2">
        <Umbrella className="w-5 h-5 text-sky-500" />
        <h3 className="font-black text-sm text-slate-900 dark:text-white">Extra delivery charge</h3>
      </div>
      <p className="text-xs text-slate-500 dark:text-zinc-400">
        For rain, snow, a busy rush or anything else that makes delivery harder. While it is on, every order pays it on
        top of the bill, free delivery included.
      </p>

      <div className="flex items-center justify-between gap-3 p-4 rounded-xl border border-slate-200 dark:border-zinc-800">
        <div className="min-w-0">
          <p className="font-semibold text-sm text-slate-900 dark:text-white">Charge extra now</p>
          <p className={hint}>
            {on
              ? `On. Every order pays ₹${saved.extraChargeAmount} extra, shown as "${extraChargeLabel(saved.extraChargeLabel)}". Switch it off when things are back to normal.`
              : "Off. Customers pay the normal bill."}
          </p>
        </div>
        <Switch on={on} label="Charge extra now" busy={saving === "switch"} disabled={Boolean(saving)} onChange={toggle} />
      </div>

      <form onSubmit={saveCharge} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className={label} htmlFor="extra-charge-amount">
              How much (₹)
            </label>
            <div className="flex items-center gap-2">
              <button type="button" aria-label={`₹${STEP} less`} onClick={() => step(-STEP)} className={stepButton}>
                <Minus className="w-4 h-4" />
              </button>
              <input
                id="extra-charge-amount"
                type="number"
                inputMode="numeric"
                min="1"
                max={EXTRA_CHARGE_MAX}
                step="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`${input} w-24 text-center tabular-nums`}
              />
              <button type="button" aria-label={`₹${STEP} more`} onClick={() => step(STEP)} className={stepButton}>
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {QUICK_AMOUNTS.map((value) => (
                <button key={value} type="button" onClick={() => setAmount(String(value))} className={quickPick(typedAmount === value)}>
                  ₹{value}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={label} htmlFor="extra-charge-name">
              Name on the bill
            </label>
            <input
              id="extra-charge-name"
              type="text"
              maxLength={40}
              placeholder={EXTRA_CHARGE_LABEL}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={`${input} w-full`}
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {QUICK_NAMES.map((value) => (
                <button key={value} type="button" onClick={() => setName(value)} className={quickPick(typedName === value)}>
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className={`${hint} tabular-nums`}>
            {amountOk
              ? `Customers see "${shownName}  ₹${typedAmount}" on the bill.`
              : `Enter a whole amount from ₹1 to ₹${EXTRA_CHARGE_MAX}.`}
          </p>
          <button
            type="submit"
            disabled={Boolean(saving) || !changed}
            className="inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap bg-[#FF5B00] hover:bg-[#E04E00] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {saving === "charge" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            Save charge
          </button>
        </div>
      </form>

      <p className="text-[11px] text-slate-400 dark:text-zinc-500">
        An order that is already placed keeps the bill it had. Apps installed before this setting existed don&apos;t charge it
        until they are updated.
      </p>
    </div>
  );
}
