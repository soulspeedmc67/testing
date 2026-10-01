import React from "react";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import { Navigation, RotateCcw, Tag, Check } from "lucide-react";
import { stagger, fadeUp, inViewOnce } from "../lib/motion";

// Client-rendered Real Anantnag Map (zero API key, zero SSR hydration issues)
const LiveDeliveryMapPreview = dynamic(
  () => import("./features/LiveDeliveryMapPreview"),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-[210px] rounded-2xl bg-slate-100 dark:bg-slate-800/40 animate-pulse border border-slate-200/80 dark:border-slate-800" />
    ),
  }
);

/**
 * Visual for Section 2: 1-Tap Reorder Visual Card
 */
function QuickReorderCard() {
  const items = [
    { name: "3x Kashmiri Lavas", tag: "Baker's fresh", icon: "🥖" },
    { name: "1x Amul Taaza 500ml", tag: "Dairy cold", icon: "🥛" },
    { name: "6x Farm Fresh Eggs", tag: "Grade-A", icon: "🥚" },
  ];

  return (
    <div className="w-full h-[210px] rounded-2xl bg-slate-50/80 dark:bg-[#0c1017] border border-slate-200/80 dark:border-slate-800/90 p-4 flex flex-col justify-between select-none">
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.name}
            className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white dark:bg-[#12161F] border border-slate-200/60 dark:border-slate-800/80 shadow-2xs"
          >
            <div className="flex items-center gap-2">
              <span className="text-xs">{item.icon}</span>
              <span className="text-[12px] font-bold text-slate-800 dark:text-slate-200">
                {item.name}
              </span>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
              {item.tag}
            </span>
          </div>
        ))}
      </div>

      <div className="px-3 py-2 rounded-xl bg-[#061838] dark:bg-white text-white dark:text-[#061838] flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF5B00] animate-pulse" />
          <span className="text-[11px] font-extrabold tracking-tight">
            1-Tap Reorder Ready
          </span>
        </div>
        <span className="text-[11px] font-black text-[#FF5B00] dark:text-[#FF5B00]">
          ₹84
        </span>
      </div>
    </div>
  );
}

/**
 * Visual for Section 3: Fair Local Pricing & Order Pipeline
 */
