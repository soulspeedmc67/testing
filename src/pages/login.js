import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  ArrowRight,
  BadgePercent,
  MessageSquare,
  ChevronRight,
  X,
  User,
  Check,
  Home,
  ShieldCheck,
  Phone,
  Sparkles,
  Compass,
} from "lucide-react";
import { goBack } from "../lib/navigation";
import {
  signInWithGoogle,
  signInWithTruecaller,
  signInWithEmail,
  signUpWithEmail,
} from "../lib/api";

export default function LoginPage() {
  const router = useRouter();

  // Step 1: Login Overview & Sheet, Step 3: Address & Profile Setup
  const [step, setStep] = useState(1);

  // Extended bottom sheet state (collapsed overview vs 70% auth sheet)
  const [isSheetExtended, setIsSheetExtended] = useState(false);

  // Auth Modes & State. Default to "signup"
  const [authTab, setAuthTab] = useState("signup"); // "signup" | "signin"
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Email form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Hero illustration state
  const [heroFailed, setHeroFailed] = useState(false);
  const heroImgRef = useRef(null);

  useEffect(() => {
    const img = heroImgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setHeroFailed(true);
  }, []);

  // User Profile & Delivery Details (Step 3)
  const [fullName, setFullName] = useState("Azan Iqbal Mir");
  const [mobile, setMobile] = useState("9622720283");
  const [flatNo, setFlatNo] = useState("House #12, Near Petrol Pump");
  const [area, setArea] = useState("Nai Basti");
  const [city, setCity] = useState("Anantnag");
  const [pincode, setPincode] = useState("192101");

  const TRUECALLER_CLIENT_ID =
    process.env.NEXT_PUBLIC_TRUECALLER_CLIENT_ID ||
    "yxekbcxiwocqnjm3ocnd2uk5kgqrzfooz1k635ezzrs";

  // Handle incoming Truecaller redirect or query params
  useEffect(() => {
    if (!router.isReady) return;
    const { endpoint, requestId, requestNonce, error, status } = router.query;
    if (error) {
      setErrorMessage(`Truecaller verification: ${error}`);
      setIsSheetExtended(true);
      return;
    }
    if (endpoint || (status === "success" && (requestId || requestNonce))) {
      setIsProcessing(true);
      signInWithTruecaller({
        requestId: requestId || requestNonce,
        endpoint,
      }).then((res) => {
        setIsProcessing(false);
        if (res.success) {
          router.push("/");
        } else {
          setErrorMessage(res.message || "Failed to complete Truecaller login");
          setIsSheetExtended(true);
        }
      });
    }
  }, [router.isReady, router.query]);

  // --------------------------------------------------------------------------
  // TRUECALLER 1-TAP LOGIN HANDLER
  // --------------------------------------------------------------------------
  const handleTruecallerLogin = () => {
    setIsProcessing(true);
    setErrorMessage("");

    const nonce =
      "tc_" + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("dashit_tc_nonce", nonce);
      } catch (e) {}
    }

    const tcUrl = `truecallersdk://truesdk/web_verify?type=btmsheet&requestNonce=${encodeURIComponent(
      nonce
    )}&partnerKey=${encodeURIComponent(
      TRUECALLER_CLIENT_ID
    )}&partnerName=DASHit&lang=en&title=login`;

    let appOpened = false;
    const handleBlur = () => {
      appOpened = true;
      window.removeEventListener("blur", handleBlur);
    };
    window.addEventListener("blur", handleBlur);

    window.location.href = tcUrl;

    setTimeout(() => {
      setIsProcessing(false);
      window.removeEventListener("blur", handleBlur);
      if (!appOpened && typeof document !== "undefined" && document.hasFocus()) {
        setErrorMessage(
          "Truecaller app not detected or not responding. You can continue instantly with Google or Email below."
        );
      }
    }, 1800);
  };

  // --------------------------------------------------------------------------
  // GOOGLE SIGN-IN HANDLER
  // --------------------------------------------------------------------------
  const handleGoogleLogin = async () => {
    setIsProcessing(true);
    setErrorMessage("");

    const timeoutPromise = new Promise((resolve) =>
      setTimeout(
        () =>
          resolve({
            success: false,
            message:
              "Google popup did not return a session to the app. Please sign in using Email & Password below.",
          }),
        15000
      )
    );

    try {
      const res = await Promise.race([signInWithGoogle(), timeoutPromise]);
      if (res.success) {
        if (res.user?.name && res.user?.name !== "Valued Customer") {
          setFullName(res.user.name);
        }
        if (res.user?.mobile) {
          setMobile(res.user.mobile.replace(/^\+91/, ""));
          const userData = {
            name: res.user.name,
            mobile: res.user.mobile,
            email: res.user.email || "",
            address: `${flatNo}, ${area}, ${city} - ${pincode}`,
            isLoggedIn: true,
          };
          localStorage.setItem("dashit_user", JSON.stringify(userData));
          router.push("/");
        } else {
          setStep(3);
        }
      } else {
        setErrorMessage(res.message || "Google sign-in was cancelled");
      }
    } catch (err) {
      setErrorMessage(err?.message || "Google sign-in failed");
    } finally {
      setIsProcessing(false);
    }
  };

  // --------------------------------------------------------------------------
  // EMAIL SIGN-IN / SIGN-UP HANDLER
  // --------------------------------------------------------------------------
  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) {
      setErrorMessage("Please enter a valid email address");
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage("Password must be at least 6 characters");
      return;
    }

    setIsProcessing(true);
    setErrorMessage("");

    try {
      const res =
        authTab === "signup"
          ? await signUpWithEmail(email, password, fullName)
          : await signInWithEmail(email, password);

      if (res.success) {
        if (res.user?.name && res.user?.name !== "Valued Customer") {
          setFullName(res.user.name);
        }
        if (res.user?.mobile) {
          setMobile(res.user.mobile.replace(/^\+91/, ""));
          const userData = {
            name: res.user.name,
            mobile: res.user.mobile,
            email: res.user.email || email,
            address: `${flatNo}, ${area}, ${city} - ${pincode}`,
            isLoggedIn: true,
          };
          localStorage.setItem("dashit_user", JSON.stringify(userData));
          router.push("/");
        } else {
          setStep(3);
        }
      } else {
        setErrorMessage(res.message || "Email authentication failed");
      }
    } catch (err) {
      setErrorMessage(err?.message || "Error authenticating");
    } finally {
      setIsProcessing(false);
    }
  };

  // --------------------------------------------------------------------------
  // FINALIZE SETUP (STEP 3)
  // --------------------------------------------------------------------------
  const handleCompleteSetup = () => {
    const userData = {
      name: fullName || "Valued Customer",
      mobile: mobile || "9622720283",
      email: email || "",
      address: `${flatNo}, ${area}, ${city} - ${pincode}`,
      isLoggedIn: true,
    };
    localStorage.setItem("dashit_user", JSON.stringify(userData));
    router.push("/");
  };

  const handleSkipSetup = () => {
    const userData = {
      name: "Guest User",
      mobile: mobile || "9622720283",
      email: email || "",
      address: "Nai Basti, Near Petrol Pump, Anantnag",
      isLoggedIn: true,
    };
    localStorage.setItem("dashit_user", JSON.stringify(userData));
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#061838] text-white font-sans flex flex-col justify-between overflow-hidden select-none relative">
      {/* STEP 1: Screenshot-styled Hero + Seamless Extensible Bottom Sheet */}
      {step === 1 && (
        <div className="relative min-h-screen flex flex-col justify-between bg-gradient-to-b from-[#061838] via-[#0A2558] to-[#040E22] pb-[165px]">
          {/* Top Section: Navigation + Brand Squircle + Headline + Large Artwork */}
          <div className="relative z-10 flex-1 flex flex-col px-6 pt-[max(14px,env(safe-area-inset-top,14px))] pb-2 justify-between">
            {/* Top Navigation Row */}
            <div className="flex items-center justify-between shrink-0">
              <button
                type="button"
                onClick={() => {
                  try {
                    const user = localStorage.getItem("dashit_user");
                    if (!user) {
                      handleSkipSetup();
                    } else {
                      goBack(router, "/");
                    }
                  } catch (e) {
                    goBack(router, "/");
                  }
                }}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 flex items-center justify-center text-white backdrop-blur-md transition-colors cursor-pointer"
                aria-label="Go back"
              >
                <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
              </button>

              <button
                type="button"
                onClick={handleSkipSetup}
                className="text-[11px] font-black text-white/75 hover:text-white bg-white/10 hover:bg-white/20 px-3.5 py-1.5 rounded-full transition-colors active:scale-95 cursor-pointer"
              >
                Skip for now
              </button>
            </div>

            {/* Centered Squircle Brand Icon */}
            <div className="text-center pt-2 shrink-0">
              <div className="w-[72px] h-[72px] rounded-[22px] bg-[#FF5B00] border-[2.5px] border-white shadow-[0_10px_28px_rgba(0,0,0,0.35)] flex items-center justify-center p-3.5 mx-auto">
                <img
                  src="/dashit-mark-white.png"
                  alt="DASHit"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Bold Punchy Headline */}
              <h1 className="text-[23px] sm:text-[25px] font-black text-white text-center leading-[1.18] tracking-tight max-w-[300px] mx-auto mt-3">
                One app for food, grocery, dining and more in mins!
              </h1>
            </div>

            {/* Artwork Sitting Underneath Headline (Flush above Bottom Sheet, Enlarge Sizing) */}
            <div className="flex-1 flex items-end justify-center pointer-events-none select-none overflow-hidden pb-1">
              {heroFailed ? (
                <img
                  src="/dashit-mark-white.png"
                  alt=""
                  aria-hidden="true"
                  className="w-24 h-24 object-contain opacity-80 mb-4"
                />
              ) : (
                <img
                  ref={heroImgRef}
                  src="/art/rider-scooter-hero-transparent.png"
                  alt="DASHit 8-minute delivery"
                  onError={() => setHeroFailed(true)}
                  className="w-full max-w-[320px] max-h-[38vh] object-contain object-bottom drop-shadow-[0_16px_36px_rgba(0,0,0,0.5)]"
                />
              )}
            </div>
          </div>

          {/* Dimmed Backdrop when Drawer is Extended */}
          <AnimatePresence>
            {isSheetExtended && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22 }}
                onClick={() => setIsSheetExtended(false)}
                className="fixed inset-0 z-40 bg-black/65 backdrop-blur-[2px]"
              />
            )}
          </AnimatePresence>

          {/* Unified Seamless Bottom Drawer (Morphs and extends smoothly upwards) */}
          <motion.div
            layout
            animate={{
              height: isSheetExtended ? "74vh" : "auto",
            }}
            transition={{
              type: "spring",
              stiffness: 340,
              damping: 32,
            }}
            className="fixed inset-x-0 bottom-0 z-50 bg-white text-slate-900 rounded-t-[34px] shadow-[0_-16px_40px_rgba(0,0,0,0.32)] flex flex-col overflow-hidden"
          >
            {/* Top Drag Affordance Handle */}
            <div
              onClick={() => setIsSheetExtended((prev) => !prev)}
              className="w-10 h-1.5 rounded-full bg-slate-300 hover:bg-slate-400 mx-auto mt-2.5 mb-1 cursor-pointer shrink-0 transition-colors"
            />

            {!isSheetExtended ? (
              /* COLLAPSED VIEW: Minimal Login Button & Legal Terms */
              <div className="px-6 pt-2 pb-[max(20px,calc(12px+env(safe-area-inset-bottom,20px)))] space-y-3.5 shrink-0">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab("signup");
                    setErrorMessage("");
                    setIsSheetExtended(true);
                  }}
                  className="w-full bg-[#FF5B00] hover:bg-[#E04E00] text-white font-black text-[15.5px] py-4 rounded-2xl shadow-[0_4px_16px_rgba(255,91,0,0.32)] active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer"
                >
                  Login
                </button>

                <p className="text-[11px] text-slate-500 text-center leading-relaxed max-w-[290px] mx-auto">
                  By tapping, I accept the{" "}
                  <span className="underline font-bold text-slate-700">Privacy Policy</span>
                  ,{" "}
                  <span className="underline font-bold text-slate-700">DASHit Terms of Use</span>{" "}
                  and{" "}
                  <span className="underline font-bold text-slate-700">Delivery Terms</span>
                </p>

                <p className="text-[10.5px] font-medium text-slate-400 text-center pt-0.5">
                  App version 1.0.0
                </p>
              </div>
            ) : (
              /* EXTENDED VIEW: Navigation Header + Full Sign Up / Sign In Form */
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Navigation Header inside Sheet */}
                <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => setIsSheetExtended(false)}
                    className="flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 active:scale-95 transition-colors p-1 -ml-1 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                    <span>Back</span>
                  </button>

                  <div className="text-center">
                    <h2 className="text-xs font-black uppercase tracking-wider text-slate-900">
                      {authTab === "signup" ? "Create Account" : "Sign In"}
                    </h2>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsSheetExtended(false)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 active:scale-90 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </div>

                {/* Scrollable Form Content */}
                <div className="flex-1 overflow-y-auto overscroll-contain px-6 py-4 space-y-3.5">
                  {/* Segmented Sign Up / Sign In Tabs */}
                  <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200/80">
                    {["signup", "signin"].map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => {
                          setAuthTab(tab);
                          setErrorMessage("");
                        }}
                        className={`py-2.5 rounded-xl text-[12.5px] tracking-tight transition-all active:scale-[0.98] cursor-pointer ${
                          authTab === tab
                            ? "bg-white text-slate-900 font-black shadow-sm"
                            : "text-slate-500 hover:text-slate-900 font-bold"
                        }`}
                      >
                        {tab === "signup" ? "Sign Up" : "Sign In"}
                      </button>
                    ))}
                  </div>

                  {/* Error message pill */}
                  {errorMessage && (
                    <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-3 rounded-2xl flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Email / Password Form */}
                  <form onSubmit={handleEmailAuth} className="space-y-3">
                    {authTab === "signup" && (
                      <div className="space-y-1">
                        <label className="block text-[11px] font-bold text-slate-500 pl-1 uppercase tracking-wider">
                          Full Name
                        </label>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Azan Iqbal Mir"
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl py-2.5 px-4 text-[13.5px] placeholder:text-slate-400 focus:outline-hidden focus:border-[#FF5B00] focus:ring-1 focus:ring-[#FF5B00]/40 transition-all"
                        />
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-500 pl-1 uppercase tracking-wider">
                        Email
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl py-2.5 px-4 text-[13.5px] placeholder:text-slate-400 focus:outline-hidden focus:border-[#FF5B00] focus:ring-1 focus:ring-[#FF5B00]/40 transition-all"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-slate-500 pl-1 uppercase tracking-wider">
                        Password
                      </label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={authTab === "signup" ? "Create password (min 6 chars)" : "••••••••••••"}
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-2xl py-2.5 pl-4 pr-12 text-[13.5px] placeholder:text-slate-400 focus:outline-hidden focus:border-[#FF5B00] focus:ring-1 focus:ring-[#FF5B00]/40 transition-all"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition-colors"
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="w-full bg-[#FF5B00] hover:bg-[#E04E00] disabled:opacity-60 text-white font-black text-[14px] py-3.5 px-6 rounded-2xl flex items-center justify-center space-x-2 active:scale-[0.98] shadow-[0_4px_14px_rgba(255,91,0,0.25)] transition-all mt-1 cursor-pointer"
                    >
                      <span>
                        {isProcessing
                          ? "Please wait…"
                          : authTab === "signup"
                          ? "Create account"
                          : "Sign in"}
                      </span>
                      {!isProcessing && <ArrowRight className="w-4 h-4 stroke-[3]" />}
                    </button>
                  </form>

                  {/* Divider */}
                  <div className="relative py-1 text-center">
                    <div className="absolute inset-0 flex items-center">
                      <div className="w-full border-t border-slate-200" />
                    </div>
                    <span className="relative bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Or continue with
                    </span>
                  </div>

                  {/* Social & 1-Tap Buttons */}
                  <div className="space-y-2 pb-4">
                    {/* Google Button */}
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isProcessing}
                      className="w-full bg-white hover:bg-slate-50 active:scale-[0.98] border border-slate-200 text-slate-800 font-extrabold text-[13px] py-3 px-4 rounded-2xl flex items-center justify-center space-x-2.5 transition-all shadow-2xs cursor-pointer"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      <span>Continue with Google</span>
                    </button>

                    {/* Truecaller 1-Tap Button */}
                    <button
                      type="button"
                      onClick={handleTruecallerLogin}
                      disabled={isProcessing}
                      className="w-full bg-[#0087FF]/10 hover:bg-[#0087FF]/15 active:scale-[0.98] border border-[#0087FF]/30 text-[#0087FF] font-extrabold text-[13px] py-3 px-4 rounded-2xl flex items-center justify-center space-x-2.5 transition-all cursor-pointer"
                    >
                      <Phone className="w-4 h-4 text-[#0087FF] shrink-0" />
                      <span>1-Tap Login via Truecaller</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* STEP 3: Complete Delivery Address Setup */}
      {step === 3 && (
        <div className="relative min-h-screen bg-[#061838] px-6 pt-12 pb-10 flex flex-col justify-between">
          <div className="max-w-sm mx-auto w-full space-y-6">
            <div className="text-center space-y-2">
              <div className="w-12 h-12 bg-white/[0.06] border border-white/10 rounded-2xl flex items-center justify-center mx-auto text-[#FF5B00]">
                <Home className="w-6 h-6" />
              </div>
              <h2 className="text-2xl font-black text-white">Delivery Address</h2>
              <p className="text-xs text-slate-400">
                Where should we deliver your 8-minute grocery orders in Anantnag?
              </p>
            </div>

            <div className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 pl-1 uppercase tracking-wider">
                  Contact Mobile
                </label>
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="9622720283"
                  className="w-full bg-white/[0.05] border border-white/10 text-white rounded-2xl py-3 px-4 text-xs font-semibold focus:outline-hidden focus:border-[#FF5B00]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-400 pl-1 uppercase tracking-wider">
                  House / Flat / Landmark
                </label>
                <input
                  type="text"
                  value={flatNo}
                  onChange={(e) => setFlatNo(e.target.value)}
                  placeholder="House #12, Near Petrol Pump"
                  className="w-full bg-white/[0.05] border border-white/10 text-white rounded-2xl py-3 px-4 text-xs font-semibold focus:outline-hidden focus:border-[#FF5B00]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 pl-1 uppercase tracking-wider">
                    Area
                  </label>
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="Nai Basti"
                    className="w-full bg-white/[0.05] border border-white/10 text-white rounded-2xl py-3 px-4 text-xs font-semibold focus:outline-hidden focus:border-[#FF5B00]"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-400 pl-1 uppercase tracking-wider">
                    City / Pincode
                  </label>
                  <input
                    type="text"
                    value={`${city} - ${pincode}`}
                    readOnly
                    className="w-full bg-white/[0.02] border border-white/5 text-slate-400 rounded-2xl py-3 px-4 text-xs font-semibold cursor-not-allowed"
                  />
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCompleteSetup}
              className="w-full bg-[#FF5B00] hover:bg-[#E04E00] text-white font-black text-xs py-4 rounded-2xl shadow-lg active:scale-95 transition-all flex items-center justify-center space-x-2"
            >
              <span>Save &amp; Start Shopping</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>

          <p className="text-[10px] text-slate-500 text-center">
            DASHit · Instant 8-Min Delivery in Anantnag
          </p>
        </div>
      )}
    </div>
  );
}
