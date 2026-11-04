import { useMemo } from "react";
import { motion } from "framer-motion";
import { Plus, Minus } from "lucide-react";
import ProductImage from "./ProductImage";
import { hapticLight, hapticMedium } from "../lib/haptics";
import { EASE_OUT } from "../lib/motion";

/**
 * The spotlight tab's page (src/lib/spotlight.js): a gold hero with a garland
 * of bulbs, the owner's groups as tall photo tiles (name on top, photo below),
 * then each group's items in the same tile style with price and ADD.
 * The same design is drawn natively in SpotlightHomeView.swift (iPhone) and
 * SpotlightScreen.kt (Android).
 */

/** Gold, warm and readable in both themes. */
const TILE =
  "relative overflow-hidden rounded-[22px] border bg-gradient-to-b from-[#FFF7DA] via-[#FFE69A] to-[#FFCF4D] border-[#F2B92B]/70 shadow-[inset_0_1px_0_rgba(255,255,255,0.8),0_10px_22px_-14px_rgba(160,100,0,0.55)] dark:from-[#3A2B07] dark:via-[#2C2005] dark:to-[#1E1603] dark:border-[#FFC93C]/25 dark:shadow-[inset_0_1px_0_rgba(255,214,102,0.18),0_10px_22px_-14px_rgba(0,0,0,0.8)]";
const INK = "text-[#4A2E00] dark:text-[#FFE6A0]";

/** Little diamonds either side of the heading, like festival bunting. */
function Ornament({ flip = false }) {
  return (
    <svg viewBox="0 0 34 14" className={`w-7 h-3.5 shrink-0 ${flip ? "-scale-x-100" : ""}`} aria-hidden="true">
      <circle cx="3" cy="7" r="2" className="fill-[#B9770E] dark:fill-[#FFC93C]" />
      <path d="M17 1 L22 7 L17 13 L12 7 Z" className="fill-[#D4900F] dark:fill-[#FFD45C]" />
      <path d="M28 3 L31 7 L28 11 L25 7 Z" className="fill-[#B9770E]/70 dark:fill-[#FFC93C]/70" />
    </svg>
  );
}

/** A sagging string of bulbs across the top of the hero. */
function Garland() {
  const bulbs = Array.from({ length: 15 }, (_, i) => {
    const t = i / 14;
    return { x: 4 + t * 92, y: 8 + Math.sin(t * Math.PI) * 18, d: (i % 5) * 0.45 };
  });
  return (
    <div className="absolute inset-x-0 top-0 h-12 pointer-events-none" aria-hidden="true">
      <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        <path d="M0 6 Q50 40 100 6" fill="none" strokeWidth="0.35" className="stroke-[#8A5A00]/50 dark:stroke-[#FFD45C]/40" />
      </svg>
      {bulbs.map((b, i) => (
        <span
          key={i}
          className="spot-twinkle absolute w-[7px] h-[7px] -ml-[3.5px] rounded-full bg-[#FFF3B0] shadow-[0_0_8px_3px_rgba(255,200,40,0.85)]"
          style={{ left: `${b.x}%`, top: `${b.y}%`, animationDelay: `${b.d}s` }}
        />
      ))}
    </div>
  );
}

/** Sparkles drifting up over the whole page, very faint. */
export function SpotlightSparkles({ count = 16 }) {
  const sparks = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        // A fixed scatter (no Math.random) so server and browser draw the same.
        const r = (n) => ((Math.sin((i + 1) * n) + 1) / 2);
        return {
          left: `${Math.round(r(12.9898) * 96)}%`,
          top: `${Math.round(8 + r(78.233) * 86)}%`,
          size: 6 + Math.round(r(39.425) * 8),
          style: {
            "--spot-t": `${7 + r(3.7) * 6}s`,
            "--spot-d": `${-r(5.1) * 10}s`,
            "--spot-dx": `${Math.round((r(9.3) - 0.5) * 40)}px`,
            "--spot-o": (0.35 + r(2.2) * 0.4).toFixed(2),
          },
        };
      }),
    [count]
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {sparks.map((s, i) => (
        <svg
          key={i}
          viewBox="0 0 10 10"
          className="spot-drift absolute fill-[#E0A200] dark:fill-[#FFD45C]"
          style={{ left: s.left, top: s.top, width: s.size, height: s.size, ...s.style }}
        >
          <path d="M5 0 C5.4 3.6 6.4 4.6 10 5 C6.4 5.4 5.4 6.4 5 10 C4.6 6.4 3.6 5.4 0 5 C3.6 4.6 4.6 3.6 5 0 Z" />
        </svg>
      ))}
    </div>
  );
}

