import React, { useEffect, useMemo, useState } from "react";
import { Search, Plus, Minus, Pencil, Trash2, Boxes, PackageSearch, Eye, EyeOff, ImageOff } from "lucide-react";
import { Card, SectionTitle, Pill, Button, Field, Spinner, EmptyState, Drawer, inputCls, cx } from "./ui";
import { stockState, summarise, formatINR, discountPercent, cleanProduct, DEFAULT_LOW_AT, LIMITS } from "../../lib/partnerStock";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "attention", label: "Needs attention" },
  { id: "out", label: "Out of stock" },
  { id: "hidden", label: "Hidden" },
];

const SORTS = [
  { id: "name", label: "A to Z" },
  { id: "stock", label: "Lowest stock first" },
  { id: "recent", label: "Recently changed" },
  { id: "price", label: "Price, high to low" },
];

const EMPTY = { name: "", category: "", unit: "", price: "", mrp: "", stock: "", lowStockAt: "", barcode: "", img: "", description: "", active: true };

const millis = (t) => (typeof t?.toMillis === "function" ? t.toMillis() : Number(t) || 0);

/** − 12 +, saving as he goes. Typing a number saves when he leaves the box or presses Enter. */
function StockStepper({ product, onSet }) {
  const [val, setVal] = useState(String(product.stock ?? 0));
  useEffect(() => setVal(String(product.stock ?? 0)), [product.stock]);
  const commit = (raw) => {
    const n = Math.max(0, Number(raw));
    if (!Number.isFinite(n)) return setVal(String(product.stock ?? 0));
    if (n !== Number(product.stock)) onSet(product, n);
  };
  const step = (d) => {
    const n = Math.max(0, Number(val || 0) + d);
    setVal(String(n));
    commit(n);
  };
  return (
    <div className="inline-flex items-center rounded-xl ring-1 ring-slate-300/80 bg-white overflow-hidden">
      <button onClick={() => step(-1)} aria-label={`One less ${product.name}`} className="w-9 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"><Minus className="w-4 h-4" /></button>
      <input
        value={val}
        onChange={(e) => setVal(e.target.value.replace(/[^\d.]/g, ""))}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
        inputMode="decimal"
        aria-label={`Stock of ${product.name}`}
        className="w-14 h-10 text-center text-[15px] font-extrabold text-[#061838] tabular-nums focus:outline-none focus:bg-orange-50"
      />
      <button onClick={() => step(1)} aria-label={`One more ${product.name}`} className="w-9 h-10 flex items-center justify-center text-slate-600 hover:bg-slate-100 cursor-pointer"><Plus className="w-4 h-4" /></button>
    </div>
  );
}

function StatePill({ p }) {
  const st = stockState(p);
  if (st === "out") return <Pill tone="out">Out of stock</Pill>;
  if (st === "low") return <Pill tone="low">Running low</Pill>;
  if (st === "hidden") return <Pill tone="hidden">Hidden</Pill>;
  return <Pill tone="ok">In stock</Pill>;
}

