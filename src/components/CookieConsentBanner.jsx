import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, Cookie } from "lucide-react";
import { isNative } from "../lib/platform";

/**
 * CookieConsentBanner
 *
 * Implements compliant cookieBanner and cookiePreferences controls
 * for web users. Never shown in the native mobile app.
 *
 * Fixed: previously the banner used tailwindcss-animate utility classes
 * (animate-in, fade-in, slide-in-from-bottom-5) that were never installed,
 * causing the banner to appear for one paint frame then vanish. Now uses
 * inline CSS transitions so it works everywhere. The show delay was also
 * increased to 2400ms so the banner appears after the splash screen finishes.
 */
export default function CookieConsentBanner() {
  const [shouldShow, setShouldShow] = useState(false);
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    // Never show cookie banner on the mobile app
    if (isNative()) return;

    try {
      const consent = localStorage.getItem("dashit_cookie_consent");
      if (!consent) {
        // Wait for splash screen to finish (~1950ms) + 500ms breathing room
        const showTimer = setTimeout(() => {
          setShouldShow(true);
          // Trigger entrance animation on next frame
          requestAnimationFrame(() => {
            requestAnimationFrame(() => setAnimate(true));
          });
        }, 2400);
        return () => clearTimeout(showTimer);
      }
    } catch {
      // Storage access disabled or private browsing
    }
  }, []);

  const dismiss = (consentType) => {
    // Animate out first, then hide
    setAnimate(false);
    setTimeout(() => {
      try {
        localStorage.setItem("dashit_cookie_consent", consentType);
      } catch {}
      setShouldShow(false);
    }, 300);
  };

  const acceptCookies = () => dismiss("accepted");
  const cookiePreferences = () => dismiss("essential_only");

  if (!shouldShow || isNative()) return null;

  return (
    <aside
      id="cookieBanner"
      aria-label="Cookie consent banner"
      className="fixed left-4 right-4 md:left-auto md:right-6 md:max-w-md bg-[#061838]/95 backdrop-blur-md text-white border border-white/10 rounded-2xl p-4 shadow-2xl"
      style={{
        /* Sits above BottomNav (z-50 = 50) */
        zIndex: 60,
        /* Position above the BottomNav bar on mobile */
        bottom: "max(80px, calc(76px + env(safe-area-inset-bottom, 8px)))",
        /* Entrance animation via CSS transitions */
        opacity: animate ? 1 : 0,
        transform: animate ? "translateY(0)" : "translateY(20px)",
        transition: "opacity 0.35s cubic-bezier(0.16,1,0.3,1), transform 0.35s cubic-bezier(0.16,1,0.3,1)",
      }}
    >
      <div className="flex items-start space-x-3">
        <div className="w-9 h-9 rounded-xl bg-[#FF5B00]/20 flex items-center justify-center shrink-0 mt-0.5">
          <Cookie className="w-5 h-5 text-[#FF5B00]" />
        </div>
        <div className="space-y-1.5 text-xs text-slate-300 dark:text-content-faint">
          <p className="font-semibold text-white text-sm">Privacy & Storage Preferences</p>
          <p className="leading-relaxed">
            DASHit uses essential device storage to remember your delivery address and cart. We respect your privacy and never track you across apps.
          </p>
          <p className="text-[11px] text-slate-400 dark:text-content-faint">
            Read our{" "}
            <Link href="/privacy" className="text-[#FF5B00] hover:underline font-medium">
              Privacy Policy
            </Link>{" "}
            for details.
          </p>
        </div>
      </div>

      <div className="mt-3.5 flex items-center justify-end space-x-2 pt-2 border-t border-white/10">
        <button
          type="button"
          onClick={cookiePreferences}
          className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white rounded-lg hover:bg-white/5 transition-colors dark:text-content-faint"
        >
          Essential Only
        </button>
        <button
          type="button"
          onClick={acceptCookies}
          className="px-4 py-1.5 text-xs font-semibold bg-[#FF5B00] hover:bg-[#e05000] text-white rounded-lg shadow-sm transition-all"
        >
          Accept All
        </button>
      </div>
    </aside>
  );
}
