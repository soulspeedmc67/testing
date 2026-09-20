import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import SEO from "../components/SEO";
import { WebSiteJsonLd, OrganizationJsonLd, GroceryStoreJsonLd } from "../components/JsonLd";
import { isNative } from "../lib/platform";
import { useTheme } from "../context/ThemeContext";
import { hapticLight } from "../lib/haptics";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ShoppingBag,
  Zap,
  Bike,
  Store,
  Sparkles,
  ChevronRight,
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
  Menu,
  Sun,
  Moon,
  Smartphone,
  Download,
  CheckCircle2,
  QrCode
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const { theme, setPreference } = useTheme();
  const [isAppClient, setIsAppClient] = useState(false);
  const [showHowItWorks, setShowHowItWorks] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

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

  const toggleTheme = () => {
    hapticLight();
    setPreference(theme === "dark" ? "light" : "dark");
  };

  const scrollToDownload = (e) => {
    e?.preventDefault();
    const el = document.getElementById("download-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const scrollToWebStore = (e) => {
    e?.preventDefault();
    const el = document.getElementById("web-store-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (isAppClient) {
    return <div className="min-h-screen bg-white dark:bg-surface" />;
  }

  const POPULAR_CATEGORIES = [
    {
      name: "Fresh Kashmiri Bakery",
      desc: "Fresh Lavas, Czot & Roath",
      img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=400&auto=format&fit=crop&q=80",
      cat: "Bakery",
    },
    {
      name: "Milk, Curd & Dairy",
      desc: "Pure Amul, Paneer & Curd",
      img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80",
      cat: "Dairy",
    },
    {
      name: "Fresh Vegetables",
      desc: "Farm crisp greens & potatoes",
      img: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=400&auto=format&fit=crop&q=80",
      cat: "Vegetables",
    },
    {
      name: "Fresh Fruits",
      desc: "Apples, Bananas & Citrus",
      img: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=400&auto=format&fit=crop&q=80",
      cat: "Fresh Fruits",
    },
    {
      name: "Cold Drinks & Sips",
      desc: "Coke, Juices & Ice Tea",
      img: "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=400&auto=format&fit=crop&q=80",
      cat: "Drinks & Juices",
    },
    {
      name: "Cooking Staples & Oil",
      desc: "Atta, Rice, Dal & Ghee",
      img: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=80",
      cat: "Atta, Rice & Dal",
    },
  ];

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-slate-900 font-sans selection:bg-[#FF5B00] selection:text-white dark:bg-[#0B0E14] dark:text-slate-100 transition-colors duration-300">
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

      {/* TOP FLOATING STICKY CAPSULE NAVBAR */}
      <div
        className={`sticky top-0 z-50 w-full transition-all duration-300 ${
          isScrolled
            ? "bg-[#FFFDF9]/90 dark:bg-[#0B0E14]/90 backdrop-blur-xl shadow-lg shadow-black/5 dark:shadow-black/30 py-2.5 border-b border-slate-200/70 dark:border-slate-800/80"
            : "bg-transparent pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-2.5"
        }`}
      >
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <header className="bg-[#061838] dark:bg-[#121622] text-white rounded-2xl sm:rounded-full px-4 sm:px-6 py-2.5 sm:py-3 shadow-xl shadow-[#061838]/20 dark:shadow-black/40 flex items-center justify-between border border-white/15 dark:border-white/10 backdrop-blur-md transition-all duration-300">
            {/* Brand Logo */}
            <Link href="/" className="flex items-center space-x-2.5 sm:space-x-3 shrink-0 group">
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
                <span className="hidden sm:inline-flex items-center text-[10px] font-extrabold uppercase tracking-wider text-amber-400 bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 rounded-full">
                  App Store &amp; Play Store
                </span>
              </div>
            </Link>

            {/* Desktop Nav Links */}
            <nav className="hidden md:flex items-center space-x-6 text-sm font-semibold text-slate-200">
              <a
                href="#download-section"
                onClick={scrollToDownload}
                className="hover:text-white transition-colors cursor-pointer flex items-center space-x-1"
              >
                <Smartphone className="w-3.5 h-3.5 text-[#FF5B00]" />
                <span>Mobile App</span>
              </a>
              <a
                href="#app-features"
                className="hover:text-white transition-colors cursor-pointer"
              >
                Features
              </a>
              <a
                href="#web-store-section"
                onClick={scrollToWebStore}
                className="hover:text-white transition-colors cursor-pointer text-slate-300 hover:text-white"
              >
                Shop on Web
              </a>
              <div className="flex items-center space-x-1.5 text-slate-300 bg-white/10 border border-white/10 px-3 py-1 rounded-full text-xs font-semibold">
                <MapPin className="w-3.5 h-3.5 text-[#FF5B00]" />
                <span>Anantnag (192101)</span>
              </div>
            </nav>

            {/* Actions: Theme Toggle + Get App CTA */}
            <div className="flex items-center space-x-2.5 sm:space-x-3">
              {/* Sleek Theme Toggle Button */}
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 flex items-center justify-center text-amber-300 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4 text-amber-300 transition-transform rotate-0 hover:rotate-45" />
                ) : (
                  <Moon className="w-4 h-4 text-slate-100 transition-transform -rotate-12 hover:rotate-0" />
                )}
              </button>

              {/* Primary Header CTA: Download App */}
              <button
                type="button"
                onClick={scrollToDownload}
                className="bg-[#FF5B00] hover:bg-[#E04E00] text-white text-xs font-black px-4 sm:px-5 py-2 sm:py-2.5 rounded-full shadow-md shadow-[#FF5B00]/30 transition-all hover:scale-105 active:scale-95 inline-flex items-center space-x-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Get App</span>
              </button>

              {/* Mobile Hamburger */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                type="button"
                aria-expanded={mobileMenuOpen}
                className="md:hidden inline-flex items-center justify-center w-9 h-9 text-slate-200 hover:text-white rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 transition-colors"
                aria-label="Toggle menu"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
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
              className="md:hidden max-w-7xl mx-auto px-3 mt-2"
            >
              <div className="bg-[#061838] dark:bg-[#121622] border border-white/15 rounded-2xl p-4 shadow-2xl text-white space-y-3">
                <button
                  type="button"
                  onClick={(e) => {
                    setMobileMenuOpen(false);
                    scrollToDownload(e);
                  }}
                  className="w-full text-left py-2.5 px-3 rounded-xl bg-[#FF5B00] font-black text-sm text-white flex items-center justify-between"
                >
                  <span className="flex items-center space-x-2">
                    <Download className="w-4 h-4" />
                    <span>Download DASHIT App</span>
                  </span>
                  <span className="text-[10px] bg-black/20 px-2 py-0.5 rounded-md">Free</span>
                </button>

                <a
                  href="#app-features"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block py-2 px-3 rounded-lg hover:bg-white/10 font-semibold text-sm text-slate-200"
                >
                  App Features &amp; Benefits
                </a>
                <a
                  href="#web-store-section"
                  onClick={(e) => {
                    setMobileMenuOpen(false);
                    scrollToWebStore(e);
                  }}
                  className="block py-2 px-3 rounded-lg hover:bg-white/10 font-semibold text-sm text-slate-300"
                >
                  Prefer Browser? Shop Online →
                </a>
                <div className="pt-2 border-t border-white/10 flex items-center justify-between px-3 text-xs text-slate-400">
                  <span>Theme Preference</span>
                  <button
                    onClick={toggleTheme}
                    className="flex items-center space-x-1.5 bg-white/10 px-3 py-1.5 rounded-lg text-white font-bold"
                  >
                    {theme === "dark" ? <Sun className="w-3.5 h-3.5 text-amber-300" /> : <Moon className="w-3.5 h-3.5" />}
                    <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* HERO SECTION — APP-FIRST SHOWCASE */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-10 pb-16 w-full">
        {/* Ambient Backdrops for Dark Mode */}
        <div className="relative">
          <div className="absolute top-1/4 -left-20 w-96 h-96 bg-orange-500/10 dark:bg-orange-500/15 rounded-full blur-3xl pointer-events-none -z-10" />
          <div className="absolute top-1/3 -right-20 w-96 h-96 bg-blue-500/10 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none -z-10" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* COLUMN 1: EDITORIAL APP VALUE PROP & STORE BUTTONS (Col span 7) */}
          <div className="lg:col-span-7 flex flex-col items-start z-10">
            {/* Tagline Badge */}
            <div className="inline-flex items-center space-x-2 bg-orange-100 dark:bg-orange-950/60 border border-orange-300/80 dark:border-orange-500/30 rounded-full px-3.5 py-1.5 mb-5 shadow-xs">
              <Sparkles className="w-4 h-4 text-[#FF5B00]" />
              <span className="text-xs font-black uppercase tracking-wider text-[#FF5B00]">
                Exclusively Built for Mobile Experience
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black tracking-tight leading-[1.08] text-[#061838] dark:text-white">
              Anantnag&apos;s <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF5B00] via-[#FF7A29] to-[#F59E0B]">
                #1 Fastest Grocery
              </span> <br />
              Delivery App
            </h1>

            {/* App-first Subheadline */}
            <p className="mt-5 text-sm sm:text-base text-slate-600 dark:text-slate-300 font-medium leading-relaxed max-w-xl">
              Get the full DASHIT experience on your phone. Enjoy <strong className="text-slate-900 dark:text-white font-bold">live GPS delivery tracking</strong>, instant 1-tap reordering, fresh Kashmiri bakery, dairy, and daily essentials with fastest delivery across Anantnag.
            </p>

            {/* PRIMARY DOWNLOAD APP BADGES (ABOVE THE FOLD) */}
            <div id="download-section" className="mt-8 w-full">
              <p className="text-xs font-black uppercase tracking-widest text-[#FF5B00] mb-3 flex items-center space-x-1.5">
                <Smartphone className="w-4 h-4" />
                <span>Step 1: Download Free on Your Device</span>
              </p>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 max-w-lg">
                {/* Google Play Button */}
                <a
                  href="/Dashit-User.apk"
                  download="Dashit-User.apk"
                  className="flex-1 bg-slate-950 hover:bg-[#061838] dark:bg-[#161B26] dark:hover:bg-[#1E2433] text-white border border-slate-800 dark:border-slate-700/80 rounded-2xl p-3.5 shadow-xl hover:shadow-2xl transition-all duration-200 group flex items-center space-x-3.5 cursor-pointer active:scale-95"
                >
                  <div className="w-9 h-9 shrink-0 flex items-center justify-center bg-white/5 rounded-xl p-1">
                    <svg viewBox="0 0 256 283" className="w-6 h-6">
                      <path d="M119.553141,134.916362 L1.0599006,259.060547 C3.75619448,268.616998 10.7182836,276.3906 19.9208658,280.119977 C29.1234481,283.849353 39.5331235,283.115716 48.121672,278.132484 L181.448642,202.197919 L119.553141,134.916362 Z" fill="#EA4335" />
                      <path d="M239.370822,113.813616 L181.71353,80.7909097 L116.815965,137.741834 L181.978418,202.021326 L239.19423,169.351804 C249.525723,163.942452 256,153.24465 256,141.58271 C256,129.92077 249.525723,119.222968 239.19423,113.813616 L239.370822,113.813616 Z" fill="#FBBC04" />
                      <path d="M1.0599006,23.4868015 C0.343633396,26.134699 -0.0127538816,28.8670014 -9.94374397e-15,31.6100341 L-9.94374397e-15,250.937314 C0.00751268399,253.679042 0.363556675,256.408712 1.0599006,259.060547 L123.614758,138.095018 L1.0599006,23.4868015 Z" fill="#4285F4" />
                      <path d="M120.436101,141.273674 L181.71353,80.7909097 L48.5631521,4.50316009 C43.5539929,1.56944036 37.8568091,0.0156629668 32.0517989,0 C17.6444261,-0.0284873284 4.97836875,9.53420553 1.0599006,23.3985055 L120.436101,141.273674 Z" fill="#34A853" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">Android APK / Play</span>
                    <span className="text-sm font-black text-white block leading-tight">Google Play</span>
                  </div>
                  <div className="ml-auto text-amber-400 text-xs font-bold flex items-center">
                    <Star className="w-3 h-3 fill-amber-400 mr-1" />
                    <span>4.9</span>
                  </div>
                </a>

                {/* Apple App Store Button */}
                <a
                  href="/Dashit-User.ipa"
                  download="Dashit-User.ipa"
                  className="flex-1 bg-slate-950 hover:bg-[#061838] dark:bg-[#161B26] dark:hover:bg-[#1E2433] text-white border border-slate-800 dark:border-slate-700/80 rounded-2xl p-3.5 shadow-xl hover:shadow-2xl transition-all duration-200 group flex items-center space-x-3.5 cursor-pointer active:scale-95"
                >
                  <div className="w-9 h-9 shrink-0 flex items-center justify-center bg-gradient-to-b from-[#2E9BFF] to-[#0060E5] rounded-xl shadow-xs">
                    <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white">
                      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8 0.92-2.85-.9.04-1.99.6-2.63 1.35-.56.65-1.05 1.72-.92 2.74 1 .08 2.01-.49 2.63-1.24z" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] font-bold text-slate-400 block tracking-wider uppercase">iOS / TestFlight</span>
                    <span className="text-sm font-black text-white block leading-tight">App Store</span>
                  </div>
                  <div className="ml-auto bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    iOS
                  </div>
                </a>
              </div>

              {/* Direct APK Download + QR Code Pill */}
              <div className="mt-4 flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                <a
                  href="/Dashit-User.apk"
                  download="Dashit-User.apk"
                  className="inline-flex items-center space-x-1.5 text-[#FF5B00] hover:underline font-bold"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Direct Android APK Download (v1.0.0)</span>
                </a>
                <span className="text-slate-300 dark:text-slate-600">•</span>
                <span className="flex items-center space-x-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Verified 100% Safe &amp; Clean</span>
                </span>
              </div>
            </div>

            {/* TRUST HIGHLIGHTS */}
            <div className="mt-8 pt-6 border-t border-slate-200/80 dark:border-slate-800/80 w-full grid grid-cols-3 gap-4 text-left">
              <div>
                <span className="text-xl sm:text-2xl font-black text-[#061838] dark:text-white block">
                  #1 Fastest
                </span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5">
                  Delivery in Anantnag
                </span>
              </div>
              <div>
                <span className="text-xl sm:text-2xl font-black text-[#FF5B00] block">
                  100%
                </span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5">
                  Fresh Kashmiri Morning Bakes
                </span>
              </div>
              <div>
                <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 block">
                  192101
                </span>
                <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 block mt-0.5">
                  Full Anantnag Coverage
                </span>
              </div>
            </div>
          </div>

          {/* COLUMN 2: SLEEK 3D SMARTPHONE MOCKUP (Col span 5) */}
          <div className="lg:col-span-5 flex justify-center items-center relative">
            {/* Outer Ambient Glow Ring */}
            <div className="w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-gradient-to-tr from-orange-500/20 via-amber-400/10 to-blue-500/20 blur-2xl absolute pointer-events-none" />

            {/* Realistic iPhone Bezel Container */}
            <div className="relative w-68 sm:w-76 xl:w-80 bg-slate-950 dark:bg-black rounded-[48px] p-3 shadow-2xl shadow-black/40 border-[4px] border-slate-800 dark:border-slate-700/60 transition-transform duration-500 hover:scale-[1.02]">
              {/* Dynamic Island Notch */}
              <div className="w-24 h-4 bg-black rounded-full mx-auto mb-2 flex items-center justify-center">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-900 mr-1.5" />
                <div className="w-1.5 h-1.5 rounded-full bg-blue-900/60" />
              </div>

              {/* In-app Screen Canvas */}
              <div className="bg-[#14171F] rounded-[38px] overflow-hidden text-white shadow-inner p-4 space-y-3.5 border border-white/5">
                {/* Header in Mockup */}
                <div className="flex items-center justify-between pb-2 border-b border-white/10">
                  <div>
                    <span className="text-[9.5px] font-black uppercase tracking-widest text-[#FF5B00] block">
                      FASTEST DELIVERY
                    </span>
                    <h3 className="text-xs font-black text-white flex items-center space-x-1">
                      <MapPin className="w-3 h-3 text-[#FF5B00]" />
                      <span>KP Road, Anantnag</span>
                    </h3>
                  </div>
                  <div className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-[10px] font-black text-[#FF5B00]">
                    D
                  </div>
                </div>

                {/* Mock Search Input */}
                <div className="bg-white/10 rounded-xl px-3 py-2 flex items-center space-x-2 border border-white/10 text-slate-300">
                  <Search className="w-3.5 h-3.5 text-[#FF5B00]" />
                  <span className="text-[11px] font-medium">Search &quot;fresh lavas, amul milk&quot;</span>
                </div>

                {/* Categories Strip Mock */}
                <div className="flex space-x-1.5 overflow-hidden">
                  <span className="bg-[#FF5B00] text-white text-[9px] font-extrabold px-2.5 py-1 rounded-full">
                    Bakery
                  </span>
                  <span className="bg-white/10 text-slate-200 text-[9px] font-semibold px-2.5 py-1 rounded-full border border-white/10">
                    Dairy
                  </span>
                  <span className="bg-white/10 text-slate-200 text-[9px] font-semibold px-2.5 py-1 rounded-full border border-white/10">
                    Vegetables
                  </span>
                  <span className="bg-white/10 text-slate-200 text-[9px] font-semibold px-2.5 py-1 rounded-full border border-white/10">
                    Fruits
                  </span>
                </div>

                {/* Mock Product Items in App */}
                <div className="space-y-2">
                  <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex items-center space-x-2.5">
                    <img
                      src="https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=120&auto=format&fit=crop&q=80"
                      alt="Kashmiri Lavas"
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-extrabold text-white truncate">
                        Fresh Kashmiri Lavas
                      </p>
                      <p className="text-[9px] text-slate-400">Pack of 4 • Fresh Morning</p>
                      <span className="text-[10px] font-black text-[#FF5B00]">₹20</span>
                    </div>
                    <span className="bg-[#FF5B00] text-white font-black text-[9px] px-2.5 py-1 rounded-lg">
                      ADDED
                    </span>
                  </div>

                  <div className="bg-white/5 border border-white/10 rounded-xl p-2 flex items-center space-x-2.5">
                    <img
                      src="https://images.unsplash.com/photo-1550583724-b2692b85b150?w=120&auto=format&fit=crop&q=80"
                      alt="Amul Milk"
                      className="w-10 h-10 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-extrabold text-white truncate">
                        Amul Gold Milk 500ml
                      </p>
                      <p className="text-[9px] text-slate-400">Chilled • Direct Store</p>
                      <span className="text-[10px] font-black text-[#FF5B00]">₹36</span>
                    </div>
                    <span className="bg-white/10 text-white font-bold text-[9px] px-2.5 py-1 rounded-lg border border-white/15">
                      ADD
                    </span>
                  </div>
                </div>

                {/* Floating Mockup Live Delivery Tracker */}
                <div className="bg-[#061838] border border-[#FF5B00]/40 rounded-2xl p-2.5 shadow-lg flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-xl bg-[#FF5B00] flex items-center justify-center text-white">
                      <Bike className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-white leading-tight">Order Arriving</p>
                      <p className="text-[9px] text-emerald-400 font-bold">Rider on KP Road • On The Way</p>
                    </div>
                  </div>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping mr-1" />
                </div>
              </div>
            </div>

            {/* Floating Trust Pills */}
            <div className="absolute -top-3 -right-2 sm:-right-4 bg-white dark:bg-[#1A202C] text-slate-900 dark:text-white px-3.5 py-2 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-700 flex items-center space-x-2 text-xs font-black z-20">
              <Zap className="w-4 h-4 text-[#FF5B00] fill-[#FF5B00]" />
              <span>Fastest Delivery Promise</span>
            </div>

            <div className="absolute -bottom-4 -left-2 sm:-left-4 bg-white dark:bg-[#1A202C] text-slate-900 dark:text-white px-3.5 py-2 rounded-2xl shadow-xl border border-slate-200/80 dark:border-slate-700 flex items-center space-x-2 text-xs font-black z-20">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>100% Guaranteed Fresh</span>
            </div>
          </div>
        </div>

        {/* SECTION 2: WHY DOWNLOAD THE APP (APP BENEFITS) */}
        <section id="app-features" className="mt-24 sm:mt-32">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-black uppercase tracking-widest text-[#FF5B00] block mb-2">
              Why Install DASHIT?
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-[#061838] dark:text-white tracking-tight">
              Built for speed, simplicity, and your daily life
            </h2>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400 font-medium">
              Every detail of the mobile app is optimized so you spend under 30 seconds placing your order.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-white dark:bg-[#141824] p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/90 shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-2xl bg-orange-100 dark:bg-orange-950/50 text-[#FF5B00] flex items-center justify-center mb-4">
                <Bike className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h3 className="text-lg font-black text-[#061838] dark:text-white mb-2">
                Live GPS Delivery Tracking
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Follow your delivery rider in real time from our Anantnag fulfillment store directly to your house doorstep.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-white dark:bg-[#141824] p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/90 shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h3 className="text-lg font-black text-[#061838] dark:text-white mb-2">
                1-Tap Quick Reordering
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Morning milk and fresh Kashmiri bakery saved to your daily list. Reorder your essentials in literally 1 single tap.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-white dark:bg-[#141824] p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/90 shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
              </div>
              <h3 className="text-lg font-black text-[#061838] dark:text-white mb-2">
                App-Only Member Deals
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
                Unlock exclusive coupon codes, zero delivery charges, and limited morning deals available only in the native app.
              </p>
            </div>
          </div>
        </section>

        {/* SECTION 3: "PREFER TO SHOP ON WEB?" (ONLY VISIBLE ON SCROLL) */}
        <section id="web-store-section" className="mt-28 sm:mt-36 pt-12 border-t-2 border-dashed border-slate-200 dark:border-slate-800">
          <div className="bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent dark:from-orange-950/30 dark:via-transparent dark:to-transparent rounded-3xl p-6 sm:p-10 border border-orange-200/80 dark:border-orange-500/20 mb-12">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div>
                <div className="inline-flex items-center space-x-2 text-xs font-black uppercase tracking-wider text-[#FF5B00] mb-2">
                  <ShoppingBag className="w-4 h-4" />
                  <span>Don&apos;t Have Your Phone Nearby?</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-[#061838] dark:text-white">
                  Continue &amp; Shop Online in Your Browser
                </h2>
                <p className="mt-2 text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl font-medium">
                  You can still browse our entire catalog, add groceries to your cart, and place orders directly from any computer or web browser.
                </p>
              </div>

              <Link
                href="/shop"
                className="bg-[#061838] hover:bg-[#FF5B00] text-white font-extrabold text-sm px-7 py-3.5 rounded-full shadow-lg shadow-[#061838]/20 hover:shadow-[#FF5B00]/30 transition-all duration-200 inline-flex items-center space-x-2 group shrink-0 active:scale-95 cursor-pointer"
              >
                <span>Launch Web Store</span>
                <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* POPULAR CATEGORIES SECTION FOR WEB USERS */}
          <div className="mb-8 flex flex-col sm:flex-row items-start sm:items-end justify-between">
            <div>
              <span className="text-xs font-black uppercase tracking-widest text-[#FF5B00] block mb-1">
                Explore The Daily Aisle
              </span>
              <h3 className="text-2xl sm:text-3xl font-black text-[#061838] dark:text-white tracking-tight">
                Popular Categories in Anantnag
              </h3>
            </div>
            <Link
              href="/categories"
              className="mt-3 sm:mt-0 text-xs font-black text-[#FF5B00] hover:underline flex items-center space-x-1"
            >
              <span>View all categories</span>
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 sm:gap-4">
            {POPULAR_CATEGORIES.map((cat, idx) => (
              <Link
                key={idx}
                href={`/shop?cat=${encodeURIComponent(cat.cat)}`}
                className="bg-white dark:bg-[#141824] rounded-3xl p-3 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:shadow-md hover:border-[#FF5B00]/60 transition-all group flex flex-col items-center text-center"
              >
                <div className="w-full h-24 sm:h-28 rounded-2xl overflow-hidden mb-3 bg-slate-100 dark:bg-slate-800 relative">
                  <img
                    src={cat.img}
                    alt={cat.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <h4 className="text-xs sm:text-sm font-black text-[#061838] dark:text-white group-hover:text-[#FF5B00] transition-colors line-clamp-1">
                  {cat.name}
                </h4>
                <p className="text-[10px] text-slate-400 dark:text-slate-400 mt-0.5 line-clamp-1 font-medium">
                  {cat.desc}
                </p>
              </Link>
            ))}
          </div>

          {/* HOW DASHIT WORKS 3-STEP */}
          <div className="mt-16 bg-white dark:bg-[#141824] border border-slate-200/80 dark:border-slate-800 rounded-3xl p-6 sm:p-10">
            <h3 className="text-xl sm:text-2xl font-black text-[#061838] dark:text-white mb-6">
              How DASHIT Delivers Across Anantnag
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start space-x-3.5">
                <div className="w-9 h-9 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-[#FF5B00] flex items-center justify-center font-black text-sm shrink-0">
                  1
                </div>
                <div>
                  <h5 className="text-sm font-black text-[#061838] dark:text-white">Choose Your Essentials</h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">
                    Fresh milk, hot morning Kashmiri bakery, vegetables or snacks in a few clicks.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3.5">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black text-sm shrink-0">
                  2
                </div>
                <div>
                  <h5 className="text-sm font-black text-[#061838] dark:text-white">Quickly Packed</h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">
                    Our local fulfillment team scans and double-checks your bag with barcode accuracy.
                  </p>
                </div>
              </div>

              <div className="flex items-start space-x-3.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black text-sm shrink-0">
                  3
                </div>
                <div>
                  <h5 className="text-sm font-black text-[#061838] dark:text-white">Fastest Doorstep Arrival</h5>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium leading-relaxed">
                    Our dedicated rider delivers right to your door with live GPS tracking.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="bg-[#061838] dark:bg-[#0E121A] text-white border-t border-white/10 mt-16 pt-12 pb-8">
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
                  Anantnag&apos;s #1 Quick Grocery Delivery Platform
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1 text-xs text-slate-300 font-semibold">
              <Link href="/shop" className="hover:text-white transition-colors">
                Web Store
              </Link>
              <Link href="/categories" className="hover:text-white transition-colors">
                Categories
              </Link>
              <a href="#download-section" onClick={scrollToDownload} className="text-[#FF5B00] hover:underline font-bold">
                Download App
              </a>
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms &amp; Conditions
              </Link>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-2">
            <p>© {new Date().getFullYear()} DASHIT Technologies. Anantnag (192101). Customer Helpline: +91 6006990032</p>
            <p className="flex items-center space-x-1.5 text-slate-300">
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
