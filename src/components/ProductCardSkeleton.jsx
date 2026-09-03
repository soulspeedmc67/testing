import React from "react";

export default function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-2.5 flex flex-col justify-between shadow-2xs relative overflow-hidden animate-pulse">
      {/* Shimmer overlay */}
      <div className="relative w-full aspect-square bg-slate-100 rounded-xl overflow-hidden flex items-center justify-center">
        <div className="w-12 h-12 rounded-full bg-slate-200/70" />
      </div>

      {/* Stepper / Unit row */}
      <div className="flex items-center justify-between mt-2.5">
        <div className="w-9 h-3.5 bg-slate-200 rounded-md" />
        <div className="w-16 h-7 bg-emerald-50 rounded-lg border border-emerald-100/60" />
      </div>

      {/* Price & Name */}
      <div className="mt-2 space-y-1.5">
        <div className="w-14 h-4 bg-slate-200 rounded" />
        <div className="w-full h-3 bg-slate-100 rounded" />
        <div className="w-2/3 h-3 bg-slate-100 rounded" />
      </div>
    </div>
  );
}
