import React from "react";

/**
 * Loading placeholder for <ProductCard />.
 *
 * The box model here deliberately mirrors ProductCard exactly — same radius,
 * border, full-bleed aspect-square photo well, and padded content block below
 * it — so swapping the real card in causes zero layout shift.
 */
export default function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 flex flex-col overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.04)] relative dark:bg-surface-raised dark:border-line/80">
      {/* Photo well — full-bleed square, matching ProductCard */}
      <div className="relative w-full aspect-square animate-shimmer" />

      <div className="flex flex-col grow p-2.5">
        {/* Two name lines */}
        <div className="space-y-1">
          <div className="w-full h-3 rounded animate-shimmer" />
          <div className="w-2/3 h-3 rounded animate-shimmer" />
        </div>

        {/* Unit line */}
        <div className="w-11 h-[11px] rounded mt-1.5 animate-shimmer" />

        {/* Price + ADD row, pinned to the bottom like the real card */}
        <div className="flex items-end justify-between mt-auto pt-2">
          <div className="w-14 h-[18px] rounded-md animate-shimmer" />
          <div className="w-[70px] h-8 rounded-xl bg-orange-50/70 border border-orange-100/60" />
        </div>
      </div>
    </div>
  );
}
