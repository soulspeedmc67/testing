import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Tag, Check, Sparkles } from "lucide-react";
import { hapticLight, hapticMedium } from "../lib/haptics";

const AVAILABLE_COUPONS = [
  {
    code: "GET30",
    title: "Up to ₹30 Off on orders of ₹199 or more",
    discount: 30,
    minOrder: 199,
    description: "Valid on all grocery and fresh items in Anantnag",
    condition: "Add non discounted item(s) to unlock"
  },
  {
    code: "DASHIT50",
    title: "Flat ₹50 Off on orders above ₹299",
    discount: 50,
    minOrder: 299,
    description: "Special launch discount for Anantnag Dashit customers",
    condition: "Cart value must be ₹299+"
  },
  {
    code: "FREEDEL",
    title: "100% Free Delivery on your order",
    discount: 25,
    minOrder: 99,
    description: "Zero delivery fee applied",
    condition: "No minimum required"
  }
];

export default function CouponsDrawer({ isOpen, onClose, cartTotal, appliedCoupon, onApplyCoupon }) {
  const [customCode, setCustomCode] = useState("");

  if (!isOpen) return null;

  const handleApplyCustom = (e) => {
    e?.preventDefault();
    const found = AVAILABLE_COUPONS.find(c => c.code.toUpperCase() === customCode.trim().toUpperCase());
    if (found) {
      if (cartTotal < found.minOrder) {
        alert(`Minimum cart value of ₹${found.minOrder} required for ${found.code}`);
        return;
      }
      hapticMedium();
      onApplyCoupon(found);
      onClose();
    } else if (customCode.trim().length > 0) {
      // Dynamic coupon
      const dynamicCoupon = {
        code: customCode.trim().toUpperCase(),
        title: "Special Offer Applied",
        discount: 35,
        minOrder: 100
      };
      hapticMedium();
      onApplyCoupon(dynamicCoupon);
      onClose();
    }
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
                  onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                  placeholder="Type offer code here..."
                  className="grow px-3 py-2 text-xs font-mono font-black text-slate-900 dark:text-white bg-transparent focus:outline-none uppercase"
                />
                <button
                  type="submit"
                  disabled={!customCode.trim()}
                  className="px-5 py-2 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-extrabold text-xs hover:bg-[#0c831f] hover:text-white transition-colors disabled:opacity-40"
                >
                  Apply
                </button>
              </form>
            </div>

            {/* Offers list */}
            <div className="space-y-3">
              <h3 className="text-xs font-black text-slate-900 dark:text-white">Offers</h3>

              {AVAILABLE_COUPONS.map((coupon) => {
                const isEligible = cartTotal >= coupon.minOrder;
                const isSelected = appliedCoupon?.code === coupon.code;

                return (
                  <div
                    key={coupon.code}
                    className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 p-4 shadow-xs relative overflow-hidden"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center shrink-0 border border-blue-200 dark:border-blue-900">
                          <Tag className="w-4 h-4 stroke-[2.5]" />
                        </div>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className="font-mono font-black text-xs text-slate-900 dark:text-white border border-dashed border-slate-300 dark:border-zinc-700 px-2 py-0.5 rounded-md">
                              {coupon.code}
                            </span>
                          </div>
                          <p className="text-xs font-extrabold text-slate-800 dark:text-zinc-200 mt-1">
                            {coupon.title}
                          </p>
                          <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
                            {coupon.description}
                          </p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[10px] font-black text-slate-400 uppercase block">Save up to</span>
                        <span className="text-sm font-mono font-black text-[#0c831f] block">₹{coupon.discount}</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (!isEligible) {
                              alert(`Add ₹${coupon.minOrder - cartTotal} more to unlock this coupon`);
                              return;
                            }
                            hapticMedium();
                            onApplyCoupon(isSelected ? null : coupon);
                            onClose();
                          }}
                          className={`mt-2 px-4 py-1.5 rounded-xl font-bold text-xs transition-colors ${
                            isSelected
                              ? "bg-rose-50 text-rose-600 border border-rose-200"
                              : isEligible
                              ? "bg-[#0c831f] text-white hover:bg-[#0a6f1a] shadow-xs"
                              : "bg-slate-100 dark:bg-zinc-800 text-slate-400 cursor-not-allowed"
                          }`}
                        >
                          {isSelected ? "Remove" : "Apply"}
                        </button>
                      </div>
                    </div>

                    {!isEligible && (
                      <div className="mt-3 bg-zinc-900 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg">
                        Add ₹{coupon.minOrder - cartTotal} more items to unlock
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
