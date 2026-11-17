import React from "react";
import { Loader2 } from "lucide-react";

/**
 * The few building blocks the partner portal is made of, so every screen reads
 * as one product: calm white cards on a pale page, navy text, DASHit orange for
 * the one thing to do. Light only on purpose: it looks the same on every device.
 */

export const cx = (...parts) => parts.filter(Boolean).join(" ");

export function Card({ className = "", children, ...rest }) {
  return (
    <div className={cx("rounded-2xl bg-white ring-1 ring-slate-900/[0.06] shadow-[0_1px_2px_rgba(6,24,56,0.04),0_8px_24px_-12px_rgba(6,24,56,0.10)]", className)} {...rest}>
      {children}
    </div>
  );
}

export function SectionTitle({ title, hint, right }) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        <h1 className="text-[22px] sm:text-2xl font-extrabold tracking-tight text-[#061838]">{title}</h1>
        {hint && <p className="mt-1 text-sm text-slate-500 max-w-2xl">{hint}</p>}
      </div>
      {right}
    </div>
  );
}

const TONES = {
  ok: "bg-emerald-50 text-emerald-700 ring-emerald-600/15",
  low: "bg-amber-50 text-amber-700 ring-amber-600/20",
  out: "bg-rose-50 text-rose-700 ring-rose-600/15",
  hidden: "bg-slate-100 text-slate-600 ring-slate-500/15",
  info: "bg-sky-50 text-sky-700 ring-sky-600/15",
  brand: "bg-orange-50 text-[#C2410C] ring-orange-600/15",
  navy: "bg-[#061838] text-white ring-transparent",
};

export function Pill({ tone = "info", children, dot = false, className = "" }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ring-1 ring-inset whitespace-nowrap", TONES[tone] || TONES.info, className)}>
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}

export function Button({ variant = "primary", size = "md", busy = false, disabled, className = "", children, ...rest }) {
  const base = "inline-flex items-center justify-center gap-2 rounded-xl font-bold transition active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF5B00]/50 cursor-pointer";
  const sizes = { sm: "h-9 px-3.5 text-[13px]", md: "h-11 px-5 text-sm", lg: "h-12 px-6 text-[15px]" };
  const variants = {
    primary: "bg-[#FF5B00] text-white hover:bg-[#E85200] shadow-[0_6px_16px_-6px_rgba(255,91,0,0.7)]",
    navy: "bg-[#061838] text-white hover:bg-[#0A2558]",
    ghost: "bg-white text-slate-700 ring-1 ring-slate-300/80 hover:bg-slate-50",
    danger: "bg-white text-rose-600 ring-1 ring-rose-300/70 hover:bg-rose-50",
    soft: "bg-slate-100 text-slate-700 hover:bg-slate-200/70",
  };
  return (
    <button disabled={disabled || busy} className={cx(base, sizes[size], variants[variant], className)} {...rest}>
      {busy && <Loader2 className="w-4 h-4 animate-spin" />}
      {children}
    </button>
  );
}

export function Field({ label, hint, error, children, className = "" }) {
  return (
    <label className={cx("block", className)}>
      <span className="block text-[13px] font-bold text-slate-700 mb-1.5">{label}</span>
      {children}
      {error ? <span className="block mt-1.5 text-xs font-semibold text-rose-600">{error}</span> : hint ? <span className="block mt-1.5 text-xs text-slate-500">{hint}</span> : null}
    </label>
  );
}

export const inputCls =
  "w-full h-11 rounded-xl bg-white px-3.5 text-[15px] text-slate-900 placeholder:text-slate-400 ring-1 ring-slate-300/80 focus:ring-2 focus:ring-[#FF5B00] focus:outline-none transition";

export function Spinner({ label = "Loading" }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-slate-500">
      <Loader2 className="w-5 h-5 animate-spin text-[#FF5B00]" />
      <span className="text-sm font-semibold">{label}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, text, action }) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-14">
      {Icon && (
        <span className="w-14 h-14 rounded-2xl bg-orange-50 text-[#FF5B00] flex items-center justify-center mb-4">
          <Icon className="w-7 h-7" />
        </span>
      )}
      <h3 className="text-base font-extrabold text-[#061838]">{title}</h3>
      {text && <p className="mt-1.5 text-sm text-slate-500 max-w-sm">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** A figure with a label, for the top of a dashboard. */
export function Kpi({ icon: Icon, label, value, sub, tone = "navy" }) {
  const tones = {
    navy: "bg-[#061838]/[0.06] text-[#061838]",
    brand: "bg-orange-50 text-[#FF5B00]",
    green: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
  };
  return (
    <Card className="p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <span className="text-[13px] font-bold text-slate-500">{label}</span>
        {Icon && (
          <span className={cx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0", tones[tone])}>
            <Icon className="w-[18px] h-[18px]" />
          </span>
        )}
      </div>
      <div className="mt-2.5 text-[26px] sm:text-[28px] leading-none font-extrabold tracking-tight text-[#061838] tabular-nums">{value}</div>
      {sub && <div className="mt-2 text-xs font-semibold text-slate-500">{sub}</div>}
    </Card>
  );
}

/** Slide-in panel for forms: a drawer from the right on a wide screen, full height on a phone. */
export function Drawer({ open, title, onClose, children, footer }) {
  React.useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex justify-end">
      <div className="absolute inset-0 bg-[#061838]/50 backdrop-blur-[2px]" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={title} className="relative w-full sm:max-w-[480px] h-full bg-white shadow-2xl flex flex-col">
        <div className="flex items-center justify-between px-5 h-16 border-b border-slate-200/80 shrink-0">
          <h2 className="text-lg font-extrabold text-[#061838]">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="w-9 h-9 rounded-lg text-slate-500 hover:bg-slate-100 flex items-center justify-center cursor-pointer">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5">{children}</div>
        {footer && <div className="shrink-0 border-t border-slate-200/80 px-5 py-4 bg-white pb-[max(1rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}

/** A progress ring figure used for the delivery area. */
export function AreaDiagram({ km }) {
  const k = Math.max(0, Number(km) || 0);
  return (
    <svg viewBox="0 0 200 200" className="w-full h-full" role="img" aria-label={`Delivery area of ${k} kilometres`}>
      <defs>
        <radialGradient id="areaGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#FF5B00" stopOpacity="0.28" />
          <stop offset="1" stopColor="#FF5B00" stopOpacity="0.04" />
        </radialGradient>
      </defs>
      <circle cx="100" cy="100" r="92" fill="url(#areaGlow)" stroke="#FF5B00" strokeOpacity="0.55" strokeWidth="1.5" strokeDasharray="4 5" />
      <circle cx="100" cy="100" r="61" fill="none" stroke="#061838" strokeOpacity="0.14" strokeWidth="1" />
      <circle cx="100" cy="100" r="30" fill="none" stroke="#061838" strokeOpacity="0.14" strokeWidth="1" />
      <path d="M100 100 L168 54" stroke="#061838" strokeOpacity="0.5" strokeWidth="1.5" />
      <circle cx="100" cy="100" r="9" fill="#FF5B00" />
      <circle cx="100" cy="100" r="3.5" fill="#fff" />
      <text x="140" y="60" fontSize="15" fontWeight="800" fill="#061838" fontFamily="inherit">{k} km</text>
    </svg>
  );
}
