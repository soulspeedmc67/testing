import React, { useEffect, useMemo, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { setProductShelves } from "../../lib/db";

/* Prepared by scripts/suggest-shelves.mjs: items whose shelf should change,
   worked out from the photo catalogue's own categories. */
const FIXES_URL = "/catalog/shelf-fixes-v1.json";

/**
 * "Fix shelves": items the stock file put under "Others" or on the wrong
 * shelf, with the shelf they belong on. Everything is ticked; the owner
 * unticks anything that looks wrong and moves the rest in one tap. Only the
 * shelf changes, never stock, price or photo.
 */
export default function ShelfFixView({ catalogue = [], showToast = () => {} }) {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [skipped, setSkipped] = useState(() => new Set());
  const [busy, setBusy] = useState(false);
  const [openShelf, setOpenShelf] = useState(null);

  useEffect(() => {
    fetch(FIXES_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`the list didn't load (${res.status})`);
        return res.json();
      })
      .then(setData)
      .catch((e) => setLoadError(e.message));
  }, []);

  // Only items still on the old shelf (already moved ones drop off the list).
  const byId = useMemo(() => new Map(catalogue.map((p) => [String(p.id), p])), [catalogue]);
  const pending = useMemo(
    () => (data?.moves || []).filter((m) => {
      const p = byId.get(m.id);
      return p && String(p.cat || "(none)") === m.from;
    }),
    [data, byId]
  );
  const groups = useMemo(() => {
    const map = new Map();
    pending.forEach((m) => {
      if (!map.has(m.to)) map.set(m.to, []);
      map.get(m.to).push(m);
    });
    return [...map].sort((a, b) => b[1].length - a[1].length);
  }, [pending]);
  const chosen = pending.filter((m) => !skipped.has(m.id));

  const toggle = (id) =>
    setSkipped((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const moveAll = async () => {
    if (busy || chosen.length === 0) return;
    setBusy(true);
    try {
      await setProductShelves(chosen.map((m) => ({ id: m.id, cat: m.to })));
      showToast(`Moved ${chosen.length} items to their shelves.`);
    } catch (e) {
      showToast(`Couldn't move them: ${e?.message || "try again"}.`);
    } finally {
      setBusy(false);
    }
  };

  if (loadError) return <p className="text-sm text-red-500 font-semibold">Couldn't open the list: {loadError}.</p>;
  if (!data) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-zinc-400">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading…
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Fix shelves</h2>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
          These items are under “Others” or on the wrong shelf. Open a shelf to check its items, untick
          anything that doesn’t belong, then move them. Only the shelf changes.
        </p>
      </div>

      {pending.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 text-center">
          <Check className="w-6 h-6 text-emerald-500 mx-auto" />
          <p className="font-bold text-slate-900 dark:text-white mt-2">Every item is on its shelf</p>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="font-bold text-slate-900 dark:text-white">
                {chosen.length.toLocaleString("en-IN")} of {pending.length.toLocaleString("en-IN")} items ticked
              </p>
              <p className="text-xs text-slate-500 dark:text-zinc-400">They show up on their new shelf in the apps straight away.</p>
            </div>
            <button
              type="button"
              onClick={moveAll}
              disabled={busy || chosen.length === 0}
              className="px-4 py-2 rounded-xl bg-[#FF5B00] text-white text-sm font-bold disabled:opacity-60"
            >
              {busy ? "Moving…" : `Move ${chosen.length.toLocaleString("en-IN")} items`}
            </button>
          </div>

          <div className="space-y-2">
            {groups.map(([shelf, items]) => {
              const ticked = items.filter((m) => !skipped.has(m.id)).length;
              const open = openShelf === shelf;
              return (
                <div key={shelf} className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                  <button
                    type="button"
                    onClick={() => setOpenShelf(open ? null : shelf)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left"
                  >
                    <span className="font-bold text-slate-900 dark:text-white">{shelf}</span>
                    <span className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                      {ticked} of {items.length} · {open ? "Hide" : "Check"}
                    </span>
                  </button>
                  {open && (
                    <ul className="border-t border-slate-100 dark:border-zinc-800 divide-y divide-slate-100 dark:divide-zinc-800">
                      {items.map((m) => (
                        <li key={m.id}>
                          <label className="flex items-center gap-3 px-4 py-2.5 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={!skipped.has(m.id)}
                              onChange={() => toggle(m.id)}
                              className="w-4 h-4 accent-[#FF5B00]"
                            />
                            <span className="flex-1 text-sm text-slate-800 dark:text-zinc-200">{m.name}</span>
                            <span className="text-xs text-slate-400 dark:text-zinc-500 shrink-0">from {m.from}</span>
                          </label>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
