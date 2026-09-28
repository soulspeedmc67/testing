import { useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { Ban, BadgeCheck } from "lucide-react";
import { useBodyScrollLock } from "../lib/useBodyScrollLock";
import { SPRING_SNAPPY } from "../lib/motion";

/*
 * The statements the shopper confirms. The first two are the COTPA 2003 §6
 * conditions (no sale under 18, none near an educational institution); the
 * third is the ID check at delivery that Google Play names as the safeguard
 * for tobacco in grocery apps.
 */
const DECLARATIONS = [
  {
    icon: Ban,
    tone: "danger",
    text: "You are 18 or older (or the higher legal age in your area) and not buying tobacco on behalf of anyone underage.",
  },
  {
    icon: Ban,
    tone: "danger",
    text: "Your delivery location is not in or around a school or college premises.",
  },
  {
    icon: BadgeCheck,
    tone: "neutral",
    text: "You will show a government photo ID at the door. Our rider cannot hand over tobacco without age proof.",
  },
];

/**
 * "Please make sure…" — the declaration before any tobacco is shown or added.
 * Stateless: AgeGateProvider owns when it opens and what each answer does.
 */
export default function TobaccoDeclarationSheet({ isOpen, onConfirm, onCancel, onReadTerms }) {
  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onCancel]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[130] flex items-end sm:items-center justify-center sm:p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onCancel}
            className="fixed inset-0 bg-slate-950/60"
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="tobacco-declaration-title"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={SPRING_SNAPPY}
            className="relative z-10 w-full max-w-md bg-white rounded-t-[28px] sm:rounded-[28px] shadow-2xl dark:bg-surface-raised dark:border dark:border-line"
            style={{ paddingBottom: "max(1.25rem, calc(0.75rem + env(safe-area-inset-bottom, 0px)))" }}
          >
            <div className="sm:hidden flex justify-center pt-2.5">
              <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-line-strong" />
            </div>

            <h2
              id="tobacco-declaration-title"
              className="px-5 pt-4 pb-4 text-[19px] font-black tracking-tight text-[#061838] dark:text-content"
            >
              Please make sure…
            </h2>

            <div className="border-t border-slate-100 dark:border-line-soft" />

            <ul className="px-5 pt-5 space-y-4">
              {DECLARATIONS.map(({ icon: Icon, tone, text }) => (
                <li key={text} className="flex items-start gap-3.5">
                  <span
                    className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center ${
                      tone === "danger"
                        ? "bg-red-50 text-red-500 dark:bg-surface-muted dark:text-red-400"
                        : "bg-slate-100 text-slate-500 dark:bg-surface-muted dark:text-content-secondary"
                    }`}
                  >
                    <Icon className="w-5 h-5" strokeWidth={2.25} aria-hidden="true" />
                  </span>
                  <p className="text-[13.5px] leading-snug text-slate-600 pt-0.5 dark:text-content-secondary">{text}</p>
                </li>
              ))}
            </ul>

            <div className="px-5 mt-5">
              <p className="text-[12.5px] leading-snug text-slate-500 dark:text-content-muted">
                Orders that break these rules are cancelled, and we are bound to report the account.
              </p>
              <Link
                href="/terms#tobacco"
                onClick={onReadTerms}
                className="inline-block mt-2.5 text-[13px] font-bold text-[#FF5B00] underline-offset-2 hover:underline"
              >
                Read terms and conditions
              </Link>
            </div>

            <div className="px-5 mt-5 space-y-2.5">
              <motion.button
                type="button"
                whileTap={{ scale: 0.98 }}
                onClick={onConfirm}
                className="w-full h-[52px] rounded-2xl bg-[#FF5B00] hover:bg-[#E04E00] text-white font-extrabold text-[15px] tracking-tight transition-colors cursor-pointer"
              >
                Yes, I confirm
              </motion.button>
              <button
                type="button"
                onClick={onCancel}
                className="w-full h-[52px] rounded-2xl border border-slate-200 text-slate-700 font-bold text-[15px] hover:bg-slate-50 transition-colors cursor-pointer dark:border-line-strong dark:text-content dark:hover:bg-surface-muted"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
