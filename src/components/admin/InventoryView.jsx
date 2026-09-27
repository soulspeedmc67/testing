import React, { useState, useMemo, useEffect } from "react";
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
  Truck,
  ArrowUpDown,
  Building2,
  ChevronDown,
  ChevronUp,
  IndianRupee,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import { generateCsvString, triggerCsvDownload, INVENTORY_CSV_COLUMNS } from "../../lib/csvExport";

export default function InventoryView({
  catalogue = [],
  distributors = [],
  onQuickStockAdjust,
  onClearAllStock,
  isClearingStock = false,
  onNavigateTab,
  onDeleteProduct,
  selectedDistributor = "All",
  onSelectDistributor,
  darkMode = false,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [stockFilter, setStockFilter] = useState("all"); // "all", "low", "out"
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [distributorFilter, setDistributorFilter] = useState(selectedDistributor || "All");
  const [sortBy, setSortBy] = useState("default");
  const [showDistributorBreakdown, setShowDistributorBreakdown] = useState(true);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [isDeletingProduct, setIsDeletingProduct] = useState(false);

  // Sync external selectedDistributor if changed
  useEffect(() => {
    if (selectedDistributor) {
      setDistributorFilter(selectedDistributor);
    }
  }, [selectedDistributor]);

  const handleExportStockCsv = () => {
    const csvContent = generateCsvString(filteredProducts, INVENTORY_CSV_COLUMNS);
    const filterSuffix = stockFilter !== "all" ? `-${stockFilter}` : "";
    const distSuffix = distributorFilter !== "All" ? `-${distributorFilter.replace(/\s+/g, "_")}` : "";
    triggerCsvDownload(csvContent, `dashit-stock-ledger${filterSuffix}${distSuffix}-${Date.now()}.csv`);
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

  // Unique Distributors (derived from distributors list + catalogue)
  const allDistributorNames = useMemo(() => {
    const set = new Set();
    distributors.forEach((d) => {
      if (d.name) set.add(d.name);
    });
    catalogue.forEach((p) => {
      if (p.distributor) set.add(p.distributor);
    });
    return ["All", ...Array.from(set)];
  }, [distributors, catalogue]);

  // Distributor Stock & Valuation Breakdown
  const distributorBreakdown = useMemo(() => {
    const map = {};
    allDistributorNames.forEach((name) => {
      if (name !== "All") {
        map[name] = { name, productCount: 0, totalUnits: 0, totalValue: 0, lowStockCount: 0 };
      }
    });

    catalogue.forEach((p) => {
      const dist = p.distributor || "Myself";
      if (!map[dist]) {
        map[dist] = { name: dist, productCount: 0, totalUnits: 0, totalValue: 0, lowStockCount: 0 };
      }
      const stock = Number(p.stock) || 0;
      const price = Number(p.price) || 0;
      map[dist].productCount += 1;
      map[dist].totalUnits += stock;
      map[dist].totalValue += stock * price;
      if (stock > 0 && stock <= 10) map[dist].lowStockCount += 1;
    });

    return Object.values(map).sort((a, b) => b.totalUnits - a.totalUnits);
  }, [allDistributorNames, catalogue]);

  // Filtered & Sorted List
  const filteredProducts = useMemo(() => {
    let result = catalogue.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const name = String(p.name || "").toLowerCase();
      const brand = String(p.brand || "").toLowerCase();
      const barcode = String(p.barcode || p.id || "").toLowerCase();
      const dist = String(p.distributor || "Myself").toLowerCase();

      const matchesSearch = !q || name.includes(q) || brand.includes(q) || barcode.includes(q) || dist.includes(q);
      if (!matchesSearch) return false;

      if (categoryFilter !== "All" && p.cat !== categoryFilter) return false;

      if (distributorFilter !== "All") {
        const itemDist = p.distributor || "Myself";
        if (itemDist !== distributorFilter) return false;
      }

      const stockNum = Number(p.stock) || 0;
      if (stockFilter === "low") return stockNum > 0 && stockNum <= 10;
      if (stockFilter === "out") return stockNum <= 0;

      return true;
    });

    // Sorting
    if (sortBy === "distributor-asc") {
      result.sort((a, b) => (a.distributor || "Myself").localeCompare(b.distributor || "Myself"));
    } else if (sortBy === "distributor-desc") {
      result.sort((a, b) => (b.distributor || "Myself").localeCompare(a.distributor || "Myself"));
    } else if (sortBy === "stock-asc") {
      result.sort((a, b) => (Number(a.stock) || 0) - (Number(b.stock) || 0));
    } else if (sortBy === "stock-desc") {
      result.sort((a, b) => (Number(b.stock) || 0) - (Number(a.stock) || 0));
    } else if (sortBy === "value-desc") {
      result.sort((a, b) => ((Number(b.stock) || 0) * (Number(b.price) || 0)) - ((Number(a.stock) || 0) * (Number(a.price) || 0)));
    } else if (sortBy === "name-asc") {
      result.sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
    }

    return result;
  }, [catalogue, searchQuery, stockFilter, categoryFilter, distributorFilter, sortBy]);

  const cardCls = darkMode
    ? "bg-[#14161E] border-zinc-800 text-white"
    : "bg-white border-slate-200 text-slate-900 shadow-xs";

  return (
    <div className="space-y-4">
      {/* 1. Quick KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className={`p-4 rounded-2xl border transition-colors ${cardCls}`}>
          <span className="text-[10.5px] font-black uppercase tracking-wider text-amber-500 block">
            Running low
          </span>
          <span className="text-2xl font-black text-amber-500 mt-1 block">
            {summary.lowStockCount}
          </span>
          <p className="text-[10px] text-amber-500/80 font-semibold mt-0.5">10 or fewer left · reorder soon</p>
        </div>

        <div className={`p-4 rounded-2xl border transition-colors ${cardCls}`}>
          <span className="text-[10.5px] font-black uppercase tracking-wider text-rose-500 block">
            Sold out
          </span>
          <span className="text-2xl font-black text-rose-500 mt-1 block">
            {summary.outOfStockCount}
          </span>
          <p className="text-[10px] text-rose-500/80 font-semibold mt-0.5">Customers cannot order these</p>
        </div>

        <div className={`p-4 rounded-2xl border transition-colors ${cardCls}`}>
          <span className="text-[10.5px] font-black uppercase tracking-wider text-blue-500 block">
            Total Warehouse Units
          </span>
          <span className="text-2xl font-black text-blue-500 mt-1 block">
            {summary.totalUnits.toLocaleString()}
          </span>
          <p className="text-[10px] text-blue-500/80 font-semibold mt-0.5">Across {catalogue.length} items</p>
        </div>

        <div className={`p-4 rounded-2xl border transition-colors ${cardCls}`}>
          <div className="flex items-center justify-between">
            <span className="text-[10.5px] font-black uppercase tracking-wider text-[#FF5B00] block">
              Distributors
            </span>
            <button
              type="button"
              onClick={() => onNavigateTab("distributors")}
              className="text-[10px] font-black text-[#FF5B00] hover:underline"
            >
              See all &rarr;
            </button>
          </div>
          <span className="text-2xl font-black mt-1 block text-slate-900 dark:text-white">
            {allDistributorNames.length - 1}
          </span>
          <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-semibold mt-0.5">Including Myself</p>
        </div>
      </div>

      {/* 2. Distributor Breakdown & Attribution Widget */}
      <div className={`rounded-2xl border p-4 transition-colors ${cardCls}`}>
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
          <div className="flex items-center space-x-2">
            <Truck className="w-4 h-4 text-[#FF5B00]" />
            <h3 className="font-black text-xs sm:text-sm uppercase tracking-wide">
              Stock by distributor
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => onNavigateTab("distributors")}
              className="text-xs font-black text-[#FF5B00] hover:underline cursor-pointer"
            >
              Manage
            </button>
            <button
              type="button"
              onClick={() => setShowDistributorBreakdown(!showDistributorBreakdown)}
              className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-400 cursor-pointer"
              title="Show or hide"
            >
              {showDistributorBreakdown ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {showDistributorBreakdown && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {/* "All Distributors" Filter Pill Card */}
            <div
              onClick={() => {
                setDistributorFilter("All");
                if (onSelectDistributor) onSelectDistributor("All");
              }}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                distributorFilter === "All"
                  ? "border-[#FF5B00] bg-[#FF5B00]/10 ring-1 ring-[#FF5B00]"
                  : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-slate-50/60 dark:bg-[#1A1D26]/60"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-500 dark:text-zinc-400">
                  All stock
                </span>
                {distributorFilter === "All" && (
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#FF5B00]" />
                )}
              </div>
              <span className="text-base font-black block mt-1 text-slate-900 dark:text-white">
                {summary.totalUnits} <span className="text-[10px] font-bold text-slate-400">units</span>
              </span>
              <p className="text-[10px] font-semibold text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                Everything
              </p>
            </div>

            {/* Individual Distributor Breakdown Cards */}
            {distributorBreakdown.map((item) => {
              const isSelected = distributorFilter === item.name;
              return (
                <div
                  key={item.name}
                  onClick={() => {
                    const next = isSelected ? "All" : item.name;
                    setDistributorFilter(next);
                    if (onSelectDistributor) onSelectDistributor(next);
                  }}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? "border-[#FF5B00] bg-[#FF5B00]/10 ring-1 ring-[#FF5B00]"
                      : "border-slate-200 dark:border-zinc-800 hover:border-slate-300 dark:hover:border-zinc-700 bg-slate-50/60 dark:bg-[#1A1D26]/60"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10.5px] font-black truncate max-w-[100px] text-slate-900 dark:text-white" title={item.name}>
                      {item.name}
                    </span>
                    {isSelected && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#FF5B00] shrink-0" />
                    )}
                  </div>
                  <span className="text-base font-black block mt-1 text-blue-600 dark:text-blue-400">
                    {item.totalUnits} <span className="text-[10px] font-bold text-slate-400">units</span>
                  </span>
                  <div className="flex items-center justify-between mt-0.5 text-[10px] font-semibold text-slate-500 dark:text-zinc-400">
                    <span>₹{item.totalValue.toLocaleString()}</span>
                    <span>{item.productCount} items</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 3. Search, Filters, Sorting & Action Bar */}
      <div className={`p-4 rounded-2xl border space-y-3 transition-colors ${cardCls}`}>
        <div className="flex items-center justify-between flex-wrap gap-3">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, brand, barcode or distributor"
              className={`w-full text-xs pl-9 pr-3 py-2 rounded-xl border outline-none font-medium transition-all ${
                darkMode
                  ? "bg-[#1A1D26] border-zinc-700 text-white focus:border-[#FF5B00]"
                  : "bg-slate-50 border-slate-200 text-slate-900 focus:border-[#FF5B00]"
              }`}
            />
          </div>

          {/* Distributor Filter Dropdown */}
          <div className="flex items-center space-x-2">
            <div className="relative">
              <select
                value={distributorFilter}
                onChange={(e) => {
                  setDistributorFilter(e.target.value);
                  if (onSelectDistributor) onSelectDistributor(e.target.value);
                }}
                className={`text-xs font-black px-3 py-2 pr-7 rounded-xl border outline-none cursor-pointer appearance-none ${
                  distributorFilter !== "All"
                    ? "bg-[#FF5B00] text-white border-[#FF5B00]"
                    : darkMode
                    ? "bg-[#1A1D26] border-zinc-700 text-zinc-200"
                    : "bg-slate-100 border-slate-200 text-slate-800"
                }`}
                title="Filter by distributor"
              >
                {allDistributorNames.map((d) => (
                  <option key={d} value={d} className="bg-white text-slate-900 dark:bg-zinc-900 dark:text-white">
                    {d === "All" ? "All distributors" : d}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
            </div>

            {/* Sort Dropdown */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className={`text-xs font-black px-3 py-2 pr-7 rounded-xl border outline-none cursor-pointer appearance-none ${
                  sortBy !== "default"
                    ? "bg-slate-900 text-white dark:bg-white dark:text-zinc-950 border-slate-800"
                    : darkMode
                    ? "bg-[#1A1D26] border-zinc-700 text-zinc-200"
                    : "bg-slate-100 border-slate-200 text-slate-800"
                }`}
                title="Sort stock inventory"
              >
                <option value="default" className="bg-white text-slate-900 dark:bg-zinc-900 dark:text-white">
                  Sort: Default
                </option>
                <option value="distributor-asc" className="bg-white text-slate-900 dark:bg-zinc-900 dark:text-white">
                  Sort: Distributor (A → Z)
                </option>
                <option value="distributor-desc" className="bg-white text-slate-900 dark:bg-zinc-900 dark:text-white">
                  Sort: Distributor (Z → A)
                </option>
                <option value="stock-asc" className="bg-white text-slate-900 dark:bg-zinc-900 dark:text-white">
                  Sort: Lowest stock first
                </option>
                <option value="stock-desc" className="bg-white text-slate-900 dark:bg-zinc-900 dark:text-white">
                  Sort: Highest stock first
                </option>
                <option value="value-desc" className="bg-white text-slate-900 dark:bg-zinc-900 dark:text-white">
                  Sort: Highest value first
                </option>
                <option value="name-asc" className="bg-white text-slate-900 dark:bg-zinc-900 dark:text-white">
                  Sort: Name (A → Z)
                </option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none opacity-60" />
            </div>
          </div>

          {/* Quick Stock Filters */}
          <div className="flex items-center space-x-1.5 flex-wrap gap-1">
            <button
              type="button"
              onClick={() => setStockFilter("all")}
              className={`text-xs font-black px-3 min-h-[38px] rounded-xl transition-all cursor-pointer ${
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
              className={`text-xs font-black px-3 min-h-[38px] rounded-xl transition-all cursor-pointer ${
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
              className={`text-xs font-black px-3 min-h-[38px] rounded-xl transition-all cursor-pointer ${
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

          {/* Direct Shortcuts */}
          <div className="flex items-center flex-wrap gap-2 [&>button]:whitespace-nowrap [&>a]:whitespace-nowrap">
            <button
              type="button"
              onClick={handleExportStockCsv}
              className={`flex items-center space-x-1.5 px-3 min-h-[38px] rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                darkMode
                  ? "bg-[#1A1D26] hover:bg-zinc-800 text-zinc-200 border-zinc-700"
                  : "bg-white hover:bg-slate-50 text-slate-800 border-slate-200 shadow-xs"
              }`}
              title="Export filtered stock report to CSV"
            >
              <Download className="w-3.5 h-3.5 text-[#FF5B00]" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              disabled={isClearingStock || catalogue.length === 0}
              className={`flex items-center space-x-1.5 px-3 min-h-[38px] rounded-xl text-xs font-bold border transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
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
              className="flex items-center space-x-1.5 bg-[#FF5B00] hover:bg-[#E04E00] text-white px-3.5 min-h-[38px] rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs active:scale-95"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Scan / Add Item</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab("batch-inward")}
              className={`flex items-center space-x-1.5 px-3.5 min-h-[38px] rounded-xl text-xs font-black border transition-all cursor-pointer ${
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

      {/* 4. Inventory Stock Table */}
      <div className={`rounded-2xl border overflow-hidden transition-colors ${cardCls}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead
              className={`border-b font-black uppercase text-[10px] tracking-wider ${
                darkMode ? "bg-[#14161E] border-zinc-800 text-zinc-400" : "bg-slate-50 border-slate-200 text-slate-500"
              }`}
            >
              <tr>
                <th className="py-3 px-4">Item</th>
                <th className="py-3 px-3">Barcode</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Distributor</th>
                <th className="py-3 px-3">Price / MRP</th>
                <th className="py-3 px-3">Stock</th>
                <th className="py-3 px-4 text-right">Change stock</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? "divide-zinc-800" : "divide-slate-100"}`}>
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    No products found matching your inventory filters.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const stockNum = Number(p.stock) || 0;
                  const isLow = stockNum > 0 && stockNum <= 10;
                  const isOut = stockNum <= 0;
                  const distName = p.distributor || "Myself";

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
                        <button
                          type="button"
                          onClick={() => {
                            setDistributorFilter(distName);
                            if (onSelectDistributor) onSelectDistributor(distName);
                          }}
                          className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg text-[10.5px] font-bold border transition-all cursor-pointer ${
                            distName === "Myself"
                              ? "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 border-slate-200 dark:border-zinc-700"
                              : "bg-blue-500/10 text-blue-600 dark:bg-blue-500/15 dark:text-blue-300 border-blue-500/20 hover:bg-blue-500/20"
                          }`}
                          title={`Filter by ${distName}`}
                        >
                          <Truck className="w-3 h-3 shrink-0" />
                          <span className="truncate max-w-[130px]">{distName}</span>
                        </button>
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

                          <div className="w-px h-4 bg-slate-200 dark:bg-zinc-700 mx-0.5" />

                          <button
                            type="button"
                            onClick={() => setProductToDelete(p)}
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-[#1A1D26] border border-slate-200/60 dark:border-zinc-700 hover:bg-rose-100 hover:text-rose-600 hover:border-rose-300 dark:hover:bg-rose-950/50 dark:hover:text-rose-300 dark:hover:border-rose-800 text-slate-400 dark:text-zinc-500 flex items-center justify-center transition-colors cursor-pointer"
                            title={`Delete ${p.name} from inventory`}
                            aria-label={`Delete ${p.name}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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

      {/* CONFIRM CLEAR STOCK SHEET */}
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
                  the stock back in, or use Import CSV, whenever you restock.
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

      {/* CONFIRM DELETE PRODUCT MODAL */}
      {productToDelete && (
        <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => !isDeletingProduct && setProductToDelete(null)}
          />

          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-prod-title"
            className={`relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 pb-[max(20px,calc(16px+env(safe-area-inset-bottom,0px)))] shadow-2xl animate-in slide-in-from-bottom-4 ${
              darkMode ? "bg-[#14161E] border border-zinc-800" : "bg-white"
            }`}
          >
            <span className="mx-auto mb-3 block sm:hidden h-1 w-10 rounded-full bg-slate-300 dark:bg-zinc-700" />

            <div className="flex items-start gap-3.5">
              <span className="w-11 h-11 shrink-0 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-200/50 dark:border-rose-900/50">
                <Trash2 className="w-5 h-5" />
              </span>
              <div className="min-w-0">
                <h3
                  id="delete-prod-title"
                  className="text-base font-black text-slate-900 dark:text-white leading-tight"
                >
                  Delete this item from store?
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  This will permanently remove the product from customer catalogue, inventory ledger, and search.
                </p>
              </div>
            </div>

            {/* Product Snapshot */}
            <div className={`mt-4 p-3 rounded-2xl border flex items-center space-x-3 ${darkMode ? "bg-[#0D0E12] border-zinc-800" : "bg-slate-50 border-slate-200"}`}>
              {productToDelete.img && (
                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-slate-200/60 dark:border-zinc-750 bg-white">
                  <img
                    src={productToDelete.img}
                    alt={productToDelete.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-bold text-slate-900 dark:text-white truncate">
                  {productToDelete.name}
                </h4>
                <div className="text-[11px] text-slate-500 dark:text-zinc-400 flex items-center space-x-2 mt-0.5 flex-wrap">
                  <span>{productToDelete.cat || "Grocery"}</span>
                  <span>·</span>
                  <span>₹{productToDelete.price}</span>
                  <span>·</span>
                  <span className="font-bold text-slate-700 dark:text-zinc-200">{Number(productToDelete.stock) || 0} units</span>
                </div>
                {productToDelete.distributor && (
                  <p className="text-[10px] text-blue-600 dark:text-blue-300 font-semibold mt-0.5 truncate">
                    Supplier: {productToDelete.distributor}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                disabled={isDeletingProduct}
                className={`min-h-[46px] rounded-2xl text-xs font-bold border transition-colors cursor-pointer ${
                  darkMode
                    ? "border-zinc-700 text-zinc-200 hover:bg-zinc-800"
                    : "border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (onDeleteProduct) {
                    setIsDeletingProduct(true);
                    try {
                      await onDeleteProduct(
                        productToDelete.id || productToDelete.barcode,
                        productToDelete.name,
                        true // skip window.confirm
                      );
                    } finally {
                      setIsDeletingProduct(false);
                      setProductToDelete(null);
                    }
                  }
                }}
                disabled={isDeletingProduct}
                className="min-h-[46px] rounded-2xl text-xs font-black bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-60 cursor-pointer flex items-center justify-center space-x-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingProduct ? "Deleting…" : "Yes, Delete Product"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
