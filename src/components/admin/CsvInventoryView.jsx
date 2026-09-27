import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  FileSpreadsheet,
  Upload,
  Download,
  FileDown,
  AlertTriangle,
  CheckCircle2,
  PackagePlus,
  RefreshCw,
  Trash2,
  X,
  Truck,
  User,
  Plus,
  Check,
  Search,
  Loader2,
} from "lucide-react";
import {
  buildImportPlan,
  planToStockUpdates,
  productsToCsv,
  downloadCsv,
  CSV_TEMPLATE,
} from "../../lib/csvInventory";
import { SELF_DISTRIBUTOR_NAME } from "../../lib/db";
import StockSourceSheet from "./StockSourceSheet";

const LAST_SOURCE_KEY = "dashit_last_stock_source";
/* The check list only draws the rows in view. Every row has this fixed height,
   which is what lets thousands of lines scroll without the page stalling. */
const ROW_HEIGHT = 60;
const LIST_HEIGHT = 440;
const OVERSCAN = 8;
/* Rows left out for a problem are listed above the check list; past this many
   the rest are counted rather than drawn. */
const MAX_ERRORS_SHOWN = 30;

const FILTERS = [
  { id: "all", label: "All" },
  { id: "new", label: "New" },
  { id: "restock", label: "More stock" },
  { id: "changes", label: "Price changes" },
  { id: "blocked", label: "Can't add" },
];

function readLastSource() {
  if (typeof window === "undefined") return SELF_DISTRIBUTOR_NAME;
  try {
    return localStorage.getItem(LAST_SOURCE_KEY) || SELF_DISTRIBUTOR_NAME;
  } catch (e) {
    return SELF_DISTRIBUTOR_NAME;
  }
}

function rememberSource(name) {
  try {
    localStorage.setItem(LAST_SOURCE_KEY, name);
  } catch (e) {}
}

/** Lets the next paint happen before heavy work, so a spinner shows first. */
const nextFrame = () => new Promise((resolve) => setTimeout(resolve, 30));

/**
 * Import items from a CSV file (Excel can save one). The owner picks who the
 * stock is from (or adds a new distributor right there), chooses the file, then
 * checks every line before saving.
 */
