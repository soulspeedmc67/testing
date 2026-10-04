import React, { useState, useEffect } from "react";
import Link from "next/link";
import SEO from "../components/SEO";
import { WebSiteJsonLd, OrganizationJsonLd, GroceryStoreJsonLd } from "../components/JsonLd";
import { isNative } from "../lib/platform";
import { useTheme } from "../context/ThemeContext";
import { hapticLight } from "../lib/haptics";
import { motion, AnimatePresence } from "framer-motion";
import { stagger, fadeUp, inViewOnce, EASE_OUT } from "../lib/motion";
import { LAUNCH_AT, LAUNCH_LABEL, APK_URL, isBeforeLaunch } from "../lib/launch";
import { X, Menu, Sun, Moon, ArrowRight, MapPin, Wallet, Truck, Download, Plus, Check, Sparkles } from "lucide-react";

const DELIVERY_STEPS = [
  {
    n: "01",
    title: "Fill your cart",
    body: "Milk, bread, vegetables, snacks and household things, on the website or in the app.",
  },
  {
    n: "02",
    title: "Packed and checked",
    body: "Our Anantnag team picks every item and checks it into your bag.",
  },
  {
    n: "03",
    title: "At your door",
    body: "A rider brings it over, and you can follow them on a live map the whole way.",
  },
];

const PROMISES = [
  {
    Icon: Truck,
    title: "First 5 orders free delivery",
    body: "Enjoy free delivery on your first 5 orders! Standard ₹11 handling fee across all orders.",
  },
  {
    Icon: Wallet,
    title: "Pay online or in cash",
    body: "UPI, cards and net banking through Razorpay, or pay the rider when your order arrives.",
  },
  {
    Icon: MapPin,
    title: "Follow your order",
    body: "See when it is packed, when the rider picks it up, and where they are on the map.",
  },
];

/** The shelves shown on the page: a real product from each aisle, on white. */
const SHELVES = [
  { name: "Dairy", img: "dairy", alt: "Amul Lassi", cat: "Dairy" },
  { name: "Snacks", img: "snacks", alt: "Pringles", cat: "Snacks" },
  { name: "Drinks", img: "beverages", alt: "Real Activ coconut water", cat: "Beverages" },
  { name: "Biscuits", img: "biscuits", alt: "Bourbon biscuits", cat: "Biscuits" },
  { name: "Atta, rice & dal", img: "staples", alt: "India Gate rice", cat: "Staples" },
  { name: "Instant food", img: "instant-food", alt: "Wai Wai noodles cup", cat: "Instant Food" },
  { name: "Ice cream", img: "ice-cream", alt: "Cornetto cone", cat: "Ice Cream" },
  { name: "Sweets & chocolates", img: "sweets", alt: "Toblerone Tiny Mix", cat: "Sweets & Chocolates" },
];

/** Top local essentials in high demand across Anantnag */
const POPULAR_ANANTNAG_ITEMS = [
  {
    id: "CSV-amul-taaza-milk-paj5ea",
    name: "Amul Taaza Toned Fresh Milk",
    unit: "500 ml",
    price: 27,
    mrp: 28,
    img: "/landing/shelves/dairy.webp",
    badge: "Daily Essential",
    tag: "10 mins",
  },
  {
    id: "local-kashmiri-lavas-bread",
    name: "Fresh Kashmiri Lavas Bread",
    unit: "4 pcs",
    price: 30,
    mrp: 40,
    img: "/landing/shelves/biscuits.webp",
    badge: "Hot Local Bake",
    tag: "10 mins",
  },
  {
    id: "CSV-aashirvad-atta-if2zuq",
    name: "Aashirvaad Sharbati Whole Atta",
    unit: "5 kg",
    price: 260,
    mrp: 290,
    img: "/landing/shelves/staples.webp",
    badge: "100% MP Wheat",
    tag: "10 mins",
  },
  {
    id: "CSV-maggi-2minute-noodles-2wsyf6",
    name: "Maggi 2-Minute Masala Noodles",
    unit: "4 x 70 g",
    price: 56,
    mrp: 60,
    img: "/landing/shelves/instant-food.webp",
    badge: "Family Pack",
    tag: "10 mins",
  },
  {
    id: "lays-magic-masala-chips",
    name: "Lay's India's Magic Masala Chips",
    unit: "50 g",
    price: 20,
    mrp: 20,
    img: "/landing/shelves/snacks.webp",
    badge: "Crispy Classic",
    tag: "10 mins",
  },
];