function ProductForm({ open, product, categories, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) return;
    setErrors({});
    setSaveError("");
    setConfirmDelete(false);
    setForm(
      product
        ? {
            name: product.name || "", category: product.category || "", unit: product.unit || "",
            price: product.price ?? "", mrp: product.mrp ?? "", stock: product.stock ?? "",
            lowStockAt: product.lowStockAt ?? "", barcode: product.barcode || "", img: product.img || "",
            description: product.description || "", active: product.active !== false,
          }
        : EMPTY
    );
  }, [open, product]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const off = discountPercent({ price: Number(form.price), mrp: Number(form.mrp) });

  const submit = async () => {
    const r = cleanProduct(form);
    setErrors(r.errors);
    if (!r.ok) return;
    setBusy(true);
    setSaveError("");
    try {
      await onSave(product?.id || null, r.data);
      onClose();
    } catch (e) {
      setSaveError("That could not be saved. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await onDelete(product);
      onClose();
    } catch (e) {
      setSaveError("That could not be removed. Try again.");
      setBusy(false);
    }
  };

  return (
    <Drawer
      open={open}
      title={product ? "Edit item" : "Add an item"}
      onClose={onClose}
      footer={
        <div className="flex items-center gap-3">
          {product && (
            confirmDelete ? (
              <Button variant="danger" onClick={remove} busy={busy}>Yes, remove it</Button>
            ) : (
              <Button variant="danger" onClick={() => setConfirmDelete(true)} aria-label="Remove this item"><Trash2 className="w-4 h-4" /></Button>
            )
          )}
          <div className="flex-1" />
          <Button variant="ghost" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={submit} busy={busy}>{product ? "Save changes" : "Add item"}</Button>
        </div>
      }
    >
      <div className="space-y-5">
        {saveError && <div role="alert" className="rounded-xl bg-rose-50 ring-1 ring-rose-200 px-4 py-3 text-sm font-semibold text-rose-700">{saveError}</div>}
        {confirmDelete && <div className="rounded-xl bg-amber-50 ring-1 ring-amber-200 px-4 py-3 text-sm font-semibold text-amber-800">Remove "{product?.name}" from your shop? This can't be undone.</div>}

        <Field label="Item name" error={errors.name}>
          <input value={form.name} onChange={set("name")} maxLength={LIMITS.name} placeholder="e.g. Aashirvaad Atta 5 kg" className={inputCls} autoFocus={!product} />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Selling price (₹)" error={errors.price}>
            <input value={form.price} onChange={set("price")} inputMode="decimal" placeholder="250" className={inputCls} />
          </Field>
          <Field label="MRP (₹)" hint={off ? `Shows ${off}% off` : "Optional"} error={errors.mrp}>
            <input value={form.mrp} onChange={set("mrp")} inputMode="decimal" placeholder="280" className={inputCls} />
          </Field>
          <Field label="In stock" error={errors.stock}>
            <input value={form.stock} onChange={set("stock")} inputMode="decimal" placeholder="40" className={inputCls} />
          </Field>
          <Field label="Warn me at" hint={`Default ${DEFAULT_LOW_AT}`} error={errors.lowStockAt}>
            <input value={form.lowStockAt} onChange={set("lowStockAt")} inputMode="decimal" placeholder={String(DEFAULT_LOW_AT)} className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Category">
            <input value={form.category} onChange={set("category")} list="partner-categories" maxLength={LIMITS.category} placeholder="Staples" className={inputCls} />
            <datalist id="partner-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
          </Field>
          <Field label="Unit">
            <input value={form.unit} onChange={set("unit")} maxLength={LIMITS.unit} placeholder="5 kg" className={inputCls} />
          </Field>
        </div>

        <Field label="Barcode" hint="Optional">
          <input value={form.barcode} onChange={set("barcode")} maxLength={LIMITS.barcode} inputMode="numeric" className={inputCls} />
        </Field>

        <Field label="Photo link" hint="Paste a link that starts with https://" error={errors.img}>
          <input value={form.img} onChange={set("img")} placeholder="https://..." className={inputCls} />
        </Field>
        {form.img && /^https:\/\//i.test(form.img) && (
          <div className="w-24 h-24 rounded-xl bg-slate-100 overflow-hidden ring-1 ring-slate-200">
            <img src={form.img} alt="" className="w-full h-full object-cover" onError={(e) => (e.currentTarget.style.display = "none")} />
          </div>
        )}

        <Field label="Description" hint="Optional, shown to customers">
          <textarea value={form.description} onChange={set("description")} maxLength={LIMITS.description} rows={3} className={`${inputCls} h-auto py-2.5 resize-none`} />
        </Field>

        <button
          type="button"
          onClick={() => setForm((f) => ({ ...f, active: !f.active }))}
          className="w-full flex items-center justify-between rounded-xl ring-1 ring-slate-300/80 px-4 py-3 text-left cursor-pointer hover:bg-slate-50"
          aria-pressed={form.active}
        >
          <span>
            <span className="block text-sm font-bold text-slate-800">Show to customers</span>
            <span className="block text-xs text-slate-500">Turn off to hide it without removing it.</span>
          </span>
          <span className={cx("w-11 h-6 rounded-full p-0.5 transition", form.active ? "bg-emerald-500" : "bg-slate-300")}>
            <span className={cx("block w-5 h-5 rounded-full bg-white shadow transition", form.active ? "translate-x-5" : "")} />
          </span>
        </button>
      </div>
    </Drawer>
  );
}

