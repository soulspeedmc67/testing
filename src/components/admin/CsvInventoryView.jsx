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
  ShieldCheck,
  Truck,
  Plus,
  Store,
  Check,
  Building2,
} from "lucide-react";
import {
  buildImportPlan,
  planToStockUpdates,
  productsToCsv,
  downloadCsv,
  CSV_TEMPLATE,
} from "../../lib/csvInventory";

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
  const [selectedDistributor, setSelectedDistributor] = useState("");
  const [plan, setPlan] = useState(null);
  const [isApplying, setIsApplying] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  // Quick Add Supplier Modal State
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [newSupplierContact, setNewSupplierContact] = useState("");
  const [newSupplierCategory, setNewSupplierCategory] = useState("Local Shopkeeper / Merchant");
  const [isSavingSupplier, setIsSavingSupplier] = useState(false);

  const card = darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs";
  const subtle = darkMode ? "text-zinc-400" : "text-slate-500";
  const inputCls = darkMode
    ? "bg-[#0D0E12] border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
    : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400";

  const readPlan = (text, label, dist = selectedDistributor) => {
    setRawCsv(text);
    setSourceLabel(label);
    setPlan(buildImportPlan(text, catalogue, stockMode, dist));
  };

  const handleFile = (file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => readPlan(String(e.target.result || ""), file.name);
    reader.readAsText(file);
  };

  const handleModeChange = (mode) => {
    setStockMode(mode);
    if (rawCsv) setPlan(buildImportPlan(rawCsv, catalogue, mode, selectedDistributor));
  };

  const handleDistributorChange = (distName) => {
    setSelectedDistributor(distName);
    if (rawCsv) {
      setPlan(buildImportPlan(rawCsv, catalogue, stockMode, distName));
    }
  };

  const handleQuickSaveSupplier = async (e) => {
    e.preventDefault();
    if (!newSupplierName.trim()) return;
    setIsSavingSupplier(true);
    try {
      const distData = {
        name: newSupplierName.trim(),
        phone: newSupplierPhone.trim(),
        contactPerson: newSupplierContact.trim(),
        category: newSupplierCategory,
      };
      if (onQuickAddDistributor) {
        await onQuickAddDistributor(distData);
      }
      const savedName = newSupplierName.trim();
      setSelectedDistributor(savedName);
      if (rawCsv) {
        setPlan(buildImportPlan(rawCsv, catalogue, stockMode, savedName));
      }
      setShowAddSupplierModal(false);
      setNewSupplierName("");
      setNewSupplierPhone("");
      setNewSupplierContact("");
    } finally {
      setIsSavingSupplier(false);
    }
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
      const res = await onApplyImport(
        planToStockUpdates(plan.items, stockMode, selectedDistributor),
        summary
      );
      /* Keep the reviewed plan on screen when the write did not land, so a retry
         does not mean re-reviewing the whole file. */
      if (res && res.success === false) return;
      setPlan(null);
      setRawCsv("");
      setSourceLabel("");
      if (fileRef.current) fileRef.current.value = "";
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Header & export actions */}
      <div className={`rounded-2xl p-5 border flex items-start justify-between flex-wrap gap-4 transition-colors ${card}`}>
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
            <h2 className="font-black text-base text-slate-900 dark:text-white">
              CSV Stock Import &amp; Export
            </h2>
          </div>
          <p className={`text-xs ${subtle}`}>
            Upload a supplier sheet or a list written by ChatGPT. Nothing is saved until you
            review every line and confirm.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadCsv("dashit-template.csv", CSV_TEMPLATE)}
            className={`flex items-center space-x-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-colors active:scale-95 ${
              darkMode
                ? "border-zinc-800 text-zinc-300 hover:bg-zinc-900"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Template</span>
          </button>
          <button
            onClick={() =>
              downloadCsv(
                `dashit-catalogue-${new Date().toISOString().slice(0, 10)}.csv`,
                productsToCsv(catalogue)
              )
            }
            className="flex items-center space-x-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-[#061838] text-white hover:bg-[#0a2551] transition-colors active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export {catalogue.length} items</span>
          </button>
        </div>
      </div>

      {/* 2. Supplier / Shopkeeper attribution card (Whose stock is this?) */}
      <div
        className={`rounded-2xl p-4 sm:p-5 border transition-all ${
          darkMode
            ? "bg-[#14161E] border-zinc-800"
            : "bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-slate-50 border-blue-100 shadow-xs"
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center space-x-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  Whose stock is this? (Supplier / Shopkeeper)
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-600 dark:text-blue-300">
                  Batch Tag
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${subtle}`}>
                Attribute all items in this file to a local shopkeeper or distributor.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <select
              value={selectedDistributor}
              onChange={(e) => handleDistributorChange(e.target.value)}
              className={`px-3 py-2.5 rounded-xl text-xs font-bold border transition-colors outline-none focus:border-blue-500 cursor-pointer ${
                darkMode
                  ? "bg-[#0D0E12] border-zinc-800 text-white"
                  : "bg-white border-slate-200 text-slate-800 shadow-xs"
              }`}
            >
              <option value="">Auto (From CSV column if present)</option>
              {distributors.map((d) => (
                <option key={d.id || d.name} value={d.name}>
                  {d.name} {d.category ? `(${d.category})` : ""}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={() => setShowAddSupplierModal(true)}
              className="flex items-center space-x-1.5 px-3 py-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white transition-all active:scale-95 shadow-xs cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ New Supplier</span>
            </button>
          </div>
        </div>

        {selectedDistributor && (
          <div className="mt-3 pt-3 border-t border-blue-200/50 dark:border-zinc-800/80 flex items-center justify-between text-xs flex-wrap gap-2">
            <div className="flex items-center space-x-2 text-blue-700 dark:text-blue-300 font-bold">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>Tagged Supplier:</span>
              <span className="px-2 py-0.5 rounded-md bg-blue-500/15 border border-blue-500/20 font-black">
                {selectedDistributor}
              </span>
              <span className="font-normal text-slate-500 dark:text-zinc-400 text-[11px]">
                (all imported items will be attributed to this shopkeeper)
              </span>
            </div>
            <button
              type="button"
              onClick={() => handleDistributorChange("")}
              className="text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 underline cursor-pointer"
            >
              Reset to file default
            </button>
          </div>
        )}
      </div>

      {/* 3. Input: file drop or paste */}
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
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              Drop a .csv file here, or click to browse
            </p>
            <p className={`text-[11px] mt-1 ${subtle}`}>
              Columns are matched by name — quantity, qty, distributor, stock and amount all work.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
          </div>

          <div className="flex items-center space-x-3">
            <div className={`flex-1 h-px ${darkMode ? "bg-zinc-800" : "bg-slate-200"}`} />
            <span className={`text-[10px] font-black uppercase tracking-wider ${subtle}`}>
              or paste CSV / Excel text
            </span>
            <div className={`flex-1 h-px ${darkMode ? "bg-zinc-800" : "bg-slate-200"}`} />
          </div>

          <textarea
            value={rawCsv}
            onChange={(e) => setRawCsv(e.target.value)}
            rows={6}
            placeholder={"Paste straight from Excel or ChatGPT — code fences and extra chatter are ignored.\n\nname,category,distributor,quantity,price,mrp,unit\nFresh Onion,Vegetables,Anantnag Fresh Farm Orchards,40,35,45,1 kg"}
            className={`w-full rounded-xl border px-3 py-2.5 text-xs font-mono leading-relaxed outline-none focus:border-emerald-500 transition-colors ${inputCls}`}
          />

          <button
            disabled={!rawCsv.trim()}
            onClick={() => readPlan(rawCsv, "Pasted list")}
            className="w-full py-3 rounded-xl bg-emerald-500 text-white font-black text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-600 transition-colors active:scale-[0.99] cursor-pointer"
          >
            Review before importing
          </button>
        </div>
      )}

      {/* 4. Confirmation preview — the owner double-checks here */}
      {plan && (
        <div className={`rounded-2xl border overflow-hidden transition-colors ${card}`}>
          <div className={`p-5 border-b ${darkMode ? "border-zinc-800" : "border-slate-200"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-amber-500" />
                  <h3 className="font-black text-sm text-slate-900 dark:text-white">
                    Confirm before this touches your stock
                  </h3>
                </div>
                <p className={`text-xs mt-1 ${subtle}`}>
                  {sourceLabel} — {plan.items.length} readable{" "}
                  {plan.items.length === 1 ? "row" : "rows"}. Untick anything you do not want.
                </p>
              </div>
              <button
                onClick={() => {
                  setPlan(null);
                  setRawCsv("");
                  if (fileRef.current) fileRef.current.value = "";
                }}
                className={`p-2 rounded-lg shrink-0 transition-colors cursor-pointer ${
                  darkMode ? "hover:bg-zinc-900 text-zinc-400" : "hover:bg-slate-100 text-slate-500"
                }`}
                aria-label="Discard this import"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stock mode & Supplier selector */}
            <div className="mt-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { id: "add", label: "Add to existing stock", hint: "Restock / inward" },
                  { id: "set", label: "Set exact stock", hint: "Correction count" },
                ].map((mode) => (
                  <button
                    key={mode.id}
                    onClick={() => handleModeChange(mode.id)}
                    className={`px-3 py-2 rounded-xl border text-left transition-colors active:scale-95 cursor-pointer ${
                      stockMode === mode.id
                        ? "border-emerald-500 bg-emerald-500/10"
                        : darkMode
                        ? "border-zinc-800 hover:border-zinc-700"
                        : "border-slate-200 hover:border-slate-300"
                    }`}
                  >
                    <span className="block text-xs font-bold text-slate-900 dark:text-white">
                      {mode.label}
                    </span>
                    <span className={`block text-[10px] ${subtle}`}>{mode.hint}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center space-x-2">
                <Truck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                <span className="text-xs font-bold text-slate-700 dark:text-zinc-300">Supplier:</span>
                <select
                  value={selectedDistributor}
                  onChange={(e) => handleDistributorChange(e.target.value)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors outline-none cursor-pointer ${
                    darkMode ? "bg-[#0D0E12] border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-800"
                  }`}
                >
                  <option value="">Auto (From file rows)</option>
                  {distributors.map((d) => (
                    <option key={d.id || d.name} value={d.name}>
                      {d.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(true)}
                  className="text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Summary strip */}
            {summary && (
              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { label: "New items", value: summary.newItems },
                  { label: "Restocked", value: summary.restocks },
                  { label: "Total units", value: summary.units },
                  { label: "Price changes", value: summary.repricing },
                ].map((stat) => (
                  <div
                    key={stat.label}
                    className={`rounded-xl px-3 py-2 border ${
                      darkMode ? "border-zinc-800 bg-[#0D0E12]" : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <p className="text-lg font-black text-slate-900 dark:text-white leading-none">
                      {stat.value}
                    </p>
                    <p className={`text-[10px] font-bold uppercase tracking-wider mt-1 ${subtle}`}>
                      {stat.label}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Warnings */}
          {(plan.missingColumns.length > 0 ||
            plan.unmappedHeaders.length > 0 ||
            plan.errors.length > 0) && (
            <div className={`px-5 py-3 border-b space-y-1.5 ${darkMode ? "border-zinc-800 bg-amber-500/5" : "border-slate-200 bg-amber-50"}`}>
              {plan.missingColumns.length > 0 && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-start space-x-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" />
                  <span>
                    No column matched <strong>{plan.missingColumns.join(", ")}</strong> — check the
                    header row.
                  </span>
                </p>
              )}
              {plan.unmappedHeaders.length > 0 && (
                <p className={`text-xs ${subtle} flex items-start space-x-1.5`}>
                  <AlertTriangle className="w-3.5 h-3.5 mt-px shrink-0" />
                  <span>Ignored columns: {plan.unmappedHeaders.join(", ")}</span>
                </p>
              )}
              {plan.errors.map((err) => (
                <p key={err.row} className="text-xs text-rose-500 flex items-start space-x-1.5">
                  <Trash2 className="w-3.5 h-3.5 mt-px shrink-0" />
                  <span>
                    Row {err.row} skipped — {err.reason}
                  </span>
                </p>
              ))}
            </div>
          )}

          {/* Line-by-line review */}
          <div className={`px-5 py-2 flex items-center justify-between border-b ${darkMode ? "border-zinc-800" : "border-slate-200"}`}>
            <span className={`text-[10px] font-black uppercase tracking-wider ${subtle}`}>
              Every line before it lands (with supplier attribution)
            </span>
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
            {plan.items.map((item) => {
              const displaySupplier = item.distributor || selectedDistributor || "Unassigned";
              return (
                <label
                  key={item.row}
                  className={`flex items-center gap-3 px-5 py-3 border-b cursor-pointer transition-colors ${
                    darkMode
                      ? "border-zinc-800/60 hover:bg-zinc-900/40"
                      : "border-slate-100 hover:bg-slate-50"
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
                      item.action === "new"
                        ? "bg-sky-500/15 text-sky-500"
                        : "bg-emerald-500/15 text-emerald-500"
                    }`}
                  >
                    {item.action === "new" ? (
                      <PackagePlus className="w-4 h-4" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {item.name}
                    </p>
                    <p className={`text-[11px] leading-snug ${subtle}`}>
                      <span>{item.cat} · {item.unit} · ₹{item.price}</span>
                      <span className="inline-flex items-center ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-300 border border-blue-500/20">
                        🏢 {displaySupplier}
                      </span>
                      {item.mergedRows && (
                        <span className="text-sky-500 font-semibold ml-1">
                          · {item.mergedRows.length} rows combined
                        </span>
                      )}
                      {item.changes.length > 0 && (
                        <span className="text-amber-500 font-semibold ml-1"> · {item.changes.join(" · ")}</span>
                      )}
                      {item.blocked && (
                        <span className="text-rose-500 font-semibold ml-1"> · {item.blockReason}</span>
                      )}
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs font-black text-slate-900 dark:text-white">
                      +{item.qty}
                    </p>
                    <p className={`text-[10px] ${subtle}`}>
                      {item.currentStock} → {item.newStock}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Commit */}
          <div className={`p-5 ${darkMode ? "bg-[#0D0E12]" : "bg-slate-50"}`}>
            <button
              disabled={isApplying || !summary || summary.approved === 0}
              onClick={handleConfirm}
              className="w-full py-3.5 rounded-xl bg-emerald-500 text-white font-black text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:bg-emerald-600 transition-colors active:scale-[0.99] flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isApplying
                  ? "Importing…"
                  : summary && summary.approved > 0
                  ? `Confirm — import ${summary.approved} ${
                      summary.approved === 1 ? "item" : "items"
                    }, ${summary.units} units`
                  : "Nothing selected"}
              </span>
            </button>
            {summary && summary.skipped > 0 && (
              <p className={`text-[11px] text-center mt-2 ${subtle}`}>
                {summary.skipped} {summary.skipped === 1 ? "row" : "rows"} will not be imported.
              </p>
            )}
          </div>
        </div>
      )}

      {/* QUICK ADD SUPPLIER / SHOPKEEPER MODAL */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-[150] flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            onClick={() => !isSavingSupplier && setShowAddSupplierModal(false)}
          />

          <div
            role="dialog"
            aria-modal="true"
            className={`relative w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-6 shadow-2xl animate-in slide-in-from-bottom-4 ${
              darkMode ? "bg-[#14161E] border border-zinc-800" : "bg-white"
            }`}
          >
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 dark:text-white">
                    Add Supplier / Shopkeeper
                  </h3>
                  <p className={`text-xs ${subtle}`}>
                    Register a partner merchant or distributor supplying your store.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAddSupplierModal(false)}
                className={`p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors cursor-pointer ${
                  darkMode ? "hover:bg-zinc-800" : "hover:bg-slate-100"
                }`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleQuickSaveSupplier} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Supplier / Shopkeeper Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Tariq Brothers Kirana, Anantnag Dairy Hub"
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none focus:border-blue-500 transition-colors ${inputCls}`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                  Supplier Type / Category
                </label>
                <select
                  value={newSupplierCategory}
                  onChange={(e) => setNewSupplierCategory(e.target.value)}
                  className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-bold border outline-none focus:border-blue-500 transition-colors cursor-pointer ${inputCls}`}
                >
                  <option value="Local Shopkeeper / Merchant">Local Shopkeeper / Merchant</option>
                  <option value="Wholesale Distributor">Wholesale Distributor</option>
                  <option value="Direct FMCG Brand">Direct FMCG Brand</option>
                  <option value="Bakery / Kandur">Bakery / Local Kandur</option>
                  <option value="Farm / Fresh Produce">Farm / Fresh Produce</option>
                  <option value="Beverages & Dairy">Beverages &amp; Dairy</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Mohammad Bilal"
                    value={newSupplierContact}
                    onChange={(e) => setNewSupplierContact(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none focus:border-blue-500 transition-colors ${inputCls}`}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1">
                    Phone / WhatsApp
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9876543210"
                    value={newSupplierPhone}
                    onChange={(e) => setNewSupplierPhone(e.target.value)}
                    className={`w-full px-3.5 py-2.5 rounded-xl text-xs font-medium border outline-none focus:border-blue-500 transition-colors ${inputCls}`}
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  disabled={isSavingSupplier}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
                    darkMode
                      ? "border-zinc-800 text-zinc-300 hover:bg-zinc-800"
                      : "border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSupplier || !newSupplierName.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-black bg-blue-600 hover:bg-blue-700 text-white transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-xs flex items-center space-x-1.5"
                >
                  {isSavingSupplier ? (
                    <span>Saving…</span>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save &amp; Select</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