export default function CsvInventoryView({
  catalogue = [],
  distributors = [],
  onQuickAddDistributor,
  onApplyImport,
  darkMode = false,
}) {
  const fileRef = useRef(null);
  /* The file's text is kept out of React state: putting a multi-megabyte file
     into the paste box's value is what used to lock the page up. */
  const importTextRef = useRef("");
  const [pastedText, setPastedText] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [stockMode, setStockMode] = useState("add");
  const [source, setSource] = useState(readLastSource);
  const [plan, setPlan] = useState(null);
  const [excluded, setExcluded] = useState(() => new Set());
  const [isReading, setIsReading] = useState(false);
  const [readError, setReadError] = useState("");
  const [saveProgress, setSaveProgress] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [isSourceSheetOpen, setIsSourceSheetOpen] = useState(false);
  const [filter, setFilter] = useState("all");
  const [queryText, setQueryText] = useState("");

  const isSaving = saveProgress !== null;

  // A distributor that has since been removed falls back to "Myself".
  useEffect(() => {
    if (source === SELF_DISTRIBUTOR_NAME || distributors.length === 0) return;
    if (!distributors.some((d) => d.name === source)) setSource(SELF_DISTRIBUTOR_NAME);
  }, [distributors, source]);

  const card = darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs";
  const subtle = darkMode ? "text-zinc-400" : "text-slate-500";
  const divider = darkMode ? "border-zinc-800" : "border-slate-200";
  const inputCls = darkMode
    ? "bg-[#0D0E12] border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
    : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400";

  const chooseSource = (name) => {
    setSource(name);
    rememberSource(name);
  };

  const buildPlan = useCallback(
    async (text, mode, from) => {
      setIsReading(true);
      setReadError("");
      await nextFrame();
      try {
        const next = buildImportPlan(text, catalogue, mode, from);
        setPlan(next);
        setExcluded(new Set());
      } catch (e) {
        setReadError(`Couldn't read this file: ${e?.message || "unknown problem"}.`);
      } finally {
        setIsReading(false);
      }
    },
    [catalogue]
  );

  const startImport = (text, label) => {
    if (!String(text || "").trim()) {
      setIsReading(false);
      setReadError("That file is empty.");
      return;
    }
    importTextRef.current = text;
    setSourceLabel(label);
    setFilter("all");
    setQueryText("");
    buildPlan(text, stockMode, source);
  };

  const handleFile = (file) => {
    if (!file) return;
    setReadError("");
    setIsReading(true);
    const reader = new FileReader();
    reader.onload = (e) => startImport(String(e.target.result || ""), file.name);
    reader.onerror = () => {
      setIsReading(false);
      setReadError("Couldn't open that file. Save it as CSV from Excel and try again.");
    };
    reader.readAsText(file);
  };

  const handleModeChange = (mode) => {
    if (mode === stockMode) return;
    setStockMode(mode);
    if (plan) buildPlan(importTextRef.current, mode, source);
  };

  const handleSourceChanged = (name) => {
    setIsSourceSheetOpen(false);
    chooseSource(name);
    if (plan) buildPlan(importTextRef.current, stockMode, name);
  };

  const resetImport = () => {
    setPlan(null);
    setExcluded(new Set());
    importTextRef.current = "";
    setSourceLabel("");
    setReadError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const isIncluded = useCallback((item) => !item.blocked && !excluded.has(item.row), [excluded]);

  const toggleRow = useCallback((row) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(row)) next.delete(row);
      else next.add(row);
      return next;
    });
  }, []);

  const visibleItems = useMemo(() => {
    if (!plan) return [];
    const q = queryText.trim().toLowerCase();
    return plan.items.filter((item) => {
      if (filter === "new" && item.action !== "new") return false;
      if (filter === "restock" && item.action !== "restock") return false;
      if (filter === "changes" && item.changes.length === 0) return false;
      if (filter === "blocked" && !item.blocked) return false;
      if (q && !String(item.name).toLowerCase().includes(q) && !String(item.id).toLowerCase().includes(q)) {
        return false;
      }
      return true;
    });
  }, [plan, filter, queryText]);

  // Select all / Clear act on the rows showing, so a filter can be used to pick.
  const setVisibleIncluded = (value) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      visibleItems.forEach((item) => {
        if (item.blocked) return;
        if (value) next.delete(item.row);
        else next.add(item.row);
      });
      return next;
    });
  };

  const summary = useMemo(() => {
    if (!plan) return null;
    let approved = 0;
    let newItems = 0;
    let restocks = 0;
    let units = 0;
    let repricing = 0;
    for (const item of plan.items) {
      if (!isIncluded(item)) continue;
      approved += 1;
      if (item.action === "new") newItems += 1;
      else restocks += 1;
      units += item.qty;
      if (item.changes.length > 0) repricing += 1;
    }
    return {
      approved,
      newItems,
      restocks,
      units,
      repricing,
      skipped: plan.items.length - approved + plan.errors.length,
    };
  }, [plan, isIncluded]);

  const filterCounts = useMemo(() => {
    if (!plan) return {};
    const counts = { all: plan.items.length, new: 0, restock: 0, changes: 0, blocked: 0 };
    plan.items.forEach((item) => {
      if (item.action === "new") counts.new += 1;
      else counts.restock += 1;
      if (item.changes.length > 0) counts.changes += 1;
      if (item.blocked) counts.blocked += 1;
    });
    return counts;
  }, [plan]);

  const handleConfirm = async () => {
    if (!plan || !summary || summary.approved === 0 || isSaving) return;
    const approvedItems = plan.items
      .filter(isIncluded)
      .map((item) => ({ ...item, include: true }));
    const updates = planToStockUpdates(approvedItems, stockMode, source);
    setSaveProgress({ done: 0, total: updates.length });
    try {
      const res = await onApplyImport(updates, summary, (done, total) => setSaveProgress({ done, total }));
      /* Keep the checked list on screen when the save did not go through, so a
         retry does not mean checking the whole file again. */
      if (res && res.success === false) return;
      resetImport();
    } finally {
      setSaveProgress(null);
    }
  };

  const isSelf = source === SELF_DISTRIBUTOR_NAME;

  return (
    <div className="space-y-4">
      {/* 1. Header */}
      <div className={`rounded-2xl p-5 border flex items-start justify-between flex-wrap gap-4 transition-colors ${card}`}>
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
            <h2 className="font-black text-base text-slate-900 dark:text-white">Import from a file</h2>
          </div>
          <p className={`text-xs ${subtle}`}>
            Add new items or more stock from an Excel or CSV file, even thousands of lines. Nothing is
            saved until you check the list and confirm.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => downloadCsv("dashit-sample.csv", CSV_TEMPLATE)}
            className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-colors active:scale-95 cursor-pointer ${
              darkMode
                ? "border-zinc-800 text-zinc-300 hover:bg-zinc-900"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Sample file</span>
          </button>
          <button
            onClick={() =>
              downloadCsv(
                `dashit-items-${new Date().toISOString().slice(0, 10)}.csv`,
                productsToCsv(catalogue)
              )
            }
            className="flex items-center space-x-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-[#061838] text-white hover:bg-[#0a2551] transition-colors active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download my {catalogue.length} items</span>
          </button>
        </div>
      </div>

      {/* 2. Who it's from, then the file */}
      {!plan && (
        <div className={`rounded-2xl p-5 border space-y-5 transition-colors ${card}`}>
          <ProviderPicker
            distributors={distributors}
            value={source}
            onChange={chooseSource}
            onAdd={onQuickAddDistributor}
            darkMode={darkMode}
            disabled={isReading}
          />

          <div className={`border-t ${divider}`} />

          <div>
            <p className="text-sm font-black text-slate-900 dark:text-white">2. Choose the file</p>
            <p className={`text-xs mt-0.5 ${subtle}`}>
              Every item in it will be marked as from <strong>{isSelf ? "Myself" : source}</strong>.
            </p>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (!isReading) handleFile(e.dataTransfer.files?.[0]);
            }}
            onClick={() => !isReading && fileRef.current?.click()}
            className={`rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
              isReading ? "cursor-wait" : "cursor-pointer"
            } ${
              dragOver
                ? "border-emerald-500 bg-emerald-500/5"
                : darkMode
                ? "border-zinc-800 hover:border-zinc-700"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            {isReading ? (
              <>
                <Loader2 className="w-7 h-7 mx-auto mb-2 text-emerald-500 animate-spin" />
                <p className="text-sm font-bold text-slate-900 dark:text-white">Reading the file…</p>
                <p className={`text-[11px] mt-1 ${subtle}`}>Big files take a few seconds.</p>
              </>
            ) : (
              <>
                <Upload className={`w-7 h-7 mx-auto mb-2 ${subtle}`} />
                <p className="text-sm font-bold text-slate-900 dark:text-white">Choose a CSV file</p>
                <p className={`text-[11px] mt-1 ${subtle}`}>
                  Or drag it here. In Excel, use File → Save As → CSV.
                </p>
              </>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv,text/comma-separated-values,text/plain"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>

          {readError && (
            <p className="text-xs text-rose-500 flex items-start space-x-1.5">
              <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" />
              <span>{readError}</span>
            </p>
          )}

          <div className="flex items-center space-x-3">
            <div className={`flex-1 h-px ${darkMode ? "bg-zinc-800" : "bg-slate-200"}`} />
            <span className={`text-[11px] font-bold ${subtle}`}>or paste the rows</span>
            <div className={`flex-1 h-px ${darkMode ? "bg-zinc-800" : "bg-slate-200"}`} />
          </div>

          <textarea
            value={pastedText}
            onChange={(e) => setPastedText(e.target.value)}
            rows={5}
            placeholder={"name,category,quantity,price,mrp,unit\nOnion,Vegetables,40,35,45,1 kg"}
            className={`w-full rounded-xl border px-3 py-2.5 text-xs font-mono leading-relaxed outline-none focus:border-emerald-500 transition-colors ${inputCls}`}
          />

          <button
            disabled={!pastedText.trim() || isReading}
            onClick={() => startImport(pastedText, "Pasted rows")}
            className="w-full py-3 rounded-xl bg-emerald-500 text-white font-black text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-600 transition-colors active:scale-[0.99] cursor-pointer"
          >
            Next
          </button>
        </div>
      )}

      {/* 3. Check every line before saving */}
      {plan && (
        <div className={`rounded-2xl border overflow-hidden transition-colors ${card}`}>
          <div className={`p-5 border-b ${divider}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-black text-base text-slate-900 dark:text-white">Check before saving</h3>
                <p className={`text-xs mt-1 ${subtle}`}>
                  {sourceLabel} · {plan.items.length.toLocaleString("en-IN")}{" "}
                  {plan.items.length === 1 ? "item" : "items"}. Untick anything you don't want.
                </p>
              </div>
              <button
                onClick={resetImport}
                disabled={isSaving}
                className={`p-2 rounded-lg shrink-0 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${
                  darkMode ? "hover:bg-zinc-900 text-zinc-400" : "hover:bg-slate-100 text-slate-500"
                }`}
                aria-label="Cancel this import"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Who it's from */}
            <div
              className={`mt-4 flex items-center gap-3 rounded-2xl border px-3.5 py-3 ${
                darkMode ? "border-zinc-800 bg-[#0D0E12]" : "border-slate-200 bg-slate-50"
              }`}
            >
              <span
                className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center ${
                  isSelf
                    ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                    : darkMode
                    ? "bg-zinc-800 text-zinc-300"
                    : "bg-white text-slate-600 border border-slate-200"
                }`}
              >
                {isSelf ? <User className="w-4 h-4" /> : <Truck className="w-4 h-4" />}
              </span>
              <div className="min-w-0">
                <p className={`text-[11px] font-bold ${subtle}`}>From</p>
                <p className="text-sm font-black text-slate-900 dark:text-white truncate">
                  {isSelf ? "Myself" : source}
                </p>
              </div>
              <button
                type="button"
                disabled={isSaving || isReading}
                onClick={() => setIsSourceSheetOpen(true)}
                className="ml-auto text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer shrink-0 disabled:opacity-40"
              >
                Change
              </button>
            </div>

            {/* Add to stock, or replace the count */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              {[
                { id: "add", label: "Add to my stock", hint: "Adds these numbers to what you have" },
                { id: "set", label: "Replace my count", hint: "These numbers become your stock" },
              ].map((mode) => (
                <button
                  key={mode.id}
                  disabled={isSaving || isReading}
                  onClick={() => handleModeChange(mode.id)}
                  className={`px-3 py-2.5 rounded-xl border text-left transition-colors active:scale-95 cursor-pointer disabled:cursor-not-allowed ${
                    stockMode === mode.id
                      ? "border-emerald-500 bg-emerald-500/10"
                      : darkMode
                      ? "border-zinc-800 hover:border-zinc-700"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <span className="block text-xs font-bold text-slate-900 dark:text-white">{mode.label}</span>
                  <span className={`block text-[11px] ${subtle}`}>{mode.hint}</span>
                </button>
              ))}
            </div>

            {summary && (
              <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "New items", value: summary.newItems },
                  { label: "More stock", value: summary.restocks },
                  { label: "Units", value: summary.units },
                  { label: "Price changes", value: summary.repricing },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className={`rounded-xl px-3 py-2 border ${
                      darkMode ? "border-zinc-800 bg-[#0D0E12]" : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <p className="text-lg font-black text-slate-900 dark:text-white leading-none">
                      {stat.value.toLocaleString("en-IN")}
                    </p>
                    <p className={`text-[11px] font-bold mt-1 ${subtle}`}>{stat.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Problems with the file */}
          {(plan.missingColumns.length > 0 || plan.unmappedHeaders.length > 0 || plan.errors.length > 0) && (
            <div
              className={`px-5 py-3 border-b space-y-1.5 max-h-48 overflow-y-auto ${
                darkMode ? "border-zinc-800 bg-amber-500/5" : "border-slate-200 bg-amber-50"
              }`}
            >
              {plan.missingColumns.length > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-start space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" />
                  <span>
                    Missing column: <strong>{plan.missingColumns.join(", ")}</strong>. Check the first row of the
                    file.
                  </span>
                </p>
              )}
              {plan.unmappedHeaders.length > 0 && (
                <p className={`text-xs ${subtle} flex items-start space-x-1.5`}>
                  <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" />
                  <span>Not used: {plan.unmappedHeaders.join(", ")}</span>
                </p>
              )}
              {plan.errors.slice(0, MAX_ERRORS_SHOWN).map((err) => (
                <p key={err.row} className="text-xs text-rose-500 flex items-start space-x-1.5">
                  <Trash2 className="w-3.5 h-3.5 mt-px shrink-0" />
                  <span>
                    Row {err.row} left out: {err.reason}
                  </span>
                </p>
              ))}
              {plan.errors.length > MAX_ERRORS_SHOWN && (
                <p className="text-xs font-bold text-rose-500">
                  …and {(plan.errors.length - MAX_ERRORS_SHOWN).toLocaleString("en-IN")} more rows left out.
                </p>
              )}
            </div>
          )}

          {/* Find and filter */}
          <div className={`px-5 pt-3 pb-2 space-y-2.5 border-b ${divider}`}>
            <div className="relative">
              <Search className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${subtle}`} />
              <input
                type="search"
                value={queryText}
                onChange={(e) => setQueryText(e.target.value)}
                placeholder="Find an item in this file"
                className={`w-full rounded-xl border pl-8 pr-3 py-2 text-xs outline-none focus:border-emerald-500 transition-colors ${inputCls}`}
              />
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {FILTERS.filter((f) => f.id === "all" || filterCounts[f.id] > 0).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors cursor-pointer ${
                    filter === f.id
                      ? "border-emerald-500 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : darkMode
                      ? "border-zinc-800 text-zinc-400 hover:border-zinc-700"
                      : "border-slate-200 text-slate-500 hover:border-slate-300"
                  }`}
                >
                  {f.label} {(filterCounts[f.id] || 0).toLocaleString("en-IN")}
                </button>
              ))}
              <div className="ml-auto flex items-center gap-3 shrink-0 pl-2">
                <button
                  onClick={() => setVisibleIncluded(true)}
                  className="text-[11px] font-bold text-emerald-500 hover:underline cursor-pointer"
                >
                  Select all
                </button>
                <button
                  onClick={() => setVisibleIncluded(false)}
                  className={`text-[11px] font-bold hover:underline cursor-pointer ${subtle}`}
                >
                  Clear
                </button>
              </div>
            </div>
          </div>

          <div className="relative">
            {isReading && (
              <div
                className={`absolute inset-0 z-10 flex items-center justify-center ${
                  darkMode ? "bg-[#14161E]/80" : "bg-white/80"
                }`}
              >
                <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
              </div>
            )}
            {visibleItems.length === 0 ? (
              <p className={`px-5 py-10 text-center text-xs ${subtle}`}>
                {plan.items.length === 0 ? "No items found in this file." : "Nothing matches."}
              </p>
            ) : (
              <VirtualRows
                items={visibleItems}
                resetKey={`${filter}|${queryText}|${plan.items.length}`}
                renderRow={(item) => (
                  <ImportRow
                    item={item}
                    included={isIncluded(item)}
                    onToggle={toggleRow}
                    darkMode={darkMode}
                    subtle={subtle}
                  />
                )}
              />
            )}
          </div>

          {/* Save */}
          <div className={`p-5 ${darkMode ? "bg-[#0D0E12]" : "bg-slate-50"}`}>
            {isSaving && (
              <div className="mb-3">
                <div className={`h-2 rounded-full overflow-hidden ${darkMode ? "bg-zinc-800" : "bg-slate-200"}`}>
                  <div
                    className="h-full bg-emerald-500 transition-[width] duration-300"
                    style={{
                      width: `${saveProgress.total ? Math.round((saveProgress.done / saveProgress.total) * 100) : 0}%`,
                    }}
                  />
                </div>
                <p className={`text-[11px] text-center mt-1.5 ${subtle}`}>
                  Saved {saveProgress.done.toLocaleString("en-IN")} of {saveProgress.total.toLocaleString("en-IN")}.
                  Keep this page open.
                </p>
              </div>
            )}
            <button
              disabled={isSaving || isReading || !summary || summary.approved === 0}
              onClick={handleConfirm}
              className="w-full py-3.5 rounded-xl bg-emerald-500 text-white font-black text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-600 transition-colors active:scale-[0.99] flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              <span>
                {isSaving
                  ? "Saving…"
                  : summary && summary.approved > 0
                  ? `Save ${summary.approved.toLocaleString("en-IN")} ${
                      summary.approved === 1 ? "item" : "items"
                    } (${summary.units.toLocaleString("en-IN")} units)`
                  : "Nothing selected"}
              </span>
            </button>
            {summary && summary.skipped > 0 && !isSaving && (
              <p className={`text-[11px] text-center mt-2 ${subtle}`}>
                {summary.skipped.toLocaleString("en-IN")} {summary.skipped === 1 ? "row" : "rows"} will be left out.
              </p>
            )}
          </div>
        </div>
      )}

      <StockSourceSheet
        open={isSourceSheetOpen}
        distributors={distributors}
        initial={source}
        onAddDistributor={onQuickAddDistributor}
        onConfirm={handleSourceChanged}
        onClose={() => setIsSourceSheetOpen(false)}
        darkMode={darkMode}
      />
    </div>
  );
}

/* ------------------------------------------------------------------------ */

/**
 * "1. Who is this stock from?" — Myself, any distributor added before, or a
 * new one typed in and saved on the spot.
 */
function ProviderPicker({ distributors, value, onChange, onAdd, darkMode, disabled }) {
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [note, setNote] = useState("");

  const others = distributors.filter((d) => !d.isSelf && d.name);
  const subtle = darkMode ? "text-zinc-400" : "text-slate-500";
  const inputCls = `w-full px-3 py-2.5 rounded-xl text-sm border outline-none focus:border-emerald-500 transition-colors ${
    darkMode
      ? "bg-[#0D0E12] border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
      : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
  }`;

  const chipCls = (selected) =>
    `inline-flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-xl border text-left text-xs font-bold transition-colors cursor-pointer disabled:cursor-not-allowed ${
      selected
        ? "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
        : darkMode
        ? "border-zinc-800 text-zinc-200 hover:border-zinc-700"
        : "border-slate-200 text-slate-700 hover:border-slate-300"
    }`;

  const iconCls = (selected) =>
    `w-6 h-6 shrink-0 rounded-lg flex items-center justify-center ${
      selected
        ? "bg-emerald-500 text-white"
        : darkMode
        ? "bg-zinc-800 text-zinc-300"
        : "bg-slate-100 text-slate-600"
    }`;

  const saveNew = async () => {
    const trimmed = name.trim();
    if (!trimmed || isSaving) return;
    const existing = others.find((d) => d.name.toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      onChange(existing.name);
      setIsAdding(false);
      setName("");
      setPhone("");
      return;
    }
    setIsSaving(true);
    setNote("");
    try {
      const res = onAdd ? await onAdd({ name: trimmed, phone: phone.trim() }) : null;
      // Usable for this import even when only this device kept it.
      onChange(trimmed);
      setIsAdding(false);
      setName("");
      setPhone("");
      if (res && res.synced === false && !res.savedLocally) {
        setNote(`${trimmed} couldn't be saved to your list, but this import will still be marked as from them.`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-black text-slate-900 dark:text-white">1. Who is this stock from?</p>
        <p className={`text-xs mt-0.5 ${subtle}`}>Pick a distributor, or add a new one.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange(SELF_DISTRIBUTOR_NAME)}
          className={chipCls(value === SELF_DISTRIBUTOR_NAME)}
        >
          <span className={iconCls(value === SELF_DISTRIBUTOR_NAME)}>
            {value === SELF_DISTRIBUTOR_NAME ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : <User className="w-3.5 h-3.5" />}
          </span>
          Myself
        </button>

        {others.map((d) => {
          const selected = value === d.name;
          return (
            <button
              key={d.id || d.name}
              type="button"
              disabled={disabled}
              onClick={() => onChange(d.name)}
              className={chipCls(selected)}
              title={d.phone || undefined}
            >
              <span className={iconCls(selected)}>
                {selected ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : <Truck className="w-3.5 h-3.5" />}
              </span>
              <span className="max-w-[180px] truncate">{d.name}</span>
            </button>
          );
        })}

        {!isAdding && (
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              setIsAdding(true);
              setNote("");
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-dashed text-xs font-bold transition-colors cursor-pointer ${
              darkMode
                ? "border-zinc-700 text-emerald-400 hover:border-emerald-500"
                : "border-slate-300 text-emerald-600 hover:border-emerald-500"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            Add distributor
          </button>
        )}
      </div>

      {isAdding && (
        <div
          className={`rounded-2xl border p-3 space-y-2 ${
            darkMode ? "border-zinc-800 bg-[#0D0E12]" : "border-slate-200 bg-slate-50"
          }`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              autoFocus
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") saveNew();
                if (e.key === "Escape") setIsAdding(false);
              }}
              placeholder="Distributor name"
              aria-label="Distributor name"
              className={inputCls}
            />
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && saveNew()}
              placeholder="Phone (optional)"
              aria-label="Distributor phone"
              className={inputCls}
            />
          </div>
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={isSaving}
              onClick={() => {
                setIsAdding(false);
                setName("");
                setPhone("");
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                darkMode ? "text-zinc-300 hover:bg-zinc-800" : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!name.trim() || isSaving}
              onClick={saveNew}
              className="px-4 py-2 rounded-xl text-xs font-black bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              {isSaving ? "Saving…" : "Add and use"}
            </button>
          </div>
        </div>
      )}

      {note && <p className="text-[11px] text-amber-600 dark:text-amber-400">{note}</p>}
    </div>
  );
}

