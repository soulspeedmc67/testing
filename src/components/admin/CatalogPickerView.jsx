import React, { useEffect, useMemo, useState } from "react";
import { ListChecks, Download, Search, Loader2, FileSpreadsheet } from "lucide-react";
import { loadCatalog, browseCatalog, shelfAisles, catalogItem, normaliseName } from "../../lib/productCatalog";
import { catalogStarterCsv, downloadCsv } from "../../lib/csvInventory";
import ProductImage from "../ProductImage";

const PAGE = 100;

/**
 * "Pick from the product list": the owner ticks the items they sell from the
 * ~48k grocery names and downloads them as a CSV in the Import CSV layout,
 * shelf and brand already filled in. Nothing is added to the shop here — the
 * file still needs a price and a quantity per item, so an item can never go
 * on the app at ₹0.
 */
export default function CatalogPickerView({ catalogue = [], darkMode = false, onOpenCsvImport }) {
  const [catalog, setCatalog] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [shelf, setShelf] = useState("");
  const [aisle, setAisle] = useState("");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);
  // Picks are kept by list position, so they survive moving between shelves.
  const [picked, setPicked] = useState(() => new Set());

  const fetchList = () => {
    setLoadError("");
    loadCatalog()
      .then((list) => {
        setCatalog(list);
        setShelf((s) => s || list.shelves[0] || "");
      })
      .catch((e) => setLoadError(e?.message || "The product list didn't load."));
  };
  useEffect(fetchList, []);

  const inShop = useMemo(() => new Set(catalogue.map((p) => normaliseName(p.name))), [catalogue]);

  const shelfCounts = useMemo(() => {
    if (!catalog) return [];
    const counts = new Map(catalog.shelves.map((s) => [s, 0]));
    for (let i = 0; i < catalog.size; i += 1) {
      const s = catalog.aisles[catalog.aisleOf[i]].shelf;
      counts.set(s, counts.get(s) + 1);
    }
    return [...counts];
  }, [catalog]);

  const aisles = useMemo(() => (catalog && shelf ? shelfAisles(catalog, shelf) : []), [catalog, shelf]);
  const matches = useMemo(
    () => (catalog ? browseCatalog(catalog, { shelf, aisle, query }) : []),
    [catalog, shelf, aisle, query]
  );
  useEffect(() => setShown(PAGE), [shelf, aisle, query]);

  const rows = useMemo(
    () => matches.slice(0, shown).map((i) => ({ ...catalogItem(catalog, i), owned: inShop.has(normaliseName(catalog.names[i])) })),
    [matches, shown, catalog, inShop]
  );

  const toggle = (index) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  const pickShown = () =>
    setPicked((prev) => {
      const next = new Set(prev);
      rows.forEach((r) => !r.owned && next.add(r.index));
      return next;
    });

  const download = () => {
    const items = [...picked].sort((a, b) => a - b).map((i) => catalogItem(catalog, i));
    items.sort((a, b) => a.shelf.localeCompare(b.shelf));
    downloadCsv(`dashit-items-to-stock-${items.length}.csv`, catalogStarterCsv(items));
  };

  const card = darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs";
  const subtle = darkMode ? "text-zinc-400" : "text-slate-500";
  const quietBtn = `flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-colors active:scale-95 cursor-pointer ${
    darkMode ? "border-zinc-800 text-zinc-300 hover:bg-zinc-900" : "border-slate-200 text-slate-600 hover:bg-slate-50"
  }`;
  const chip = (on) =>
    `shrink-0 px-3 py-1.5 rounded-xl border text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
      on
        ? "bg-[#FF5B00] border-[#FF5B00] text-white"
        : darkMode
        ? "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        : "border-slate-200 text-slate-700 hover:bg-slate-50"
    }`;

  return (
    <div className="space-y-4">
      <div className={`rounded-2xl p-5 border flex items-start justify-between flex-wrap gap-4 ${card}`}>
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-[#FF5B00]" />
            <h2 className="font-black text-base text-slate-900 dark:text-white">Pick from the product list</h2>
          </div>
          <p className={`text-xs ${subtle}`}>
            Tick the items you sell and download them as a file with the name, shelf and brand filled in. Add
            the price and how many you have, delete the rows you don&apos;t stock, then upload it under
            Import CSV. Photos are looked up when you import.
          </p>
          <p className={`text-xs ${subtle}`}>Well-known brands are listed first.</p>
        </div>
        {onOpenCsvImport && (
          <button type="button" onClick={onOpenCsvImport} className={quietBtn}>
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Go to Import CSV</span>
          </button>
        )}
      </div>

      {!catalog ? (
        <div className={`rounded-2xl p-8 border text-center ${card}`}>
          {loadError ? (
            <div className="space-y-3">
              <p className="text-xs font-bold text-slate-700 dark:text-zinc-200">{loadError}</p>
              <button type="button" onClick={fetchList} className={`${quietBtn} mx-auto`}>
                Try again
              </button>
            </div>
          ) : (
            <p className={`text-xs font-semibold flex items-center justify-center gap-2 ${subtle}`}>
              <Loader2 className="w-4 h-4 animate-spin" /> Loading the product list…
            </p>
          )}
        </div>
      ) : (
        <div className={`rounded-2xl border overflow-hidden ${card}`}>
          <div className="p-4 space-y-3 border-b border-slate-200/70 dark:border-zinc-800">
            <div className="flex gap-2 overflow-x-auto scrollbar-none sm:flex-wrap">
              {shelfCounts.map(([s, count]) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => {
                    setShelf(s);
                    setAisle("");
                  }}
                  className={chip(s === shelf)}
                  aria-pressed={s === shelf}
                >
                  {s} <span className="opacity-60 font-semibold">{count.toLocaleString("en-IN")}</span>
                </button>
              ))}
            </div>

            <div className="flex gap-2 overflow-x-auto scrollbar-none sm:flex-wrap">
              <button type="button" onClick={() => setAisle("")} className={chip(aisle === "")} aria-pressed={aisle === ""}>
                Everything on {shelf}
              </button>
              {aisles.map((a) => (
                <button
                  key={a.label}
                  type="button"
                  onClick={() => setAisle(a.label)}
                  className={chip(a.label === aisle)}
                  aria-pressed={a.label === aisle}
                >
                  {a.label}
                </button>
              ))}
            </div>

            <label className="relative block">
              <span className="sr-only">Search by name or brand</span>
              <Search className={`w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 ${subtle}`} />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by name or brand, e.g. Amul, Maggi"
                className={`w-full text-xs font-bold pl-9 pr-3 py-2.5 rounded-xl border outline-none focus:border-[#FF5B00] ${
                  darkMode
                    ? "bg-[#1A1D26] border-zinc-700 text-white placeholder:text-zinc-500"
                    : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
                }`}
              />
            </label>
          </div>

          <div className={`px-4 py-2.5 flex items-center justify-between gap-3 text-[11px] font-bold ${subtle}`}>
            <span>
              {matches.length.toLocaleString("en-IN")} {matches.length === 1 ? "name" : "names"}
            </span>
            <button type="button" onClick={pickShown} className="text-[#FF5B00] hover:underline cursor-pointer">
              Tick all shown
            </button>
          </div>

          <ul className="divide-y divide-slate-100 dark:divide-zinc-800/70">
            {rows.map((r) => (
              <li key={r.index}>
                <label
                  className={`flex items-center gap-3 px-4 py-2.5 ${
                    r.owned ? "opacity-50 cursor-not-allowed" : "cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900/40"
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={r.owned}
                    checked={picked.has(r.index)}
                    onChange={() => toggle(r.index)}
                    className="w-4 h-4 accent-[#FF5B00] shrink-0"
                  />
                  <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-zinc-800/80 border border-slate-200/50 dark:border-zinc-700/50 overflow-hidden shrink-0 flex items-center justify-center">
                    <ProductImage src={r.img} name={r.name} size="small" />
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold text-slate-900 dark:text-white truncate">{r.name}</span>
                    <span className={`block text-[11px] truncate ${subtle}`}>
                      {[r.brand, r.unit, r.owned ? "Already in the shop" : !aisle && r.aisle].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </label>
              </li>
            ))}
          </ul>

          {matches.length === 0 && <p className={`px-4 py-8 text-center text-xs font-semibold ${subtle}`}>Nothing matches.</p>}

          {matches.length > shown && (
            <div className="p-3 text-center border-t border-slate-100 dark:border-zinc-800/70">
              <button type="button" onClick={() => setShown((n) => n + PAGE)} className={`${quietBtn} mx-auto`}>
                Show {Math.min(PAGE, matches.length - shown)} more
              </button>
            </div>
          )}

          <div
            className={`sticky bottom-0 px-4 py-3 border-t flex items-center justify-between gap-3 ${
              darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200"
            }`}
          >
            <div className="text-xs font-bold text-slate-700 dark:text-zinc-200">
              {picked.size.toLocaleString("en-IN")} ticked
              {picked.size > 0 && (
                <button
                  type="button"
                  onClick={() => setPicked(new Set())}
                  className={`ml-3 font-bold hover:underline cursor-pointer ${subtle}`}
                >
                  Clear
                </button>
              )}
            </div>
            <button
              type="button"
              disabled={picked.size === 0}
              onClick={download}
              className="flex items-center gap-2 bg-[#FF5B00] hover:bg-[#E04E00] text-white font-black text-xs px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download className="w-4 h-4" />
              <span>Download file</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
