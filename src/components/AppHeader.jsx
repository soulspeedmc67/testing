import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Mic, ChevronDown, Store, Clock, TrendingUp, User, ShoppingBag, MapPin, AlertTriangle, Zap } from "lucide-react";
import { setDeviceSystemBars } from "../lib/systemBars";
import { calculateDeliveryEta } from "../lib/deliveryEta";
import { useTheme } from "../context/ThemeContext";

export default function AppHeader({
  location = { nickname: "LOCATION", address: "Select delivery address" },
  onOpenLocation,
  onOpenLocationPicker,
  onOpenVoiceSearch,
  searchQuery = "",
  onSearchChange,
  isSearchClickable = true,
  hideStickySearch = false,
  isHighDemand = false,
  children
}) {
  const deliveryEta = calculateDeliveryEta(location);
  const openLocationHandler = onOpenLocation || onOpenLocationPicker;
  const router = useRouter();
  const [showTopWarning, setShowTopWarning] = useState(isHighDemand);
  const [showSmallBadge, setShowSmallBadge] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    let isScrolledRef = false;
    const handleScroll = () => {
      const nextScrolled = window.scrollY > 20;
      if (nextScrolled !== isScrolledRef) {
        isScrolledRef = nextScrolled;
        setIsScrolled(nextScrolled);
      }
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const { theme } = useTheme();

  const syncSystemBars = (warningActive = false) => {
    const isDark = theme === "dark";
    if (warningActive) {
      setDeviceSystemBars({
        topColor: "#8B1A1A",
        topDarkIcons: false,
        bottomColor: isDark ? "#14171F" : "#FFFFFF",
        bottomDarkIcons: !isDark,
      });
      return;
    }

    if (isDark) {
      setDeviceSystemBars({
        topColor: "#14171F",
        topDarkIcons: false,
        bottomColor: "#14171F",
        bottomDarkIcons: false,
      });
    } else {
      setDeviceSystemBars({
        topColor: isScrolled ? "#FFFDF5" : "#FFE8D6",
        topDarkIcons: true,
        bottomColor: "#FFFFFF",
        bottomDarkIcons: true,
      });
    }
  };

  useEffect(() => {
    if (isHighDemand) {
      setShowTopWarning(true);
      setShowSmallBadge(false);
      syncSystemBars(true);

      const timer = setTimeout(() => {
        setShowTopWarning(false);
        syncSystemBars(false);
        setTimeout(() => {
          setShowSmallBadge(true);
        }, 400);
      }, 7000);
      return () => clearTimeout(timer);
    } else {
      setShowTopWarning(false);
      setShowSmallBadge(false);
      syncSystemBars(false);
    }
  }, [isHighDemand, isScrolled, theme]);


  const [cartCount, setCartCount] = useState(0);
  const [searchPlaceholderIdx, setSearchPlaceholderIdx] = useState(0);
  const SEARCH_SUGGESTIONS = [
    'Search "milk, curd & paneer"',
    'Search "fresh kashmiri lavas bread"',
    'Search "coca cola & cold drinks"',
    'Search "chips & namkeen snacks"',
    'Search "atta, dal & cooking oil"',
  ];

  useEffect(() => {
    const syncCart = () => {
      try {
        const saved = localStorage.getItem("dashit_cart");
        if (saved) {
          const parsed = JSON.parse(saved);
          const count = parsed.reduce((sum, item) => sum + (item.qty || 0), 0);
          setCartCount(count);
        } else {
          setCartCount(0);
        }
      } catch (e) {
        setCartCount(0);
      }
    };
    syncCart();
    window.addEventListener("dashit_cart_updated", syncCart);
    window.addEventListener("storage", syncCart);
    return () => {
      window.removeEventListener("dashit_cart_updated", syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSearchPlaceholderIdx((prev) => (prev + 1) % SEARCH_SUGGESTIONS.length);
    }, 2800);
    return () => clearInterval(timer);
  }, []);

  const handleSearchClick = () => {
    if (isSearchClickable) {
      router.push("/search");
    }
  };

  return (
    <header className="w-full md:sticky md:top-0 md:z-50">
      {/* ========================================================================= */}
      {/* DESKTOP UNIFIED HEADER (md: and above) — Clean, cohesive, single-row bar */}
      {/* ========================================================================= */}
      <div className="hidden md:block w-full bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-[0_2px_12px_rgba(0,0,0,0.04)] dark:bg-surface-raised/95 dark:border-line/90">
        <div className="max-w-7xl mx-auto px-6 h-[74px] flex items-center justify-between">
          {/* Left: Brand Logo & Location Lockup */}
          <div className="flex items-center space-x-6">
            <Link href="/" className="flex items-center space-x-2.5 group">
              <div className="w-10 h-10 rounded-2xl bg-[#061838] flex items-center justify-center p-2 shadow-xs group-hover:scale-105 transition-transform border border-slate-700">
                <img src="/dashit-mark-white.png" alt="DASHit" className="w-full h-full object-contain" />
              </div>
              <div>
                <span className="font-black text-xl tracking-tight text-[#061838] leading-none block dark:text-content">
                  DASH<span className="text-[#FF5B00]">it</span>
                </span>
                <span className="text-[9.5px] font-extrabold uppercase tracking-widest text-[#FF5B00] block mt-0.5">
                  Fastest Delivery
                </span>
              </div>
            </Link>

            {/* Vertical Divider */}
            <div className="h-8 w-px bg-slate-200 dark:bg-surface-muted" />

            {/* Location & Delivery ETA Pill (Alias Only) */}
            <button
              type="button"
              onClick={openLocationHandler}
              className="text-left group cursor-pointer hover:bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/80 transition-all flex items-center space-x-2 dark:hover:bg-surface-muted dark:border-line/80"
            >
              <span
                className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md border flex items-center space-x-1 ${
                  !deliveryEta.isDeliverable
                    ? "text-rose-700 bg-rose-50 border-rose-200"
                    : "text-emerald-700 bg-emerald-50 border-emerald-200/80"
                }`}
              >
                {deliveryEta.isDeliverable ? (
                  <Zap className="w-2.5 h-2.5 fill-emerald-600 text-emerald-600 shrink-0" />
                ) : (
                  <AlertTriangle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                )}
                <span>{deliveryEta.pillText}</span>
              </span>
              <div className="flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-[#FF5B00] stroke-[2.5]" />
                <span className="text-xs font-black text-slate-900 uppercase tracking-tight dark:text-content">
                  {location.alias || location.nickname || "HOME"}
                </span>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition-colors dark:text-content-faint dark:group-hover:text-content-secondary" />
              </div>
            </button>
          </div>

          {/* Center: Integrated Wide Desktop Search Bar */}
          <div className="flex-1 max-w-xl mx-8">
            <div
              onClick={handleSearchClick}
              className="w-full relative flex items-center bg-slate-100 hover:bg-slate-50/80 text-slate-900 rounded-2xl px-4 py-2.5 shadow-2xs border border-slate-200 hover:border-[#FF5B00]/60 cursor-pointer transition-all group dark:bg-surface-muted dark:border-line"
            >
              <Search className="w-4 h-4 stroke-[2.5] text-slate-400 group-hover:text-[#FF5B00] mr-2.5 shrink-0 transition-colors" />
              <span className="text-xs font-semibold text-slate-500 select-none truncate flex-1">
                {SEARCH_SUGGESTIONS[searchPlaceholderIdx]}
              </span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  hapticLight();
                  if (onOpenVoiceSearch) onOpenVoiceSearch();
                  else router.push("/search?voice=true");
                }}
                className="p-1 rounded-full text-slate-400 hover:text-[#FF5B00] transition-colors cursor-pointer"
                title="Search with voice"
                aria-label="Voice Search"
              >
                <Mic className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Right: Navigation, Cart & Profile */}
          <div className="flex items-center space-x-4">
            <Link
              href="/categories"
              className="text-xs font-bold text-slate-700 hover:text-[#061838] px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors dark:text-content-secondary dark:hover:bg-surface-muted"
            >
              Categories
            </Link>
            <Link
              href="/orders"
              className="text-xs font-bold text-slate-700 hover:text-[#061838] px-3 py-2 rounded-xl hover:bg-slate-100 transition-colors dark:text-content-secondary dark:hover:bg-surface-muted"
            >
              My Orders
            </Link>

            {/* Desktop Header Cart Button */}
            <button
              type="button"
              onClick={() => router.push("/checkout")}
              className="bg-[#061838] hover:bg-[#0A2558] text-white px-4 py-2.5 rounded-2xl font-black text-xs flex items-center space-x-2 shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-[#FF5B00] stroke-[2.5]" />
              <span>{cartCount > 0 ? `Cart (${cartCount})` : "My Cart"}</span>
            </button>

            {/* Profile Avatar Button */}
            <button
              type="button"
              onClick={() => router.push("/account")}
              aria-label="Account Profile"
              className="w-10 h-10 rounded-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200 flex items-center justify-center text-slate-800 shadow-2xs active:scale-95 transition-all cursor-pointer dark:bg-surface-muted dark:border-line"
            >
              <User className="w-5 h-5 fill-slate-800 text-slate-800 stroke-none" />
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE COMPACT HEADER (< md) — Exactly preserved for mobile devices        */}
      {/* ========================================================================= */}
      <div className="md:hidden w-full bg-gradient-to-b from-[#FFE8D6] via-[#FFF5EB] to-[#FFFDF5] transition-colors duration-500 dark:from-surface dark:via-surface dark:to-surface">
        {/* 0. RESERVED STATUS BAR SPACE */}
        <div
          className={`w-full h-[env(safe-area-inset-top,0px)] shrink-0 pointer-events-none transition-colors duration-300 ${
            showTopWarning ? "bg-[#8B1A1A]" : ""
          }`}
          aria-hidden="true"
        />

        {/* HIGH DEMAND TOP BANNER WITH WAVY BOTTOM */}
        <AnimatePresence>
          {showTopWarning && (
            <motion.div
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="w-full relative z-30 select-none drop-shadow-xs"
            >
              <div className="w-full bg-[#8B1A1A] text-white">
                <div className="max-w-md mx-auto px-4 pt-1 pb-1 text-xs font-black flex items-center justify-center space-x-2 text-center tracking-tight">
                  <Clock className="w-3.5 h-3.5 text-red-200 shrink-0" />
                  <span>Longer delivery time due to high demand</span>
                </div>
              </div>

              <div className="w-full h-2.5 overflow-hidden -mt-px pointer-events-none">
                <svg
                  viewBox="0 0 1200 120"
                  preserveAspectRatio="none"
                  className="w-full h-full fill-[#8B1A1A]"
                >
                  <path d="M0,0 C50,120 100,0 150,0 C200,120 250,0 300,0 C350,120 400,0 450,0 C500,120 550,0 600,0 C650,120 700,0 750,0 C800,120 850,0 900,0 C950,120 1000,0 1050,0 C1100,120 1150,0 1200,0 L1200,0 L0,0 Z" />
                </svg>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile Top Delivery Row */}
        <div className="max-w-md mx-auto px-4 pt-1.5 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.25 }}
                className="text-[10px] font-black uppercase tracking-wider text-slate-500 block leading-tight dark:text-content-muted"
              >
                Dashit in
              </motion.span>
              <div className="flex items-center space-x-2 mt-0.5">
                <motion.h1
                  key={isHighDemand ? "18-mins" : `${deliveryEta.etaMinutes}-mins`}
                  initial={{ opacity: 0, y: 3 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                  className="text-[28px] font-black tracking-tight text-slate-900 leading-none dark:text-content"
                >
                  {isHighDemand ? "18 minutes" : deliveryEta.displayText}
                </motion.h1>

                <AnimatePresence>
                  {showSmallBadge && (
                    <motion.div
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.7, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 420, damping: 22 }}
                      className="inline-flex items-center space-x-1.5 bg-gradient-to-r from-red-600 to-rose-600 text-white text-[10px] font-black pl-1.5 pr-2.5 py-0.5 rounded-full shadow-xs border border-red-400/40 shrink-0 select-none"
                    >
                      <div className="w-4 h-4 rounded-full bg-white text-red-600 flex items-center justify-center shrink-0">
                        <TrendingUp className="w-2.5 h-2.5 stroke-[3]" />
                      </div>
                      <span className="tracking-tight text-[10px] font-bold">High demand</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!isHighDemand && (
                  deliveryEta.isDeliverable ? (
                    <span className="inline-flex items-center space-x-1 bg-sky-50 text-[#061838] text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-sky-200 dark:bg-sky-950/40 dark:border-sky-900/50 dark:text-sky-300">
                      <Store className="w-2.5 h-2.5 stroke-[2.5] shrink-0 text-[#061838] dark:text-sky-300" />
                      <span>{deliveryEta.distanceFormatted}</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 bg-rose-50 text-rose-700 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-rose-200 dark:bg-rose-950/40 dark:border-rose-900/50 dark:text-rose-300">
                      <AlertTriangle className="w-2.5 h-2.5 stroke-[2.5] shrink-0 text-rose-600 dark:text-rose-400" />
                      <span>Beyond 5km</span>
                    </span>
                  )
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={() => router.push("/account")}
              aria-label="Account Profile"
              className="w-9 h-9 rounded-full bg-white/90 hover:bg-white border border-amber-200/80 flex items-center justify-center text-slate-800 shadow-2xs active:scale-95 transition-all dark:bg-surface-raised/90 dark:hover:bg-surface-muted dark:text-content dark:border-line"
            >
              <User className="w-5 h-5 fill-slate-800 text-slate-800 stroke-none dark:fill-white dark:text-white" />
            </button>
          </div>

          {/* Alias-Only Mobile Location Pill */}
          <button
            type="button"
            onClick={openLocationHandler}
            className="inline-flex items-center space-x-1.5 text-slate-800 text-left group active:opacity-75 transition-opacity pt-1.5 cursor-pointer dark:text-content"
          >
            <div className="flex items-center space-x-1.5 bg-white/95 border border-slate-200/90 px-2.5 py-1 rounded-xl shadow-2xs group-hover:border-slate-300 dark:bg-surface-raised/95 dark:border-line/90 dark:group-hover:border-line-strong">
              <MapPin className="w-3 h-3 text-[#FF5B00] stroke-[2.5] shrink-0" />
              <span className="font-black text-xs text-slate-900 uppercase tracking-tight dark:text-content">
                {location.alias || location.nickname || "HOME"}
              </span>
              <ChevronDown className="w-3 h-3 stroke-[2.5] text-slate-400 group-hover:translate-y-0.5 transition-transform dark:text-content-secondary" />
            </div>
          </button>
        </div>
      </div>

      {/* 2. OPTIONAL STICKY SEARCH BAR (When rendered standalone) */}
      {!hideStickySearch && (
        <div className={`sticky top-0 z-40 bg-[#FFFDF5]/98 dark:bg-surface/98 backdrop-blur-xl border-b border-amber-100/60 dark:border-line shadow-[0_2px_10px_rgba(0,0,0,0.03)] transition-[padding] duration-150 ${
          isScrolled ? "pt-[env(safe-area-inset-top,0px)]" : ""
        }`}>
          <div className="max-w-md mx-auto px-4 pt-1.5 pb-2">
            <div
              onClick={handleSearchClick}
              className="relative flex items-center bg-white text-slate-900 rounded-2xl px-3.5 py-2.5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-slate-200/90 cursor-pointer active:scale-[0.99] transition-transform dark:bg-surface-raised dark:text-content dark:border-line/90"
            >
              <Search className="w-4 h-4 stroke-[2.5] text-slate-400 mr-2.5 shrink-0 dark:text-content-faint" />
              <input
                type="text"
                placeholder="Search for atta, dal, coke and more"
                value={searchQuery}
                onChange={(e) => onSearchChange && onSearchChange(e.target.value)}
                readOnly={isSearchClickable}
                className="w-full bg-transparent text-xs font-semibold text-slate-900 focus:outline-none placeholder-slate-400 cursor-pointer dark:text-content dark:placeholder-content-faint"
              />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  hapticLight();
                  if (onOpenVoiceSearch) onOpenVoiceSearch();
                  else router.push("/search?voice=true");
                }}
                className="p-1 text-slate-500 hover:text-[#FF5B00] transition-colors dark:text-content-muted cursor-pointer"
                title="Search with voice"
                aria-label="Voice Search"
              >
                <Mic className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>
          </div>

          {/* Embedded Sticky Scroller */}
          {children}
        </div>
      )}
    </header>
  );
}
