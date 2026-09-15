import React from "react";
import { useRouter } from "next/router";
import { ArrowLeft, FileText, CheckCircle2, Clock, ShieldAlert, Phone, Mail, MapPin } from "lucide-react";
import SEO from "../components/SEO";
import { BreadcrumbJsonLd } from "../components/JsonLd";

export default function TermsAndConditionsPage() {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/shop");
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-slate-900 font-sans selection:bg-[#FF5B00] selection:text-white">
      <SEO
        title="Terms & Conditions — DASHIT Quick Commerce"
        description="Terms and conditions of service for DASHIT hyperlocal grocery delivery in Anantnag, Jammu & Kashmir (PIN: 192101)."
        canonical="/terms/"
        ogType="website"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Terms & Conditions", url: "/terms/" },
        ]}
      />

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-[#061838] text-white pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3 px-4 sm:px-8 border-b border-white/10 backdrop-blur-md">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <button
            type="button"
            onClick={handleBack}
            className="flex items-center space-x-2 text-slate-300 hover:text-white transition-colors group text-sm font-semibold cursor-pointer"
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

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-10 sm:py-16">
        <div className="bg-white rounded-3xl p-6 sm:p-12 border border-slate-200/80 shadow-sm space-y-8">
          
          {/* Title Header */}
          <div className="border-b border-slate-100 pb-6">
            <div className="inline-flex items-center space-x-2 bg-orange-50 text-[#FF5B00] px-3 py-1 rounded-full text-xs font-bold mb-3">
              <FileText className="w-3.5 h-3.5" />
              <span>User Agreement &amp; Service Terms</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-[#061838] tracking-tight">
              Terms &amp; Conditions
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Last updated: September 2026 • Governing delivery and ordering services across Anantnag (PIN: 192101).
            </p>
          </div>

          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#061838]">1. Acceptance of Terms</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              By accessing or using the DASHIT mobile application, website, or ordering services, you agree to be bound by these Terms and Conditions and our Privacy Policy. If you do not agree to these terms, please do not use our platform.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#061838]">2. Delivery Area &amp; Service Promise</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              DASHIT operates a hyperlocal quick-commerce delivery service in Anantnag, Jammu &amp; Kashmir.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-slate-600">
              <li>
                <strong>Delivery Estimates:</strong> Delivery times shown in the app are estimates based on your distance from our store and current conditions. They are indicative only and are not a guarantee. Active service zones include KP Road, Civil Lines, Ashajipora, Khanabal, Main Market, and surrounding areas in PIN 192101.
              </li>
              <li>
                <strong>Weather &amp; Safety Exceptions:</strong> Delivery times may vary during severe weather, snowfall, heavy traffic, or force majeure events to ensure rider safety.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#061838]">3. Orders, Pricing &amp; Payments</h2>
            <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-slate-600">
              <li>All product prices displayed are in Indian Rupees (₹) and include applicable taxes unless specified otherwise.</li>
              <li>We accept payments via UPI, Credit/Debit Cards, Net Banking, and Cash on Delivery (COD) subject to availability.</li>
              <li>In the rare event of an out-of-stock item after order placement, our team will promptly notify you and process an instant refund for the affected item.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#061838]">4. Cancellation &amp; Returns</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Because orders move quickly through the store, they enter the automated packing queue shortly after being placed.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-slate-600">
              <li><strong>Cancellation:</strong> You may cancel an order before it has been dispatched to a rider. Once marked &quot;Out for Delivery&quot;, cancellation is not permitted.</li>
              <li><strong>Fresh Produce &amp; Perishables:</strong> For dairy, bakery, and fresh fruits/vegetables, please inspect items upon delivery. Damaged, spoiled, or incorrect items reported within 2 hours of delivery will be replaced or refunded.</li>
            </ul>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#061838]">5. User Conduct &amp; Account Responsibility</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              Users must provide accurate phone numbers and delivery addresses. Providing fictitious addresses or harassing delivery personnel will result in immediate suspension of account privileges.
            </p>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#061838]">6. Customer Support</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              For any issues regarding orders, delivery delays, or payment refunds, reach out to our Anantnag customer helpline:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <Phone className="w-4 h-4 text-[#FF5B00] shrink-0" />
                <span className="text-xs font-semibold text-slate-800">+91 6006990032</span>
              </div>
              <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <Mail className="w-4 h-4 text-[#FF5B00] shrink-0" />
                <span className="text-xs font-semibold text-slate-800">support@dashit.co.in</span>
              </div>
              <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <MapPin className="w-4 h-4 text-[#FF5B00] shrink-0" />
                <span className="text-xs font-semibold text-slate-800">Anantnag, J&amp;K 192101</span>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-[#061838] text-white border-t border-white/10 py-8 px-4 text-center text-xs text-slate-400">
        <p>© {new Date().getFullYear()} DASHIT Technologies. All rights reserved. Operating in Anantnag, Jammu &amp; Kashmir.</p>
      </footer>
    </div>
  );
}
