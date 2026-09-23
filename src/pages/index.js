import React, { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/router";
import SEO from "../components/SEO";
import { WebSiteJsonLd, OrganizationJsonLd, GroceryStoreJsonLd } from "../components/JsonLd";

const AppFeatureShowcase = dynamic(() => import("../components/ArtisticBentoFeatures"), {
  ssr: true,
  loading: () => (
    <div className="w-full h-96 rounded-3xl bg-slate-100 dark:bg-slate-900/60 my-24" />
  ),
});

import { isNative } from "../lib/platform";
import { useTheme } from "../context/ThemeContext";
import { hapticLight } from "../lib/haptics";
import { motion, AnimatePresence } from "framer-motion";
import { stagger, fadeUp, inViewOnce, EASE_OUT } from "../lib/motion";
import { ChevronRight, X, ArrowRight, Menu, Sun, Moon, Download, Clock, Leaf, Sparkles } from "lucide-react";

const POPULAR_CATEGORIES = [
  {
    name: "Kashmiri Bakery",
    desc: "Lavas, czot & roath",
    img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=400&auto=format&fit=crop&q=80",
    cat: "Bakery",
  },
  {
    name: "Milk, Curd & Dairy",
    desc: "Amul, paneer & curd",
    img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80",
    cat: "Dairy",
  },
  {
    name: "Fresh Vegetables",
    desc: "Farm-crisp greens",
    img: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&auto=format&fit=crop&q=80",
    cat: "Vegetables",
  },
  {
    name: "Fresh Fruits",
    desc: "Apples, bananas & citrus",
    img: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&auto=format&fit=crop&q=80",
    cat: "Fresh Fruits",
  },
  {
    name: "Cold Drinks",
    desc: "Colas, juices & ice tea",
    img: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&auto=format&fit=crop&q=80",
    cat: "Drinks & Juices",
  },
  {
    name: "Cooking Staples",
    desc: "Atta, rice, dal & ghee",
    img: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=80",
    cat: "Atta, Rice & Dal",
  },
];

const DELIVERY_STEPS = [
  {
    n: "01",
    title: "Choose your essentials",
    body: "Fresh milk, morning Kashmiri bakery, vegetables or snacks — in a few taps.",
  },
  {
    n: "02",
    title: "Packed and checked",
    body: "Our local team scans every item into your bag before it leaves the store.",
  },
  {
    n: "03",
    title: "Delivered to your door",
    body: "A dedicated rider brings it over, with live GPS tracking the whole way.",
  },
];

/** A small caps label with a leading rule — used instead of decorative badges. */
function Eyebrow({ children, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="w-6 h-px bg-[#FF5B00]" />
      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#FF5B00]">
        {children}
      </span>
    </span>
  );
}

export default function LandingPage() {
  const router = useRouter();
  const { theme, setPreference } = useTheme();
  const [isAppClient, setIsAppClient] = useState(false);
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
    let isScrolledRef = false;
    const handleScroll = () => {
      const nextScrolled = window.scrollY > 16;
      if (nextScrolled !== isScrolledRef) {
        isScrolledRef = nextScrolled;
        setIsScrolled(nextScrolled);
      }
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const toggleTheme = () => {
    hapticLight();
    setPreference(theme === "dark" ? "light" : "dark");
  };

  const scrollToId = (id) => (e) => {
    e?.preventDefault();
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (isAppClient) {
    return <div className="min-h-screen bg-white dark:bg-surface" />;
  }

  return (
    <div className="min-h-screen bg-[#FCFBF8] text-slate-900 font-sans antialiased selection:bg-[#FF5B00] selection:text-white dark:bg-[#0B0E14] dark:text-slate-100 transition-colors duration-300">
      <SEO
        title="DASHIT — #1 Grocery Delivery App in Anantnag | Fastest Delivery"
        description="Download the DASHIT mobile app for Android & iOS. #1 fastest grocery delivery across Anantnag. Fresh Kashmiri bakery, milk, dairy, pantry essentials with live GPS tracking."
        canonical="/"
        ogType="website"
        keywords="DASHIT, grocery delivery app Anantnag, fastest grocery delivery Anantnag, quick commerce Kashmir, download DASHIT app, buy milk online Anantnag 192101"
      />
      <WebSiteJsonLd />
      <OrganizationJsonLd />
      <GroceryStoreJsonLd />

      {/* ================================================================= */}
      {/* HEADER                                                            */}
      {/* ================================================================= */}
      <header
        className={`sticky top-0 z-50 w-full transition-[background-color,border-color,box-shadow] duration-300 border-b ${
          isScrolled
            ? "bg-[#FCFBF8]/85 dark:bg-[#0B0E14]/85 backdrop-blur-xl border-slate-200/80 dark:border-slate-800/80"
            : "bg-transparent border-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="h-16 sm:h-[72px] flex items-center justify-between gap-4">
            <Link href="/" className="flex items-center gap-2.5 shrink-0">
              <span className="w-9 h-9 rounded-xl bg-[#061838] flex items-center justify-center p-1.5">
                <img src="/dashit-mark-white.png" alt="" className="w-full h-full object-contain" />
              </span>
              <span className="text-[19px] font-black tracking-tight text-[#061838] dark:text-white">
                DASH<span className="text-[#FF5B00]">IT</span>
              </span>
            </Link>

            <nav className="hidden md:flex items-center gap-8 text-[13px] font-semibold text-slate-600 dark:text-slate-300">
              <a
                href="#app-features"
                onClick={scrollToId("app-features")}
                className="hover:text-[#061838] dark:hover:text-white transition-colors"
              >
                Features
              </a>
              <a
                href="#web-store"
                onClick={scrollToId("web-store")}
                className="hover:text-[#061838] dark:hover:text-white transition-colors"
              >
                Shop on web
              </a>
              <span className="text-slate-400 dark:text-slate-500 font-medium">
                Anantnag · 192101
              </span>
            </nav>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                className="w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                {theme === "dark" ? <Sun className="w-[17px] h-[17px]" /> : <Moon className="w-[17px] h-[17px]" />}
              </button>

              <a
                href="#get-the-app"
                onClick={scrollToId("get-the-app")}
                className="hidden sm:inline-flex items-center gap-1.5 bg-[#061838] hover:bg-[#0A2449] dark:bg-white dark:text-[#061838] dark:hover:bg-slate-200 text-white text-[13px] font-bold px-4 h-9 rounded-xl transition-colors"
              >
                Get the app
              </a>

              <button
                type="button"
                onClick={() => setMobileMenuOpen((v) => !v)}
                aria-expanded={mobileMenuOpen}
                aria-label="Toggle menu"
                className="md:hidden w-9 h-9 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center"
              >
                {mobileMenuOpen ? <X className="w-[18px] h-[18px]" /> : <Menu className="w-[18px] h-[18px]" />}
              </button>
            </div>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28, ease: EASE_OUT }}
              className="md:hidden overflow-hidden border-t border-slate-200/80 dark:border-slate-800/80 bg-[#FCFBF8] dark:bg-[#0B0E14]"
            >
              <div className="px-5 py-4 flex flex-col gap-1">
                <a
                  href="#get-the-app"
                  onClick={(e) => {
                    setMobileMenuOpen(false);
                    scrollToId("get-the-app")(e);
                  }}
                  className="py-2.5 text-sm font-bold text-[#061838] dark:text-white"
                >
                  Get the app
                </a>
                <a
                  href="#app-features"
                  onClick={(e) => {
                    setMobileMenuOpen(false);
                    scrollToId("app-features")(e);
                  }}
                  className="py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300"
                >
                  Features
                </a>
                <a
                  href="#web-store"
                  onClick={(e) => {
                    setMobileMenuOpen(false);
                    scrollToId("web-store")(e);
                  }}
                  className="py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300"
                >
                  Shop on web
                </a>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="max-w-6xl mx-auto px-5 sm:px-8 w-full">
        {/* =============================================================== */}
        {/* HERO                                                            */}
        {/* =============================================================== */}
        <section className="pt-10 sm:pt-16 lg:pt-20 pb-16 sm:pb-24 grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">
          <motion.div
            variants={stagger(0.08, 0.05)}
            initial="hidden"
            animate="show"
            className="lg:col-span-6 xl:col-span-7"
          >
            <motion.div variants={fadeUp}>
              <Eyebrow>Anantnag · 192101</Eyebrow>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="mt-5 text-[38px] leading-[1.06] sm:text-[52px] xl:text-[60px] font-black tracking-[-0.03em] text-[#061838] dark:text-white"
            >
              Groceries at your door,{" "}
              <span className="text-[#FF5B00]">in minutes.</span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mt-6 max-w-lg text-[15px] sm:text-base leading-relaxed text-slate-600 dark:text-slate-300"
            >
              DASHIT is the fastest grocery delivery app in Anantnag. Fresh Kashmiri bakery,
              milk and dairy, vegetables and daily essentials — tracked live from our store
              to your doorstep.
            </motion.p>

            {/* Download */}
            <motion.div variants={fadeUp} id="get-the-app" className="mt-9 scroll-mt-24">
              {/* Coming Soon Pill */}
              <div className="inline-flex items-center gap-2 bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 rounded-full px-3.5 py-1 mb-3 text-amber-700 dark:text-amber-300 text-xs font-bold">
                <Sparkles className="w-3.5 h-3.5 text-[#FF5B00]" />
                <span>Play Store &amp; App Store Available Soon • Direct Download Ready</span>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 max-w-lg">
                <a
                  href="/Dashit-User.apk"
                  download="Dashit-User.apk"
                  className="flex-1 group bg-[#061838] hover:bg-[#0A2449] dark:bg-[#12161F] dark:hover:bg-[#1A1F2B] border border-[#061838] dark:border-slate-700/80 text-white rounded-2xl px-4 py-3 flex items-center gap-3 transition-colors"
                >
                  <svg viewBox="0 0 256 283" className="w-5 h-5 shrink-0">
                    <path d="M119.553141,134.916362 L1.0599006,259.060547 C3.75619448,268.616998 10.7182836,276.3906 19.9208658,280.119977 C29.1234481,283.849353 39.5331235,283.115716 48.121672,278.132484 L181.448642,202.197919 L119.553141,134.916362 Z" fill="#EA4335" />
                    <path d="M239.370822,113.813616 L181.71353,80.7909097 L116.815965,137.741834 L181.978418,202.021326 L239.19423,169.351804 C249.525723,163.942452 256,153.24465 256,141.58271 C256,129.92077 249.525723,119.222968 239.19423,113.813616 L239.370822,113.813616 Z" fill="#FBBC04" />
                    <path d="M1.0599006,23.4868015 C0.343633396,26.134699 -0.0127538816,28.8670014 -9.94374397e-15,31.6100341 L-9.94374397e-15,250.937314 C0.00751268399,253.679042 0.363556675,256.408712 1.0599006,259.060547 L123.614758,138.095018 L1.0599006,23.4868015 Z" fill="#4285F4" />
                    <path d="M120.436101,141.273674 L181.71353,80.7909097 L48.5631521,4.50316009 C43.5539929,1.56944036 37.8568091,0.0156629668 32.0517989,0 C17.6444261,-0.0284873284 4.97836875,9.53420553 1.0599006,23.3985055 L120.436101,141.273674 Z" fill="#34A853" />
                  </svg>
                  <span className="text-left leading-tight">
                    <span className="block text-[10px] font-medium text-slate-400">
                      Google Play
                    </span>
                    <span className="block text-[14px] font-bold">Get Android APK</span>
                  </span>
                  <span className="ml-auto bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                    Soon
                  </span>
                </a>

                <a
                  href="/Dashit-User.ipa"
                  download="Dashit-User.ipa"
                  className="flex-1 group bg-[#061838] hover:bg-[#0A2449] dark:bg-[#12161F] dark:hover:bg-[#1A1F2B] border border-[#061838] dark:border-slate-700/80 text-white rounded-2xl px-4 py-3 flex items-center gap-3 transition-colors"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 fill-white">
                    <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8.92-2.85-.9.04-1.99.6-2.63 1.35-.56.65-1.05 1.72-.92 2.74 1 .08 2.01-.49 2.63-1.24z" />
                  </svg>
                  <span className="text-left leading-tight">
                    <span className="block text-[10px] font-medium text-slate-400">
                      Apple App Store
                    </span>
                    <span className="block text-[14px] font-bold">Get iOS IPA</span>
                  </span>
                  <span className="ml-auto bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap">
                    Soon
                  </span>
                </a>
              </div>

              <p className="mt-3.5 max-w-md text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                Official Google Play and Apple App Store listings are coming soon. Direct packages are available to install now — version 1.0.0, signed and verified.
              </p>
            </motion.div>

            {/* Facts */}
            <motion.dl
              variants={fadeUp}
              className="mt-10 pt-8 border-t border-slate-200 dark:border-slate-800 grid grid-cols-3 gap-6 max-w-lg"
            >
              {[
                ["Fastest", "delivery in Anantnag"],
                ["Daily", "fresh Kashmiri bakes"],
                ["192101", "full town coverage"],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="text-xl sm:text-2xl font-black tracking-tight text-[#061838] dark:text-white">
                    {value}
                  </dt>
                  <dd className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
                    {label}
                  </dd>
                </div>
              ))}
            </motion.dl>
          </motion.div>

          {/* Artwork: Radiant Sun Portal + Flying Grocery Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.15, ease: EASE_OUT }}
            className="lg:col-span-6 xl:col-span-5 flex justify-center items-center relative py-6 sm:py-10"
          >
            {/* Concentric Orbital Outline Rings */}
            <div className="w-72 h-72 sm:w-[350px] sm:h-[350px] md:w-[410px] md:h-[410px] xl:w-[440px] xl:h-[440px] rounded-full border border-slate-200/70 dark:border-slate-800/70 absolute pointer-events-none flex items-center justify-center" />
            <div className="w-80 h-80 sm:w-[390px] sm:h-[390px] md:w-[460px] md:h-[460px] xl:w-[490px] xl:h-[490px] rounded-full border border-slate-100 dark:border-slate-800/40 absolute pointer-events-none" />

            {/* Orbit Accent Arcs */}
            <div className="w-36 h-36 sm:w-44 sm:h-44 rounded-full border-t-4 border-l-4 border-emerald-500 absolute -top-2 left-6 sm:left-12 pointer-events-none -rotate-12" />
            <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-full border-b-4 border-r-4 border-[#FF5B00] absolute -bottom-2 right-4 sm:right-10 pointer-events-none -rotate-12" />

            {/* Radiant Sun Disc */}
            <div className="w-64 h-64 sm:w-80 sm:h-80 md:w-[360px] md:h-[360px] xl:w-[390px] xl:h-[390px] rounded-full bg-gradient-to-tr from-[#F59E0B] via-[#FBBF24] to-[#FDE68A] shadow-xl shadow-amber-500/15 relative flex items-center justify-center overflow-visible">

              {/* Inner ambient glow */}
              <div className="absolute inset-4 rounded-full bg-gradient-to-b from-amber-200/50 to-transparent blur-sm pointer-events-none" />

              {/* FLYING GROCERY BOX */}
              <div className="relative z-10 w-[112%] sm:w-[120%] xl:w-[124%] -mt-4">
                <picture>
                  <source srcSet="/art/flying-grocery-box-transparent.webp" type="image/webp" />
                  <img
                    src="/art/flying-grocery-box-transparent.png"
                    alt="DASHIT Flying Grocery Delivery Box"
                    width={1536}
                    height={1024}
                    fetchpriority="high"
                    decoding="async"
                    className="w-full h-auto drop-shadow-2xl"
                  />
                </picture>
              </div>

              {/* Badge Top Right */}
              <div className="absolute top-2 -right-4 sm:-right-6 bg-white dark:bg-[#141824] px-3.5 py-1.5 rounded-full shadow-md border border-slate-100 dark:border-slate-800 flex items-center space-x-1.5 z-20">
                <Clock className="w-3.5 h-3.5 text-[#FF5B00] shrink-0" />
                <span className="text-[11px] font-black text-slate-800 dark:text-white tracking-tight whitespace-nowrap">
                  Fastest Delivery Promise
                </span>
              </div>

              {/* Badge Bottom Left */}
              <div className="absolute -bottom-3 -left-3 sm:-left-6 bg-white dark:bg-[#141824] px-3.5 py-1.5 rounded-full shadow-md border border-slate-100 dark:border-slate-800 flex items-center space-x-1.5 z-20">
                <Leaf className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="text-[11px] font-black text-slate-800 dark:text-white tracking-tight whitespace-nowrap">
                  100% Fresh Produce
                </span>
              </div>
            </div>
          </motion.div>
        </section>

        {/* =============================================================== */}
        {/* FEATURES                                                        */}
        {/* =============================================================== */}
        <AppFeatureShowcase />

        {/* =============================================================== */}
        {/* WEB STORE                                                       */}
        {/* =============================================================== */}
        <section id="web-store" className="mt-24 sm:mt-32 scroll-mt-24">
          <motion.div
            variants={fadeUp}
            {...inViewOnce}
            className="border-y border-slate-200 dark:border-slate-800 py-10 sm:py-12 flex flex-col md:flex-row md:items-center justify-between gap-7"
          >
            <div className="max-w-xl">
              <Eyebrow>No phone nearby?</Eyebrow>
              <h2 className="mt-4 text-2xl sm:text-[32px] font-black tracking-tight text-[#061838] dark:text-white leading-tight">
                Shop the full catalogue in your browser
              </h2>
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                Browse every aisle, build your cart and place an order from any computer.
                Same catalogue, same prices, same riders.
              </p>
            </div>

            <Link
              href="/shop"
              className="group shrink-0 inline-flex items-center gap-2 bg-[#061838] hover:bg-[#FF5B00] text-white text-sm font-bold px-6 h-12 rounded-xl transition-colors"
            >
              <span>Open the web store</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </Link>
          </motion.div>

          {/* Categories */}
          <div className="mt-14">
            <motion.div
              variants={fadeUp}
              {...inViewOnce}
              className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4 mb-7"
            >
              <div>
                <Eyebrow>Everyday aisles</Eyebrow>
                <h3 className="mt-4 text-2xl sm:text-[30px] font-black tracking-tight text-[#061838] dark:text-white">
                  Popular in Anantnag
                </h3>
              </div>
              <Link
                href="/categories"
                className="shrink-0 text-[13px] font-bold text-[#FF5B00] hover:underline inline-flex items-center gap-1"
              >
                <span>All categories</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </motion.div>

            <motion.div
              variants={stagger(0.05)}
              {...inViewOnce}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4"
            >
              {POPULAR_CATEGORIES.map((cat) => (
                <motion.div key={cat.cat} variants={fadeUp} className="h-full">
                  <Link
                    href={`/shop?cat=${encodeURIComponent(cat.cat)}`}
                    className="group block rounded-2xl bg-white dark:bg-[#12161F] border border-slate-200/90 dark:border-slate-800 p-2.5 h-full transition-[border-color,transform,box-shadow] duration-300 hover:-translate-y-1 hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-[0_12px_28px_-18px_rgba(6,24,56,0.5)]"
                  >
                    <div className="w-full h-24 sm:h-[104px] rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800">
                      <img
                        src={cat.img}
                        alt={cat.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-[1.07]"
                      />
                    </div>
                    <h4 className="mt-2.5 text-[12.5px] font-bold tracking-tight text-[#061838] dark:text-white leading-snug">
                      {cat.name}
                    </h4>
                    <p className="mt-0.5 text-[10.5px] text-slate-500 dark:text-slate-400">
                      {cat.desc}
                    </p>
                  </Link>
                </motion.div>
              ))}
            </motion.div>
          </div>

          {/* How it works */}
          <motion.div
            variants={stagger(0.08)}
            {...inViewOnce}
            className="mt-20 sm:mt-24"
          >
            <motion.h3
              variants={fadeUp}
              className="text-2xl sm:text-[30px] font-black tracking-tight text-[#061838] dark:text-white"
            >
              How an order reaches you
            </motion.h3>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-px bg-slate-200 dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
              {DELIVERY_STEPS.map((step) => (
                <motion.div
                  key={step.n}
                  variants={fadeUp}
                  className="bg-[#FCFBF8] dark:bg-[#0F131B] p-6 sm:p-7"
                >
                  <span className="text-[11px] font-black tracking-[0.16em] text-[#FF5B00]">
                    {step.n}
                  </span>
                  <h4 className="mt-3 text-[15px] font-bold tracking-tight text-[#061838] dark:text-white">
                    {step.title}
                  </h4>
                  <p className="mt-2 text-[13px] leading-relaxed text-slate-600 dark:text-slate-400">
                    {step.body}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </section>
      </main>

      {/* ================================================================= */}
      {/* FOOTER                                                            */}
      {/* ================================================================= */}
      <footer className="mt-24 sm:mt-32 bg-[#061838] dark:bg-[#080B11] text-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 pb-8 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center p-1.5">
                <img src="/dashit-mark-white.png" alt="" className="w-full h-full object-contain" />
              </span>
              <span>
                <span className="block text-[19px] font-black tracking-tight leading-none">
                  DASH<span className="text-[#FF5B00]">IT</span>
                </span>
                <span className="block mt-1 text-[11px] text-slate-400">
                  Quick grocery delivery in Anantnag
                </span>
              </span>
            </div>

            <nav className="flex flex-wrap items-center gap-x-7 gap-y-2 text-[13px] font-semibold text-slate-300">
              <Link href="/shop" className="hover:text-white transition-colors">Web store</Link>
              <Link href="/categories" className="hover:text-white transition-colors">Categories</Link>
              <a
                href="#get-the-app"
                onClick={scrollToId("get-the-app")}
                className="text-[#FF5B00] hover:text-[#FF7A29] transition-colors"
              >
                Download app
              </a>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
            </nav>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[11.5px] text-slate-400">
            <p>
              © {new Date().getFullYear()} DASHIT Technologies · Anantnag 192101 · Helpline
              +91 6006990032
            </p>
            <p>Built in Kashmir.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
