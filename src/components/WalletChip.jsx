import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, animate } from "framer-motion";
import { Wallet } from "lucide-react";
import DraggableSheet from "./ui/DraggableSheet";
import { useShopRules } from "../lib/useShopRules";
import { useWalletUsed, walletBalance, walletWelcomeSeen, markWalletWelcomeSeen } from "../lib/wallet";
import { hapticLight, hapticSuccess } from "../lib/haptics";

/* A rupee figure that counts up from 0 once, then stays put. */
function CountUp({ to, className }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (!to) return undefined;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(to);
      return undefined;
    }
    const controls = animate(0, to, { duration: 1.1, ease: "easeOut", delay: 0.25, onUpdate: (v) => setShown(Math.round(v)) });
    return () => controls.stop();
  }, [to]);
  return <span className={`tabular-nums ${className || ""}`}>₹{shown}</span>;
}

async function sprinkle() {
  try {
    const confetti = (await import("canvas-confetti")).default;
    const base = { particleCount: 34, spread: 62, startVelocity: 30, gravity: 0.9, ticks: 140, scalar: 0.8, disableForReducedMotion: true, colors: ["#FF5B00", "#FFB27A", "#FFFFFF", "#061838"], zIndex: 200 };
    confetti({ ...base, angle: 60, origin: { x: 0.1, y: 0.75 } });
    confetti({ ...base, angle: 120, origin: { x: 0.9, y: 0.75 } });
  } catch (e) {}
}

/**
 * The wallet button in the home header, left of the profile button, showing
 * what is left. The first time DASHit opens on a device it also opens the
 * wallet with a short welcome for the credit.
 */
export default function WalletChip({ size = "md" }) {
  const rules = useShopRules();
  const used = useWalletUsed();
  const [open, setOpen] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [mounted, setMounted] = useState(false);
  const balance = walletBalance(rules, used);
  const credit = rules.walletWelcomeAmount;

  useEffect(() => setMounted(true), []);

  /* First visit: open the welcome. The flag is saved when it opens (not before,
     so a development double-run can't use it up), and a second chip on the page
     finds it taken. */
  useEffect(() => {
    if (!mounted || !credit || walletWelcomeSeen()) return undefined;
    const timer = setTimeout(() => {
      if (walletWelcomeSeen()) return;
      markWalletWelcomeSeen();
      setCelebrate(true);
      setOpen(true);
      hapticSuccess();
      sprinkle();
    }, 900);
    return () => clearTimeout(timer);
  }, [mounted, credit]);

  if (!credit) return null;

  const close = () => {
    setOpen(false);
    setCelebrate(false);
  };

  const small = size === "sm";
  return (
    <>
      <motion.button
        type="button"
        onClick={() => {
          hapticLight();
          setCelebrate(false);
          setOpen(true);
        }}
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", stiffness: 420, damping: 26 }}
        aria-label={`Wallet, ₹${balance} left`}
        className={`inline-flex items-center gap-1.5 rounded-full border border-orange-200 bg-white/90 text-slate-900 font-extrabold shadow-2xs active:scale-95 transition-transform cursor-pointer dark:bg-surface-raised/90 dark:border-line dark:text-content ${
          small ? "h-9 pl-2.5 pr-3 text-[13px]" : "h-10 pl-3 pr-3.5 text-[13.5px]"
        }`}
      >
        <Wallet className="w-4 h-4 text-[#FF5B00] stroke-[2.4]" />
        <span className="tabular-nums">₹{balance}</span>
      </motion.button>

      {mounted &&
        createPortal(
          <DraggableSheet isOpen={open} onClose={close} zIndex="z-[160]">
            <div className="px-6 pt-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center">
              <motion.span
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 18, delay: 0.1 }}
                className="mx-auto w-16 h-16 rounded-2xl bg-[#FF5B00] text-white flex items-center justify-center"
              >
                <Wallet className="w-8 h-8 stroke-[2.2]" />
              </motion.span>

              <h2 className="mt-4 text-[22px] font-extrabold tracking-tight text-[#061838] dark:text-content">
                {celebrate ? `You got ₹${credit}!` : "Your wallet"}
              </h2>
              <p className="mt-1 text-[14px] text-slate-600 dark:text-content-secondary">
                {celebrate ? "A welcome gift from DASHit, just for you." : "Money you can spend on your orders."}
              </p>

              <div className="mt-5 rounded-2xl bg-slate-50 border border-slate-200 py-4 dark:bg-surface-muted dark:border-line">
                <p className="text-[12px] font-bold uppercase tracking-wider text-slate-500 dark:text-content-muted">Balance</p>
                {open && <CountUp key={String(open)} to={balance} className="block mt-0.5 text-[40px] leading-none font-black text-[#061838] dark:text-content" />}
              </div>

              <p className="mt-4 text-[13.5px] text-slate-600 dark:text-content-secondary">
                {balance > 0
                  ? `It comes off your bill by itself when you order, up to ₹${rules.walletMaxPerOrder} each time.`
                  : "You've used your wallet credit. Thanks for ordering with us!"}
              </p>

              <button
                type="button"
                onClick={close}
                className="mt-5 w-full h-12 rounded-xl bg-[#FF5B00] hover:bg-[#E04E00] text-white text-[15px] font-bold active:scale-[0.99] transition-colors"
              >
                {celebrate ? "Start shopping" : "Got it"}
              </button>
            </div>
          </DraggableSheet>,
          document.body
        )}
    </>
  );
}
