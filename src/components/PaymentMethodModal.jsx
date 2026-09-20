import { useState } from "react";
import { useBodyScrollLock } from "../lib/useBodyScrollLock";
import { ChevronDown, ChevronRight, CreditCard, Plus, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";

import { hapticMedium } from "../lib/haptics";

export default function PaymentMethodModal({ isOpen, onClose, selectedMethod, onSelectMethod, grandTotal }) {
  /* Locks background scroll while open (see src/lib/useBodyScrollLock.js). */
  useBodyScrollLock(Boolean(isOpen));

  if (!isOpen) return null;

  const handleSelect = (methodId, label) => {
    hapticMedium();
    onSelectMethod({ id: methodId, label });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end sm:items-center sm:justify-center">
      <div className="bg-slate-50 rounded-t-[32px] sm:rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200/80 dark:bg-surface-raised dark:border-line/80">
        {/* Top Header */}
        <div className="bg-white px-4 py-3.5 border-b border-slate-200 flex items-center space-x-3 sticky top-0 z-20 dark:bg-surface dark:border-line">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-90 transition-transform dark:border-line dark:text-content-secondary dark:hover:bg-surface-muted"
          >
            <ChevronDown className="w-5 h-5 stroke-[2.5]" />
          </button>
          <h1 className="font-extrabold text-base text-slate-900 dark:text-content">
            Select Payment Method
          </h1>
        </div>

        {/* Scrollable Content */}
        <div className="overflow-y-auto p-4 space-y-4 pb-10">
          {/* CASH ON DELIVERY (ACTIVE PAYMENT METHOD) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-black text-slate-800 tracking-tight dark:text-content">
                Payment Option
              </h3>
              <span className="text-[10px] font-black uppercase text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 px-2 py-0.5 rounded-full">
                Active &amp; Ready
              </span>
            </div>

            <div className="border-2 rounded-2xl shadow-sm overflow-hidden transition-all bg-white border-emerald-500/80 ring-2 ring-emerald-500/10 dark:bg-surface-raised dark:border-emerald-600/70">
              <button
                type="button"
                onClick={() => handleSelect("cod", "Cash on Delivery")}
                className="w-full px-4 py-4 flex items-center justify-between bg-emerald-50/20 hover:bg-emerald-50/50 active:bg-emerald-50 dark:bg-transparent dark:hover:bg-surface-muted transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-black text-base shadow-xs">
                    ₹
                  </div>
                  <div className="text-left">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-xs font-black text-slate-900 block dark:text-content">Cash on Delivery (COD)</span>
                      <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-100 dark:bg-emerald-950/50 dark:text-emerald-300 px-1.5 py-0.2 rounded">Instant</span>
                    </div>
                    <span className="text-[10.5px] text-slate-500 font-medium dark:text-content-secondary">Pay cash or scan rider UPI QR code at doorstep</span>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 stroke-[2.5]" />
                </div>
              </button>
            </div>

            {/* Doorstep payment notice */}
            <div className="p-3 rounded-xl bg-slate-100/80 dark:bg-surface-muted border border-slate-200 dark:border-line-soft text-slate-600 dark:text-content-secondary text-[11px] leading-relaxed">
              💡 For fastest doorstep dispatch in Anantnag, all orders are processed via Cash on Delivery. You can hand cash or scan the rider&apos;s UPI QR code directly at delivery.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
