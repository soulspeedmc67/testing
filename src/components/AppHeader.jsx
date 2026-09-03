import { useRouter } from "next/router";
import { Search, Mic, ChevronDown, Store } from "lucide-react";

export default function AppHeader({
  location = { nickname: "HOME", address: "b-3,jamia appqrtment, Anantnag" },
  onOpenLocation,
  searchQuery = "",
  onSearchChange,
  isSearchClickable = true,
  hideStickySearch = false,
  children
}) {
  const router = useRouter();

  const handleSearchClick = () => {
    if (isSearchClickable) {
      router.push("/search");
    }
  };

  return (
    <header className="w-full bg-[#FFFDF5]">
      {/* 1. TOP DELIVERY ROW (Natural flow: smoothly scrolls away with zero layout jitter) */}
      <div className="max-w-md mx-auto px-4 pt-[max(10px,env(safe-area-inset-top,10px))] pb-2">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block leading-tight">
              Dashit in
            </span>
            <div className="flex items-center space-x-2">
              <h1 className="text-[28px] font-black tracking-tight text-slate-900 leading-none">
                8 minutes
              </h1>
              <span className="inline-flex items-center space-x-1 bg-sky-50 text-sky-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-sky-200">
                <Store className="w-2.5 h-2.5 stroke-[2.5] shrink-0" />
                <span>870 m away</span>
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => router.push("/account")}
            className="w-9 h-9 rounded-full bg-orange-500 text-white font-black text-xs flex items-center justify-center shadow-sm active:scale-95 transition-transform"
          >
            AA
          </button>
        </div>

        {/* Location selector with iOS text blur reveal */}
        <button
          type="button"
          onClick={onOpenLocation}
          className="flex items-center space-x-1 text-slate-800 text-left group active:opacity-75 transition-opacity pt-1.5"
        >
          <span className="font-black text-xs text-slate-900 uppercase tracking-tight">
            {location.nickname || "HOME"}
          </span>
          <span className="text-slate-400 font-bold text-xs">-</span>
          <span
            key={location.address}
            className="text-xs text-slate-600 font-semibold truncate max-w-[220px] animate-ios-blur"
          >
            {location.address || "Select your delivery address"}
          </span>
          <ChevronDown className="w-3.5 h-3.5 stroke-[2.5] text-slate-500 group-hover:translate-y-0.5 transition-transform" />
        </button>
      </div>

      {/* 2. OPTIONAL STICKY SEARCH BAR (When rendered standalone) */}
      {!hideStickySearch && (
        <div className="sticky top-0 z-40 bg-[#FFFDF5]/98 backdrop-blur-xl border-b border-amber-100/60 shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
          <div className="max-w-md mx-auto px-4 pt-1.5 pb-2">
            <div
              onClick={handleSearchClick}
              className="relative flex items-center bg-white text-slate-900 rounded-2xl px-3.5 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-200/90 cursor-pointer active:scale-[0.99] transition-transform"
            >
              <Search className="w-4 h-4 stroke-[2.5] text-slate-400 mr-2.5 shrink-0" />
              <input
                type="text"
                placeholder="Search for atta, dal, coke and more"
                value={searchQuery}
                onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                readOnly={isSearchClickable}
                className="w-full bg-transparent text-xs font-semibold text-slate-900 focus:outline-none placeholder-slate-400 cursor-pointer"
              />
              <Mic className="w-4 h-4 stroke-[2.5] text-slate-500 ml-2 shrink-0 hover:text-[#0c831f] transition-colors" />
            </div>
          </div>

          {/* Embedded Sticky Scroller */}
          {children}
        </div>
      )}
    </header>
  );
}
