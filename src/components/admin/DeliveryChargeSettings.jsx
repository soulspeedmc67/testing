import React, { useState, useEffect } from "react";
import { Moon, Fuel, Check, Loader2 } from "lucide-react";
import {
  nightChargeSettings,
  isNightChargeOn,
  isNightHours,
  nightChargeFor,
  fuelSettings,
  fuelCostFor,
} from "../../lib/nightCharge";

const MODES = [
  { id: "auto", label: "Automatic", detail: "8 pm to 6 am" },
  { id: "on", label: "On now", detail: "Until you change it" },
  { id: "off", label: "Off", detail: "No charge" },
];

const MODE_SAVED = {
  auto: "Night delivery charge is automatic: on from 8 pm to 6 am.",
  on: "Distance charge is on now, until you change it.",
  off: "Night delivery charge is off.",
};

const EXAMPLE_KM = [2, 5, 8];

/**
 * The night delivery charge (by distance, after 8 pm) with its on/off switch,
 * and the petrol figures the rider's cost on each order is worked out from.
 * Both are saved on config/store; every shop app reads them from there.
 */
export default function DeliveryChargeSettings({ storeConfig = null, onSave, darkMode = false }) {
  const night = nightChargeSettings(storeConfig);
  const fuel = fuelSettings(storeConfig);

  const [perKm, setPerKm] = useState(String(night.perKm));
  const [minFee, setMinFee] = useState(String(night.minFee));
  const [petrolPrice, setPetrolPrice] = useState(String(fuel.petrolPrice));
  const [mileage, setMileage] = useState(String(fuel.mileage));
  const [saving, setSaving] = useState("");
  const [now, setNow] = useState(() => new Date());

  // Another device may change the settings while this screen is open.
  useEffect(() => {
    setPerKm(String(night.perKm));
    setMinFee(String(night.minFee));
  }, [night.perKm, night.minFee]);

  useEffect(() => {
    setPetrolPrice(String(fuel.petrolPrice));
    setMileage(String(fuel.mileage));
  }, [fuel.petrolPrice, fuel.mileage]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60 * 1000);
    return () => clearInterval(timer);
  }, []);

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

  const saveRate = (e) => {
    e.preventDefault();
    const rate = Number(perKm);
    const floor = Number(minFee);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100 || !Number.isFinite(floor) || floor < 0 || floor > 500) {
      alert("Enter the charge per km (0 to 100) and the minimum charge (0 to 500) in rupees.");
      return;
    }
    save("rate", { nightChargePerKm: rate, nightChargeMin: floor }, `Distance charge is now ₹${rate} a km, at least ₹${floor}.`);
  };

  const saveFuel = (e) => {
    e.preventDefault();
    const litre = Number(petrolPrice);
    const kmpl = Number(mileage);
    if (!Number.isFinite(litre) || litre < 50 || litre > 300 || !Number.isFinite(kmpl) || kmpl < 10 || kmpl > 100) {
      alert("Enter the petrol price (₹50 to ₹300 a litre) and the bike's mileage (10 to 100 km a litre).");
      return;
    }
    save("fuel", { petrolPrice: litre, bikeMileage: kmpl }, `Petrol saved: ₹${litre} a litre, ${kmpl} km a litre.`);
  };

  const chargingNow = isNightChargeOn(storeConfig, now);
  const statusLine = chargingNow
    ? `Charging now: ₹${night.perKm} for each km from the store, at least ₹${night.minFee}.`
    : night.mode === "off"
    ? "Switched off. Customers pay only the normal delivery fee, day and night."
    : "Not charging right now. It starts by itself at 8 pm.";

  // Examples use the saved rate, as if it were night, whatever the switch says.
  const exampleConfig = { ...storeConfig, nightChargeMode: "on" };
  const perKmFuel = fuelCostFor(1, storeConfig)?.perKm;

  const card = `rounded-2xl border p-5 space-y-4 transition-colors ${
    darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
  }`;
  const input = `w-full text-xs font-bold px-3 py-2 rounded-xl border outline-none ${
    darkMode
      ? "bg-[#1A1D26] border-zinc-700 text-white focus:border-[#FF5B00]"
      : "bg-slate-50 border-slate-200 text-slate-900 focus:border-[#FF5B00]"
  }`;
  const label = "block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-1";
  const saveButton =
    "inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap bg-[#FF5B00] hover:bg-[#E04E00] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs";

  return (
    <>
      {/* Night delivery charge */}
      <div className={card}>
        <div className="flex items-center space-x-2">
          <Moon className="w-5 h-5 text-indigo-500" />
          <h3 className="font-black text-sm text-slate-900 dark:text-white">Night delivery charge</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-zinc-400">
          After 8 pm every day, customers also pay for delivery by how far they are from the store. It is added to the
          normal delivery fee and is charged on free delivery too, because it pays for the rider&apos;s petrol.
        </p>

        <div className="p-4 rounded-xl border border-slate-200 dark:border-zinc-800 space-y-3">
          <div className="flex items-start space-x-2">
            <span className={`w-2 h-2 rounded-full shrink-0 mt-1.5 ${chargingNow ? "bg-emerald-500" : "bg-slate-400"}`} />
            <span className="font-semibold text-sm text-slate-900 dark:text-white">{statusLine}</span>
          </div>

          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Night delivery charge">
            {MODES.map((m) => {
              const active = night.mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={Boolean(saving)}
                  onClick={() => !active && save("mode-" + m.id, { nightChargeMode: m.id }, MODE_SAVED[m.id])}
                  className={`px-2 py-2.5 rounded-xl border text-center transition-colors cursor-pointer disabled:cursor-wait ${
                    active
                      ? "bg-[#FF5B00] border-[#FF5B00] text-white"
                      : "border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span className="flex items-center justify-center gap-1 text-xs font-black">
                    {saving === "mode-" + m.id && <Loader2 className="w-3 h-3 animate-spin" />}
                    {m.label}
                  </span>
                  <span className={`block text-[10.5px] font-semibold ${active ? "text-white/85" : "text-slate-400"}`}>{m.detail}</span>
                </button>
              );
            })}
          </div>
          {night.mode === "on" && !isNightHours(now) && (
            <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              It is on by hand, so it stays on all day. Pick Automatic to go back to 8 pm.
            </p>
          )}
        </div>

        <form onSubmit={saveRate} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="night-per-km">Charge per km (₹)</label>
              <input id="night-per-km" type="number" inputMode="decimal" min="0" max="100" step="0.5" value={perKm} onChange={(e) => setPerKm(e.target.value)} className={input} />
            </div>
            <div>
              <label className={label} htmlFor="night-min">Minimum charge (₹)</label>
              <input id="night-min" type="number" inputMode="numeric" min="0" max="500" step="1" value={minFee} onChange={(e) => setMinFee(e.target.value)} className={input} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 tabular-nums">
              {EXAMPLE_KM.map((km) => `${km} km ₹${nightChargeFor(km, exampleConfig)}`).join(" · ")}
            </p>
            <button type="submit" disabled={Boolean(saving)} className={saveButton}>
              {saving === "rate" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save rate
            </button>
          </div>
        </form>
      </div>

      {/* Rider's petrol */}
      <div className={card}>
        <div className="flex items-center space-x-2">
          <Fuel className="w-5 h-5 text-emerald-500" />
          <h3 className="font-black text-sm text-slate-900 dark:text-white">Rider&apos;s petrol</h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-zinc-400">
          Every order shows what the trip costs the rider in petrol: the road from the store to the door and back, at
          these figures. Change the price when the pump price changes.
        </p>

        <form onSubmit={saveFuel} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label} htmlFor="petrol-price">Petrol (₹ a litre)</label>
              <input id="petrol-price" type="number" inputMode="decimal" min="50" max="300" step="0.01" value={petrolPrice} onChange={(e) => setPetrolPrice(e.target.value)} className={input} />
            </div>
            <div>
              <label className={label} htmlFor="bike-mileage">Bike mileage (km a litre)</label>
              <input id="bike-mileage" type="number" inputMode="decimal" min="10" max="100" step="1" value={mileage} onChange={(e) => setMileage(e.target.value)} className={input} />
            </div>
          </div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 tabular-nums">
              About ₹{perKmFuel} a km of road · {EXAMPLE_KM.map((km) => `${km} km away ₹${fuelCostFor(km, storeConfig).cost}`).join(" · ")}
            </p>
            <button type="submit" disabled={Boolean(saving)} className={saveButton}>
              {saving === "fuel" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save petrol
            </button>
          </div>
        </form>
        <p className="text-[11px] text-slate-400 dark:text-zinc-500">
          Petrol in Anantnag was ₹106 to ₹108 a litre on 5 Oct 2026. A 110cc scooter does about 45 km a litre in town.
        </p>
      </div>
    </>
  );
}
