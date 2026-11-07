import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Download, Route, Fuel, IndianRupee, PackageCheck, ChevronDown, Loader2, Info } from "lucide-react";
import { fetchAllOrders, watchDrivers } from "../../lib/db";
import { mergeOrders, rangeKeys } from "../../lib/salesAnalytics";
import { riderTrips, summarizeRiders, ridersToCsv } from "../../lib/riderDistance";
import { DARK_STORE_HUB } from "../../lib/deliveryEta";
import { fuelSettings } from "../../lib/nightCharge";
import { triggerCsvDownload } from "../../lib/csvExport";

const RANGES = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "7 days" },
  { id: "month", label: "This month" },
  { id: "lifetime", label: "All time" },
];

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
const kmText = (n) => `${(Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 1 })} km`;
const dayLabel = (key) =>
  key === "unknown"
    ? "Date not known"
    : new Date(`${key}T12:00:00+05:30`).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" });

/**
 * How far each rider has ridden and what it cost in petrol, for a period, from
 * every delivered order since the shop opened (src/lib/riderDistance.js says
 * how). Every order is read once when this opens (and on Refresh), as on the
 * Sales & analytics screen; the console's live list only holds the newest 100.
 */
export default function RiderDistanceView({ orders: liveOrders = [], storeConfig = null, darkMode = false }) {
  const [range, setRange] = useState("7d");
  const [allOrders, setAllOrders] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [open, setOpen] = useState(null); // the rider whose days are showing
  const [names, setNames] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setAllOrders(await fetchAllOrders());
    } catch (e) {
      setLoadError("Couldn't read every order, so older trips may be missing. Showing the newest 100 orders.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Riders' names as they are now (an order keeps the name it was given then).
  useEffect(
    () =>
      watchDrivers((list) => {
        const map = {};
        for (const d of list || []) if (d?.id) map[String(d.id)] = d.name || "";
        setNames(map);
      }),
    []
  );

  const orders = useMemo(() => mergeOrders(allOrders || [], liveOrders), [allOrders, liveOrders]);
  const hub = { lat: DARK_STORE_HUB.lat, lng: DARK_STORE_HUB.lng };
  const trips = useMemo(() => riderTrips(orders, { hub }), [orders, hub.lat, hub.lng]); // eslint-disable-line react-hooks/exhaustive-deps
  const { fromKey, toKey } = rangeKeys(range);
  const summary = useMemo(() => summarizeRiders(trips, { fromKey, toKey, cfg: storeConfig, names }), [trips, fromKey, toKey, storeConfig, names]);
  const fuel = fuelSettings(storeConfig);
  const t = summary.totals;

  const card = `rounded-2xl border p-4 ${darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"}`;
  const muted = darkMode ? "text-zinc-400" : "text-slate-500";
  const strong = darkMode ? "text-white" : "text-slate-900";
  const chip = (on) =>
    `px-3 py-1.5 rounded-xl text-xs font-black transition-colors cursor-pointer ${
      on ? "bg-[#061838] text-white dark:bg-white dark:text-slate-900" : darkMode ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
    }`;

  const kpis = [
    { label: "Km ridden", value: kmText(t.km), note: `${t.riders} rider${t.riders === 1 ? "" : "s"}`, icon: Route },
    { label: "Petrol", value: `${t.litres.toLocaleString("en-IN")} L`, note: `${fuel.mileage} km a litre`, icon: Fuel },
    { label: "Petrol cost", value: inr(t.cost), note: `at ₹${fuel.petrolPrice} a litre`, icon: IndianRupee },
    { label: "Deliveries", value: t.deliveries, note: `${t.trips} trip${t.trips === 1 ? "" : "s"}`, icon: PackageCheck },
  ];

  const download = () => {
    const label = RANGES.find((r) => r.id === range)?.label || range;
    triggerCsvDownload(ridersToCsv(summary), `dashit-rider-km-${label.toLowerCase().replace(/\s+/g, "-")}.csv`);
  };

  return (
    <section className="space-y-3 mt-4" aria-labelledby="rider-km-title">
      <div className={`${card} space-y-3`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 id="rider-km-title" className={`font-black text-base ${strong}`}>Distance &amp; petrol</h2>
            <p className={`text-xs ${muted}`}>How far each rider has ridden for deliveries, and the petrol it took. Every past order counts.</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button type="button" onClick={load} disabled={loading} className={`${chip(false)} inline-flex items-center gap-1.5 disabled:opacity-50`}>
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Refresh
            </button>
            <button type="button" onClick={download} disabled={summary.riders.length === 0} className={`${chip(false)} inline-flex items-center gap-1.5 disabled:opacity-40`}>
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Period">
          {RANGES.map((r) => (
            <button key={r.id} type="button" role="tab" aria-selected={range === r.id} onClick={() => setRange(r.id)} className={chip(range === r.id)}>
              {r.label}
            </button>
          ))}
        </div>
        {loadError && <p className="text-xs font-semibold text-amber-600">{loadError}</p>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map(({ label, value, note, icon: Icon }) => (
          <div key={label} className={card}>
            <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider ${muted}`}>
              <Icon className="w-3.5 h-3.5" /> {label}
            </div>
            <div className={`mt-1 text-xl font-black tabular-nums ${strong}`}>{allOrders === null && loading ? "…" : value}</div>
            <div className={`text-[11px] ${muted}`}>{note}</div>
          </div>
        ))}
      </div>

      <div className={card}>
        {summary.riders.length === 0 ? (
          <p className={`text-xs font-semibold py-8 text-center ${muted}`}>
            {loading ? "Reading the orders…" : "No deliveries by a rider in this period."}
          </p>
        ) : (
          <ul className={`divide-y ${darkMode ? "divide-zinc-800" : "divide-slate-100"}`}>
            {summary.riders.map((r) => {
              const isOpen = open === r.driverId;
              return (
                <li key={r.driverId} className="py-2.5">
                  <button
                    type="button"
                    onClick={() => setOpen(isOpen ? null : r.driverId)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center gap-3 text-left cursor-pointer"
                  >
                    <span className="w-9 h-9 rounded-full bg-[#FF5B00]/10 text-[#FF5B00] font-black text-sm flex items-center justify-center shrink-0">
                      {(r.name || "R").trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 grow">
                      <span className={`block text-sm font-black truncate ${strong}`}>{r.name}</span>
                      <span className={`block text-[11px] ${muted}`}>
                        {r.deliveries} deliver{r.deliveries === 1 ? "y" : "ies"} · {r.trips} trip{r.trips === 1 ? "" : "s"}
                        {r.unknown ? ` · ${r.unknown} with no address pin` : ""}
                      </span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className={`block text-sm font-black tabular-nums ${strong}`}>{kmText(r.km)}</span>
                      <span className={`block text-[11px] tabular-nums ${muted}`}>
                        {inr(r.cost)} · {r.litres} L
                      </span>
                    </span>
                    <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${muted} ${isOpen ? "rotate-180" : ""}`} />
                  </button>
                  {isOpen && (
                    <table className="w-full mt-2 text-xs tabular-nums">
                      <thead>
                        <tr className={`text-left ${muted}`}>
                          <th className="font-bold py-1">Day</th>
                          <th className="font-bold py-1 text-right">Deliveries</th>
                          <th className="font-bold py-1 text-right">Km</th>
                          <th className="font-bold py-1 text-right">Petrol</th>
                        </tr>
                      </thead>
                      <tbody className={strong}>
                        {r.days.map((d) => (
                          <tr key={d.key} className={`border-t ${darkMode ? "border-zinc-800" : "border-slate-100"}`}>
                            <td className="py-1.5">{dayLabel(d.key)}</td>
                            <td className="py-1.5 text-right">{d.deliveries}</td>
                            <td className="py-1.5 text-right font-bold">{kmText(d.km)}</td>
                            <td className="py-1.5 text-right">
                              {inr(d.cost)} <span className={muted}>({d.litres} L)</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className={`flex gap-1.5 text-[11px] leading-relaxed px-1 ${muted}`}>
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>
          Worked out from delivered orders, since the riders&apos; phones never saved their route: each trip is the store, every door in the
          order it was delivered, and back, along the roads (the straight line × 1.25). Orders a rider took out within 10 minutes of each
          other count as one trip. Petrol uses the price and mileage in Shop settings (₹{fuel.petrolPrice} a litre, {fuel.mileage} km a litre),
          so changing them changes past figures too.
          {t.unknown ? ` ${t.unknown} deliver${t.unknown === 1 ? "y has" : "ies have"} no distance or address pin and add no km.` : ""}
        </span>
      </p>
    </section>
  );
}
