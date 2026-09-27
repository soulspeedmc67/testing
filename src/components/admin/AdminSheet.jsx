import React, { useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";

/**
 * A bottom sheet for the admin console: slides up from the bottom edge (on a
 * wide screen it stays a centred card at the bottom), with a dimmed backdrop
 * that closes it.
 */
export default function AdminSheet({ open, onClose, labelledBy, darkMode = false, children }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[150] flex items-end justify-center">
          <motion.div
            className="absolute inset-0 bg-black/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => onClose?.()}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={labelledBy}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 40, mass: 0.9 }}
            className={`relative w-full sm:max-w-md max-h-[88vh] flex flex-col rounded-t-3xl sm:rounded-3xl sm:mb-6 shadow-2xl ${
              darkMode ? "bg-[#14161E] border-t border-zinc-800" : "bg-white"
            }`}
          >
            <span className="mx-auto mt-2.5 mb-1 block h-1 w-10 shrink-0 rounded-full bg-slate-300 dark:bg-zinc-700" />
            {children}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
