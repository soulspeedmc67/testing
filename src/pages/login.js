import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { motion, useScroll, useTransform, useReducedMotion } from "framer-motion";
import {
  User,
  Home,
  Check,
  Eye,
  EyeOff,
  ArrowRight,
} from "lucide-react";

import {
  signInWithGoogle,
  signInWithTruecaller,
  signInWithEmail,
  signUpWithEmail,
} from "../lib/api";

export default function LoginPage() {
  const router = useRouter();

  // Attached zoom-out art: scale 1 -> 0.88, opacity 1 -> 0.55 across first ~300px of scroll
  const shouldReduceMotion = useReducedMotion();
  const { scrollY } = useScroll();
  const rawScale = useTransform(scrollY, [0, 300], [1, 0.88], { clamp: true });
  const rawOpacity = useTransform(scrollY, [0, 300], [1, 0.55], { clamp: true });
  const heroScale = shouldReduceMotion ? 1 : rawScale;
  const heroOpacity = shouldReduceMotion ? 1 : rawOpacity;

  // Step 1: Main Auth (Email/Password + Google & Truecaller), Step 3: Address & Profile Setup
  const [step, setStep] = useState(1);

  // Auth Modes & State. Defaults to "signup": most visitors on this screen are
  // new to the app, so account creation is the primary path, not the exception.
  const [authTab, setAuthTab] = useState("signup"); // "signin" | "signup"
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Email form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  // Hero illustration falls back to the brand mark if the asset is absent.
  const [heroFailed, setHeroFailed] = useState(false);
  const heroImgRef = useRef(null);

  /* The hero can finish loading (and fail) BEFORE React hydrates, in which case
     onError never fires and the broken alt text renders. Re-check on mount:
     a failed image reports complete === true with naturalWidth === 0. */
  useEffect(() => {
    const img = heroImgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setHeroFailed(true);
  }, []);

  // User Profile & Delivery Details
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

    // Invoke Truecaller native bottomsheet via deep link
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
              "Google popup did not return a session to the app. Please sign in instantly using Email & Password below.",
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
  // FINALIZE SETUP
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
    <div className="min-h-screen bg-[#061838] text-white font-sans flex flex-col justify-between overflow-x-hidden select-none relative">
      {/* STEP 1: Dual-tone Wavy Sign In / Sign Up Screen */}
      {step === 1 && (
        <div className="relative min-h-screen bg-white">
          {/*
            The artwork sits on a FIXED white layer behind the sheet. Because it
            never scrolls, scrolling moves only the dark panel — which rides up
            *over* the illustration like a card being drawn across it, instead of
            the whole page sliding away. The white ground matches the assets,
            which are composited on white.
          */}
          <div className="fixed inset-x-0 top-0 h-[50vh] bg-white z-0 flex flex-col px-6 pt-[max(14px,env(safe-area-inset-top,14px))]">
            <div className="flex items-center justify-between shrink-0">
              {/* Mark only — no wordmark. The logo carries the brand on its own. */}
              <img
                src="/dashit-app-icon.png"
                alt="Dashit"
                className="w-11 h-11 rounded-2xl shadow-[0_4px_14px_rgba(6,24,56,0.18)]"
              />
              <button
                type="button"
                onClick={handleSkipSetup}
                className="text-[11px] font-black text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-1.5 rounded-full transition-colors active:scale-95"
              >
                Skip for now
              </button>
            </div>

            {/* Brand slogan above the art */}
            <div className="text-center shrink-0 pt-1.5 pb-0.5 pointer-events-none">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-[#FF5B00] bg-orange-50/90 px-3 py-0.5 rounded-full border border-[#FF5B00]/25 shadow-[0_1px_4px_rgba(255,91,0,0.06)]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#FF5B00]" />
                Anantnag&apos;s 8-Minute Grocery Delivery
              </span>
            </div>

            {/* Attached zoom-out art: scale 1 -> 0.88, opacity 1 -> 0.55 as the sheet scrolls.
                pb-[6vh] centers the art in the exact 44vh visible above the sheet. */}
            <motion.div
              style={{ scale: heroScale, opacity: heroOpacity }}
              className="flex-1 min-h-0 flex items-center justify-center pb-[6vh] origin-center pointer-events-none select-none"
            >
              {heroFailed ? (
                /* Asset missing — fall back to the brand mark rather than a
                   broken-image glyph. Conditional render, not style mutation:
                   hiding via e.currentTarget.style left the alt text visible. */
                <img
                  src="/dashit-mark.png"
                  alt=""
                  aria-hidden="true"
                  className="w-24 h-24 object-contain opacity-90"
                />
              ) : (
                <img
                  ref={heroImgRef}
                  src="/art/rider-scooter-hero.png"
                  alt="Dashit rider delivering groceries"
                  onError={() => setHeroFailed(true)}
                  className="w-full max-w-[245px] max-h-full object-contain"
                />
              )}
            </motion.div>
          </div>

          {/* Scrolling sheet. The top margin exposes the art beneath; scrolling
              slides this panel up across it. */}
          <div className="relative z-10 mt-[44vh] rounded-t-[32px] bg-[#061838] border-t border-white/10 min-h-[66vh] px-6 pt-3 pb-10 shadow-[0_-16px_40px_rgba(6,24,56,0.36)] flex flex-col">
            {/* Grab-handle affordance to reinforce sheet overlaying the art */}
            <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-3.5" aria-hidden="true" />

            {/* Genuine 2-step progress for sign-up (auth → delivery details).
                Shown only when it is actually true — a decorative dot row on a
                single-step sign-in would be a fake affordance. */}
            {authTab === "signup" && (
              <div className="flex items-center justify-center space-x-1.5 mb-3" aria-label="Step 1 of 2">
                <span className="w-6 h-1.5 rounded-full bg-[#FF5B00] transition-all" />
                <span className="w-1.5 h-1.5 rounded-full bg-white/20" />
              </div>
            )}

            <div className="text-center mb-4">
              <h1 className="text-[22px] font-black text-white tracking-tight leading-tight">
                {authTab === "signup" ? "Create your account" : "Welcome back"}
              </h1>
              <p className="text-[12px] font-medium text-[#FFB067] mt-1.5 leading-snug max-w-[270px] mx-auto">
                {authTab === "signup"
                  ? "Fresh groceries at your door in 8 minutes, across Anantnag."
                  : "Sign in to pick up right where you left off."}
              </p>
            </div>

            <div className="relative z-10 max-w-sm mx-auto w-full space-y-3">
              {/* Segmented Sign Up / Sign In control — states are equally
                  visible here rather than hidden behind a corner toggle. */}
              <div className="grid grid-cols-2 gap-1 p-1 bg-white/[0.05] border border-white/10 rounded-2xl">
                {["signup", "signin"].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => {
                      setAuthTab(tab);
                      setErrorMessage("");
                    }}
                    className={`py-2.5 rounded-xl text-[12.5px] tracking-tight transition-all active:scale-[0.98] ${
                      authTab === tab
                        ? "bg-white text-[#061838] font-black shadow-sm"
                        : "text-slate-400 hover:text-white font-bold"
                    }`}
                  >
                    {tab === "signup" ? "Sign Up" : "Sign In"}
                  </button>
                ))}
              </div>

              {/* Error message pill */}
              {errorMessage && (
                <div className="bg-rose-950/80 border border-rose-500/50 text-rose-200 text-xs font-semibold p-3 rounded-2xl flex items-center space-x-2 animate-shake">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Form with Pill Inputs */}
              <form onSubmit={handleEmailAuth} className="space-y-3">
                {/* Full Name field (if Sign Up) */}
                {authTab === "signup" && (
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-400 pl-1 uppercase tracking-wider">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Azan Iqbal Mir"
                      className="w-full bg-white/[0.05] border border-white/10 text-white rounded-2xl py-2.5 px-4 text-[13px] placeholder:text-slate-500 focus:outline-none focus:border-[#FF5B00] focus:ring-1 focus:ring-[#FF5B00]/40 focus:bg-white/[0.08] transition-all"
                    />
                  </div>
                )}

                {/* Email Input */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-400 pl-1 uppercase tracking-wider">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-white/[0.05] border border-white/10 text-white rounded-2xl py-2.5 px-4 text-[13px] placeholder:text-slate-500 focus:outline-none focus:border-[#FF5B00] focus:ring-1 focus:ring-[#FF5B00]/40 focus:bg-white/[0.08] transition-all"
                  />
                </div>

                {/* Password Input */}
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-400 pl-1 uppercase tracking-wider">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={authTab === "signup" ? "Create password (min 6 chars)" : "••••••••••••"}
                      className="w-full bg-white/[0.05] border border-white/10 text-white rounded-2xl py-2.5 pl-4 pr-12 text-[13px] placeholder:text-slate-500 focus:outline-none focus:border-[#FF5B00] focus:ring-1 focus:ring-[#FF5B00]/40 focus:bg-white/[0.08] transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white transition-colors"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Primary action — flat brand orange, no gradient or glow */}
                <div className="pt-1.5">
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full bg-[#FF5B00] hover:bg-[#E04E00] disabled:opacity-60 text-white font-black text-[13.5px] py-3.5 px-6 rounded-2xl flex items-center justify-center space-x-2 active:scale-[0.98] shadow-[0_4px_16px_rgba(255,91,0,0.25)] transition-all"
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
                </div>
              </form>

              {/* Alternate 1-tap sign-in. Labelled full-width rows rather than
                  bare circles — an unlabelled icon is a guess, not an action. */}
              <div className="pt-3.5 space-y-3">
                <div className="flex items-center space-x-3">
                  <span className="h-px flex-1 bg-white/10" />
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">or continue with</span>
                  <span className="h-px flex-1 bg-white/10" />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Google */}
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isProcessing}
                    className="flex items-center justify-center space-x-2 bg-white/[0.05] hover:bg-white/[0.09] active:bg-white/[0.12] border border-white/10 py-2.5 rounded-2xl text-[12.5px] font-bold text-white active:scale-[0.97] transition-all disabled:opacity-60 shadow-sm"
                    title="Continue with Google"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                    <span>Google</span>
                  </button>

                  {/* Truecaller */}
                  <button
                    type="button"
                    onClick={handleTruecallerLogin}
                    disabled={isProcessing}
                    className="flex items-center justify-center space-x-2 bg-white/[0.05] hover:bg-white/[0.09] active:bg-white/[0.12] border border-white/10 py-2.5 rounded-2xl text-[12.5px] font-bold text-white active:scale-[0.97] transition-all disabled:opacity-60 shadow-sm"
                    title="1-tap login with Truecaller"
                  >
                    <svg className="w-4 h-4 fill-[#0087FF]" viewBox="0 0 24 24">
                      <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-2.2 2.2a15.05 15.05 0 01-6.59-6.59l2.2-2.21a.96.96 0 00.25-1.01A11.36 11.36 0 018.57 3.9c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.52c0-.55-.45-1-1-1z" />
                    </svg>
                    <span>Truecaller</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Terms */}
            <div className="relative z-10 pt-5 text-center">
              <p className="text-[11px] text-slate-400 font-medium">
                By continuing, you agree to our{" "}
                <a href="#" className="underline underline-offset-2 text-slate-300 font-bold hover:text-white transition-colors">
                  Terms
                </a>{" "}
                &{" "}
                <a href="#" className="underline underline-offset-2 text-slate-300 font-bold hover:text-white transition-colors">
                  Privacy Policy
                </a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: Quick Doorstep Delivery Details (Skippable) */}
      {step === 3 && (
        <div className="flex-1 flex flex-col justify-center px-5 py-8 max-w-md mx-auto w-full">
          <div className="bg-white/[0.05] border border-white/10 rounded-3xl p-6 md:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="font-black text-lg text-white">Delivery Details</h3>
                <p className="text-xs text-slate-400 font-medium">
                  Where should our scooter rider deliver?
                </p>
              </div>
              <button
                onClick={handleSkipSetup}
                className="text-xs font-bold text-slate-400 hover:text-white underline"
              >
                Skip
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Full Name
                </label>
                <div className="flex items-center bg-white/[0.06] border border-white/10 rounded-2xl px-3.5 py-3 focus-within:border-[#FF5B00]/60 transition-colors">
                  <User className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Azan Iqbal Mir"
                    className="bg-transparent font-semibold text-white w-full focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  Mobile Number (For scooter rider to call you)
                </label>
                <div className="flex items-center bg-white/[0.06] border border-white/10 rounded-2xl px-3.5 py-3 focus-within:border-[#FF5B00]/60 transition-colors">
                  <span className="text-xs font-bold text-slate-400 mr-2 border-r border-slate-700 pr-2">+91</span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    placeholder="9622720283"
                    className="bg-transparent font-semibold text-white w-full focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  House / Flat / Landmark
                </label>
                <div className="flex items-center bg-white/[0.06] border border-white/10 rounded-2xl px-3.5 py-3 focus-within:border-[#FF5B00]/60 transition-colors">
                  <Home className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                  <input
                    type="text"
                    value={flatNo}
                    onChange={(e) => setFlatNo(e.target.value)}
                    placeholder="e.g. House #12, Near Petrol Pump"
                    className="bg-transparent font-semibold text-white w-full focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    Area / Locality
                  </label>
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. Nai Basti"
                    className="w-full bg-white/[0.06] border border-white/10 font-semibold p-3 rounded-2xl text-white focus:outline-none focus:border-[#FF5B00]/60 transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                    City & Pincode
                  </label>
                  <input
                    type="text"
                    value={`${city} - ${pincode}`}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Anantnag - 192101"
                    className="w-full bg-white/[0.06] border border-white/10 font-semibold p-3 rounded-2xl text-white focus:outline-none focus:border-[#FF5B00]/60 transition-colors"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex space-x-3">
              <button
                onClick={handleSkipSetup}
                className="w-1/3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs py-3.5 rounded-full transition-all"
              >
                Skip
              </button>
              <button
                onClick={handleCompleteSetup}
                className="w-2/3 bg-[#FF5B00] hover:bg-[#E04E00] text-white font-extrabold text-xs py-3.5 rounded-full shadow-md transition-all active:scale-[0.98] flex items-center justify-center space-x-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Start Shopping</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
