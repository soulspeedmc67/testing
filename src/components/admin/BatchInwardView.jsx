import React from "react";
import {
  Camera,
  FileText,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  ArrowDownToLine,
  Boxes,
  Barcode
} from "lucide-react";

export default function BatchInwardView({
  batchInwardList = [],
  setBatchInwardList,
  onOpenContinuousScanner,
  onOpenBulkPasteModal,
  onApplyBatchInward,
  darkMode = false,
}) {
  const totalUnits = batchInwardList.reduce((acc, i) => acc + (i.qtyToAdd || 1), 0);

  const updateItemQty = (idx, delta) => {
    setBatchInwardList((prev) => {
      const copy = [...prev];
      const item = copy[idx];
      const currentQty = item.qtyToAdd || 1;
      const newQty = Math.max(1, currentQty + delta);
      copy[idx] = {
        ...item,
        qtyToAdd: newQty,
        newStock: (item.currentStock || 0) + newQty,
      };
      return copy;
    });
  };

  const removeItem = (idx) => {
    setBatchInwardList((prev) => prev.filter((_, i) => i !== idx));
  };

  return (
    <div className="space-y-4">
      {/* 1. Header Banner & Triggers */}
      <div
        className={`rounded-2xl p-5 border flex items-center justify-between flex-wrap gap-4 transition-colors ${
          darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
        }`}
      >
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center space-x-2">
            <ArrowDownToLine className="w-5 h-5 text-emerald-500" />
            <h2 className="font-black text-base text-slate-900 dark:text-white">
              Rapid Inward Restocking Desk
            </h2>
          </div>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Stock intake for supplier shipments. Scan barcodes repeatedly or paste distributor lists to update warehouse stock in 1 tap.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={onOpenContinuousScanner}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-black text-xs shadow-md transition-all cursor-pointer flex items-center space-x-1.5 active:scale-95"
          >
            <Camera className="w-4 h-4" />
            <span>Continuous Scanner</span>
          </button>
          <button
            type="button"
            onClick={onOpenBulkPasteModal}
            className={`px-4 py-2.5 rounded-xl font-black text-xs border transition-all cursor-pointer flex items-center space-x-1.5 ${
              darkMode
                ? "bg-[#1A1D26] hover:bg-zinc-800 text-zinc-200 border-zinc-700"
                : "bg-slate-100 hover:bg-slate-200 text-slate-800 border-slate-200"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>Paste Barcode List</span>
          </button>
        </div>
      </div>

      {/* 2. Inward Queue Table */}
      <div
        className={`rounded-2xl border overflow-hidden transition-colors ${
          darkMode ? "bg-[#12141A] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
        }`}
      >
        <div className="p-4 border-b flex items-center justify-between border-slate-200/50 dark:border-zinc-800">
          <div>
            <h3 className="font-black text-sm text-slate-900 dark:text-white">
              Queued Inward Items ({batchInwardList.length})
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
              Total Units to Restock: <strong className="text-emerald-500 font-black">{totalUnits}</strong>
            </span>
          </div>

          {batchInwardList.length > 0 && (
            <button
              type="button"
              onClick={() => setBatchInwardList([])}
              className="text-xs text-rose-500 hover:underline font-bold cursor-pointer"
            >
              Clear Queue
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead
              className={`border-b font-black uppercase text-[10.5px] tracking-wider ${
                darkMode ? "bg-[#14161E] border-zinc-800 text-zinc-400" : "bg-slate-50 border-slate-200 text-slate-500"
              }`}
            >
              <tr>
                <th className="py-3 px-4">Item Details</th>
                <th className="py-3 px-3">Barcode</th>
                <th className="py-3 px-3">Current Stock</th>
                <th className="py-3 px-4 text-center">Inward Quantity</th>
                <th className="py-3 px-3">New Warehouse Stock</th>
                <th className="py-3 px-4 text-right">Remove</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? "divide-zinc-800" : "divide-slate-100"}`}>
              {batchInwardList.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500 dark:text-zinc-400 text-xs">
                    No items in inward queue. Scan barcodes or paste a list above to begin.
                  </td>
                </tr>
              ) : (
                batchInwardList.map((item, idx) => (
                  <tr
                    key={idx}
                    className={`transition-colors ${
                      darkMode ? "hover:bg-[#1A1D26]/70" : "hover:bg-slate-50/70"
                    }`}
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 overflow-hidden shrink-0 border border-slate-200/50 dark:border-zinc-750">
                          <img
                            src={item.img}
                            alt={item.name}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="font-black text-slate-900 dark:text-white block truncate max-w-xs">
                            {item.name}
                          </span>
                          <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium">
                            {item.brand || "Indian Brand"} · {item.cat || "Grocery"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-600 dark:text-zinc-400">
                      {item.barcode}
                    </td>
                    <td className="py-3 px-3 font-bold text-slate-600 dark:text-zinc-300">
                      {item.currentStock || 0} units
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="inline-flex items-center space-x-2 bg-slate-100 dark:bg-[#1A1D26] border dark:border-zinc-700/80 p-1 rounded-xl">
                        <button
                          type="button"
                          onClick={() => updateItemQty(idx, -1)}
                          className="w-6 h-6 rounded-lg bg-white dark:bg-zinc-800 hover:bg-rose-100 dark:hover:bg-zinc-700 text-slate-800 dark:text-white flex items-center justify-center cursor-pointer shadow-xs transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-mono font-black text-xs w-8 text-center text-[#FF5B00]">
                          +{item.qtyToAdd || 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateItemQty(idx, 1)}
                          className="w-6 h-6 rounded-lg bg-white dark:bg-zinc-800 hover:bg-emerald-100 dark:hover:bg-zinc-700 text-slate-800 dark:text-white flex items-center justify-center cursor-pointer shadow-xs transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="font-black text-emerald-500 text-xs">
                        {item.newStock} units
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => removeItem(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Action Bottom Bar */}
        {batchInwardList.length > 0 && (
          <div className="p-4 border-t flex items-center justify-between border-slate-200/50 bg-slate-50 dark:bg-[#14161E]">
            <span className="text-xs font-bold text-slate-600 dark:text-zinc-300">
              Ready to restock <strong className="text-emerald-500 font-black">+{totalUnits}</strong> units across {batchInwardList.length} products.
            </span>
            <button
              type="button"
              onClick={onApplyBatchInward}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs px-6 py-2.5 rounded-xl shadow-md transition-all cursor-pointer active:scale-95 flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm & Apply Inward Restock</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
