import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { useBodyScrollLock } from "../lib/useBodyScrollLock";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  Mail, 
  Lock, 
  AlertCircle, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  User, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  Check 
} from "lucide-react";
import { hapticLight, hapticSuccess } from "../lib/haptics";
import { signInWithEmail, signUpWithEmail } from "../lib/auth";
import { getFirebaseAuth } from "../lib/firebase";

export default function CheckoutLoginModal({ isOpen, onClose, onAuthenticated }) {
  const router = useRouter();
  const [authMode, setAuthMode] = useState("signin"); // "signin" | "signup" | "quickphone"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [verificationSentNotice, setVerificationSentNotice] = useState("");

  // Populate from local storage if available
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const storedPhone = localStorage.getItem("dashit_user_phone");
        if (storedPhone) {
          setMobile(storedPhone.replace(/\D/g, "").slice(-10));
        }
        const storedUser = localStorage.getItem("dashit_user");
        if (storedUser) {
          const parsed = JSON.parse(storedUser);
          if (parsed?.email) setEmail(parsed.email);
          if (parsed?.name && parsed.name !== "Customer") setFullName(parsed.name);
          if (parsed?.mobile) setMobile(parsed.mobile.replace(/\D/g, "").slice(-10));
        }
      } catch (e) {}
    }
  }, [isOpen]);

  // Reset states when modal is closed/opened
  useEffect(() => {
    if (!isOpen) {
      setErrorMsg("");
      setVerificationSentNotice("");
      setLoading(false);
    }
  }, [isOpen]);

  /* Locks background scroll while open (see src/lib/useBodyScrollLock.js). */
  useBodyScrollLock(Boolean(isOpen));

  if (!isOpen) return null;

  const handleEmailAuthSubmit = async (e) => {
    e?.preventDefault();
    setErrorMsg("");
    setVerificationSentNotice("");

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      setErrorMsg("Please enter a valid email address");
      return;
    }
    if (!password || password.length < 6) {
      setErrorMsg("Password must be at least 6 characters");
      return;
    }

    const cleanMobile = mobile.replace(/\D/g, "").slice(-10);
    if (cleanMobile.length > 0 && cleanMobile.length < 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number for delivery");
      return;
    }

    setLoading(true);
    hapticLight();

    try {
      if (authMode === "signup") {
        const res = await signUpWithEmail(cleanEmail, password, fullName.trim() || "Customer", cleanMobile);
        if (res.success && res.user) {
          hapticSuccess();
          setVerificationSentNotice(`Confirmation email sent to ${cleanEmail}! Please check your inbox.`);
          setTimeout(() => {
            setLoading(false);
            onAuthenticated(res.user);
            onClose();
          }, 1200);
          return;
        } else {
          setErrorMsg(res.message || "Account creation failed. Please try again.");
        }
      } else {
        const res = await signInWithEmail(cleanEmail, password, cleanMobile);
        if (res.success && res.user) {
          hapticSuccess();
          setLoading(false);
          onAuthenticated(res.user);
          onClose();
          return;
        } else {
          setErrorMsg(res.message || "Invalid credentials. Check your email and password.");
        }
      }
    } catch (err) {
      setErrorMsg(err?.message || "Authentication error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickMobileSubmit = async (e) => {
    e?.preventDefault();
    const cleanNumber = mobile.replace(/\D/g, "").slice(-10);
    if (cleanNumber.length < 10) {
      setErrorMsg("Please enter a valid 10-digit mobile number");
      return;
    }

    setErrorMsg("");
    setLoading(true);
    hapticLight();

    let existingUser = null;
    try {
      const raw = localStorage.getItem("dashit_user");
      if (raw) existingUser = JSON.parse(raw);
    } catch (err) {}

    // Ensure Firebase anonymous authentication so Firestore security rules accept the order creation
    let uid = null;
    try {
      const auth = getFirebaseAuth();
      if (auth && !auth.currentUser) {
        const { signInAnonymously } = await import("firebase/auth");
        const cred = await signInAnonymously(auth);
        uid = cred?.user?.uid;
      } else if (auth?.currentUser) {
        uid = auth.currentUser.uid;
      }
    } catch (authErr) {
      console.warn("Could not ensure anonymous auth at checkout login:", authErr?.message);
    }

    hapticSuccess();
    const verifiedUser = {
      uid: uid || existingUser?.uid || null,
      name: existingUser?.name || "Customer",
      email: existingUser?.email || (email.trim() || ""),
      mobile: cleanNumber,
      address: existingUser?.address || "",
      isLoggedIn: true,
    };

    try {
      localStorage.setItem("dashit_user", JSON.stringify(verifiedUser));
      localStorage.setItem("dashit_user_phone", cleanNumber);
      if (uid) localStorage.setItem("dashit_client_uid", uid);
      window.dispatchEvent(new Event("dashit_user_updated"));
    } catch (err) {}

    setLoading(false);
    onAuthenticated(verifiedUser);
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
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity"
        />

        {/* Sleek iOS-style Bottom Sheet */}
        <motion.div
          initial={{ y: "100%", opacity: 0.8 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: "100%", opacity: 0 }}
          transition={{ type: "spring", damping: 28, stiffness: 360 }}
          className="relative w-full max-w-md bg-white rounded-t-[36px] p-6 pb-8 shadow-2xl border-t border-slate-100 z-10 max-h-[90vh] overflow-y-auto overscroll-contain dark:bg-surface-overlay dark:border-line-soft"
        >
          {/* Top Grab Handle */}
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3 dark:bg-surface-muted" />

          {/* Dismiss button */}
          <button
            onClick={onClose}
            aria-label="Close"
            className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:text-slate-800 active:scale-90 transition-transform cursor-pointer dark:bg-surface-muted dark:hover:text-content"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>

          {/* Header Icon + Brand Pill */}
          <div className="text-center mb-3">
            <div className="w-12 h-12 rounded-2xl bg-[#061838] text-white flex items-center justify-center mx-auto mb-2 shadow-md relative">
              <Mail className="w-5 h-5 text-[#FF5B00] stroke-[2.5]" />
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#FF5B00] border-2 border-white flex items-center justify-center">
                <CheckCircle2 className="w-3 h-3 text-white stroke-[3]" />
              </span>
            </div>

            <div className="inline-flex items-center space-x-1.5 bg-orange-50 text-[#FF5B00] px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mb-1 border border-orange-200/80">
              <Sparkles className="w-3 h-3 stroke-[2.5]" />
              <span>DASHIT Account &amp; Delivery Verification</span>
            </div>

            <h3 className="text-xl font-black text-[#061838] tracking-tight dark:text-content">
              {authMode === "signup"
                ? "Create Your Account"
                : authMode === "quickphone"
                ? "Quick Delivery Contact"
                : "Sign In to Place Order"}
            </h3>
            <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto mt-0.5 dark:text-content-muted">
              {authMode === "signup"
                ? "Sign up with email to receive order invoices & live GPS tracking."
                : authMode === "quickphone"
                ? "Provide your mobile number so our delivery driver can reach you."
                : "Enter your registered email & password to link your order."}
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="bg-slate-100 p-1 rounded-2xl flex items-center mb-4 select-none dark:bg-surface-muted">
            <button
              type="button"
              onClick={() => {
                setErrorMsg("");
                setAuthMode("signin");
              }}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                authMode === "signin"
                  ? "bg-white text-[#061838] shadow-xs dark:bg-surface-raised"
                  : "text-slate-500 hover:text-slate-800 dark:text-content-muted dark:hover:text-content"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setErrorMsg("");
                setAuthMode("signup");
              }}
              className={`flex-1 py-2 text-xs font-black rounded-xl transition-all cursor-pointer ${
                authMode === "signup"
                  ? "bg-white text-[#061838] shadow-xs dark:bg-surface-raised"
                  : "text-slate-500 hover:text-slate-800 dark:text-content-muted dark:hover:text-content"
              }`}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => {
                setErrorMsg("");
                setAuthMode("quickphone");
              }}
              className={`flex-1 py-2 text-[11px] font-bold rounded-xl transition-all cursor-pointer ${
                authMode === "quickphone"
                  ? "bg-white text-[#FF5B00] shadow-xs dark:bg-surface-raised"
                  : "text-slate-500 hover:text-slate-800 dark:text-content-muted dark:hover:text-content"
              }`}
            >
              Phone Only
            </button>
          </div>

          {/* Notification / Error Alerts */}
          {verificationSentNotice && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold p-3 rounded-2xl mb-3 flex items-start space-x-2">
              <Check className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0 stroke-[3]" />
              <p className="leading-snug">{verificationSentNotice}</p>
            </div>
          )}

          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold p-3 rounded-2xl mb-3 flex items-start space-x-2 animate-shake">
              <AlertCircle className="w-4 h-4 text-rose-500 mt-0.5 shrink-0 stroke-[2.5]" />
              <p className="leading-snug">{errorMsg}</p>
            </div>
          )}

          {/* Form */}
          {authMode === "quickphone" ? (
            /* Quick Phone Entry */
            <form onSubmit={handleQuickMobileSubmit} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block dark:text-content-secondary">
                  Delivery Contact Number
                </label>
                <div className="flex items-center bg-slate-50 border-2 border-slate-200 rounded-2xl px-3 py-1.5 focus-within:border-[#FF5B00] focus-within:bg-white focus-within:shadow-[0_0_0_3px_rgba(255,91,0,0.12)] transition-all dark:bg-surface-raised dark:border-line dark:focus-within:bg-surface-raised">
                  <span className="shrink-0 text-xs font-black text-[#061838] bg-slate-200/80 px-2.5 py-1.5 rounded-xl border border-slate-300/80 mr-2.5 select-none dark:border-line-strong/80 dark:text-content">
                    +91
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
                    style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a" }}
                    className="w-full bg-transparent border-0 outline-none text-base font-black text-slate-900 tracking-wider py-2 dark:text-content"
                    autoFocus
                  />
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-2.5 flex items-start space-x-2 text-amber-900 text-[11px]">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                <span>Our rider calls this number for doorstep drop coordinates.</span>
              </div>

              <button
                type="submit"
                disabled={loading || mobile.replace(/\D/g, "").length < 10}
                className="w-full py-3.5 rounded-2xl bg-[#FF5B00] hover:bg-[#E04E00] disabled:opacity-50 text-white font-black text-sm shadow-sm transition-all active:scale-[0.98] flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>{loading ? "Confirming..." : "Confirm Number & Proceed"}</span>
                <ArrowRight className="w-4 h-4 stroke-[3]" />
              </button>
            </form>
          ) : (
            /* Email & Password Authentication Form with Delivery Phone Capture */
            <form onSubmit={handleEmailAuthSubmit} className="space-y-3">
              {authMode === "signup" && (
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block dark:text-content-secondary">
                    Full Name
                  </label>
                  <div className="relative flex items-center">
                    <User className="absolute left-3.5 w-4 h-4 text-slate-400 dark:text-content-faint" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Your Name"
                      style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a" }}
                      className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-2xl pl-10 pr-3 py-3 outline-none focus:border-[#FF5B00] focus:bg-white transition-all dark:bg-surface-raised dark:border-line-strong dark:text-content dark:focus:bg-surface-muted"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block dark:text-content-secondary">
                  Email Address
                </label>
                <div className="relative flex items-center">
                  <Mail className="absolute left-3.5 w-4 h-4 text-slate-400 dark:text-content-faint" />
                  <input
                    type="email"
                    inputMode="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="customer@dashit.co.in"
                    style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a" }}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-2xl pl-10 pr-3 py-3 outline-none focus:border-[#FF5B00] focus:bg-white transition-all dark:bg-surface-raised dark:border-line-strong dark:text-content dark:focus:bg-surface-muted"
                    autoFocus={authMode !== "signup"}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block dark:text-content-secondary">
                  Password
                </label>
                <div className="relative flex items-center">
                  <Lock className="absolute left-3.5 w-4 h-4 text-slate-400 dark:text-content-faint" />
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a" }}
                    className="w-full bg-slate-50 border border-slate-300 text-slate-900 text-xs font-bold rounded-2xl pl-10 pr-10 py-3 outline-none focus:border-[#FF5B00] focus:bg-white transition-all dark:bg-surface-raised dark:border-line-strong dark:text-content dark:focus:bg-surface-muted"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 text-slate-400 hover:text-slate-700 p-1 cursor-pointer dark:text-content-faint dark:hover:text-content-secondary"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Delivery Contact Mobile Number at Bottom of Form */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block dark:text-content-secondary">
                    Delivery Contact Mobile (+91)
                  </label>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                    For Delivery Rider
                  </span>
                </div>
                <div className="flex items-center bg-slate-50 border border-slate-300 rounded-2xl px-3 py-1.5 focus-within:border-[#FF5B00] focus-within:bg-white transition-all dark:bg-surface-raised dark:border-line-strong dark:focus-within:bg-surface-raised">
                  <span className="shrink-0 text-xs font-bold text-slate-700 mr-2 select-none dark:text-content-secondary">
                    +91
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="10-digit delivery mobile"
                    style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a" }}
                    className="w-full bg-transparent border-0 outline-none text-xs font-bold text-slate-900 py-1.5 dark:text-content"
                  />
                </div>
                <p className="text-[10px] text-slate-500 font-medium pl-1 dark:text-content-muted">
                  Delivery partner will call this number for location handover.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3.5 rounded-2xl bg-[#061838] hover:bg-[#0A2450] text-white font-black text-xs shadow-sm transition-all active:scale-[0.98] flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
              >
                <span>
                  {loading
                    ? "Verifying..."
                    : authMode === "signup"
                    ? "Create Account & Place Order"
                    : "Sign In & Place Order"}
                </span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>
            </form>
          )}

          {/* Bottom links and advisory */}
          <div className="pt-3 border-t border-slate-100 mt-4 text-center space-y-2 dark:border-line-soft">
            <button
              type="button"
              onClick={() => {
                onClose();
                router.push("/login?redirect=/checkout");
              }}
              className="text-xs font-black text-[#FF5B00] hover:underline cursor-pointer"
            >
              Open Full Sign In &amp; Registration Screen →
            </button>

            <p className="text-[10.5px] text-slate-400 font-medium flex items-center justify-center gap-1 dark:text-content-faint">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 inline shrink-0" />
              <span>Secure SSL encrypted authentication · Verified delivery in Anantnag</span>
            </p>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
