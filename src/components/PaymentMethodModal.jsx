import { useState } from "react";
import { ChevronDown, ChevronRight, CreditCard, Plus, AlertCircle, CheckCircle2, ArrowLeft } from "lucide-react";

import { hapticMedium } from "../lib/haptics";

export default function PaymentMethodModal({ isOpen, onClose, selectedMethod, onSelectMethod, grandTotal }) {
  if (!isOpen) return null;

  const handleSelect = (methodId, label) => {
    hapticMedium();
    onSelectMethod({ id: methodId, label });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] bg-slate-900/60 backdrop-blur-xs flex flex-col justify-end sm:items-center sm:justify-center">
      <div className="bg-slate-50 rounded-t-[32px] sm:rounded-3xl w-full max-w-md max-h-[90vh] flex flex-col overflow-hidden shadow-2xl border border-slate-200/80">
        {/* Top Header */}
        <div className="bg-white px-4 py-3.5 border-b border-slate-200 flex items-center space-x-3 sticky top-0 z-20">
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-700 hover:bg-slate-50 active:scale-90 transition-transform"
          >
            <ChevronDown className="w-5 h-5 stroke-[2.5]" />
          </button>
          <h1 className="font-extrabold text-base text-slate-900">
            Select Payment Method
          </h1>
        </div>

        {/* Scrollable Content matching media_1788424287625.png */}
        <div className="overflow-y-auto p-4 space-y-4 pb-10">
          {/* 1. RECOMMENDED */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-black text-slate-800 tracking-tight px-1">
              Recommended
            </h3>
            <div className="bg-white border border-slate-200/90 rounded-2xl divide-y divide-slate-100 shadow-2xs overflow-hidden">
              {/* Google Pay */}
              <button
                onClick={() => handleSelect("gpay", "Google Pay UPI")}
                className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 active:bg-orange-50/50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-center font-bold text-xs">
                    <span className="text-blue-500 font-black">G</span><span className="text-orange-500 font-black">P</span>
                  </div>
                  <span className="text-xs font-bold text-slate-900">Google Pay UPI</span>
                </div>
                {selectedMethod?.id === "gpay" ? (
                  <CheckCircle2 className="w-5 h-5 text-[#FF5B00] stroke-[2.5]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {/* PhonePe */}
              <button
                onClick={() => handleSelect("phonepe", "PhonePe UPI")}
                className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 active:bg-orange-50/50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-[#5f259f] text-white flex items-center justify-center font-bold text-xs">
                    पे
                  </div>
                  <span className="text-xs font-bold text-slate-900">PhonePe UPI</span>
                </div>
                {selectedMethod?.id === "phonepe" ? (
                  <CheckCircle2 className="w-5 h-5 text-[#FF5B00] stroke-[2.5]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {/* Amazon Pay */}
              <button
                onClick={() => handleSelect("amazonpay", "Amazon Pay UPI")}
                className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 active:bg-orange-50/50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-[#232F3E] text-[#FF5B00] flex items-center justify-center font-black text-[10px]">
                    pay
                  </div>
                  <span className="text-xs font-bold text-slate-900">Amazon Pay UPI</span>
                </div>
                {selectedMethod?.id === "amazonpay" ? (
                  <CheckCircle2 className="w-5 h-5 text-[#FF5B00] stroke-[2.5]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>
            </div>
          </div>

          {/* 2. CARDS */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-black text-slate-800 tracking-tight px-1">
              Cards
            </h3>
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-3 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-900">Add credit or debit cards</span>
                </div>
                <button
                  onClick={() => handleSelect("card", "Credit/Debit Card")}
                  className="text-xs font-black text-[#FF5B00] px-3 py-1 rounded-lg border border-orange-200 hover:bg-orange-50 active:scale-95"
                >
                  ADD
                </button>
              </div>

              {/* Pluxee */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between opacity-60">
                  <div className="flex items-center space-x-3">
                    <span className="px-2 py-0.5 rounded-md border border-slate-300 text-[10px] font-black text-slate-700">
                      pluxee
                    </span>
                    <span className="text-xs font-bold text-slate-500">Pluxee</span>
                  </div>
                </div>
                <div className="mt-2 bg-rose-50/90 border border-rose-200/70 rounded-xl p-2.5">
                  <p className="text-[11px] font-semibold text-rose-600 leading-snug">
                    This payment method is not applicable on orders containing non-food items
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 3. PAY BY ANY UPI APP */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-black text-slate-800 tracking-tight px-1">
              Pay by any UPI app
            </h3>
            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 flex items-center justify-between shadow-2xs">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#FF5B00] flex items-center justify-center font-black text-[10px]">
                  UPI
                </div>
                <span className="text-xs font-bold text-slate-900">Add new UPI ID</span>
              </div>
              <button
                onClick={() => handleSelect("upi_custom", "UPI ID")}
                className="text-xs font-black text-[#FF5B00] px-3 py-1 rounded-lg border border-orange-200 hover:bg-orange-50 active:scale-95"
              >
                ADD
              </button>
            </div>
          </div>

          {/* 4. WALLETS & COD */}
          <div className="space-y-1.5">
            <h3 className="text-xs font-black text-slate-800 tracking-tight px-1">
              Wallets & Others
            </h3>
            <div className="bg-white border border-slate-200/90 rounded-2xl divide-y divide-slate-100 shadow-2xs overflow-hidden">
              <button
                onClick={() => handleSelect("cod", "Cash on Delivery (COD)")}
                className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 active:bg-orange-50/50 transition-colors"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold text-xs">
                    ₹
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-bold text-slate-900 block">Cash on Delivery</span>
                    <span className="text-[10px] text-slate-500 font-medium">Pay cash directly at doorstep</span>
                  </div>
                </div>
                {selectedMethod?.id === "cod" ? (
                  <CheckCircle2 className="w-5 h-5 text-[#FF5B00] stroke-[2.5]" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-slate-400" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
