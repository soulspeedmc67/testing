import { motion } from "framer-motion";
import Link from "next/link";
import { ShoppingBag, Search, ArrowRight } from "lucide-react";

export function EmptyCartState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="bg-white border border-slate-200/90 rounded-3xl p-8 text-center space-y-4 shadow-sm"
    >
      <motion.div
        animate={{ y: [0, -6, 0] }}
        transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
        className="w-16 h-16 bg-emerald-50 text-[#0c831f] rounded-3xl flex items-center justify-center mx-auto shadow-sm"
      >
        <ShoppingBag className="w-8 h-8 stroke-[2]" />
      </motion.div>
      <div>
        <h3 className="font-black text-base text-slate-900 tracking-tight">Your cart is empty</h3>
        <p className="text-xs text-slate-400 mt-1 font-medium max-w-xs mx-auto">
          Explore fresh groceries, Kashmiri bakery, and snacks delivered in 10 minutes.
        </p>
      </div>
      <Link
        href="/"
        className="inline-flex items-center space-x-1.5 bg-[#0c831f] hover:bg-emerald-800 text-white font-extrabold text-xs px-5 py-3 rounded-2xl shadow-sm transition-all active:scale-95"
      >
        <span>Browse Products</span>
        <ArrowRight className="w-4 h-4" />
      </Link>
    </motion.div>
  );
}

const SUGGESTED_SEARCH_CHIPS = ["Milk", "Lavas Bread", "Chips", "Apples", "Silk Chocolate", "Butter"];

export function EmptySearchState({ query = "", onSelectChip }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="bg-white border border-slate-200/90 rounded-3xl p-6 text-center space-y-4 shadow-sm"
    >
      <motion.div
        animate={{ rotate: [0, -8, 8, 0] }}
        transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        className="w-14 h-14 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm"
      >
        <Search className="w-7 h-7 stroke-[2]" />
      </motion.div>
      <div>
        <h3 className="font-black text-sm text-slate-900 tracking-tight">No products found</h3>
        <p className="text-xs text-slate-400 mt-1 font-medium max-w-xs mx-auto">
          We couldn&apos;t find anything matching &quot;<b className="text-slate-700">{query}</b>&quot;.
        </p>
      </div>

      <div className="pt-2">
        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-2">
          Try Searching For
        </span>
        <div className="flex flex-wrap justify-center gap-1.5">
          {SUGGESTED_SEARCH_CHIPS.map((chip, idx) => (
            <motion.button
              key={idx}
              whileTap={{ scale: 0.94 }}
              onClick={() => onSelectChip && onSelectChip(chip)}
              className="bg-slate-50 hover:bg-emerald-50 text-slate-700 hover:text-[#0c831f] border border-slate-200 text-xs font-bold px-3 py-1.5 rounded-full transition-colors"
            >
              {chip}
            </motion.button>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
