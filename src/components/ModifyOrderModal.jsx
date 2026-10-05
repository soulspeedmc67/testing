import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Plus, Minus, ShoppingBag, Search, ArrowRight } from "lucide-react";
import { hapticLight, hapticMedium, hapticSuccess } from "../lib/haptics";
import { SPRING_SNAPPY } from "../lib/motion";
import { useBodyScrollLock } from "../lib/useBodyScrollLock";
import { isSoldOut } from "../lib/catalogueFile";
import { OrderChangeError, mergeAdditions, billForChangedOrder } from "../lib/orderChange";
import { productImageUrl } from "./ProductImage";

const idOf = (item) => String(item?.id ?? item?.barcode ?? "");
const qtyOf = (item) => Number(item?.qty ?? item?.quantity) || 0;
const rupees = (n) => `₹${Number.isInteger(n) ? n : n.toFixed(2)}`;
const clock = (seconds) => `0:${String(seconds).padStart(2, "0")}`;

/**
 * Add items to an order during its 30-second window, as the apps'
 * AddItemsSheet does. Items already in the order stay; this sheet only adds.
 *
 * `onSaveOrder(additions, newTotal)` must resolve only once the store has the
 * change, and reject with an OrderChangeError otherwise: the sheet closes on
 * the first and shows the error's sentence on the second.
 */
