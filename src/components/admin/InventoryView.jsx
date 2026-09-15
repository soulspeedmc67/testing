import React, { useState, useMemo } from "react";
import {
  Boxes,
  Search,
  AlertTriangle,
  XCircle,
  Plus,
  ArrowDownToLine,
  Camera,
  Layers,
  CheckCircle2,
  Download,
  Ban,
} from "lucide-react";
import { generateCsvString, triggerCsvDownload, INVENTORY_CSV_COLUMNS } from "../../lib/csvExport";

export default function InventoryView({
  catalogue = [],
  onQuickStockAdjust,
  onClearAllStock,
  isClearingStock = false,
  onNavigateTab,
  darkMode = false,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState("all"); // "all", "low", "out"
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleExportStockCsv = () => {
    const csvContent = generateCsvString(filteredProducts, INVENTORY_CSV_COLUMNS);
    const filterSuffix = stockFilter !== "all" ? `-${stockFilter}` : "";
    triggerCsvDownload(csvContent, `dashit-stock-ledger${filterSuffix}-${Date.now()}.csv`);
  };

  // Summary Metrics
  const summary = useMemo(() => {
    const totalUnits = catalogue.reduce((sum, p) => sum + (Number(p.stock) || 0), 0);
    const lowStockCount = catalogue.filter((p) => Number(p.stock) > 0 && Number(p.stock) <= 10).length;
    const outOfStockCount = catalogue.filter((p) => !p.stock || Number(p.stock) <= 0).length;
    return { totalUnits, lowStockCount, outOfStockCount };
  }, [catalogue]);

  // Unique Categories
  const categories = useMemo(() => {
    const set = new Set(["All"]);
    catalogue.forEach((p) => {
      if (p.cat) set.add(p.cat);
    });
    return Array.from(set);
  }, [catalogue]);

  // Filtered List
  const filteredProducts = useMemo(() => {
    return catalogue.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const name = String(p.name || "").toLowerCase();
      const brand = String(p.brand || "").toLowerCase();
      const barcode = String(p.barcode || p.id || "").toLowerCase();

      const matchesSearch = !q || name.includes(q) || brand.includes(q) || barcode.includes(q);
      if (!matchesSearch) return false;

      if (categoryFilter !== "All" && p.cat !== categoryFilter) return false;

      const stockNum = Number(p.stock) || 0;
      if (stockFilter === "low") return stockNum > 0 && stockNum <= 10;
      if (stockFilter === "out") return stockNum <= 0;

      return true;
    });
  }, [catalogue, searchQuery, stockFilter, categoryFilter]);

  return (
    <div className="space-y-4">
      {/* Only the two numbers that ask for an action. Total items and total
          units are already on the console header above this view, and showing
          each figure twice on one screen just invites the question of which one
          is right. */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className={`p-4 rounded-2xl border transition-colors ${
            darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <span className="text-[10.5px] font-black uppercase tracking-wider text-amber-500 block">
            Running low
          </span>
          <span className="text-2xl font-black text-amber-500 mt-1 block">
            {summary.lowStockCount}
          </span>
          <p className="text-[10px] text-amber-500/80 font-semibold mt-0.5">10 or fewer left · reorder soon</p>
        </div>

        <div
          className={`p-4 rounded-2xl border transition-colors ${
            darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <span className="text-[10.5px] font-black uppercase tracking-wider text-rose-500 block">
            Sold out
          </span>
          <span className="text-2xl font-black text-rose-500 mt-1 block">
            {summary.outOfStockCount}
          </span>
          <p className="text-[10px] text-rose-500/80 font-semibold mt-0.5">Customers cannot order these</p>
        </div>
      </div>

      {/* 2. Search, Filters & Action Bar */}
      <div
        className={`p-4 rounded-2xl border space-y-3 transition-colors ${
          darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
        }`}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by title, brand, or barcode..."
              className={`w-full text-xs pl-9 pr-3 py-2 rounded-xl border outline-none font-medium transition-all ${
                darkMode
                  ? "bg-[#1A1D26] border-zinc-700 text-white focus:border-[#FF5B00]"
                  : "bg-slate-50 border-slate-200 text-slate-900 focus:border-[#FF5B00]"
              }`}
            />
          </div>

          {/* Quick Filters */}
          <div className="flex items-center space-x-1.5 flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setStockFilter("all")}
              className={`text-xs font-black px-3 min-h-[40px] rounded-xl transition-all cursor-pointer ${
                stockFilter === "all"
                  ? darkMode
                    ? "bg-white text-zinc-950 font-black shadow-xs"
                    : "bg-slate-900 text-white shadow-xs"
                  : darkMode
                  ? "bg-[#1A1D26] text-zinc-300 hover:bg-zinc-800 border border-zinc-700/60"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              }`}
            >
              All Items ({catalogue.length})
            </button>
            <button
              type="button"
              onClick={() => setStockFilter("low")}
              className={`text-xs font-black px-3 min-h-[40px] rounded-xl transition-all cursor-pointer ${
                stockFilter === "low"
                  ? "bg-amber-500 text-slate-950"
                  : "bg-amber-500/15 text-amber-500 hover:bg-amber-500/25"
              }`}
            >
              <span className="inline-flex items-center space-x-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Running low ({summary.lowStockCount})</span>
              </span>
            </button>
            <button
              type="button"
              onClick={() => setStockFilter("out")}
              className={`text-xs font-black px-3 min-h-[40px] rounded-xl transition-all cursor-pointer ${
                stockFilter === "out"
                  ? "bg-rose-500 text-white"
                  : "bg-rose-500/15 text-rose-500 hover:bg-rose-500/25"
              }`}
            >
              <span className="inline-flex items-center space-x-1">
                <XCircle className="w-3.5 h-3.5" />
                <span>Sold out ({summary.outOfStockCount})</span>
              </span>
            </button>
          </div>

          {/* Direct Shortcuts. These sat in a non-wrapping row, so on a phone the
              labels were squeezed until they broke mid-word ("Clear all sto…").
              They wrap onto a second line now and each keeps its full label. */}
          <div className="flex items-center flex-wrap gap-2 [&>button]:whitespace-nowrap [&>a]:whitespace-nowrap">
            <button
              type="button"
              onClick={handleExportStockCsv}
              className={`flex items-center space-x-1.5 px-3 min-h-[40px] rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                darkMode
                  ? "bg-[#1A1D26] hover:bg-zinc-800 text-zinc-200 border-zinc-700"
                  : "bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-xs"
              }`}
              title="Export filtered stock report to CSV"
            >
              <Download className="w-3.5 h-3.5 text-[#FF5B00]" />
              <span>Export CSV</span>
            </button>

            {/* Marks the whole shop sold out in one step — for a power cut, a
                shutdown, or a day the shop simply cannot deliver. Deliberately
                not styled as a primary action, and it always asks first. */}
            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              disabled={isClearingStock || catalogue.length === 0}
              className={`flex items-center space-x-1.5 px-3 min-h-[40px] rounded-xl text-xs font-bold border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                darkMode
                  ? "bg-rose-950/30 hover:bg-rose-950/60 text-rose-300 border-rose-900"
                  : "bg-white hover:bg-rose-50 text-rose-600 border-rose-200 shadow-xs"
              }`}
              title="Set every item's stock to zero"
            >
              <Ban className="w-3.5 h-3.5" />
              <span>{isClearingStock ? "Clearing..." : "Clear all stock"}</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab("add-product")}
              className="flex items-center space-x-1.5 bg-[#FF5B00] hover:bg-[#E04E00] text-white px-3.5 min-h-[40px] rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Scan / Add Item</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab("batch-inward")}
              className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-black border transition-all cursor-pointer ${
                darkMode
                  ? "bg-[#1A1D26] hover:bg-zinc-800 text-zinc-200 border-zinc-700"
                  : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200"
              }`}
            >
              <ArrowDownToLine className="w-3.5 h-3.5" />
              <span>Batch Inward</span>
            </button>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none pt-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`text-[11px] font-bold px-2.5 py-1 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                categoryFilter === cat
                  ? "bg-slate-900 text-white dark:bg-white dark:text-zinc-950 font-black"
                  : "text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Inventory Stock Table */}
      <div
        className={`rounded-2xl border overflow-hidden transition-colors ${
          darkMode ? "bg-[#12141A] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
        }`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead
              className={`border-b font-black uppercase text-[10.5px] tracking-wider ${
                darkMode ? "bg-[#14161E] border-zinc-800 text-zinc-400" : "bg-slate-50 border-slate-200 text-slate-500"
              }`}
            >
              <tr>
                <th className="py-3 px-4">Product Details</th>
                <th className="py-3 px-3">Barcode</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Price / MRP</th>
                <th className="py-3 px-3">Current Stock</th>
                <th className="py-3 px-4 text-right">Quick Stock Adjust</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? "divide-zinc-800" : "divide-slate-100"}`}>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-xs">
                    No products found matching your inventory filters.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const stockNum = Number(p.stock) || 0;
                  const isLow = stockNum > 0 && stockNum <= 10;
                  const isOut = stockNum <= 0;

                  return (
                    <tr
                      key={p.id || p.barcode}
                      className={`transition-colors ${
                        darkMode ? "hover:bg-[#1A1D26]/70" : "hover:bg-slate-50/70"
                      }`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-11 h-11 rounded-xl bg-slate-100 dark:bg-[#1A1D26] overflow-hidden shrink-0 border border-slate-200/50 dark:border-zinc-750">
                            <img
                              src={p.img}
                              alt={p.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="min-w-0">
                            <span className="font-black text-slate-900 dark:text-white block truncate max-w-sm">
                              {p.name}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">
                              {p.brand || "Indian Brand"} · {p.unit || "1 pc"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-mono text-[11px] text-slate-600 dark:text-zinc-300 bg-slate-100 dark:bg-[#1A1D26] px-2 py-0.5 rounded-md border border-slate-200/50 dark:border-zinc-750">
                          {p.barcode || p.id}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="bg-slate-100 dark:bg-[#1A1D26] text-slate-700 dark:text-zinc-200 border border-slate-200/50 dark:border-zinc-750 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold">
                          {p.cat || "Grocery"}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <span className="font-black text-slate-900 dark:text-white">
                          ₹{p.price}
                        </span>
                        {p.originalPrice && p.originalPrice > p.price && (
                          <span className="text-[10px] text-slate-400 dark:text-zinc-500 line-through ml-1.5 font-medium">
                            ₹{p.originalPrice}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`text-xs font-black px-2.5 py-1 rounded-full ${
                            isOut
                              ? "bg-rose-100 text-rose-700 border border-rose-200 dark:bg-rose-500/15 dark:text-rose-300 dark:border-rose-500/30"
                              : isLow
                              ? "bg-amber-100 text-amber-800 border border-amber-200 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30"
                              : "bg-emerald-100 text-emerald-800 border border-emerald-200 dark:bg-emerald-500/15 dark:text-emerald-300 dark:border-emerald-500/30"
                          }`}
                        >
                          {isOut ? "0 · Out of Stock" : isLow ? `${stockNum} · Low Stock` : `${stockNum} in stock`}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="inline-flex items-center space-x-1">
                          <button
                            type="button"
                            onClick={() => onQuickStockAdjust(p.id || p.barcode, -1)}
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-[#1A1D26] border border-slate-200/60 dark:border-zinc-700 hover:bg-rose-100 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-300 text-slate-700 dark:text-zinc-200 font-black text-xs transition-colors cursor-pointer"
                            title="Deduct 1 unit"
                          >
                            -1
                          </button>
                          <button
                            type="button"
                            onClick={() => onQuickStockAdjust(p.id || p.barcode, 1)}
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-[#1A1D26] border border-slate-200/60 dark:border-zinc-700 hover:bg-emerald-100 hover:text-emerald-600 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 text-slate-700 dark:text-zinc-200 font-black text-xs transition-colors cursor-pointer"
                            title="Add 1 unit"
                          >
                            +1
                          </button>
                          <button
                            type="button"
                            onClick={() => onQuickStockAdjust(p.id || p.barcode, 5)}
                            className="px-2 h-7 rounded-lg bg-slate-100 dark:bg-[#1A1D26] border border-slate-200/60 dark:border-zinc-700 hover:bg-emerald-100 hover:text-emerald-600 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 text-slate-700 dark:text-zinc-200 font-bold text-[11px] transition-colors cursor-pointer"
                            title="Add 5 units"
                          >
                            +5
                          </button>
                          <button
                            type="button"
                            onClick={() => onQuickStockAdjust(p.id || p.barcode, 25)}
                            className="px-2 h-7 rounded-lg bg-slate-100 dark:bg-[#1A1D26] border border-slate-200/60 dark:border-zinc-700 hover:bg-emerald-100 hover:text-emerald-600 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 text-slate-700 dark:text-zinc-200 font-bold text-[11px] transition-colors cursor-pointer"
                            title="Add 25 units"
                          >
                            +25
                          </button>
                          <button
                            type="button"
                            onClick={() => onQuickStockAdjust(p.id || p.barcode, 50)}
                            className="px-2 h-7 rounded-lg bg-slate-100 dark:bg-[#1A1D26] border border-slate-200/60 dark:border-zinc-700 hover:bg-emerald-100 hover:text-emerald-600 dark:hover:bg-emerald-950/40 dark:hover:text-emerald-300 text-slate-700 dark:text-zinc-200 font-bold text-[11px] transition-colors cursor-pointer"
                            title="Add 50 units"
                          >
                            +50
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CONFIRM SHEET — slides up from the bottom, the way every dialog in this
          app does. Zeroing the shop's stock hides every product from customers,
          so it states plainly what will happen and how to undo it. */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[120] flex items-end justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => !isClearingStock && setShowClearConfirm(false)}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="clear-stock-title"
            className={`relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl sm:mb-6 p-5 pb-[max(20px,calc(16px+env(safe-area-inset-bottom,0px)))] shadow-2xl animate-in slide-in-from-bottom-4 ${
              darkMode ? "bg-[#14161E] border-t border-zinc-800" : "bg-white"
            }`}
          >
            <span className="mx-auto mb-4 block h-1 w-10 rounded-full bg-slate-300 dark:bg-zinc-700" />

            <div className="flex items-start gap-3">
              <span className="w-10 h-10 shrink-0 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-300 flex items-center justify-center">
                <Ban className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <h3
                  id="clear-stock-title"
                  className="text-base font-black text-slate-900 dark:text-white leading-tight"
                >
                  Mark everything sold out?
                </h3>
                <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 mt-1.5 leading-relaxed">
                  All {catalogue.length} items will be set to 0 units, and customers
                  will not be able to order any of them. Nothing is deleted — type
                  the stock back in, or use Excel file, whenever you restock.
                </p>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearingStock}
                className={`min-h-[48px] rounded-2xl text-sm font-bold border transition-colors ${
                  darkMode
                    ? "border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Keep stock
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (onClearAllStock) await onClearAllStock();
                  setShowClearConfirm(false);
                }}
                disabled={isClearingStock}
                className="min-h-[48px] rounded-2xl text-sm font-black bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-60"
              >
                {isClearingStock ? "Clearing..." : "Yes, clear all"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
