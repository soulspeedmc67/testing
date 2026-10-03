import { useEffect, useRef, useState } from "react";
import DraggableSheet from "./ui/DraggableSheet";
import {
  signInShopper,
  requestNumberCode,
  confirmNumberCode,
  saveNumberUnconfirmed,
  completeShopper,
  cleanMobile,
} from "../lib/shopperAuth";

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" className="w-5 h-5" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

const inputClass =
  "w-full h-12 rounded-xl border border-slate-300 bg-white px-3.5 text-[16px] font-semibold text-slate-900 outline-none focus:border-[#061838] focus:ring-2 focus:ring-[#061838]/10 dark:bg-surface dark:border-line dark:text-content dark:focus:border-content-muted";
const primaryClass =
  "w-full h-12 rounded-xl bg-[#061838] text-white text-[15px] font-bold transition-colors hover:bg-[#0A2449] active:scale-[0.99] disabled:opacity-50 dark:bg-[#FF5B00] dark:hover:bg-[#E04E00]";

/**
 * Sign in to order, as an iOS-style sheet from the bottom: Google, then the
 * number the rider will call, then (when SMS codes are on) the code.
 * Calls onAuthenticated(user) with the finished session.
 */
export default function CheckoutLoginModal({ isOpen, onClose, onAuthenticated, resumeUser = null }) {
  const [step, setStep] = useState("google");
  const [user, setUser] = useState(null);
  const [mobile, setMobile] = useState("");
  const [code, setCode] = useState("");
  const [ticket, setTicket] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setError("");
    setBusy(false);
  }, [isOpen]);

  // Back from Google's own page (when the pop-up was blocked): on to the number.
  useEffect(() => {
    if (!resumeUser) return;
    setUser(resumeUser);
    if (resumeUser.mobile) setMobile(resumeUser.mobile);
    setStep("number");
  }, [resumeUser]);

  useEffect(() => {
    if (step !== "google") setTimeout(() => inputRef.current?.focus(), 250);
  }, [step]);

  const finish = (u, number) => {
    const session = completeShopper(u, number);
    setStep("google");
    setCode("");
    setTicket(null);
    onAuthenticated?.(session);
  };

  const onGoogle = async () => {
    setBusy(true);
    setError("");
    const res = await signInShopper();
    setBusy(false);
    if (res.redirecting) return;
    if (!res.user) {
      if (res.error) setError(res.error);
      return;
    }
    setUser(res.user);
    if (res.user.mobile) {
      setMobile(res.user.mobile);
    }
    setStep("number");
  };

  const onNumber = async (e) => {
    e.preventDefault();
    const clean = cleanMobile(mobile);
    if (!clean) {
      setError("Enter a 10-digit mobile number.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      // The number this account already confirmed needs no new code.
      if (user.mobile && user.mobile === clean) {
        finish(user, clean);
        return;
      }
      const sent = await requestNumberCode(clean);
      if (!sent?.configured) {
        await saveNumberUnconfirmed(user.uid, clean);
        finish(user, clean);
        return;
      }
      setTicket(sent.ticket);
      setStep("code");
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const onCode = async (e) => {
    e.preventDefault();
    const clean = cleanMobile(mobile);
    if (!/^\d{4,8}$/.test(code.trim())) {
      setError("Enter the code from the SMS.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await confirmNumberCode(clean, code.trim(), ticket);
      finish(user, clean);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const titles = {
    google: ["Sign in to order", "So we know who the order is for, and you can follow it."],
    number: ["Your mobile number", "The rider calls this number if they can't find your door."],
    code: ["Enter the code", `We sent a code by SMS to +91 ${cleanMobile(mobile) || ""}.`],
  };
  const [title, subtitle] = titles[step];

  return (
    <DraggableSheet isOpen={isOpen} onClose={onClose} zIndex="z-[130]">
      <div className="px-5 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <h2 className="text-[20px] font-extrabold tracking-tight text-[#061838] dark:text-content">{title}</h2>
        <p className="mt-1 text-[14px] leading-relaxed text-slate-600 dark:text-content-muted">{subtitle}</p>

        <div className="mt-5">
          {step === "google" && (
            <button
              type="button"
              onClick={onGoogle}
              disabled={busy}
              className="w-full h-12 rounded-xl border border-slate-300 bg-white flex items-center justify-center gap-3 text-[15px] font-bold text-slate-800 transition-colors hover:bg-slate-50 active:scale-[0.99] disabled:opacity-60 dark:bg-surface dark:border-line dark:text-content dark:hover:bg-surface-muted"
            >
              {busy ? (
                <span className="w-5 h-5 border-2 border-slate-300 border-t-slate-700 rounded-full animate-spin" />
              ) : (
                <GoogleMark />
              )}
              Continue with Google
            </button>
          )}

          {step === "number" && (
            <form onSubmit={onNumber} className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-12 px-3.5 rounded-xl border border-slate-300 bg-slate-50 flex items-center text-[16px] font-semibold text-slate-600 dark:bg-surface-muted dark:border-line dark:text-content-muted">
                  +91
                </span>
                <input
                  ref={inputRef}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel-national"
                  maxLength={14}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="98765 43210"
                  aria-label="Mobile number"
                  className={inputClass}
                />
              </div>
              <button type="submit" disabled={busy} className={primaryClass}>
                {busy ? "Please wait…" : "Continue"}
              </button>
            </form>
          )}

          {step === "code" && (
            <form onSubmit={onCode} className="space-y-3">
              <input
                ref={inputRef}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={8}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                placeholder="6-digit code"
                aria-label="SMS code"
                className={`${inputClass} tracking-[0.3em] text-center`}
              />
              <button type="submit" disabled={busy} className={primaryClass}>
                {busy ? "Checking…" : "Confirm"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStep("number");
                  setCode("");
                  setError("");
                }}
                className="w-full h-10 text-[14px] font-semibold text-slate-600 hover:text-slate-900 dark:text-content-muted"
              >
                Change number
              </button>
            </form>
          )}

          {error && (
            <p role="alert" className="mt-3 text-[13.5px] font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <p className="mt-5 text-[12px] leading-relaxed text-slate-500 dark:text-content-faint">
            By continuing you agree to our{" "}
            <a href="/terms/" className="underline underline-offset-2">Terms</a> and{" "}
            <a href="/privacy/" className="underline underline-offset-2">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </DraggableSheet>
  );
}
