import { motion } from "framer-motion";
import { Flame, Cookie, Apple, Croissant, Milk, Coffee, Sparkles, Utensils, Heart, Home, Package } from "lucide-react";
import { hapticLight } from "../lib/haptics";
import { SPRING_SNAPPY, TAP_FIRM } from "../lib/motion";

export const CATEGORY_STRIP = [
  { id: "All", label: "All", icon: Flame },
  { id: "Snacks", label: "Snacks", icon: Cookie },
  { id: "Beverages", label: "Beverages", icon: Coffee },
  { id: "Dairy", label: "Dairy & Eggs", icon: Milk },
  { id: "Instant Food", label: "Instant Food", icon: Utensils },
  { id: "Vegetables", label: "Vegetables", icon: Apple },
  { id: "Fruits", label: "Fruits", icon: Apple },
  { id: "Staples", label: "Staples & Atta", icon: Package },
  { id: "Spices", label: "Spices", icon: Sparkles },
  { id: "Personal Care", label: "Personal Care", icon: Heart },
  { id: "Household Items", label: "Household", icon: Home },
  { id: "Bakery", label: "Bakery", icon: Croissant },
];

export default function CategoryScroller({ activeCategory = "All", onSelectCategory }) {
  return (
    <div className="w-full bg-[#FFFDF5] border-b border-amber-100/50 pt-2 pb-2">
      <div className="flex items-center space-x-5 overflow-x-auto scrollbar-none px-4 max-w-md mx-auto scroll-smooth pt-1 pb-1">
        {CATEGORY_STRIP.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;

          return (
            <motion.button
              key={cat.id}
              whileTap={TAP_FIRM}
              transition={SPRING_SNAPPY}
              onClick={(e) => {
                hapticLight();
                e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                if (onSelectCategory) onSelectCategory(cat.id);
              }}
              className="flex flex-col items-center shrink-0 space-y-1 relative pt-0.5 pb-1 group focus:outline-none select-none cursor-pointer"
            >
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                  isActive
                    ? "bg-[#061838] text-white shadow-sm ring-2 ring-[#061838]/10 scale-105"
                    : "bg-white text-slate-700 border border-slate-200/90 group-hover:border-slate-400"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "stroke-[2.8] text-white" : "stroke-[2.2] text-slate-700"}`} />
              </div>
              <span
                className={`text-[10px] tracking-tight whitespace-nowrap transition-colors duration-300 ${
                  isActive ? "text-[#061838] font-black" : "text-slate-600 font-semibold"
                }`}
              >
                {cat.label}
              </span>

              {/* Active Underline Pill with Dashit Orange */}
              {isActive && (
                <motion.span
                  layoutId="categoryUnderline"
                  className="absolute -bottom-0.5 w-4 h-1 bg-[#FF5B00] rounded-full shadow-[0_1px_4px_rgba(255, 91, 0,0.4)]"
                  transition={{ type: "spring", stiffness: 260, damping: 24 }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
