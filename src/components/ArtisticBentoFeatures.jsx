import { motion } from "framer-motion";
import { Navigation, RotateCcw, Tag, Bell } from "lucide-react";
import { stagger, fadeUp, inViewOnce, EASE_OUT } from "../lib/motion";

/**
 * The landing page's feature section.
 *
 * Four things the app does, stated plainly. The lead card carries a single
 * quiet illustration of the live route; the rest are text. There are no
 * invented metrics, no simulated dashboards and no decorative badges — the
 * section has to read like a product page, not a demo reel.
 */

const FEATURES = [
  {
    Icon: RotateCcw,
    title: "Reorder in one tap",
    body: "Your morning batch — lavas, milk, eggs — saved and re-sent without building the cart again.",
  },
  {
    Icon: Tag,
    title: "Local prices, no markup",
    body: "What you pay in the app is what the shop charges in Anantnag. No surge pricing, no hidden fees.",
  },
  {
    Icon: Bell,
    title: "Order updates as they happen",
    body: "Packed, picked up, on the way, arriving — each stage reaches your phone the moment it changes.",
  },
];

export default function AppFeatureShowcase() {
  return (
    <section id="app-features" className="mt-24 sm:mt-32 scroll-mt-24">
      <motion.div variants={stagger(0.07)} {...inViewOnce}>
        <motion.div variants={fadeUp} className="max-w-2xl">
          <span className="inline-flex items-center gap-2.5">
            <span className="w-6 h-px bg-[#FF5B00]" />
            <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#FF5B00]">
              Why the app
            </span>
          </span>
          <h2 className="mt-5 text-3xl sm:text-[40px] font-black tracking-[-0.03em] leading-[1.1] text-[#061838] dark:text-white">
            Built for how Anantnag actually shops
          </h2>
          <p className="mt-4 text-[15px] leading-relaxed text-slate-600 dark:text-slate-400">
            The app is quicker than the browser, remembers your regulars, and tells you
            where your order is without you asking.
          </p>
        </motion.div>

        <div className="mt-12 grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Lead card — live tracking */}
          <motion.div
            variants={fadeUp}
            className="lg:col-span-7 rounded-3xl bg-white dark:bg-[#12161F] border border-slate-200/90 dark:border-slate-800 p-7 sm:p-9 flex flex-col"
          >
            <span className="w-11 h-11 rounded-2xl bg-[#061838] dark:bg-[#1B2231] text-white flex items-center justify-center">
              <Navigation className="w-[19px] h-[19px] stroke-[2.2]" />
            </span>

            <h3 className="mt-6 text-xl sm:text-2xl font-black tracking-tight text-[#061838] dark:text-white">
              Watch the rider come to you
            </h3>
            <p className="mt-3 max-w-md text-[14px] leading-relaxed text-slate-600 dark:text-slate-400">
              From the moment your bag leaves the store, the map moves with the rider —
              live, on the order screen, no refreshing.
            </p>

            {/* A single quiet line drawing of the route */}
            <div className="mt-8 flex-1 min-h-[168px] rounded-2xl bg-[#FBFAF7] dark:bg-[#0C1017] border border-slate-200/80 dark:border-slate-800 overflow-hidden relative">
              <svg
                viewBox="0 0 520 200"
                preserveAspectRatio="none"
                className="absolute inset-0 w-full h-full"
                aria-hidden="true"
              >
                <path
                  d="M 56,150 C 170,150 150,60 268,66 C 370,72 360,128 464,58"
                  fill="none"
                  className="stroke-slate-200 dark:stroke-slate-800"
                  strokeWidth="10"
                  strokeLinecap="round"
                />
                <motion.path
                  d="M 56,150 C 170,150 150,60 268,66 C 370,72 360,128 464,58"
                  fill="none"
                  stroke="#FF5B00"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  initial={{ pathLength: 0 }}
                  whileInView={{ pathLength: 1 }}
                  viewport={{ once: true, margin: "-60px" }}
                  transition={{ duration: 1.8, ease: EASE_OUT, delay: 0.2 }}
                />
                <circle cx="56" cy="150" r="5" fill="#061838" className="dark:fill-white" />
                <circle cx="464" cy="58" r="5" fill="#FF5B00" />
              </svg>

              <span className="absolute left-5 bottom-5 text-[11px] font-bold tracking-tight text-slate-500 dark:text-slate-400">
                Store
              </span>
              <span className="absolute right-5 top-5 text-[11px] font-bold tracking-tight text-[#FF5B00]">
                Your door
              </span>
            </div>
          </motion.div>

          {/* Supporting features */}
          <motion.div variants={stagger(0.07)} className="lg:col-span-5 grid grid-cols-1 gap-5">
            {FEATURES.map(({ Icon, title, body }) => (
              <motion.div
                key={title}
                variants={fadeUp}
                className="rounded-3xl bg-white dark:bg-[#12161F] border border-slate-200/90 dark:border-slate-800 p-6 sm:p-7 transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-slate-300 dark:hover:border-slate-700"
              >
                <div className="flex items-start gap-4">
                  <span className="shrink-0 w-10 h-10 rounded-xl bg-slate-100 dark:bg-[#1B2231] text-[#061838] dark:text-white flex items-center justify-center">
                    <Icon className="w-[17px] h-[17px] stroke-[2.2]" />
                  </span>
                  <div>
                    <h3 className="text-[15px] font-bold tracking-tight text-[#061838] dark:text-white">
                      {title}
                    </h3>
                    <p className="mt-1.5 text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">
                      {body}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
}