/** The page background while the spotlight tab is picked. */
export const SPOTLIGHT_PAGE_BG =
  "bg-[linear-gradient(180deg,#FFE27A_0px,#FFF0B8_320px,#FFF8E1_760px,#FFFDF5_1400px)] dark:bg-[linear-gradient(180deg,#3D2C00_0px,#241A03_320px,#16120A_760px,rgb(var(--surface-rgb))_1400px)]";

function GoldAdd({ product, qty, onAdd, onUpdateQty }) {
  const id = String(product.id || product.barcode);
  const soldOut = product.inStock === false || (product.stock !== undefined && Number(product.stock) <= 0);
  if (soldOut) {
    return <span className="h-8 px-2.5 rounded-xl flex items-center text-[10.5px] font-black uppercase tracking-wide bg-black/10 text-[#6B4A10] dark:bg-white/10 dark:text-[#FFE6A0]/70">Sold out</span>;
  }
  if (qty > 0) {
    const max = product.stock !== undefined ? Number(product.stock) : Infinity;
    return (
      <div onClick={(e) => e.stopPropagation()} className="h-8 rounded-xl flex items-center bg-[#4A2E00] text-[#FFD45C] dark:bg-[#FFC93C] dark:text-[#2A1C00] shadow-sm">
        <button type="button" aria-label={`One less ${product.name}`} onClick={() => { hapticLight(); onUpdateQty(id, -1); }} className="w-8 h-8 flex items-center justify-center cursor-pointer">
          <Minus className="w-3.5 h-3.5 stroke-[3]" />
        </button>
        <span className="min-w-[1.25rem] text-center text-[13px] font-black tabular-nums">{qty}</span>
        <button type="button" aria-label={`One more ${product.name}`} disabled={qty >= max} onClick={() => { hapticLight(); onUpdateQty(id, 1); }} className="w-8 h-8 flex items-center justify-center cursor-pointer disabled:opacity-40">
          <Plus className="w-3.5 h-3.5 stroke-[3]" />
        </button>
      </div>
    );
  }
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        hapticMedium();
        onAdd(product);
      }}
      className="h-8 px-4 rounded-xl text-[12.5px] font-black tracking-wide bg-[#4A2E00] text-[#FFD45C] hover:bg-[#3A2400] dark:bg-[#FFC93C] dark:text-[#2A1C00] dark:hover:bg-[#FFD45C] shadow-sm active:scale-95 transition-transform cursor-pointer"
    >
      ADD
    </button>
  );
}

/** One item in the gold tile style: name on top, photo, then price and ADD. */
export function SpotlightItemCard({ product, qty = 0, onAdd, onUpdateQty, onOpen }) {
  const off = product.originalPrice > product.price ? Math.round(((product.originalPrice - product.price) / product.originalPrice) * 100) : 0;
  return (
    <div onClick={() => onOpen?.(product)} className={`${TILE} flex flex-col cursor-pointer select-none group h-full`}>
      <p className={`px-2.5 pt-3 text-center text-[12.5px] font-extrabold leading-snug line-clamp-2 min-h-[38px] ${INK}`}>{product.name}</p>
      <div className="relative mx-2.5 mt-1.5 aspect-square rounded-2xl bg-white/85 dark:bg-white/95 overflow-hidden">
        <ProductImage src={product.img} name={product.name} fill imgClassName="p-1.5 transition-transform duration-500 group-hover:scale-105" />
        {off > 0 && (
          <span className="absolute top-1.5 left-1.5 z-10 text-[9.5px] font-black px-2 py-[3px] rounded-full bg-[#B3261E] text-white shadow-sm">{off}% OFF</span>
        )}
      </div>
      <div className="px-2.5 pt-2 pb-2.5 mt-auto flex items-end justify-between gap-1.5">
        <div className="min-w-0 leading-none">
          {product.unit && <span className="block text-[10px] font-semibold text-[#7A5410] dark:text-[#FFE6A0]/65 truncate mb-1">{product.unit}</span>}
          <span className={`text-[15px] font-black tracking-tight ${INK}`}>₹{product.price}</span>
          {product.originalPrice > product.price && (
            <span className="ml-1 text-[10.5px] font-semibold line-through text-[#8A6A2A]/80 dark:text-[#FFE6A0]/45">₹{product.originalPrice}</span>
          )}
        </div>
        <GoldAdd product={product} qty={qty} onAdd={onAdd} onUpdateQty={onUpdateQty} />
      </div>
    </div>
  );
}

