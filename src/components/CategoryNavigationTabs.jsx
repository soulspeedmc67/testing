import { Sparkles, Zap, Gift, Smartphone, Heart } from "lucide-react";

const CATEGORY_TABS = [
  { id: "All", label: "All", icon: null },
  { id: "Ganeshotsav", label: "Ganeshotsav", icon: Sparkles, isNew: true },
  { id: "Electronics", label: "Electronics", icon: Smartphone },
  { id: "Beauty", label: "Beauty", icon: Heart },
  { id: "Gifting", label: "Gifting", icon: Gift },
];

export default function CategoryNavigationTabs({ activeTab, onSelectTab }) {
  return (
    <div className="relative border-b border-slate-200/80 pt-1 pb-0 overflow-x-auto scrollbar-none">
      <div className="flex items-center space-x-6 px-1 min-w-max">
        {CATEGORY_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`relative flex items-center space-x-1.5 pb-2.5 text-xs font-extrabold transition-colors active:scale-95 ${
                isActive ? "text-slate-900 font-black" : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {Icon && <Icon className={`w-3.5 h-3.5 ${isActive ? "text-[#0c831f]" : "text-slate-400"}`} />}
              <span>{tab.label}</span>
              {tab.isNew && (
                <span className="bg-rose-500 text-white font-black text-[8px] px-1.5 py-0.2 rounded-full uppercase tracking-wider ml-0.5 shadow-sm animate-pulse">
                  NEW
                </span>
              )}

              {/* Sliding Dark Active Underline */}
              {isActive && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-slate-900 rounded-full transition-all duration-300" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