function LocalPricingCard() {
  const steps = [
    { label: "Packed", done: true },
    { label: "On the way", active: true },
    { label: "At Doorstep", pending: true },
  ];

  return (
    <div className="w-full h-[210px] rounded-2xl bg-slate-50/80 dark:bg-[#0c1017] border border-slate-200/80 dark:border-slate-800/90 p-4 flex flex-col justify-between select-none">
      {/* Price Comparison */}
      <div className="bg-white dark:bg-[#12161F] rounded-xl p-3 border border-slate-200/60 dark:border-slate-800/80 shadow-2xs flex items-center justify-between">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
            Reshi Bazar
          </span>
          <span className="text-xs font-black text-slate-800 dark:text-white">
            ₹35 / loaf
          </span>
        </div>

        <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-extrabold">
          0% Markup
        </div>

        <div className="text-right">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#FF5B00] block">
            DASHit App
          </span>
          <span className="text-xs font-black text-[#FF5B00]">
            ₹35 / loaf
          </span>
        </div>
      </div>

      {/* Subtle Live Stage Indicator */}
      <div className="space-y-1.5 pt-2">
        <div className="relative flex items-center justify-between px-2">
          {/* Connector Line */}
          <div className="absolute left-6 right-6 top-2 h-0.5 bg-slate-200 dark:bg-slate-800 z-0">
            <div className="h-full bg-[#FF5B00] w-[60%]" />
          </div>

          {steps.map((st) => (
            <div key={st.label} className="relative z-10 flex flex-col items-center">
              {st.done ? (
                <div className="w-4 h-4 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                </div>
              ) : st.active ? (
                <div className="w-4 h-4 rounded-full bg-[#FF5B00] text-white flex items-center justify-center">
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                </div>
              ) : (
                <div className="w-3.5 h-3.5 rounded-full bg-slate-300 dark:bg-slate-800 border-2 border-white dark:border-[#12161F]" />
              )}
              <span
                className={`mt-1 text-[9.5px] font-bold ${
                  st.active
                    ? "text-[#FF5B00]"
                    : st.done
                    ? "text-slate-800 dark:text-slate-200"
                    : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {st.label}
              </span>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-center text-slate-500 dark:text-slate-400 font-medium">
          Zero surge pricing · Instant stage updates
        </p>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    n: "01",
    label: "Live route",
    title: "Watch the rider come to you",
    body: "From the moment your bag leaves the store, the map moves with the rider. Live on the order screen, no refreshing.",
    Icon: Navigation,
    Visual: LiveDeliveryMapPreview,
  },
  {
    n: "02",
    label: "Morning regulars",
    title: "Reorder in one tap",
    body: "Your morning batch of bread, milk and eggs is saved and sent again with a single tap, without building the cart from scratch.",
    Icon: RotateCcw,
    Visual: QuickReorderCard,
  },
  {
    n: "03",
    label: "Local prices",
    title: "The shop's price, nothing added",
    body: "What you pay in the app is what the shop charges in Anantnag. No surge pricing, no hidden fees, and a status update at every stage.",
    Icon: Tag,
    Visual: LocalPricingCard,
  },
];

export default function AppFeatureShowcase() {
  return (
    <section id="app-features" className="mt-8 sm:mt-12 scroll-mt-24">
      <motion.div variants={stagger(0.08)} {...inViewOnce}>
        <motion.div variants={fadeUp} className="max-w-2xl">
          <span className="inline-flex items-center gap-2.5">
            <span className="w-6 h-px bg-[#FF5B00]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#FF5B00]">
              Why the app
            </span>
          </span>
          <h2 className="mt-5 font-display text-[32px] sm:text-[44px] font-extrabold tracking-[-0.03em] leading-[1.06] text-[#061838] dark:text-white [text-wrap:balance]">
            Built for how Anantnag actually shops
          </h2>
          <p className="mt-5 max-w-xl text-[15.5px] leading-[1.7] text-slate-600 dark:text-slate-400 [text-wrap:pretty]">
            The app is quicker than the browser, remembers your regulars, and tells you
            where your order is without you asking.
          </p>
        </motion.div>
      </motion.div>

      <div className="mt-14 sm:mt-20 space-y-16 sm:space-y-24">
        {FEATURES.map(({ n, label, title, body, Icon, Visual }, index) => {
          const flipped = index % 2 === 1;
          return (
            <motion.div
              key={n}
              variants={stagger(0.1)}
              {...inViewOnce}
              className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center"
            >
              <motion.div
                variants={fadeUp}
                className={`lg:col-span-5 ${flipped ? "lg:order-2" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-10 h-10 rounded-xl bg-[#061838] dark:bg-[#1B2231] flex items-center justify-center">
                    <Icon className="w-[18px] h-[18px] stroke-[2.2] text-[#FF5B00]" aria-hidden="true" />
                  </span>
                  <span className="text-[12px] font-semibold tabular-nums text-slate-500 dark:text-slate-400">
                    {n} · {label}
                  </span>
                </div>
                <h3 className="mt-5 font-display text-[26px] sm:text-[34px] font-bold tracking-[-0.025em] leading-[1.1] text-[#061838] dark:text-white [text-wrap:balance]">
                  {title}
                </h3>
                <p className="mt-4 max-w-md text-[15px] leading-[1.7] text-slate-600 dark:text-slate-400 [text-wrap:pretty]">
                  {body}
                </p>
              </motion.div>

              <motion.div
                variants={fadeUp}
                className={`lg:col-span-7 ${flipped ? "lg:order-1" : ""}`}
              >
                <div className="rounded-[1.75rem] bg-[#F3EEE3] dark:bg-[#10151E] p-5 sm:p-10 flex items-center justify-center">
                  <div className="w-full max-w-md">
                    <Visual />
                  </div>
                </div>
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
