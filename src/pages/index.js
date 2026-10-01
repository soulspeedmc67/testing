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
import { X, Menu, Sun, Moon } from "lucide-react";

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


/** The shelves shown on the page: a real product from each aisle, on white. */
const SHELVES = [
  { name: "Dairy", img: "dairy", alt: "Amul Lassi" },
  { name: "Snacks", img: "snacks", alt: "Pringles" },
  { name: "Beverages", img: "beverages", alt: "Real Activ coconut water" },
  { name: "Biscuits", img: "biscuits", alt: "Bourbon biscuits" },
  { name: "Staples", img: "staples", alt: "India Gate rice" },
  { name: "Instant food", img: "instant-food", alt: "Wai Wai noodles cup" },
  { name: "Ice cream", img: "ice-cream", alt: "Cornetto cone" },
  { name: "Sweets and chocolates", img: "sweets", alt: "Toblerone Tiny Mix" },
];

const HERO_FACTS = [
  ["₹299", "Free delivery above this"],
  ["UPI or cash", "Pay online or at the door"],
  ["Live map", "Follow your rider home"],
];

/**
 * The two install buttons. `onDark` is for the navy closing section.
 * Same files and download names as ever; the store badges say "Soon".
 */
function DownloadButtons({ onDark = false, id }) {
  const base =
    "flex-1 group rounded-2xl px-4 py-3.5 flex items-center gap-3 border transition-[background-color,border-color,transform] duration-200 active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#FF5B00] ";
  const tone = onDark
    ? "bg-white text-[#061838] border-white hover:bg-[#F3EFE7] "
    : "bg-[#061838] text-white border-[#061838] hover:bg-[#0A2449] dark:bg-[#12161F] dark:border-slate-700/80 dark:hover:bg-[#1A1F2B] ";
  const small = onDark ? "text-slate-500" : "text-slate-400";
  const chip = onDark
    ? "bg-[#FF5B00]/10 text-[#C24400] border-[#FF5B00]/25"
    : "bg-amber-500/20 text-amber-300 border-amber-500/30";
  return (
    <div id={id} className="flex flex-col sm:flex-row gap-3 max-w-lg scroll-mt-24">
      <a href="/Dashit-User.apk" download="Dashit-User.apk" className={base + tone}>
        <svg viewBox="0 0 256 283" className="w-5 h-5 shrink-0" aria-hidden="true">
          <path d="M119.553141,134.916362 L1.0599006,259.060547 C3.75619448,268.616998 10.7182836,276.3906 19.9208658,280.119977 C29.1234481,283.849353 39.5331235,283.115716 48.121672,278.132484 L181.448642,202.197919 L119.553141,134.916362 Z" fill="#EA4335" />
          <path d="M239.370822,113.813616 L181.71353,80.7909097 L116.815965,137.741834 L181.978418,202.021326 L239.19423,169.351804 C249.525723,163.942452 256,153.24465 256,141.58271 C256,129.92077 249.525723,119.222968 239.19423,113.813616 L239.370822,113.813616 Z" fill="#FBBC04" />
          <path d="M1.0599006,23.4868015 C0.343633396,26.134699 -0.0127538816,28.8670014 -9.94374397e-15,31.6100341 L-9.94374397e-15,250.937314 C0.00751268399,253.679042 0.363556675,256.408712 1.0599006,259.060547 L123.614758,138.095018 L1.0599006,23.4868015 Z" fill="#4285F4" />
          <path d="M120.436101,141.273674 L181.71353,80.7909097 L48.5631521,4.50316009 C43.5539929,1.56944036 37.8568091,0.0156629668 32.0517989,0 C17.6444261,-0.0284873284 4.97836875,9.53420553 1.0599006,23.3985055 L120.436101,141.273674 Z" fill="#34A853" />
        </svg>
        <span className="text-left leading-tight">
          <span className={`block text-[10px] font-medium ${small}`}>Google Play</span>
          <span className="block text-[14px] font-bold">Download for Android</span>
        </span>
        <span className={`ml-auto border text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${chip}`}>Soon</span>
      </a>

      <a href="/Dashit-User.ipa" download="Dashit-User.ipa" className={base + tone}>
        <svg viewBox="0 0 24 24" className="w-5 h-5 shrink-0 fill-current" aria-hidden="true">
          <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8.92-2.85-.9.04-1.99.6-2.63 1.35-.56.65-1.05 1.72-.92 2.74 1 .08 2.01-.49 2.63-1.24z" />
        </svg>
        <span className="text-left leading-tight">
          <span className={`block text-[10px] font-medium ${small}`}>Apple App Store</span>
          <span className="block text-[14px] font-bold">Download for iPhone</span>
        </span>
        <span className={`ml-auto border text-[10px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${chip}`}>Soon</span>
      </a>
    </div>
  );
}

