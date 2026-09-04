import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Zap, ChevronRight, Clock, Star, Flame } from "lucide-react";
import { hapticLight, hapticMedium } from "../lib/haptics";

const SPOTLIGHT_SLIDES = [
  {
    id: "spotlight-snacks",
    badge: "DASHIT EXCLUSIVE",
    title: "Gourmet Snacks & Chilled Sips",
    subtitle: "Artisanal crisps, premium chocolates & chilled sodas at 8-min dispatch.",
    priceTag: "Starting ₹20",
    category: "Snacks",
    img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=80",
    gradient: "from-[#040E22] via-[#061838] to-[#0A2558]",
    accent: "text-amber-400"
  },
  {
    id: "spotlight-bakery",
    badge: "FRESH FROM OVEN",
    title: "Artisan Breads & Morning Bakes",
    subtitle: "Authentic Kashmiri lavas, soft croissants & golden rolls delivered warm.",
    priceTag: "Starting ₹30",
    category: "Bakery",
    img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=400&auto=format&fit=crop&q=80",
    gradient: "from-[#140C04] via-[#241406] to-[#361E0A]",
    accent: "text-[#FF8C38]"
  },
  {
    id: "spotlight-dairy",
    badge: "FARM TO DOORSTEP",
    title: "Fresh Milk, Butter & Kashmiri Apples",
    subtitle: "Chilled Amul dairy, creamy butter & crisp valley apples in minutes.",
    priceTag: "Save up to 20%",
    category: "Dairy",
    img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80",
    gradient: "from-[#041424] via-[#08223C] to-[#0C3256]",
    accent: "text-sky-300"
  }
];

const CURATED_RAILS = [
  {
    id: "rail-munchies",
    category: "Snacks",
    tag: "POPULAR NOW",
    title: "Munchies & Namkeen",
    subtitle: "Lay's, Kurkure & artisanal treats",
    priceText: "From ₹20",
    timeText: "8 mins",
    img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=320&auto=format&fit=crop&q=80",
    badgeBg: "bg-[#FF6B00] text-white"
  },
  {
    id: "rail-bakery",
    category: "Bakery",
    tag: "VALLEY FAVORITE",
    title: "Kashmiri Breads & Toast",
    subtitle: "Fresh morning lavas, croissants & buns",
    priceText: "From ₹30",
    timeText: "8 mins",
    img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=320&auto=format&fit=crop&q=80",
    badgeBg: "bg-[#061838] text-white"
  },
  {
    id: "rail-dairy",
    category: "Dairy",
    tag: "DAILY ESSENTIALS",
    title: "Farm Milk, Curd & Butter",
    subtitle: "Pure Amul milk & salted table butter",
    priceText: "From ₹35",
    timeText: "8 mins",
    img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=320&auto=format&fit=crop&q=80",
    badgeBg: "bg-blue-600 text-white"
  },
  {
    id: "rail-drinks",
    category: "Drinks",
    tag: "CHILLED INSTANT",
    title: "Cold Drinks & Juices",
    subtitle: "Sparkling sodas & refreshing fruit sips",
    priceText: "Up to 25% OFF",
    timeText: "8 mins",
    img: "https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=320&auto=format&fit=crop&q=80",
    badgeBg: "bg-emerald-600 text-white"
  },
];

