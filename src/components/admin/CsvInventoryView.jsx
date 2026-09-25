import React, { useMemo, useRef, useState } from "react";
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

/**
 * Import items from a CSV file (Excel can save one). After a file is chosen the
 * owner says who the stock came from, then checks every line before saving.
 */
export default function CsvInventoryView({
  catalogue = [],
  distributors = [],
  onQuickAddDistributor,
  onApplyImport,
  darkMode = false,
}) {
  const fileRef = useRef(null);
  const [rawCsv, setRawCsv] = useState("");
  const [sourceLabel, setSourceLabel] = useState("");
  const [stockMode, setStockMode] = useState("add");
  const [source, setSource] = useState(SELF_DISTRIBUTOR_NAME);
  const [plan, setPlan] = useState(null);
  const [isApplying, setIsApplying] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [isSourceSheetOpen, setIsSourceSheetOpen] = useState(false);

  const card = darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs";
  const subtle = darkMode ? "text-zinc-400" : "text-slate-500";
  const inputCls = darkMode
    ? "bg-[#0D0E12] border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
    : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400";

  // A file (or pasted rows) is in: ask who it came from before showing the list.
  const askSource = (text, label) => {
    setRawCsv(text);
    setSourceLabel(label);
    setIsSourceSheetOpen(true);
  };

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => askSource(String(e.target.result || ""), file.name);
    reader.readAsText(file);
  };

  const handleSourceChosen = (name) => {
    setSource(name);
    setIsSourceSheetOpen(false);
    setPlan(buildImportPlan(rawCsv, catalogue, stockMode, name));
  };

  const handleSourceSheetClose = () => {
    setIsSourceSheetOpen(false);
    // Closed before a list was shown: forget the file so it can be picked again.
    if (!plan) {
      if (fileRef.current) fileRef.current.value = "";
      if (sourceLabel !== "Pasted rows") setRawCsv("");
    }
  };

  const handleModeChange = (mode) => {
    setStockMode(mode);
    if (rawCsv) setPlan(buildImportPlan(rawCsv, catalogue, mode, source));
  };

  const resetImport = () => {
    setPlan(null);
    setRawCsv("");
    setSourceLabel("");
    if (fileRef.current) fileRef.current.value = "";
  };

  const toggleRow = (row) => {
    setPlan((prev) => ({
      ...prev,
      items: prev.items.map((i) =>
        i.row === row && !i.blocked ? { ...i, include: !i.include } : i
      ),
    }));
  };

  const setAllIncluded = (value) => {
    setPlan((prev) => ({
      ...prev,
      items: prev.items.map((i) => (i.blocked ? i : { ...i, include: value })),
    }));
  };

  const summary = useMemo(() => {
    if (!plan) return null;
    const approved = plan.items.filter((i) => i.include && !i.blocked);
    return {
      approved: approved.length,
      newItems: approved.filter((i) => i.action === "new").length,
      restocks: approved.filter((i) => i.action === "restock").length,
      units: approved.reduce((sum, i) => sum + i.qty, 0),
      repricing: approved.filter((i) => i.changes.length > 0).length,
      skipped: plan.items.length - approved.length + plan.errors.length,
    };
  }, [plan]);

  const handleConfirm = async () => {
    if (!plan || !summary || summary.approved === 0) return;
    setIsApplying(true);
    try {
      const res = await onApplyImport(planToStockUpdates(plan.items, stockMode, source), summary);
      /* Keep the checked list on screen when the save did not go through, so a
         retry does not mean checking the whole file again. */
      if (res && res.success === false) return;
      resetImport();
    } finally {
      setIsApplying(false);
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
            Add new items or more stock from an Excel or CSV file. Nothing is saved until you
            check the list and confirm.
          </p>
        </div>

        <div className="flex items-center gap-2">
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

      {/* 2. Choose a file, or paste rows */}
      {!plan && (
        <div className={`rounded-2xl p-5 border space-y-4 transition-colors ${card}`}>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              handleFile(e.dataTransfer.files?.[0]);
            }}
            onClick={() => fileRef.current?.click()}
            className={`rounded-2xl border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
              dragOver
                ? "border-emerald-500 bg-emerald-500/5"
                : darkMode
                ? "border-zinc-800 hover:border-zinc-700"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <Upload className={`w-7 h-7 mx-auto mb-2 ${subtle}`} />
            <p className="text-sm font-bold text-slate-900 dark:text-white">Choose a CSV file</p>
            <p className={`text-[11px] mt-1 ${subtle}`}>
              Or drag it here. In Excel, use File → Save As → CSV.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv,text/comma-separated-values,text/plain"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>

          <div className="flex items-center space-x-3">
            <div className={`flex-1 h-px ${darkMode ? "bg-zinc-800" : "bg-slate-200"}`} />
            <span className={`text-[11px] font-bold ${subtle}`}>or paste the rows</span>
            <div className={`flex-1 h-px ${darkMode ? "bg-zinc-800" : "bg-slate-200"}`} />
          </div>

          <textarea
            value={rawCsv}
            onChange={(e) => setRawCsv(e.target.value)}
            rows={5}
            placeholder={"name,category,quantity,price,mrp,unit\nOnion,Vegetables,40,35,45,1 kg"}
            className={`w-full rounded-xl border px-3 py-2.5 text-xs font-mono leading-relaxed outline-none focus:border-emerald-500 transition-colors ${inputCls}`}
          />

          <button
            disabled={!rawCsv.trim()}
            onClick={() => askSource(rawCsv, "Pasted rows")}
            className="w-full py-3 rounded-xl bg-emerald-500 text-white font-black text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-600 transition-colors active:scale-[0.99] cursor-pointer"
          >
            Next
          </button>
        </div>
      )}

      {/* 3. Check every line before saving */}
      {plan && (
        <div className={`rounded-2xl border overflow-hidden transition-colors ${card}`}>
          <div className={`p-5 border-b ${darkMode ? "border-zinc-800" : "border-slate-200"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h3 className="font-black text-base text-slate-900 dark:text-white">Check before saving</h3>
                <p className={`text-xs mt-1 ${subtle}`}>
                  {sourceLabel} · {plan.items.length} {plan.items.length === 1 ? "item" : "items"}. Untick
                  anything you don't want.
                </p>
              </div>
              <button
                onClick={resetImport}
                className={`p-2 rounded-lg shrink-0 transition-colors cursor-pointer ${
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
                onClick={() => setIsSourceSheetOpen(true)}
                className="ml-auto text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer shrink-0"
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
                  onClick={() => handleModeChange(mode.id)}
                  className={`px-3 py-2.5 rounded-xl border text-left transition-colors active:scale-95 cursor-pointer ${
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
                    <p className="text-lg font-black text-slate-900 dark:text-white leading-none">{stat.value}</p>
                    <p className={`text-[11px] font-bold mt-1 ${subtle}`}>{stat.label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Problems with the file */}
          {(plan.missingColumns.length > 0 || plan.unmappedHeaders.length > 0 || plan.errors.length > 0) && (
            <div
              className={`px-5 py-3 border-b space-y-1.5 ${
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
              {plan.errors.map((err) => (
                <p key={err.row} className="text-xs text-rose-500 flex items-start space-x-1.5">
                  <Trash2 className="w-3.5 h-3.5 mt-px shrink-0" />
                  <span>
                    Row {err.row} left out: {err.reason}
                  </span>
                </p>
              ))}
            </div>
          )}

          {/* Every line */}
          <div
            className={`px-5 py-2 flex items-center justify-between border-b ${
              darkMode ? "border-zinc-800" : "border-slate-200"
            }`}
          >
            <span className={`text-[11px] font-bold ${subtle}`}>Items</span>
            <div className="flex items-center gap-3">
              <button onClick={() => setAllIncluded(true)} className="text-[11px] font-bold text-emerald-500 hover:underline cursor-pointer">
                Select all
              </button>
              <button onClick={() => setAllIncluded(false)} className={`text-[11px] font-bold hover:underline cursor-pointer ${subtle}`}>
                Clear
              </button>
            </div>
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {plan.items.map((item) => (
              <label
                key={item.row}
                className={`flex items-center gap-3 px-5 py-3 border-b cursor-pointer transition-colors ${
                  darkMode ? "border-zinc-800/60 hover:bg-zinc-900/40" : "border-slate-100 hover:bg-slate-50"
                } ${item.blocked ? "opacity-60 cursor-not-allowed" : ""} ${
                  !item.include && !item.blocked ? "opacity-45" : ""
                }`}
              >
                <input
                  type="checkbox"
                  checked={item.include && !item.blocked}
                  disabled={item.blocked}
                  onChange={() => toggleRow(item.row)}
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
                  <p className={`text-[11px] leading-snug ${subtle}`}>
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
            ))}
          </div>

          {/* Save */}
          <div className={`p-5 ${darkMode ? "bg-[#0D0E12]" : "bg-slate-50"}`}>
            <button
              disabled={isApplying || !summary || summary.approved === 0}
              onClick={handleConfirm}
              className="w-full py-3.5 rounded-xl bg-emerald-500 text-white font-black text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-600 transition-colors active:scale-[0.99] flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isApplying
                  ? "Saving…"
                  : summary && summary.approved > 0
                  ? `Save ${summary.approved} ${summary.approved === 1 ? "item" : "items"} (${summary.units} units)`
                  : "Nothing selected"}
              </span>
            </button>
            {summary && summary.skipped > 0 && (
              <p className={`text-[11px] text-center mt-2 ${subtle}`}>
                {summary.skipped} {summary.skipped === 1 ? "row" : "rows"} will be left out.
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
        onConfirm={handleSourceChosen}
        onClose={handleSourceSheetClose}
        darkMode={darkMode}
      />
    </div>
  );
}
