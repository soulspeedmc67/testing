import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Smartphone, Trash2, AlertTriangle, CheckCircle, Loader } from "lucide-react";
import SEO from "../components/SEO";
import { BreadcrumbJsonLd } from "../components/JsonLd";
import { getLocalUser } from "../lib/auth";

/**
 * Public account-deletion page.
 *
 * Google Play's Data safety form requires a URL where anyone can request
 * deletion of their account and data *without having the app installed*. An
 * email address alone does not satisfy it. This page is that URL:
 *
 *     https://<your-domain>/delete-account
 *
 * Three states:
 *  1. Not logged in  — shows instructions for both in-app and email paths.
 *  2. Logged in      — shows a live "Delete my account" button that calls
 *                      deleteAccount() from auth.js and signs the user out.
 *  3. Done           — confirmation screen with green tick.
 */
export default function DeleteAccountPage() {
  const [user, setUser] = useState(null);
  const [step, setStep] = useState("idle"); // idle | confirm | deleting | done | error
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    // Hydrate from localStorage (same source as the rest of the app)
    try {
      const local = getLocalUser();
      if (local?.isLoggedIn || local?.uid || local?.mobile) {
        setUser(local);
      }
    } catch (e) {}
  }, []);

  const handleDelete = async () => {
    setStep("deleting");
    setErrorMsg("");
    try {
      const { deleteAccount } = await import("../lib/auth");
      const result = await deleteAccount();
      if (result?.success) {
        setUser(null);
        setStep("done");
      } else if (result?.requiresRecentLogin) {
        setErrorMsg(
          "For your security, please open the DASHit app, sign in again, then return here to complete deletion."
        );
        setStep("error");
      } else {
        setErrorMsg(result?.message || "Deletion failed. Please try again or email support@dashit.co.in.");
        setStep("error");
      }
    } catch (e) {
      setErrorMsg(e?.message || "Something went wrong. Please email support@dashit.co.in.");
      setStep("error");
    }
  };

  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans dark:bg-surface dark:text-content">
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

      <header className="border-b border-slate-200 px-4 sm:px-8 py-4 dark:border-line">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors dark:text-content-muted dark:hover:text-content"
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

        {/* ── SUCCESS ── */}
        {step === "done" && (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <CheckCircle className="w-14 h-14 text-green-500" />
            <h1 className="text-2xl font-bold tracking-tight">Account deleted</h1>
            <p className="text-sm text-slate-600 max-w-sm leading-relaxed dark:text-content-secondary">
              Your DASHit profile, saved addresses, and sign-in credentials have been permanently
              removed. Completed order records are retained for statutory accounting as stated in our{" "}
              <Link href="/privacy" className="underline text-[#FF5B00]">Privacy Policy</Link>.
            </p>
            <Link
              href="/"
              className="mt-4 inline-block bg-slate-900 text-white text-sm font-semibold px-6 py-3 rounded-xl hover:bg-slate-700 transition-colors dark:bg-content dark:text-surface"
            >
              Back to home
            </Link>
          </div>
        )}

        {/* ── NORMAL FLOW ── */}
        {step !== "done" && (
          <>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                Delete your DASHit account
              </h1>
              <p className="text-sm text-slate-600 mt-2 leading-relaxed dark:text-content-secondary">
                You can permanently delete your DASHit account and the personal data attached to it
                at any time. Choose the method that suits you.
              </p>
            </div>

            {/* ── LOGGED-IN: live deletion button ── */}
            {user && (
              <section className="border-2 border-red-200 rounded-2xl p-5 space-y-4 bg-red-50 dark:bg-red-950/20 dark:border-red-900/50">
                <div className="flex items-center gap-2.5">
                  <Trash2 className="w-4 h-4 text-red-500" />
                  <h2 className="font-semibold text-base text-red-700 dark:text-red-400">
                    Delete now — you are signed in
                  </h2>
                </div>
                <p className="text-sm text-slate-600 leading-relaxed dark:text-content-secondary">
                  Signed in as{" "}
                  <strong>{user.name || user.email || user.mobile || "your account"}</strong>.
                  Tapping the button below will immediately and permanently erase your profile,
                  saved addresses, and sign-in credentials.
                </p>

                {step === "idle" && (
                  <button
                    onClick={() => setStep("confirm")}
                    className="w-full sm:w-auto bg-red-600 hover:bg-red-700 active:scale-95 text-white text-sm font-bold px-6 py-3 rounded-xl transition-all"
                  >
                    Delete my account
                  </button>
                )}

                {step === "confirm" && (
                  <div className="space-y-3">
                    <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl p-3 dark:bg-amber-950/20 dark:border-amber-800/40">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                        This is permanent and cannot be undone. Your profile, delivery addresses, and
                        session will be erased immediately.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={handleDelete}
                        className="bg-red-600 hover:bg-red-700 active:scale-95 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-all"
                      >
                        Yes, delete permanently
                      </button>
                      <button
                        onClick={() => setStep("idle")}
                        className="bg-white border border-slate-200 text-slate-700 text-sm font-semibold px-5 py-2.5 rounded-xl hover:bg-slate-50 transition-all dark:bg-surface-raised dark:border-line dark:text-content"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {step === "deleting" && (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <Loader className="w-4 h-4 animate-spin" />
                    Deleting your account…
                  </div>
                )}

                {step === "error" && (
                  <div className="space-y-3">
                    <p className="text-sm text-red-600 dark:text-red-400">{errorMsg}</p>
                    <button
                      onClick={() => setStep("idle")}
                      className="text-sm underline text-slate-500 hover:text-slate-800 dark:text-content-muted"
                    >
                      Try again
                    </button>
                  </div>
                )}
              </section>
            )}

            {/* ── IN-APP INSTRUCTIONS ── */}
            <section className="border border-slate-200 rounded-2xl p-5 space-y-3 dark:border-line">
              <div className="flex items-center gap-2.5">
                <Smartphone className="w-4 h-4 text-slate-400 dark:text-content-faint" />
                <h2 className="font-semibold text-base">From the app</h2>
              </div>
              <ol className="text-sm text-slate-600 space-y-1.5 list-decimal pl-5 leading-relaxed dark:text-content-secondary">
                <li>Open DASHit and go to <strong>Profile</strong>.</li>
                <li>Scroll to the bottom and tap <strong>Delete account</strong>.</li>
                <li>Confirm. Your profile is erased immediately.</li>
              </ol>
            </section>

            {/* ── EMAIL FALLBACK ── */}
            <section className="border border-slate-200 rounded-2xl p-5 space-y-3 dark:border-line">
              <div className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 text-slate-400 dark:text-content-faint" />
                <h2 className="font-semibold text-base">By email (no app needed)</h2>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed dark:text-content-secondary">
                If you no longer have the app installed, write to{" "}
                <a
                  href="mailto:support@dashit.co.in?subject=Account%20deletion%20request"
                  className="text-[#FF5B00] font-semibold hover:underline"
                >
                  support@dashit.co.in
                </a>{" "}
                from your registered address, or include the mobile number on the account. We action
                verified requests within 7 business days.
              </p>
            </section>

            {/* ── WHAT GETS DELETED ── */}
            <section className="space-y-3">
              <h2 className="font-semibold text-base">What is deleted</h2>
              <ul className="text-sm text-slate-600 space-y-1.5 list-disc pl-5 leading-relaxed dark:text-content-secondary">
                <li>Your name, phone number and email address</li>
                <li>Every saved delivery address and map pin</li>
                <li>Your sign-in credentials and session</li>
                <li>Your wishlist, cart and saved preferences on the device</li>
              </ul>

              <h2 className="font-semibold text-base pt-2">What is kept, and why</h2>
              <p className="text-sm text-slate-600 leading-relaxed dark:text-content-secondary">
                Records of completed orders are retained where we are legally required to keep them
                for statutory accounting and tax obligations. They are no longer linked to a usable
                account and cannot be used to sign in. Nothing is retained for marketing.
              </p>
            </section>
          </>
        )}

        <footer className="border-t border-slate-200 pt-6 text-xs text-slate-400 dark:border-line dark:text-content-faint">
          DASHit &middot; Anantnag, Jammu &amp; Kashmir 192101 &middot;{" "}
          <Link href="/privacy" className="underline hover:text-slate-600 dark:hover:text-content-secondary">
            Privacy Policy
          </Link>
        </footer>
      </main>
    </div>
  );
}