export default function ModifyOrderModal({
  isOpen,
  onClose,
  order,
  productsList = [],
  coupon = null,
  onSaveOrder,
  remainingSeconds = 0,
}) {
  const [additions, setAdditions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState("All");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useBodyScrollLock(isOpen);

  // What was picked for one order is not carried to the order that replaces it.
  const orderId = order?.orderId || order?.id || "";
  useEffect(() => {
    setAdditions([]);
    setError("");
  }, [orderId]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  const orderItems = useMemo(() => (Array.isArray(order?.items) ? order.items : []), [order?.items]);
  const items = useMemo(() => mergeAdditions(orderItems, additions), [orderItems, additions]);
  // The same sum the save makes, so the total on the button is the total placed.
  const bill = useMemo(() => billForChangedOrder(order, items, coupon), [order, items, coupon]);
  const totalBefore = Number(order?.total ?? order?.totalAmount ?? order?.finalTotal) || 0;
  const addedCount = additions.reduce((sum, item) => sum + qtyOf(item), 0);

  const productsById = useMemo(() => {
    const map = new Map();
    (productsList || []).forEach((p) => map.set(idOf(p), p));
    return map;
  }, [productsList]);

  const catalogue = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (productsList || [])
      .filter((p) => {
        if (isSoldOut(p)) return false;
        if (q && ![p.name, p.brand, p.cat].some((text) => String(text || "").toLowerCase().includes(q))) return false;
        return selectedCat === "All" || String(p.cat || "").toLowerCase() === selectedCat.toLowerCase();
      })
      .slice(0, 16);
  }, [productsList, searchQuery, selectedCat]);

  const categories = useMemo(() => {
    const set = new Set(["All"]);
    (productsList || []).forEach((p) => {
      if (p.cat) set.add(p.cat);
    });
    return Array.from(set).slice(0, 7);
  }, [productsList]);

  if (!isOpen) return null;

  const status = String(order?.status || "placed").toLowerCase();
  const windowOpen = remainingSeconds > 0;
  const closedMessage = windowOpen
    ? ""
    : new OrderChangeError(
        status.includes("cancel") ? "cancelled" : status === "placed" ? "windowClosed" : "storeStartedPacking"
      ).message;

  const addedQty = (id) => qtyOf(additions.find((item) => idOf(item) === id));
  // The shop can't send more of an item than it has.
  const canAddMore = (id) => {
    const stock = productsById.get(id)?.stock;
    if (stock === undefined || stock === null || stock === "" || !Number.isFinite(Number(stock))) return true;
    return qtyOf(items.find((item) => idOf(item) === id)) < Number(stock);
  };

  const addOne = (product) => {
    const id = idOf(product);
    if (!id || !windowOpen || isSaving || !canAddMore(id)) return;
    hapticMedium();
    setError("");
    setAdditions((prev) => {
      if (prev.some((item) => idOf(item) === id)) {
        return prev.map((item) => (idOf(item) === id ? { ...item, qty: item.qty + 1 } : item));
      }
      const { quantity, ...fields } = product;
      return [...prev, { ...fields, qty: 1 }];
    });
  };

  const removeOne = (id) => {
    if (isSaving) return;
    hapticLight();
    setAdditions((prev) =>
      prev.map((item) => (idOf(item) === id ? { ...item, qty: item.qty - 1 } : item)).filter((item) => item.qty > 0)
    );
  };

  const handleSave = async () => {
    if (isSaving || addedCount === 0 || !windowOpen) return;
    setIsSaving(true);
    setError("");
    try {
      await onSaveOrder(additions, bill.total);
      hapticSuccess();
      onClose?.();
    } catch (e) {
      setError(
        e instanceof OrderChangeError
          ? e.message
          : "We couldn't add these items, so your order is as it was. Please try again."
      );
    } finally {
      setIsSaving(false);
    }
  };

  const stepper = (item, { small = false } = {}) => {
    const id = idOf(item);
    const size = small ? "w-6 h-6" : "w-7 h-7";
    return (
      <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-white/10 rounded-xl p-1 shrink-0">
        <button
          type="button"
          onClick={() => removeOne(id)}
          disabled={isSaving}
          aria-label={`Take one ${item.name} back out`}
          className={`${size} rounded-lg bg-white dark:bg-white/15 flex items-center justify-center text-slate-700 dark:text-neutral-200 active:scale-90 transition-transform cursor-pointer`}
        >
          <Minus className="w-3 h-3 stroke-[2.5]" />
        </button>
        <span className="font-mono font-black text-xs px-0.5 text-slate-900 dark:text-white min-w-[18px] text-center">
          {addedQty(id)}
        </span>
        <button
          type="button"
          onClick={() => addOne(item)}
          disabled={isSaving || !windowOpen || !canAddMore(id)}
          aria-label={`Add one more ${item.name}`}
          className={`${size} rounded-lg bg-[#FF5B00] text-white flex items-center justify-center active:scale-90 transition-transform cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <Plus className="w-3 h-3 stroke-[2.5]" />
        </button>
      </div>
    );
  };

  const billRow = (label, value, valueClass = "text-slate-900 dark:text-white") => (
    <div className="flex items-center justify-between">
      <dt>{label}</dt>
      <dd className={`font-mono font-bold ${valueClass}`}>{value}</dd>
    </div>
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center p-0 sm:p-4 pointer-events-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-[#061838]/60 backdrop-blur-md"
        />

        {/* Sheet */}
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-items-title"
          initial={{ y: "100%", opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={SPRING_SNAPPY}
          className="relative w-full max-w-lg bg-white rounded-t-[32px] sm:rounded-[32px] max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 z-10 overflow-hidden dark:bg-[#16171B] dark:border-white/10"
          style={{
            paddingBottom: "max(1rem, env(safe-area-inset-bottom, 16px))",
          }}
        >
          {/* Top Notch for Mobile */}
          <div className="sm:hidden w-full flex justify-center pt-3 pb-1 shrink-0">
            <div className="w-12 h-1.5 bg-slate-200 dark:bg-neutral-700 rounded-full" />
          </div>

          {/* Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between gap-3 shrink-0">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#FF5B00] dark:bg-orange-950/40 flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div className="min-w-0">
                <h2 id="add-items-title" className="text-base font-black text-slate-900 dark:text-white leading-tight">
                  Add items
                </h2>
                <p className="text-xs text-slate-500 dark:text-neutral-400 font-medium mt-0.5">
                  They come in the same delivery.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <span
                role="timer"
                className={`text-[11px] font-bold tabular-nums px-2.5 py-1 rounded-full border ${
                  windowOpen
                    ? "text-amber-700 bg-amber-50 border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900/40"
                    : "text-slate-500 bg-slate-100 border-slate-200 dark:bg-white/10 dark:text-neutral-400 dark:border-white/10"
                }`}
              >
                {windowOpen ? `${clock(remainingSeconds)} left` : "Time's up"}
              </span>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
              >
                <X className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto overscroll-contain px-4 sm:px-5 py-4 space-y-5 grow">
            {/* The shop's items: first, because the clock is short */}
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for an item"
                  aria-label="Search for an item to add"
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-8 py-2.5 text-[13px] font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#FF5B00]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label="Clear search"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {categories.length > 1 && (
                <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSelectedCat(cat)}
                      aria-pressed={selectedCat === cat}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold shrink-0 transition-colors cursor-pointer ${
                        selectedCat === cat
                          ? "bg-[#061838] text-white dark:bg-[#FF5B00]"
                          : "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-neutral-300 hover:bg-slate-200"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              )}

              {catalogue.length === 0 ? (
                <p className="py-6 text-center text-xs font-medium text-slate-500 dark:text-neutral-400">
                  {(productsList || []).length === 0
                    ? "Loading the shop's items…"
                    : "No items match. Try another word."}
                </p>
              ) : (
                <div className="grid grid-cols-1 min-[420px]:grid-cols-2 gap-2.5">
                  {catalogue.map((prod) => {
                    const pId = idOf(prod);
                    const atLimit = !canAddMore(pId);
                    return (
                      <div
                        key={pId}
                        className="bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl p-2.5 flex items-center justify-between space-x-2"
                      >
                        <div className="flex items-center space-x-2 min-w-0">
                          <img
                            src={productImageUrl(prod.img || prod.image || "/dashit-logo-centered.png")}
                            alt=""
                            loading="lazy"
                            decoding="async"
                            className="w-9 h-9 object-contain bg-white rounded-lg p-0.5 shrink-0 border border-slate-100 dark:bg-white/10 dark:border-white/5"
                          />
                          <div className="min-w-0">
                            <h4 className="text-[11px] font-extrabold text-slate-900 dark:text-white truncate">
                              {prod.name}
                            </h4>
                            <span className="font-mono font-bold text-[11px] text-[#061838] dark:text-neutral-200 block">
                              {rupees(Number(prod.price) || 0)}
                              {atLimit && (
                                <span className="font-sans font-medium text-slate-400 dark:text-neutral-500"> · no more left</span>
                              )}
                            </span>
                          </div>
                        </div>

                        {addedQty(pId) > 0 ? (
                          stepper(prod, { small: true })
                        ) : (
                          <button
                            type="button"
                            onClick={() => addOne(prod)}
                            disabled={isSaving || !windowOpen || atLimit}
                            aria-label={`Add ${prod.name}`}
                            className="px-3 py-1.5 rounded-lg text-[11px] font-black shrink-0 bg-[#FF5B00] text-white hover:bg-[#E04E00] transition-transform active:scale-90 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Add
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* The whole order as it will be */}
            <div>
              <h3 className="text-xs font-bold text-slate-900 dark:text-white mb-2.5">
                Your order ({items.reduce((sum, item) => sum + (qtyOf(item) || 1), 0)} items)
              </h3>
              <div className="divide-y divide-slate-100 dark:divide-white/10 border border-slate-100 dark:border-white/10 rounded-2xl bg-white dark:bg-white/[0.02] overflow-hidden">
                {items.map((item) => {
                  const itemId = idOf(item);
                  const added = addedQty(itemId);
                  return (
                    <div key={itemId} className="p-3 flex items-center justify-between space-x-3">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <img
                          src={productImageUrl(item.img || item.image || "/dashit-logo-centered.png")}
                          alt=""
                          loading="lazy"
                          decoding="async"
                          className="w-11 h-11 object-contain bg-slate-50 rounded-xl p-1 shrink-0 border border-slate-100 dark:bg-white/5 dark:border-white/10"
                        />
                        <div className="min-w-0">
                          <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{item.name}</h4>
                          <div className="flex items-center space-x-1.5 mt-0.5 text-[11px] text-slate-500 dark:text-neutral-400">
                            <span className="font-mono font-bold text-slate-900 dark:text-white">
                              {rupees(Number(item.price) || 0)}
                            </span>
                            <span>× {qtyOf(item) || 1}</span>
                            {added > 0 && (
                              <span className="font-bold text-[#FF5B00]">
                                {added === (qtyOf(item) || 1) ? "new" : `${added} new`}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {added > 0 ? (
                        stepper(item)
                      ) : (
                        <button
                          type="button"
                          onClick={() => addOne(item)}
                          disabled={isSaving || !windowOpen || !canAddMore(itemId)}
                          aria-label={`Add one more ${item.name}`}
                          className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-neutral-200 flex items-center justify-center shrink-0 active:scale-90 transition-transform cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sticky Footer */}
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.02] shrink-0 space-y-3">
            {/* The bill: same lines as checkout and the order receipt */}
            <dl className="space-y-1 text-xs text-slate-500 dark:text-neutral-400 font-medium">
              {billRow("Item total", rupees(bill.subtotal))}
              {billRow("Delivery charge", bill.baseDeliveryFee > 0 ? rupees(bill.baseDeliveryFee) : "Free")}
              {bill.nightDeliveryFee > 0 && billRow("Distance delivery charge", rupees(bill.nightDeliveryFee))}
              {bill.handlingFee > 0 && billRow("Handling charge", rupees(bill.handlingFee))}
              {bill.discount > 0 &&
                billRow("Discount", `−${rupees(bill.discount)}`, "text-emerald-600 dark:text-emerald-400")}
            </dl>

            <div className="flex items-center justify-between text-xs border-t border-slate-200 dark:border-white/10 pt-3">
              <span className="text-slate-500 dark:text-neutral-400 font-medium">
                {addedCount > 0 ? "New total" : "Total"}
              </span>
              <div className="text-right">
                <span className="font-mono font-black text-base text-slate-900 dark:text-white">{rupees(bill.total)}</span>
                {addedCount > 0 && totalBefore > 0 && totalBefore !== bill.total && (
                  <span className="text-[10px] text-slate-500 dark:text-neutral-400 font-medium block">
                    was {rupees(totalBefore)}
                  </span>
                )}
              </div>
            </div>

            {(error || closedMessage) && (
              <p role="alert" className="text-[13px] font-medium text-red-600 dark:text-red-400">
                {error || closedMessage}
              </p>
            )}

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 h-12 rounded-2xl bg-white hover:bg-slate-100 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-neutral-300 font-bold text-xs border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
              >
                Close
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={addedCount === 0 || isSaving || !windowOpen}
                className={`grow h-12 rounded-2xl font-extrabold text-sm transition-all flex items-center justify-center space-x-2 ${
                  addedCount === 0 || !windowOpen
                    ? "bg-slate-200 dark:bg-white/10 text-slate-500 dark:text-white/50 cursor-not-allowed"
                    : "bg-[#FF5B00] hover:bg-[#E04E00] text-white active:scale-[0.98] cursor-pointer"
                }`}
              >
                {isSaving ? (
                  <span>Adding to your order…</span>
                ) : addedCount === 0 ? (
                  <span>Pick items to add</span>
                ) : (
                  <>
                    <span>
                      Add {addedCount} {addedCount === 1 ? "item" : "items"} · {rupees(bill.total)}
                    </span>
                    <ArrowRight className="w-4 h-4 stroke-[3]" />
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
