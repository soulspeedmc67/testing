import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
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
    id: "rail-vegetables",
    category: "Vegetables",
    title: "Fresh Vegetables",
    priceText: "From ₹20",
    img: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&auto=format&fit=crop&q=80",
  },
  {
    id: "rail-fruits",
    category: "Fresh Fruits",
    title: "Fresh Fruits",
    priceText: "From ₹45",
    img: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&auto=format&fit=crop&q=80",
  },
  {
    id: "rail-dairy",
    category: "Dairy",
    title: "Milk, Curd & Eggs",
    priceText: "From ₹35",
    img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80",
  },
  {
    id: "rail-chicken",
    category: "Chicken",
    title: "Fresh Chicken",
    priceText: "From ₹160",
    img: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&auto=format&fit=crop&q=80",
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
    <section className="w-full space-y-6 select-none">
      {/* 1. EDITORIAL HERO — full-bleed image locked to the card edge, read as a
          magazine split rather than a floating thumbnail on a glowing panel.
          No ambient blur blob, no hover transforms: on a touch device a hover
          state never fires, it only reads as generic decoration. */}
      <div className="relative w-full rounded-2xl overflow-hidden bg-[#090D15] border border-white/10 dark:bg-surface-overlay dark:border-line-strong">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id || slideIdx}
            variants={stagger(0.055)}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, transition: { duration: 0.18, ease: EASE_SOFT } }}
            onClick={handleOpenExclusive}
            className="relative w-full text-white cursor-pointer"
          >
            {/* Photography runs to the card edge, full height */}
            <div className="absolute inset-y-0 right-0 w-[42%]">
              <img
                src={currentSlide.img}
                alt={currentSlide.title}
                fetchpriority="high"
                decoding="async"
                className="w-full h-full object-cover"
              />
            </div>
            {/* Scrim is wider than the photograph on purpose: the ramp begins
                inside the solid field, so the image emerges with no seam and
                the type column always sits on flat colour */}
            <div
              className="absolute inset-y-0 right-0 w-[66%] pointer-events-none"
              style={{
                background:
                  "linear-gradient(90deg,#090D15 0%,#090D15 40%,rgba(9,13,21,0.45) 74%,rgba(9,13,21,0) 100%)",
              }}
            />

            {/* min-height reserves the tallest slide so rotation never jumps */}
            <div className="relative z-10 p-5 pr-[40%] sm:pr-[38%] min-h-[236px]">
              {/* A short rule reads more deliberate than another floating dot */}
              <motion.div variants={fadeUpTight} className="flex items-center space-x-2">
                <span className="w-4 h-px bg-[#FF5B00]" />
                <span className="text-[9px] font-bold tracking-[0.18em] uppercase text-white/45">
                  {currentSlide.badge || "Dashit Exclusive"}
                </span>
              </motion.div>

              <motion.h3
                variants={fadeUpTight}
                className="mt-3 text-[17px] sm:text-[20px] font-black tracking-[-0.02em] text-white leading-[1.18] line-clamp-3"
              >
                {currentSlide.title}
              </motion.h3>

              <motion.div variants={fadeUpTight} className="mt-3 h-px w-8 bg-white/15" />

              <motion.div variants={fadeUpTight} className="mt-3 flex items-baseline flex-wrap gap-x-2 gap-y-1">
                <span className="text-[13px] font-black text-amber-300 tracking-tight">
                  {currentSlide.priceTag}
                </span>
                {currentSlide.promoCode && (
                  <span className="text-[10px] font-mono font-bold text-white/40 tracking-tight">
                    {currentSlide.promoCode}
                  </span>
                )}
              </motion.div>

              <motion.div variants={fadeUpTight} className="mt-4">
                <motion.button
                  type="button"
                  whileTap={TAP_FIRM}
                  transition={SPRING_SNAPPY}
                  onClick={handleOpenExclusive}
                  className="inline-flex items-center space-x-1.5 bg-[#FF5B00] text-white pl-3.5 pr-3 py-2 rounded-lg text-[11.5px] font-black tracking-tight cursor-pointer"
                >
                  <span>Explore deals</span>
                  <ArrowRight className="w-3.5 h-3.5 stroke-[3]" />
                </motion.button>
              </motion.div>

              {/* Pagination aligned to the type column, not floated centre */}
              {offers.length > 1 && (
                <motion.div variants={fadeUpTight} className="flex items-center space-x-1.5 mt-5">
                  {offers.map((slide, idx) => (
                    <button
                      key={slide.id || idx}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        hapticLight();
                        setSlideIdx(idx);
                      }}
                      /* The indicator stays a 2px hairline; the pseudo-element
                         gives it a finger-sized target, since a 2px-tall button
                         is unhittable on a phone. */
                      className={`relative h-[2px] transition-all duration-300 cursor-pointer before:absolute before:-inset-x-1.5 before:-inset-y-[14px] before:content-[''] ${
                        idx === slideIdx ? "w-5 bg-[#FF5B00]" : "w-2 bg-white/25"
                      }`}
                      aria-label={`Slide ${idx + 1}`}
                    />
                  ))}
                </motion.div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 2. CURATED EVERYDAY RAILS — image leads, two lines of text, one uniform card style */}
      <div>
        <h4 className="text-[15px] md:text-lg font-bold text-[#061838] tracking-tight px-1 mb-3 dark:text-content">
          Everyday essentials
        </h4>

        <motion.div
          variants={stagger(0.07)}
          {...inViewOnce}
          className="flex space-x-3 overflow-x-auto scrollbar-none pb-1.5 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-4 md:space-x-0 md:gap-4"
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
              className="w-[148px] md:w-full shrink-0 rounded-2xl bg-white border border-slate-200/80 p-2.5 shadow-[0_1px_3px_rgba(15,23,42,0.04)] cursor-pointer select-none dark:bg-surface-raised dark:border-line/80"
            >
              <div className="w-full h-[88px] md:h-32 rounded-xl overflow-hidden bg-slate-100 dark:bg-surface-muted">
                <img
                  src={item.img}
                  alt={item.title}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </div>

              <h5 className="mt-2.5 min-h-[34px] text-[12.5px] font-semibold text-[#061838] leading-snug line-clamp-2 tracking-tight dark:text-content">
                {item.title}
              </h5>
              <p className="text-[10.5px] font-medium text-slate-500 mt-0.5 dark:text-content-muted">
                {item.priceText}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
