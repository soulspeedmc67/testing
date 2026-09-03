import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Phone, Lock, Sparkles, ArrowRight } from "lucide-react";
import { sendOtp, verifyOtp } from "../lib/api";
import { hapticLight, hapticMedium } from "../lib/haptics";

export default function CheckoutLoginModal({ isOpen, onClose, onAuthenticated }) {
  const [step, setStep] = useState(1); // 1: Mobile, 2: OTP
  const [mobile, setMobile] = useState("9622720283");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (mobile.length < 10) {
      alert("Please enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    hapticLight();
    await sendOtp(mobile);
    setLoading(false);
    setStep(2);
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    if (otp.length < 4) {
      alert("Please enter the 4-digit OTP code");
      return;
    }
    setLoading(true);
    hapticMedium();
    const res = await verifyOtp(mobile, otp);
    setLoading(false);
    if (res.success) {
      onAuthenticated(res.user || { mobile, name: "Valued Customer" });
      onClose();
    } else {
      alert("Invalid OTP code. Please use test code: 1234");
    }
  };

  const handleSkip = () => {
    hapticLight();
    // Continue as guest
    const guestUser = {
      mobile: mobile || "9622720283",
      name: "Guest Customer",
      isGuest: true
    };
    try {
      localStorage.setItem("dashit_user", JSON.stringify(guestUser));
    } catch (e) {}
    onAuthenticated(guestUser);
    onClose();
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleSkip}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* iOS Bottom Sheet */}
        <motion.div
          initial={{ y: "100%" }}
          animate={{ y: 0 }}
          exit={{ y: "100%" }}
          transition={{ type: "spring", damping: 28, stiffness: 350 }}
          className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-t-[32px] p-6 shadow-2xl border-t border-slate-100 dark:border-zinc-800 z-10"
        >
          {/* iOS Grab Handle */}
          <div className="w-12 h-1.5 bg-slate-300 dark:bg-zinc-700 rounded-full mx-auto mb-4" />

          {/* Close / Skip button */}
          <button
            onClick={handleSkip}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-500 hover:text-slate-800 dark:text-zinc-400"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>

          <div className="text-center mb-5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-[#0c831f] flex items-center justify-center mx-auto mb-3 shadow-xs">
              <Sparkles className="w-6 h-6 stroke-[2.5]" />
            </div>
            <h3 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
              {step === 1 ? "Link Account for Order Updates" : "Enter Verification Code"}
            </h3>
            <p className="text-xs font-semibold text-slate-500 dark:text-zinc-400 mt-1">
              {step === 1
                ? "Get live WhatsApp tracking and delivery OTP for this order"
                : `Enter the 4-digit code sent to +91 ${mobile}`}
            </p>
          </div>

          {step === 1 ? (
            <form onSubmit={handleSendOtp} className="space-y-3.5">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value.replace(/\D/g, ""))}
                  placeholder="Enter 10-digit mobile number"
                  className="w-full bg-slate-50 dark:bg-zinc-800/80 border border-slate-200 dark:border-zinc-700 rounded-2xl pl-12 pr-4 py-3.5 text-sm font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0c831f]"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || mobile.length < 10}
                className="w-full py-3.5 rounded-2xl bg-[#0c831f] hover:bg-[#0a6f1a] text-white font-black text-sm shadow-md transition-transform active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? "Sending OTP..." : "Continue with Mobile"}
              </button>

              <button
                type="button"
                onClick={handleSkip}
                className="w-full py-2.5 text-xs font-bold text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200"
              >
                Skip & Continue as Guest ➔
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-3.5">
              <input
                type="text"
                maxLength={4}
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                placeholder="• • • •"
                className="w-full text-center tracking-[12px] bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-2xl py-3 text-2xl font-black text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0c831f]"
                autoFocus
              />
              <p className="text-[11px] text-center text-slate-400">
                Hint: Use dummy test OTP <b className="text-slate-700 dark:text-zinc-300">1234</b>
              </p>

              <button
                type="submit"
                disabled={loading || otp.length < 4}
                className="w-full py-3.5 rounded-2xl bg-[#0c831f] hover:bg-[#0a6f1a] text-white font-black text-sm shadow-md transition-transform active:scale-[0.98] disabled:opacity-50"
              >
                {loading ? "Verifying..." : "Verify & Place Order"}
              </button>

              <button
                type="button"
                onClick={handleSkip}
                className="w-full py-2 text-xs font-bold text-slate-500 dark:text-zinc-400"
              >
                Skip & Continue as Guest
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
