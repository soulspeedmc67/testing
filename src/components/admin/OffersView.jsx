import React, { useState } from "react";
import {
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Tag,
  ExternalLink,
  Edit3,
  Percent,
  Truck,
  X,
  Check
} from "lucide-react";
import { Switch } from "./ShopRulesSettings";

const EMPTY_COUPON = {
  code: "",
  title: "",
  type: "percent", // "discount" | "percent" | "free_delivery"
  discount: 50,
  minOrder: 799,
  description: "",
  condition: "",
  active: true,
};

export default function OffersView({
  coupons = [],
  onSaveCoupon,
  onDeleteCoupon,
  onToggleCouponActive,
  onResetDefaultCoupons,
  exclusiveOffers = [],
  onOpenOfferModal,
  onDeleteOffer,
  onToggleOffer,
  darkMode = false,
}) {
  const [showCouponModal, setShowCouponModal] = useState(false);
  const [togglingOfferId, setTogglingOfferId] = useState(null);
  const [editingCouponCode, setEditingCouponCode] = useState(null);
  const [couponForm, setCouponForm] = useState(EMPTY_COUPON);

  const handleOpenAddCoupon = () => {
    setEditingCouponCode(null);
    setCouponForm(EMPTY_COUPON);
    setShowCouponModal(true);
  };

  const applyTemplate = (tmpl) => {
    if (tmpl === "FREEDEL") {
      setCouponForm({
        code: "FREEDEL",
        title: "100% Free Delivery on your order",
        type: "free_delivery",
        discount: 0,
        minOrder: 0,
        description: "Free delivery auto-applied on your first 5 orders",
        condition: "Valid on first 5 orders across Anantnag",
        active: true,
      });
    } else if (tmpl === "FLAT50") {
      setCouponForm({
        code: "FLAT50",
        title: "Flat 50% Off on orders above ₹799",
        type: "percent",
        discount: 50,
        minOrder: 799,
        description: "Get 50% off on all grocery and daily essentials above ₹799",
        condition: "Cart value must be ₹799+",
        active: true,
      });
    }
  };

  const handleOpenEditCoupon = (c) => {
    setEditingCouponCode(c.code);
    const isFreeDel = Boolean(c.waivesDelivery || c.code === "FREEDEL");
    const isPercent = Boolean(c.isPercent || c.discountType === "percent");
    setCouponForm({
      code: c.code || "",
      title: c.title || "",
      type: isFreeDel ? "free_delivery" : isPercent ? "percent" : "discount",
      discount: c.discount !== undefined ? c.discount : 50,
      minOrder: c.minOrder !== undefined ? c.minOrder : 0,
      description: c.description || "",
      condition: c.condition || "",
      active: c.active !== false,
    });
    setShowCouponModal(true);
  };

  const handleSaveCouponSubmit = (e) => {
    e.preventDefault();
    const cleanCode = couponForm.code.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
    if (!cleanCode) {
      alert("Please enter a valid coupon code (letters and numbers only).");
      return;
    }

    const isFreeDel = couponForm.type === "free_delivery";
    const isPercent = couponForm.type === "percent";
    const payload = {
      code: cleanCode,
      title:
        couponForm.title.trim() ||
        (isFreeDel
          ? "100% Free Delivery on your order"
          : isPercent
          ? `Flat ${couponForm.discount}% Off on orders above ₹${couponForm.minOrder || 0}`
          : `₹${couponForm.discount} Off on orders of ₹${couponForm.minOrder || 0}+`),
      discount: isFreeDel ? 0 : Math.max(0, Number(couponForm.discount) || 0),
      discountType: isPercent ? "percent" : "fixed",
      isPercent: isPercent,
      waivesDelivery: isFreeDel,
      minOrder: Math.max(0, Number(couponForm.minOrder) || 0),
      description: couponForm.description.trim(),
      condition: couponForm.condition.trim(),
      active: Boolean(couponForm.active),
    };

    if (onSaveCoupon) {
      onSaveCoupon(payload, editingCouponCode);
    }
    setShowCouponModal(false);
  };


  return (
    <div className="space-y-6">
      {/* -------------------- SECTION 1: CHECKOUT OFFER CODES (COUPONS) -------------------- */}
      <div className="space-y-3">
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between flex-wrap gap-3 transition-colors ${
            darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-[#FF5B00] flex items-center justify-center font-black">
              <Tag className="w-5 h-5 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-base font-black text-slate-900 dark:text-white">
                  Checkout Offer Codes
                </h2>
                <span className="text-xs font-mono font-bold text-slate-400">
                  ({coupons.length} codes)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                Discount and promo coupons redeemable by customers during checkout and on the Offers page.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onResetDefaultCoupons && coupons.length === 0 && (
              <button
                type="button"
                onClick={onResetDefaultCoupons}
                className="px-3 py-2 rounded-xl text-xs font-bold text-slate-600 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Reset Defaults
              </button>
            )}
            <button
              type="button"
              onClick={handleOpenAddCoupon}
              className="bg-[#FF5B00] hover:bg-[#E04E00] text-white px-4 py-2 rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer flex items-center space-x-1.5 active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Add Offer Code</span>
            </button>
          </div>
        </div>

        {/* Coupons List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {coupons.length === 0 ? (
            <div className="col-span-full py-12 text-center text-slate-400 text-xs bg-white dark:bg-[#14161E] rounded-2xl border border-dashed border-slate-200 dark:border-zinc-800">
              No offer codes configured. Click &quot;Add Offer Code&quot; to create a new coupon for checkout.
            </div>
          ) : (
            coupons.map((c) => {
              const isActive = c.active !== false;
              const isFreeDel = Boolean(c.waivesDelivery || c.code === "FREEDEL");

              return (
                <div
                  key={c.code}
                  className={`p-4 rounded-2xl border transition-all flex flex-col justify-between relative ${
                    isActive
                      ? darkMode
                        ? "bg-[#14161E] border-zinc-800"
                        : "bg-white border-slate-200 shadow-xs"
                      : darkMode
                      ? "bg-[#14161E]/50 border-zinc-800/60 opacity-60"
                      : "bg-slate-50/80 border-slate-200/70 opacity-60"
                  }`}
                >
                  <div className="space-y-2">
                    {/* Top row: Code + Status Badge */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono font-black text-sm tracking-wider text-[#FF5B00] bg-orange-500/10 border border-orange-500/20 px-2.5 py-1 rounded-lg">
                          {c.code}
                        </span>
                        <span
                          className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                            isActive
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : "bg-slate-200 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400"
                          }`}
                        >
                          {isActive ? "Active" : "Inactive"}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditCoupon(c)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                          title="Edit Code"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {onDeleteCoupon && (
                          <button
                            type="button"
                            onClick={() => onDeleteCoupon(c.code)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer"
                            title="Delete Code"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Headline and Description */}
                    <div>
                      <h4 className="text-xs font-black text-slate-900 dark:text-white line-clamp-1">
                        {c.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5 line-clamp-2">
                        {c.description || c.condition || "Available at checkout"}
                      </p>
                    </div>

                    {/* Metrics Pills */}
                    <div className="flex items-center gap-2 pt-1">
                      <span className="inline-flex items-center text-[10.5px] font-bold text-slate-700 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-md">
                        {isFreeDel ? (
                          <span className="text-emerald-600 dark:text-emerald-400 font-black">Free Delivery</span>
                        ) : c.isPercent || c.discountType === "percent" ? (
                          <span className="text-[#FF5B00] font-black">{c.discount}% Off</span>
                        ) : (
                          <span>₹{c.discount} Discount</span>
                        )}
                      </span>
                      <span className="inline-flex items-center text-[10.5px] font-bold text-slate-500 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-800/80 px-2 py-0.5 rounded-md">
                        {Number(c.minOrder) > 0 ? `Min ₹${c.minOrder}` : "No minimum"}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Toggle switch */}
                  {onToggleCouponActive && (
                    <div className="pt-3 mt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 font-medium">Checkout Status</span>
                      <button
                        type="button"
                        onClick={() => onToggleCouponActive(c.code, !isActive)}
                        className={`text-xs font-bold px-2.5 py-0.5 rounded-md transition-colors cursor-pointer ${
                          isActive
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20"
                            : "bg-slate-200 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:bg-slate-300 dark:hover:bg-zinc-700"
                        }`}
                      >
                        {isActive ? "Turn Off" : "Turn On"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* -------------------- SECTION 2: STOREFRONT BANNER DROPS -------------------- */}
      <div className="space-y-3 pt-4 border-t border-slate-200 dark:border-zinc-800">
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between flex-wrap gap-3 transition-colors ${
            darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
          }`}
        >
          <div>
            <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
              <span>Storefront Banner Drops</span>
              <span className="text-xs font-mono font-bold text-slate-400">
                ({exclusiveOffers.filter((o) => o.active !== false).length} on, {exclusiveOffers.filter((o) => o.active === false).length} off)
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              The banners customers see in the app. Switch one off to hide it, and back on whenever you like. With none
              on, customers see no banner.
            </p>
          </div>

          <button
            type="button"
            onClick={onOpenOfferModal}
            className="bg-[#FF5B00] hover:bg-[#E04E00] text-white px-4 py-2 rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer flex items-center space-x-1.5 active:scale-95"
          >
            <Plus className="w-3.5 h-3.5 stroke-[3]" />
            <span>New Banner Offer</span>
          </button>
        </div>

        {/* Offers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {exclusiveOffers.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 text-xs">
              No banners. Customers see none until you add one with &quot;New Banner Offer&quot;.
            </div>
          ) : (
            exclusiveOffers.map((off) => (
              <div
                key={off.id}
                className={`rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-xs bg-slate-950 text-white flex flex-col justify-between p-4 relative min-h-[170px] ${
                  off.active === false ? "opacity-60" : ""
                }`}
              >
                <img
                  src={off.img}
                  alt={off.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-20"
                />
                <div className="relative z-10 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 bg-black/50 px-2 py-0.5 rounded-md inline-block">
                      {off.badge || "DASHIT EXCLUSIVE"}
                    </span>
                    {onDeleteOffer && (
                      <button
                        type="button"
                        onClick={() => onDeleteOffer(off.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-rose-400 hover:bg-black/40 cursor-pointer"
                        title="Delete Offer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <h4 className="font-black text-sm text-white leading-tight">{off.title}</h4>
                  <p className="text-[11px] text-slate-300 line-clamp-2">{off.subtitle}</p>
                </div>

                <div className="relative z-10 flex items-center justify-between pt-3 border-t border-white/10 mt-3">
                  <span className="text-xs font-black text-amber-300">{off.priceTag}</span>
                  <span className="text-[10.5px] font-mono font-bold bg-white/20 px-2 py-0.5 rounded text-white">
                    {off.promoCode}
                  </span>
                </div>

                {onToggleOffer && (
                  <div className="relative z-10 flex items-center justify-between gap-3 pt-3 mt-3 border-t border-white/10">
                    <span className="text-[11px] font-bold text-slate-200">
                      {off.active === false ? "Off. Customers don't see it." : "On. Customers see it."}
                    </span>
                    <Switch
                      on={off.active !== false}
                      label={`Show the banner ${off.title}`}
                      busy={togglingOfferId === off.id}
                      disabled={Boolean(togglingOfferId)}
                      onChange={async () => {
                        setTogglingOfferId(off.id);
                        try {
                          await onToggleOffer(off);
                        } finally {
                          setTogglingOfferId(null);
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* -------------------- ADD / EDIT COUPON MODAL -------------------- */}
      {showCouponModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div
            className={`rounded-3xl p-6 border shadow-2xl max-w-md w-full space-y-4 relative animate-in fade-in zoom-in-95 ${
              darkMode ? "bg-[#14161E] border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex items-start justify-between border-b pb-3 border-slate-200/50 dark:border-zinc-800">
              <div className="flex items-center space-x-2.5">
                <div className="w-10 h-10 rounded-2xl bg-orange-500/15 text-[#FF5B00] flex items-center justify-center font-black">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-base">
                    {editingCouponCode ? `Edit Offer Code "${editingCouponCode}"` : "Add Checkout Offer Code"}
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-medium">
                    Configure code, minimum order, and customer savings
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowCouponModal(false)}
                className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-slate-200 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveCouponSubmit} className="space-y-3.5">
              {/* Code */}
              <div>
                <label className="text-[11px] font-black uppercase text-slate-400 block mb-1">
                  Coupon Code *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GET30, DASHIT50, SUMMER25"
                  value={couponForm.code}
                  onChange={(e) =>
                    setCouponForm((p) => ({
                      ...p,
                      code: e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ""),
                    }))
                  }
                  className={`w-full text-xs font-mono font-black uppercase px-3 py-2 rounded-xl border outline-none ${
                    darkMode ? "bg-[#1A1D26] border-zinc-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                />
                {/* Quick Template Chips */}
                <div className="flex items-center gap-1.5 pt-1.5 flex-wrap">
                  <span className="text-[10px] text-slate-400 font-bold uppercase">Quick Presets:</span>
                  <button
                    type="button"
                    onClick={() => applyTemplate("FLAT50")}
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-orange-500/10 text-[#FF5B00] hover:bg-orange-500/20 border border-orange-500/20 cursor-pointer"
                  >
                    ⚡ FLAT50 (50% &gt; ₹799)
                  </button>
                  <button
                    type="button"
                    onClick={() => applyTemplate("FREEDEL")}
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 cursor-pointer"
                  >
                    ⚡ FREEDEL (100% Free)
                  </button>
                </div>
              </div>

              {/* Offer Type: Percentage vs Flat Discount vs Free Delivery */}
              <div>
                <label className="text-[11px] font-black uppercase text-slate-400 block mb-1">
                  Benefit Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCouponForm((p) => ({ ...p, type: "percent" }))}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border flex items-center justify-center space-x-1 transition-all cursor-pointer ${
                      couponForm.type === "percent"
                        ? "bg-[#FF5B00] text-white border-[#FF5B00] shadow-xs"
                        : darkMode
                        ? "bg-[#1A1D26] border-zinc-700 text-zinc-300"
                        : "bg-slate-50 border-slate-300 text-slate-700"
                    }`}
                  >
                    <Percent className="w-3.5 h-3.5 shrink-0" />
                    <span>% Off</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCouponForm((p) => ({ ...p, type: "discount" }))}
                    className={`py-2 px-2 rounded-xl text-xs font-bold border flex items-center justify-center space-x-1 transition-all cursor-pointer ${
                      couponForm.type === "discount"
                        ? "bg-[#FF5B00] text-white border-[#FF5B00] shadow-xs"
                        : darkMode
                        ? "bg-[#1A1D26] border-zinc-700 text-zinc-300"
                        : "bg-slate-50 border-slate-300 text-slate-700"
                    }`}
                  >
                    <span className="font-mono text-xs font-bold">₹</span>
                    <span>Flat (₹)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setCouponForm((p) => ({
                        ...p,
                        type: "free_delivery",
                        discount: 0,
                      }))
                    }
                    className={`py-2 px-2 rounded-xl text-xs font-bold border flex items-center justify-center space-x-1 transition-all cursor-pointer ${
                      couponForm.type === "free_delivery"
                        ? "bg-[#FF5B00] text-white border-[#FF5B00] shadow-xs"
                        : darkMode
                        ? "bg-[#1A1D26] border-zinc-700 text-zinc-300"
                        : "bg-slate-50 border-slate-300 text-slate-700"
                    }`}
                  >
                    <Truck className="w-3.5 h-3.5 shrink-0" />
                    <span>Free Del</span>
                  </button>
                </div>
              </div>

              {/* Discount Amount & Min Order Value */}
              <div className="grid grid-cols-2 gap-2">
                {couponForm.type === "percent" ? (
                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-400 block mb-1">
                      Discount (% Off) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      required
                      placeholder="e.g. 50"
                      value={couponForm.discount}
                      onChange={(e) =>
                        setCouponForm((p) => ({
                          ...p,
                          discount: Number(e.target.value) || 0,
                        }))
                      }
                      className={`w-full text-xs font-bold px-3 py-2 rounded-xl border outline-none ${
                        darkMode ? "bg-[#1A1D26] border-zinc-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                      }`}
                    />
                  </div>
                ) : couponForm.type === "discount" ? (
                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-400 block mb-1">
                      Discount Amount (₹) *
                    </label>
                    <input
                      type="number"
                      min="1"
                      required
                      placeholder="e.g. 30"
                      value={couponForm.discount}
                      onChange={(e) =>
                        setCouponForm((p) => ({
                          ...p,
                          discount: Number(e.target.value) || 0,
                        }))
                      }
                      className={`w-full text-xs font-bold px-3 py-2 rounded-xl border outline-none ${
                        darkMode ? "bg-[#1A1D26] border-zinc-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                      }`}
                    />
                  </div>
                ) : (
                  <div>
                    <label className="text-[11px] font-black uppercase text-slate-400 block mb-1">
                      Delivery Waiver
                    </label>
                    <div
                      className={`w-full text-xs font-bold px-3 py-2 rounded-xl border flex items-center text-emerald-600 dark:text-emerald-400 ${
                        darkMode ? "bg-[#1A1D26] border-zinc-700" : "bg-slate-50 border-slate-300"
                      }`}
                    >
                      100% Free Delivery
                    </div>
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-black uppercase text-slate-400 block mb-1">
                    Min Order Value (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 199 (0 for none)"
                    value={couponForm.minOrder}
                    onChange={(e) =>
                      setCouponForm((p) => ({
                        ...p,
                        minOrder: Number(e.target.value) || 0,
                      }))
                    }
                    className={`w-full text-xs font-bold px-3 py-2 rounded-xl border outline-none ${
                      darkMode ? "bg-[#1A1D26] border-zinc-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                    }`}
                  />
                </div>
              </div>

              {/* Title / Headline */}
              <div>
                <label className="text-[11px] font-black uppercase text-slate-400 block mb-1">
                  Title / Headline
                </label>
                <input
                  type="text"
                  placeholder="e.g. Up to ₹30 Off on orders of ₹199 or more"
                  value={couponForm.title}
                  onChange={(e) => setCouponForm((p) => ({ ...p, title: e.target.value }))}
                  className={`w-full text-xs font-bold px-3 py-2 rounded-xl border outline-none ${
                    darkMode ? "bg-[#1A1D26] border-zinc-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-[11px] font-black uppercase text-slate-400 block mb-1">
                  Description / Subtitle
                </label>
                <input
                  type="text"
                  placeholder="e.g. Valid on all grocery and fresh items in Anantnag"
                  value={couponForm.description}
                  onChange={(e) => setCouponForm((p) => ({ ...p, description: e.target.value }))}
                  className={`w-full text-xs font-medium px-3 py-2 rounded-xl border outline-none ${
                    darkMode ? "bg-[#1A1D26] border-zinc-700 text-white" : "bg-slate-50 border-slate-300 text-slate-900"
                  }`}
                />
              </div>

              {/* Active Checkbox */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="coupon-active-toggle"
                  checked={couponForm.active}
                  onChange={(e) => setCouponForm((p) => ({ ...p, active: e.target.checked }))}
                  className="rounded text-[#FF5B00] focus:ring-[#FF5B00] w-4 h-4"
                />
                <label
                  htmlFor="coupon-active-toggle"
                  className="text-xs font-bold text-slate-700 dark:text-zinc-300 cursor-pointer"
                >
                  Active immediately in checkout & offers list
                </label>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200/50 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowCouponModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-[#FF5B00] hover:bg-[#E04E00] text-white px-5 py-2 rounded-xl text-xs font-black shadow-xs transition-all cursor-pointer active:scale-95"
                >
                  {editingCouponCode ? "Save Changes" : "Create Offer Code"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