/** The app's real home screen in a still phone frame. */
function PhoneFrame() {
  return (
    <div className="rounded-[2.6rem] bg-[#0B1220] p-[7px] shadow-[0_40px_60px_-28px_rgba(6,24,56,0.45)] ring-1 ring-black/10">
      <img
        src="/landing/app-home-720.webp"
        srcSet="/landing/app-home-480.webp 480w, /landing/app-home-720.webp 720w"
        sizes="(max-width: 640px) 250px, 310px"
        width={720}
        height={1560}
        alt="The DASHIT app home screen, with shelves of everyday groceries"
        className="block w-full h-auto rounded-[2.1rem]"
        fetchpriority="high"
        decoding="async"
      />
    </div>
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
      >
        <link
          rel="preload"
          as="image"
          href="/art/flying-grocery-box-transparent-680.webp"
          type="image/webp"
          fetchpriority="high"
          imageSrcSet="/art/flying-grocery-box-transparent-480.webp 480w, /art/flying-grocery-box-transparent-680.webp 680w, /art/flying-grocery-box-transparent.webp 1000w"
          imageSizes="(max-width: 640px) 320px, (max-width: 1024px) 460px, 500px"
        />
      </SEO>
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
              <span className="font-display text-[21px] font-extrabold tracking-tight text-[#061838] dark:text-white">
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
                href="#how-it-works"
                onClick={scrollToId("how-it-works")}
                className="hover:text-[#061838] dark:hover:text-white transition-colors"
              >
                How it works
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
                className="sm:hidden inline-flex items-center justify-center whitespace-nowrap shrink-0 bg-[#FF5B00] hover:bg-[#E04E00] text-white text-[12.5px] font-bold px-3 h-9 rounded-xl shadow-xs transition-colors active:scale-95"
              >
                Get the app
              </a>

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
                  href="#how-it-works"
                  onClick={(e) => {
                    setMobileMenuOpen(false);
                    scrollToId("how-it-works")(e);
                  }}
                  className="py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300"
                >
                  How it works
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
        <section className="pt-10 sm:pt-16 lg:pt-20 pb-16 sm:pb-24 grid grid-cols-1 lg:grid-cols-12 gap-14 lg:gap-8 items-center">
          <div className="lg:col-span-7">
            <Eyebrow>Anantnag, Kashmir</Eyebrow>

            <h1 className="mt-5 font-display text-[42px] sm:text-[58px] xl:text-[70px] leading-[1.02] font-extrabold tracking-[-0.035em] text-[#061838] dark:text-white [text-wrap:balance]">
              Groceries at your door,{" "}
              <span className="text-[#FF5B00]">in minutes.</span>
            </h1>

            <p className="mt-6 max-w-[34rem] text-[16px] sm:text-[17px] leading-[1.7] text-slate-600 dark:text-slate-300 [text-wrap:pretty]">
              Fresh bread and milk, vegetables, snacks and everyday household
              things, packed at our Anantnag store and followed to your door on a
              live map.
            </p>

            <div className="mt-9">
              <DownloadButtons id="get-the-app" />
              <p className="mt-4 max-w-md text-[12.5px] leading-relaxed text-slate-500 dark:text-slate-400">
                The Google Play and App Store listings are coming soon. You can
                install the app directly today, on Android and iPhone.
              </p>
            </div>

            <dl className="mt-12 pt-7 border-t border-[#E8E2D5] dark:border-slate-800 grid grid-cols-3 gap-4 sm:gap-8 max-w-xl">
              {HERO_FACTS.map(([value, label]) => (
                <div key={value}>
                  <dt className="font-display text-[19px] sm:text-[23px] font-bold tracking-tight text-[#061838] dark:text-white">
                    {value}
                  </dt>
                  <dd className="mt-1 text-[12px] sm:text-[13px] leading-snug text-slate-500 dark:text-slate-400">
                    {label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* The real home screen on a flat warm panel. */}
          <div className="lg:col-span-5 relative flex justify-center">
            <div
              aria-hidden="true"
              className="absolute inset-x-0 sm:inset-x-10 lg:inset-x-0 top-12 bottom-0 rounded-[2rem] bg-[#FFE7D4] dark:bg-[#1B1612]"
            />
            <div className="relative w-[236px] sm:w-[290px] xl:w-[300px] mt-2 mb-9">
              <PhoneFrame />
            </div>
          </div>
        </section>

        {/* =============================================================== */}
        {/* FEATURES                                                        */}
        {/* =============================================================== */}
        <AppFeatureShowcase />

        {/* =============================================================== */}
        {/* ON THE SHELVES                                                  */}
        {/* =============================================================== */}
        <section id="on-the-shelves" className="mt-28 sm:mt-40 scroll-mt-24 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          <motion.div variants={stagger(0.08)} {...inViewOnce} className="lg:col-span-4 lg:sticky lg:top-28">
            <motion.div variants={fadeUp}><Eyebrow>On the shelves</Eyebrow></motion.div>
            <motion.h2
              variants={fadeUp}
              className="mt-5 font-display text-[32px] sm:text-[40px] font-extrabold tracking-[-0.03em] leading-[1.08] text-[#061838] dark:text-white [text-wrap:balance]"
            >
              From milk and bread to shampoo and stationery
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-5 text-[15px] leading-[1.7] text-slate-600 dark:text-slate-400 max-w-sm">
              Thousands of everyday items, sorted into the aisles you already know.
            </motion.p>
          </motion.div>

          <motion.ul
            variants={stagger(0.05)}
            {...inViewOnce}
            className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4"
          >
            {SHELVES.map((shelf) => (
              <motion.li
                key={shelf.name}
                variants={fadeUp}
                className="group rounded-2xl bg-white dark:bg-[#12161F] border border-[#EDE8DD] dark:border-slate-800 p-3 sm:p-4 flex flex-col transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-[#D9D1BF] dark:hover:border-slate-700"
              >
                <div className="aspect-square rounded-xl bg-white flex items-center justify-center overflow-hidden">
                  <img
                    src={`/landing/shelves/${shelf.img}.webp`}
                    alt={shelf.alt}
                    width={420}
                    height={420}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-contain p-1"
                  />
                </div>
                <span className="mt-3 text-[13px] sm:text-[14px] font-bold tracking-tight text-[#061838] dark:text-white leading-snug">
                  {shelf.name}
                </span>
              </motion.li>
            ))}
          </motion.ul>
        </section>

        {/* =============================================================== */}
        {/* HOW AN ORDER REACHES YOU                                        */}
        {/* =============================================================== */}
        <section id="how-it-works" className="mt-28 sm:mt-40 scroll-mt-24 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
          <motion.div variants={stagger(0.08)} {...inViewOnce} className="lg:col-span-4">
            <motion.div variants={fadeUp}><Eyebrow>How it works</Eyebrow></motion.div>
            <motion.h2
              variants={fadeUp}
              className="mt-5 font-display text-[32px] sm:text-[40px] font-extrabold tracking-[-0.03em] leading-[1.08] text-[#061838] dark:text-white [text-wrap:balance]"
            >
              How an order reaches you
            </motion.h2>
          </motion.div>

          <motion.ol
            variants={stagger(0.1)}
            {...inViewOnce}
            className="lg:col-span-8 divide-y divide-[#E8E2D5] dark:divide-slate-800 border-y border-[#E8E2D5] dark:border-slate-800"
          >
            {DELIVERY_STEPS.map((step) => (
              <motion.li key={step.n} variants={fadeUp} className="grid grid-cols-[3.5rem_1fr] sm:grid-cols-[5.5rem_1fr] gap-4 py-7 sm:py-9">
                <span className="font-display text-[40px] sm:text-[56px] leading-none font-extrabold tracking-tight text-[#061838]/15 dark:text-white/15 tabular-nums">
                  {step.n}
                </span>
                <div>
                  <h3 className="font-display text-[20px] sm:text-[24px] font-bold tracking-tight text-[#061838] dark:text-white">
                    {step.title}
                  </h3>
                  <p className="mt-2 max-w-md text-[14.5px] leading-[1.7] text-slate-600 dark:text-slate-400">
                    {step.body}
                  </p>
                </div>
              </motion.li>
            ))}
          </motion.ol>
        </section>
      </main>

      {/* ================================================================= */}
      {/* CLOSING DOWNLOAD + FOOTER (one navy block)                        */}
      {/* ================================================================= */}
      <footer className="mt-28 sm:mt-40 bg-[#061838] dark:bg-[#080B11] text-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="py-16 sm:py-24 grid grid-cols-1 lg:grid-cols-12 gap-10 items-end border-b border-white/10">
            <div className="lg:col-span-6">
              <h2 className="font-display text-[34px] sm:text-[48px] font-extrabold tracking-[-0.03em] leading-[1.05] [text-wrap:balance]">
                Your next order is a few taps away.
              </h2>
              <p className="mt-4 max-w-md text-[15px] leading-[1.7] text-slate-300">
                Install DASHIT on your phone and have groceries at your door in minutes.
              </p>
            </div>
            <div className="lg:col-span-6 lg:justify-self-end w-full max-w-lg">
              <DownloadButtons onDark />
            </div>
          </div>

          <div className="py-10 flex flex-col md:flex-row md:items-start justify-between gap-8">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center p-1.5">
                <img src="/dashit-mark-white.png" alt="" className="w-full h-full object-contain" />
              </span>
              <span>
                <span className="block font-display text-[21px] font-extrabold tracking-tight leading-none">
                  DASH<span className="text-[#FF5B00]">IT</span>
                </span>
                <span className="block mt-1.5 text-[12px] text-slate-400">
                  Quick grocery delivery in Anantnag
                </span>
              </span>
            </div>

            <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-7 gap-y-2.5 text-[13px] font-semibold text-slate-300">
              <Link href="/help" className="hover:text-white transition-colors">Help</Link>
              <Link href="/privacy" className="hover:text-white transition-colors">Privacy</Link>
              <Link href="/terms" className="hover:text-white transition-colors">Terms</Link>
              <Link href="/complaints" className="hover:text-white transition-colors">Complaints</Link>
            </nav>
          </div>

          <div className="pb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-[12px] text-slate-400">
            <p>© {new Date().getFullYear()} DASHIT Technologies · Anantnag 192101</p>
            <p>Built in Kashmir.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
