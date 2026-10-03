import { useState, useEffect } from "react";
import { useBodyScrollLock } from "../lib/useBodyScrollLock";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Tag, Check, Sparkles } from "lucide-react";
import { hapticLight, hapticMedium } from "../lib/haptics";

import { DEFAULT_COUPONS, watchActiveCoupons } from "../lib/coupons";

export default function CouponsDrawer({ isOpen, onClose, cartTotal, appliedCoupon, onApplyCoupon }) {
  const [coupons, setCoupons] = useState(DEFAULT_COUPONS);
  const [customCode, setCustomCode] = useState("");
  const [codeError, setCodeError] = useState("");

  /* Locks background scroll while open (see src/lib/useBodyScrollLock.js). */
  useBodyScrollLock(Boolean(isOpen));

  useEffect(() => {
    const unsub = watchActiveCoupons((activeList) => {
      if (Array.isArray(activeList) && activeList.length > 0) {
        setCoupons(activeList);
      }
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  if (!isOpen) return null;

  /* Only active codes in coupons are honoured. */
  const handleApplyCustom = (e) => {
    e?.preventDefault();
    const entered = customCode.trim().toUpperCase();
    if (!entered) return;

    const found = coupons.find((c) => c.code.toUpperCase() === entered);
    if (!found) {
      setCodeError("That offer code is not valid.");
      return;
    }
    const min = Number(found.minOrder) || 0;
    if (cartTotal < min) {
      setCodeError(`Minimum cart value of ₹${min} required for ${found.code}.`);
      return;
    }
    setCodeError("");
    hapticMedium();
    onApplyCoupon(found);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[120] flex flex-col justify-end bg-black/60 backdrop-blur-xs">
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 350 }}
          className="w-full max-w-lg mx-auto bg-slate-50 dark:bg-zinc-950 h-[85vh] rounded-t-[32px] overflow-hidden flex flex-col shadow-2xl border-t border-slate-200 dark:border-zinc-800"
        >
          {/* Header */}
          <div className="bg-white dark:bg-zinc-900 px-5 py-4 border-b border-slate-200/80 dark:border-zinc-800 flex items-center space-x-3 shrink-0">
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-300 active:scale-95"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            </button>
            <div>
              <h2 className="text-base font-black text-slate-900 dark:text-white">Coupons</h2>
              <p className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
                Your cart value ₹{cartTotal} + Charges
              </p>
            </div>
          </div>

          <div className="p-5 overflow-y-auto space-y-6">
            {/* Have an offer code? */}
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-900 dark:text-white block">
                Have an offer code?
              </label>
              <form onSubmit={handleApplyCustom} className="flex space-x-2 bg-white dark:bg-zinc-900 p-1.5 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xs">
                <input
                  type="text"
                  value={customCode}
                  onChange={(e) => {
                    setCustomCode(e.target.value.toUpperCase());
                    setCodeError("");
                  }}
                  placeholder="Type offer code here..."
                  className="grow px-3 py-2 text-xs font-mono font-black text-slate-900 dark:text-white bg-transparent focus:outline-none uppercase"
                />
                <button
                  type="submit"
                  disabled={!customCode.trim()}
                  className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-extrabold text-xs hover:bg-[#FF5B00] hover:text-white transition-colors disabled:opacity-40"
                >
                  Apply
                </button>
              </form>
              {codeError && (
                <p className="text-[11px] font-bold text-rose-600 dark:text-rose-400 px-1">
                  {codeError}
                </p>
              )}
            </div>

            {/* Offers list */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-900 dark:text-white">Offers</h3>

              {coupons.length === 0 ? (
                <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-8 text-center text-xs font-bold text-slate-400">
                  No active coupon offers right now. Check back soon!
                </div>
              ) : (
                coupons.map((coupon) => {
                  const min = Number(coupon.minOrder) || 0;
                  const isEligible = cartTotal >= min;
                  const isSelected = appliedCoupon?.code === coupon.code;
                  const isFreeDel = Boolean(coupon.waivesDelivery || coupon.code === "FREEDEL");

                  return (
                    <div
                      key={coupon.code}
                      className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 shadow-xs relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start space-x-3 min-w-0">
                          <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-900">
                            <Tag className="w-4 h-4 stroke-[2.5]" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono font-black text-xs text-slate-900 dark:text-white border border-dashed border-slate-300 dark:border-zinc-700 px-2 py-0.5 rounded-md">
                                {coupon.code}
                              </span>
                            </div>
                            <p className="text-xs font-extrabold text-slate-800 dark:text-zinc-200 mt-1">
                              {coupon.title}
                            </p>
                            <p className="text-[10px] font-semibold text-slate-400 mt-0.5 dark:text-content-faint">
                              {coupon.description || coupon.condition}
                            </p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[10px] font-black text-slate-400 uppercase block dark:text-content-faint">
                            {isFreeDel ? "Benefit" : "Save up to"}
                          </span>
                          <span className="text-sm font-mono font-black text-[#FF5B00] block">
                            {isFreeDel ? "Free Del" : `₹${coupon.discount}`}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              if (!isEligible) {
                                alert(`Add ₹${min - cartTotal} more to unlock this coupon`);
                                return;
                              }
                              hapticMedium();
                              onApplyCoupon(isSelected ? null : coupon);
                              onClose();
                            }}
                            className={`mt-2 px-4 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                              isSelected
                                ? "bg-rose-50 text-rose-600 border border-rose-200"
                                : isEligible
                                ? "bg-[#FF5B00] text-white hover:bg-[#0a6f1a] shadow-xs"
                                : "bg-slate-100 dark:bg-zinc-800 text-slate-400 cursor-not-allowed"
                            }`}
                          >
                            {isSelected ? "Remove" : "Apply"}
                          </button>
                        </div>
                      </div>

                      {!isEligible && min > 0 && (
                        <div className="mt-3 bg-zinc-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg">
                          Add ₹{min - cartTotal} more items to unlock
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
