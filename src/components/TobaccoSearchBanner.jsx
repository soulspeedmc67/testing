import { motion } from "framer-motion";
import { PLAIN_PACK_IMG } from "../lib/tobacco";

/**
 * Shown in search when the query is for tobacco. Nothing restricted is named
 * or listed here: one plain card, and "View items" goes through the age
 * declaration before the /tobacco section shows a single product. Kept quiet
 * on purpose: no bright banner, since tobacco can't be advertised (COTPA) or
 * featured (Google Play).
 */
export default function TobaccoSearchBanner({ query, showNoResults = false, onViewItems }) {
  return (
    <div className="space-y-3">
      {showNoResults && (
        <h3 className="text-base font-black text-slate-900 tracking-tight pt-1 dark:text-content">
          No results for &ldquo;{query}&rdquo;
        </h3>
      )}

      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 30 }}
        className="flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-3.5 dark:bg-surface-raised dark:border-line"
      >
        <img
          src={PLAIN_PACK_IMG}
          alt=""
          aria-hidden="true"
          className="w-12 h-12 rounded-xl object-cover shrink-0"
        />
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-bold text-slate-900 leading-snug dark:text-content">
            Looking for tobacco products?
          </p>
          <p className="mt-0.5 text-[11.5px] leading-snug text-slate-500 dark:text-content-muted">
            Caution: Tobacco products are injurious to health
          </p>
        </div>
        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={onViewItems}
          className="shrink-0 h-9 px-3.5 rounded-full bg-[#FF5B00] text-white font-bold text-[13px] cursor-pointer"
        >
          View items
        </motion.button>
      </motion.div>
    </div>
  );
}
