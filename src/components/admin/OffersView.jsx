import React, { useState } from "react";
import {
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Tag,
  ExternalLink
} from "lucide-react";

export default function OffersView({
  exclusiveOffers = [],
  onOpenOfferModal,
  onDeleteOffer,
  darkMode = false,
}) {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div
        className={`p-4 rounded-2xl border flex items-center justify-between flex-wrap gap-3 transition-colors ${
          darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
        }`}
      >
        <div>
          <h2 className="text-base font-black text-slate-900 dark:text-white flex items-center space-x-2">
            <span>Storefront Banner Drops</span>
            <span className="text-xs font-mono font-bold text-slate-400">
              ({exclusiveOffers.length} offers)
            </span>
          </h2>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Top promo hero cards displayed on the customer mobile app home feed.
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
            No banner offers active. Click &quot;New Banner Offer&quot; to publish one.
          </div>
        ) : (
          exclusiveOffers.map((off) => (
            <div
              key={off.id}
              className="rounded-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden shadow-xs bg-slate-950 text-white flex flex-col justify-between p-4 relative min-h-[170px]"
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}
