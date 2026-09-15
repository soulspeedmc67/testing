import React from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Smartphone } from "lucide-react";
import SEO from "../components/SEO";
import { BreadcrumbJsonLd } from "../components/JsonLd";

/**
 * Public account-deletion page.
 *
 * Google Play's Data safety form requires a URL where anyone can request
 * deletion of their account and data *without having the app installed*. An
 * email address alone does not satisfy it. This page is that URL:
 *
 *     https://<your-domain>/delete-account
 *
 * It has to stay reachable without signing in, so it explains both routes —
 * the in-app control and the email request — and states exactly what is erased
 * and what is retained.
 */
export default function DeleteAccountPage() {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans">
      <SEO
        title="Delete Your Account — DASHIT"
        description="Request permanent deletion of your DASHIT account and personal data in accordance with Google Play and Apple App Store compliance policies."
        canonical="/delete-account/"
        ogType="website"
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Delete Account", url: "/delete-account/" },
        ]}
      />

      <header className="border-b border-slate-200 px-4 sm:px-8 py-4">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to DASHit</span>
          </Link>
          <span className="font-bold text-sm tracking-tight">
            DASH<span className="text-[#FF5B00]">IT</span>
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-8 py-10 sm:py-14 space-y-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Delete your DASHit account
          </h1>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            You can permanently delete your DASHit account and the personal data
            attached to it at any time. There are two ways to do it.
          </p>
        </div>

        <section className="border border-slate-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2.5">
            <Smartphone className="w-4 h-4 text-slate-400" />
            <h2 className="font-semibold text-base">From the app</h2>
          </div>
          <ol className="text-sm text-slate-600 space-y-1.5 list-decimal pl-5 leading-relaxed">
            <li>Open DASHit and go to <strong>Profile</strong>.</li>
            <li>Scroll to the bottom and tap <strong>Delete account</strong>.</li>
            <li>Confirm. Your profile is erased immediately.</li>
          </ol>
        </section>

        <section className="border border-slate-200 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2.5">
            <Mail className="w-4 h-4 text-slate-400" />
            <h2 className="font-semibold text-base">By email</h2>
          </div>
          <p className="text-sm text-slate-600 leading-relaxed">
            If you no longer have the app installed, email{" "}
            <a
              href="mailto:support@dashit.co.in?subject=Account%20deletion%20request"
              className="text-[#FF5B00] font-semibold underline"
            >
              support@dashit.co.in
            </a>{" "}
            from your registered address, or include the mobile number on the
            account. We action verified requests within 7 business days.
          </p>
        </section>

        <section className="space-y-3">
          <h2 className="font-semibold text-base">What is deleted</h2>
          <ul className="text-sm text-slate-600 space-y-1.5 list-disc pl-5 leading-relaxed">
            <li>Your name, phone number and email address</li>
            <li>Every saved delivery address and map pin</li>
            <li>Your sign-in credentials and session</li>
            <li>Your wishlist, cart and saved preferences on the device</li>
          </ul>

          <h2 className="font-semibold text-base pt-2">What is kept, and why</h2>
          <p className="text-sm text-slate-600 leading-relaxed">
            Records of completed orders are retained where we are legally
            required to keep them for statutory accounting and tax obligations.
            They are no longer linked to a usable account and cannot be used to
            sign in. Nothing is retained for marketing.
          </p>
        </section>

        <footer className="border-t border-slate-200 pt-6 text-xs text-slate-400">
          DASHit &middot; Anantnag, Jammu &amp; Kashmir 192101 &middot;{" "}
          <Link href="/privacy" className="underline hover:text-slate-600">
            Privacy Policy
          </Link>
        </footer>
      </main>
    </div>
  );
}
