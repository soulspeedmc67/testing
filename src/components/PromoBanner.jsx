import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Zap, ChevronRight, Clock } from "lucide-react";
import { getExclusiveOffers, DEFAULT_OFFERS } from "../lib/offers";
import { hapticLight, hapticMedium } from "../lib/haptics";
import {
  stagger,
  fadeUpTight,
  scaleIn,
  inViewOnce,
  EASE_SOFT,
  SPRING_SNAPPY,
  TAP_SOFT,
  TAP_FIRM,
} from "../lib/motion";

const CURATED_RAILS = [
  {
    id: "rail-munchies",
    category: "Snacks",
    tag: "POPULAR NOW",
    title: "Munchies & Namkeen",
    subtitle: "Artisanal crisps, dry fruits & savoury bites",
    priceText: "From ₹20",
    timeText: "8 mins",
    img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=80",
    gradient: "from-orange-500/10 via-amber-500/5 to-white",
    border: "border-orange-200/80",
    tagColor: "text-orange-700 bg-orange-100",
    priceColor: "text-[#FF5B00] bg-orange-50 border-orange-200",
  },
  {
    id: "rail-bakery",
    category: "Bakery",
    tag: "VALLEY FAVORITE",
    title: "Kashmiri Breads & Toast",
    subtitle: "Fresh morning lavas, croissants & buns",
    priceText: "From ₹30",
    timeText: "8 mins",
    img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=400&auto=format&fit=crop&q=80",
    gradient: "from-amber-500/10 via-yellow-500/5 to-white",
    border: "border-amber-200/80",
    tagColor: "text-amber-800 bg-amber-100",
    priceColor: "text-amber-800 bg-amber-50 border-amber-200",
  },
  {
    id: "rail-dairy",
    category: "Dairy",
    tag: "DAILY FRESH",
    title: "Farm Milk & Salted Butter",
    subtitle: "Pure Amul milk, cream curd & table butter",
    priceText: "From ₹35",
    timeText: "8 mins",
    img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80",
    gradient: "from-sky-500/10 via-blue-500/5 to-white",
    border: "border-sky-200/80",
    tagColor: "text-blue-700 bg-blue-100",
    priceColor: "text-blue-700 bg-blue-50 border-blue-200",
  },
  {
    id: "rail-drinks",
    category: "Drinks",
    tag: "CHILLED SODAS",
    title: "Cold Drinks & Juices",
    subtitle: "Sparkling colas & chilled fruit sips",
    priceText: "Up to 25% OFF",
    timeText: "8 mins",
    img: "https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=400&auto=format&fit=crop&q=80",
    gradient: "from-teal-500/10 via-cyan-500/5 to-white",
    border: "border-teal-200/80",
    tagColor: "text-teal-800 bg-teal-100",
    priceColor: "text-teal-800 bg-teal-50 border-teal-200",
  },
];