/** A small caps label with a leading rule. */
function Eyebrow({ children, className = "" }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`}>
      <span className="w-6 h-px bg-[#FF5B00]" />
      <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#FF5B00]">{children}</span>
    </span>
  );
}

function GooglePlayMark({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 256 283" className={`${className} shrink-0`} aria-hidden="true">
      <path d="M119.553141,134.916362 L1.0599006,259.060547 C3.75619448,268.616998 10.7182836,276.3906 19.9208658,280.119977 C29.1234481,283.849353 39.5331235,283.115716 48.121672,278.132484 L181.448642,202.197919 L119.553141,134.916362 Z" fill="#EA4335" />
      <path d="M239.370822,113.813616 L181.71353,80.7909097 L116.815965,137.741834 L181.978418,202.021326 L239.19423,169.351804 C249.525723,163.942452 256,153.24465 256,141.58271 C256,129.92077 249.525723,119.222968 239.19423,113.813616 L239.370822,113.813616 Z" fill="#FBBC04" />
      <path d="M1.0599006,23.4868015 C0.343633396,26.134699 -0.0127538816,28.8670014 -9.94374397e-15,31.6100341 L-9.94374397e-15,250.937314 C0.00751268399,253.679042 0.363556675,256.408712 1.0599006,259.060547 L123.614758,138.095018 L1.0599006,23.4868015 Z" fill="#4285F4" />
      <path d="M120.436101,141.273674 L181.71353,80.7909097 L48.5631521,4.50316009 C43.5539929,1.56944036 37.8568091,0.0156629668 32.0517989,0 C17.6444261,-0.0284873284 4.97836875,9.53420553 1.0599006,23.3985055 L120.436101,141.273674 Z" fill="#34A853" />
    </svg>
  );
}

function AppleMark({ className = "w-5 h-5" }) {
  return (
    <svg viewBox="0 0 24 24" className={`${className} shrink-0 fill-current`} aria-hidden="true">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.38c.62-.75 1.04-1.8.92-2.85-.9.04-1.99.6-2.63 1.35-.56.65-1.05 1.72-.92 2.74 1 .08 2.01-.49 2.63-1.24z" />
    </svg>
  );
}

/** The two store listings, shown as "coming soon" (not links yet). */
function StoreBadges({ onDark = false }) {
  const tone = onDark
    ? "border-white/15 bg-white/[0.06] text-white"
    : "border-slate-300/80 bg-white text-[#061838] dark:border-slate-700 dark:bg-[#12161F] dark:text-white";
  const small = onDark ? "text-slate-400" : "text-slate-500 dark:text-slate-400";
  return (
    <div className="grid grid-cols-2 gap-2.5 max-w-[360px]">
      {[
        { mark: <GooglePlayMark />, store: "Google Play" },
        { mark: <AppleMark />, store: "App Store" },
      ].map(({ mark, store }) => (
        <div
          key={store}
          role="img"
          aria-label={`${store}: coming soon`}
          className={`h-[52px] min-w-0 px-3 sm:px-3.5 rounded-xl border flex items-center gap-2.5 sm:gap-3 select-none ${tone}`}
        >
          {mark}
          <span className="leading-tight text-left">
            <span className={`block text-[10.5px] font-medium ${small}`}>Coming soon to</span>
            <span className="block text-[14px] sm:text-[15px] font-bold tracking-tight whitespace-nowrap">{store}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/** The Android app before it is on Google Play: downloadable as an APK button. */
function ApkButton({ onDark = false }) {
  return (
    <a
      href={APK_URL}
      download="DASHit.apk"
      className={`group h-[48px] px-4 rounded-xl border flex items-center justify-center gap-2.5 max-w-[360px] text-[13.5px] font-bold transition-all shadow-xs active:scale-[0.98] ${
        onDark
          ? "border-white/20 bg-white/10 hover:bg-white/15 text-white"
          : "border-slate-300 bg-white hover:bg-slate-50 text-[#061838] dark:border-slate-700 dark:bg-[#12161F] dark:hover:bg-[#181D2A] dark:text-white"
      }`}
    >
      <Download className="w-4 h-4 text-[#FF5B00] shrink-0 transition-transform group-hover:-translate-y-0.5" aria-hidden="true" />
      <span>Download Android App (APK)</span>
    </a>
  );
}

/** Days, hours and minutes to opening; rendered after mount so the static HTML never disagrees. */
function useCountdown() {
  const [left, setLeft] = useState(null);
  useEffect(() => {
    const tick = () => setLeft(Math.max(0, LAUNCH_AT.getTime() - Date.now()));
    tick();
    const timer = setInterval(tick, 30 * 1000);
    return () => clearInterval(timer);
  }, []);
  if (left === null) return null;
  const minutes = Math.floor(left / 60000);
  return { days: Math.floor(minutes / 1440), hours: Math.floor((minutes % 1440) / 60), minutes: minutes % 60, done: left === 0 };
}

function Countdown() {
  const c = useCountdown();
  const cells = c ? [[c.days, "days"], [c.hours, "hours"], [c.minutes, "min"]] : [["–", "days"], ["–", "hours"], ["–", "min"]];
  return (
    <div className="flex gap-2.5" aria-label="Time until we open">
      {cells.map(([value, label]) => (
        <div key={label} className="w-[74px] sm:w-[84px] rounded-2xl bg-white/[0.07] border border-white/10 py-3 text-center">
          <span className="block font-display text-[30px] sm:text-[34px] font-extrabold leading-none tabular-nums">
            {typeof value === "number" ? String(value).padStart(2, "0") : value}
          </span>
          <span className="mt-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</span>
        </div>
      ))}
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

const NAV = [
  ["Shop", "/shop"],
  ["How it works", "#how-it-works"],
  ["Help", "/help"],
];

export default function LandingPage() {
  const { theme, setPreference } = useTheme();
  const [isAppClient, setIsAppClient] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [beforeLaunch, setBeforeLaunch] = useState(true);
  const [addedIds, setAddedIds] = useState({});

  const handleQuickAdd = (item, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    try {
      hapticLight();
      const savedCart = JSON.parse(localStorage.getItem("dashit_cart") || "[]");
      const pId = String(item.id);
      const existing = savedCart.find((i) => String(i.id || i.barcode) === pId);
      let nextCart;
      if (existing) {
        nextCart = savedCart.map((i) => (String(i.id || i.barcode) === pId ? { ...i, qty: (i.qty || 1) + 1 } : i));
      } else {
        nextCart = [...savedCart, { ...item, id: pId, qty: 1 }];
      }
      localStorage.setItem("dashit_cart", JSON.stringify(nextCart));
      window.dispatchEvent(new Event("dashit_cart_updated"));
      setAddedIds((prev) => ({ ...prev, [pId]: true }));
      setTimeout(() => {
        setAddedIds((prev) => ({ ...prev, [pId]: false }));
      }, 2000);
    } catch (err) {}
  };

  useEffect(() => {
    if (isNative() || (typeof window !== "undefined" && Boolean(window.__DASHIT_ROLE__))) setIsAppClient(true);
    setBeforeLaunch(isBeforeLaunch());
  }, []);

  useEffect(() => {
    let current = false;
    const onScroll = () => {
      const next = window.scrollY > 16;
      if (next !== current) {
        current = next;
        setIsScrolled(next);
      }
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const toggleTheme = () => {
    hapticLight();
    setPreference(theme === "dark" ? "light" : "dark");
  };

  const scrollToHash = (href) => (e) => {
    if (!href.startsWith("#")) return;
    e?.preventDefault();
    setMobileMenuOpen(false);
    document.getElementById(href.slice(1))?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (isAppClient) {
    return <div className="min-h-screen bg-white dark:bg-surface" />;
  }

  return (
    <div className="min-h-screen bg-[#FCFBF8] text-slate-900 font-sans antialiased selection:bg-[#FF5B00] selection:text-white dark:bg-[#0B0E14] dark:text-slate-100 transition-colors duration-300">
      <SEO
        title="DASHIT — Grocery Delivery App in Anantnag | Shop Online"
        description="Groceries and everyday essentials delivered across Anantnag in minutes. Shop online at dashit.co.in or in the DASHIT app, and pay by UPI, card or cash."
        canonical="/"
        ogType="website"
        keywords="DASHIT, grocery delivery Anantnag, online grocery Anantnag, quick commerce Kashmir, buy milk online Anantnag 192101"
      />
      <WebSiteJsonLd />
      <OrganizationJsonLd />
      <GroceryStoreJsonLd />

      {/* Launch line */}
      {beforeLaunch && (
        <div className="bg-[#061838] text-white dark:bg-[#0E1626]">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 py-2.5 flex items-center justify-center gap-x-3 gap-y-1 flex-wrap text-center text-[12.5px] sm:text-[13px]">
            <span className="font-semibold">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#FF5B00] align-middle mr-2" aria-hidden="true" />
              We open on <span className="text-[#FFB27F]">{LAUNCH_LABEL}</span>. Orders are taken from then on.
            </span>
            <Link href="/shop" className="font-bold underline underline-offset-4 decoration-white/40 hover:decoration-white">
              Browse the shop
            </Link>
          </div>
        </div>
      )}

      {/* Header */}
      <header
        className={`sticky top-0 z-50 w-full transition-[background-color,border-color] duration-300 border-b ${
          isScrolled
            ? "bg-[#FCFBF8]/90 dark:bg-[#0B0E14]/90 backdrop-blur-xl border-slate-200/80 dark:border-slate-800/80"
            : "bg-transparent border-transparent"
        }`}
      >
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 sm:h-[72px] flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2.5 shrink-0">
            <span className="w-9 h-9 rounded-xl bg-[#061838] flex items-center justify-center p-1.5">
              <img src="/dashit-mark-white.png" alt="" className="w-full h-full object-contain" />
            </span>
            <span className="font-display text-[21px] font-extrabold tracking-tight text-[#061838] dark:text-white">
              DASH<span className="text-[#FF5B00]">IT</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-8 text-[14px] font-semibold text-slate-600 dark:text-slate-300">
            {NAV.map(([label, href]) =>
              href.startsWith("#") ? (
                <a key={label} href={href} onClick={scrollToHash(href)} className="hover:text-[#061838] dark:hover:text-white transition-colors">
                  {label}
                </a>
              ) : (
                <Link key={label} href={href} className="hover:text-[#061838] dark:hover:text-white transition-colors">
                  {label}
                </Link>
              )
            )}
          </nav>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
              className="w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === "dark" ? <Sun className="w-[17px] h-[17px]" /> : <Moon className="w-[17px] h-[17px]" />}
            </button>
            <Link
              href="/shop"
              className="inline-flex items-center gap-1.5 bg-[#FF5B00] hover:bg-[#E04E00] text-white text-[13.5px] font-bold px-4 h-10 rounded-xl transition-colors active:scale-[0.98]"
            >
              Shop now
            </Link>
            <button
              type="button"
              onClick={() => setMobileMenuOpen((v) => !v)}
              aria-expanded={mobileMenuOpen}
              aria-label="Menu"
              className="md:hidden w-10 h-10 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center"
            >
              {mobileMenuOpen ? <X className="w-[18px] h-[18px]" /> : <Menu className="w-[18px] h-[18px]" />}
            </button>
          </div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.25, ease: EASE_OUT }}
              className="md:hidden overflow-hidden border-t border-slate-200/80 dark:border-slate-800/80 bg-[#FCFBF8] dark:bg-[#0B0E14]"
            >
              <div className="px-5 py-3 flex flex-col">
                {NAV.map(([label, href]) =>
                  href.startsWith("#") ? (
                    <a key={label} href={href} onClick={scrollToHash(href)} className="py-3 text-[15px] font-semibold text-[#061838] dark:text-white">
                      {label}
                    </a>
                  ) : (
                    <Link key={label} href={href} className="py-3 text-[15px] font-semibold text-[#061838] dark:text-white">
                      {label}
                    </Link>
                  )
                )}
              </div>
            </motion.nav>
          )}
        </AnimatePresence>
      </header>

      <main className="max-w-6xl mx-auto px-5 sm:px-8 w-full">
        {/* Hero */}
        <section className="pt-10 sm:pt-16 lg:pt-20 pb-16 sm:pb-24 grid grid-cols-1 lg:grid-cols-12 gap-14 lg:gap-8 items-center">
          <div className="lg:col-span-7">
            <Eyebrow>Anantnag, Kashmir</Eyebrow>
            <h1 className="mt-5 font-display text-[42px] sm:text-[58px] xl:text-[68px] leading-[1.02] font-extrabold tracking-[-0.035em] text-[#061838] dark:text-white [text-wrap:balance]">
              Groceries at your door, <span className="text-[#FF5B00]">in minutes.</span>
            </h1>
            <p className="mt-6 max-w-[34rem] text-[16px] sm:text-[17px] leading-[1.7] text-slate-600 dark:text-slate-300 [text-wrap:pretty]">
              Milk, bread, vegetables, snacks and everyday household things, packed at our Anantnag dark store and
              brought to your door. Shop on the website now; the apps are on their way.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row sm:items-center gap-3">
              <Link
                href="/shop"
                className="group inline-flex items-center justify-center gap-2 h-[52px] px-7 rounded-xl bg-[#FF5B00] hover:bg-[#E04E00] text-white text-[16px] font-bold transition-colors active:scale-[0.99]"
              >
                Shop now
                <ArrowRight className="w-[18px] h-[18px] transition-transform group-hover:translate-x-0.5" />
              </Link>
              <a
                href="#how-it-works"
                onClick={scrollToHash("#how-it-works")}
                className="inline-flex items-center justify-center h-[52px] px-6 rounded-xl border border-slate-300 dark:border-slate-700 text-[15px] font-semibold text-[#061838] dark:text-white hover:bg-white dark:hover:bg-slate-900 transition-colors"
              >
                How it works
              </a>
            </div>

            <div className="mt-8 space-y-3">
              <StoreBadges />
              <ApkButton />
            </div>
          </div>

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

        {/* Popular Right Now in Anantnag Shelf */}
        <section className="mb-14 sm:mb-20">
          <div className="flex items-end justify-between mb-5 sm:mb-6">
            <div>
              <Eyebrow>In High Demand</Eyebrow>
              <h2 className="mt-2 font-display text-[26px] sm:text-[32px] font-extrabold tracking-tight text-[#061838] dark:text-white flex items-center gap-2">
                Popular Right Now in Anantnag <span className="text-[#FF5B00]">⚡</span>
              </h2>
              <p className="mt-1 text-[13.5px] sm:text-[14.5px] text-slate-500 dark:text-slate-400">
                Daily local staples and family favorites delivered to your door in 10 minutes.
              </p>
            </div>
            <Link
              href="/shop"
              className="hidden sm:inline-flex items-center gap-1.5 text-[14px] font-bold text-[#FF5B00] hover:text-[#E04E00] transition-colors"
            >
              See all in shop <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="relative -mx-5 px-5 sm:mx-0 sm:px-0">
            <div className="flex sm:grid sm:grid-cols-5 gap-3.5 sm:gap-4 overflow-x-auto pb-4 pt-1 no-scrollbar snap-x snap-mandatory">
              {POPULAR_ANANTNAG_ITEMS.map((item) => {
                const isAdded = Boolean(addedIds[item.id]);
                return (
                  <div
                    key={item.id}
                    className="w-[210px] sm:w-auto shrink-0 snap-start rounded-2xl bg-white dark:bg-[#12161F] border border-[#EDE8DD] dark:border-slate-800 p-3.5 flex flex-col justify-between transition-all duration-200 hover:shadow-md hover:border-[#D9D1BF] dark:hover:border-slate-700"
                  >
                    <div>
                      {/* Thumbnail & Badges */}
                      <div className="relative aspect-square rounded-xl bg-slate-50 dark:bg-white/[0.04] p-2 flex items-center justify-center overflow-hidden">
                        <span className="absolute top-2 left-2 z-10 text-[9.5px] font-extrabold uppercase tracking-wide bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded-md">
                          ⚡ {item.tag}
                        </span>
                        <img
                          src={item.img}
                          alt={item.name}
                          width={240}
                          height={240}
                          loading="lazy"
                          className="w-full h-full object-contain p-1 transition-transform duration-300 hover:scale-105"
                        />
                      </div>

                      {/* Product Details */}
                      <span className="mt-2.5 block text-[11px] font-bold text-[#FF5B00] tracking-wide uppercase">
                        {item.badge}
                      </span>
                      <h3 className="text-[13.5px] font-bold text-[#061838] dark:text-white line-clamp-2 leading-snug mt-0.5">
                        {item.name}
                      </h3>
                      <span className="text-[12px] font-medium text-slate-400 block mt-1">
                        {item.unit}
                      </span>
                    </div>

                    {/* Price and Add button */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[15px] font-extrabold text-[#061838] dark:text-white">
                          ₹{item.price}
                        </span>
                        {item.mrp > item.price && (
                          <span className="ml-1.5 text-[11px] font-medium text-slate-400 line-through">
                            ₹{item.mrp}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => handleQuickAdd(item, e)}
                          className={`h-8 px-3 rounded-lg text-[12px] font-bold transition-all flex items-center gap-1 active:scale-95 shadow-xs cursor-pointer ${
                            isAdded
                              ? "bg-emerald-600 text-white"
                              : "bg-[#FF5B00] hover:bg-[#E04E00] text-white"
                          }`}
                          aria-label={`Add ${item.name} to cart`}
                        >
                          {isAdded ? (
                            <>
                              <Check className="w-3.5 h-3.5" /> Added
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5" /> Add
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-3 text-center sm:hidden">
            <Link
              href="/shop"
              className="inline-flex items-center gap-1.5 text-[13px] font-bold text-[#FF5B00]"
            >
              Browse all items in store <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </section>

        {/* What you can count on */}
        <motion.ul
          variants={stagger(0.08)}
          {...inViewOnce}
          className="grid grid-cols-1 md:grid-cols-3 border-y border-[#E8E2D5] dark:border-slate-800 divide-y md:divide-y-0 md:divide-x divide-[#E8E2D5] dark:divide-slate-800"
        >
          {PROMISES.map(({ Icon, title, body }) => (
            <motion.li key={title} variants={fadeUp} className="py-8 md:px-8 first:md:pl-0 last:md:pr-0">
              <Icon className="w-6 h-6 text-[#FF5B00]" aria-hidden="true" />
              <h2 className="mt-4 font-display text-[19px] font-bold tracking-tight text-[#061838] dark:text-white">{title}</h2>
              <p className="mt-2 text-[14.5px] leading-[1.65] text-slate-600 dark:text-slate-400">{body}</p>
            </motion.li>
          ))}
        </motion.ul>

        {/* On the shelves */}
        <section id="on-the-shelves" className="mt-24 sm:mt-32 scroll-mt-24 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-start">
          <motion.div variants={stagger(0.08)} {...inViewOnce} className="lg:col-span-4 lg:sticky lg:top-28">
            <motion.div variants={fadeUp}><Eyebrow>On the shelves</Eyebrow></motion.div>
            <motion.h2
              variants={fadeUp}
              className="mt-5 font-display text-[32px] sm:text-[40px] font-extrabold tracking-[-0.03em] leading-[1.08] text-[#061838] dark:text-white [text-wrap:balance]"
            >
              Over 4,000 everyday items
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-5 text-[15px] leading-[1.7] text-slate-600 dark:text-slate-400 max-w-sm">
              From milk and bread to shampoo and stationery, sorted into the aisles you already know.
            </motion.p>
            <motion.div variants={fadeUp} className="mt-7">
              <Link href="/shop" className="group inline-flex items-center gap-1.5 text-[15px] font-bold text-[#FF5B00]">
                Browse the shop
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </motion.div>
          </motion.div>

          <motion.ul variants={stagger(0.05)} {...inViewOnce} className="lg:col-span-8 grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            {SHELVES.map((shelf) => (
              <motion.li key={shelf.name} variants={fadeUp}>
                <Link
                  href={`/shop/?cat=${encodeURIComponent(shelf.cat)}`}
                  className="group h-full rounded-2xl bg-white dark:bg-[#12161F] border border-[#EDE8DD] dark:border-slate-800 p-3 sm:p-4 flex flex-col transition-[transform,border-color] duration-200 hover:-translate-y-0.5 hover:border-[#D9D1BF] dark:hover:border-slate-700"
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
                </Link>
              </motion.li>
            ))}
          </motion.ul>
        </section>

        {/* How it works */}
        <section id="how-it-works" className="mt-24 sm:mt-32 scroll-mt-24 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14">
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
                  <h3 className="font-display text-[20px] sm:text-[24px] font-bold tracking-tight text-[#061838] dark:text-white">{step.title}</h3>
                  <p className="mt-2 max-w-md text-[14.5px] leading-[1.7] text-slate-600 dark:text-slate-400">{step.body}</p>
                </div>
              </motion.li>
            ))}
          </motion.ol>
        </section>
      </main>

      {/* Opening day + footer */}
      <footer className="mt-24 sm:mt-32 bg-[#061838] dark:bg-[#080B11] text-white">
        <div className="max-w-6xl mx-auto px-5 sm:px-8">
          <div className="py-16 sm:py-24 grid grid-cols-1 lg:grid-cols-12 gap-12 items-end border-b border-white/10">
            <div className="lg:col-span-7">
              <Eyebrow>{beforeLaunch ? "Opening day" : "Open now"}</Eyebrow>
              <h2 className="mt-5 font-display text-[34px] sm:text-[48px] font-extrabold tracking-[-0.03em] leading-[1.05] [text-wrap:balance]">
                {beforeLaunch ? "We open on Monday 5 October, at 10 am." : "Your next order is a few taps away."}
              </h2>
              <p className="mt-4 max-w-lg text-[15px] leading-[1.7] text-slate-300">
                {beforeLaunch
                  ? "Orders are taken from 10 am on opening day. Until then you can browse the shop and fill your cart; it will be waiting for you."
                  : "Shop on the website, or install the app on your phone."}
              </p>
              {beforeLaunch && (
                <div className="mt-8">
                  <Countdown />
                </div>
              )}
            </div>
            <div className="lg:col-span-5 lg:justify-self-end w-full max-w-md space-y-4">
              <Link
                href="/shop"
                className="group flex items-center justify-center gap-2 h-[52px] rounded-xl bg-[#FF5B00] hover:bg-[#E04E00] text-white text-[16px] font-bold transition-colors"
              >
                Shop now
                <ArrowRight className="w-[18px] h-[18px] transition-transform group-hover:translate-x-0.5" />
              </Link>
              <StoreBadges onDark />
              <ApkButton onDark />
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
                <span className="block mt-1.5 text-[12px] text-slate-400">Grocery delivery in Anantnag</span>
              </span>
            </div>
            <nav aria-label="Footer" className="flex flex-wrap items-center gap-x-7 gap-y-2.5 text-[13px] font-semibold text-slate-300">
              <Link href="/shop" className="hover:text-white transition-colors">Shop</Link>
              <Link href="/help" className="hover:text-white transition-colors">Help</Link>
              <Link href="/contact" className="hover:text-white transition-colors">Contact</Link>
              <Link href="/refund-policy" className="hover:text-white transition-colors">Refunds</Link>
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
