import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import SEO from "../components/SEO";
import {
  Search,
  ShoppingBag,
  Home,
  ArrowRight,
  MapPin,
  Heart,
  Sparkles,
  Compass,
  ArrowLeft
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
    { name: "Munchies & Snacks", cat: "Snacks", emoji: "🍿" },
    { name: "Cold Drinks", cat: "Drinks", emoji: "🥤" },
    { name: "Pantry Staples", cat: "Staples & Atta", emoji: "🌾" },
  ];

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-slate-900 font-sans selection:bg-[#FF5B00] selection:text-white flex flex-col justify-between overflow-x-hidden">
      <SEO
        title="404 — Page Not Found | DASHIT Anantnag"
        description="The grocery item or page you requested could not be located on DASHIT. Browse fresh groceries and Kashmiri essentials with fastest delivery in Anantnag."
        noindex="follow"
      />

      {/* FLOATING CAPSULE HEADER */}
      <div className="w-full pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3 px-3 sm:px-6 lg:px-8 max-w-7xl mx-auto z-40">
        <header className="bg-[#061838] text-white rounded-2xl sm:rounded-full px-5 sm:px-8 py-3.5 shadow-xl shadow-[#061838]/15 flex items-center justify-between border border-white/10 backdrop-blur-md">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center p-1.5 shadow-sm group-hover:scale-105 transition-transform">
              <img
                src="/dashit-mark-white.png"
                alt="DASHIT"
                className="w-full h-full object-contain"
              />
            </div>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-xl font-black tracking-tight text-white">
                DASH<span className="text-[#FF5B00]">IT</span>
              </span>
              <span className="hidden sm:inline-block text-[10px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded">
                Anantnag
              </span>
            </div>
          </Link>

          <nav className="hidden sm:flex items-center space-x-6 text-xs font-bold text-slate-300">
            <Link href="/shop" className="hover:text-white transition-colors">
              Storefront
            </Link>
            <Link href="/categories" className="hover:text-white transition-colors">
              Categories
            </Link>
            <div className="flex items-center space-x-1.5 text-slate-300 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
              <MapPin className="w-3 h-3 text-[#FF5B00]" />
              <span className="text-[11px] font-semibold">192101 Hub</span>
            </div>
          </nav>

          <Link
            href="/shop"
            className="bg-[#FF5B00] hover:bg-[#E04E00] text-white text-xs font-bold px-4 sm:px-5 py-2 rounded-full shadow-md shadow-[#FF5B00]/30 transition-all hover:scale-105 active:scale-95 flex items-center space-x-1.5"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Open Shop</span>
          </Link>
        </header>
      </div>

      {/* HERO / MAIN 404 CONTENT */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 text-center flex flex-col items-center relative z-10 w-full">
        {/* Soft Background Warm Halos */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-200/35 rounded-full blur-3xl pointer-events-none -z-10" />
        <div className="absolute top-1/4 right-10 w-64 h-64 bg-amber-200/30 rounded-full blur-3xl pointer-events-none -z-10" />

        {/* ARTWORK WITH CIRCULAR AMBIENT BACKDROP */}
        <div className="relative mb-6 sm:mb-8 flex items-center justify-center">
          {/* Subtle concentric rings */}
          <div className="w-64 h-64 sm:w-80 sm:h-80 rounded-full border border-orange-200/60 absolute pointer-events-none" />
          <div className="w-72 h-72 sm:w-96 sm:h-96 rounded-full border border-slate-200/50 absolute pointer-events-none" />

          {/* Warm Sun Halo */}
          <div className="w-56 h-56 sm:w-72 sm:h-72 rounded-full bg-gradient-to-tr from-[#F59E0B]/20 via-[#FBBF24]/30 to-[#FDE68A]/40 shadow-inner flex items-center justify-center relative">
            {/* Flying Grocery Box Artwork */}
            <div className="w-64 sm:w-84 transform hover:scale-105 transition-transform duration-500">
              <img
                src="/art/flying-grocery-box-transparent.png"
                alt="DASHIT Delivery Box"
                className="w-full h-auto drop-shadow-2xl"
              />
            </div>

            {/* Error 404 Pill Overlay */}
            <div className="absolute -bottom-2 bg-[#061838] text-white px-4 py-1.5 rounded-full shadow-xl border border-white/20 flex items-center space-x-2">
              <Compass className="w-3.5 h-3.5 text-[#FF5B00] animate-spin" style={{ animationDuration: "12s" }} />
              <span className="text-xs font-black tracking-wider uppercase">
                Error 404 · Lost in Transit
              </span>
            </div>
          </div>
        </div>

        {/* HEADINGS & EXPLANATION */}
        <div className="max-w-xl mx-auto space-y-3">
          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#061838] leading-tight">
            Oops! This page took a <span className="text-[#FF5B00]">wrong turn</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 font-medium leading-relaxed max-w-md mx-auto">
            We searched from KP Road to Khanabal, but couldn&apos;t find this address. Don&apos;t worry — our delivery carts are stocked with fresh daily essentials.
          </p>
        </div>

        {/* IN-PAGE SEARCH FORM */}
        <form
          onSubmit={handleSearch}
          className="mt-6 w-full max-w-md bg-white border border-slate-200/80 rounded-2xl p-1.5 shadow-lg shadow-slate-200/40 flex items-center space-x-2 transition-all focus-within:border-[#FF5B00] focus-within:ring-2 focus-within:ring-[#FF5B00]/20"
        >
          <div className="pl-3 text-slate-400">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search milk, fresh lavas, snacks..."
            className="w-full bg-transparent text-xs sm:text-sm font-semibold text-slate-800 placeholder:text-slate-400 focus:outline-none py-2"
          />
          <button
            type="submit"
            className="bg-[#FF5B00] hover:bg-[#E04E00] text-white font-bold text-xs px-4 py-2 rounded-xl transition-colors shrink-0"
          >
            Search
          </button>
        </form>

        {/* POPULAR AISLES CHIPS */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2 max-w-lg">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mr-1">
            Popular:
          </span>
          {QUICK_CATEGORIES.map((item) => (
            <Link
              key={item.name}
              href={`/shop?cat=${encodeURIComponent(item.cat)}`}
              className="inline-flex items-center space-x-1.5 bg-white hover:bg-orange-50/70 border border-slate-200/80 hover:border-[#FF5B00]/40 rounded-full px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-[#FF5B00] transition-all shadow-xs"
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
            className="w-full sm:w-auto bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 hover:text-[#061838] font-bold text-xs sm:text-sm px-6 py-3.5 rounded-full shadow-sm hover:shadow transition-all flex items-center justify-center space-x-2 active:scale-95"
          >
            <Home className="w-4 h-4 text-slate-500" />
            <span>Back to Home</span>
          </Link>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200/70 bg-white/60 backdrop-blur-sm py-6 mt-12 text-center text-xs text-slate-500 relative z-10">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} DASHIT Technologies. Anantnag, Kashmir (192101) · Helpline: +91 6006990032</p>
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