export default function PromoBanner({ onSelectPromo }) {
  const router = useRouter();
  const [offers, setOffers] = useState(DEFAULT_OFFERS);
  const [slideIdx, setSlideIdx] = useState(0);

  const loadOffers = () => {
    const list = getExclusiveOffers().filter((o) => o.active !== false);
    setOffers(list.length > 0 ? list : DEFAULT_OFFERS);
  };

  useEffect(() => {
    loadOffers();
    window.addEventListener("dashit_offers_updated", loadOffers);
    return () => window.removeEventListener("dashit_offers_updated", loadOffers);
  }, []);

  useEffect(() => {
    if (offers.length === 0) return;
    const timer = setInterval(() => {
      setSlideIdx((prev) => (prev + 1) % offers.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [offers.length]);

  const currentSlide = offers[slideIdx] || offers[0];

  const handleOpenExclusive = (e) => {
    if (e) e.stopPropagation();
    hapticMedium();
    if (onSelectPromo) {
      onSelectPromo(currentSlide);
    }
  };

  if (!currentSlide) return null;

  return (
    <section className="w-full space-y-3.5 select-none">
      {/* 1. EDITORIAL HERO SPOTLIGHT — Minimal Obsidian Presentation */}
      <div className="relative w-full rounded-3xl overflow-hidden shadow-[0_8px_24px_rgba(6,24,56,0.12)] border border-white/[0.07] bg-[#090D15]">
        {/* Single restrained ambient wash — anchors the card without glowing */}
        <div className="absolute -top-12 -right-8 w-52 h-52 bg-[#FF5B00]/[0.06] rounded-full blur-3xl pointer-events-none" />

        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id || slideIdx}
            variants={stagger(0.055)}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, transition: { duration: 0.18, ease: EASE_SOFT } }}
            onClick={handleOpenExclusive}
            className="relative z-10 w-full text-white p-5 cursor-pointer group"
          >
            <div className="flex items-start justify-between gap-4">
              {/* Left Column — one clear reading order: label, title, offer, action */}
              <div className="flex-1 min-w-0 space-y-2.5">
                <motion.div variants={fadeUpTight} className="flex items-center space-x-1.5">
                  <span className="w-1 h-1 rounded-full bg-[#FF5B00]" />
                  <span className="text-[9px] font-black tracking-[0.14em] uppercase text-slate-400">
                    {currentSlide.badge || "Dashit Exclusive"}
                  </span>
                </motion.div>

                <motion.h3
                  variants={fadeUpTight}
                  className="text-[19px] font-black tracking-tight text-white leading-[1.15] line-clamp-2"
                >
                  {currentSlide.title}
                </motion.h3>

                <motion.p
                  variants={fadeUpTight}
                  className="text-[11.5px] font-medium text-slate-400/90 leading-relaxed line-clamp-1"
                >
                  {currentSlide.subtitle}
                </motion.p>

                {/* Offer line — typography instead of stacked chips */}
                <motion.div variants={fadeUpTight} className="flex items-center flex-wrap gap-x-2 gap-y-1">
                  <span className="text-[13px] font-black text-amber-300 tracking-tight">
                    {currentSlide.priceTag}
                  </span>
                  {currentSlide.promoCode && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-slate-600" />
                      <span className="text-[10px] font-mono font-bold text-slate-400 tracking-tight">
                        {currentSlide.promoCode}
                      </span>
                    </>
                  )}
                </motion.div>

                <motion.div variants={fadeUpTight} className="pt-0.5">
                  <motion.button
                    type="button"
                    whileTap={TAP_FIRM}
                    transition={SPRING_SNAPPY}
                    onClick={handleOpenExclusive}
                    className="inline-flex items-center space-x-1.5 bg-[#FF5B00] hover:bg-[#FF7A2E] text-white pl-3.5 pr-3 py-2 rounded-xl text-[11.5px] font-black tracking-tight cursor-pointer"
                  >
                    <span>Explore deals</span>
                    <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                  </motion.button>
                </motion.div>
              </div>

              {/* Right Column — clean staged visual, no overlay clutter */}
              <motion.div variants={scaleIn} className="shrink-0">
                <div className="relative w-[92px] h-[92px] rounded-2xl overflow-hidden ring-1 ring-white/10 bg-neutral-900">
                  <img
                    src={currentSlide.img}
                    alt={currentSlide.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ease-out"
                  />
                </div>
              </motion.div>
            </div>

            {/* Minimal pagination — dots only */}
            {offers.length > 1 && (
              <motion.div variants={fadeUpTight} className="flex items-center space-x-1.5 mt-4">
                {offers.map((slide, idx) => (
                  <button
                    key={slide.id || idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      hapticLight();
                      setSlideIdx(idx);
                    }}
                    className={`h-[3px] rounded-full transition-all duration-400 cursor-pointer ${
                      idx === slideIdx ? "w-6 bg-[#FF5B00]" : "w-1.5 bg-white/20 hover:bg-white/35"
                    }`}
                    aria-label={`Slide ${idx + 1}`}
                  />
                ))}
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 2. CURATED EVERYDAY RAILS — Distinctive Asymmetric Layout */}
      <div>
        <div className="flex items-center justify-between px-1 mb-3">
          <h4 className="text-[17px] font-black text-[#061838] tracking-tight">
            Everyday Essentials
          </h4>
        </div>

        <motion.div
          variants={stagger(0.07)}
          {...inViewOnce}
          className="flex space-x-3 overflow-x-auto scrollbar-none pb-1.5 -mx-4 px-4"
        >
          {CURATED_RAILS.map((item) => (
            <motion.div
              key={item.id}
              variants={scaleIn}
              whileTap={TAP_SOFT}
              transition={SPRING_SNAPPY}
              onClick={() => {
                hapticLight();
                if (onSelectPromo) onSelectPromo(item.category);
              }}
              className={`w-[224px] shrink-0 rounded-2xl bg-white bg-gradient-to-br ${item.gradient} border ${item.border} p-3 flex flex-col justify-between shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-[0_10px_24px_rgba(15,23,42,0.1)] hover:-translate-y-0.5 transition-all duration-300 cursor-pointer group select-none`}
            >
              {/* Top Header Row */}
              <div className="flex items-center justify-between mb-2">
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${item.tagColor} tracking-wider uppercase`}>
                  {item.tag}
                </span>
                <div className="flex items-center space-x-0.5 text-slate-500 text-[9px] font-bold">
                  <Clock className="w-2.5 h-2.5 text-[#FF5B00]" />
                  <span>{item.timeText}</span>
                </div>
              </div>

              {/* Middle Asymmetric Row: Text + Visual */}
              <div className="flex items-center space-x-2 my-1">
                <div className="flex-1 space-y-0.5">
                  <h5 className="text-xs font-black text-[#061838] leading-tight line-clamp-1 group-hover:text-[#FF5B00] transition-colors">
                    {item.title}
                  </h5>
                  <p className="text-[10px] font-medium text-slate-500 line-clamp-2 leading-tight">
                    {item.subtitle}
                  </p>
                </div>
                <div className="w-14 h-14 rounded-xl overflow-hidden shadow-xs ring-1 ring-black/5 bg-slate-100 shrink-0">
                  <img
                    src={item.img}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-300"
                  />
                </div>
              </div>

              {/* Bottom Action Row */}
              <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-200/60">
                <span className={`text-[11px] font-black font-mono px-2 py-0.5 rounded-lg border ${item.priceColor}`}>
                  {item.priceText}
                </span>
                <span className="text-[10px] font-black text-slate-700 group-hover:text-[#061838] flex items-center space-x-0.5">
                  <span>Shop</span>
                  <ChevronRight className="w-3 h-3 text-[#FF5B00]" />
                </span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
