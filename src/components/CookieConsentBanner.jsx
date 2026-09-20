import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ShieldCheck, Cookie } from "lucide-react";

/**
 * CookieConsentBanner
 *
 * Implements compliant cookieBanner and cookiePreferences controls
 * complying with ePrivacy Directive, GDPR, and India DPDP 2025/2026.
 */
export default function CookieConsentBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem("dashit_cookie_consent");
      if (!consent) {
        // Delay showing banner slightly for smooth UX
        const timer = setTimeout(() => setVisible(true), 1200);
        return () => clearTimeout(timer);
      }
    } catch {
      // Storage access disabled or private browsing
    }
  }, []);

  const acceptCookies = () => {
    try {
      localStorage.setItem("dashit_cookie_consent", "accepted");
    } catch {}
    setVisible(false);
  };

  const cookiePreferences = () => {
    try {
      localStorage.setItem("dashit_cookie_consent", "essential_only");
    } catch {}
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <aside
      id="cookieBanner"
      aria-label="Cookie consent banner"
      className="cookieConsentBanner fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-md z-50 bg-[#061838]/95 backdrop-blur-md text-white border border-white/10 rounded-2xl p-4 shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-5"
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