/** His stock: find it, count it, change it. */
export default function StockSection({ products, loading, error, initial, onSave, onSetStock, onDelete }) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState(initial?.filter || "all");
  const [sort, setSort] = useState("name");
  const [editing, setEditing] = useState(null);
  const [formOpen, setFormOpen] = useState(!!initial?.add);

  useEffect(() => {
    if (initial?.add) { setEditing(null); setFormOpen(true); }
    if (initial?.filter) setFilter(initial.filter);
  }, [initial]);

  const s = useMemo(() => summarise(products), [products]);
  const categories = useMemo(() => [...new Set((products || []).map((p) => p.category).filter(Boolean))].sort(), [products]);
  const counts = { all: s.items, attention: s.low + s.out, out: s.out, hidden: s.hidden };

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    let out = (products || []).filter((p) => {
      if (needle && ![p.name, p.category, p.barcode, p.unit].some((v) => String(v || "").toLowerCase().includes(needle))) return false;
      const st = stockState(p);
      if (filter === "attention") return st === "low" || st === "out";
      if (filter === "out") return st === "out";
      if (filter === "hidden") return st === "hidden";
      return true;
    });
    const by = {
      name: (a, b) => String(a.name).localeCompare(String(b.name)),
      stock: (a, b) => Number(a.stock || 0) - Number(b.stock || 0),
      recent: (a, b) => millis(b.updatedAt) - millis(a.updatedAt),
      price: (a, b) => Number(b.price || 0) - Number(a.price || 0),
    };
    return out.sort(by[sort] || by.name);
  }, [products, q, filter, sort]);

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const openEdit = (p) => { setEditing(p); setFormOpen(true); };

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Stock"
        hint="Everything you sell. Change a count right in the list; edit an item to change anything else."
        right={<Button onClick={openAdd}><Plus className="w-4 h-4" />Add an item</Button>}
      />

      {error && <div role="alert" className="rounded-xl bg-rose-50 ring-1 ring-rose-200 px-4 py-3 text-sm font-semibold text-rose-700">We couldn't load your stock. Check your connection and refresh.</div>}

      <Card className="p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-[18px] h-[18px] text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name, category or barcode" className={`${inputCls} pl-11`} />
          </div>
          <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort" className={`${inputCls} sm:w-56 cursor-pointer`}>
            {SORTS.map((o) => <option key={o.id} value={o.id}>{o.label}</option>)}
          </select>
        </div>
        <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-0.5" role="tablist" aria-label="Filter">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cx(
                "h-9 px-3.5 rounded-full text-[13px] font-bold whitespace-nowrap transition cursor-pointer",
                filter === f.id ? "bg-[#061838] text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200/70"
              )}
            >
              {f.label}
              <span className={cx("ml-1.5 tabular-nums", filter === f.id ? "text-white/70" : "text-slate-400")}>{counts[f.id]}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card className="overflow-hidden">
        {loading ? (
          <Spinner label="Loading your stock" />
        ) : (products || []).length === 0 ? (
          <EmptyState icon={Boxes} title="Add your first item" text="Start with a few things you sell. You can change prices and counts any time." action={<Button onClick={openAdd}><Plus className="w-4 h-4" />Add an item</Button>} />
        ) : list.length === 0 ? (
          <EmptyState icon={PackageSearch} title="Nothing matches" text="Try a different search or filter." action={<Button variant="ghost" onClick={() => { setQ(""); setFilter("all"); }}>Clear filters</Button>} />
        ) : (
          <>
            <div className="hidden md:grid grid-cols-[minmax(0,1fr)_120px_150px_130px_88px] gap-4 px-5 h-11 items-center bg-slate-50 border-b border-slate-100 text-[12px] font-extrabold uppercase tracking-wider text-slate-500">
              <span>Item</span><span>Price</span><span>In stock</span><span>Status</span><span className="text-right">Edit</span>
            </div>
            <ul className="divide-y divide-slate-100">
              {list.map((p) => {
                const off = discountPercent(p);
                return (
                  <li key={p.id} className="px-4 sm:px-5 py-3.5 md:grid md:grid-cols-[minmax(0,1fr)_120px_150px_130px_88px] md:gap-4 md:items-center flex flex-col gap-3">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 flex items-center justify-center text-slate-400 ring-1 ring-slate-200/70">
                        {p.img ? <img src={p.img} alt="" className="w-full h-full object-cover" /> : <ImageOff className="w-5 h-5" />}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[15px] font-bold text-slate-900 truncate">{p.name}</div>
                        <div className="text-xs text-slate-500 truncate">{[p.category, p.unit].filter(Boolean).join(" · ") || "No category"}</div>
                      </div>
                    </div>
                    <div className="flex md:block items-center justify-between md:justify-start">
                      <span className="md:hidden text-xs font-bold text-slate-500">Price</span>
                      <div>
                        <div className="text-[15px] font-extrabold text-[#061838] tabular-nums">{formatINR(p.price)}</div>
                        {off > 0 && <div className="text-xs text-slate-500"><s>{formatINR(p.mrp)}</s> <span className="font-bold text-emerald-600">{off}% off</span></div>}
                      </div>
                    </div>
                    <div className="flex md:block items-center justify-between md:justify-start">
                      <span className="md:hidden text-xs font-bold text-slate-500">In stock</span>
                      <StockStepper product={p} onSet={onSetStock} />
                    </div>
                    <div className="flex md:block items-center justify-between md:justify-start">
                      <span className="md:hidden text-xs font-bold text-slate-500">Status</span>
                      <StatePill p={p} />
                    </div>
                    <div className="md:text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(p)} className="w-full md:w-auto"><Pencil className="w-3.5 h-3.5" />Edit</Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>

      <ProductForm
        open={formOpen}
        product={editing}
        categories={categories}
        onClose={() => setFormOpen(false)}
        onSave={onSave}
        onDelete={onDelete}
      />
    </div>
  );
}
