import React, { useMemo, useState } from "react";
import { Truck, Plus, Search, Phone, MapPin, Edit2, Trash2, User, Boxes } from "lucide-react";
import AdminSheet from "./AdminSheet";

const EMPTY_FORM = { name: "", phone: "", address: "", notes: "" };

/**
 * The people the owner buys stock from. "Myself" is always first and covers
 * everything the owner stocks without a distributor.
 */
export default function DistributorsView({
  distributors = [],
  catalogue = [],
  onUpsertDistributor,
  onDeleteDistributor,
  onViewDistributorStock,
  darkMode = false,
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isSaving, setIsSaving] = useState(false);
  const [toRemove, setToRemove] = useState(null);
  const [isRemoving, setIsRemoving] = useState(false);

  // Items and units per distributor.
  const stats = useMemo(() => {
    const map = {};
    catalogue.forEach((p) => {
      const key = p.distributor || "Myself";
      const entry = map[key] || (map[key] = { items: 0, units: 0 });
      entry.items += 1;
      entry.units += Number(p.stock) || 0;
    });
    return map;
  }, [catalogue]);

  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return distributors;
    return distributors.filter((d) =>
      [d.name, d.phone, d.address, d.notes].some((v) => String(v || "").toLowerCase().includes(q))
    );
  }, [distributors, searchQuery]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setIsFormOpen(true);
  };

  const openEdit = (d) => {
    setEditing(d);
    setForm({ name: d.name || "", phone: d.phone || "", address: d.address || "", notes: d.notes || "" });
    setIsFormOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || isSaving) return;
    setIsSaving(true);
    try {
      await onUpsertDistributor({
        ...(editing || {}),
        ...form,
        name: form.name.trim(),
        phone: form.phone.trim(),
        id: editing ? editing.id : undefined,
      });
      setIsFormOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!toRemove || isRemoving) return;
    setIsRemoving(true);
    try {
      await onDeleteDistributor(toRemove.id);
      setToRemove(null);
    } finally {
      setIsRemoving(false);
    }
  };

  const card = darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs";
  const subtle = darkMode ? "text-zinc-400" : "text-slate-500";
  const inputCls = `w-full px-3.5 py-3 rounded-xl text-sm border outline-none focus:border-emerald-500 transition-colors ${
    darkMode
      ? "bg-[#0D0E12] border-zinc-800 text-zinc-100 placeholder:text-zinc-600"
      : "bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400"
  }`;
  const ghostBtn = `min-h-[40px] px-3 rounded-xl text-xs font-bold border transition-colors cursor-pointer ${
    darkMode ? "border-zinc-800 text-zinc-300 hover:bg-zinc-900" : "border-slate-200 text-slate-600 hover:bg-slate-50"
  }`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`rounded-2xl p-5 border flex items-start justify-between flex-wrap gap-4 ${card}`}>
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center space-x-2">
            <Truck className="w-5 h-5 text-emerald-500" />
            <h2 className="font-black text-base text-slate-900 dark:text-white">Distributors</h2>
          </div>
          <p className={`text-xs ${subtle}`}>
            The people you buy stock from. Items with no distributor are marked as Myself.
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center space-x-1.5 text-xs font-black px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white transition-colors active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add distributor</span>
        </button>
      </div>

      {distributors.length > 6 && (
        <div className="relative">
          <Search className={`w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 ${subtle}`} />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or phone"
            className={`${inputCls} pl-10`}
          />
        </div>
      )}

      {/* List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
        {filtered.map((d) => {
          const s = stats[d.name] || { items: 0, units: 0 };
          return (
            <div key={d.id || d.name} className={`rounded-2xl p-4 border flex flex-col gap-3 ${card}`}>
              <div className="flex items-start gap-3">
                <span
                  className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${
                    d.isSelf
                      ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                      : darkMode
                      ? "bg-zinc-800 text-zinc-300"
                      : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {d.isSelf ? <User className="w-5 h-5" /> : <Truck className="w-5 h-5" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-black text-slate-900 dark:text-white truncate">{d.name}</p>
                  {d.isSelf ? (
                    <p className={`text-xs ${subtle}`}>My own stock</p>
                  ) : (
                    <>
                      {d.phone && (
                        <a href={`tel:${d.phone}`} className={`text-xs flex items-center gap-1 hover:underline ${subtle}`}>
                          <Phone className="w-3 h-3" />
                          {d.phone}
                        </a>
                      )}
                      {d.address && (
                        <p className={`text-xs flex items-center gap-1 truncate ${subtle}`}>
                          <MapPin className="w-3 h-3 shrink-0" />
                          <span className="truncate">{d.address}</span>
                        </p>
                      )}
                    </>
                  )}
                </div>
              </div>

              {d.notes && !d.isSelf && <p className={`text-xs leading-relaxed ${subtle}`}>{d.notes}</p>}

              <div className="flex items-center gap-2 mt-auto">
                <button type="button" onClick={() => onViewDistributorStock?.(d.name)} className={`${ghostBtn} flex-1 min-w-0 flex items-center justify-center gap-1.5 whitespace-nowrap`}>
                  <Boxes className="w-3.5 h-3.5" />
                  <span>
                    {s.items} {s.items === 1 ? "item" : "items"} · {s.units} units
                  </span>
                </button>
                {!d.isSelf && (
                  <>
                    <button type="button" onClick={() => openEdit(d)} className={ghostBtn} aria-label={`Edit ${d.name}`}>
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setToRemove(d)}
                      className={`${ghostBtn} hover:!text-rose-600`}
                      aria-label={`Remove ${d.name}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {distributors.length <= 1 && (
        <p className={`text-xs text-center ${subtle}`}>
          Add the people you buy from, so you can see whose stock is whose.
        </p>
      )}

      {/* Add / edit */}
      <AdminSheet open={isFormOpen} onClose={() => !isSaving && setIsFormOpen(false)} labelledBy="distributor-form-title" darkMode={darkMode}>
        <form onSubmit={handleSave} className="flex flex-col min-h-0">
          <div className="px-5 pt-2 pb-3">
            <h3 id="distributor-form-title" className="text-lg font-black text-slate-900 dark:text-white">
              {editing ? "Edit distributor" : "Add distributor"}
            </h3>
          </div>
          <div className="px-5 space-y-2.5 overflow-y-auto">
            <input
              autoFocus
              required
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Name"
              aria-label="Name"
              className={inputCls}
            />
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Phone (optional)"
              aria-label="Phone"
              className={inputCls}
            />
            <input
              type="text"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="Address (optional)"
              aria-label="Address"
              className={inputCls}
            />
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              placeholder="Notes (optional)"
              aria-label="Notes"
              className={inputCls}
            />
          </div>
          <div className="px-5 pt-4 pb-[max(20px,calc(12px+env(safe-area-inset-bottom,0px)))] grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              disabled={isSaving}
              className={`min-h-[48px] rounded-2xl text-sm font-bold border transition-colors cursor-pointer ${
                darkMode ? "border-zinc-700 text-zinc-200 hover:bg-zinc-800" : "border-slate-200 text-slate-700 hover:bg-slate-50"
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !form.name.trim()}
              className="min-h-[48px] rounded-2xl text-sm font-black bg-emerald-500 hover:bg-emerald-600 text-white transition-colors disabled:opacity-40 cursor-pointer"
            >
              {isSaving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </AdminSheet>

      {/* Remove */}
      <AdminSheet open={!!toRemove} onClose={() => !isRemoving && setToRemove(null)} labelledBy="distributor-remove-title" darkMode={darkMode}>
        <div className="px-5 pt-2">
          <h3 id="distributor-remove-title" className="text-lg font-black text-slate-900 dark:text-white">
            Remove {toRemove?.name}?
          </h3>
          <p className={`text-sm mt-1.5 ${subtle}`}>Their items stay in your stock. Only the name is removed from this list.</p>
        </div>
        <div className="px-5 pt-5 pb-[max(20px,calc(12px+env(safe-area-inset-bottom,0px)))] grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={() => setToRemove(null)}
            disabled={isRemoving}
            className={`min-h-[48px] rounded-2xl text-sm font-bold border transition-colors cursor-pointer ${
              darkMode ? "border-zinc-700 text-zinc-200 hover:bg-zinc-800" : "border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
          >
            Keep
          </button>
          <button
            type="button"
            onClick={handleRemove}
            disabled={isRemoving}
            className="min-h-[48px] rounded-2xl text-sm font-black bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-60 cursor-pointer"
          >
            {isRemoving ? "Removing…" : "Remove"}
          </button>
        </div>
      </AdminSheet>
    </div>
  );
}
