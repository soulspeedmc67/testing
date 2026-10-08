import React, { useState, useEffect } from "react";
import { Banknote, ReceiptText, Check, Loader2 } from "lucide-react";
import { shopRules, standardDeliveryFee, SHOP_RULE_DEFAULTS } from "../../lib/deliveryCharges";

const EXAMPLE_ORDERS = [120, 200, 400];

const FIELDS = [
  "minOrderValue",
  "handlingFee",
  "freeDeliveryOrders",
  "deliverySmallBelow",
  "deliverySmallPercent",
  "deliveryMidFee",
  "deliveryLowFrom",
  "deliveryLowFee",
];

const asText = (rules) => Object.fromEntries(FIELDS.map((key) => [key, String(rules[key])]));

export function Switch({ on, label, busy, disabled, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative shrink-0 w-12 h-7 rounded-full transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
        on ? "bg-emerald-500" : "bg-slate-300 dark:bg-zinc-700"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow flex items-center justify-center transition-transform ${
          on ? "translate-x-5" : ""
        }`}
      >
        {busy && <Loader2 className="w-3 h-3 animate-spin text-slate-500" />}
      </span>
    </button>
  );
}

/**
 * The rules every shop app follows without a new build: cash on delivery, the
 * minimum order, the handling charge, the delivery fee by order size and the
 * free first orders. All of it is saved on config/store (src/lib/deliveryCharges.js
 * has the same rules and what applies when a field is missing).
 */
export default function ShopRulesSettings({ storeConfig = null, onSave, darkMode = false }) {
  const saved = shopRules(storeConfig);
  const savedKey = FIELDS.map((key) => saved[key]).join("|");
  const [text, setText] = useState(() => asText(saved));
  const [saving, setSaving] = useState("");

  // Another device may change the settings while this screen is open.
  useEffect(() => {
    setText(asText(saved));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [savedKey]);

  const codOn = storeConfig?.codEnabled !== false;
  const codAtNight = storeConfig?.codAtNight === true;

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

  const typed = Object.fromEntries(FIELDS.map((key) => [key, Number(text[key])]));
  const problem = (() => {
    if (FIELDS.some((key) => text[key].trim() === "" || !Number.isFinite(typed[key]) || typed[key] < 0)) {
      return "Fill in every box with 0 or more.";
    }
    if (typed.deliverySmallPercent > 100) return "The share for small orders can't be more than 100%.";
    if (typed.deliveryLowFrom < typed.deliverySmallBelow) {
      return "The lowest fee has to start at or above the small-order amount.";
    }
    if (!Number.isInteger(typed.freeDeliveryOrders)) return "Free first orders has to be a whole number.";
    if (typed.minOrderValue > 5000) return "The minimum order can't be more than ₹5,000.";
    return "";
  })();
  const changed = FIELDS.some((key) => typed[key] !== saved[key]);
  const preview = problem ? saved : typed;

  const saveRules = (e) => {
    e.preventDefault();
    if (problem) {
      alert(problem);
      return;
    }
    save(
      "rules",
      Object.fromEntries(FIELDS.map((key) => [key, typed[key]])),
      `Saved. Minimum order ₹${typed.minOrderValue}, handling ₹${typed.handlingFee}. The website and the apps follow now.`
    );
  };

  const card = `rounded-2xl border p-5 space-y-4 transition-colors ${
    darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
  }`;
  const input = `w-full text-xs font-bold px-3 py-2 rounded-xl border outline-none ${
    darkMode
      ? "bg-[#1A1D26] border-zinc-700 text-white focus:border-[#FF5B00]"
      : "bg-slate-50 border-slate-200 text-slate-900 focus:border-[#FF5B00]"
  }`;
  const label = "block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-1";
  const hint = "text-[11px] text-slate-500 dark:text-zinc-400";
  const groupTitle = "text-xs font-black text-slate-900 dark:text-white";
  const saveButton =
    "inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap bg-[#FF5B00] hover:bg-[#E04E00] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs";

  const field = (key, title, props = {}) => (
    <div>
      <label className={label} htmlFor={`rule-${key}`}>
        {title}
      </label>
      <input
        id={`rule-${key}`}
        type="number"
        inputMode="decimal"
        min="0"
        step="1"
        value={text[key]}
        onChange={(e) => setText((prev) => ({ ...prev, [key]: e.target.value }))}
        className={input}
        {...props}
      />
    </div>
  );

  return (
    <>
      {/* Cash on delivery */}
      <div className={card}>
        <div className="flex items-center space-x-2">
          <Banknote className="w-5 h-5 text-emerald-500" />
          <h3 className="font-black text-sm text-slate-900 dark:text-white">Cash on delivery</h3>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-sm text-slate-900 dark:text-white">Take cash on delivery</p>
            <p className={hint}>
              {codOn
                ? "Customers can pay the rider at the door, or pay online."
                : "Off. Customers can only pay online, and see that cash isn't available right now."}
            </p>
          </div>
          <Switch
            on={codOn}
            label="Take cash on delivery"
            busy={saving === "cod"}
            disabled={Boolean(saving)}
            onChange={() =>
              save(
                "cod",
                { codEnabled: !codOn },
                codOn ? "Cash on delivery is off. Customers can only pay online." : "Cash on delivery is on."
              )
            }
          />
        </div>

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-zinc-800">
          <div className="min-w-0">
            <p className="font-semibold text-sm text-slate-900 dark:text-white">Also after 8 pm</p>
            <p className={hint}>
              {!codOn
                ? "Cash on delivery is off, so this has no effect."
                : codAtNight
                ? "Cash is taken at night as well."
                : "From 8 pm to 6 am customers pay online only."}
            </p>
          </div>
          <Switch
            on={codOn && codAtNight}
            label="Cash on delivery after 8 pm"
            busy={saving === "cod-night"}
            disabled={Boolean(saving) || !codOn}
            onChange={() =>
              save(
                "cod-night",
                { codAtNight: !codAtNight },
                codAtNight ? "No cash on delivery after 8 pm." : "Cash on delivery is allowed after 8 pm too."
              )
            }
          />
        </div>
      </div>

      {/* Minimum order, handling charge, delivery fee */}
      <div className={card}>
        <div className="flex items-center space-x-2">
          <ReceiptText className="w-5 h-5 text-[#FF5B00]" />
          <h3 className="font-black text-sm text-slate-900 dark:text-white">Minimum order and fees</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-zinc-400">
          Change a number and save: the website, the iPhone app and the Android app use it straight away. No app update
          is needed.
        </p>

        <form onSubmit={saveRules} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {field("minOrderValue", "Minimum order (₹)")}
            {field("handlingFee", "Handling charge on every order (₹)")}
          </div>
          <p className={hint}>The minimum counts the items only, not the fees. Put 0 for no minimum.</p>

          <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 space-y-3">
            <p className={groupTitle}>Delivery fee by order size</p>
            <div className="grid grid-cols-2 gap-3">
              {field("deliverySmallBelow", "Small orders: under (₹)")}
              {field("deliverySmallPercent", "Small orders pay (% of the items)", { max: "100" })}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {field("deliveryMidFee", "Orders in between pay (₹)")}
              {field("deliveryLowFrom", "Bigger orders: from (₹)")}
            </div>
            <div className="grid grid-cols-2 gap-3">
              {field("deliveryLowFee", "Bigger orders pay (₹)")}
              {field("freeDeliveryOrders", "Free delivery on first orders (how many)")}
            </div>
            <p className={hint}>
              Put 0 in a fee to make that size free. Put 0 in free first orders to end that offer. At night the charge by
              distance below replaces these fees.
            </p>
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className={`${hint} tabular-nums`}>
              {problem ||
                EXAMPLE_ORDERS.map((amount) => `₹${amount} order pays ₹${standardDeliveryFee(amount, preview).fee}`).join(" · ")}
            </p>
            <button type="submit" disabled={Boolean(saving) || !changed} className={saveButton}>
              {saving === "rules" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save
            </button>
          </div>
        </form>
        <p className="text-[11px] text-slate-400 dark:text-zinc-500">
          Built-in numbers if nothing is saved: minimum ₹{SHOP_RULE_DEFAULTS.minOrderValue}, handling ₹
          {SHOP_RULE_DEFAULTS.handlingFee}. Apps installed before this setting existed keep their old fixed numbers
          until the customer updates.
        </p>
      </div>
    </>
  );
}
