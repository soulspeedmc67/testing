import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Trash2, X } from "lucide-react";
import AdminSheet from "./AdminSheet";
import ProductImage from "../ProductImage";
import { removeProductPhoto, setManualProductPhoto } from "../../lib/db";
import { checkPhoto, opensAsPhoto } from "../../lib/photoQuality";
import { normaliseImageUrl } from "../../lib/csvInventory";

function SheetHeader({ id, title, subtitle, onClose, subtle }) {
  return (
    <div className="px-5 pt-2 pb-3 flex items-start justify-between gap-3">
      <div>
        <h3 id={id} className="text-lg font-black text-slate-900 dark:text-white leading-tight">
          {title}
        </h3>
        {subtitle && <p className={`text-xs mt-1 ${subtle}`}>{subtitle}</p>}
      </div>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center bg-slate-100 text-slate-600 dark:bg-zinc-800 dark:text-zinc-300 cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

/**
 * After an import: every photo just found, in a grid, so a wrong match is
 * easy to spot and remove.
 */
export function PhotoResultsSheet({ open, onClose, results = [], darkMode = false }) {
  const [removed, setRemoved] = useState(() => new Set());
  const [busyId, setBusyId] = useState(null);
  const subtle = darkMode ? "text-zinc-400" : "text-slate-500";
  const found = results.filter((r) => r.status === "found");

  const remove = async (item) => {
    setBusyId(item.id);
    try {
      await removeProductPhoto(item.id, item.img);
      setRemoved((prev) => new Set(prev).add(item.id));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <AdminSheet open={open} onClose={onClose} labelledBy="photo-results-title" darkMode={darkMode}>
      <SheetHeader
        id="photo-results-title"
        title="Photos found"
        subtitle="Check them over. If one shows the wrong product, remove it."
        onClose={onClose}
        subtle={subtle}
      />
      <div className="px-5 pb-6 overflow-y-auto overscroll-contain">
        {found.length === 0 ? (
          <p className={`text-sm py-8 text-center ${subtle}`}>No new photos were found this time.</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {found.map((item) => {
              const isRemoved = removed.has(item.id);
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl border overflow-hidden ${darkMode ? "border-zinc-800" : "border-slate-200"}`}
                >
                  <ProductImage src={isRemoved ? "" : item.img} name={item.name} letterClassName="text-3xl" />
                  <div className="p-2 space-y-2">
                    <p className="text-xs font-bold text-slate-900 dark:text-white line-clamp-2 min-h-[2rem]">{item.name}</p>
                    {item.weak && !isRemoved && (
                      <p className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">{item.issues.join(", ")}</p>
                    )}
                    {isRemoved ? (
                      <p className={`text-[11px] font-semibold ${subtle}`}>Removed</p>
                    ) : (
                      <button
                        type="button"
                        onClick={() => remove(item)}
                        disabled={busyId === item.id}
                        className="w-full min-h-[40px] flex items-center justify-center gap-1 px-1.5 text-[11px] font-bold whitespace-nowrap rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-400 cursor-pointer disabled:opacity-60"
                      >
                        {busyId === item.id ? <Loader2 className="w-3 h-3 shrink-0 animate-spin" /> : <Trash2 className="w-3 h-3 shrink-0" />}
                        Wrong photo, remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminSheet>
  );
}

/** One product on the "Needs a photo" list: paste a link to a photo of it. */
function NeedsPhotoRow({ product, reason, darkMode, subtle }) {
  const [link, setLink] = useState("");
  const [state, setState] = useState({ busy: false, message: "", saved: false });
  const [savedUrl, setSavedUrl] = useState("");
  const id = String(product.id || product.barcode);

  const saveLink = async () => {
    const url = normaliseImageUrl(link);
    if (!url) {
      setState({ busy: false, saved: false, message: "That isn't a web link. It should start with https://" });
      return;
    }
    setState({ busy: true, saved: false, message: "" });
    if (!(await opensAsPhoto(url))) {
      setState({
        busy: false,
        saved: false,
        message: "That link doesn't open a photo. Press and hold the photo, choose \u201cCopy image address\u201d, and paste that.",
      });
      return;
    }
    const quality = await checkPhoto(url);
    try {
      await setManualProductPhoto(id, url, { weak: quality.weak, issues: quality.reasons });
      setLink("");
      setSavedUrl(url);
      setState({ busy: false, saved: true, message: "Saved." });
    } catch {
      setState({ busy: false, saved: false, message: "Couldn't save it. Check the internet and try again." });
    }
  };

  const inputCls = darkMode
    ? "bg-[#0D0E12] border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
    : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400";

  return (
    <li className={`py-3 border-b last:border-b-0 ${darkMode ? "border-zinc-800" : "border-slate-100"}`}>
      <div className="flex items-center gap-3">
        <div className="w-14 shrink-0 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800">
          <ProductImage src={savedUrl || product.img} name={product.name} letterClassName="text-lg" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{product.name}</p>
          <p className={`text-xs ${subtle}`}>{savedUrl ? "Photo added" : reason}</p>
        </div>
      </div>
      <form
        className="mt-2.5 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          saveLink();
        }}
      >
        <input
          type="url"
          inputMode="url"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Paste a photo link"
          aria-label={`Photo link for ${product.name}`}
          className={`flex-1 min-w-0 text-sm px-3 py-2.5 rounded-xl border outline-none focus:border-[#FF5B00] ${inputCls}`}
        />
        <button
          type="submit"
          disabled={state.busy || !link.trim()}
          className="shrink-0 min-w-[64px] flex items-center justify-center px-4 text-xs font-bold rounded-xl bg-[#FF5B00] text-white cursor-pointer disabled:opacity-50"
        >
          {state.busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save"}
        </button>
      </form>
      {state.message && (
        <p className={`mt-2 text-xs ${state.saved ? "text-emerald-600 dark:text-emerald-400 font-bold" : subtle}`}>{state.message}</p>
      )}
    </li>
  );
}

/**
 * "Needs a photo": products with no photo, or one that's too small or looks
 * blank. Shown a page at a time, with a search box for big catalogues.
 */
export function NeedsPhotoSheet({ open, onClose, products = [], darkMode = false }) {
  const [query, setQuery] = useState("");
  const [limit, setLimit] = useState(40);
  const subtle = darkMode ? "text-zinc-400" : "text-slate-500";

  // The list stays as it was when the sheet opened, so an item that just got
  // its photo shows "Saved." instead of vanishing; it's gone next time.
  const [rows, setRows] = useState(products);
  useEffect(() => {
    if (open) setRows(products);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? rows.filter((p) => String(p.product.name || "").toLowerCase().includes(q)) : rows;
  }, [rows, query]);

  return (
    <AdminSheet open={open} onClose={onClose} labelledBy="needs-photo-title" darkMode={darkMode}>
      <SheetHeader
        id="needs-photo-title"
        title={`Needs a photo (${products.length})`}
        subtitle="Items with no photo, or one that's too small or blank. Paste a link to a photo of each one."
        onClose={onClose}
        subtle={subtle}
      />
      <div className="px-5 pb-2">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setLimit(40);
          }}
          placeholder="Find an item"
          className={`w-full text-sm px-3.5 py-2.5 rounded-xl border outline-none focus:border-[#FF5B00] ${
            darkMode ? "bg-[#0D0E12] border-zinc-800 text-zinc-100" : "bg-slate-50 border-slate-200 text-slate-900"
          }`}
        />
      </div>
      <div className="px-5 pb-6 overflow-y-auto overscroll-contain">
        {visible.length === 0 ? (
          <p className={`text-sm py-8 text-center ${subtle}`}>
            {rows.length === 0 ? "Every item has a good photo." : "No item matches that."}
          </p>
        ) : (
          <ul>
            {visible.slice(0, limit).map(({ product, reason }) => (
              <NeedsPhotoRow
                key={product.id || product.barcode}
                product={product}
                reason={reason}
                darkMode={darkMode}
                subtle={subtle}
              />
            ))}
          </ul>
        )}
        {visible.length > limit && (
          <button
            type="button"
            onClick={() => setLimit((n) => n + 40)}
            className={`w-full mt-2 py-2.5 text-xs font-bold rounded-xl border cursor-pointer ${
              darkMode ? "border-zinc-700 text-zinc-200" : "border-slate-200 text-slate-700"
            }`}
          >
            Show more ({visible.length - limit} left)
          </button>
        )}
      </div>
    </AdminSheet>
  );
}
