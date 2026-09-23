import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import SEO from "../components/SEO";
import {
  Search,
  ShoppingBag,
  Home,
  MapPin,
  Heart,
  Compass,
  PhoneCall
} from "lucide-react";

export default function Custom404() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const QUICK_CATEGORIES = [
    { name: "Dairy & Milk", cat: "Dairy", emoji: "🥛" },
    { name: "Kashmiri Bakery", cat: "Bakery", emoji: "🥖" },
    { name: "Fresh Vegetables", cat: "Vegetables", emoji: "🥬" },
    { name: "Munchies & Snacks", cat: "Snacks", emoji: "🍿" },
    { name: "Cold Drinks", cat: "Drinks & Juices", emoji: "🥤" },
    { name: "Cooking Staples", cat: "Atta, Rice & Dal", emoji: "🌾" },
  ];

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-slate-900 font-sans selection:bg-[#FF5B00] selection:text-white flex flex-col justify-between overflow-x-hidden dark:bg-[#0B0E14] dark:text-slate-100 transition-colors">
      <SEO
        title="404 — Page Not Found | DASHIT Anantnag"
        description="The grocery item or page you requested could not be located on DASHIT. Browse fresh groceries and Kashmiri essentials with fastest delivery in Anantnag."
        noindex="follow"
      >
        <link
          rel="preload"
          as="image"
          href="/art/flying-grocery-box-transparent-480.webp"
          type="image/webp"
        />
      </SEO>

      {/* FLOATING CAPSULE HEADER */}
      <div className="w-full pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto z-40">
        <header className="bg-[#061838] text-white rounded-2xl sm:rounded-full px-4 sm:px-8 py-3 sm:py-3.5 shadow-xl shadow-[#061838]/15 flex items-center justify-between border border-white/10 backdrop-blur-md">
          <Link href="/" className="flex items-center space-x-2.5 sm:space-x-3 group">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center p-1.5 shadow-sm group-hover:scale-105 transition-transform">
              <img
                src="/dashit-mark-white.png"
                alt="DASHIT"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-lg sm:text-xl font-black tracking-tight text-white">
                DASH<span className="text-[#FF5B00]">IT</span>
              </span>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                192101
              </span>
            </div>
          </Link>

          <nav className="hidden sm:flex items-center space-x-6 text-xs font-bold text-slate-300 dark:text-slate-400">
            <Link href="/shop" className="hover:text-white transition-colors">
              Storefront
            </Link>
            <Link href="/categories" className="hover:text-white transition-colors">
              Categories
            </Link>
            <div className="flex items-center space-x-1.5 text-slate-300 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
              <MapPin className="w-3 h-3 text-[#FF5B00]" />
              <span className="text-[11px] font-semibold">Anantnag Town</span>
            </div>
          </nav>

          <Link
            href="/shop"
            className="bg-[#FF5B00] hover:bg-[#E04E00] text-white text-xs font-bold px-3.5 sm:px-5 py-2 rounded-xl sm:rounded-full shadow-md shadow-[#FF5B00]/30 transition-all hover:scale-105 active:scale-95 flex items-center space-x-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Open Shop</span>
          </Link>
        </header>
      </div>

      {/* HERO / MAIN 404 CONTENT */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 text-center flex flex-col items-center relative z-10 w-full">
        {/* Soft Background Warm Halos */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 sm:w-96 h-80 sm:h-96 bg-orange-200/35 dark:bg-orange-950/20 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* ARTWORK WITH CIRCULAR AMBIENT BACKDROP */}
        <div className="relative mb-5 sm:mb-8 flex items-center justify-center max-w-full overflow-hidden p-4">
          {/* Subtle concentric rings */}
          <div className="w-56 h-56 sm:w-72 sm:h-72 rounded-full border border-orange-200/60 dark:border-orange-500/20 absolute pointer-events-none" />
          <div className="w-64 h-64 sm:w-88 sm:h-88 rounded-full border border-slate-200/50 dark:border-slate-800 absolute pointer-events-none" />

          {/* Warm Sun Halo */}
          <div className="w-48 h-48 sm:w-64 sm:h-64 rounded-full bg-gradient-to-tr from-[#F59E0B]/20 via-[#FBBF24]/30 to-[#FDE68A]/40 shadow-inner flex items-center justify-center relative">
            {/* Flying Grocery Box Artwork */}
            <div className="w-56 sm:w-72 transform hover:scale-105 transition-transform duration-500">
              <picture>
                <source
                  type="image/webp"
                  srcSet="/art/flying-grocery-box-transparent-480.webp 480w, /art/flying-grocery-box-transparent-680.webp 680w"
                  sizes="(max-width: 640px) 220px, 300px"
                />
                <img
                  src="/art/flying-grocery-box-transparent-480.webp"
                  alt="DASHIT Delivery Box"
                  width={480}
                  height={320}
                  className="w-full h-auto drop-shadow-2xl"
                  loading="eager"
                  decoding="async"
                />
              </picture>
            </div>

            {/* Error 404 Pill Overlay */}
            <div className="absolute -bottom-2.5 bg-[#061838] text-white px-3.5 sm:px-4 py-1.5 rounded-full shadow-xl border border-white/20 flex items-center space-x-2">
              <Compass className="w-3.5 h-3.5 text-[#FF5B00] animate-spin" style={{ animationDuration: "12s" }} />
              <span className="text-[11px] sm:text-xs font-black tracking-wider uppercase whitespace-nowrap">
                Error 404 · Lost in Transit
              </span>
            </div>
          </div>
        </div>

        {/* HEADINGS & EXPLANATION */}
        <div className="max-w-xl mx-auto space-y-2.5 sm:space-y-3 mt-2">
          <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-[#061838] dark:text-white leading-tight">
            Oops! This page took a <span className="text-[#FF5B00]">wrong turn</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-md mx-auto">
            We searched from KP Road to Khanabal, but couldn&apos;t find this address. Don&apos;t worry — our delivery carts are stocked with fresh daily essentials ready for dispatch in Anantnag.
          </p>
        </div>

        {/* IN-PAGE SEARCH FORM */}
        <form
          onSubmit={handleSearch}
          className="mt-6 w-full max-w-md bg-white dark:bg-[#12161F] border border-slate-200/90 dark:border-slate-800 rounded-2xl p-1.5 shadow-lg shadow-slate-200/40 dark:shadow-none flex items-center space-x-2 transition-all focus-within:border-[#FF5B00] focus-within:ring-2 focus-within:ring-[#FF5B00]/20"
        >
          <div className="pl-3 text-slate-400 dark:text-slate-500">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search milk, fresh lavas, bakery, snacks..."
            className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-800 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none py-2"
          />
          <button
            type="submit"
            className="bg-[#FF5B00] hover:bg-[#E04E00] text-white font-bold text-xs px-4 py-2.5 rounded-xl transition-colors shrink-0"
          >
            Search
          </button>
        </form>

        {/* POPULAR AISLES CHIPS */}
        <div className="mt-5 sm:mt-6 flex flex-wrap items-center justify-center gap-2 max-w-lg">
          <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mr-1">
            Popular:
          </span>
          {QUICK_CATEGORIES.map((item) => (
            <Link
              key={item.name}
              href={`/shop?cat=${encodeURIComponent(item.cat)}`}
              className="inline-flex items-center space-x-1.5 bg-white dark:bg-[#12161F] hover:bg-orange-50/70 dark:hover:bg-slate-800 border border-slate-200/80 dark:border-slate-800 hover:border-[#FF5B00]/40 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-[#FF5B00] transition-all shadow-xs active:scale-95"
            >
              <span>{item.emoji}</span>
              <span>{item.name}</span>
            </Link>
          ))}
        </div>

        {/* PRIMARY CALL TO ACTION BUTTONS */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-xs sm:max-w-md">
          <Link
            href="/shop"
            className="w-full sm:w-auto bg-[#FF5B00] hover:bg-[#E04E00] text-white font-black text-xs sm:text-sm px-6 py-3.5 rounded-full shadow-lg shadow-[#FF5B00]/30 hover:shadow-xl transition-all duration-300 flex items-center justify-center space-x-2 active:scale-95"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Go to Storefront</span>
          </Link>
          <Link
            href="/"
            className="w-full sm:w-auto bg-white dark:bg-[#12161F] hover:bg-slate-50 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-white hover:text-[#061838] font-bold text-xs sm:text-sm px-6 py-3.5 rounded-full shadow-sm hover:shadow transition-all flex items-center justify-center space-x-2 active:scale-95"
          >
            <Home className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Back to Home</span>
          </Link>
        </div>

        {/* SUPPORT / HELPLINE CALLOUT */}
        <div className="mt-6 pt-5 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center justify-center gap-2 text-xs text-slate-500 dark:text-slate-400">
          <span>Looking for an active order?</span>
          <a
            href="tel:+916006990032"
            className="inline-flex items-center gap-1 font-bold text-[#FF5B00] hover:underline"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>Call +91 6006990032</span>
          </a>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200/70 dark:border-slate-800/80 bg-white/60 dark:bg-[#080B11]/60 backdrop-blur-sm py-5 mt-10 text-center text-xs text-slate-500 dark:text-slate-400 relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} DASHIT Technologies · Anantnag, Kashmir (192101)</p>
          <p className="flex items-center space-x-1.5">
            <span>Made with</span>
            <Heart className="w-3.5 h-3.5 fill-[#FF5B00] text-[#FF5B00]" />
            <span>for Anantnag</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
