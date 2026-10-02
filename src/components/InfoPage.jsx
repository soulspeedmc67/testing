import React from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowLeft } from "lucide-react";
import SEO from "./SEO";
import { BreadcrumbJsonLd } from "./JsonLd";

/**
 * The frame shared by the plain information pages (refund policy, contact,
 * products): the same navy header and white card as the terms and privacy
 * pages, and a row of links to the other policy pages at the bottom.
 */
export default function InfoPage({ title, seoTitle, description, path, updated, children }) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-slate-900 font-sans dark:bg-surface">
      <SEO title={seoTitle} description={description} canonical={`${path}/`} ogType="website" />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: title, url: `${path}/` },
        ]}
      />

      <header className="sticky top-0 z-40 bg-[#061838] text-white pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3 px-4 sm:px-8 border-b border-white/10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center space-x-2 text-slate-300 hover:text-white transition-colors text-sm font-semibold cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </button>
          <Link href="/" className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-white/10 p-1 flex items-center justify-center">
              <img src="/dashit-mark-white.png" alt="DASHIT" className="w-full h-full object-contain" />
            </div>
            <span className="font-black text-base text-white tracking-tight">
              DASH<span className="text-[#FF5B00]">IT</span>
            </span>
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-10 sm:py-16">
        <div className="bg-white rounded-3xl p-6 sm:p-12 border border-slate-200/80 shadow-sm space-y-8 dark:bg-surface-raised dark:border-line/80">
          <div className="border-b border-slate-100 pb-6 dark:border-line-soft">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-[#061838] dark:text-content">{title}</h1>
            {updated && <p className="mt-3 text-sm text-slate-500 dark:text-content-faint">{updated}</p>}
          </div>
          {children}
        </div>

        <nav className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-slate-500 dark:text-content-faint">
          <Link href="/shop" className="hover:text-[#FF5B00]">Products</Link>
          <Link href="/refund-policy" className="hover:text-[#FF5B00]">Refunds &amp; cancellations</Link>
          <Link href="/contact" className="hover:text-[#FF5B00]">Contact</Link>
          <Link href="/terms" className="hover:text-[#FF5B00]">Terms</Link>
          <Link href="/privacy" className="hover:text-[#FF5B00]">Privacy</Link>
        </nav>
      </main>
    </div>
  );
}

/** A numbered section inside an information page. */
export function InfoSection({ title, children }) {
  return (
    <section className="space-y-3">
      <h2 className="text-xl font-bold text-[#061838] dark:text-content">{title}</h2>
      <div className="space-y-3 text-[15px] leading-relaxed text-slate-700 dark:text-content-muted">{children}</div>
    </section>
  );
}
