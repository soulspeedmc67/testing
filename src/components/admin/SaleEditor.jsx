import React, { useState, useRef, useEffect } from "react";
import { X, ImagePlus, Loader2, Trash2, Check, Clock, Tag, Layers, Link2, Eye } from "lucide-react";
import { Switch } from "./ShopRulesSettings";
import { uploadStaffPhoto } from "../../lib/staffUpload";
import {
  SALE_ALL,
  saleToForm,
  saleProblems,
  formToSale,
  toLocalInput,
  fromLocalInput,
  expiresInFor,
} from "../../lib/sales";

const BADGES = ["SALE", "NEW", "FESTIVE", "LIMITED", "DASHIT EXCLUSIVE"];
const DAY = 86_400_000;

/**
 * Make or change a sale: the banner at the top of the shop. Photo, what it
 * is, what it applies to, an optional discount code and when it runs, with a
 * preview of the banner as customers see it. Saved by the console (`onSave`)
 * to `offers`; see src/lib/sales.js for the fields.
 */
export default function SaleEditor({
  initial = null,
  categories = [],
  coupons = [],
  onSave,
  onClose,
  darkMode = false,
  fallbackImg = "",
}) {
  const [form, setForm] = useState(() => saleToForm(initial));
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [saving, setSaving] = useState(false);
  const [showLink, setShowLink] = useState(false);
  const [triedSave, setTriedSave] = useState(false);
  const fileRef = useRef(null);

  const set = (patch) => setForm((prev) => ({ ...prev, ...patch }));
  const isEdit = Boolean(initial?.id);
  const problems = saleProblems(form);
  const cats = [...new Set(categories.filter((c) => c && c !== SALE_ALL))].sort((a, b) => a.localeCompare(b));

  // Keep the page behind from scrolling while the editor is open.
  useEffect(() => {
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = before;
    };
  }, []);

  const pickPhoto = async (file) => {
    if (!file) return;
    setUploadError("");
    setUploading(true);
    try {
      const url = await uploadStaffPhoto(file);
      set({ img: url });
    } catch (e) {
      setUploadError(e?.message || "The photo couldn't be uploaded.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setTriedSave(true);
    if (problems.length || uploading || saving) return;
    setSaving(true);
    try {
      await onSave(formToSale(form, fallbackImg), form.id || null);
    } finally {
      setSaving(false);
    }
  };

  const field = `w-full text-sm font-semibold px-3 py-2.5 rounded-xl border outline-none ${
    darkMode
      ? "bg-[#1A1D26] border-zinc-700 text-white focus:border-[#FF5B00]"
      : "bg-slate-50 border-slate-300 text-slate-900 focus:border-[#FF5B00]"
  }`;
  const label = "block text-xs font-bold text-slate-700 dark:text-zinc-300 mb-1";
  const help = "text-[11px] text-slate-500 dark:text-zinc-400 mt-1";
  const section = "space-y-2.5";
  const heading = "flex items-center gap-2 text-[13px] font-black text-slate-900 dark:text-white";
  const chip = (on) =>
    `px-3 py-1.5 rounded-full text-xs font-bold border cursor-pointer transition-colors ${
      on
        ? "bg-[#FF5B00] border-[#FF5B00] text-white"
        : darkMode
        ? "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
        : "border-slate-300 text-slate-700 hover:bg-slate-50"
    }`;

  const code = coupons.find((c) => c.code === form.promoCode);
  const endsLine = form.endsAt ? expiresInFor(form.endsAt) : "Active today";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-xs sm:p-4" role="dialog" aria-modal="true" aria-label={isEdit ? "Edit sale" : "New sale"}>
      <div
        className={`w-full sm:max-w-3xl max-h-[94vh] flex flex-col rounded-t-3xl sm:rounded-3xl border shadow-2xl ${
          darkMode ? "bg-[#14161E] border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200/60 dark:border-zinc-800 shrink-0">
          <div>
            <h3 className="font-black text-base">{isEdit ? "Change this sale" : "New sale"}</h3>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400">It shows at the top of the shop for customers.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="p-2 rounded-full bg-slate-100 dark:bg-zinc-800 text-slate-500 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={submit} className="overflow-y-auto grow">
          <div className="grid md:grid-cols-[1fr_300px] gap-6 p-5">
            <div className="space-y-6 min-w-0">
              {/* 1. Photo */}
              <div className={section}>
                <p className={heading}>
                  <ImagePlus className="w-4 h-4 text-[#FF5B00]" /> 1. Photo
                </p>
                <div
                  className={`relative rounded-2xl border-2 border-dashed overflow-hidden aspect-[16/7] flex items-center justify-center ${
                    darkMode ? "border-zinc-700 bg-[#1A1D26]" : "border-slate-300 bg-slate-50"
                  }`}
                >
                  {form.img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={form.img} alt="Sale photo" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      disabled={uploading}
                      className="flex flex-col items-center gap-1.5 text-slate-500 dark:text-zinc-400 cursor-pointer"
                    >
                      <ImagePlus className="w-7 h-7" />
                      <span className="text-sm font-bold">Add a photo</span>
                      <span className="text-[11px]">Choose one from this device</span>
                    </button>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-xs font-bold gap-2">
                      <Loader2 className="w-4 h-4 animate-spin" /> Uploading…
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => pickPhoto(e.target.files?.[0])}
                />
                <div className="flex flex-wrap items-center gap-2">
                  {form.img && (
                    <>
                      <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className={chip(false)}>
                        Change photo
                      </button>
                      <button type="button" onClick={() => set({ img: "" })} className={`${chip(false)} inline-flex items-center gap-1`}>
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    </>
                  )}
                  <button type="button" onClick={() => setShowLink((v) => !v)} className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 underline cursor-pointer inline-flex items-center gap-1">
                    <Link2 className="w-3 h-3" /> Use a photo link instead
                  </button>
                </div>
                {showLink && (
                  <input
                    type="url"
                    value={form.img}
                    onChange={(e) => set({ img: e.target.value })}
                    placeholder="https://…"
                    className={`${field} font-mono text-xs`}
                    aria-label="Photo link"
                  />
                )}
                {uploadError && <p className="text-xs font-semibold text-rose-600">{uploadError}</p>}
                <p className={help}>A wide photo looks best. JPEG or PNG; big photos are made smaller for you.</p>
              </div>

              {/* 2. What is it */}
              <div className={section}>
                <p className={heading}>
                  <Tag className="w-4 h-4 text-[#FF5B00]" /> 2. What is the sale?
                </p>
                <div>
                  <label className={label} htmlFor="sale-title">Name of the sale *</label>
                  <input id="sale-title" type="text" value={form.title} maxLength={80} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Eid Dairy Week" className={field} />
                </div>
                <div>
                  <label className={label} htmlFor="sale-sub">A line about it</label>
                  <input id="sale-sub" type="text" value={form.subtitle} maxLength={160} onChange={(e) => set({ subtitle: e.target.value })} placeholder="e.g. Fresh milk, curd and paneer for the whole family." className={field} />
                </div>
                <div>
                  <label className={label} htmlFor="sale-tag">What customers get</label>
                  <input id="sale-tag" type="text" value={form.priceTag} maxLength={40} onChange={(e) => set({ priceTag: e.target.value })} placeholder="e.g. Up to 20% off" className={field} />
                  <p className={help}>Shown on the banner, like “Flat ₹50 off” or “Free delivery”.</p>
                </div>
                <div>
                  <span className={label}>Small label on the banner</span>
                  <div className="flex flex-wrap gap-1.5">
                    {BADGES.map((b) => (
                      <button key={b} type="button" onClick={() => set({ badge: b })} className={chip(form.badge === b)}>
                        {b}
                      </button>
                    ))}
                  </div>
                  <input type="text" value={form.badge} maxLength={24} onChange={(e) => set({ badge: e.target.value })} aria-label="Label" className={`${field} mt-2`} />
                </div>
              </div>

              {/* 3. What it applies to */}
              <div className={section}>
                <p className={heading}>
                  <Layers className="w-4 h-4 text-[#FF5B00]" /> 3. What does it apply to?
                </p>
                <div className="grid sm:grid-cols-2 gap-2">
                  {[
                    { id: "all", title: "Everything in the shop", text: "The banner opens the shop with the best deals first." },
                    { id: "category", title: "One category", text: "The banner opens that category, so customers see just those items." },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => set({ appliesTo: opt.id, category: opt.id === "all" ? SALE_ALL : form.category === SALE_ALL ? "" : form.category })}
                      className={`text-left rounded-xl border p-3 cursor-pointer transition-colors ${
                        form.appliesTo === opt.id
                          ? "border-[#FF5B00] ring-1 ring-[#FF5B00] bg-orange-50/60 dark:bg-orange-950/20"
                          : darkMode
                          ? "border-zinc-700"
                          : "border-slate-300"
                      }`}
                    >
                      <span className="block text-sm font-black">{opt.title}</span>
                      <span className="block text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">{opt.text}</span>
                    </button>
                  ))}
                </div>
                {form.appliesTo === "category" && (
                  <div>
                    <span className={label}>Which category?</span>
                    {cats.length === 0 ? (
                      <input type="text" value={form.category === SALE_ALL ? "" : form.category} onChange={(e) => set({ category: e.target.value })} placeholder="e.g. Dairy" className={field} aria-label="Category" />
                    ) : (
                      <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                        {cats.map((c) => (
                          <button key={c} type="button" onClick={() => set({ category: c })} className={chip(form.category === c)}>
                            {c}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 4. Discount code */}
              <div className={section}>
                <p className={heading}>
                  <Tag className="w-4 h-4 text-[#FF5B00]" /> 4. Discount code <span className="text-[11px] font-semibold text-slate-400">(optional)</span>
                </p>
                <select value={form.promoCode} onChange={(e) => set({ promoCode: e.target.value })} className={field} aria-label="Discount code">
                  <option value="">No code: the banner is just a showcase</option>
                  {coupons.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.code} — {c.title}
                    </option>
                  ))}
                </select>
                <p className={help}>
                  {code
                    ? `Customers see the code ${code.code} on the banner and use it at checkout. It works as set under Discount codes (${code.title}).`
                    : "Pick one of your checkout codes to show it on the banner. Make or change codes in Discount codes above."}
                </p>
              </div>

              {/* 5. When */}
              <div className={section}>
                <p className={heading}>
                  <Clock className="w-4 h-4 text-[#FF5B00]" /> 5. When does it run?
                </p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className={label} htmlFor="sale-start">Starts</label>
                    <input id="sale-start" type="datetime-local" value={toLocalInput(form.startsAt)} onChange={(e) => set({ startsAt: fromLocalInput(e.target.value) })} className={field} />
                    <div className="flex gap-1.5 mt-1.5">
                      <button type="button" onClick={() => set({ startsAt: 0 })} className={chip(!form.startsAt)}>Right away</button>
                    </div>
                  </div>
                  <div>
                    <label className={label} htmlFor="sale-end">Ends</label>
                    <input id="sale-end" type="datetime-local" value={toLocalInput(form.endsAt)} onChange={(e) => set({ endsAt: fromLocalInput(e.target.value) })} className={field} />
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <button type="button" onClick={() => set({ endsAt: 0 })} className={chip(!form.endsAt)}>No end</button>
                      {[["1 day", 1], ["3 days", 3], ["1 week", 7]].map(([text, days]) => (
                        <button key={text} type="button" onClick={() => set({ endsAt: (form.startsAt || Date.now()) + days * DAY })} className={chip(false)}>
                          {text}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <p className={help}>The banner appears when the sale starts and goes away by itself when it ends.</p>
              </div>

              {/* 6. Visibility */}
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-zinc-800 p-3">
                <div>
                  <p className="text-sm font-black">Show it to customers</p>
                  <p className={help}>Switch off to keep the sale saved but hidden.</p>
                </div>
                <Switch on={form.active} label="Show the sale to customers" onChange={() => set({ active: !form.active })} />
              </div>
            </div>

            {/* Preview */}
            <div className="md:sticky md:top-0 self-start space-y-2">
              <p className={heading}>
                <Eye className="w-4 h-4 text-[#FF5B00]" /> How customers see it
              </p>
              <div className="relative rounded-2xl overflow-hidden bg-[#061838] text-white p-4 min-h-[190px] flex flex-col justify-between">
                {form.img && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.img} alt="" className="absolute inset-0 w-full h-full object-cover opacity-45" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="relative space-y-1">
                  <span className="inline-block text-[10px] font-black tracking-wider text-amber-400 bg-black/50 px-2 py-0.5 rounded-md">
                    {(form.badge || "SALE").toUpperCase()}
                  </span>
                  <h4 className="font-black text-lg leading-tight">{form.title || "Name of the sale"}</h4>
                  <p className="text-xs text-slate-200 line-clamp-2">{form.subtitle || "A line about the sale"}</p>
                </div>
                <div className="relative flex items-center justify-between gap-2 pt-3 mt-3 border-t border-white/15">
                  <span className="text-sm font-black text-amber-300">{form.priceTag || "What customers get"}</span>
                  {form.promoCode && <span className="text-[11px] font-mono font-bold bg-white/20 px-2 py-0.5 rounded">{form.promoCode}</span>}
                </div>
              </div>
              <ul className="text-[11px] text-slate-500 dark:text-zinc-400 space-y-1">
                <li>{form.appliesTo === "category" && form.category ? `Opens ${form.category}.` : "Opens the whole shop."}</li>
                <li>{endsLine}.</li>
                <li>{form.active ? "On: customers see it." : "Off: hidden."}</li>
              </ul>
            </div>
          </div>

          <div className="sticky bottom-0 px-5 py-3 border-t border-slate-200/60 dark:border-zinc-800 bg-inherit flex items-center justify-between gap-3">
            <div className="text-xs font-semibold text-rose-600 min-w-0">{triedSave && problems.length > 0 ? problems[0] : ""}</div>
            <div className="flex items-center gap-2 shrink-0">
              <button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 cursor-pointer">
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || uploading}
                className="inline-flex items-center gap-1.5 bg-[#FF5B00] hover:bg-[#E04E00] text-white font-black text-xs px-5 py-2.5 rounded-xl shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                {isEdit ? "Save changes" : "Publish sale"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
