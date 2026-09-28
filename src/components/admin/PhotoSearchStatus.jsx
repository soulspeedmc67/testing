import React, { useState } from "react";
import { Image as ImageIcon, Loader2, X } from "lucide-react";
import { PhotoResultsSheet } from "./ProductPhotoSheets";

/**
 * The photo search after an import, shown on whichever admin page is open
 * (saving an import moves to Stock): "Finding photos… 34 of 120" while it
 * runs, then "Photos found for 96 of 120 products", which opens the grid.
 */
export default function PhotoSearchStatus({ run, onDismiss, onRetry, darkMode = false }) {
  const [isResultsOpen, setIsResultsOpen] = useState(false);
  if (!run) return null;

  const card = darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs";
  const subtle = darkMode ? "text-zinc-400" : "text-slate-500";
  const count = (n) => Number(n || 0).toLocaleString("en-IN");
  const failed = (run.results || []).filter((r) => r.status === "error").length;

  return (
    <div className={`rounded-2xl p-4 border mb-4 transition-colors ${card}`} aria-live="polite">
      {run.running ? (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#FF5B00]" />
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {run.total ? `Finding photos… ${count(run.done)} of ${count(run.total)}` : "Finding photos…"}
            </p>
          </div>
          <div className={`h-1.5 rounded-full overflow-hidden ${darkMode ? "bg-zinc-800" : "bg-slate-200"}`}>
            <div
              className="h-full bg-[#FF5B00] transition-[width] duration-300"
              style={{ width: `${run.total ? Math.round((run.done / run.total) * 100) : 0}%` }}
            />
          </div>
          <p className={`text-[11px] ${subtle}`}>The stock is already saved. You can keep working.</p>
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsResultsOpen(true)}
            disabled={run.total === 0}
            className="flex-1 min-w-0 flex items-center justify-between gap-3 text-left cursor-pointer disabled:cursor-default"
          >
            <span className="flex items-center gap-2 min-w-0">
              <ImageIcon className="w-4 h-4 shrink-0 text-[#FF5B00]" />
              <span className="text-sm font-bold text-slate-900 dark:text-white">
                {run.total === 0
                  ? "Every item in the file already had a photo"
                  : `Photos found for ${count(run.found)} of ${count(run.total)} products`}
              </span>
            </span>
            {run.found > 0 && <span className="text-xs font-bold text-[#FF5B00] shrink-0">Check them</span>}
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Hide"
            className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center cursor-pointer ${
              darkMode ? "text-zinc-400 hover:bg-zinc-800" : "text-slate-500 hover:bg-slate-100"
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {!run.running && failed > 0 && (
        <div className="mt-2 flex items-center justify-between gap-3">
          <p className={`text-xs ${subtle}`}>
            {count(failed)} couldn&apos;t be checked: Open Food Facts was busy.
          </p>
          <button
            type="button"
            onClick={onRetry}
            className="shrink-0 text-xs font-bold px-3 py-1.5 rounded-xl bg-[#FF5B00] text-white cursor-pointer"
          >
            Try again
          </button>
        </div>
      )}
      <PhotoResultsSheet
        open={isResultsOpen}
        onClose={() => setIsResultsOpen(false)}
        results={run.results || []}
        darkMode={darkMode}
      />
    </div>
  );
}
