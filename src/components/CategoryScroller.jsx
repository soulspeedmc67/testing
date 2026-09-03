import { Flame, Cookie, Apple, Croissant, Milk, Coffee } from "lucide-react";

export const CATEGORY_STRIP = [
  { id: "All", label: "All", icon: Flame },
  { id: "Snacks", label: "Snacks", icon: Cookie },
  { id: "Grocery", label: "Groceries", icon: Apple },
  { id: "Bakery", label: "Bakery", icon: Croissant },
  { id: "Dairy", label: "Dairy & Eggs", icon: Milk },
  { id: "Drinks", label: "Cold Drinks", icon: Coffee },
];

export default function CategoryScroller({ activeCategory = "All", onSelectCategory }) {
  return (
    <div className="w-full bg-[#FFFDF5] border-b border-amber-100/50 py-1.5">
      <div className="flex items-center space-x-5 overflow-x-auto scrollbar-none px-4 max-w-md mx-auto">
        {CATEGORY_STRIP.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory && onSelectCategory(cat.id)}
              className="flex flex-col items-center shrink-0 space-y-1 relative pb-1 group focus:outline-none select-none"
            >
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all ${
                  isActive
                    ? "bg-slate-900 text-white shadow-sm"
                    : "bg-white text-slate-700 border border-slate-200/90 group-hover:border-slate-400"
                }`}
              >
                <Icon className="w-4 h-4 stroke-[2.5]" />
              </div>
              <span
                className={`text-[10px] font-bold tracking-tight whitespace-nowrap transition-colors ${
                  isActive ? "text-slate-950 font-black" : "text-slate-600"
                }`}
              >
                {cat.label}
              </span>

              {/* Active Underline Pill */}
              {isActive && (
                <span className="absolute -bottom-0.5 w-4 h-1 bg-slate-900 rounded-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
