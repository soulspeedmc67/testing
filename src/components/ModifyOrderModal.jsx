import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Plus,
  Minus,
  Trash2,
  ShoppingBag,
  Search,
  Check,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight
} from "lucide-react";
import { hapticLight, hapticMedium, hapticSuccess, hapticHeavy } from "../lib/haptics";
import { SPRING_SNAPPY } from "../lib/motion";

const MIN_ORDER_VALUE = 299;

export default function ModifyOrderModal({
  isOpen,
  onClose,
  order,
  productsList = [],
  onSaveOrder,
  remainingSeconds = 60,
}) {
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCat, setSelectedCat] = useState("All");
  const [isSaving, setIsSaving] = useState(false);

  // Initialize or re-sync items when order changes
  useEffect(() => {
    if (order?.items) {
      setItems(JSON.parse(JSON.stringify(order.items)));
    }
  }, [order, isOpen]);

  // Derived financial totals
  const subtotal = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + (Number(item.price) || 0) * (Number(item.qty) || 0),
      0
    );
  }, [items]);

  const savings = useMemo(() => {
    return items.reduce((sum, item) => {
      const orig = Number(item.originalPrice || item.mrp || item.price) || 0;
      const paid = Number(item.price) || 0;
      return sum + Math.max(0, orig - paid) * (Number(item.qty) || 0);
    }, 0);
  }, [items]);

  const deliveryFee = useMemo(() => {
    if (order?.deliveryFee !== undefined) return Number(order.deliveryFee);
    return subtotal >= 499 ? 0 : 25;
  }, [order, subtotal]);

  const couponDiscount = Number(order?.couponDiscount || order?.discount || 0);
  const grandTotal = Math.max(0, subtotal + deliveryFee - couponDiscount);
  const isBelowMin = subtotal < MIN_ORDER_VALUE;
  const deficit = Math.max(0, MIN_ORDER_VALUE - subtotal);

  // Filter catalogue items for quick adding
  const availableCatalogue = useMemo(() => {
    if (!productsList || productsList.length === 0) return [];
    const q = searchQuery.trim().toLowerCase();

    return productsList.filter((p) => {
      if (p.stock !== undefined && Number(p.stock) <= 0) return false;
      const matchesSearch =
        !q ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.cat && p.cat.toLowerCase().includes(q));

      if (!matchesSearch) return false;
      if (selectedCat === "All") return true;
      return (p.cat || "").toLowerCase() === selectedCat.toLowerCase();
    }).slice(0, 16);
  }, [productsList, searchQuery, selectedCat]);

  // Unique categories for chips
  const categories = useMemo(() => {
    const set = new Set(["All"]);
    (productsList || []).forEach((p) => {
      if (p.cat) set.add(p.cat);
    });
    return Array.from(set).slice(0, 7);
  }, [productsList]);

  if (!isOpen) return null;

  // Handlers for modifying existing order items
  const handleUpdateQty = (itemId, delta) => {
    hapticLight();
    setItems((prev) => {
      return prev
        .map((item) => {
          const id = String(item.id || item.barcode);
          if (id === String(itemId)) {
            const newQty = (Number(item.qty) || 1) + delta;
            return { ...item, qty: newQty };
          }
          return item;
        })
        .filter((item) => item.qty > 0);
    });
  };

  const handleRemoveItem = (itemId) => {
    hapticHeavy();
    setItems((prev) => prev.filter((item) => String(item.id || item.barcode) !== String(itemId)));
  };

  // Handler for adding new product from catalogue to the order
  const handleAddProduct = (prod) => {
    hapticMedium();
    const prodId = String(prod.id || prod.barcode);
    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => String(i.id || i.barcode) === prodId);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx].qty += 1;
        return updated;
      }
      return [
        ...prev,
        {
          ...prod,
          qty: 1,
        },
      ];
    });
  };

  // Save changes back to order
  const handleSave = async () => {
    if (isBelowMin || items.length === 0 || isSaving) return;
    setIsSaving(true);
    hapticSuccess();

    try {
      await onSaveOrder({
        items,
        subtotal,
        totalAmount: grandTotal,
        finalTotal: grandTotal,
        total: grandTotal,
        savings,
        deliveryFee,
      });
      onClose();
    } catch (e) {
      alert("Could not update order. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

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

        {/* Modal Container */}
        <motion.div
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

          {/* Modal Header */}
          <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-white/10 flex items-center justify-between shrink-0">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-50 text-[#FF5B00] dark:bg-orange-950/40 flex items-center justify-center font-bold">
                <ShoppingBag className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                    Modify Order Content
                  </h2>
                  <span className="text-[10px] font-black uppercase text-amber-700 bg-amber-50 dark:bg-amber-950/50 dark:text-amber-400 px-2 py-0.5 rounded-full border border-amber-200/80 dark:border-amber-900/40">
                    {remainingSeconds}s window
                  </span>
                </div>
                <p className="text-xs text-slate-500 dark:text-neutral-400 font-medium mt-0.5">
                  Add more items or change quantities before packing begins
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-white/10 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center active:scale-90 transition-transform"
            >
              <X className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto px-4 sm:px-5 py-4 space-y-5 grow">
            {/* Section 1: Current Order Items */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                  Items in this Order ({items.reduce((s, i) => s + (Number(i.qty) || 1), 0)})
                </h3>
                <span className="text-[11px] font-semibold text-slate-500 dark:text-neutral-400">
                  Subtotal: <strong className="font-mono text-slate-900 dark:text-white font-bold">₹{subtotal}</strong>
                </span>
              </div>

              {items.length === 0 ? (
                <div className="p-6 text-center bg-slate-50 dark:bg-white/5 rounded-2xl border border-dashed border-slate-200 dark:border-white/10">
                  <p className="text-xs text-slate-500 font-medium">
                    You removed all items. Add items below or cancel this order.
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-white/10 border border-slate-100 dark:border-white/10 rounded-2xl bg-white dark:bg-white/[0.02] overflow-hidden">
                  {items.map((item) => {
                    const itemId = item.id || item.barcode;
                    return (
                      <div
                        key={itemId}
                        className="p-3 flex items-center justify-between space-x-3 hover:bg-slate-50/50 dark:hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <img
                            src={item.img || item.image || "/dashit-logo-centered.png"}
                            alt={item.name}
                            className="w-11 h-11 object-contain bg-slate-50 rounded-xl p-1 shrink-0 border border-slate-100 dark:bg-white/5 dark:border-white/10"
                          />
                          <div className="min-w-0">
                            <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                              {item.name}
                            </h4>
                            <div className="flex items-center space-x-1.5 mt-0.5">
                              <span className="font-mono font-black text-xs text-[#061838] dark:text-white">
                                ₹{item.price}
                              </span>
                              <span className="text-[10px] text-slate-400 dark:text-neutral-500">
                                • {item.unit || "1 unit"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Quantity Stepper & Delete */}
                        <div className="flex items-center space-x-2 shrink-0">
                          <div className="flex items-center space-x-1.5 bg-slate-100 dark:bg-white/10 rounded-xl p-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(itemId, -1)}
                              aria-label="Decrease quantity"
                              className="w-6 h-6 rounded-lg bg-white dark:bg-surface-raised flex items-center justify-center text-slate-700 dark:text-neutral-200 active:scale-75 shadow-xs"
                            >
                              <Minus className="w-3 h-3 stroke-[2.5]" />
                            </button>
                            <span className="font-mono font-black text-xs px-1 text-slate-900 dark:text-white min-w-[18px] text-center">
                              {item.qty}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(itemId, 1)}
                              aria-label="Increase quantity"
                              className="w-6 h-6 rounded-lg bg-[#061838] dark:bg-[#FF5B00] text-white flex items-center justify-center active:scale-75 shadow-xs"
                            >
                              <Plus className="w-3 h-3 stroke-[2.5]" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveItem(itemId)}
                            aria-label="Remove item"
                            className="p-1.5 text-slate-400 hover:text-rose-500 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4 stroke-[2]" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Section 2: Quick-Add More Products from Catalogue */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-[#FF5B00]" />
                  <h3 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">
                    Add More Items
                  </h3>
                </div>
                <span className="text-[10.5px] font-semibold text-slate-500 dark:text-neutral-400">
                  Forgot milk or snacks? Add them now!
                </span>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search products to add..."
                  className="w-full bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs font-medium text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#FF5B00]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Category Chips */}
              <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedCat(cat)}
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

              {/* Products Horizontal / Grid List */}
              <div className="grid grid-cols-2 gap-2.5 max-h-56 overflow-y-auto pr-0.5">
                {availableCatalogue.map((prod) => {
                  const pId = String(prod.id || prod.barcode);
                  const isAlreadyIn = items.some((i) => String(i.id || i.barcode) === pId);

                  return (
                    <div
                      key={pId}
                      className="bg-slate-50 dark:bg-white/5 border border-slate-200/80 dark:border-white/10 rounded-xl p-2.5 flex items-center justify-between space-x-2"
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        <img
                          src={prod.img || prod.image || "/dashit-logo-centered.png"}
                          alt={prod.name}
                          className="w-9 h-9 object-contain bg-white rounded-lg p-0.5 shrink-0 border border-slate-100 dark:bg-white/10 dark:border-white/5"
                        />
                        <div className="min-w-0">
                          <h4 className="text-[11px] font-extrabold text-slate-900 dark:text-white truncate">
                            {prod.name}
                          </h4>
                          <span className="font-mono font-bold text-[11px] text-[#061838] dark:text-neutral-200 block">
                            ₹{prod.price}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleAddProduct(prod)}
                        className={`px-2 py-1 rounded-lg text-[10px] font-black shrink-0 transition-transform active:scale-90 cursor-pointer ${
                          isAlreadyIn
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/30"
                            : "bg-[#FF5B00] text-white shadow-2xs hover:bg-[#E04E00]"
                        }`}
                      >
                        {isAlreadyIn ? "+1 More" : "+ Add"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sticky Modal Footer with ₹299 Guard */}
          <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.02] shrink-0 space-y-3">
            {/* Minimum Order Warning if Below ₹299 */}
            {isBelowMin ? (
              <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/50 rounded-xl p-2.5 flex items-start space-x-2 text-xs">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold text-amber-900 dark:text-amber-200 block">
                    Minimum order value is ₹{MIN_ORDER_VALUE}
                  </span>
                  <span className="text-[11px] text-amber-800 dark:text-amber-300/80 block mt-0.5">
                    Current subtotal: ₹{subtotal}. Please add items worth <strong>₹{deficit}</strong> more to update order.
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-neutral-400 font-medium">
                  Updated Grand Total
                </span>
                <div className="text-right">
                  <span className="font-mono font-black text-base text-slate-900 dark:text-white">
                    ₹{grandTotal}
                  </span>
                  {savings > 0 && (
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
                      Saved ₹{savings}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Primary Action Button */}
            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={onClose}
                className="w-1/3 h-12 rounded-2xl bg-white hover:bg-slate-100 dark:bg-white/10 dark:hover:bg-white/15 text-slate-700 dark:text-neutral-300 font-bold text-xs border border-slate-200 dark:border-white/10 transition-colors cursor-pointer"
              >
                Discard
              </button>

              <button
                type="button"
                onClick={handleSave}
                disabled={isBelowMin || items.length === 0 || isSaving}
                className={`grow h-12 rounded-2xl font-extrabold text-sm transition-all flex items-center justify-center space-x-2 shadow-md cursor-pointer ${
                  isBelowMin || items.length === 0
                    ? "bg-slate-200 dark:bg-white/10 text-slate-400 cursor-not-allowed border border-slate-300 dark:border-white/5"
                    : "bg-[#FF5B00] hover:bg-[#E04E00] text-white active:scale-[0.98]"
                }`}
              >
                {isSaving ? (
                  <span>Saving Updates…</span>
                ) : (
                  <>
                    <span>Save Order (₹{grandTotal})</span>
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
