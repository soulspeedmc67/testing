import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Sparkles,
  Plus,
  ImagePlus,
  Loader2,
  Trash2,
  Check,
  ChevronUp,
  ChevronDown,
  PackagePlus,
  Boxes,
  Search,
  X,
  Pencil,
  Link2,
  Eye,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import AdminSheet from "./AdminSheet";
import { Switch } from "./ShopRulesSettings";
import SpotlightShowcase, { SPOTLIGHT_PAGE_BG } from "../SpotlightShowcase";
import { uploadStaffPhoto } from "../../lib/staffUpload";
import { watchSpotlight, saveSpotlight, setSpotlightEnabled, createProductStrict } from "../../lib/db";
import { isAgeRestricted } from "../../lib/ageGate";
import {
  LIMITS,
  normalizeSpotlight,
  spotlightProblems,
  sectionProblems,
  newItemProblems,
  productFromNewItem,
  itemFromProduct,
  shopperSpotlight,
  newSectionId,
  moveEntry,
} from "../../lib/spotlight";

/**
 * The console's editor for the spotlight tab (src/lib/spotlight.js): its
 * words, its groups (each with a photo) and the items in each group. Items are
 * either new (made here, with a photo, and added to the shop's stock) or
 * picked from the items already in stock. Nothing reaches customers until
 * Save; Save stays grey while there is nothing new to save, and says when it
 * has saved.
 */
