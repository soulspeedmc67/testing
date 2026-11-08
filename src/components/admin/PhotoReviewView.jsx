import React, { useEffect, useMemo, useState } from "react";
import { Check, ImageOff, Images, Loader2, Search, Sparkles, Trash2, X } from "lucide-react";
import { removeProductPhoto, setManualProductPhotos, skipProductPhotoSuggestions } from "../../lib/db";
import { isPlaceholderImage } from "../../lib/productPhotoMatch";
import { loadCatalog } from "../../lib/productCatalog";
import { loadSitePhotos, photoFromSite, photoOptions, searchSitePhotos, sitePhotoOpens } from "../../lib/sitePhotos";
import ProductImage from "../ProductImage";

const PAGE = 12;

/**
 * "Check photos": every photo comes from the website (lib/sitePhotos), worked
 * out live for the products in the shop now, so it works again after the
 * stock list is cleared and uploaded under new ids.
 *
 *  - Exact matches (the photo the same item had before, the shop's own upload
 *    named after it, or the same product in the product list) are added in one
 *    go, after a look at the list.
 *  - Every other item shows the closest photos to tap, and a search for any
 *    other photo on the website. "None of these" is saved, so it isn't asked
 *    again (until "Show items I said none to").
 *  - "All items" lets the owner change a photo the matching got wrong.
 * Nothing is guessed: an item nobody confirms keeps its plain tile.
 */
