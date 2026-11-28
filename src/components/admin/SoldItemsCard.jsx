import React, { useMemo, useState } from "react";
import { Download, Search, ListOrdered } from "lucide-react";
import { triggerCsvDownload } from "../../lib/csvExport";
import { soldItemsToCsv, istDayKey } from "../../lib/salesAnalytics";

const inr = (n) => `₹${Math.round(Number(n) || 0).toLocaleString("en-IN")}`;
const SORTS = [
  { id: "units", label: "Most sold" },
  { id: "revenue", label: "Most money" },
  { id: "recent", label: "Sold most recently" },
  { id: "orders", label: "In most orders" },
  { id: "name", label: "A to Z" },
];
const PAGE = 50;

const soldOn = (ms) =>
  new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

/**
 * Every item sold in the chosen period (delivered orders), not just the top
 * ten: pieces, money, how many orders it was in and when it last sold, with
 * search, sorting and a CSV download. Rows come from summarize().soldItems.
 */
export default function SoldItemsCard({ items = [], rangeLabel = "", rangeId = "", darkMode = false }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("units");
  const [shown, setShown] = useState(PAGE);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q ? items.filter((p) => `${p.name} ${p.unit}`.toLowerCase().includes(q)) : [...items];
    const by = {
      units: (a, b) => b.units - a.units || b.revenue - a.revenue,
      revenue: (a, b) => b.revenue - a.revenue || b.units - a.units,
      recent: (a, b) => b.lastMs - a.lastMs,
      orders: (a, b) => b.orders - a.orders || b.units - a.units,
      name: (a, b) => a.name.localeCompare(b.name, "en-IN"),
    }[sort];
    return list.sort(by);
  }, [items, query, sort]);

  const totals = useMemo(
    () => items.reduce((t, p) => ({ units: t.units + p.units, revenue: t.revenue + p.revenue }), { units: 0, revenue: 0 }),
    [items]
  );

  const card = `rounded-2xl border p-4 ${darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"}`;
  const muted = darkMode ? "text-zinc-400" : "text-slate-500";
  const strong = darkMode ? "text-white" : "text-slate-900";
  const field = darkMode ? "bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-500" : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400";
  const rowLine = darkMode ? "border-zinc-800" : "border-slate-100";

  return (
    <div className={card}>
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <h3 className={`text-sm font-black flex items-center gap-1.5 ${strong}`}>
            <ListOrdered className="w-4 h-4 text-[#FF5B00]" /> Every item sold
          </h3>
          <p className={`text-[11px] font-semibold ${muted}`}>
            {items.length} different item{items.length === 1 ? "" : "s"} · {totals.units} pieces · {inr(totals.revenue)}
            {rangeLabel ? ` · ${rangeLabel}` : ""} · delivered orders
          </p>
        </div>
        <button
          type="button"
          onClick={() => triggerCsvDownload(soldItemsToCsv(rows), `dashit-items-sold-${rangeId || "period"}-${istDayKey(Date.now())}.csv`)}
          disabled={!rows.length}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black disabled:opacity-40 ${
            darkMode ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          <Download className="w-3.5 h-3.5" /> CSV
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-3">
        <label className="relative flex-1 min-w-[180px]">
          <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 ${muted}`} aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShown(PAGE);
            }}
            placeholder="Find an item"
            aria-label="Find an item"
            className={`w-full h-9 pl-8 pr-3 rounded-xl border text-xs font-semibold outline-none focus:border-[#FF5B00] ${field}`}
          />
        </label>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          aria-label="Sort by"
          className={`h-9 px-3 rounded-xl border text-xs font-bold outline-none focus:border-[#FF5B00] ${field}`}
        >
          {SORTS.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      {rows.length === 0 ? (
        <p className={`text-xs font-semibold py-6 text-center ${muted}`}>
          {items.length === 0 ? "Nothing delivered in this period." : "No item matches that."}
        </p>
      ) : (
        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-xs min-w-[520px]">
            <thead>
              <tr className={`text-left text-[10.5px] uppercase tracking-wide ${muted}`}>
                <th className="font-black px-1 pb-2">Item</th>
                <th className="font-black px-1 pb-2 text-right">Pieces</th>
                <th className="font-black px-1 pb-2 text-right">Money</th>
                <th className="font-black px-1 pb-2 text-right">Orders</th>
                <th className="font-black px-1 pb-2 text-right">Last sold</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, shown).map((p) => (
                <tr key={p.key} className={`border-t ${rowLine}`}>
                  <td className="px-1 py-2">
                    <span className={`font-bold block truncate max-w-[260px] ${strong}`} title={p.name}>
                      {p.name}
                    </span>
                    {p.unit && <span className={`text-[10.5px] font-semibold ${muted}`}>{p.unit}</span>}
                  </td>
                  <td className={`px-1 py-2 text-right tabular-nums font-black ${strong}`}>{p.units}</td>
                  <td className={`px-1 py-2 text-right tabular-nums font-semibold ${strong}`}>{inr(p.revenue)}</td>
                  <td className={`px-1 py-2 text-right tabular-nums font-semibold ${muted}`}>{p.orders}</td>
                  <td className={`px-1 py-2 text-right tabular-nums font-semibold whitespace-nowrap ${muted}`}>{soldOn(p.lastMs)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {rows.length > shown && (
        <button
          type="button"
          onClick={() => setShown((n) => n + PAGE)}
          className={`mt-3 w-full py-2 rounded-xl text-xs font-black ${darkMode ? "bg-zinc-800 text-zinc-200 hover:bg-zinc-700" : "bg-slate-100 text-slate-700 hover:bg-slate-200"}`}
        >
          Show {Math.min(PAGE, rows.length - shown)} more of {rows.length - shown} left
        </button>
      )}
    </div>
  );
}
