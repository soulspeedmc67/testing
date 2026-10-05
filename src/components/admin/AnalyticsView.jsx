import React, { useCallback, useEffect, useMemo, useState } from "react";
import { RefreshCw, Download, TrendingUp, PackageCheck, XCircle, IndianRupee, Users, Trophy, ShoppingBasket } from "lucide-react";
import { fetchAllOrders } from "../../lib/db";
import { triggerCsvDownload } from "../../lib/csvExport";
import { summarize, fillDays, rangeKeys, mergeOrders, daysToCsv, istDayKey } from "../../lib/salesAnalytics";

const RANGES = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "month", label: "This month" },
  { id: "lifetime", label: "Lifetime" },
];

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
const shortInr = (n) => {
  const v = Math.round(Number(n) || 0);
  if (v >= 100000) return `₹${(v / 100000).toFixed(v >= 1000000 ? 0 : 1)}L`;
  if (v >= 1000) return `₹${(v / 1000).toFixed(v >= 10000 ? 0 : 1)}k`;
  return `₹${v}`;
};
const dayLabel = (key, withYear = false) =>
  new Date(`${key}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
const hourLabel = (h) => (h === 0 ? "12am" : h === 12 ? "12pm" : h > 12 ? `${h - 12}pm` : `${h}am`);

/**
 * Sales and orders by day, for a chosen range, and the shop's lifetime
 * totals. Numbers come from src/lib/salesAnalytics.js. The live list in the
 * console holds the newest 100 orders; every order is read once when this
 * screen opens (and on Refresh) so older days and Lifetime are complete.
 */
export default function AnalyticsView({ orders: liveOrders = [], darkMode = false }) {
  const [range, setRange] = useState("7d");
  const [allOrders, setAllOrders] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [metric, setMetric] = useState("sales"); // "sales" | "delivered"
  const [hoverDay, setHoverDay] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setAllOrders(await fetchAllOrders());
    } catch (e) {
      setLoadError("Couldn't read every order, so older days may be missing. Showing the newest 100.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const orders = useMemo(() => mergeOrders(allOrders || [], liveOrders), [allOrders, liveOrders]);
  const now = Date.now();
  const { fromKey, toKey } = rangeKeys(range, now);
  const stats = useMemo(() => summarize(orders, { fromKey, toKey }), [orders, fromKey, toKey]);
  const lifetime = useMemo(() => summarize(orders), [orders]);

  const chartDays = useMemo(() => {
    const today = istDayKey(now);
    if (range === "lifetime") {
      const first = lifetime.days[0]?.key;
      return first ? fillDays(stats.days, first, today) : [];
    }
    if (range === "today" || range === "yesterday") {
      return fillDays(stats.days, rangeKeys("7d", now).fromKey, toKey);
    }
    return fillDays(stats.days, fromKey, toKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stats, lifetime, range, fromKey, toKey]);

  const card = `rounded-2xl border p-4 ${darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"}`;
  const muted = darkMode ? "text-zinc-400" : "text-slate-500";
  const strong = darkMode ? "text-white" : "text-slate-900";
  const t = stats.totals;
  const singleDay = range === "today" || range === "yesterday";

  const kpis = [
    { label: "Sales", value: inr(t.sales), note: `${t.delivered} delivered order${t.delivered === 1 ? "" : "s"}`, icon: IndianRupee },
    { label: "Orders delivered", value: t.delivered, note: `${t.orders} placed · ${t.pending} on the way`, icon: PackageCheck },
    { label: "Average order", value: inr(stats.averageOrder), note: `${t.units} items sold`, icon: ShoppingBasket },
    {
      label: "Cancelled",
      value: t.cancelled,
      note: t.delivered + t.cancelled ? `${Math.round(stats.cancelRate * 100)}% of finished orders` : "None",
      icon: XCircle,
    },
    { label: "Booked (incl. on the way)", value: inr(t.booked), note: "Sales + orders not delivered yet", icon: TrendingUp },
    { label: "Customers", value: stats.customers, note: `${stats.repeatCustomers} ordered more than once`, icon: Users },
  ];

  const maxValue = Math.max(1, ...chartDays.map((d) => (metric === "sales" ? d.sales : d.delivered)));
  const maxHour = Math.max(1, ...stats.hours.map((h) => h.orders));
  const busyHours = stats.hours.filter((h) => h.orders > 0);
  const hourSpan = busyHours.length ? stats.hours.slice(Math.min(...busyHours.map((h) => h.hour)), Math.max(...busyHours.map((h) => h.hour)) + 1) : [];
  const onlineShare = t.sales ? Math.round((t.onlineSales / t.sales) * 100) : 0;

  return (
    <div className="space-y-4 mt-4">
      {/* Range + actions, in one row above the numbers */}
      <div className={`${card} flex flex-wrap items-center gap-2 justify-between`}>
        <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Period">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              role="tab"
              aria-selected={range === r.id}
              onClick={() => setRange(r.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-colors ${
                range === r.id
                  ? "bg-[#FF5B00] text-white"
                  : darkMode
                  ? "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => triggerCsvDownload(daysToCsv(chartDays), `dashit-sales-${range}-${istDayKey(now)}.csv`)}
            disabled={!chartDays.length}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black disabled:opacity-40 ${
              darkMode ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <Download className="w-3.5 h-3.5" /> CSV
          </button>
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black disabled:opacity-60 ${
              darkMode ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      {loadError && <p className="text-xs font-bold text-amber-600 px-1">{loadError}</p>}
      {allOrders === null && loading && <p className={`text-xs font-semibold px-1 ${muted}`}>Reading every order for complete numbers…</p>}

      {/* Headline numbers for the range */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className={card}>
            <div className="flex items-center justify-between">
              <span className={`text-[11px] font-black uppercase tracking-wider ${muted}`}>{k.label}</span>
              <k.icon className="w-4 h-4 text-[#FF5B00]" />
            </div>
            <div className={`text-2xl font-black mt-1 tabular-nums ${strong}`}>{k.value}</div>
            <p className={`text-[11px] font-semibold mt-0.5 ${muted}`}>{k.note}</p>
          </div>
        ))}
      </div>

      {/* Daily chart */}
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className={`text-sm font-black ${strong}`}>{metric === "sales" ? "Daily sales" : "Orders delivered each day"}</h3>
            <p className={`text-[11px] font-semibold ${muted}`}>
              {singleDay ? "Last 7 days, for comparison" : range === "lifetime" ? "Every day since the first order" : "Each day in the period"} · India time
            </p>
          </div>
          <div className="flex gap-1.5">
            {[
              { id: "sales", label: "Sales ₹" },
              { id: "delivered", label: "Delivered" },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={metric === m.id}
                onClick={() => setMetric(m.id)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-black ${
                  metric === m.id ? "bg-[#061838] text-white dark:bg-white dark:text-slate-900" : darkMode ? "bg-zinc-800 text-zinc-300" : "bg-slate-100 text-slate-600"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {chartDays.length === 0 ? (
          <p className={`text-xs font-semibold py-10 text-center ${muted}`}>No orders yet.</p>
        ) : (
          <div className="mt-4">
            <div className="relative h-48 flex items-end gap-[2px]" onMouseLeave={() => setHoverDay(null)}>
              {chartDays.map((d) => {
                const v = metric === "sales" ? d.sales : d.delivered;
                const isTarget = singleDay ? d.key === toKey : true;
                return (
                  <button
                    key={d.key}
                    type="button"
                    onMouseEnter={() => setHoverDay(d)}
                    onFocus={() => setHoverDay(d)}
                    onClick={() => setHoverDay(d)}
                    aria-label={`${dayLabel(d.key)}: ${inr(d.sales)} sales, ${d.delivered} delivered`}
                    className="group flex-1 h-full flex items-end min-w-0"
                  >
                    <span
                      className={`w-full max-w-[56px] mx-auto rounded-t-[4px] transition-opacity ${isTarget ? "bg-[#FF5B00]" : "bg-[#FF5B00]/35"} ${
                        hoverDay && hoverDay.key !== d.key ? "opacity-60" : ""
                      }`}
                      style={{ height: `${v > 0 ? Math.max(2, (v / maxValue) * 100) : 0}%` }}
                    />
                  </button>
                );
              })}
              {hoverDay && (
                <div
                  className={`absolute top-0 left-1/2 -translate-x-1/2 rounded-xl px-3 py-2 text-[11px] font-semibold shadow-lg pointer-events-none ${
                    darkMode ? "bg-zinc-900 border border-zinc-700 text-zinc-200" : "bg-white border border-slate-200 text-slate-700"
                  }`}
                >
                  <p className={`font-black ${strong}`}>{dayLabel(hoverDay.key, true)}</p>
                  <p>Sales {inr(hoverDay.sales)} · {hoverDay.delivered} delivered</p>
                  <p>
                    {hoverDay.orders} placed · {hoverDay.cancelled} cancelled · {hoverDay.units} items
                  </p>
                </div>
              )}
            </div>
            <div className={`flex justify-between mt-1.5 text-[10px] font-semibold ${muted}`}>
              <span>{dayLabel(chartDays[0].key, range === "lifetime")}</span>
              <span>Peak {metric === "sales" ? shortInr(maxValue) : maxValue}</span>
              <span>{dayLabel(chartDays[chartDays.length - 1].key)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-2 gap-3">
        {/* Top products */}
        <div className={card}>
          <h3 className={`text-sm font-black ${strong}`}>Best sellers</h3>
          <p className={`text-[11px] font-semibold mb-3 ${muted}`}>Pieces in delivered orders</p>
          {stats.topProducts.length === 0 ? (
            <p className={`text-xs font-semibold py-6 text-center ${muted}`}>Nothing delivered in this period.</p>
          ) : (
            <ol className="space-y-2">
              {stats.topProducts.map((p, i) => (
                <li key={p.name} className="text-xs">
                  <div className="flex justify-between gap-2">
                    <span className={`font-bold truncate ${strong}`}>
                      {i + 1}. {p.name}
                    </span>
                    <span className={`shrink-0 tabular-nums font-semibold ${muted}`}>
                      {p.units} pcs · {inr(p.revenue)}
                    </span>
                  </div>
                  <div className={`mt-1 h-1.5 rounded-full ${darkMode ? "bg-zinc-800" : "bg-slate-100"}`}>
                    <div className="h-full rounded-full bg-[#FF5B00]" style={{ width: `${(p.units / stats.topProducts[0].units) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div className="space-y-3">
          {/* Busy hours */}
          <div className={card}>
            <h3 className={`text-sm font-black ${strong}`}>Busy hours</h3>
            <p className={`text-[11px] font-semibold mb-3 ${muted}`}>Orders by the hour they came in</p>
            {hourSpan.length === 0 ? (
              <p className={`text-xs font-semibold py-4 text-center ${muted}`}>No orders in this period.</p>
            ) : (
              <>
                <div className="h-24 flex items-end gap-[2px]">
                  {hourSpan.map((h) => (
                    <div key={h.hour} className="flex-1 h-full flex items-end" title={`${hourLabel(h.hour)}: ${h.orders} order${h.orders === 1 ? "" : "s"}`}>
                      <span className="w-full rounded-t-[4px] bg-[#061838] dark:bg-slate-300" style={{ height: `${h.orders ? Math.max(4, (h.orders / maxHour) * 100) : 0}%` }} />
                    </div>
                  ))}
                </div>
                <div className={`flex justify-between mt-1.5 text-[10px] font-semibold ${muted}`}>
                  <span>{hourLabel(hourSpan[0].hour)}</span>
                  <span>Busiest {hourLabel(stats.hours.reduce((a, b) => (b.orders > a.orders ? b : a)).hour)}</span>
                  <span>{hourLabel(hourSpan[hourSpan.length - 1].hour)}</span>
                </div>
              </>
            )}
          </div>

          {/* Money breakdown */}
          <div className={card}>
            <h3 className={`text-sm font-black ${strong}`}>Where the money came from</h3>
            <dl className="mt-3 space-y-1.5 text-xs">
              {[
                ["Paid online", `${inr(t.onlineSales)} (${onlineShare}%)`],
                ["Cash on delivery", `${inr(t.codSales)} (${t.sales ? 100 - onlineShare : 0}%)`],
                ["Delivery charges collected", inr(t.deliveryFees)],
                ["Discounts given", inr(t.discounts)],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <dt className={`font-semibold ${muted}`}>{k}</dt>
                  <dd className={`font-black tabular-nums ${strong}`}>{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>

      {/* Lifetime, always shown */}
      <div className={card}>
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-[#FF5B00]" />
          <h3 className={`text-sm font-black ${strong}`}>Lifetime</h3>
          {lifetime.firstOrderMs && (
            <span className={`text-[11px] font-semibold ${muted}`}>since {dayLabel(istDayKey(lifetime.firstOrderMs), true)}</span>
          )}
        </div>
        <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          {[
            ["Total sales", inr(lifetime.totals.sales)],
            ["Orders delivered", lifetime.totals.delivered],
            ["Orders placed", lifetime.totals.orders],
            ["Items sold", lifetime.totals.units],
            ["Average order", inr(lifetime.averageOrder)],
            ["Customers", lifetime.customers],
            ["Days with orders", lifetime.days.length],
            ["Best day", lifetime.bestDay ? `${dayLabel(lifetime.bestDay.key)} · ${inr(lifetime.bestDay.sales)}` : "—"],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className={`font-semibold ${muted}`}>{k}</dt>
              <dd className={`text-base font-black tabular-nums ${strong}`}>{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {/* Day by day table: the chart as numbers */}
      <div className={`${card} overflow-x-auto`}>
        <h3 className={`text-sm font-black mb-3 ${strong}`}>Day by day</h3>
        {stats.days.length === 0 ? (
          <p className={`text-xs font-semibold py-4 text-center ${muted}`}>No orders in this period.</p>
        ) : (
          <table className="w-full text-xs tabular-nums">
            <thead>
              <tr className={`text-left ${muted}`}>
                {["Date", "Placed", "Delivered", "Cancelled", "Sales", "Avg order", "Items"].map((h) => (
                  <th key={h} className="font-black py-1.5 pr-3 whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...stats.days].reverse().map((d) => (
                <tr key={d.key} className={`border-t ${darkMode ? "border-zinc-800" : "border-slate-100"} ${strong}`}>
                  <td className="py-1.5 pr-3 font-bold whitespace-nowrap">{dayLabel(d.key, true)}</td>
                  <td className="py-1.5 pr-3">{d.orders}</td>
                  <td className="py-1.5 pr-3">{d.delivered}</td>
                  <td className="py-1.5 pr-3">{d.cancelled}</td>
                  <td className="py-1.5 pr-3 font-black">{inr(d.sales)}</td>
                  <td className="py-1.5 pr-3">{inr(d.delivered ? d.sales / d.delivered : 0)}</td>
                  <td className="py-1.5 pr-3">{d.units}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