export default function PhotoReviewView({ catalogue = [], showToast = () => {} }) {
  const [catalog, setCatalog] = useState(null);
  const [site, setSite] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [mode, setMode] = useState("missing"); // "missing" | "all"
  const [showSkipped, setShowSkipped] = useState(false);
  // Off: only items with a photo to tap, so the owner isn't scrolling past the rest.
  const [showNoOptions, setShowNoOptions] = useState(false);
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [busy, setBusy] = useState(false);
  const [showSure, setShowSure] = useState(false);
  const [leftOut, setLeftOut] = useState(() => new Set());
  // Answered on this screen already; the live catalogue catches up a moment later.
  const [answered, setAnswered] = useState(() => new Set());

  useEffect(() => {
    let alive = true;
    Promise.all([loadCatalog().catch(() => null), loadSitePhotos()]).then(([list, photos]) => {
      if (!alive) return;
      if (!list && !photos) setLoadError("the photo lists didn't load. Check the connection and open this page again");
      setCatalog(list);
      setSite(photos);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, []);

  const idOf = (p) => String(p.id || p.barcode);
  const missing = (p) => isPlaceholderImage(p.img);

  // Exact matches for items without a photo: the quick "add them all".
  const sure = useMemo(() => {
    if (loading) return [];
    const out = [];
    for (const p of catalogue) {
      const id = idOf(p);
      if (!missing(p) || p.photoRejected || answered.has(id)) continue;
      const hit = photoFromSite(site, catalog, { name: p.name, barcode: p.barcode || p.id });
      if (hit && hit.img !== p.rejectedPhoto) out.push({ id, name: p.name, img: hit.img, via: hit.via });
    }
    return out;
  }, [catalogue, site, catalog, loading, answered]);
  const sureIds = useMemo(() => new Set(sure.map((s) => s.id)), [sure]);
  const sureToAdd = sure.filter((s) => !leftOut.has(s.id));

  // Photos to tap for every item without one, worked out once per list.
  const optionsById = useMemo(() => {
    const out = new Map();
    if (loading) return out;
    for (const p of catalogue) {
      const id = idOf(p);
      if (!p.name || !missing(p) || sureIds.has(id)) continue;
      const options = photoOptions(site, catalog, p, 6).filter((o) => o.img !== p.rejectedPhoto);
      if (options.length > 0) out.set(id, options);
    }
    return out;
  }, [catalogue, site, catalog, loading, sureIds]);

  const candidates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalogue.filter((p) => {
      const id = idOf(p);
      if (answered.has(id) || !p.name) return false;
      if (q && !String(p.name).toLowerCase().includes(q) && !String(p.barcode || p.id).includes(q)) return false;
      if (mode === "all") return true;
      if (!missing(p) || sureIds.has(id)) return false;
      return showSkipped || !p.photoSuggestionsSkipped;
    });
  }, [catalogue, answered, query, mode, sureIds, showSkipped]);
  const noOptionsCount = mode === "missing" ? candidates.filter((p) => !optionsById.has(idOf(p))).length : 0;
  const items =
    mode === "missing" && !showNoOptions ? candidates.filter((p) => optionsById.has(idOf(p))) : candidates;

  const skippedCount = useMemo(
    () => catalogue.filter((p) => missing(p) && p.photoSuggestionsSkipped).length,
    [catalogue]
  );
  const withPhoto = catalogue.length - catalogue.filter(missing).length;

  const markAnswered = (ids) => setAnswered((prev) => new Set([...prev, ...ids]));
  const unmark = (id) =>
    setAnswered((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });

  const addSure = async () => {
    if (busy || sureToAdd.length === 0) return;
    setBusy(true);
    try {
      let photos = sureToAdd;
      // Without the website's list of photos, check each one opens first.
      if (!site) {
        const ok = [];
        let next = 0;
        await Promise.all(
          Array.from({ length: 8 }, async () => {
            while (next < photos.length) {
              const item = photos[next++];
              if (await sitePhotoOpens(item.img)) ok.push(item);
            }
          })
        );
        photos = ok;
      }
      if (photos.length > 0) await setManualProductPhotos(photos.map((s) => ({ id: s.id, url: s.img })));
      markAnswered(photos.map((s) => s.id));
      setShowSure(false);
      showToast(`Added ${photos.length.toLocaleString("en-IN")} exact photos.`);
    } catch (e) {
      showToast(`Couldn't save the photos: ${e?.message || "try again"}.`);
    } finally {
      setBusy(false);
    }
  };

  const choose = async (item, url) => {
    const id = idOf(item);
    markAnswered([id]);
    try {
      await setManualProductPhotos([{ id, url }]);
    } catch (e) {
      unmark(id);
      showToast(`Couldn't save ${item.name}: ${e?.message || "try again"}.`);
    }
  };

  const noneOfThese = async (item) => {
    const id = idOf(item);
    markAnswered([id]);
    try {
      await skipProductPhotoSuggestions([id]);
    } catch (e) {
      unmark(id);
      showToast(`Couldn't save ${item.name}: ${e?.message || "try again"}.`);
    }
  };

  const removePhoto = async (item) => {
    const id = idOf(item);
    markAnswered([id]);
    try {
      await removeProductPhoto(id, item.img);
      showToast(`Removed the photo of ${item.name}.`);
    } catch (e) {
      unmark(id);
      showToast(`Couldn't remove it: ${e?.message || "try again"}.`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-zinc-400">
        <Loader2 className="w-4 h-4 animate-spin" /> Loading the photos on the website…
      </div>
    );
  }
  if (loadError) {
    return <p className="text-sm text-red-500 font-semibold">Couldn&apos;t open the photos: {loadError}.</p>;
  }

  const tab = (value, label) => (
    <button
      type="button"
      onClick={() => {
        setMode(value);
        setShown(PAGE);
      }}
      className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
        mode === value
          ? "bg-white dark:bg-zinc-700 text-slate-900 dark:text-white shadow-sm"
          : "text-slate-500 dark:text-zinc-400"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-5 max-w-4xl">
      <div>
        <h2 className="text-xl font-black text-slate-900 dark:text-white">Check product photos</h2>
        <p className="text-sm text-slate-500 dark:text-zinc-400 mt-1">
          Tap the photo that is exactly this item: same brand, same product, same flavour. If none is, tap
          “None of these” or search for another photo. Each answer is saved straight away and shows in the apps.
        </p>
        <div className="mt-3 h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
          <div
            className="h-full bg-[#FF5B00] transition-all"
            style={{ width: `${catalogue.length ? (withPhoto / catalogue.length) * 100 : 100}%` }}
          />
        </div>
        <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mt-1.5">
          {withPhoto.toLocaleString("en-IN")} of {catalogue.length.toLocaleString("en-IN")} items have a photo
          {!site && " · the website's photo list didn't load, so only the product list is used"}
        </p>
      </div>

      {sure.length > 0 && mode === "missing" && (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/40 p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1">
              <p className="font-bold text-slate-900 dark:text-white">
                {sure.length.toLocaleString("en-IN")} exact photos found
              </p>
              <p className="text-xs text-slate-600 dark:text-zinc-300 mt-0.5">
                The photo the same item had before, your own photo named after it, or the same product in the
                product list.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowSure((v) => !v)}
                className="px-3 py-2 rounded-xl text-xs font-bold border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 cursor-pointer"
              >
                {showSure ? "Hide list" : "Look first"}
              </button>
              <button
                type="button"
                onClick={addSure}
                disabled={busy || sureToAdd.length === 0}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                Add {sureToAdd.length.toLocaleString("en-IN")} photos
              </button>
            </div>
          </div>
          {showSure && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[420px] overflow-y-auto">
              {sure.map((s) => {
                const out = leftOut.has(s.id);
                return (
                  <div
                    key={s.id}
                    className={`flex items-center gap-2 rounded-xl bg-white dark:bg-zinc-900 p-2 ${out ? "opacity-40" : ""}`}
                  >
                    <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden">
                      <ProductImage src={s.img} name={s.name} letterClassName="text-sm" />
                    </div>
                    <p className="flex-1 text-xs font-semibold text-slate-800 dark:text-zinc-200 line-clamp-2">{s.name}</p>
                    <button
                      type="button"
                      onClick={() =>
                        setLeftOut((prev) => {
                          const next = new Set(prev);
                          if (next.has(s.id)) next.delete(s.id);
                          else next.add(s.id);
                          return next;
                        })
                      }
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 cursor-pointer"
                      aria-label={out ? `Add ${s.name} back` : `Leave ${s.name} out`}
                    >
                      {out ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex p-1 rounded-xl bg-slate-100 dark:bg-zinc-800">
          {tab("missing", "Without a photo")}
          {tab("all", "All items")}
        </div>
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShown(PAGE);
            }}
            placeholder="Find an item"
            className="w-full pl-8 pr-3 py-2 rounded-xl text-sm bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white"
          />
        </div>
        {mode === "missing" && noOptionsCount > 0 && (
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-300 cursor-pointer">
            <input
              type="checkbox"
              checked={showNoOptions}
              onChange={(e) => {
                setShowNoOptions(e.target.checked);
                setShown(PAGE);
              }}
            />
            Show items with no photo to pick ({noOptionsCount.toLocaleString("en-IN")})
          </label>
        )}
        {mode === "missing" && skippedCount > 0 && (
          <label className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-300 cursor-pointer">
            <input type="checkbox" checked={showSkipped} onChange={(e) => setShowSkipped(e.target.checked)} />
            Show items I said none to ({skippedCount.toLocaleString("en-IN")})
          </label>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 p-8 text-center">
          <Images className="w-8 h-8 text-emerald-500 mx-auto" />
          <p className="font-bold text-slate-900 dark:text-white mt-2">
            {query
              ? "No items match"
              : mode === "missing"
              ? noOptionsCount > 0
                ? `No more photos to pick. ${noOptionsCount.toLocaleString("en-IN")} items have no close photo on the website`
                : "Every item has a photo or an answer"
              : "No items"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
            {items.length.toLocaleString("en-IN")} items · on a computer, press 1 to 4 to pick for the top item, N
            for none
          </p>
          {items.slice(0, shown).map((item, index) => (
            <PhotoChoice
              key={idOf(item)}
              item={item}
              options={optionsById.get(idOf(item))}
              site={site}
              catalog={catalog}
              keys={index === 0}
              allMode={mode === "all"}
              onChoose={choose}
              onNone={noneOfThese}
              onRemove={removePhoto}
            />
          ))}
          {items.length > shown && (
            <button
              type="button"
              onClick={() => setShown((n) => n + PAGE)}
              className="w-full py-2.5 rounded-xl text-sm font-bold border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 cursor-pointer"
            >
              Show more ({(items.length - shown).toLocaleString("en-IN")} left)
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/** One item: its closest photos to tap, a search for any other, and "None of these". */
function PhotoChoice({ item, options: given, site, catalog, keys, allMode, onChoose, onNone, onRemove }) {
  const [search, setSearch] = useState("");
  const [broken, setBroken] = useState(() => new Set());
  const hasPhoto = !isPlaceholderImage(item.img);

  const options = useMemo(
    () =>
      (given || photoOptions(site, catalog, item, 6)).filter((o) => o.img !== item.img && o.img !== item.rejectedPhoto),
    [given, site, catalog, item]
  );
  const found = useMemo(
    () => (search.trim().length >= 2 ? searchSitePhotos(site, catalog, search, 8) : []),
    [site, catalog, search]
  );
  const shownOptions = options.filter((o) => !broken.has(o.img)).slice(0, 4);

  // Keys for the top item: 1-4 pick a photo, 0 or N is "None of these".
  useEffect(() => {
    if (!keys) return undefined;
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const n = Number(e.key);
      if (n >= 1 && n <= shownOptions.length) onChoose(item, shownOptions[n - 1].img);
      else if (!allMode && (e.key === "0" || e.key.toLowerCase() === "n")) onNone(item);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Every suggested photo turned out missing on the host: nothing to tap here.
  if (!allMode && given?.length && shownOptions.length === 0 && !search) return null;

  const tile = (option, label) => (
    <button
      key={option.img}
      type="button"
      onClick={() => onChoose(item, option.img)}
      className="group text-left rounded-xl border border-slate-200 dark:border-zinc-700 hover:border-[#FF5B00] focus:border-[#FF5B00] focus:outline-none p-2 transition-colors cursor-pointer"
    >
      <div className="rounded-lg overflow-hidden">
        <ProbeImage src={option.img} name={option.name} onBroken={() => setBroken((b) => new Set(b).add(option.img))} />
      </div>
      <p className="text-[11px] leading-tight text-slate-600 dark:text-zinc-300 mt-1.5 line-clamp-2">
        {label && <span className="font-bold text-[#FF5B00]">{label} </span>}
        {option.name}
        {option.own && <span className="text-emerald-600 dark:text-emerald-400"> · used before</span>}
      </p>
    </button>
  );

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-4">
      <div className="flex items-center gap-3">
        {hasPhoto && (
          <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden border border-slate-200 dark:border-zinc-700">
            <ProductImage src={item.img} name={item.name} letterClassName="text-sm" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-900 dark:text-white">{item.name}</p>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            {[item.unit && item.unit !== "1 pc" ? item.unit : "", item.barcode || "", hasPhoto ? "current photo on the left" : ""]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3">
        {shownOptions.map((option, i) => tile(option, String(i + 1)))}
        {allMode ? (
          hasPhoto && (
            <button
              type="button"
              onClick={() => onRemove(item)}
              className="rounded-xl border border-dashed border-red-300 dark:border-red-900 hover:border-red-500 flex flex-col items-center justify-center gap-1.5 p-2 min-h-[120px] text-red-500 cursor-pointer"
            >
              <Trash2 className="w-5 h-5" />
              <span className="text-xs font-bold">Wrong photo, remove</span>
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={() => onNone(item)}
            className="rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 hover:border-slate-500 flex flex-col items-center justify-center gap-1.5 p-2 min-h-[120px] text-slate-500 dark:text-zinc-400 cursor-pointer"
          >
            <ImageOff className="w-5 h-5" />
            <span className="text-xs font-bold">None of these</span>
          </button>
        )}
      </div>
      {shownOptions.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">No close photo on the website. Search for one below.</p>
      )}

      <div className="relative mt-3">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search other photos (e.g. amul butter)"
          className="w-full pl-8 pr-3 py-2 rounded-xl text-sm bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-900 dark:text-white"
        />
      </div>
      {found.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3">{found.map((option) => tile(option, ""))}</div>
      )}
      {search.trim().length >= 2 && found.length === 0 && (
        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-2">No photos on the website for that.</p>
      )}
    </div>
  );
}

/** The photo, small copy first; tells the card when neither copy opens so it can drop the option. */
function ProbeImage({ src, name, onBroken }) {
  useEffect(() => {
    let alive = true;
    sitePhotoOpens(src).then((ok) => {
      if (alive && !ok) onBroken();
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);
  return <ProductImage src={src} name={name} letterClassName="text-xl" />;
}