/** A group's tile: its name across the top, its photo filling the bottom. */
export function SpotlightGroupTile({ section, onClick }) {
  return (
    <button type="button" onClick={onClick} className={`${TILE} w-full aspect-[4/5] flex flex-col text-center cursor-pointer group active:scale-[0.97] transition-transform`}>
      <span className={`relative z-10 px-2 pt-3 text-[12.5px] sm:text-[14px] font-extrabold leading-tight line-clamp-2 ${INK}`}>{section.name}</span>
      <span className="relative flex-1 mt-1">
        {section.img && (
          <img
            src={section.img}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-x-1.5 bottom-0 w-[calc(100%-12px)] h-full object-contain object-bottom drop-shadow-[0_6px_8px_rgba(90,50,0,0.25)] transition-transform duration-500 group-hover:scale-[1.04]"
          />
        )}
      </span>
    </button>
  );
}

/**
 * The whole spotlight page. `spotlight` is shopperSpotlight(); `cart` the
 * shop's cart lines; `onAdd(product)` and `onUpdateQty(id, delta)` as on the shop page.
 */
export default function SpotlightShowcase({ spotlight, cart = [], onAdd, onUpdateQty, onOpen }) {
  if (!spotlight) return null;
  const qtyOf = (p) => cart.find((i) => String(i.id || i.barcode) === String(p.id || p.barcode))?.qty || 0;
  const jump = (id) => {
    hapticLight();
    document.getElementById(`spot-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="relative space-y-7">
      {/* Hero */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: EASE_OUT }}
        className="relative -mx-4 sm:mx-0 px-4 pt-12 pb-6 sm:rounded-[28px] overflow-hidden text-center"
      >
        <Garland />
        <div className="flex items-center justify-center gap-2.5">
          <Ornament />
          <h1 className="font-display text-[30px] sm:text-[40px] leading-[1.05] font-black tracking-[-0.02em] text-[#5A3A00] dark:text-[#FFD45C] [text-shadow:0_1px_0_rgba(255,255,255,0.6)] dark:[text-shadow:0_0_24px_rgba(255,190,40,0.45)] [text-wrap:balance]">
            {spotlight.title}
          </h1>
          <Ornament flip />
        </div>
        {spotlight.subtitle && (
          <p className="mt-2.5 text-[13.5px] font-semibold text-[#7A5410] dark:text-[#FFE6A0]/75">{spotlight.subtitle}</p>
        )}
        <span className="mt-4 inline-flex items-center gap-2 rounded-full border border-[#C98A0A]/40 bg-white/55 dark:bg-white/[0.06] dark:border-[#FFC93C]/30 px-3.5 py-1 text-[10.5px] font-black uppercase tracking-[0.18em] text-[#8A5A00] dark:text-[#FFD45C]/85 backdrop-blur-sm">
          Curated by DASHit
        </span>
      </motion.section>

      {/* The groups */}
      <motion.div
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        className="grid grid-cols-3 md:grid-cols-6 gap-2.5 sm:gap-3.5"
      >
        {spotlight.sections.map((s) => (
          <motion.div key={s.id} variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT } } }}>
            <SpotlightGroupTile section={s} onClick={() => jump(s.id)} />
          </motion.div>
        ))}
      </motion.div>

      {/* A bunting rule, as in the reference */}
      <div className="h-3 -mx-4 sm:mx-0 bg-[radial-gradient(circle,#D4900F_1.6px,transparent_2px)] dark:bg-[radial-gradient(circle,#FFC93C_1.6px,transparent_2px)] bg-[length:14px_12px] opacity-60" aria-hidden="true" />

      {/* Each group's items */}
      {spotlight.sections.map((s) => (
        <section key={s.id} id={`spot-${s.id}`} className="scroll-mt-40 space-y-3">
          <div className="flex items-center gap-2 px-1">
            <span className="w-2 h-2 rotate-45 bg-[#D4900F] dark:bg-[#FFC93C]" aria-hidden="true" />
            <h2 className={`font-extrabold text-[17px] md:text-xl tracking-tight ${INK}`}>{s.name}</h2>
            <span className="text-[11px] font-semibold text-[#8A6A2A] dark:text-[#FFE6A0]/55">{s.products.length} item{s.products.length === 1 ? "" : "s"}</span>
          </div>
          <div className="-mx-4 px-4 sm:mx-0 sm:px-0 flex gap-3 overflow-x-auto scrollbar-none snap-x pb-1 md:grid md:grid-cols-5 lg:grid-cols-6 md:overflow-visible">
            {s.products.map((p) => (
              <div key={p.id} className="w-[152px] sm:w-[170px] md:w-auto shrink-0 snap-start">
                <SpotlightItemCard product={p} qty={qtyOf(p)} onAdd={onAdd} onUpdateQty={onUpdateQty} onOpen={onOpen} />
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