/**
 * Draws only the rows scrolled into view (plus a few either side). A file of
 * several thousand lines used to mount every row at once and freeze the tab.
 */
function VirtualRows({ items, renderRow, resetKey }) {
  const scrollRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setScrollTop(0);
  }, [resetKey]);

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const onScroll = (e) => {
    const top = e.currentTarget.scrollTop;
    cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => setScrollTop(top));
  };

  const totalHeight = items.length * ROW_HEIGHT;
  const viewHeight = Math.min(LIST_HEIGHT, totalHeight);
  const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN);
  const end = Math.min(items.length, Math.ceil((scrollTop + LIST_HEIGHT) / ROW_HEIGHT) + OVERSCAN);

  return (
    <div ref={scrollRef} onScroll={onScroll} className="overflow-y-auto" style={{ height: viewHeight }}>
      <div style={{ height: totalHeight, position: "relative" }}>
        <div style={{ position: "absolute", top: start * ROW_HEIGHT, left: 0, right: 0 }}>
          {items.slice(start, end).map((item) => (
            <React.Fragment key={item.row}>{renderRow(item)}</React.Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}

const ImportRow = React.memo(function ImportRow({ item, included, onToggle, darkMode, subtle }) {
  const details = [
    `${item.cat} · ${item.unit} · ₹${item.price}`,
    item.mergedRows ? `${item.mergedRows.length} rows added together` : null,
    item.changes.length > 0 ? item.changes.join(" · ") : null,
    item.blocked ? item.blockReason : null,
  ].filter(Boolean);

  return (
    <label
      style={{ height: ROW_HEIGHT }}
      className={`flex items-center gap-3 px-5 border-b transition-colors ${
        darkMode ? "border-zinc-800/60 hover:bg-zinc-900/40" : "border-slate-100 hover:bg-slate-50"
      } ${item.blocked ? "opacity-60 cursor-not-allowed" : "cursor-pointer"} ${
        !included && !item.blocked ? "opacity-45" : ""
      }`}
      title={details.join(" · ")}
    >
      <input
        type="checkbox"
        checked={included}
        disabled={item.blocked}
        onChange={() => onToggle(item.row)}
        className="w-4 h-4 accent-emerald-500 shrink-0"
      />

      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
          item.action === "new" ? "bg-sky-500/15 text-sky-500" : "bg-emerald-500/15 text-emerald-500"
        }`}
        title={item.action === "new" ? "New item" : "More stock"}
      >
        {item.action === "new" ? <PackagePlus className="w-4 h-4" /> : <RefreshCw className="w-4 h-4" />}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{item.name}</p>
        <p className={`text-[11px] leading-snug truncate ${subtle}`}>
          <span>
            {item.cat} · {item.unit} · ₹{item.price}
          </span>
          {item.mergedRows && (
            <span className="text-sky-500 font-semibold"> · {item.mergedRows.length} rows added together</span>
          )}
          {item.changes.length > 0 && (
            <span className="text-amber-500 font-semibold"> · {item.changes.join(" · ")}</span>
          )}
          {item.blocked && <span className="text-rose-500 font-semibold"> · {item.blockReason}</span>}
        </p>
      </div>

      <div className="text-right shrink-0">
        <p className="text-xs font-black text-slate-900 dark:text-white">+{item.qty}</p>
        <p className={`text-[10px] ${subtle}`}>
          {item.currentStock} → {item.newStock}
        </p>
      </div>
    </label>
  );
});
