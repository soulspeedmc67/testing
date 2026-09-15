import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import SEO from "../components/SEO";
import { WebSiteJsonLd, OrganizationJsonLd, GroceryStoreJsonLd } from "../components/JsonLd";
import { isNative, isIOS, isAndroid } from "../lib/platform";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ShoppingBag,
  Zap,
  Bike,
  Store,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Play,
  X,
  Star,
  ArrowRight,
  MapPin,
  Clock,
  ShieldCheck,
  Award,
  Leaf,
  Apple,
  Heart,
  Menu
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const [isAppClient, setIsAppClient] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const isApp =
      isNative() ||
      (typeof window !== "undefined" && Boolean(window.__DASHIT_ROLE__));
    if (isApp) {
      setIsAppClient(true);
      router.replace("/shop");
    }
  }, [router]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  if (isAppClient) {
    return <div className="min-h-screen bg-white" />;
  }

  const POPULAR_CATEGORIES = [
    {
      name: "Home Care",
      desc: "Detergents, Floor & Toilet Cleaners",
      cat: "Home Care",
      img: "https://images.unsplash.com/photo-1584813470613-5b1c1cad3d69?w=400&auto=format&fit=crop&q=80",
    },
    {
      name: "Kitchen Care",
      desc: "Dishwash, Scrubs, Foil & Tissues",
      cat: "Kitchen Care",
      img: "https://images.unsplash.com/photo-1615397349754-cfa2066a298e?w=400&auto=format&fit=crop&q=80",
    },
    {
      name: "Vegetables",
      desc: "Onion, Potato, Tomato & Kashmiri Haakh",
      cat: "Vegetables",
      img: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&auto=format&fit=crop&q=80",
    },
    {
      name: "Fresh Fruits",
      desc: "Kashmiri Apples, Bananas, Oranges",
      cat: "Fresh Fruits",
      img: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&auto=format&fit=crop&q=80",
    },
    {
      name: "Chicken",
      desc: "Curry Cut, Boneless & Ready to Cook",
      cat: "Chicken",
      img: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&auto=format&fit=crop&q=80",
    },
    {
      name: "Dairy",
      desc: "Milk, Curd, Butter, Paneer & Eggs",
      cat: "Dairy",
      img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80",
    },
  ];


  return (
    <div className="min-h-screen bg-[#FFFDF9] text-slate-900 font-sans selection:bg-[#FF5B00] selection:text-white">
      <SEO
        title="DASHIT — Hyperlocal Grocery Delivery in Anantnag | 8-Minute Delivery"
        description="Anantnag's #1 quick-commerce service. Fresh Kashmiri morning bakery, milk, dairy, pantry essentials, and daily groceries delivered to your door in 8 minutes."
        canonical="/"
        ogType="website"
        keywords="DASHIT, grocery delivery Anantnag, 8 minute delivery Anantnag, quick commerce Kashmir, fresh bakery Anantnag, buy milk online Anantnag 192101"
      />
      <WebSiteJsonLd />
      <OrganizationJsonLd />
      <GroceryStoreJsonLd />

      {/* TOP FLOATING STICKY CAPSULE NAVBAR (Desktop & Mobile Sticky) */}
      <div
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          isScrolled
            ? "bg-[#FFFDF9]/95 backdrop-blur-md shadow-md py-2 border-b border-orange-100/60"
            : "bg-transparent pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-2.5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <header className={`bg-[#061838] text-white rounded-2xl sm:rounded-full px-5 sm:px-8 shadow-2xl shadow-[#061838]/20 flex items-center justify-between border border-white/10 backdrop-blur-md transition-all duration-300 ${
            isScrolled ? "py-2.5" : "py-3.5"
          }`}>
            {/* Brand Logo */}
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
                  #1 in Anantnag
                </span>
              </div>
            </Link>

            {/* Desktop Nav Links (Fully Functional) */}
            <nav className="hidden lg:flex items-center space-x-7 text-sm font-semibold text-slate-300">
              <Link href="/shop" className="hover:text-white transition-colors">
                Menu / Shop
              </Link>
              <Link href="/categories" className="hover:text-white transition-colors">
                Categories
              </Link>
              <Link href="/shop#offers" className="hover:text-white transition-colors">
                Offers
              </Link>
              <div className="flex items-center space-x-1.5 text-slate-300 bg-white/5 border border-white/10 px-3 py-1 rounded-full">
                <MapPin className="w-3.5 h-3.5 text-[#FF5B00]" />
                <span className="text-xs font-semibold">Anantnag Hub (192101)</span>
              </div>
            </nav>

            {/* User Action CTA: Shop Now button (No Account button as requested) */}
            <div className="flex items-center space-x-3">
              <Link
                href="/shop"
                className="bg-[#FF5B00] hover:bg-[#E04E00] text-white text-xs font-bold px-5 min-h-[44px] rounded-full shadow-md shadow-[#FF5B00]/30 transition-all hover:scale-105 active:scale-95 inline-flex items-center justify-center space-x-1.5"
              >
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>Shop Now</span>
              </Link>

              {/* Mobile Hamburger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                type="button"
                aria-expanded={mobileMenuOpen}
                /* The only route into navigation on a phone: padded out to the
                   44px minimum without changing how the icon looks. */
                className="lg:hidden inline-flex items-center justify-center min-w-[44px] min-h-[44px] -mr-2 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
                aria-label="Toggle menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </header>
        </div>

        {/* Mobile Dropdown Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="lg:hidden mt-2 bg-[#061838] border border-white/15 rounded-2xl p-4 shadow-2xl text-white space-y-3"
            >
              <Link
                href="/shop"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 px-3 rounded-lg hover:bg-white/10 font-semibold text-sm"
              >
                Menu / Shop
              </Link>
              <Link
                href="/categories"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 px-3 rounded-lg hover:bg-white/10 font-semibold text-sm text-[#FF5B00]"
              >
                Groceries &amp; Categories
              </Link>
              <Link
                href="/shop#offers"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 px-3 rounded-lg hover:bg-white/10 font-semibold text-sm"
              >
                Special Offers
              </Link>
              <Link
                href="/privacy"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 px-3 rounded-lg hover:bg-white/10 font-semibold text-sm text-slate-400"
              >
                Privacy Policy
              </Link>
              <Link
                href="/terms"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 px-3 rounded-lg hover:bg-white/10 font-semibold text-sm text-slate-400"
              >
                Terms &amp; Conditions
              </Link>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* HERO SECTION — 3-COLUMN LAYOUT */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-14 pb-12 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-center">
          
          {/* COLUMN 1: LEFT EDITORIAL HEADLINE & ACTIONS (Col span 4) */}
          <div className="lg:col-span-4 flex flex-col items-start z-10 relative">
            {/* Background Peach Blush Halo */}
            <div className="absolute -top-12 -left-12 w-64 h-64 bg-orange-200/40 rounded-full blur-3xl pointer-events-none -z-10" />

            {/* Confident Delivery Badge */}
            <div className="inline-flex items-center space-x-2 bg-orange-50 border border-orange-200 rounded-full px-3.5 py-1.5 mb-4 shadow-sm">
              <Award className="w-4 h-4 text-[#FF5B00]" />
              <span className="text-[11px] font-black uppercase tracking-wider text-[#FF5B00]">
                Fastest Delivery in Anantnag
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black tracking-tight leading-[1.08] text-[#061838]">
              Fastest <br />
              <span className="text-[#FF5B00]">Delivery &amp;</span> <br />
              Easy Pickup
            </h1>

            {/* Confident Slogan (No people photos / No user count) */}
            <p className="mt-4 text-xs sm:text-sm text-slate-600 font-medium leading-relaxed max-w-sm">
              Anantnag&apos;s pioneering hyperlocal quick-commerce platform. Fresh Kashmiri morning bakery, dairy, staples, and daily essentials at your doorstep with fastest delivery in Anantnag.
            </p>

            {/* Action Row */}
            <div className="mt-8 flex flex-wrap items-center gap-4 sm:gap-5">
              {/* Primary Search / Shop CTA */}
              <Link
                href="/shop"
                className="bg-[#061838] hover:bg-[#FF5B00] text-white font-bold text-sm sm:text-base px-6 sm:px-7 py-3.5 rounded-full shadow-lg shadow-[#061838]/20 hover:shadow-[#FF5B00]/30 transition-all duration-300 flex items-center space-x-3 group active:scale-95"
              >
                <div className="w-7 h-7 rounded-full bg-white/15 flex items-center justify-center group-hover:rotate-12 transition-transform">
                  <Search className="w-3.5 h-3.5 text-white" />
                </div>
                <span>Order Groceries</span>
              </Link>

              {/* Circular Interactive 'How to order' Trigger */}
              <button
                onClick={() => setShowHowItWorks(true)}
                className="flex items-center space-x-3 group cursor-pointer focus:outline-none"
              >
                {/* Orbital Ring with Play Button */}
                <div className="relative w-11 h-11 flex items-center justify-center">
                  <div className="absolute inset-0 rounded-full border-2 border-slate-200" />
                  <div className="absolute inset-0 rounded-full border-2 border-[#FF5B00] border-b-transparent border-l-transparent -rotate-45 group-hover:rotate-90 transition-transform duration-500" />
                  <div className="w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Play className="w-3.5 h-3.5 fill-[#FF5B00] text-[#FF5B00] ml-0.5" />
                  </div>
                </div>
                <span className="text-xs sm:text-sm font-bold text-slate-800 group-hover:text-[#FF5B00] transition-colors">
                  How to order
                </span>
              </button>
            </div>
          </div>

          {/* COLUMN 2: CENTER CIRCULAR SUN PORTAL + ARTWORK (Col span 5)
              The circular composition is intentional. What is gone is the
              motion: no infinite bobbing on the disc contents or the badges,
              and no hover scale — a hover state never fires on touch anyway,
              and the drifting is what read as generated. Everything sits still. */}
          <div className="lg:col-span-5 flex justify-center items-center relative py-6 sm:py-10">
            {/* Concentric Orbital Outline Rings */}
            <div className="w-72 h-72 sm:w-88 sm:h-88 md:w-[410px] md:h-[410px] xl:w-[440px] xl:h-[440px] rounded-full border border-slate-200/70 absolute pointer-events-none flex items-center justify-center" />
            <div className="w-80 h-80 sm:w-96 sm:h-96 md:w-[460px] md:h-[460px] xl:w-[490px] xl:h-[490px] rounded-full border border-slate-100 absolute pointer-events-none" />

            {/* Orbit Accent Arcs */}
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full border-t-4 border-l-4 border-emerald-500 absolute -top-2 left-6 sm:left-12 pointer-events-none -rotate-12" />
            <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full border-b-4 border-r-4 border-[#FF5B00] absolute -bottom-2 right-4 sm:right-10 pointer-events-none -rotate-12" />

            {/* Radiant Sun Disc */}
            <div className="w-64 h-64 sm:w-80 sm:h-80 md:w-[360px] md:h-[360px] xl:w-[390px] xl:h-[390px] rounded-full bg-gradient-to-tr from-[#F59E0B] via-[#FBBF24] to-[#FDE68A] shadow-xl shadow-amber-500/15 relative flex items-center justify-center overflow-visible">

              {/* Inner ambient glow */}
              <div className="absolute inset-4 rounded-full bg-gradient-to-b from-amber-200/50 to-transparent blur-sm pointer-events-none" />

              {/* FLYING GROCERY BOX — seated, not drifting */}
              <div className="relative z-10 w-[112%] sm:w-[120%] xl:w-[124%] -mt-4">
                {/* The landing page's LCP element. It was a 1.4 MB 1536px PNG on
                    a screen that never shows it wider than ~500 CSS px, which is
                    most of what a first-time visitor on mobile data waited for.
                    WebP first, PNG kept as the fallback; the intrinsic size
                    reserves the box so the hero does not jump when it lands. */}
                <picture>
                  <source srcSet="/art/flying-grocery-box-transparent.webp" type="image/webp" />
                  <img
                    src="/art/flying-grocery-box-transparent.png"
                    alt="DASHIT Flying Grocery Delivery Box"
                    width={1536}
                    height={1024}
                    /* lowercase: the React runtime in this project does not
                       recognise the camelCase prop and drops it with a warning */
                    fetchpriority="high"
                    decoding="async"
                    className="w-full h-auto drop-shadow-xl"
                  />
                </picture>
              </div>

              {/* Badge Top Right — pinned to the disc, static */}
              <div className="absolute top-2 -right-4 sm:-right-6 bg-white px-3.5 py-1.5 rounded-full shadow-md border border-slate-100 flex items-center space-x-1.5 z-20">
                <Clock className="w-3.5 h-3.5 text-[#FF5B00] shrink-0" />
                <span className="text-[11px] font-black text-slate-800 tracking-tight whitespace-nowrap">
                  Fastest Delivery Promise
                </span>
              </div>

              {/* Badge Bottom Left — pinned to the disc, static */}
              <div className="absolute -bottom-3 -left-3 sm:-left-6 bg-white px-3.5 py-1.5 rounded-full shadow-md border border-slate-100 flex items-center space-x-1.5 z-20">
                <Leaf className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-[11px] font-black text-slate-800 tracking-tight whitespace-nowrap">
                  100% Fresh Produce
                </span>
              </div>
            </div>
          </div>

          {/* COLUMN 3: RIGHT FEATURE CARDS (Col span 3) */}
          <div className="lg:col-span-3 flex flex-col space-y-6 sm:space-y-7 relative lg:pl-4">
            
            {/* Feature Card 1: Fast Delivery */}
            <div className="flex items-start space-x-4 group cursor-pointer">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-md shadow-slate-200/70 border border-slate-100 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:border-[#FF5B00]/40 transition-all">
                <Bike className="w-6 h-6 text-[#061838] group-hover:text-[#FF5B00] transition-colors" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#061838] group-hover:text-[#FF5B00] transition-colors leading-tight">
                  Fastest Delivery in Anantnag
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Dedicated delivery fleet delivering fresh groceries across Anantnag faster than anyone else
                </p>
              </div>
            </div>

            {/* Feature Card 2: Express Pickup */}
            <div className="flex items-start space-x-4 group cursor-pointer">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-md shadow-slate-200/70 border border-slate-100 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:border-[#FF5B00]/40 transition-all">
                <Store className="w-6 h-6 text-[#061838] group-hover:text-[#FF5B00] transition-colors" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#061838] group-hover:text-[#FF5B00] transition-colors leading-tight">
                  Store Pick up
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Instant click &amp; collect from your nearest DASHit store
                </p>
              </div>
            </div>

            {/* Feature Card 3: Kashmiri Staples */}
            <div className="flex items-start space-x-4 group cursor-pointer">
              <div className="w-12 h-12 rounded-2xl bg-white shadow-md shadow-slate-200/70 border border-slate-100 flex items-center justify-center shrink-0 group-hover:scale-105 group-hover:border-[#FF5B00]/40 transition-all">
                <Sparkles className="w-6 h-6 text-[#061838] group-hover:text-[#FF5B00] transition-colors" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#061838] group-hover:text-[#FF5B00] transition-colors leading-tight">
                  Kashmiri Staples
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Daily hot bakery lavas, dairy, spices and kitchen essentials
                </p>
              </div>
            </div>

            {/* Carousel Edge Button */}
            <div className="hidden xl:flex items-center justify-end pt-2">
              <Link
                href="/shop"
                className="w-10 h-10 rounded-full bg-white shadow-md border border-slate-100 flex items-center justify-center text-slate-400 hover:text-[#FF5B00] hover:scale-105 transition-all"
                title="Browse Full Store"
              >
                <ChevronRight className="w-5 h-5" />
              </Link>
            </div>
          </div>
        </div>

        {/* BOTTOM CURVED ORANGE APP BANNER (No junk food, No user photos, Coming Soon on App Store & Play Store) */}
        <div className="mt-20 sm:mt-28 relative">
          
          {/* Main Curved Orange Fluid Container */}
          <div className="bg-[#FF5B00] rounded-[36px] sm:rounded-[48px] shadow-lg p-6 sm:p-10 lg:p-14 relative overflow-visible">
            
            {/* Playful Doodles / Motion Marks */}
            <div className="absolute top-6 left-[22%] sm:left-[26%] text-white/30 text-2xl font-black select-none pointer-events-none">
              ///
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              
              {/* SMARTPHONE FLAT CSS MOCKUP (Col span 4) */}
              <div className="lg:col-span-4 flex justify-center lg:justify-start -mt-16 sm:-mt-24 relative z-20">
                <div className="w-60 sm:w-68 xl:w-72 bg-slate-950 rounded-[44px] p-2.5 shadow-2xl border-[4px] border-slate-800 relative">
                  {/* Dynamic Island / Speaker */}
                  <div className="w-20 h-4 bg-slate-900 rounded-full mx-auto mb-2 flex items-center justify-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-950 mr-1" />
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-900/60" />
                  </div>

                  {/* Screen Content */}
                  <div className="bg-[#FAF9F5] rounded-[36px] overflow-hidden p-3.5 text-slate-800 shadow-inner">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                          Delivery in 10 mins
                        </span>
                        <h4 className="text-xs font-black text-[#061838]">
                          Fresh Daily Groceries
                        </h4>
                      </div>
                      <div className="w-7 h-7 rounded-full bg-[#FF5B00] text-white flex items-center justify-center text-[10px] font-black">
                        D
                      </div>
                    </div>

                    <div className="mt-2.5 bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 flex items-center space-x-1.5 shadow-xs">
                      <Search className="w-3 h-3 text-slate-400" />
                      <span className="text-[10px] text-slate-400 font-medium">
                        Search milk, lavas, staples...
                      </span>
                    </div>

                    <div className="mt-2.5 flex space-x-1.5 overflow-hidden">
                      <span className="bg-[#FF5B00] text-white text-[9px] font-bold px-2 py-0.5 rounded-md shrink-0">
                        Dairy
                      </span>
                      <span className="bg-white border border-slate-200 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-md shrink-0">
                        Bakery
                      </span>
                      <span className="bg-white border border-slate-200 text-slate-600 text-[9px] font-bold px-2 py-0.5 rounded-md shrink-0">
                        Staples
                      </span>
                    </div>

                    {/* Product 1 */}
                    <div className="mt-3 bg-white rounded-xl p-2 border border-slate-100 shadow-sm flex items-center space-x-2.5">
                      <img
                        src="https://images.unsplash.com/photo-1550583724-b2692b85b150?w=120&auto=format&fit=crop&q=80"
                        alt="Amul Milk"
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-slate-800 truncate">
                          Amul Gold Milk
                        </p>
                        <p className="text-[9px] text-slate-400">
                          500 ml • 10 mins
                        </p>
                        <span className="text-[10px] font-black text-[#FF5B00]">
                          ₹36
                        </span>
                      </div>
                      <Link
                        href="/shop"
                        className="bg-orange-50 text-[#FF5B00] border border-[#FF5B00]/40 font-black text-[9px] px-2 py-1 rounded-md hover:bg-[#FF5B00] hover:text-white transition-colors"
                      >
                        ADD
                      </Link>
                    </div>

                    {/* Product 2 */}
                    <div className="mt-2 bg-white rounded-xl p-2 border border-slate-100 shadow-sm flex items-center space-x-2.5">
                      <img
                        src="https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=120&auto=format&fit=crop&q=80"
                        alt="Kashmiri Lavas"
                        className="w-10 h-10 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-black text-slate-800 truncate">
                          Fresh Kashmiri Lavas
                        </p>
                        <p className="text-[9px] text-slate-400">
                          Pack of 4 • Morning
                        </p>
                        <span className="text-[10px] font-black text-[#FF5B00]">
                          ₹20
                        </span>
                      </div>
                      <Link
                        href="/shop"
                        className="bg-orange-50 text-[#FF5B00] border border-[#FF5B00]/40 font-black text-[9px] px-2 py-1 rounded-md hover:bg-[#FF5B00] hover:text-white transition-colors"
                      >
                        ADD
                      </Link>
                    </div>

                    <div className="mt-2 text-center">
                      <Link
                        href="/shop"
                        className="inline-flex items-center justify-center min-h-[44px] px-3 text-[10px] font-bold text-[#FF5B00] hover:underline"
                      >
                        Tap to open live store →
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              {/* BANNER CENTER: HEADLINE & COVERAGE INFO (Col span 5, No fake users, No people photos) */}
              <div className="lg:col-span-5 text-white space-y-4">
                <div className="inline-flex items-center space-x-1.5 bg-white/20 backdrop-blur-md rounded-full px-3 py-1 text-xs font-bold">
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>Fastest Delivery in Anantnag</span>
                </div>
                <h2 className="text-3xl sm:text-4xl xl:text-5xl font-black tracking-tight leading-tight">
                  Download <br />
                  our Mobile App
                </h2>
                <p className="text-white/90 text-sm sm:text-base font-medium max-w-md leading-relaxed">
                  Real-time rider GPS tracking, 1-tap checkout, and seamless doorstep delivery across Anantnag.
                </p>

                {/* Local Delivery Coverage Tagline */}
                <div className="pt-1 flex items-center space-x-2 text-xs font-semibold text-white/90 bg-white/10 p-3 rounded-2xl border border-white/15">
                  <MapPin className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>Serving Anantnag (192101): KP Road, Civil Lines, Ashajipora, Khanabal, Main Market &amp; Mattan.</span>
                </div>
              </div>

              {/* BANNER RIGHT: OFFICIAL APP STORE & PLAY STORE BADGES (COMING SOON) */}
              <div className="lg:col-span-3 flex sm:flex-row lg:flex-row gap-4 items-center justify-center lg:justify-end">
                
                {/* Google Play Store Badge (Coming Soon) */}
                <div
                  className="bg-white text-slate-900 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col items-center justify-center w-36 sm:w-40 select-none text-center border border-white/30 hover:scale-105 transition-transform"
                >
                  <div className="w-9 h-9 mb-2 flex items-center justify-center">
                    {/* Official Google Play Vector Icon */}
                    <svg viewBox="0 0 256 283" className="w-7 h-7">
                      <path
                        d="M119.553141,134.916362 L1.0599006,259.060547 C3.75619448,268.616998 10.7182836,276.3906 19.9208658,280.119977 C29.1234481,283.849353 39.5331235,283.115716 48.121672,278.132484 L181.448642,202.197919 L119.553141,134.916362 Z"
                        fill="#EA4335"
                      />
                      <path
                        d="M239.370822,113.813616 L181.71353,80.7909097 L116.815965,137.741834 L181.978418,202.021326 L239.19423,169.351804 C249.525723,163.942452 256,153.24465 256,141.58271 C256,129.92077 249.525723,119.222968 239.19423,113.813616 L239.370822,113.813616 Z"
                        fill="#FBBC04"
                      />
                      <path
                        d="M1.0599006,23.4868015 C0.343633396,26.134699 -0.0127538816,28.8670014 -9.94374397e-15,31.6100341 L-9.94374397e-15,250.937314 C0.00751268399,253.679042 0.363556675,256.408712 1.0599006,259.060547 L123.614758,138.095018 L1.0599006,23.4868015 Z"
                        fill="#4285F4"
                      />
                      <path
                        d="M120.436101,141.273674 L181.71353,80.7909097 L48.5631521,4.50316009 C43.5539929,1.56944036 37.8568091,0.0156629668 32.0517989,0 C17.6444261,-0.0284873284 4.97836875,9.53420553 1.0599006,23.3985055 L120.436101,141.273674 Z"
                        fill="#34A853"
                      />
                    </svg>
                  </div>
                  <div className="flex items-center space-x-0.5 text-amber-400 mb-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#FF5B00] bg-orange-50 border border-orange-200/60 px-2 py-0.5 rounded-full mt-1">
                    Coming Soon
                  </span>
                  <div className="mt-1.5 leading-none">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Get it on</span>
                    <span className="text-xs font-black text-slate-900 block mt-0.5">Google Play</span>
                  </div>
                </div>

                {/* Apple App Store Badge (Coming Soon) */}
                <div
                  className="bg-white text-slate-900 rounded-2xl p-4 sm:p-5 shadow-xl flex flex-col items-center justify-center w-36 sm:w-40 select-none text-center border border-white/30 hover:scale-105 transition-transform"
                >
                  <div className="w-9 h-9 mb-2 flex items-center justify-center">
                    {/* Official Apple App Store Icon */}
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-b from-[#2E9BFF] via-[#0B7DFE] to-[#0060E5] flex items-center justify-center shadow-md shadow-blue-500/25">
                      <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                        <path d="M8.8086 14.9194l6.1107-11.0368c.0837-.1513.1682-.302.2437-.4584.0685-.142.1267-.2854.1646-.4403.0803-.3259.0588-.6656-.066-.9767-.1238-.3095-.3417-.5678-.6201-.7355a1.4175 1.4175 0 0 0-.921-.1924c-.3207.043-.6135.1935-.8443.4288-.1094.1118-.1996.2361-.2832.369-.092.1463-.175.2979-.259.4492l-.3864.6979-.3865-.6979c-.0837-.1515-.1667-.303-.2587-.4492-.0837-.1329-.1739-.2572-.2835-.369-.2305-.2353-.5233-.3857-.844-.429a1.4181 1.4181 0 0 0-.921.1926c-.2784.1677-.4964.426-.6203.7355-.1246.311-.1461.6508-.066.9767.038.155.0962.2984.1648.4403.0753.1564.1598.307.2437.4584l1.248 2.2543-4.8625 8.7825H2.0295c-.1676 0-.3351-.0007-.5026.0092-.1522.009-.3004.0284-.448.0714-.3108.0906-.5822.2798-.7783.548-.195.2665-.3006.5929-.3006.9279 0 .3352.1057.6612.3006.9277.196.2683.4675.4575.7782.548.1477.043.296.0623.4481.0715.1675.01.335.009.5026.009h13.0974c.0171-.0357.059-.1294.1-.2697.415-1.4151-.6156-2.843-2.0347-2.843zM3.113 18.5418l-.7922 1.5008c-.0818.1553-.1644.31-.2384.4705-.067.1458-.124.293-.1611.452-.0785.3346-.0576.6834.0645 1.0029.1212.3175.3346.583.607.7549.2727.172.5891.2416.9013.1975.3139-.044.6005-.1986.8263-.4402.1072-.1148.1954-.2424.2772-.3787.0902-.1503.1714-.3059.2535-.4612L6 19.4636c-.0896-.149-.9473-1.4704-2.887-.9218m20.5861-3.0056a1.4707 1.4707 0 0 0-.779-.5407c-.1476-.0425-.2961-.0616-.4483-.0705-.1678-.0099-.3352-.0091-.503-.0091H18.648l-4.3891-7.817c-.6655.7005-.9632 1.485-1.0773 2.1976-.1655 1.0333.0367 2.0934.546 3.0004l5.2741 9.3933c.084.1494.167.299.2591.4435.0837.131.1739.2537.2836.364.231.2323.5238.3809.8449.4232.3192.0424.643-.0244.9217-.1899.2784-.1653.4968-.4204.621-.7257.1246-.3072.146-.6425.0658-.9641-.0381-.1529-.0962-.2945-.165-.4346-.0753-.1543-.1598-.303-.2438-.4524l-1.216-2.1662h1.596c.1677 0 .3351.0009.5029-.009.1522-.009.3007-.028.4483-.0705a1.4707 1.4707 0 0 0 .779-.5407A1.5386 1.5386 0 0 0 24 16.452a1.539 1.539 0 0 0-.3009-.9158Z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex items-center space-x-0.5 text-amber-400 mb-1">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-2.5 h-2.5 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <span className="text-[9px] font-extrabold uppercase tracking-wider text-[#061838] bg-slate-100 border border-slate-200/60 px-2 py-0.5 rounded-full mt-1">
                    Coming Soon
                  </span>
                  <div className="mt-1.5 leading-none">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Download on</span>
                    <span className="text-xs font-black text-slate-900 block mt-0.5">App Store</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* POPULAR CATEGORIES SECTION */}
        <section id="categories" className="mt-24">
          <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between mb-8">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-[#FF5B00] block mb-1">
                Explore The Aisle
              </span>
              <h2 className="text-2xl sm:text-3xl font-black text-[#061838] tracking-tight">
                Popular Categories
              </h2>
            </div>
            <Link
              href="/categories"
              className="mt-2 sm:mt-0 text-xs sm:text-sm font-bold text-[#FF5B00] hover:text-[#E04E00] inline-flex items-center min-h-[44px] space-x-1 group"
            >
              <span>View all categories</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 sm:gap-5">
            {POPULAR_CATEGORIES.map((cat, idx) => (
              <Link
                key={idx}
                href={`/shop?cat=${encodeURIComponent(cat.cat)}`}
                className="bg-white rounded-3xl p-3 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-[#FF5B00]/50 transition-all group flex flex-col items-center text-center"
              >
                <div className="w-full h-24 sm:h-28 rounded-2xl overflow-hidden mb-3 bg-slate-100 relative">
                  <img
                    src={cat.img}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h3 className="text-xs sm:text-sm font-black text-[#061838] group-hover:text-[#FF5B00] transition-colors line-clamp-1">
                  {cat.name}
                </h3>
                <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1 font-medium">
                  {cat.desc}
                </p>
              </Link>
            ))}
          </div>
        </section>
      </main>

      {/* HOW IT WORKS MODAL */}
      <AnimatePresence>
        {showHowItWorks && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative"
            >
              <button
                onClick={() => setShowHowItWorks(false)}
                className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center space-x-2 mb-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#FF5B00]" />
                <span className="text-xs font-black uppercase tracking-wider text-[#FF5B00]">
                  Fastest Delivery Promise
                </span>
              </div>
              <h3 className="text-2xl font-black text-[#061838]">
                How DASHIT Works
              </h3>

              <div className="mt-6 space-y-6">
                <div className="flex items-start space-x-4">
                  <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#FF5B00] flex items-center justify-center font-black text-sm shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#061838]">Select Your Daily Essentials</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Choose fresh milk, hot Kashmiri bakery lavas, snacks, or staples in a few taps.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#061838] flex items-center justify-center font-black text-sm shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#061838]">Packed in 2 Minutes</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Our Anantnag team scans and packs your bag with precision.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-4">
                  <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-black text-sm shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-[#061838]">Fastest Delivery Across Anantnag</h4>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Our dedicated delivery fleet brings your order directly to your address with live GPS updates.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">Zero Delivery Fee on First Order</span>
                <Link
                  href="/shop"
                  onClick={() => setShowHowItWorks(false)}
                  className="bg-[#FF5B00] text-white font-bold text-xs px-5 py-2.5 rounded-full hover:bg-[#E04E00] transition-colors"
                >
                  Start Shopping Now
                </Link>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FOOTER (With Legal Links: Privacy Policy & Terms) */}
      <footer className="bg-[#061838] text-white border-t border-white/10 mt-20 pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between pb-8 border-b border-white/10 gap-6">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center p-1.5">
                <img
                  src="/dashit-mark-white.png"
                  alt="DASHIT"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="text-xl font-black tracking-tight text-white block leading-none">
                  DASH<span className="text-[#FF5B00]">IT</span>
                </span>
                <span className="text-[10px] font-bold text-slate-400 block mt-0.5">
                  Fastest Delivery in Anantnag
                </span>
              </div>
            </div>

            {/* Footer links were 16px tall. The gap absorbs the added padding,
                so the row looks the same but each link is now thumb-sized. */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs text-slate-400 font-semibold">
              <Link href="/shop" className="inline-flex items-center min-h-[44px] hover:text-white transition-colors">
                Shop Groceries
              </Link>
              <Link href="/categories" className="inline-flex items-center min-h-[44px] hover:text-white transition-colors">
                Categories
              </Link>
              <Link href="/privacy" className="inline-flex items-center min-h-[44px] hover:text-[#FF5B00] transition-colors font-bold text-slate-300">
                Privacy Policy
              </Link>
              <Link href="/terms" className="inline-flex items-center min-h-[44px] hover:text-[#FF5B00] transition-colors font-bold text-slate-300">
                Terms &amp; Conditions
              </Link>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <p>© {new Date().getFullYear()} DASHIT Technologies. Anantnag, Jammu &amp; Kashmir (192101). Customer Helpline: +91 6006990032</p>
            <p className="flex items-center space-x-1.5">
              <span>Made with</span>
              <Heart className="w-3.5 h-3.5 fill-[#FF5B00] text-[#FF5B00]" />
              <span>for Anantnag</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
