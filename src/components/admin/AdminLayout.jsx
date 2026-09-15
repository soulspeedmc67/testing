import React, { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import {
  Package,
  Boxes,
  Camera,
  ArrowDownToLine,
  Tag,
  Sparkles,
  Barcode,
  FileSpreadsheet,
  Store,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  ExternalLink,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  CheckCircle2,
  AlertTriangle,
  Truck
} from "lucide-react";

export default function AdminLayout({
  activeTab,
  setActiveTab,
  isStoreOpen,
  currentCloseReason,
  onToggleStoreClick,
  darkMode,
  toggleDarkMode,
  soundEnabled,
  onToggleSound,
  onTestChime,
  onSignOut,
  activeOrdersCount = 0,
  lowStockCount = 0,
  catalogueCount = 0,
  newOrderAlert = null,
  onDismissNewOrderAlert,
  toastMessage = null,
  onDismissToast,
  children,
}) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /* Labels are the words a shopkeeper uses, not warehouse software jargon:
     "Batch Inward", "Catalogue", "FMCG Importer" and "CSV Import / Export" told
     the person running this store nothing about what the screen does. The groups
     are ordered by how often the day actually needs them. */
  const navItems = [
    {
      group: "Every day",
      items: [
        {
          id: "orders",
          label: "Orders",
          icon: Package,
          badge: activeOrdersCount > 0 ? activeOrdersCount : null,
          badgeColor: "bg-[#FF5B00] text-white",
        },
        {
          id: "inventory",
          label: "Stock",
          icon: Boxes,
          badge: lowStockCount > 0 ? `${lowStockCount} low` : null,
          badgeColor: "bg-amber-500 text-slate-950",
        },
        {
          id: "add-product",
          label: "Add an item",
          icon: Camera,
        },
        {
          id: "drivers",
          label: "Delivery riders",
          icon: Truck,
        },
      ],
    },
    {
      group: "Shop setup",
      items: [
        {
          id: "catalogue",
          label: "All items",
          icon: Tag,
          badge: catalogueCount > 0 ? `${catalogueCount}` : null,
          badgeColor: "bg-slate-200 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300",
        },
        {
          id: "offers",
          label: "Discounts",
          icon: Sparkles,
        },
        {
          id: "settings",
          label: "Shop settings",
          icon: Store,
        },
      ],
    },
    {
      group: "Bulk tools",
      items: [
        {
          id: "batch-inward",
          label: "Add many at once",
          icon: ArrowDownToLine,
        },
        {
          id: "csv",
          label: "Excel file",
          icon: FileSpreadsheet,
        },
        {
          id: "importer",
          label: "Find by barcode",
          icon: Barcode,
        },
      ],
    },
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    setMobileMenuOpen(false);
  };

  return (
    /* Phones and tablets scroll the document itself. The console used to pin
       itself to the viewport height and scroll an inner <main> instead, which is
       fragile on a phone browser — the address bar resize, the on-screen
       keyboard and a flick that starts on any non-scrolling child all leave the
       page looking frozen. The fixed two-pane layout is kept from `lg` up, where
       a sidebar plus its own scroll region is the right shape. */
    <div
      className={`min-h-screen lg:h-screen lg:h-[100dvh] lg:max-h-screen lg:overflow-hidden font-sans flex flex-col transition-colors ${
        darkMode ? "dark bg-[#0D0E12] text-zinc-100" : "bg-[#F4F6F9] text-slate-900"
      }`}
    >
      <Head>
        <title>DASHIT Partner Console</title>
        <link rel="icon" type="image/png" href="/favicon-light.png" media="(prefers-color-scheme: light)" />
        <link rel="icon" type="image/png" href="/favicon-dark.png" media="(prefers-color-scheme: dark)" />
        <link rel="shortcut icon" href="/favicon.ico" />
      </Head>

      {/* 1. TOP EXECUTIVE NAVBAR */}
      <header
        className={`shrink-0 sticky top-0 z-40 border-b px-4 sm:px-6 pt-[calc(env(safe-area-inset-top,0px)+10px)] pb-2.5 flex items-center justify-between transition-colors shadow-xs ${
          darkMode ? "bg-[#12141A] border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-900"
        }`}
      >
        <div className="flex items-center space-x-3 min-w-0">
          {/* Mobile Hamburger */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white cursor-pointer"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          {/* Logo & Hub Branding */}
          <div className="flex items-center space-x-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center p-1 shadow-xs">
              <img
                src={darkMode ? "/dashit-app-icon-white.png" : "/dashit-app-icon.png"}
                alt="DASHIT"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>
            <div>
              <div className="flex items-baseline space-x-2">
                <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">
                  DASH<span className="text-[#FF5B00]">IT</span>
                </span>
                <span className="text-[11px] font-medium text-slate-400 hidden sm:inline">
                  Store console
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-normal hidden sm:block">
                Anantnag
              </p>
            </div>
          </div>
        </div>

        {/* Center / Right Executive Actions.
            `shrink-0` keeps the store control on screen: the row used to be
            allowed to compress, so on a phone the brand block pushed the store
            button past the right edge where it could not be tapped at all. */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/*
            Says what pressing it does, and the label is never hidden.
            It previously read "Store Open (10m Active)" behind `hidden xs:inline`
            — and `xs` is not a breakpoint in this project's Tailwind config, so
            that label never rendered at any width. The control was an unlabelled
            coloured dot, which is why the store could not be opened.
          */}
          <button
            type="button"
            onClick={onToggleStoreClick}
            title={isStoreOpen ? "Stop accepting orders" : "Start accepting orders"}
            className={`flex items-center gap-2 pl-3 pr-3.5 py-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer whitespace-nowrap ${
              isStoreOpen
                ? darkMode
                  ? "border-zinc-700 text-zinc-100 hover:bg-zinc-800"
                  : "border-slate-300 text-slate-800 hover:bg-slate-50"
                : "border-transparent bg-[#FF5B00] text-white hover:bg-[#E04E00]"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${
                isStoreOpen ? "bg-emerald-500" : "bg-white"
              }`}
            />
            <span>{isStoreOpen ? "Close store" : "Open store"}</span>
          </button>

          {/* Audio Chime Button & Quick Test — desktop only, to leave the phone
              header room for the control that actually matters. */}
          <div className="hidden md:flex items-center space-x-1">
            <button
              type="button"
              onClick={onToggleSound}
            title={soundEnabled ? "Audio Chime Active (Click to mute)" : "Audio Chime Muted (Click to enable)"}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              darkMode
                ? "border-zinc-700 hover:bg-zinc-800 " + (soundEnabled ? "text-zinc-100" : "text-zinc-500")
                : "border-slate-200 hover:bg-slate-50 " + (soundEnabled ? "text-slate-700" : "text-slate-400")
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onTestChime}
              title="Test order alert sound"
              className="hidden md:inline-flex text-[10px] font-black uppercase tracking-wider px-2 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-500 hover:text-slate-900 dark:hover:text-white cursor-pointer"
            >
              Test
            </button>
          </div>

          {/* Dark / Light Mode Switcher */}
          <button
            type="button"
            onClick={toggleDarkMode}
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className={`p-2 rounded-lg border transition-colors cursor-pointer ${
              darkMode
                ? "border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Customer Storefront External Link */}
          <Link
            href="/shop"
            target="_blank"
            className={`p-2 rounded-lg border transition-colors hidden sm:flex items-center text-slate-500 hover:text-slate-900 dark:hover:text-white ${
              darkMode ? "border-zinc-700 hover:bg-zinc-800" : "border-slate-200 hover:bg-slate-50"
            }`}
            title="Open Customer Storefront"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>

          {/* Admin Sign Out */}
          <button
            type="button"
            onClick={onSignOut}
            title="Sign Out of Admin Console"
            className="p-2 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. REALTIME INCOMING ORDER ALERT STRIP */}
      {newOrderAlert && (
        <div className="shrink-0 bg-[#181B24] border-b border-[#FF5B00] text-white px-4 py-2.5 shadow-md animate-in slide-in-from-top-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-full bg-[#FF5B00] text-white flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </div>
              <div>
                <span className="font-black text-xs sm:text-sm uppercase tracking-wide block">
                  New Order Received · #{newOrderAlert.orderId || "DSH"}
                </span>
                <span className="text-xs text-slate-300 font-medium">
                  ₹{newOrderAlert.totalAmount || newOrderAlert.total || 0} · {newOrderAlert.customerName || "Customer"} ({newOrderAlert.items?.length || 1} items)
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("orders");
                  onDismissNewOrderAlert();
                }}
                className="bg-white text-slate-900 hover:bg-slate-100 font-black text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition-all cursor-pointer"
              >
                Dispatch Now
              </button>
              <button
                type="button"
                onClick={onDismissNewOrderAlert}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. MAIN DASHBOARD BODY (Metis-Style Layout: Sidebar + Content) */}
      <div className="flex-1 flex lg:overflow-hidden min-h-0">
        {/* LEFT SIDEBAR (Desktop) */}
        <aside
          className={`w-64 border-r hidden lg:flex flex-col justify-between shrink-0 min-h-0 transition-colors ${
            darkMode ? "bg-[#12141A] border-zinc-800" : "bg-white border-slate-200"
          }`}
        >
          {/* Navigation Links */}
          <div className="p-4 space-y-6 overflow-y-auto min-h-0 flex-1 admin-scroll">
            {navItems.map((grp, idx) => (
              <div key={idx} className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-zinc-400 px-3 block mb-1.5">
                  {grp.group}
                </span>

                {grp.items.map((item) => {
                  const isActive = activeTab === item.id;
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => handleNavClick(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                        isActive
                          ? "bg-gradient-to-r from-[#FF5B00] to-[#E04800] text-white shadow-sm font-black"
                          : darkMode
                          ? "text-zinc-400 hover:bg-zinc-800/60 hover:text-white"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <div className="flex items-center space-x-2.5">
                        <Icon className={`w-4 h-4 ${isActive ? "text-white" : "text-slate-400 dark:text-zinc-400"}`} />
                        <span>{item.label}</span>
                      </div>

                      {item.badge && (
                        <span className={`text-[10px] font-black px-2 py-0.2 rounded-full ${item.badgeColor}`}>
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>

          {/* Bottom Admin User Tile */}
          <div
            className={`p-3.5 border-t flex items-center justify-between ${
              darkMode ? "border-zinc-800 bg-[#0E1015]" : "border-slate-200 bg-slate-50"
            }`}
          >
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#FF5B00] text-white flex items-center justify-center font-black text-xs shrink-0 shadow-xs">
                A
              </div>
              <div className="min-w-0">
                <span className="font-bold text-xs text-slate-900 dark:text-white block truncate">
                  Store Admin
                </span>
                <span className="text-[10px] text-slate-400 block truncate">
                  admin@dashit.in
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onSignOut}
              title="Sign Out"
              className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </aside>

        {/* MOBILE SIDEBAR DRAWER */}
        {mobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              onClick={() => setMobileMenuOpen(false)}
            />
            <div
              className={`relative w-72 max-w-[80vw] h-full p-4 pt-[calc(env(safe-area-inset-top,0px)+16px)] pb-[max(20px,calc(12px+env(safe-area-inset-bottom,16px)))] flex flex-col justify-between shadow-2xl z-10 ${
                darkMode ? "bg-[#12141A] text-white" : "bg-white text-slate-900"
              }`}
            >
              <div className="space-y-6 overflow-y-auto min-h-0 flex-1 admin-scroll">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/50">
                  <div className="flex items-center space-x-2">
                    <span className="font-black text-base">
                      DASH<span className="text-[#FF5B00]">IT</span> Menu
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setMobileMenuOpen(false)}
                    className="p-1 text-slate-400"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {navItems.map((grp, idx) => (
                  <div key={idx} className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2 block mb-1">
                      {grp.group}
                    </span>
                    {grp.items.map((item) => {
                      const isActive = activeTab === item.id;
                      const Icon = item.icon;

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleNavClick(item.id)}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                            isActive
                              ? "bg-[#181B24] text-white"
                              : "text-slate-500 hover:bg-slate-100 dark:hover:bg-zinc-800"
                          }`}
                        >
                          <div className="flex items-center space-x-2.5">
                            <Icon className={`w-4 h-4 ${isActive ? "text-[#FF5B00]" : "text-slate-400"}`} />
                            <span>{item.label}</span>
                          </div>
                          {item.badge && (
                            <span className={`text-[10px] font-black px-2 py-0.2 rounded-full ${item.badgeColor}`}>
                              {item.badge}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))}
              </div>

              <div className="pt-3 border-t border-slate-200/50 flex items-center justify-between">
                <div className="text-xs">
                  <span className="font-bold block">admin@dashit.in</span>
                  <span className="text-[10px] text-slate-400">Anantnag</span>
                </div>
                <button
                  type="button"
                  onClick={onSignOut}
                  className="text-xs font-bold text-rose-500 hover:underline"
                >
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* RIGHT MAIN CONTENT AREA */}
        <main
          /* `min-w-0` matters: as a flex item this defaults to min-width:auto,
             so a wide child (the stat grid) stretched the column past the
             viewport and the right-hand cards were clipped out of reach. */
          className="flex-1 min-w-0 lg:overflow-y-auto p-4 sm:p-6 pb-[max(24px,calc(16px+env(safe-area-inset-bottom,0px)))] space-y-6 min-h-0 admin-scroll"
          data-scrollable="true"
        >
          {children}
        </main>
      </div>

      {/* 4. TOAST NOTIFICATION POPUP */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#181B24] text-white px-4 py-3 rounded-2xl shadow-2xl border border-zinc-700 flex items-center space-x-2.5 text-xs font-bold animate-in fade-in slide-in-from-bottom-4">
          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={onDismissToast}
            className="text-slate-400 hover:text-white ml-2 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
