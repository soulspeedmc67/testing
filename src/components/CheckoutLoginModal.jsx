import { useState, useEffect } from "react";
import { useBodyScrollLock } from "../lib/useBodyScrollLock";
import { motion, AnimatePresence } from "framer-motion";
import { X, Phone, AlertCircle, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { hapticLight, hapticSuccess } from "../lib/haptics";

export default function CheckoutLoginModal({ isOpen, onClose, onAuthenticated }) {
  const [mobile, setMobile] = useState("9622720283");
  const [isVerifiedCheck, setIsVerifiedCheck] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Populate from local storage if available
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedPhone = localStorage.getItem("dashit_user_phone");
        if (storedPhone) {
          setMobile(storedPhone.replace(/\D/g, "").slice(-10));
          return;
        }
        const storedUser = localStorage.getItem("dashit_user");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed?.mobile) {
            setMobile(parsed.mobile.replace(/\D/g, "").slice(-10));
          }
        }
      } catch (e) {}
    }
  }, [isOpen]);

  /* Locks background scroll while open (see src/lib/useBodyScrollLock.js). */
  useBodyScrollLock(Boolean(isOpen));

  if (!isOpen) return null;

  const handleConfirmMobile = (e) => {
    e?.preventDefault();
    const cleanNumber = mobile.replace(/\D/g, "").slice(-10);
    if (cleanNumber.length < 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number");
      return;
    }

    setErrorMsg("");
    setLoading(true);
    hapticLight();

    setTimeout(() => {
      hapticSuccess();
      let existingUser = null;
      try {
        const raw = localStorage.getItem("dashit_user");
        if (raw) existingUser = JSON.parse(raw);
      } catch (err) {}

      const verifiedUser = {
        name: existingUser?.name || "Azan Iqbal Mir",
        email: existingUser?.email || "",
        mobile: cleanNumber,
        address: existingUser?.address || "b-3,jamia appqrtment, Anantnag",
        isLoggedIn: true,
      };

      try {
        localStorage.setItem("dashit_user", JSON.stringify(verifiedUser));
        localStorage.setItem("dashit_user_phone", cleanNumber);
        window.dispatchEvent(new Event("dashit_user_updated"));
      } catch (err) {}

      setLoading(false);
      onAuthenticated(verifiedUser);
      onClose();
    }, 200);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-end justify-center">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        />

        {/* Sleek iOS-style Bottom Sheet with Spring Physics */}
        <motion.div
          initial={{ y: "100%", opacity: 0.8 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 360 }}
          className="relative w-full max-w-md bg-white rounded-t-[36px] p-6 pb-8 shadow-2xl border-t border-slate-100 z-10 max-h-[88vh] overflow-y-auto overscroll-contain"
        >
          {/* Top Grab Handle */}
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />

          {/* Dismiss button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 active:scale-90 transition-transform cursor-pointer"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Brand Header Icon with Dashit Signature Navy & Orange */}
          <div className="text-center mb-4">
            <div className="w-14 h-14 rounded-2xl bg-[#061838] text-white flex items-center justify-center mx-auto mb-3 shadow-md relative">
              <Phone className="w-6 h-6 text-[#FF5B00] stroke-[2.5]" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF5B00] border-2 border-white flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3 text-white stroke-[3]" />
              </span>
            </div>

            <div className="inline-flex items-center space-x-1.5 bg-amber-50 text-[#FF5B00] px-3 py-1 rounded-full text-[10.5px] font-black uppercase tracking-wider mb-2 border border-amber-200/70">
              <Sparkles className="w-3 h-3 stroke-[2.5]" />
              <span>Driver Contact Verification</span>
            </div>

            <h3 className="text-xl font-black text-[#061838] tracking-tight">
              Verify Delivery Number
            </h3>
          </div>

          {/* Prominent Advisory Card */}
          <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-3.5 mb-4 flex items-start space-x-3 shadow-2xs">
            <div className="w-7 h-7 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
              <AlertCircle className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div className="space-y-0.5 text-left">
              <p className="text-xs font-black text-amber-950">
                Please verify this is your number carefully
              </p>
              <p className="text-[11px] font-medium text-amber-800 leading-relaxed">
                You will be called on this number by the delivery driver to coordinate your location and hand over your order.
              </p>
            </div>
          </div>

          <form onSubmit={handleConfirmMobile} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                Your Contact Mobile Number
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3.5 text-xs font-black text-[#061838] bg-slate-100 px-2.5 py-1.5 rounded-xl border border-slate-200/80">
                  🇮🇳 +91
                </span>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  value={mobile}
                  onChange={(e) => {
                    setErrorMsg("");
                    setMobile(e.target.value.replace(/\D/g, "").slice(0, 10));
                  }}
                  placeholder="10-digit mobile number"
                  className="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl pl-26 pr-4 py-3.5 text-base font-black text-slate-900 focus:outline-none focus:border-[#FF5B00] focus:bg-white transition-all tracking-wide"
                  autoFocus
                />
              </div>
            </div>

            {/* Checkbox confirmation */}
            <label className="flex items-center space-x-2.5 p-2 rounded-xl bg-slate-50 border border-slate-200/80 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={isVerifiedCheck}
                onChange={(e) => setIsVerifiedCheck(e.target.checked)}
                className="w-4 h-4 rounded text-[#FF5B00] focus:ring-[#FF5B00] border-slate-300"
              />
              <span className="text-[11.5px] font-semibold text-slate-700">
                I confirm this is my active number to receive delivery calls
              </span>
            </label>

            {errorMsg && (
              <p className="text-xs font-bold text-red-500 text-center animate-shake">
                {errorMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={loading || mobile.replace(/\D/g, "").length < 10 || !isVerifiedCheck}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#FF5E00] to-[#E04800] hover:brightness-105 text-white font-black text-sm shadow-[0_8px_20px_rgba(255,94,0,0.3)] transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <span>{loading ? "Confirming..." : "Confirm Number & Place Order"}</span>
              <ArrowRight className="w-4 h-4 stroke-[3] text-white" />
            </button>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