export default function PromoBanner({ onSelectPromo }) {
  const [slideIdx, setSlideIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlideIdx((prev) => (prev + 1) % SPOTLIGHT_SLIDES.length);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  const currentSlide = SPOTLIGHT_SLIDES[slideIdx];

  const handleSelect = (category) => {
    hapticMedium();
    if (onSelectPromo) onSelectPromo(category);
  };

  return (
    <section className="w-full space-y-3.5 select-none">
      {/* 1. EDITORIAL HERO SPOTLIGHT — Rotating, High-End Presentation */}
      <div className="relative w-full rounded-3xl overflow-hidden shadow-[0_12px_32px_rgba(6,24,56,0.18)] border border-slate-700/50">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentSlide.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45 }}
            onClick={() => handleSelect(currentSlide.category)}
            className={`relative w-full bg-gradient-to-br ${currentSlide.gradient} text-white p-5 cursor-pointer group`}
          >
            {/* Subtle Ambient Radial Light */}
            <div className="absolute top-0 right-0 w-52 h-52 bg-[#FF6B00]/15 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-44 h-44 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="relative z-10 flex items-center justify-between">
              {/* Text Information Column */}
              <div className="max-w-[62%] space-y-2">
                <div className="inline-flex items-center space-x-1.5 bg-white/10 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/15">
                  <Sparkles className={`w-3 h-3 ${currentSlide.accent} stroke-[2.5]`} />
                  <span className={`text-[9px] font-black tracking-wider uppercase ${currentSlide.accent}`}>
                    {currentSlide.badge}
                  </span>
                </div>

                <h3 className="text-base font-black tracking-tight text-white leading-snug">
                  {currentSlide.title}
                </h3>

                <p className="text-[11px] font-medium text-slate-300 leading-snug line-clamp-2">
                  {currentSlide.subtitle}
                </p>

                <div className="flex items-center space-x-2.5 pt-1">
                  <span className="text-xs font-black font-mono text-[#061838] bg-white px-2.5 py-0.5 rounded-lg shadow-xs">
                    {currentSlide.priceTag}
                  </span>
                  <div className="inline-flex items-center text-[11px] font-bold text-slate-200 group-hover:translate-x-1 transition-transform">
                    <span>Shop now</span>
                    <ArrowRight className="w-3.5 h-3.5 ml-1 stroke-[2.5]" />
                  </div>
                </div>
              </div>

              {/* Right Staged Photo with Soft Rounded Frame */}
              <div className="w-[34%] h-24 relative flex items-center justify-center">
                <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-xl border border-white/20 bg-black/20">
                  <img
                    src={currentSlide.img}
                    alt={currentSlide.title}
                    className="w-full h-full object-cover group-hover:scale-108 transition-transform duration-500"
                  />
                </div>
              </div>
            </div>

            {/* Slide Pagination Dots */}
            <div className="relative z-10 flex items-center space-x-1.5 mt-3.5 pt-2 border-t border-white/10">
              {SPOTLIGHT_SLIDES.map((slide, idx) => (
                <button
                  key={slide.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    hapticLight();
                    setSlideIdx(idx);
                  }}
                  className={`h-1.5 rounded-full transition-all cursor-pointer ${
                    idx === slideIdx ? "w-6 bg-[#FF6B00]" : "w-1.5 bg-white/30 hover:bg-white/50"
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
              <span className="text-[9px] font-bold text-slate-400 ml-auto flex items-center space-x-1">
                <Clock className="w-3 h-3 stroke-[2.5] text-[#FF6B00]" />
                <span>Dashit in 8m</span>
              </span>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* 2. CURATED EVERYDAY RAILS — Professional High-Res Cards */}
      <div>
        <div className="flex items-center justify-between px-1 mb-2">
          <div className="flex items-center space-x-1.5">
            <Zap className="w-3.5 h-3.5 text-[#FF6B00] stroke-[2.5]" />
            <h4 className="text-xs font-black text-[#061838] uppercase tracking-wider">
              Curated Everyday Rails
            </h4>
          </div>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">
            Freshly Packed
          </span>
        </div>

        <div className="flex space-x-3 overflow-x-auto scrollbar-none pb-1.5 -mx-4 px-4">
          {CURATED_RAILS.map((item) => (
            <motion.div
              key={item.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleSelect(item.category)}
              className="w-[184px] shrink-0 rounded-2xl bg-white border border-slate-200/90 p-2.5 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-all cursor-pointer group"
            >
              {/* Top Photo with Pill Badge */}
              <div className="relative w-full h-24 rounded-xl overflow-hidden mb-2 bg-slate-100">
                <img
                  src={item.img}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-1.5 left-1.5">
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full ${item.badgeBg} shadow-xs tracking-wider uppercase`}>
                    {item.tag}
                  </span>
                </div>
                <div className="absolute bottom-1.5 right-1.5 bg-black/60 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md flex items-center space-x-0.5">
                  <Clock className="w-2.5 h-2.5" />
                  <span>{item.timeText}</span>
                </div>
              </div>

              {/* Text Info */}
              <div className="space-y-0.5">
                <h5 className="text-xs font-black text-[#061838] leading-tight line-clamp-1">
                  {item.title}
                </h5>
                <p className="text-[10px] font-medium text-slate-500 line-clamp-1">
                  {item.subtitle}
                </p>
              </div>

              {/* Footer Price & Tap CTA */}
              <div className="flex items-center justify-between pt-2 mt-1 border-t border-slate-100">
                <span className="text-xs font-black font-mono text-[#FF6B00]">
                  {item.priceText}
                </span>
                <span className="text-[10px] font-bold text-slate-600 group-hover:text-[#061838] flex items-center">
                  <span>Explore</span>
                  <ChevronRight className="w-3 h-3 ml-0.5" />
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
