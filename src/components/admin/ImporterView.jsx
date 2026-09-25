import React from "react";
import { Barcode, Search, Loader2, Package, FileSpreadsheet } from "lucide-react";

/**
 * Look an item up by barcode or name and add it to the shop. CSV files go
 * through Import CSV, which asks who the stock came from.
 */
export default function ImporterView({
  searchQuery = "",
  setSearchQuery,
  onSearch,
  isSearching = false,
  results = [],
  onImportProduct,
  onOpenCsvImport,
  darkMode = false,
}) {
  return (
    <div className="space-y-4">
      <div className="space-y-4">
        <div
          className={`p-5 rounded-2xl border space-y-3 transition-colors ${
            darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
              <Barcode className="w-5 h-5 text-[#FF5B00]" />
              <span>Find by barcode</span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
              Type a barcode or a product name. We look it up and fill in the name, photo and pack size for you.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Barcode or name, e.g. Amul Taaza or 8901058852331"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onSearch()}
                className={`w-full pl-10 pr-3 py-2.5 text-xs font-bold rounded-xl border outline-none transition-all ${
                  darkMode
                    ? "bg-[#1A1D26] border-zinc-700 text-white focus:border-[#FF5B00]"
                    : "bg-slate-50 border-slate-200 text-slate-900 focus:border-[#FF5B00]"
                }`}
              />
            </div>

            <button
              type="button"
              onClick={() => onSearch()}
              disabled={isSearching}
              className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-950 dark:hover:bg-zinc-200 px-6 py-2.5 rounded-xl text-xs font-black shadow-xs cursor-pointer flex items-center space-x-2 shrink-0 disabled:opacity-50 transition-colors"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              <span>Search</span>
            </button>
          </div>
        </div>

        {/* Results Grid */}
        {results.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {results.map((item, idx) => (
              <div
                key={idx}
                className={`p-3.5 rounded-2xl border flex items-center justify-between space-x-3 transition-colors ${
                  darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
                }`}
              >
                <div className="flex items-center space-x-3 min-w-0">
                  {item.img ? (
                    <img
                      src={item.img}
                      alt={item.name}
                      className="w-12 h-12 object-cover rounded-xl shrink-0 bg-slate-100 dark:bg-zinc-800 border border-slate-200/50 dark:border-zinc-750"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400 dark:text-zinc-500 shrink-0">
                      <Package className="w-5 h-5" />
                    </div>
                  )}
                  <div className="truncate">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                      {item.name}
                    </span>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-semibold block">
                      {item.unit || "1 pack"} · {item.cat || "Snacks"}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => onImportProduct(item)}
                  className="bg-[#FF5B00] hover:bg-[#E04E00] text-white text-[11px] font-black px-3 py-1.5 rounded-xl shrink-0 cursor-pointer shadow-xs active:scale-95"
                >
                  Add
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {onOpenCsvImport && (
        <button
          type="button"
          onClick={onOpenCsvImport}
          className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl border text-xs font-bold transition-colors cursor-pointer ${
            darkMode ? "border-zinc-800 text-zinc-300 hover:bg-zinc-900" : "border-slate-200 text-slate-600 hover:bg-slate-50"
          }`}
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
          <span>Have a CSV file? Import it instead</span>
        </button>
      )}
    </div>
  );
}
