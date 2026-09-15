import React, { useState, useRef } from "react";
import {
  Barcode,
  Search,
  Loader2,
  Plus,
  Package,
  Sparkles,
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Trash2,
  ArrowRight,
  RefreshCw,
  SlidersHorizontal,
} from "lucide-react";
import {
  parseCsvText,
  autoDetectColumnMapping,
  processRawRows,
  publishImportedProducts,
  generateSampleCsvTemplate,
} from "../../lib/csvImport";
import { triggerCsvDownload } from "../../lib/csvExport";

const CATEGORIES = [
  "Snacks",
  "Dairy & Bakery",
  "Bakery & Breads",
  "Biscuits & Bakery",
  "Beverages",
  "Atta, Rice & Dal",
  "Masala & Dry Fruits",
  "Gourmet & Spices",
  "Instant Food",
  "Personal Care",
  "Household Essentials",
  "Fruits & Vegetables",
];

export default function ImporterView({
  searchQuery = "",
  setSearchQuery,
  onSearch,
  isSearching = false,
  results = [],
  onImportProduct,
  darkMode = false,
}) {
  // Mode: "csv" | "barcode"
  const [importMode, setImportMode] = useState("csv");

  // CSV Wizard Step: 1 = upload, 2 = review & edit, 3 = publishing/complete
  const [csvStep, setCsvStep] = useState(1);
  const [fileName, setFileName] = useState("");
  const [rawHeaders, setRawHeaders] = useState([]);
  const [rawRows, setRawRows] = useState([]);
  const [columnMapping, setColumnMapping] = useState({});
  const [parsedProducts, setParsedProducts] = useState([]);
  const [filterTab, setFilterTab] = useState("all"); // "all" | "error" | "warning" | "valid"

  // Publishing status
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishProgress, setPublishProgress] = useState({ current: 0, total: 0 });
  const [publishResult, setPublishResult] = useState(null);

  const fileInputRef = useRef(null);

  // 1. Handle File Selection & Parsing
  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const text = event.target?.result;
        const { headers, rows } = parseCsvText(text);

        if (headers.length === 0 || rows.length === 0) {
          alert("The uploaded CSV file is empty or formatted improperly.");
          return;
        }

        const detectedMapping = autoDetectColumnMapping(headers);
        setRawHeaders(headers);
        setRawRows(rows);
        setColumnMapping(detectedMapping);

        const processed = processRawRows(rows, headers, detectedMapping);
        setParsedProducts(processed);
        setCsvStep(2);
      } catch (err) {
        console.error("CSV parse error:", err);
        alert("Failed to parse CSV file. Please verify it is a valid CSV.");
      }
    };

    reader.readAsText(file, "UTF-8");
  };

  // Download Sample Template
  const handleDownloadTemplate = () => {
    const templateContent = generateSampleCsvTemplate();
    triggerCsvDownload(templateContent, "dashit-products-template.csv");
  };

  // 2. In-Grid Cell Editing
  const handleCellEdit = (rowId, field, value) => {
    setParsedProducts((prev) =>
      prev.map((row) => {
        if (row._id !== rowId) return row;

        const updated = { ...row, [field]: value };
        const errors = [];
        const warnings = [];

        if (!String(updated.name || "").trim()) {
          errors.push("Product title is required.");
        }
        if (Number(updated.price) <= 0) {
          errors.push("Valid price greater than ₹0 is required.");
        }
        if (Number(updated.stock) < 0) {
          errors.push("Stock cannot be negative.");
        }
        if (!updated.img) {
          warnings.push("Image was missing; high-res category stock photo was assigned.");
        }

        const status = errors.length > 0 ? "error" : warnings.length > 0 ? "warning" : "valid";

        return {
          ...updated,
          _status: status,
          _errors: errors,
          _warnings: warnings,
        };
      })
    );
  };

  // Delete Row from Review Table
  const handleDeleteRow = (rowId) => {
    setParsedProducts((prev) => prev.filter((r) => r._id !== rowId));
  };

  // 3. Batch Publish
  const handlePublishAll = async () => {
    const readyItems = parsedProducts.filter((p) => p._status !== "error");
    if (readyItems.length === 0) {
      alert("No valid products to publish. Please fix the highlighted errors first.");
      return;
    }

    setIsPublishing(true);
    setPublishProgress({ current: 0, total: readyItems.length });

    const res = await publishImportedProducts(readyItems, (current, total) => {
      setPublishProgress({ current, total });
    });

    setIsPublishing(false);
    setPublishResult(res);
    setCsvStep(3);
  };

  // Summary Metrics
  const errorCount = parsedProducts.filter((p) => p._status === "error").length;
  const warningCount = parsedProducts.filter((p) => p._status === "warning").length;
  const validCount = parsedProducts.filter((p) => p._status === "valid").length;
  const readyToPublishCount = parsedProducts.length - errorCount;

  const filteredProducts = parsedProducts.filter((p) => {
    if (filterTab === "all") return true;
    return p._status === filterTab;
  });

  return (
    <div className="space-y-4">
      {/* Importer Mode Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200/80 dark:border-zinc-700">
          <button
            type="button"
            onClick={() => setImportMode("csv")}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              importMode === "csv"
                ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 text-[#FF5B00]" />
            <span>Bulk CSV Importer</span>
          </button>
          <button
            type="button"
            onClick={() => setImportMode("barcode")}
            className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all cursor-pointer ${
              importMode === "barcode"
                ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs"
                : "text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
            }`}
          >
            <Barcode className="w-4 h-4 text-blue-500" />
            <span>Open Food Facts Search</span>
          </button>
        </div>

        {importMode === "csv" && (
          <button
            type="button"
            onClick={handleDownloadTemplate}
            className="flex items-center space-x-1.5 text-xs font-bold text-[#FF5B00] hover:text-[#E04E00] px-3 py-1.5 rounded-xl border border-orange-500/30 bg-orange-500/10 transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Sample CSV Template</span>
          </button>
        )}
      </div>

      {/* MODE 1: BULK CSV SPREADSHEET IMPORTER */}
      {importMode === "csv" && (
        <div className="space-y-4">
          {/* STEP 1: UPLOAD DROPZONE */}
          {csvStep === 1 && (
            <div
              className={`p-8 rounded-3xl border-2 border-dashed text-center space-y-4 transition-all ${
                darkMode
                  ? "bg-[#14161E] border-zinc-700 hover:border-[#FF5B00]"
                  : "bg-white border-slate-300 hover:border-[#FF5B00] shadow-xs"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.tsv,.txt"
                onChange={handleFileChange}
                className="hidden"
              />

              <div className="w-16 h-16 rounded-2xl bg-orange-500/10 border border-[#FF5B00]/30 flex items-center justify-center mx-auto text-[#FF5B00]">
                <UploadCloud className="w-8 h-8 stroke-[2.2]" />
              </div>

              <div className="max-w-md mx-auto space-y-1">
                <h3 className="text-base font-black text-slate-900 dark:text-white">
                  Drop your Product Catalog CSV here
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                  Upload your distributor price lists or supplier spreadsheets. DASHit automatically maps column headers and lets you review &amp; edit every item before publishing.
                </p>
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-[#FF5B00] hover:bg-[#E04E00] text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-md cursor-pointer flex items-center space-x-2 transition-all active:scale-95"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Choose CSV File</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadTemplate}
                  className="bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center space-x-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Sample Template</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: EDITABLE REVIEW DATA-GRID SPREADSHEET */}
          {csvStep === 2 && (
            <div className="space-y-3">
              {/* Header Bar with Action Controls */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between flex-wrap gap-3 ${
                  darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
                }`}
              >
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-orange-500/20 text-[#FF5B00] px-2 py-0.5 rounded-md">
                      Editable Review Step
                    </span>
                    <span className="text-xs font-mono text-slate-400">{fileName}</span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white mt-1">
                    Review &amp; Edit Before Publishing ({parsedProducts.length} Items)
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    Click any cell to edit details inline. Correct red errors before publishing into store catalogue.
                  </p>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCsvStep(1);
                      setParsedProducts([]);
                    }}
                    className="px-3 py-2 text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel / Re-upload
                  </button>

                  <button
                    type="button"
                    onClick={handlePublishAll}
                    disabled={isPublishing || readyToPublishCount === 0}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-md flex items-center space-x-2 cursor-pointer transition-all active:scale-95"
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Publishing ({publishProgress.current}/{publishProgress.total})...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Publish {readyToPublishCount} Products</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Status Pills / Filter Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setFilterTab("all")}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    filterTab === "all"
                      ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs"
                      : "bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300"
                  }`}
                >
                  <span>All Rows</span>
                  <span className="font-mono text-[11px] font-black">({parsedProducts.length})</span>
                </button>

                <button
                  type="button"
                  onClick={() => setFilterTab("valid")}
                  className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                    filterTab === "valid"
                      ? "bg-emerald-600 text-white shadow-xs"
                      : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Ready to Publish</span>
                  <span className="font-mono text-[11px] font-black">({validCount})</span>
                </button>

                {warningCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterTab("warning")}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      filterTab === "warning"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>Auto-Fixed Warnings</span>
                    <span className="font-mono text-[11px] font-black">({warningCount})</span>
                  </button>
                )}

                {errorCount > 0 && (
                  <button
                    type="button"
                    onClick={() => setFilterTab("error")}
                    className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                      filterTab === "error"
                        ? "bg-rose-600 text-white shadow-xs"
                        : "bg-rose-500/10 text-rose-700 dark:text-rose-400 border border-rose-500/20"
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Errors Requiring Fix</span>
                    <span className="font-mono text-[11px] font-black">({errorCount})</span>
                  </button>
                )}
              </div>

              {/* Data-Grid Table */}
              <div
                className={`rounded-2xl border overflow-hidden ${
                  darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
                }`}
              >
                <div className="max-h-[500px] overflow-y-auto overflow-x-auto scrollbar-thin">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead
                      className={`sticky top-0 z-10 text-[10.5px] uppercase font-black tracking-wider border-b ${
                        darkMode
                          ? "bg-[#1A1D26] text-slate-400 border-zinc-800"
                          : "bg-slate-50 text-slate-500 border-slate-200"
                      }`}
                    >
                      <tr>
                        <th className="py-2.5 px-3 w-12 text-center">Status</th>
                        <th className="py-2.5 px-3 min-w-[200px]">Product Name (Click to edit)</th>
                        <th className="py-2.5 px-3 min-w-[140px]">Category</th>
                        <th className="py-2.5 px-3 w-24">Price (₹)</th>
                        <th className="py-2.5 px-3 w-24">MRP (₹)</th>
                        <th className="py-2.5 px-3 w-24">Unit</th>
                        <th className="py-2.5 px-3 w-20">Stock</th>
                        <th className="py-2.5 px-3 w-16 text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800">
                      {filteredProducts.map((row) => {
                        const isError = row._status === "error";
                        const isWarning = row._status === "warning";

                        return (
                          <tr
                            key={row._id}
                            className={`transition-colors ${
                              isError
                                ? "bg-rose-500/10 hover:bg-rose-500/15"
                                : isWarning
                                ? "bg-amber-500/5 hover:bg-amber-500/10"
                                : "hover:bg-slate-50/80 dark:hover:bg-zinc-800/50"
                            }`}
                          >
                            {/* Status Icon */}
                            <td className="py-2 px-3 text-center">
                              {isError ? (
                                <span title={row._errors?.join(", ")}>
                                  <XCircle className="w-4 h-4 text-rose-500 inline" />
                                </span>
                              ) : isWarning ? (
                                <span title={row._warnings?.join(", ")}>
                                  <AlertTriangle className="w-4 h-4 text-amber-500 inline" />
                                </span>
                              ) : (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500 inline" />
                              )}
                            </td>

                            {/* Editable Product Name */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={row.name}
                                onChange={(e) => handleCellEdit(row._id, "name", e.target.value)}
                                className={`w-full bg-transparent px-2 py-1 rounded border outline-none font-bold text-xs transition-colors ${
                                  !row.name
                                    ? "border-rose-500 bg-rose-500/10 text-rose-300"
                                    : "border-transparent focus:border-[#FF5B00] text-slate-900 dark:text-white"
                                }`}
                                placeholder="Enter title..."
                              />
                              {row._errors?.length > 0 && (
                                <span className="text-[10px] text-rose-500 font-bold block px-2">
                                  {row._errors[0]}
                                </span>
                              )}
                            </td>

                            {/* Editable Category */}
                            <td className="py-2 px-3">
                              <select
                                value={row.cat}
                                onChange={(e) => handleCellEdit(row._id, "cat", e.target.value)}
                                className="w-full bg-slate-100 dark:bg-zinc-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-zinc-700 px-2 py-1 rounded text-xs font-semibold outline-none"
                              >
                                {CATEGORIES.map((c) => (
                                  <option key={c} value={c}>
                                    {c}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Editable Selling Price */}
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                value={row.price}
                                onChange={(e) => handleCellEdit(row._id, "price", parseFloat(e.target.value) || 0)}
                                className="w-full bg-transparent px-2 py-1 rounded border border-transparent focus:border-[#FF5B00] outline-none font-mono font-bold text-emerald-600 dark:text-emerald-400"
                              />
                            </td>

                            {/* Editable MRP */}
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                value={row.originalPrice}
                                onChange={(e) =>
                                  handleCellEdit(row._id, "originalPrice", parseFloat(e.target.value) || 0)
                                }
                                className="w-full bg-transparent px-2 py-1 rounded border border-transparent focus:border-[#FF5B00] outline-none font-mono text-slate-500"
                              />
                            </td>

                            {/* Editable Unit */}
                            <td className="py-2 px-3">
                              <input
                                type="text"
                                value={row.unit}
                                onChange={(e) => handleCellEdit(row._id, "unit", e.target.value)}
                                className="w-full bg-transparent px-2 py-1 rounded border border-transparent focus:border-[#FF5B00] outline-none text-slate-600 dark:text-slate-300 text-xs"
                              />
                            </td>

                            {/* Editable Stock */}
                            <td className="py-2 px-3">
                              <input
                                type="number"
                                value={row.stock}
                                onChange={(e) => handleCellEdit(row._id, "stock", parseInt(e.target.value, 10) || 0)}
                                className="w-full bg-transparent px-2 py-1 rounded border border-transparent focus:border-[#FF5B00] outline-none font-mono font-bold text-slate-800 dark:text-white"
                              />
                            </td>

                            {/* Row Delete Button */}
                            <td className="py-2 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(row._id)}
                                className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors"
                                title="Delete row"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: PUBLISHING SUCCESS SCREEN */}
          {csvStep === 3 && (
            <div
              className={`p-8 rounded-3xl border text-center space-y-4 ${
                darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
              }`}
            >
              {/* The outcome is read from publishResult. This screen used to show
                  a green tick and "Catalogue Successfully Updated!" even when
                  every batch had been rejected, so a failed import looked
                  identical to a successful one. */}
              {publishResult?.success === false ? (
                <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-500">
                  <AlertTriangle className="w-8 h-8" />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-500">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
              )}

              <div className="max-w-md mx-auto space-y-1.5">
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  {publishResult?.success === false
                    ? "Import did not complete"
                    : "Catalogue updated"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 leading-relaxed">
                  {publishResult?.message ||
                    `Published ${publishProgress.current} products to the live catalogue.`}
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setCsvStep(1);
                    setParsedProducts([]);
                  }}
                  className="bg-[#FF5B00] hover:bg-[#E04E00] text-white px-6 py-2.5 rounded-xl text-xs font-black shadow-md cursor-pointer inline-flex items-center space-x-2 transition-transform active:scale-95"
                >
                  <Plus className="w-4 h-4" />
                  <span>Import Another CSV</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODE 2: OPEN FOOD FACTS BARCODE SEARCH */}
      {importMode === "barcode" && (
        <div className="space-y-4">
          <div
            className={`p-5 rounded-2xl border space-y-3 transition-colors ${
              darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
            }`}
          >
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
                <Barcode className="w-5 h-5 text-[#FF5B00]" />
                <span>Open Food Facts Indian FMCG Importer</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                Search packaging barcode or brand name to query the open Indian retail database and auto-import packaging, ingredients, and pack sizes.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search FMCG (e.g. Lay's Magic Masala, Kurkure, Amul Taaza, 8901058852331)..."
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
                    Import
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
