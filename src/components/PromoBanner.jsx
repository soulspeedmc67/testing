import { motion } from "framer-motion";
import { Sparkles, ArrowRight, Zap, ChevronRight } from "lucide-react";
import { hapticLight } from "../lib/haptics";

const CURATED_COLLECTIONS = [
  {
    id: "snack-express",
    cat: "Snacks",
    tag: "POPULAR NOW",
    tagColor: "bg-[#FF6B00] text-white",
    title: "Munchies & Crisps",
    desc: "Lay's, Kurkure & artisanal namkeen",
    priceText: "From ₹20",
    img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=240&auto=format&fit=crop&q=80",
    bg: "bg-gradient-to-b from-amber-50/90 to-white",
    border: "border-amber-200/70"
  },
  {
    id: "bakery-fresh",
    cat: "Bakery",
    tag: "LOCAL FAVORITE",
    tagColor: "bg-[#061838] text-white",
    title: "Kashmiri Breads & Toast",
    desc: "Fresh morning lavas, croissants & buns",
    priceText: "From ₹30",
    img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=240&auto=format&fit=crop&q=80",
    bg: "bg-gradient-to-b from-stone-50 to-white",
    border: "border-stone-200/80"
  },
  {
    id: "dairy-essentials",
    cat: "Dairy",
    tag: "FARM FRESH",
    tagColor: "bg-blue-600 text-white",
    title: "Daily Dairy & Butter",
    desc: "Amul milk, rich curd & salted butter",
    priceText: "From ₹35",
    img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=240&auto=format&fit=crop&q=80",
    bg: "bg-gradient-to-b from-sky-50/70 to-white",
    border: "border-sky-200/70"
  },
  {
    id: "drinks-chilled",
    cat: "Drinks",
    tag: "INSTANT CHILL",
    tagColor: "bg-emerald-600 text-white",
    title: "Cold Drinks & Juices",
    desc: "Real fruit sips, iced teas & sodas",
    priceText: "Up to 25% OFF",
    img: "https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=240&auto=format&fit=crop&q=80",
    bg: "bg-gradient-to-b from-emerald-50/70 to-white",
    border: "border-emerald-200/70"
  },
];

export default function PromoBanner({ onSelectPromo }) {
  const handleSelect = (category) => {
    hapticLight();
    if (onSelectPromo) onSelectPromo(category);
  };

  return (
    <section className="w-full space-y-3 select-none">
      {/* 1. HERO SPOTLIGHT CARD — Distinctive Dashit Panoramic Presentation */}
      <motion.div
        whileTap={{ scale: 0.985 }}
        onClick={() => handleSelect("Snacks")}
        className="relative w-full rounded-3xl overflow-hidden bg-gradient-to-br from-[#061838] via-[#0A2558] to-[#040E22] text-white p-4.5 shadow-[0_12px_32px_rgba(6,24,56,0.2)] border border-slate-700/60 cursor-pointer group"
      >
        {/* Subtle Ambient Decorative Circles */}
        <div className="absolute -right-8 -top-8 w-44 h-44 rounded-full bg-[#FF6B00]/15 blur-2xl pointer-events-none" />
        <div className="absolute -left-8 -bottom-8 w-36 h-36 rounded-full bg-blue-500/10 blur-xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between">
          {/* Left Content Column */}
          <div className="max-w-[62%] space-y-1.5">
            <div className="inline-flex items-center space-x-1.5 bg-white/10 backdrop-blur-md px-2.5 py-0.5 rounded-full border border-white/15">
              <Sparkles className="w-3 h-3 text-[#FF6B00] stroke-[2.5]" />
              <span className="text-[9.5px] font-black tracking-wider uppercase text-amber-200">
                Dashit Spotlight
              </span>
            </div>

            <h3 className="text-base font-black tracking-tight text-white leading-tight">
              Express Snacks & Sips Hub
            </h3>

            <p className="text-[11px] font-medium text-slate-300 leading-snug line-clamp-2">
              Chilled cold drinks, crisps, and evening treats delivered in 8 mins.
            </p>

            <div className="flex items-center space-x-2 pt-1">
              <span className="text-xs font-black font-mono text-[#FF6B00] bg-white px-2 py-0.5 rounded-lg shadow-xs">
                Starting ₹20
              </span>
              <span className="inline-flex items-center text-[10px] font-bold text-slate-200 group-hover:translate-x-0.5 transition-transform">
                <span>Shop now</span>
                <ArrowRight className="w-3 h-3 ml-0.5" />
              </span>
            </div>
          </div>

          {/* Right Floating Product Visual */}
          <div className="w-[34%] h-24 relative flex items-center justify-center">
            <img
              src="https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=280&auto=format&fit=crop&q=80"
              alt="Dashit Spotlight"
              className="max-h-full max-w-full object-contain drop-shadow-[0_8px_16px_rgba(0,0,0,0.4)] group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        </div>
      </motion.div>

      {/* 2. HORIZONTAL CURATED DISCOVERY RAIL — Breathable, Editorial Cards */}
      <div>
        <div className="flex items-center justify-between px-1 mb-2">
          <div className="flex items-center space-x-1.5">
            <Zap className="w-3.5 h-3.5 text-[#FF6B00] stroke-[2.5]" />
            <h4 className="text-xs font-black text-[#061838] tracking-tight">
              Curated Everyday Rails
            </h4>
          </div>
          <span className="text-[10px] font-bold text-slate-400 tracking-tight">
            Hand-packed fresh
          </span>
        </div>

        <div className="flex space-x-2.5 overflow-x-auto scrollbar-none pb-1 -mx-4 px-4">
          {CURATED_COLLECTIONS.map((item) => (
            <motion.div
              key={item.id}
              whileTap={{ scale: 0.96 }}
              onClick={() => handleSelect(item.cat)}
              className={`w-[172px] shrink-0 rounded-2xl ${item.bg} border ${item.border} p-3 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow cursor-pointer`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${item.tagColor} tracking-wider`}>
                  {item.tag}
                </span>
                <span className="text-[9.5px] font-black font-mono text-slate-900">
                  {item.priceText}
                </span>
              </div>

              <div className="w-full h-20 my-1 flex items-center justify-center overflow-hidden">
                <img
                  src={item.img}
                  alt={item.title}
                  className="max-h-full max-w-full object-contain"
                />
              </div>

              <div>
                <h5 className="text-[11px] font-extrabold text-slate-900 leading-tight">
                  {item.title}
                </h5>
                <p className="text-[9.5px] font-medium text-slate-500 line-clamp-1 mt-0.5">
                  {item.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
