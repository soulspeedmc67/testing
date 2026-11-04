import { motion } from "framer-motion";
import { Flame, Home, Utensils, Carrot, Apple, Drumstick, Milk, Tag } from "lucide-react";
import { useRouter } from "next/router";
import { hapticLight } from "../lib/haptics";
import { SPRING_SNAPPY, TAP_FIRM } from "../lib/motion";

export const CATEGORY_STRIP = [
  { id: "All", label: "All", icon: Flame },
  { id: "Offers", label: "Offers", icon: Tag, route: "/offers", highlight: true },
  { id: "Home Care", label: "Home Care", icon: Home },
  { id: "Kitchen Care", label: "Kitchen Care", icon: Utensils },
  { id: "Vegetables", label: "Vegetables", icon: Carrot },
  { id: "Fresh Fruits", label: "Fresh Fruits", icon: Apple },
  { id: "Chicken", label: "Chicken", icon: Drumstick },
  { id: "Dairy", label: "Dairy", icon: Milk },
];

/** `categories` replaces the fixed strip with the shop's real aisles: [{ id, label, icon }]. */
export default function CategoryScroller({ activeCategory = "All", onSelectCategory, categories, golden = false }) {
  const router = useRouter();
  const strip = categories && categories.length > 0 ? categories : CATEGORY_STRIP;

  return (
    <div className={`w-full pt-2 pb-2 transition-colors duration-500 ${golden ? "bg-transparent" : "bg-[#FFFDF5] dark:bg-surface-raised"}`}>
      <div className="flex items-center space-x-5 overflow-x-auto scrollbar-none px-4 sm:px-6 lg:px-8 max-w-md md:max-w-none mx-auto scroll-smooth pt-1 pb-1">
        {strip.map((cat) => {
          const Icon = cat.icon;
          const isActive = activeCategory === cat.id;

          /* The spotlight tab (src/lib/spotlight.js): a gold tile with a light
             sweeping across it, so it stands out from the plain aisles. */
          if (cat.special) {
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
                aria-pressed={isActive}
                className="flex flex-col items-center shrink-0 space-y-1 relative pt-0.5 pb-1 focus:outline-none select-none cursor-pointer"
              >
                <div
                  className={`spot-glow relative w-9 h-9 rounded-2xl overflow-hidden flex items-center justify-center bg-gradient-to-br from-[#FFE680] via-[#FFC21A] to-[#E89B00] border border-[#FFF3B0]/80 ${
                    isActive ? "scale-110 ring-2 ring-[#E0A200]/40" : ""
                  } transition-transform duration-300`}
                >
                  <Icon className="relative z-10 w-4 h-4 stroke-[2.6] text-[#4A2E00]" />
                  <span className="spot-sheen absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-white/80 to-transparent" aria-hidden="true" />
                </div>
                <span className="text-[10px] tracking-tight whitespace-nowrap font-black bg-gradient-to-r from-[#B26B00] via-[#E39B00] to-[#B26B00] bg-clip-text text-transparent dark:from-[#FFD45C] dark:via-[#FFF0A8] dark:to-[#FFD45C]">
                  {cat.label}
                </span>
                {isActive && (
                  <motion.span
                    layoutId="categoryUnderline"
                    className="absolute -bottom-0.5 w-4 h-1 bg-[#E0A200] rounded-full"
                    transition={{ type: "spring", stiffness: 260, damping: 24 }}
                  />
                )}
              </motion.button>
            );
          }

          return (
            <motion.button
              key={cat.id}
              whileTap={TAP_FIRM}
              transition={SPRING_SNAPPY}
              onClick={(e) => {
                hapticLight();
                /* Offers is a destination, not a filter — it opens its own screen. */
                if (cat.route) {
                  router.push(cat.route);
                  return;
                }
                e.currentTarget.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
                if (onSelectCategory) onSelectCategory(cat.id);
              }}
              className="flex flex-col items-center shrink-0 space-y-1 relative pt-0.5 pb-1 group focus:outline-none select-none cursor-pointer"
            >
              <div
                className={`w-9 h-9 rounded-2xl flex items-center justify-center transition-all duration-300 ${
                  cat.highlight
                    ? "bg-[#FF5B00] text-white"
                    : isActive
                    ? "bg-[#061838] text-white shadow-sm ring-2 ring-[#061838]/10 scale-105 dark:bg-[#FF5B00] dark:ring-[#FF5B00]/25"
                    : "bg-white text-slate-700 border border-slate-200/90 group-hover:border-slate-400 dark:bg-surface-muted dark:border-line dark:text-content-secondary dark:group-hover:border-line-strong"
                } dark:border-line/90`}
              >
                <Icon className={`w-4 h-4 ${cat.highlight || isActive ? "stroke-[2.8] text-white" : "stroke-[2.2] text-slate-700 dark:text-content-secondary"}`} />
              </div>
              <span
                className={`text-[10px] tracking-tight whitespace-nowrap transition-colors duration-300 ${
                  cat.highlight
                    ? "text-[#C2410C] font-black dark:text-[#FF5B00]"
                    : isActive
                    ? "text-[#061838] font-black dark:text-white"
                    : "text-slate-600 font-semibold dark:text-content-secondary"
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
