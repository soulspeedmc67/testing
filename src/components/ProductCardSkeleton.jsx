import React from "react";

/**
 * Loading placeholder for <ProductCard />.
 *
 * The box model here deliberately mirrors ProductCard exactly — same padding,
 * radius, border, aspect-square image well, and row rhythm — so swapping the
 * real card in causes zero layout shift.
 */
export default function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-2.5 flex flex-col justify-between shadow-[0_1px_3px_rgba(15,23,42,0.04)] relative overflow-hidden">
      {/* Image well — matches ProductCard's aspect-square container */}
      <div className="relative w-full aspect-square rounded-xl overflow-hidden border border-slate-100 animate-shimmer" />

      {/* Unit tag + ADD button row */}
      <div className="flex items-center justify-between mt-2.5">
        <div className="w-11 h-[18px] rounded-md animate-shimmer" />
        <div className="w-20 h-7 rounded-lg bg-orange-50/70 border border-orange-100/60" />
      </div>

      {/* Price, name, badge rows */}
      <div className="mt-1.5 space-y-1">
        <div className="w-14 h-[18px] rounded-md animate-shimmer" />
        <div className="w-full h-3 rounded animate-shimmer" />
        <div className="w-2/3 h-3 rounded animate-shimmer" />
        <div className="flex items-center justify-between pt-0.5">
          <div className="w-14 h-[15px] rounded-md animate-shimmer" />
          <div className="w-8 h-[15px] rounded-md animate-shimmer" />
        </div>
      </div>
    </div>
  );
}
