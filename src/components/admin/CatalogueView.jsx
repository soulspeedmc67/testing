import React, { useState, useMemo } from "react";
import {
  Tag,
  Search,
  Trash2,
  Plus,
  ExternalLink,
  Layers,
  Boxes,
  Download,
} from "lucide-react";
import { generateCsvString, triggerCsvDownload, CATALOGUE_CSV_COLUMNS } from "../../lib/csvExport";

export default function CatalogueView({
  catalogue = [],
  onDeleteProduct,
  onNavigateTab,
  darkMode = false,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");

  const handleExportCsv = () => {
    const csvContent = generateCsvString(filteredCatalogue, CATALOGUE_CSV_COLUMNS);
    triggerCsvDownload(csvContent, `dashit-catalogue-${Date.now()}.csv`);
  };

  const categories = useMemo(() => {
    const set = new Set(["All"]);
    catalogue.forEach((p) => {
      if (p.cat) set.add(p.cat);
    });
    return Array.from(set);
  }, [catalogue]);

  const filteredCatalogue = useMemo(() => {
    return catalogue.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const name = String(p.name || "").toLowerCase();
      const brand = String(p.brand || "").toLowerCase();
      const barcode = String(p.barcode || p.id || "").toLowerCase();

      const matchesSearch = !q || name.includes(q) || brand.includes(q) || barcode.includes(q);
      if (!matchesSearch) return false;

      if (categoryFilter !== "All" && p.cat !== categoryFilter) return false;

      return true;
    });
  }, [catalogue, searchQuery, categoryFilter]);

  return (
    <div className="space-y-4">
      {/* 1. Header & Controls */}
      <div
        className={`p-4 rounded-2xl border space-y-3 transition-colors ${
          darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
        }`}
      >
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
              <span>Store Catalogue Items</span>
              <span className="text-xs font-mono font-bold text-slate-400">
                ({catalogue.length} products)
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              Manage live products visible to shoppers on the DASHit mobile app & web.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search catalogue..."
                className={`w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border outline-none font-medium ${
                  darkMode
                    ? "bg-[#1A1D26] border-zinc-700 text-white focus:border-[#FF5B00]"
                    : "bg-slate-50 border-slate-200 text-slate-900 focus:border-[#FF5B00]"
                }`}
              />
            </div>

            <button
              type="button"
              onClick={handleExportCsv}
              className="bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5 active:scale-95"
              title="Export visible catalogue to CSV"
            >
              <Download className="w-3.5 h-3.5 text-[#FF5B00]" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigateTab("add-product")}
              className="bg-[#FF5B00] hover:bg-[#E04E00] text-white px-4 py-2 rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer flex items-center space-x-1.5 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Add Product</span>
            </button>
          </div>
        </div>

        {/* Category Filters */}
        <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none pt-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`text-[11px] font-bold px-3 py-1 rounded-lg whitespace-nowrap transition-all cursor-pointer ${
                categoryFilter === cat
                  ? "bg-slate-900 text-white dark:bg-white dark:text-zinc-950 font-black shadow-xs"
                  : "text-slate-500 hover:bg-slate-100 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* 2. Catalogue Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredCatalogue.length === 0 ? (
          <div className="col-span-full py-16 text-center text-slate-500 dark:text-zinc-400 text-xs">
            No products found matching your catalogue search.
          </div>
        ) : (
          filteredCatalogue.map((p) => {
            const stock = Number(p.stock) || 0;
            const isOutOfStock = stock <= 0;

            return (
              <div
                key={p.id || p.barcode}
                className={`rounded-2xl border p-3.5 flex flex-col justify-between space-y-3 transition-all ${
                  darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
                }`}
              >
                <div className="space-y-2.5">
                  <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 dark:bg-zinc-800 relative border border-slate-200/50 dark:border-zinc-750">
                    <img
                      src={p.img}
                      alt={p.name}
                      className="w-full h-full object-cover"
                    />
                    {p.badge && (
                      <span className="absolute top-2 left-2 bg-[#FF5B00] text-white text-[9px] font-black uppercase px-2 py-0.5 rounded-md shadow-xs">
                        {p.badge}
                      </span>
                    )}
                    <span
                      className={`absolute bottom-2 right-2 text-[9.5px] font-black px-2 py-0.5 rounded-md shadow-xs ${
                        isOutOfStock
                          ? "bg-rose-600 text-white"
                          : stock <= 10
                          ? "bg-amber-500 text-slate-950"
                          : "bg-emerald-600 text-white"
                      }`}
                    >
                      {isOutOfStock ? "Out of Stock" : `${stock} in stock`}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-bold uppercase tracking-wider block">
                      {p.brand || "Indian Brand"} · {p.cat || "Grocery"}
                    </span>
                    <h4 className="font-black text-xs text-slate-900 dark:text-white line-clamp-2 mt-0.5">
                      {p.name}
                    </h4>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200/50 dark:border-zinc-800 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-black text-slate-900 dark:text-white">
                      ₹{p.price}
                    </span>
                    {p.originalPrice && p.originalPrice > p.price && (
                      <span className="text-[10.5px] text-slate-400 dark:text-zinc-500 line-through ml-1 font-medium">
                        ₹{p.originalPrice}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteProduct(p.id || p.barcode, p.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                    title="Remove from Store"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
