import React, { useEffect, useMemo, useState } from "react";
import { Check, ImageOff, Images, Loader2 } from "lucide-react";
import { setManualProductPhotos, skipProductPhotoSuggestions } from "../../lib/db";
import { isPlaceholderImage } from "../../lib/productPhotoMatch";

/* Prepared by scripts/suggest-store-photos.mjs from the photo catalogue on
   this website: `sure` are exact matches, `review` are close ones for the
   owner to confirm, each with up to three photos. */
const REVIEW_URL = "/catalog/photo-review-v1.json";
const SHOWN = 8;

/**
 * "Check photos": the owner confirms which photo is really the item. A tap
 * saves it to the item straight away and the apps show it; "None of these"
 * is saved too, so the item isn't asked again. Nothing here is guessed: an
 * item nobody confirms keeps its plain tile.
 */
export default function PhotoReviewView({ catalogue = [], showToast = () => {} }) {
  const [data, setData] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [busy, setBusy] = useState(false);
  // Answered on this screen already; the live catalogue catches up a moment later.
  const [answered, setAnswered] = useState(() => new Set());

  useEffect(() => {
    fetch(REVIEW_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`the list didn't load (${res.status})`);
        return res.json();
      })
      .then(setData)
      .catch((e) => setLoadError(e.message));
  }, []);

  const byId = useMemo(() => new Map(catalogue.map((p) => [String(p.id || p.barcode), p])), [catalogue]);
  // Only items that are still in the shop and still without a real photo.
  const waiting = (p) => Boolean(p) && isPlaceholderImage(p.img) && !p.photoSuggestionsSkipped;
  const sure = useMemo(
    () => (data?.sure || []).filter((s) => waiting(byId.get(s.id)) && !answered.has(s.id)),
    [data, byId, answered]
  );
  const review = useMemo(
    () => (data?.review || []).filter((r) => waiting(byId.get(r.id)) && !answered.has(r.id)),
    [data, byId, answered]
  );
  const total = (data?.review?.length || 0) + (data?.sure?.length || 0);
  const done = total - sure.length - review.length;

  const markAnswered = (ids) => setAnswered((prev) => new Set([...prev, ...ids]));

  const addSure = async () => {
    if (busy || sure.length === 0) return;
    setBusy(true);
    try {
      await setManualProductPhotos(sure.map((s) => ({ id: s.id, url: s.img })));
      markAnswered(sure.map((s) => s.id));
      showToast(`Added ${sure.length} exact photos.`);
    } catch (e) {
      showToast(`Couldn't save the photos: ${e?.message || "try again"}.`);
    } finally {
      setBusy(false);
    }
  };

  const choose = async (item, url) => {
    markAnswered([item.id]);
    try {
      if (url) await setManualProductPhotos([{ id: item.id, url }]);
      else await skipProductPhotoSuggestions([item.id]);
    } catch (e) {
      setAnswered((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
      showToast(`Couldn't save ${item.name}: ${e?.message || "try again"}.`);
    }
  };

  // Keys for the top item: 1, 2, 3 pick a photo, 0 or N is "None of these".
  useEffect(() => {
    const top = review[0];
    if (!top) return undefined;
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const n = Number(e.key);
      if (n >= 1 && n <= top.options.length) choose(top, top.options[n - 1].img);
      else if (e.key === "0" || e.key.toLowerCase() === "n") choose(top, "");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (loadError) {
    return <p className="text-sm text-red-500 font-semibold">Couldn't open the photo list: {loadError}.</p>;
  }
  if (!data) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-zinc-400">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading photos to check…
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Check product photos</h2>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
          Tap the photo that is exactly this item: same brand, same product, same flavour. If none is,
          tap “None of these” — a wrong photo is worse than no photo. Each answer is saved straight away
          and shows in the apps.
        </p>
        <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
          <div className="h-full bg-[#FF5B00] transition-all" style={{ width: `${total ? (done / total) * 100 : 100}%` }} />
        </div>
        <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mt-1.5">
          {done.toLocaleString("en-IN")} of {total.toLocaleString("en-IN")} done
        </p>
      </div>

      {sure.length > 0 && (
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4 flex items-center gap-4">
          <Images className="w-6 h-6 text-[#FF5B00] shrink-0" />
          <div className="flex-1">
            <p className="font-bold text-slate-900 dark:text-white">
              {sure.length.toLocaleString("en-IN")} items have an exact photo
            </p>
            <p className="text-xs text-slate-500 dark:text-zinc-400">Same brand and name in the photo list. Safe to add all at once.</p>
          </div>
          <button
            type="button"
            onClick={addSure}
            disabled={busy}
            className="px-4 py-2 rounded-xl bg-[#FF5B00] text-white text-sm font-bold disabled:opacity-60"
          >
            {busy ? "Adding…" : "Add them all"}
          </button>
        </div>
      )}

      {review.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 p-6 text-center">
          <Check className="w-6 h-6 text-emerald-500 mx-auto" />
          <p className="font-bold text-slate-900 dark:text-white mt-2">All photos checked</p>
          <p className="text-xs text-slate-500 dark:text-zinc-400">Items still without a photo need one added by hand in “All items”.</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
            {review.length.toLocaleString("en-IN")} items to check · on a computer, press 1, 2 or 3 to pick, N for none
          </p>
          {review.slice(0, SHOWN).map((item) => (
            <div key={item.id} className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
                {item.unit && item.unit !== "1 pc" && (
                  <span className="text-xs text-slate-500 dark:text-zinc-400 shrink-0">{item.unit}</span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">
                {item.options.map((option, i) => (
                  <button
                    key={option.img}
                    type="button"
                    onClick={() => choose(item, option.img)}
                    className="group text-left rounded-xl border border-slate-200 dark:border-zinc-700 hover:border-[#FF5B00] focus:border-[#FF5B00] focus:outline-none p-2 transition-colors"
                  >
                    <div className="aspect-square rounded-lg bg-white flex items-center justify-center overflow-hidden">
                      <img src={option.img} alt={option.name} loading="lazy" className="max-w-full max-h-full object-contain" />
                    </div>
                    <p className="text-[11px] leading-tight text-slate-600 dark:text-zinc-300 mt-1.5 line-clamp-2">
                      <span className="font-bold text-[#FF5B00]">{i + 1}</span> {option.name}
                    </p>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => choose(item, "")}
                  className="rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 hover:border-slate-500 flex flex-col items-center justify-center gap-1.5 p-2 min-h-[120px] text-slate-500 dark:text-zinc-400"
                >
                  <ImageOff className="w-5 h-5" />
                  <span className="text-xs font-bold">None of these</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