export default function SpotlightEditor({ catalogue = [], categories = [], showToast, darkMode = false }) {
  const [saved, setSaved] = useState(null); // normalized, as on the server
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [status, setStatus] = useState(null); // { ok, text }
  const [triedSave, setTriedSave] = useState(false);
  const [groupSheet, setGroupSheet] = useState(null); // { id?, name, img }
  const [itemSheet, setItemSheet] = useState(null); // { sectionId }
  const [stockSheet, setStockSheet] = useState(null); // { sectionId }
  const [showPreview, setShowPreview] = useState(false);

  const savedRef = useRef(null);
  useEffect(
    () =>
      watchSpotlight((raw) => {
        const next = normalizeSpotlight(raw);
        const before = savedRef.current;
        savedRef.current = next;
        setSaved(next);
        // A save from another device lands here too; an untouched draft follows it.
        setDraft((prev) => (prev === null || JSON.stringify(prev) === JSON.stringify(before) ? next : prev));
      }),
    []
  );

  const changed = draft && saved && JSON.stringify(draft) !== JSON.stringify(saved);
  const problems = draft ? spotlightProblems(draft) : [];
  const set = (patch) => {
    setStatus(null);
    setDraft((prev) => ({ ...prev, ...patch }));
  };
  const setSections = (fn) => {
    setStatus(null);
    setDraft((prev) => ({ ...prev, sections: fn(prev.sections) }));
  };
  const setItems = (sectionId, fn) =>
    setSections((sections) => sections.map((s) => (s.id === sectionId ? { ...s, items: fn(s.items) } : s)));

  // Leaving the page with unsaved changes asks first.
  useEffect(() => {
    if (!changed) return undefined;
    const warn = (e) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [changed]);

  const save = async () => {
    setTriedSave(true);
    if (!changed || saving || problems.length) return;
    setSaving(true);
    setStatus(null);
    try {
      const clean = normalizeSpotlight(draft);
      // Offline, Firestore keeps the write and never answers; say so instead of spinning.
      const answered = await Promise.race([
        saveSpotlight(clean).then(() => true),
        new Promise((resolve) => setTimeout(() => resolve(false), 15000)),
      ]);
      if (!answered) {
        const text = "No answer from the server yet. It will be saved when the internet is back; keep this page open.";
        setStatus({ ok: false, text });
        showToast?.(text);
        return;
      }
      setDraft(clean);
      const text = clean.enabled
        ? `Saved. Customers see “${clean.tabLabel}” in the shop now.`
        : "Saved. The tab is off, so customers don't see it.";
      setStatus({ ok: true, text });
      setTriedSave(false);
      showToast?.(text);
    } catch (e) {
      const denied = /permission|insufficient/i.test(e?.message || "");
      const text = denied
        ? "Not saved. This account isn't allowed to make changes. Sign in with the owner account."
        : "Not saved. Check the internet connection and try again.";
      setStatus({ ok: false, text });
      showToast?.(text);
    } finally {
      setSaving(false);
    }
  };

  /* On or off at once, any time, without Save: only `enabled` is written, so
     unsaved changes to groups and items stay unsaved. */
  const switchLive = async () => {
    if (!saved || switching) return;
    const next = !saved.enabled;
    if (next && !saved.sections.some((s) => s.items.length > 0)) {
      setStatus({ ok: false, text: "Add a group with at least one item and Save it first, then switch the tab on." });
      return;
    }
    setSwitching(true);
    setStatus(null);
    try {
      const answered = await Promise.race([
        setSpotlightEnabled(next).then(() => true),
        new Promise((resolve) => setTimeout(() => resolve(false), 15000)),
      ]);
      setDraft((d) => ({ ...d, enabled: next }));
      const text = !answered
        ? "No answer from the server yet. It will switch when the internet is back."
        : next
        ? `Switched on. Customers see “${saved.tabLabel}” on the home screen now.`
        : "Switched off. Customers don't see the special tab now.";
      setStatus({ ok: answered, text });
      showToast?.(text);
    } catch (e) {
      const text = /permission|insufficient/i.test(e?.message || "")
        ? "Not switched. This account isn't allowed to make changes."
        : "Not switched. Check the internet connection and try again.";
      setStatus({ ok: false, text });
      showToast?.(text);
    } finally {
      setSwitching(false);
    }
  };

  const preview = useMemo(() => (draft ? shopperSpotlight({ ...draft, enabled: true }, catalogue) : null), [draft, catalogue]);

  const card = `rounded-2xl border p-4 sm:p-5 space-y-4 ${darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"}`;
  const field = `w-full text-sm font-semibold px-3 py-2.5 rounded-xl border outline-none ${
    darkMode ? "bg-[#1A1D26] border-zinc-700 text-white focus:border-[#E0A200]" : "bg-slate-50 border-slate-300 text-slate-900 focus:border-[#E0A200]"
  }`;
  const label = "block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1";
  const help = "text-[11px] text-slate-500 dark:text-zinc-400";
  const smallBtn = `inline-flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
    darkMode ? "border-zinc-700 text-zinc-200 hover:bg-zinc-800" : "border-slate-300 text-slate-700 hover:bg-slate-50"
  }`;
  const iconBtn = `w-8 h-8 inline-flex items-center justify-center rounded-lg cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed ${
    darkMode ? "text-zinc-400 hover:bg-zinc-800" : "text-slate-500 hover:bg-slate-100"
  }`;

  if (!draft) {
    return (
      <div className={`${card} flex items-center gap-2 text-sm font-semibold text-slate-500`}>
        <Loader2 className="w-4 h-4 animate-spin" /> Loading the special tab…
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-24">
      {/* What it is */}
      <div className={card}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <span className="w-10 h-10 shrink-0 rounded-2xl bg-gradient-to-br from-[#FFE680] via-[#FFC21A] to-[#E89B00] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-[#4A2E00]" />
            </span>
            <div className="min-w-0">
              <h2 className="font-black text-base text-slate-900 dark:text-white">Special tab on the home screen</h2>
              <p className={help}>
                A gold tab next to “All” in the shop’s category strip. Tapping it turns the home screen gold and shows your groups and items.
                The website and both apps show it.
              </p>
            </div>
          </div>
        </div>
        {/* Live switch: works at once, separate from Save. */}
        <div
          className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 ${
            saved?.enabled
              ? "border-[#E0A200]/60 bg-gradient-to-r from-[#FFF4CC] to-[#FFE58A] dark:from-[#3A2B07] dark:to-[#2C2005]"
              : darkMode
              ? "border-zinc-800 bg-[#1A1D26]"
              : "border-slate-200 bg-slate-50"
          }`}
        >
          <div className="min-w-0">
            <p className={`text-sm font-black ${saved?.enabled ? "text-[#4A2E00] dark:text-[#FFD45C]" : "text-slate-900 dark:text-white"}`}>
              {saved?.enabled ? "On: customers see the special tab" : "Off: customers don't see it"}
            </p>
            <p className={help}>Switches at once, any time. No Save needed, and your other changes stay as they are.</p>
          </div>
          <Switch on={Boolean(saved?.enabled)} busy={switching} disabled={switching} label="Show the special tab to customers" onChange={switchLive} />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <label className={label} htmlFor="spot-tab">Tab name *</label>
            <input id="spot-tab" className={field} value={draft.tabLabel} maxLength={LIMITS.tabLabel} onChange={(e) => set({ tabLabel: e.target.value })} placeholder="e.g. Diwali" />
          </div>
          <div>
            <label className={label} htmlFor="spot-title">Heading *</label>
            <input id="spot-title" className={field} value={draft.title} maxLength={LIMITS.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Furnishing & Dining" />
          </div>
          <div>
            <label className={label} htmlFor="spot-sub">Line under the heading</label>
            <input id="spot-sub" className={field} value={draft.subtitle} maxLength={LIMITS.subtitle} onChange={(e) => set({ subtitle: e.target.value })} placeholder="e.g. Handpicked for the season" />
          </div>
        </div>
      </div>

      {/* Groups */}
      <div className="flex items-center justify-between gap-3 px-1">
        <div>
          <h3 className="font-black text-sm text-slate-900 dark:text-white">Groups</h3>
          <p className={help}>Each group is a photo tile on the page, with its items under it. Up to {LIMITS.sections} groups.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button type="button" onClick={() => setShowPreview(true)} className={smallBtn}>
            <Eye className="w-3.5 h-3.5" /> Preview
          </button>
          <button
            type="button"
            disabled={draft.sections.length >= LIMITS.sections}
            onClick={() => setGroupSheet({ name: "", img: "" })}
            className="inline-flex items-center gap-1.5 text-xs font-black px-3.5 py-2 rounded-xl bg-[#4A2E00] text-[#FFD45C] hover:bg-[#3A2400] cursor-pointer disabled:opacity-40"
          >
            <Plus className="w-3.5 h-3.5" /> Add group
          </button>
        </div>
      </div>

      {draft.sections.length === 0 && (
        <div className={`${card} text-center py-10`}>
          <p className="text-sm font-bold text-slate-700 dark:text-zinc-300">No groups yet</p>
          <p className={`${help} mt-1`}>Start with a group like “Bedsheets & Towels”, then add items to it.</p>
        </div>
      )}

      {draft.sections.map((s, si) => (
        <div key={s.id} className={card}>
          <div className="flex items-center gap-3">
            <div className="w-14 h-16 shrink-0 rounded-xl overflow-hidden bg-gradient-to-b from-[#FFF7DA] to-[#FFCF4D] border border-[#F2B92B]/60 flex items-end justify-center">
              {s.img ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.img} alt="" className="w-full h-full object-contain object-bottom" />
              ) : (
                <ImagePlus className="w-5 h-5 mb-4 text-[#8A5A00]" />
              )}
            </div>
            <div className="min-w-0 grow">
              <p className="font-black text-sm text-slate-900 dark:text-white truncate">{s.name || "Unnamed group"}</p>
              <p className={help}>
                {s.items.length} item{s.items.length === 1 ? "" : "s"}
                {s.items.length === 0 ? " · customers don't see an empty group" : ""}
              </p>
            </div>
            <div className="flex items-center shrink-0">
              <button type="button" className={iconBtn} aria-label="Move group up" disabled={si === 0} onClick={() => setSections((list) => moveEntry(list, si, si - 1))}>
                <ChevronUp className="w-4 h-4" />
              </button>
              <button type="button" className={iconBtn} aria-label="Move group down" disabled={si === draft.sections.length - 1} onClick={() => setSections((list) => moveEntry(list, si, si + 1))}>
                <ChevronDown className="w-4 h-4" />
              </button>
              <button type="button" className={iconBtn} aria-label="Change group" onClick={() => setGroupSheet({ id: s.id, name: s.name, img: s.img })}>
                <Pencil className="w-4 h-4" />
              </button>
              <button
                type="button"
                className={`${iconBtn} hover:!text-rose-600`}
                aria-label="Delete group"
                onClick={() => {
                  if (window.confirm(`Delete the group “${s.name}”? Its items stay in your stock.`)) setSections((list) => list.filter((x) => x.id !== s.id));
                }}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {s.items.length > 0 && (
            <ul className={`divide-y rounded-xl border ${darkMode ? "divide-zinc-800 border-zinc-800" : "divide-slate-100 border-slate-200"}`}>
              {s.items.map((item, ii) => (
                <li key={item.id} className="flex items-center gap-3 px-3 py-2">
                  <span className="w-10 h-10 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0">
                    {item.img && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.img} alt="" className="w-full h-full object-contain" />
                    )}
                  </span>
                  <div className="min-w-0 grow">
                    <p className="text-[13px] font-bold text-slate-900 dark:text-white truncate">{item.name}</p>
                    <p className={help}>
                      ₹{item.price}
                      {item.mrp ? <span className="line-through ml-1">₹{item.mrp}</span> : null}
                      {item.unit ? ` · ${item.unit}` : ""}
                    </p>
                  </div>
                  <button type="button" className={iconBtn} aria-label="Move item up" disabled={ii === 0} onClick={() => setItems(s.id, (list) => moveEntry(list, ii, ii - 1))}>
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button type="button" className={iconBtn} aria-label="Move item down" disabled={ii === s.items.length - 1} onClick={() => setItems(s.id, (list) => moveEntry(list, ii, ii + 1))}>
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  <button type="button" className={`${iconBtn} hover:!text-rose-600`} aria-label={`Remove ${item.name}`} onClick={() => setItems(s.id, (list) => list.filter((x) => x.id !== item.id))}>
                    <X className="w-4 h-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <div className="grid grid-cols-2 gap-2">
            <button type="button" disabled={s.items.length >= LIMITS.items} onClick={() => setItemSheet({ sectionId: s.id })} className={smallBtn}>
              <PackagePlus className="w-4 h-4" /> New item
            </button>
            <button type="button" disabled={s.items.length >= LIMITS.items} onClick={() => setStockSheet({ sectionId: s.id })} className={smallBtn}>
              <Boxes className="w-4 h-4" /> Add from stock
            </button>
          </div>
        </div>
      ))}

      {/* Save bar: grey until something changes, then says what happened. */}
      <div className="sticky bottom-3 z-30">
        <div
          className={`rounded-2xl border px-4 py-3 flex items-center gap-3 shadow-lg backdrop-blur-md ${
            darkMode ? "bg-[#14161E]/95 border-zinc-800" : "bg-white/95 border-slate-200"
          }`}
        >
          <div className="min-w-0 grow" aria-live="polite">
            {triedSave && problems.length > 0 ? (
              <p className="text-xs font-bold text-rose-600 flex items-start gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" /> {problems[0]}
                {problems.length > 1 ? ` (+${problems.length - 1} more)` : ""}
              </p>
            ) : status ? (
              <p className={`text-xs font-bold flex items-start gap-1.5 ${status.ok ? "text-emerald-600" : "text-rose-600"}`}>
                {status.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />} {status.text}
              </p>
            ) : (
              <p className={help}>{changed ? "You have changes that customers don't see yet." : "Everything is saved."}</p>
            )}
          </div>
          <button
            type="button"
            onClick={save}
            disabled={!changed || saving}
            className="inline-flex items-center gap-1.5 shrink-0 text-xs font-black px-5 py-2.5 rounded-xl transition-all active:scale-95 cursor-pointer bg-[#FF5B00] hover:bg-[#E04E00] text-white disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-400 disabled:cursor-not-allowed disabled:active:scale-100"
          >
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
            {saving ? "Saving…" : changed ? "Save" : "Saved"}
          </button>
        </div>
      </div>

      <GroupSheet
        value={groupSheet}
        darkMode={darkMode}
        onClose={() => setGroupSheet(null)}
        onDone={({ id, name, img }) => {
          if (id) setSections((list) => list.map((s) => (s.id === id ? { ...s, name: name.trim(), img } : s)));
          else setSections((list) => [...list, { id: newSectionId(), name: name.trim(), img, items: [] }]);
          setGroupSheet(null);
        }}
      />

      <NewItemSheet
        open={Boolean(itemSheet)}
        categories={categories}
        darkMode={darkMode}
        onClose={() => setItemSheet(null)}
        onCreated={(product) => {
          setItems(itemSheet.sectionId, (list) => [...list, itemFromProduct(product)]);
          setItemSheet(null);
          showToast?.(`“${product.name}” is in your stock and in the group. Tap Save to show it.`);
        }}
      />

      <StockPickerSheet
        open={Boolean(stockSheet)}
        catalogue={catalogue}
        taken={new Set(draft.sections.find((s) => s.id === stockSheet?.sectionId)?.items.map((i) => i.id) || [])}
        room={LIMITS.items - (draft.sections.find((s) => s.id === stockSheet?.sectionId)?.items.length || 0)}
        darkMode={darkMode}
        onClose={() => setStockSheet(null)}
        onPick={(products) => {
          setItems(stockSheet.sectionId, (list) => [...list, ...products.map(itemFromProduct).filter(Boolean)]);
          setStockSheet(null);
        }}
      />

      {showPreview && (
        <div className="fixed inset-0 z-[160] bg-black/70 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Preview">
          <div className="relative w-full max-w-[400px] h-[86vh] rounded-[2.2rem] bg-[#0B1220] p-[7px] shadow-2xl">
            <button type="button" onClick={() => setShowPreview(false)} aria-label="Close preview" className="absolute -top-3 -right-3 z-10 w-9 h-9 rounded-full bg-white text-slate-700 flex items-center justify-center shadow cursor-pointer">
              <X className="w-4 h-4" />
            </button>
            <div className={`relative h-full overflow-y-auto rounded-[1.8rem] px-4 pb-8 ${SPOTLIGHT_PAGE_BG}`}>
              {preview ? (
                <SpotlightShowcase spotlight={preview} onAdd={() => {}} onUpdateQty={() => {}} />
              ) : (
                <p className="pt-24 text-center text-sm font-bold text-[#6B4A10]">Add a group with an item to see the page.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** A photo that must be there: upload from this device, or paste a link. */
function PhotoField({ value, onChange, darkMode, aspect = "aspect-[4/5]", label = "Photo *" }) {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showLink, setShowLink] = useState(false);
  const pick = async (file) => {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      onChange(await uploadStaffPhoto(file));
    } catch (e) {
      setError(e?.message || "The photo couldn't be uploaded.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-bold text-slate-700 dark:text-zinc-300">{label}</span>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className={`relative w-32 ${aspect} rounded-2xl border-2 border-dashed overflow-hidden flex items-center justify-center cursor-pointer ${
          value ? "border-transparent bg-white" : darkMode ? "border-zinc-700 bg-[#1A1D26]" : "border-slate-300 bg-slate-50"
        }`}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="absolute inset-0 w-full h-full object-contain" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-slate-500 dark:text-zinc-400">
            <ImagePlus className="w-6 h-6" />
            <span className="text-[11px] font-bold">Add photo</span>
          </span>
        )}
        {uploading && (
          <span className="absolute inset-0 bg-black/50 flex items-center justify-center text-white">
            <Loader2 className="w-5 h-5 animate-spin" />
          </span>
        )}
      </button>
      <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
      <div className="flex items-center gap-3">
        {value && (
          <button type="button" onClick={() => onChange("")} className="text-[11px] font-bold text-rose-600 cursor-pointer">
            Remove photo
          </button>
        )}
        <button type="button" onClick={() => setShowLink((v) => !v)} className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 underline cursor-pointer inline-flex items-center gap-1">
          <Link2 className="w-3 h-3" /> Use a photo link
        </button>
      </div>
      {showLink && (
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value.trim())}
          placeholder="https://…"
          aria-label="Photo link"
          className={`w-full text-xs font-mono px-3 py-2 rounded-xl border outline-none ${darkMode ? "bg-[#1A1D26] border-zinc-700 text-white" : "bg-slate-50 border-slate-300"}`}
        />
      )}
      {error && <p className="text-xs font-semibold text-rose-600">{error}</p>}
    </div>
  );
}

function SheetHeader({ title, sub, onClose }) {
  return (
    <div className="flex items-start justify-between gap-3 px-5 pt-2 pb-3 border-b border-slate-200/60 dark:border-zinc-800 shrink-0">
      <div>
        <h3 id="spot-sheet-title" className="font-black text-base text-slate-900 dark:text-white">{title}</h3>
        {sub && <p className="text-[11px] text-slate-500 dark:text-zinc-400">{sub}</p>}
      </div>
      <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 cursor-pointer">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

const primaryBtn =
  "w-full inline-flex items-center justify-center gap-2 text-sm font-black px-4 py-3 rounded-xl bg-[#4A2E00] text-[#FFD45C] hover:bg-[#3A2400] cursor-pointer disabled:bg-slate-300 disabled:text-slate-500 dark:disabled:bg-zinc-700 dark:disabled:text-zinc-400 disabled:cursor-not-allowed";

/** Add or change a group: a name and a photo, both needed. */
function GroupSheet({ value, onClose, onDone, darkMode }) {
  const [name, setName] = useState("");
  const [img, setImg] = useState("");
  const [tried, setTried] = useState(false);
  useEffect(() => {
    setName(value?.name || "");
    setImg(value?.img || "");
    setTried(false);
  }, [value]);
  const problems = sectionProblems({ name, img });
  return (
    <AdminSheet open={Boolean(value)} onClose={onClose} labelledBy="spot-sheet-title" darkMode={darkMode}>
      <SheetHeader title={value?.id ? "Change group" : "New group"} sub="Shown as a photo tile on the special page." onClose={onClose} />
      <div className="overflow-y-auto px-5 py-4 space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1" htmlFor="spot-group-name">Name *</label>
          <input
            id="spot-group-name"
            value={name}
            maxLength={LIMITS.sectionName}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Bedsheets & Towels"
            className={`w-full text-sm font-semibold px-3 py-2.5 rounded-xl border outline-none ${darkMode ? "bg-[#1A1D26] border-zinc-700 text-white" : "bg-slate-50 border-slate-300"}`}
          />
        </div>
        <PhotoField value={img} onChange={setImg} darkMode={darkMode} label="Photo * (a cut-out on a plain background looks best)" />
        {tried && problems.length > 0 && <p className="text-xs font-bold text-rose-600">{problems.join(" ")}</p>}
        <button
          type="button"
          className={primaryBtn}
          onClick={() => {
            setTried(true);
            if (!problems.length) onDone({ id: value?.id, name, img });
          }}
        >
          <Check className="w-4 h-4" /> {value?.id ? "Done" : "Add group"}
        </button>
      </div>
    </AdminSheet>
  );
}

/** A brand-new item: made a real product in the shop's stock, with its photo. */
function NewItemSheet({ open, onClose, onCreated, categories = [], darkMode }) {
  const blank = { name: "", price: "", mrp: "", unit: "", stock: "10", cat: "", img: "" };
  const [form, setForm] = useState(blank);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (open) {
      setForm(blank);
      setTried(false);
      setError("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const problems = newItemProblems(form);
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const input = `w-full text-sm font-semibold px-3 py-2.5 rounded-xl border outline-none ${darkMode ? "bg-[#1A1D26] border-zinc-700 text-white" : "bg-slate-50 border-slate-300"}`;
  const label = "block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1";
  const cats = [...new Set(categories.filter(Boolean))].sort((a, b) => a.localeCompare(b));

  const create = async () => {
    setTried(true);
    if (problems.length || busy) return;
    setBusy(true);
    setError("");
    try {
      const product = productFromNewItem({ ...form, cat: form.cat || cats[0] || "Home & Kitchen" });
      await createProductStrict(product);
      onCreated(product);
    } catch (e) {
      setError(/permission|insufficient/i.test(e?.message || "") ? "Not added. This account isn't allowed to add items." : "Not added. Check the internet connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminSheet open={open} onClose={onClose} labelledBy="spot-sheet-title" darkMode={darkMode}>
      <SheetHeader title="New item" sub="It is added to your stock too, so it can be ordered and counted." onClose={onClose} />
      <div className="overflow-y-auto px-5 py-4 space-y-4">
        <PhotoField value={form.img} onChange={(img) => set({ img })} aspect="aspect-square" darkMode={darkMode} />
        <div>
          <label className={label} htmlFor="spot-item-name">Name *</label>
          <input id="spot-item-name" className={input} value={form.name} maxLength={90} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Reed Lavender Oil Diffuser Set" />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={label} htmlFor="spot-item-price">Price ₹ *</label>
            <input id="spot-item-price" className={input} type="number" inputMode="decimal" min="0" value={form.price} onChange={(e) => set({ price: e.target.value })} placeholder="339" />
          </div>
          <div>
            <label className={label} htmlFor="spot-item-mrp">MRP ₹</label>
            <input id="spot-item-mrp" className={input} type="number" inputMode="decimal" min="0" value={form.mrp} onChange={(e) => set({ mrp: e.target.value })} placeholder="999" />
          </div>
          <div>
            <label className={label} htmlFor="spot-item-unit">Pack size *</label>
            <input id="spot-item-unit" className={input} value={form.unit} maxLength={24} onChange={(e) => set({ unit: e.target.value })} placeholder="1 set" />
          </div>
          <div>
            <label className={label} htmlFor="spot-item-stock">In stock</label>
            <input id="spot-item-stock" className={input} type="number" inputMode="numeric" min="0" value={form.stock} onChange={(e) => set({ stock: e.target.value })} />
          </div>
        </div>
        <div>
          <label className={label} htmlFor="spot-item-cat">Also file it under</label>
          <select id="spot-item-cat" className={input} value={form.cat} onChange={(e) => set({ cat: e.target.value })}>
            {cats.length === 0 && <option value="">Home & Kitchen</option>}
            {cats.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1">The shop category it also shows in, for search.</p>
        </div>
        {tried && problems.length > 0 && <p className="text-xs font-bold text-rose-600">{problems.join(" ")}</p>}
        {error && <p className="text-xs font-bold text-rose-600">{error}</p>}
        <button type="button" onClick={create} disabled={busy} className={primaryBtn}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <PackagePlus className="w-4 h-4" />} {busy ? "Adding…" : "Add item"}
        </button>
      </div>
    </AdminSheet>
  );
}

/** Pick items already in stock. Tobacco and items without a photo can't be picked. */
function StockPickerSheet({ open, onClose, onPick, catalogue = [], taken, room, darkMode }) {
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState([]);
  useEffect(() => {
    if (open) {
      setQ("");
      setPicked([]);
    }
  }, [open]);
  const results = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const list = [];
    for (const p of catalogue) {
      const id = String(p?.id || p?.barcode || "");
      if (!id || !p.name || p.active === false || taken?.has(id) || isAgeRestricted(p)) continue;
      const hay = `${p.name} ${p.cat || ""}`.toLowerCase();
      if (words.every((w) => hay.includes(w))) list.push(p);
      if (list.length >= 60) break;
    }
    return list;
  }, [q, catalogue, taken]);
  const isPicked = (p) => picked.some((x) => String(x.id || x.barcode) === String(p.id || p.barcode));
  const toggle = (p) =>
    setPicked((list) => (isPicked(p) ? list.filter((x) => String(x.id || x.barcode) !== String(p.id || p.barcode)) : list.length < room ? [...list, p] : list));

  return (
    <AdminSheet open={open} onClose={onClose} labelledBy="spot-sheet-title" darkMode={darkMode}>
      <SheetHeader title="Add from stock" sub="Items you already sell. Items without a photo can't be added." onClose={onClose} />
      <div className="px-5 pt-3 shrink-0">
        <label className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border ${darkMode ? "bg-[#1A1D26] border-zinc-700" : "bg-slate-50 border-slate-300"}`}>
          <Search className="w-4 h-4 text-slate-400" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search your items" className="grow bg-transparent outline-none text-sm font-semibold text-slate-900 dark:text-white" />
        </label>
      </div>
      <ul className="overflow-y-auto px-3 py-2 grow min-h-[200px]">
        {results.length === 0 && <li className="px-2 py-8 text-center text-xs font-semibold text-slate-500">Nothing matches.</li>}
        {results.map((p) => {
          const noPhoto = !/^https?:\/\//i.test(String(p.img || p.image || ""));
          const on = isPicked(p);
          return (
            <li key={p.id || p.barcode}>
              <button
                type="button"
                disabled={noPhoto}
                onClick={() => toggle(p)}
                className={`w-full flex items-center gap-3 px-2 py-2 rounded-xl text-left cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ${on ? "bg-amber-100/70 dark:bg-amber-900/20" : "hover:bg-slate-50 dark:hover:bg-zinc-800/60"}`}
              >
                <span className="w-10 h-10 rounded-lg bg-white border border-slate-200 overflow-hidden shrink-0">
                  {!noPhoto && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.img || p.image} alt="" className="w-full h-full object-contain" loading="lazy" />
                  )}
                </span>
                <span className="min-w-0 grow">
                  <span className="block text-[13px] font-bold text-slate-900 dark:text-white truncate">{p.name}</span>
                  <span className="block text-[11px] text-slate-500 dark:text-zinc-400">
                    ₹{p.price} {p.unit ? `· ${p.unit}` : ""} {noPhoto ? "· no photo" : ""}
                  </span>
                </span>
                <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${on ? "bg-[#4A2E00] border-[#4A2E00] text-[#FFD45C]" : "border-slate-300 dark:border-zinc-600"}`}>
                  {on && <Check className="w-3.5 h-3.5" />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <div className="px-5 pb-5 pt-2 shrink-0 border-t border-slate-200/60 dark:border-zinc-800">
        <button type="button" disabled={picked.length === 0} onClick={() => onPick(picked)} className={primaryBtn}>
          <Plus className="w-4 h-4" /> {picked.length ? `Add ${picked.length} item${picked.length === 1 ? "" : "s"}` : "Pick items to add"}
        </button>
      </div>
    </AdminSheet>
  );
}
