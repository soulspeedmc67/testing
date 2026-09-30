import React from "react";
import { useRouter } from "next/router";
import { ArrowLeft, Mail, MapPin } from "lucide-react";
import SEO from "../components/SEO";
import { BreadcrumbJsonLd } from "../components/JsonLd";

const COMPLAINTS_EMAIL = "support@dashit.co.in";
const GRIEVANCE_OFFICER = "Azan Mir";

/* Complaints and copyright notices. The grievance officer and response times
   follow the Consumer Protection (E-Commerce) Rules, 2020: acknowledge within
   48 hours, resolve within a month. The apps' Help & Support screens open this
   page (ios-swift HelpSupportView, android-compose HelpSupportScreen). */
export default function ComplaintsPage() {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  const mailto = (subject) => `mailto:${COMPLAINTS_EMAIL}?subject=${encodeURIComponent(subject)}`;

  const h2 = "text-lg sm:text-xl font-bold text-[#061838] dark:text-content";
  const p = "text-xs sm:text-sm text-slate-600 leading-relaxed dark:text-content-secondary";
  const list = "list-disc pl-5 space-y-2 text-xs sm:text-sm text-slate-600 dark:text-content-secondary";

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-slate-900 font-sans selection:bg-[#FF5B00] selection:text-white dark:bg-surface">
      <SEO
        title="Complaints & Copyright — DASHIT Quick Commerce"
        description="How to raise a complaint with DASHIT, reach our grievance officer, or report a product photo or other material you own the rights to."
        canonical="/complaints/"
        ogType="website"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Complaints & Copyright", url: "/complaints/" },
        ]}
      />

      <header className="sticky top-0 z-40 bg-[#061838] text-white pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3 px-4 sm:px-8 border-b border-white/10 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center space-x-2 text-slate-300 hover:text-white transition-colors group text-sm font-semibold cursor-pointer dark:text-content-faint"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            <span>Back</span>
          </button>
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-lg bg-white/10 p-1 flex items-center justify-center">
              <img src="/dashit-mark-white.png" alt="DASHIT" className="w-full h-full object-contain" />
            </div>
            <span className="font-black text-base text-white tracking-tight">
              DASH<span className="text-[#FF5B00]">IT</span>
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-10 sm:py-16">
        <div className="bg-white rounded-3xl p-6 sm:p-12 border border-slate-200/80 shadow-sm space-y-8 dark:bg-surface-raised dark:border-line/80">
          <div className="border-b border-slate-100 pb-6 dark:border-line-soft">
            <h1 className="text-3xl sm:text-4xl font-black text-[#061838] tracking-tight dark:text-content">
              Complaints &amp; Copyright
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 dark:text-content-muted">
              Last updated: September 2026 • DASHIT Technologies, Anantnag, Jammu &amp; Kashmir (PIN: 192101).
            </p>
          </div>

          <section className="space-y-3">
            <h2 className={h2}>1. Grievance Officer</h2>
            <p className={p}>
              If something on DASHIT isn&apos;t right — an order, a refund, a product listing, or how we handled an
              earlier complaint — write to our Grievance Officer, {GRIEVANCE_OFFICER}, the owner of DASHIT. We reply
              to every complaint within 48 hours and resolve it within one month of receiving it.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <a
                href={mailto("Complaint")}
                className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 hover:border-slate-300 transition-colors dark:bg-surface-raised dark:border-line-soft"
              >
                <Mail className="w-4 h-4 text-[#FF5B00] shrink-0" />
                <span className="text-xs font-semibold text-slate-800 dark:text-content">{COMPLAINTS_EMAIL}</span>
              </a>
              <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 dark:bg-surface-raised dark:border-line-soft">
                <MapPin className="w-4 h-4 text-[#FF5B00] shrink-0" />
                <span className="text-xs font-semibold text-slate-800 dark:text-content">
                  {GRIEVANCE_OFFICER}, Owner &amp; Grievance Officer, DASHIT Technologies, Anantnag, J&amp;K 192101
                </span>
              </div>
            </div>
            <p className={p}>
              For help with a current order, the quickest way is the Help page in the app.
            </p>
          </section>

          <section id="copyright" className="space-y-3 scroll-mt-24">
            <h2 className={h2}>2. Copyright &amp; Trademark Complaints</h2>
            <p className={p}>
              We respect the rights of photographers, brands and other owners. If you own a product photo, text,
              logo or other material shown on DASHIT — or act for the person who does — and you did not allow us
              to use it, email{" "}
              <a href={mailto("Copyright complaint")} className="text-[#FF5B00] font-bold underline">
                {COMPLAINTS_EMAIL}
              </a>{" "}
              with the subject &quot;Copyright complaint&quot; and include:
            </p>
            <ul className={list}>
              <li>Your name, and an email address or phone number we can reach you on.</li>
              <li>Where the material appears: the product name or a link, and a screenshot if you can.</li>
              <li>The original work you own, or proof that you act for its owner.</li>
              <li>
                A statement that you believe, in good faith, that the use isn&apos;t allowed, and that the details in
                your message are accurate.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className={h2}>3. What Happens Next</h2>
            <ul className={list}>
              <li>We confirm we have your complaint within 48 hours.</li>
              <li>
                If the complaint holds up, we remove or replace the material within 36 hours of confirming it, and
                let you know when it&apos;s done.
              </li>
              <li>If we need more information to act, we tell you what&apos;s missing.</li>
              <li>
                If you think we removed something by mistake, write to the same address and explain why — we will
                look at it again.
              </li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className={h2}>4. Photo Credits</h2>
            <p className={p}>
              Some product photos come from Open Food Facts and Open Beauty Facts contributors and are used under
              the{" "}
              <a
                href="https://creativecommons.org/licenses/by-sa/3.0/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#FF5B00] underline"
              >
                CC BY-SA
              </a>{" "}
              licence. See also our{" "}
              <a href="/terms/" className="text-[#FF5B00] underline">
                Terms &amp; Conditions
              </a>{" "}
              and{" "}
              <a href="/privacy/" className="text-[#FF5B00] underline">
                Privacy Policy
              </a>
              .
            </p>
          </section>
        </div>
      </main>

      <footer className="bg-[#061838] text-white border-t border-white/10 py-8 px-4 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} DASHIT Technologies. All rights reserved. Operating in Anantnag, Jammu &amp; Kashmir.</p>
      </footer>
    </div>
  );
}
