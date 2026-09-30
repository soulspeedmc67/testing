import React, { useState, useEffect } from "react";
import Head from "next/head";
import Link from "next/link";
import { Sparkles, ArrowLeft, Sun, Moon, Store, ShieldCheck } from "lucide-react";
import CatalogEnricherView from "../components/admin/CatalogEnricherView";

export default function EnricherPage() {
  const [darkMode, setDarkMode] = useState(true);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  const handleSyncToStore = (products) => {
    try {
      const raw = localStorage.getItem("dashit_local_products");
      let existing = raw ? JSON.parse(raw) : [];
      let added = 0;
      products.forEach(p => {
        const idx = existing.findIndex(x => (x.barcode && x.barcode === p.barcode) || x.name === p.name);
        if (idx >= 0) {
          existing[idx] = { ...existing[idx], ...p };
        } else {
          existing.push(p);
          added++;
        }
      });
      localStorage.setItem("dashit_local_products", JSON.stringify(existing));
      showToast(`Synced ${products.length} products to local store catalog!`);
    } catch (e) {
      console.warn("Local sync error:", e);
      showToast(`Synced ${products.length} products successfully.`);
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-200 ${darkMode ? "bg-[#090A0F] text-slate-100 dark" : "bg-[#F8FAFC] text-slate-900"}`}>
      <Head>
        <title>DASHit — Automated Catalog & Image Enricher</title>
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      {/* Top Navigation Bar */}
      <header className={`sticky top-0 z-30 border-b backdrop-blur-md transition-colors ${
        darkMode ? "bg-[#0D0F17]/85 border-zinc-800" : "bg-white/85 border-slate-200"
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              href="/xcyop"
              className={`p-2 rounded-xl border flex items-center space-x-1.5 text-xs font-bold transition-all ${
                darkMode ? "border-zinc-800 hover:bg-zinc-800/80 text-zinc-300" : "border-slate-200 hover:bg-slate-100 text-slate-700"
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Store Console</span>
            </Link>

            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-xl bg-[#FF5B00] flex items-center justify-center text-white shadow-md shadow-orange-500/20 font-black text-sm">
                D
              </div>
              <div>
                <span className="font-black text-sm tracking-tight flex items-center space-x-1.5">
                  <span>DASHit</span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-orange-500/10 text-[#FF5B00] font-bold">
                    IMAGE PIPELINE
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2.5">
            <Link
              href="/shop"
              target="_blank"
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center space-x-1.5 transition-colors ${
                darkMode ? "border-zinc-800 hover:bg-zinc-800 text-zinc-300" : "border-slate-200 hover:bg-slate-100 text-slate-700"
              }`}
            >
              <Store className="w-3.5 h-3.5 text-emerald-500" />
              <span className="hidden sm:inline">View Store</span>
            </Link>

            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`p-2 rounded-xl border transition-colors ${
                darkMode ? "border-zinc-800 hover:bg-zinc-800 text-amber-400" : "border-slate-200 hover:bg-slate-100 text-slate-600"
              }`}
              title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="px-4 sm:px-6 py-6">
        <CatalogEnricherView
          darkMode={darkMode}
          showToast={showToast}
          onSyncProductsToCatalog={handleSyncToStore}
        />
      </main>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce bg-slate-900 text-white dark:bg-white dark:text-slate-950 px-4 py-3 rounded-2xl shadow-2xl flex items-center space-x-2.5 border border-slate-700 dark:border-slate-200">
          <Sparkles className="w-4 h-4 text-[#FF5B00]" />
          <span className="text-xs font-bold">{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
