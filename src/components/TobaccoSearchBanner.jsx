import { motion } from "framer-motion";
import { PLAIN_PACK_IMG } from "../lib/tobacco";

/**
 * Shown in search when the query is for tobacco. Nothing restricted is listed
 * here: the rows and the banner both route through the age declaration before
 * the /tobacco section shows a single product.
 */
export default function TobaccoSearchBanner({ query, matches = [], showNoResults = false, onViewItems }) {
  const rows = matches.slice(0, 4);

  return (
    <div className="space-y-3">
      {rows.length > 0 && (
        <ul className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden divide-y divide-slate-100 shadow-sm dark:bg-surface-raised dark:border-line/90 dark:divide-line-soft">
          {rows.map((p) => (
            <li key={String(p.id || p.barcode || p.name)}>
              <button
                type="button"
                onClick={onViewItems}
                className="w-full flex items-center gap-3 px-3.5 py-2.5 text-left active:bg-slate-50 dark:active:bg-white/[0.04] cursor-pointer"
              >
                <img
                  src={PLAIN_PACK_IMG}
                  alt=""
                  aria-hidden="true"
                  className="w-10 h-10 rounded-xl object-cover border border-slate-200/80 dark:border-line"
                />
                <span className="text-sm font-bold text-slate-800 truncate dark:text-content">{p.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {showNoResults && (
        <h3 className="text-base font-black text-slate-900 tracking-tight pt-1 dark:text-content">
          No results for &ldquo;{query}&rdquo;
        </h3>
      )}

      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#FFE8A3] via-[#FFD766] to-[#FFC53D] text-[#1C1708] min-h-[176px]"
      >
        <img
          src="/art/tobacco-banner.svg"
          alt=""
          aria-hidden="true"
          className="absolute -right-4 -bottom-2 h-full w-auto pointer-events-none select-none"
        />
        <div className="relative p-5 pr-[44%]">
          <h3 className="text-[20px] leading-[1.12] font-black tracking-tight">
            Looking for tobacco products?
          </h3>
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={onViewItems}
            className="mt-3.5 h-10 px-5 rounded-xl bg-[#061838] text-white font-extrabold text-sm shadow-sm cursor-pointer"
          >
            View items
          </motion.button>
          <p className="mt-3 text-[11.5px] leading-snug font-semibold text-[#4A3F1C]">
            Caution: Tobacco products are injurious to health
          </p>
        </div>
      </motion.div>
    </div>
  );
}
