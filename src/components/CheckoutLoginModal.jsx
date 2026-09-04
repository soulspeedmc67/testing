import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Phone, ShieldCheck, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { sendOtp, verifyOtp } from "../lib/api";
import { hapticLight, hapticMedium, hapticSuccess } from "../lib/haptics";

export default function CheckoutLoginModal({ isOpen, onClose, onAuthenticated }) {
  const [step, setStep] = useState(1); // 1: Mobile, 2: OTP
  const [mobile, setMobile] = useState("9622720283");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleSendOtp = async (e) => {
    e?.preventDefault();
    if (mobile.length < 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number");
      return;
    }
    setErrorMsg("");
    setLoading(true);
    hapticLight();
    await sendOtp(mobile);
    setLoading(false);
    setStep(2);
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    if (otp.length < 4) {
      setErrorMsg("Please enter the 4-digit verification code");
      return;
    }
    setErrorMsg("");
    setLoading(true);
    hapticMedium();
    const res = await verifyOtp(mobile, otp);
    setLoading(false);
    if (res.success) {
      hapticSuccess();
      const verifiedUser = res.user || {
        mobile,
        name: "Azan Iqbal Mir",
        address: "b-3,jamia appqrtment, Anantnag"
      };
      try {
        localStorage.setItem("dashit_user", JSON.stringify(verifiedUser));
        localStorage.setItem("dashit_user_phone", mobile);
      } catch (e) {}
      onAuthenticated(verifiedUser);
      onClose();
    } else {
      setErrorMsg("Invalid code. Use test code: 1234");
    }
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
          className="relative w-full max-w-md bg-white rounded-t-[36px] p-6 pb-8 shadow-2xl border-t border-slate-100 z-10 overflow-hidden"
        >
          {/* Top Grab Handle */}
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-4" />

          {/* Dismiss button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 active:scale-90 transition-transform"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Brand Header Icon with Dashit Signature Navy & Orange */}
          <div className="text-center mb-5">
            <div className="w-14 h-14 rounded-2xl bg-[#061838] text-white flex items-center justify-center mx-auto mb-3 shadow-md relative">
              <Phone className="w-6 h-6 text-[#FF5B00] stroke-[2.5]" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF5B00] border-2 border-white flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3 text-white stroke-[3]" />
              </span>
            </div>

            <div className="inline-flex items-center space-x-1.5 bg-amber-50 text-[#FF5B00] px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mb-1 border border-amber-200/60">
              <Sparkles className="w-3 h-3 stroke-[2.5]" />
              <span>Mandatory for Order Updates</span>
            </div>

            <h3 className="text-xl font-black text-[#061838] tracking-tight">
              {step === 1 ? "Verify Mobile Number" : "Enter Verification Code"}
            </h3>
            <p className="text-xs font-semibold text-slate-500 mt-1 max-w-[280px] mx-auto">
              {step === 1
                ? "Please verify your mobile number to receive live driver tracking and delivery OTP."
                : `We have sent a 4-digit OTP to +91 ${mobile}`}
            </p>
          </div>

          <AnimatePresence mode="wait">
            {step === 1 ? (
              <motion.form
                key="step-mobile"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleSendOtp}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                    Mobile Number
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-xs font-black text-[#061838] bg-slate-100 px-2 py-1 rounded-lg border border-slate-200/80">
                      🇮🇳 +91
                    </span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={mobile}
                      onChange={(e) => {
                        setErrorMsg("");
                        setMobile(e.target.value.replace(/\D/g, ""));
                      }}
                      placeholder="10-digit mobile number"
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl pl-24 pr-4 py-3.5 text-sm font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#061838] focus:bg-white transition-all tracking-wide"
                      autoFocus
                    />
                  </div>
                </div>

                {errorMsg && (
                  <p className="text-xs font-bold text-red-500 text-center animate-shake">
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || mobile.length < 10}
                  className="w-full py-3.5 rounded-2xl bg-[#061838] hover:bg-slate-900 text-white font-black text-sm shadow-md transition-transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <span>{loading ? "Sending OTP..." : "Get OTP Verification Code"}</span>
                  <ArrowRight className="w-4 h-4 stroke-[3] text-[#FF5B00]" />
                </button>
              </motion.form>
            ) : (
              <motion.form
                key="step-otp"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                onSubmit={handleVerifyOtp}
                className="space-y-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                      4-Digit OTP
                    </label>
                    <button
                      type="button"
                      onClick={() => setStep(1)}
                      className="text-xs font-bold text-[#FF5B00] hover:underline"
                    >
                      Change Number
                    </button>
                  </div>
                  <input
                    type="text"
                    maxLength={4}
                    value={otp}
                    onChange={(e) => {
                      setErrorMsg("");
                      setOtp(e.target.value.replace(/\D/g, ""));
                    }}
                    placeholder="• • • •"
                    className="w-full text-center tracking-[16px] bg-slate-50 border border-slate-200 rounded-2xl py-3 text-2xl font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#061838] focus:bg-white transition-all"
                    autoFocus
                  />
                </div>

                {/* Auto-fill test code chip */}
                <div className="flex items-center justify-center space-x-2">
                  <span className="text-[11px] text-slate-400 font-semibold">Demo code:</span>
                  <button
                    type="button"
                    onClick={() => {
                      setOtp("1234");
                      setErrorMsg("");
                    }}
                    className="text-xs font-black text-orange-700 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-200 active:scale-95 transition-transform"
                  >
                    Use 1234
                  </button>
                </div>

                {errorMsg && (
                  <p className="text-xs font-bold text-red-500 text-center">
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading || otp.length < 4}
                  className="w-full py-3.5 rounded-2xl bg-[#061838] hover:bg-slate-900 text-white font-black text-sm shadow-md transition-transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center space-x-2 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                  <span>{loading ? "Verifying..." : "Verify & Complete Order"}</span>
                </button>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
