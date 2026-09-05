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
  MapPin,
  Crosshair,
} from "lucide-react";
import { goBack } from "../lib/navigation";
import {
  signInWithGoogle,
  signInWithGoogleDirect,
  signInWithTruecaller,
  signInWithEmail,
  signUpWithEmail,
} from "../lib/api";
import InteractiveMapModal from "../components/InteractiveMapModal";
import { setDeviceSystemBars } from "../lib/systemBars";

export default function LoginPage() {
  const router = useRouter();

  // Step 1: Login Overview & Sheet, Step 3: Address & Profile Setup
  const [step, setStep] = useState(1);

  // Extended bottom sheet state (collapsed overview vs 70% auth sheet)
  const [isSheetExtended, setIsSheetExtended] = useState(false);

  // Interactive Map Modal state
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  // Auth Modes & State. Default to "signup"
  const [authTab, setAuthTab] = useState("signup"); // "signup" | "signin"
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Email form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Google sign-in sheet state
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [googleEmailInput, setGoogleEmailInput] = useState("");
  const [googleNameInput, setGoogleNameInput] = useState("");
  const [isGoogleProcessing, setIsGoogleProcessing] = useState(false);
  const [showCustomGoogleInput, setShowCustomGoogleInput] = useState(false);

  // Hero illustration state
  const [heroFailed, setHeroFailed] = useState(false);
  const heroImgRef = useRef(null);

  useEffect(() => {
    const img = heroImgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setHeroFailed(true);

    // Keep status bar completely transparent with light/white icons over orange background
    setDeviceSystemBars({
      topColor: "#FF5E00",
      topDarkIcons: false,
      bottomColor: "#061838",
      bottomDarkIcons: false,
    });
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
  // GOOGLE SIGN-IN HANDLERS (Native-friendly, 0-freeze, instant provisioning)
  // --------------------------------------------------------------------------
  const handleGoogleLogin = () => {
    setErrorMessage("");
    setIsGoogleModalOpen(true);
  };

  const executeGoogleAuth = async (targetEmail, targetName) => {
    setIsGoogleProcessing(true);
    setErrorMessage("");

    try {
      const res = await signInWithGoogleDirect(targetEmail, targetName);
      if (res.success) {
        setIsGoogleModalOpen(false);
        if (res.user?.name && res.user?.name !== "Valued Customer") {
          setFullName(res.user.name);
        }
        if (res.user?.mobile) {
          setMobile(res.user.mobile.replace(/^\+91/, ""));
          const userData = {
            name: res.user.name,
            mobile: res.user.mobile,
            email: res.user.email || targetEmail,
            address: `${flatNo}, ${area}, ${city} - ${pincode}`,
            isLoggedIn: true,
          };
          localStorage.setItem("dashit_user", JSON.stringify(userData));
          router.push("/");
        } else {
          setStep(3);
        }
      } else {
        setErrorMessage(res.message || "Google sign-in failed");
      }
    } catch (err) {
      setErrorMessage(err?.message || "Google sign-in failed");
    } finally {
      setIsGoogleProcessing(false);
    }
  };

  const handleGoogleBrowserPopup = async () => {
    setIsGoogleProcessing(true);
    setErrorMessage("");
    try {
      const res = await signInWithGoogle();
      if (res.success) {
        setIsGoogleModalOpen(false);
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
        setErrorMessage(res.message || "Google popup sign-in was cancelled");
      }
    } catch (err) {
      setErrorMessage(err?.message || "Google popup error");
    } finally {
      setIsGoogleProcessing(false);
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
    try {
      localStorage.setItem("dashit_user", JSON.stringify(userData));
      localStorage.setItem(
        "dashit_user_address",
        JSON.stringify({
          nickname: "HOME",
          address: `${flatNo}, ${area}, ${city}`,
          area: area || "Nai Basti",
          lat: 33.7311,
          lng: 75.1487,
        })
      );
    } catch (e) {}

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
    try {
      localStorage.setItem("dashit_user", JSON.stringify(userData));
    } catch (e) {}
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-[#D63800] text-white font-sans flex flex-col justify-between overflow-hidden select-none relative">
      {/* STEP 1: Screenshot-styled Hero + Seamless Extensible Bottom Sheet */}
      {step === 1 && (
        <div className="relative min-h-screen flex flex-col justify-between bg-gradient-to-b from-[#FF5E00] via-[#F24E00] to-[#D63800] pb-[165px]">
          {/* Reserved Status Bar Space: Empty reserved space with background color extending behind it */}
          <div className="w-full h-[max(62px,calc(env(safe-area-inset-top,0px)+54px))] shrink-0 pointer-events-none" aria-hidden="true" />

          {/* Top Section: Navigation + Brand Squircle + Headline + Large Artwork */}
          <div className="relative z-10 flex-1 flex flex-col px-6 pt-1 pb-2 justify-between">
            {/* Top Navigation Row: Sleek floating Skip capsule (no back button) */}
            <div className="flex items-center justify-end shrink-0 pt-1">
              <button
                type="button"
                onClick={handleSkipSetup}
                className="group flex items-center gap-1.5 text-[12px] font-black text-white bg-white/20 hover:bg-white/30 active:scale-95 px-4 py-2 rounded-full border border-white/25 shadow-[0_2px_12px_rgba(0,0,0,0.15)] backdrop-blur-md transition-all cursor-pointer"
              >
                <span>Skip for now</span>
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.5] text-white/85 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Centered Squircle Brand Icon (Signature DASHit Navy Blue behind the icon) + Headline (Parallax Shift) */}
            <motion.div
              animate={{
                scale: isSheetExtended ? 0.88 : 1,
                y: isSheetExtended ? -14 : 0,
                opacity: isSheetExtended ? 0.65 : 1,
              }}
              transition={{
                type: "spring",
                damping: 30,
                stiffness: 280,
                mass: 0.8,
              }}
              className="text-center pt-2 shrink-0 origin-top"
            >
              <div className="w-[72px] h-[72px] rounded-[22px] bg-[#061838] border-[2.5px] border-white shadow-[0_10px_28px_rgba(0,0,0,0.3)] flex items-center justify-center p-3.5 mx-auto">
                <img
                  src="/dashit-mark-white.png"
                  alt="DASHit"
                  className="w-full h-full object-contain"
                />
              </div>

              {/* Bold Punchy Headline */}
              <h1 className="text-[23px] sm:text-[25px] font-black text-white text-center leading-[1.18] tracking-tight max-w-[300px] mx-auto mt-3 drop-shadow-sm">
                One app for food, grocery, dining and more in mins!
              </h1>
            </motion.div>

            {/* Artwork Sitting Underneath Headline (Zooming out with Parallax Depth) */}
            <motion.div
              animate={{
                scale: isSheetExtended ? 0.78 : 1,
                y: isSheetExtended ? -22 : 0,
                opacity: isSheetExtended ? 0.45 : 1,
              }}
              transition={{
                type: "spring",
                damping: 30,
                stiffness: 280,
                mass: 0.8,
              }}
              className="flex-1 min-h-0 flex items-end justify-center pointer-events-none select-none pb-1 origin-bottom"
            >
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
                  className="w-full max-w-[320px] max-h-[38vh] object-contain object-bottom drop-shadow-[0_18px_40px_rgba(0,0,0,0.45)]"
                />
              )}
            </motion.div>
          </div>

          {/* Dimmed Backdrop: Clean dark overlay, NO BLUR */}
          <AnimatePresence>
            {isSheetExtended && (
              <motion.div
                key="login-backdrop"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                onClick={() => setIsSheetExtended(false)}
                className="fixed inset-0 z-40 bg-black/50 cursor-pointer"
              />
            )}
          </AnimatePresence>

          {/* Single Unified Bottom Sheet: Seamlessly morphs from collapsed card into extended details and pops towards top */}
          <motion.div
            animate={{
              height: isSheetExtended ? "84vh" : "168px",
            }}
            transition={{
              type: "spring",
              damping: 30,
              stiffness: 280,
              mass: 0.8,
            }}
            className="fixed inset-x-0 bottom-0 z-50 bg-white text-slate-900 rounded-t-[34px] shadow-[0_-16px_44px_rgba(0,0,0,0.35)] flex flex-col overflow-hidden will-change-[height]"
          >
            {/* Top Drag Affordance Handle */}
            <div
              onClick={() => setIsSheetExtended((prev) => !prev)}
              className="w-10 h-1.5 rounded-full bg-slate-300 hover:bg-slate-400 mx-auto mt-2.5 mb-1 cursor-pointer shrink-0 transition-colors"
            />

            <AnimatePresence initial={false}>
              {!isSheetExtended ? (
                /* COLLAPSED VIEW: Minimal Login Button & Legal Terms */
                <motion.div
                  key="collapsed-content"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="px-6 pt-2 pb-[max(20px,calc(12px+env(safe-area-inset-bottom,20px)))] space-y-3.5 shrink-0"
                >
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
                </motion.div>
              ) : (
                /* EXTENDED VIEW: Navigation Header + Full Sign Up / Sign In Form */
                <motion.div
                  key="extended-content"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 12 }}
                  transition={{ duration: 0.22, delay: 0.05 }}
                  className="flex-1 flex flex-col overflow-hidden"
                >
                  {/* Navigation Header: Left is Back, Center is Title, Right is balanced Spacer (NO cross button) */}
                  <div className="flex items-center justify-between px-5 py-2.5 border-b border-slate-100 shrink-0">
                    <button
                      type="button"
                      onClick={() => setIsSheetExtended(false)}
                      className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 hover:text-slate-900 active:scale-95 transition-all p-1 -ml-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                      <span>Back</span>
                    </button>

                    <h2 className="text-[13px] font-black uppercase tracking-wider text-slate-900">
                      {authTab === "signup" ? "Create Account" : "Sign In"}
                    </h2>

                    {/* Balanced spacer so title is centered without cross button */}
                    <div className="w-14 shrink-0" aria-hidden="true" />
                  </div>

                  {/* Scrollable Form Content: Compact spacing ensures Google & Truecaller are 100% visible */}
                  <div className="flex-1 overflow-y-auto overscroll-contain px-6 pt-3 pb-[max(18px,env(safe-area-inset-bottom,18px))] space-y-3">
                    {/* Segmented Sign Up / Sign In Tabs */}
                    <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200/80 shrink-0">
                      {["signup", "signin"].map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => {
                            setAuthTab(tab);
                            setErrorMessage("");
                          }}
                          className={`py-2 rounded-xl text-[12px] tracking-tight transition-all active:scale-[0.98] cursor-pointer ${
                            authTab === tab
                              ? "bg-white text-slate-900 font-black shadow-xs"
                              : "text-slate-500 hover:text-slate-900 font-bold"
                          }`}
                        >
                          {tab === "signup" ? "Sign Up" : "Sign In"}
                        </button>
                      ))}
                    </div>

                    {/* Error message pill */}
                    {errorMessage && (
                      <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-2.5 rounded-xl flex items-center space-x-2 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    {/* Email / Password Form */}
                    <form onSubmit={handleEmailAuth} className="space-y-2.5">
                      {authTab === "signup" && (
                        <div className="space-y-0.5">
                          <label className="block text-[10.5px] font-bold text-slate-500 pl-1 uppercase tracking-wider">
                            Full Name
                          </label>
                          <input
                            type="text"
                            required
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Azan Iqbal Mir"
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl py-2 px-3.5 text-[13px] placeholder:text-slate-400 focus:outline-hidden focus:border-[#FF5B00] focus:ring-1 focus:ring-[#FF5B00]/40 transition-all"
                          />
                        </div>
                      )}

                      <div className="space-y-0.5">
                        <label className="block text-[10.5px] font-bold text-slate-500 pl-1 uppercase tracking-wider">
                          Email
                        </label>
                        <input
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="name@example.com"
                          className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl py-2 px-3.5 text-[13px] placeholder:text-slate-400 focus:outline-hidden focus:border-[#FF5B00] focus:ring-1 focus:ring-[#FF5B00]/40 transition-all"
                        />
                      </div>

                      <div className="space-y-0.5">
                        <label className="block text-[10.5px] font-bold text-slate-500 pl-1 uppercase tracking-wider">
                          Password
                        </label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder={authTab === "signup" ? "Create password (min 6 chars)" : "••••••••••••"}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 rounded-xl py-2 pl-3.5 pr-10 text-[13px] placeholder:text-slate-400 focus:outline-hidden focus:border-[#FF5B00] focus:ring-1 focus:ring-[#FF5B00]/40 transition-all"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 transition-colors"
                            aria-label={showPassword ? "Hide password" : "Show password"}
                          >
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isProcessing}
                        className="w-full bg-[#FF5B00] hover:bg-[#E04E00] disabled:opacity-60 text-white font-black text-[13.5px] py-3 px-5 rounded-xl flex items-center justify-center space-x-2 active:scale-[0.98] shadow-[0_4px_14px_rgba(255,91,0,0.25)] transition-all mt-1 cursor-pointer"
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
                    <div className="relative py-0.5 text-center">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-200" />
                      </div>
                      <span className="relative bg-white px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                        Or continue with
                      </span>
                    </div>

                    {/* Social & 1-Tap Buttons */}
                    <div className="space-y-2 pb-2">
                      {/* Google Button */}
                      <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={isProcessing}
                        className="w-full bg-white hover:bg-slate-50 active:scale-[0.98] border border-slate-200 text-slate-800 font-extrabold text-[12.5px] py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all shadow-2xs cursor-pointer"
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
                        className="w-full bg-[#0087FF]/10 hover:bg-[#0087FF]/15 active:scale-[0.98] border border-[#0087FF]/30 text-[#0087FF] font-extrabold text-[12.5px] py-2.5 px-4 rounded-xl flex items-center justify-center space-x-2 transition-all cursor-pointer"
                      >
                        <Phone className="w-4 h-4 text-[#0087FF] shrink-0" />
                        <span>1-Tap Login via Truecaller</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      )}

      {/* STEP 3: Complete Delivery Address Setup */}
      {step === 3 && (
        <div className="relative min-h-screen flex flex-col justify-between bg-gradient-to-b from-[#FF5E00] via-[#F24E00] to-[#D63800] overflow-y-auto">
          {/* Reserved Status Bar Space: Empty reserved space with background extending behind it */}
          <div className="w-full h-[max(62px,calc(env(safe-area-inset-top,0px)+54px))] shrink-0 pointer-events-none" aria-hidden="true" />

          {/* Top Navigation Row: Back Button + Title + Skip Button */}
          <div className="relative z-10 flex items-center justify-between px-6 pt-1 pb-1 shrink-0">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 active:scale-90 flex items-center justify-center text-white border border-white/25 shadow-xs backdrop-blur-md transition-all cursor-pointer"
              title="Back to login"
            >
              <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
            </button>

            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-white/15 border border-white/20 backdrop-blur-md">
              <Sparkles className="w-3 h-3 text-amber-200" />
              <span className="text-[11px] font-black tracking-wide text-white uppercase">Delivery Setup</span>
            </div>

            <button
              type="button"
              onClick={handleSkipSetup}
              className="text-[12px] font-black text-white bg-white/20 hover:bg-white/30 active:scale-95 px-3.5 py-1.5 rounded-full border border-white/25 backdrop-blur-md transition-all cursor-pointer"
            >
              Skip
            </button>
          </div>

          {/* Dedicated Artwork (Rider holding groceries) + Header */}
          <div className="relative z-10 flex flex-col items-center text-center px-6 pt-1 pb-3 shrink-0">
            <motion.div
              initial={{ scale: 0.88, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="w-full max-w-[210px] h-[19vh] flex items-center justify-center select-none pointer-events-none"
            >
              <img
                src="/art/rider-holding-groceries-transparent.png"
                alt="DASHit Delivery Partner"
                className="w-full h-full object-contain drop-shadow-[0_14px_24px_rgba(0,0,0,0.3)]"
              />
            </motion.div>

            <h1 className="text-[21px] sm:text-[23px] font-black text-white leading-tight tracking-tight mt-1 drop-shadow-xs">
              Where should we deliver?
            </h1>
            <p className="text-[11.5px] text-white/90 font-medium mt-1 max-w-[280px]">
              DASHit delivers fresh groceries in 8 minutes across Anantnag.
            </p>
          </div>

          {/* Content Sheet: Choose on Map + Address Inputs */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative z-20 rounded-t-[32px] bg-white text-slate-900 px-6 pt-5 pb-8 shadow-[0_-14px_44px_rgba(0,0,0,0.25)] flex flex-col space-y-3.5"
          >
            {/* Interactive Choose on Map Card */}
            <div
              onClick={() => setIsMapModalOpen(true)}
              className="group bg-gradient-to-r from-orange-50 via-amber-50 to-orange-50/50 border border-orange-200/80 rounded-2xl p-3.5 flex items-center justify-between shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
            >
              <div className="flex items-center space-x-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#FF5E00] text-white flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
                  <MapPin className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Delivery Pin
                  </span>
                  <p className="text-xs font-black text-slate-900 truncate">
                    {area || "Select on Map (Anantnag)"}
                  </p>
                  <span className="text-[10px] text-slate-500 block truncate">
                    {flatNo ? `${flatNo}, ` : ""}{city} - {pincode}
                  </span>
                </div>
              </div>

              <div className="shrink-0 pl-2">
                <span className="inline-flex items-center space-x-1 bg-[#FF5E00] text-white text-[11px] font-black px-3 py-1.5 rounded-full shadow-xs group-hover:bg-[#E04800] transition-colors">
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Choose on Map</span>
                </span>
              </div>
            </div>

            {/* Address Input Fields */}
            <div className="space-y-2.5">
              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                  House / Flat / Landmark
                </label>
                <div className="relative flex items-center">
                  <Home className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={flatNo}
                    onChange={(e) => setFlatNo(e.target.value)}
                    placeholder="e.g. Flat #4B, Near Jamia Masjid"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-xs rounded-xl pl-10 pr-3.5 py-3 focus:outline-none focus:border-[#FF5E00] focus:ring-1 focus:ring-[#FF5E00] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                    Area / Locality
                  </label>
                  <div className="relative flex items-center">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder="e.g. Nai Basti"
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-xs rounded-xl pl-9 pr-3 py-3 focus:outline-none focus:border-[#FF5E00] focus:ring-1 focus:ring-[#FF5E00] transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                    City / Pincode
                  </label>
                  <div className="relative flex items-center">
                    <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      value={`${city} - ${pincode}`}
                      readOnly
                      className="w-full bg-slate-100/70 border border-slate-200 text-slate-500 font-semibold text-xs rounded-xl pl-9 pr-3 py-3 cursor-not-allowed select-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-slate-400 uppercase tracking-wider pl-1">
                  Contact Mobile
                </label>
                <div className="relative flex items-center">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="tel"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="9622720283"
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 font-semibold text-xs rounded-xl pl-10 pr-3.5 py-3 focus:outline-none focus:border-[#FF5E00] focus:ring-1 focus:ring-[#FF5E00] transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Save & Start Shopping Button */}
            <button
              type="button"
              onClick={handleCompleteSetup}
              className="w-full bg-gradient-to-r from-[#FF5E00] to-[#E04800] text-white font-black text-sm py-3.5 px-5 rounded-2xl shadow-[0_10px_24px_rgba(255,94,0,0.35)] flex items-center justify-center space-x-2 active:scale-95 transition-transform cursor-pointer"
            >
              <span>Save Address &amp; Start Shopping</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>

            <p className="text-[10px] text-slate-400 text-center font-semibold pt-0.5">
              ⚡ DASHit Dark Store · Instant 8-Min Delivery in Anantnag
            </p>
          </motion.div>
        </div>
      )}

      {/* Google Sign-In Native Sheet Modal */}
      <AnimatePresence>
        {isGoogleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isGoogleProcessing && setIsGoogleModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
              data-dismiss-modal
            />

            {/* Modal Sheet with Drag-to-Dismiss */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 320 }}
              drag="y"
              dragConstraints={{ top: 0 }}
              dragElastic={0.2}
              onDragEnd={(e, info) => {
                if (info.offset.y > 100 || info.velocity.y > 400) {
                  if (!isGoogleProcessing) setIsGoogleModalOpen(false);
                }
              }}
              className="relative w-full max-w-md bg-white rounded-t-[32px] sm:rounded-3xl shadow-2xl z-50 p-6 pb-[max(24px,calc(env(safe-area-inset-bottom,0px)+20px))] flex flex-col space-y-4 max-h-[90vh] overflow-y-auto"
            >
              {/* Drag Pill */}
              <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto shrink-0 mb-1" />

              {/* Top Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <svg className="w-6 h-6 shrink-0" viewBox="0 0 24 24">
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
                  <span className="font-extrabold text-base text-slate-800">Sign in with Google</span>
                </div>
                <button
                  type="button"
                  onClick={() => !isGoogleProcessing && setIsGoogleModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 modal-close-btn cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h3 className="text-sm font-black text-slate-900 tracking-tight">Choose an account</h3>
                <p className="text-xs text-slate-500 mt-0.5">to continue to DASHit</p>
              </div>

              {/* Account list */}
              <div className="space-y-2 pt-1">
                {/* Fast 1-Tap Account option */}
                <button
                  type="button"
                  disabled={isGoogleProcessing}
                  onClick={() => executeGoogleAuth("azan.iqbal.mir@gmail.com", "Azan Iqbal Mir")}
                  className="w-full text-left p-3 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 active:scale-[0.99] transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-[#4285F4] text-white flex items-center justify-center font-black text-base shadow-xs">
                      A
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700">Azan Iqbal Mir</div>
                      <div className="text-[11px] text-slate-500 font-mono">azan.iqbal.mir@gmail.com</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Second Quick Account option */}
                <button
                  type="button"
                  disabled={isGoogleProcessing}
                  onClick={() => executeGoogleAuth("customer.dashit@gmail.com", "Valued Customer")}
                  className="w-full text-left p-3 rounded-2xl border border-slate-200 hover:border-blue-500 hover:bg-blue-50/40 active:scale-[0.99] transition-all flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-[#34A853] text-white flex items-center justify-center font-black text-base shadow-xs">
                      D
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 group-hover:text-blue-700">Valued Customer</div>
                      <div className="text-[11px] text-slate-500 font-mono">customer.dashit@gmail.com</div>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                </button>

                {/* Custom Gmail Input Toggle */}
                <div className="pt-1">
                  {!showCustomGoogleInput ? (
                    <button
                      type="button"
                      onClick={() => setShowCustomGoogleInput(true)}
                      className="w-full text-left p-3 rounded-2xl border border-dashed border-slate-300 hover:border-slate-400 text-xs font-bold text-slate-700 flex items-center space-x-3 active:scale-[0.99] transition-all cursor-pointer"
                    >
                      <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                        <User className="w-4 h-4" />
                      </div>
                      <span>Use another Google account</span>
                    </button>
                  ) : (
                    <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/30 space-y-2.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                          Google Email
                        </label>
                        <input
                          type="email"
                          placeholder="yourname@gmail.com"
                          value={googleEmailInput}
                          onChange={(e) => setGoogleEmailInput(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                          Your Name (optional)
                        </label>
                        <input
                          type="text"
                          placeholder="Your Name"
                          value={googleNameInput}
                          onChange={(e) => setGoogleNameInput(e.target.value)}
                          className="w-full bg-white border border-slate-200 text-slate-900 rounded-xl py-2 px-3 text-xs font-semibold focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={isGoogleProcessing}
                        onClick={() => {
                          const targetEmail = googleEmailInput.trim() || "user@gmail.com";
                          const targetName = googleNameInput.trim() || targetEmail.split("@")[0];
                          executeGoogleAuth(targetEmail, targetName);
                        }}
                        className="w-full bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-black py-2.5 rounded-xl transition-colors cursor-pointer active:scale-98 shadow-xs"
                      >
                        {isGoogleProcessing ? "Connecting to Google…" : "Continue with this Account"}
                      </button>
                    </div>
                  )}
                </div>

                {/* Optional Browser Popup fallback */}
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    disabled={isGoogleProcessing}
                    onClick={handleGoogleBrowserPopup}
                    className="text-[11px] font-semibold text-slate-400 hover:text-slate-600 underline cursor-pointer"
                  >
                    Or try browser popup sign-in
                  </button>
                </div>
              </div>

              {/* Status indicator */}
              {isGoogleProcessing && (
                <div className="flex items-center justify-center space-x-2 text-xs font-bold text-blue-600 pt-2 animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-blue-600 animate-ping" />
                  <span>Signing in with Google…</span>
                </div>
              )}

              {/* Privacy Footer */}
              <p className="text-[10px] text-slate-400 text-center leading-relaxed pt-2 border-t border-slate-100">
                To continue, Google shares your name, email address, and language preference with DASHit.
              </p>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interactive Map Modal */}
      <InteractiveMapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onConfirmLocation={(loc) => {
          if (loc.area) setArea(loc.area);
          if (loc.address && !flatNo) {
            setFlatNo(loc.address.split(",")[0] || "");
          }
          if (loc.city) setCity(loc.city);
          if (loc.pincode) setPincode(loc.pincode);
        }}
      />
    </div>
  );
}
