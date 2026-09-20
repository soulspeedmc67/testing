import React from "react";
import { useRouter } from "next/router";
import { ArrowLeft, Shield, Lock, FileText, Phone, Mail, MapPin } from "lucide-react";
import SEO from "../components/SEO";
import { BreadcrumbJsonLd } from "../components/JsonLd";

export default function PrivacyPolicyPage() {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/shop");
    }
  };

  return (
    <div className="min-h-screen bg-[#FFFDF9] text-slate-900 font-sans selection:bg-[#FF5B00] selection:text-white dark:bg-surface">
      <SEO
        title="Privacy Policy — DASHIT Quick Commerce"
        description="Privacy Policy for DASHIT application and services in Anantnag, Jammu & Kashmir. Learn how we protect your personal information and location data."
        canonical="/privacy/"
        ogType="website"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Privacy Policy", url: "/privacy/" },
        ]}
      />

      {/* Top Header */}
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

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-8 py-10 sm:py-16">
        <div className="bg-white rounded-3xl p-6 sm:p-12 border border-slate-200/80 shadow-sm space-y-8 dark:bg-surface-raised dark:border-line/80">
          
          {/* Title Header */}
          <div className="border-b border-slate-100 pb-6 dark:border-line-soft">
            <div className="inline-flex items-center space-x-2 bg-orange-50 text-[#FF5B00] px-3 py-1 rounded-full text-xs font-bold mb-3">
              <Shield className="w-3.5 h-3.5" />
              <span>Legal Compliance &amp; Data Protection</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black text-[#061838] tracking-tight dark:text-content">
              Privacy Policy
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-2 dark:text-content-muted">
              Last updated: September 2026 • Effective for DASHIT User, Driver, and Merchant applications.
            </p>
          </div>

          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#061838] dark:text-content">1. Introduction</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed dark:text-content-secondary">
              DASHIT Technologies (&quot;DASHIT&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the DASHIT quick-commerce grocery application and delivery services based in Anantnag, Jammu &amp; Kashmir (PIN: 192101). We are committed to protecting your personal information and your right to privacy under applicable laws, including the Information Technology Act, 2000, and the Digital Personal Data Protection (DPDP) Act.
            </p>
          </section>

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#061838] dark:text-content">2. Information We Collect</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed dark:text-content-secondary">
              To fulfil grocery and daily essentials deliveries, we collect the following categories of information:
            </p>
            <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-slate-600 dark:text-content-secondary">
              <li>
                <strong>Account &amp; Profile Information:</strong> Phone number (for OTP / mobile verification), full name, and saved delivery address labels (e.g. Home, Work).
              </li>
              <li>
                <strong>Precise Geographic Location:</strong> GPS coordinates collected while placing an order or using address pin features, strictly to route delivery riders to your doorstep in Anantnag.
              </li>
              <li>
                <strong>Order &amp; Transaction Details:</strong> Products purchased, order amounts, timestamps, payment mode details (Cash on Delivery or UPI collected upon delivery), and delivery notes.
              </li>
              <li>
                <strong>Rider Partners (DASHit rider app only):</strong> Identity verification documents, vehicle registration, and live location while a delivery is in progress. This applies to the separate rider app, not the customer app.
              </li>
            </ul>
          </section>

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#061838] dark:text-content">3. How We Use Your Information</h2>
            <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-slate-600 dark:text-content-secondary">
              <li>To dispatch and deliver grocery orders in Anantnag.</li>
              <li>To provide live order tracking and status notifications (Order Placed, Packing, Out for Delivery, Delivered).</li>
              <li>To offer customer support via telephone, WhatsApp, or in-app support channels.</li>
              <li>To maintain inventory accuracy and prevent unauthorized transactions.</li>
            </ul>
          </section>

          {/* Section 4 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#061838] dark:text-content">4. Location Data &amp; Permissions</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed dark:text-content-secondary">
              DASHIT uses your location only while the app is open, and only when you choose to share it — to confirm your delivery address and guide the rider to your door. The customer app does not collect location in the background. Riders using the DASHIT rider app share their position only while they are on an active delivery shift. We do not sell, rent, or trade location data to third-party advertising networks.
            </p>
          </section>

          {/* Section 5 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#061838] dark:text-content">5. Account Deletion &amp; Data Rights</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed dark:text-content-secondary">
              In accordance with Google Play and Apple App Store compliance policies, you have the absolute right to request the permanent deletion of your DASHIT account and associated personal data at any time.
            </p>
            <div id="privacy-policy" className="privacyPolicy bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs sm:text-sm text-slate-700 space-y-2 dark:bg-surface-raised dark:border-line dark:text-content-secondary">
              <p className="font-bold text-[#061838] dark:text-content">How to Delete Your Account:</p>
              <p>
                1. Navigate to <strong>Account Profile</strong> in the DASHIT mobile app and tap <strong>Delete Account</strong>.
              </p>
              <p>
                2. Or use our <a href="/delete-account" className="text-[#FF5B00] underline font-bold">account deletion page</a>, or write to <span className="text-[#FF5B00] font-bold">support@dashit.co.in</span> with your registered phone number.
              </p>
              <p>
                Deleting from within the app removes your profile, saved addresses and contact details immediately. Requests sent by email are actioned within 7 business days of verification. Completed order records are retained where we are required to keep them for statutory accounting obligations; they are no longer linked to a usable account.
              </p>
            </div>
          </section>

          {/* Section 6 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#061838] dark:text-content">6. Data Security</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed dark:text-content-secondary">
              All communications between your mobile device and our cloud servers are encrypted using TLS/SSL (HTTPS). Data stored in Google Cloud Firestore is governed by strict security rules and role-based access control.
            </p>
          </section>

          {/* Section 7 */}
          <section className="space-y-3">
            <h2 className="text-lg sm:text-xl font-bold text-[#061838] dark:text-content">7. Contact &amp; Grievance Redressal</h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed dark:text-content-secondary">
              For privacy queries, data requests, or grievances, contact our dedicated support team:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 dark:bg-surface-raised dark:border-line-soft">
                <Phone className="w-4 h-4 text-[#FF5B00] shrink-0" />
                <span className="text-xs font-semibold text-slate-800 dark:text-content">+91 6006990032</span>
              </div>
              <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 dark:bg-surface-raised dark:border-line-soft">
                <Mail className="w-4 h-4 text-[#FF5B00] shrink-0" />
                <span className="text-xs font-semibold text-slate-800 dark:text-content">support@dashit.co.in</span>
              </div>
              <div className="flex items-center space-x-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 dark:bg-surface-raised dark:border-line-soft">
                <MapPin className="w-4 h-4 text-[#FF5B00] shrink-0" />
                <span className="text-xs font-semibold text-slate-800 dark:text-content">Anantnag, J&amp;K 192101</span>
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
