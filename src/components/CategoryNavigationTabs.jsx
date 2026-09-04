import { Utensils, Cookie, GlassWater, Croissant } from "lucide-react";

const CATEGORY_TABS = [
  { id: "All", label: "All", icon: null },
  { id: "Grocery", label: "Grocery & Kitchen", icon: Utensils, isNew: true },
  { id: "Snacks", label: "Snacks & Munchies", icon: Cookie },
  { id: "Drinks", label: "Drinks & Juices", icon: GlassWater },
  { id: "Bakery", label: "Bakery & Biscuits", icon: Croissant },
];

export default function CategoryNavigationTabs({ activeTab, onSelectTab }) {
  return (
    <div className="relative border-b border-slate-200/80 pt-1 pb-0 overflow-x-auto scrollbar-none">
      <div className="flex items-center space-x-5 px-1 min-w-max">
        {CATEGORY_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex items-center space-x-1.5 pb-2.5 text-xs font-extrabold transition-colors active:scale-95 ${
                isActive ? "text-[#061838] font-black" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {Icon && <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#FF5B00]" : "text-slate-400"}`} />}
              <span>{tab.label}</span>
              {tab.isNew && (
                <span className="bg-[#FF5B00] text-white font-black text-[8px] px-1.5 py-0.2 rounded-full uppercase tracking-wider ml-0.5 shadow-sm animate-pulse">
                  NEW
                </span>
              )}

              {/* Sliding Dark Active Underline */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#061838] rounded-full transition-all duration-300" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
