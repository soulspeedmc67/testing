import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import {
  X,
  MapPin,
  User,
  Phone,
  Home,
  Check,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import LoginProductMarquee from "../components/LoginProductMarquee";

import {
  sendOtp,
  verifyOtp,
  signInWithGoogle,
  signInWithTruecaller,
  signInWithEmail,
  signUpWithEmail,
} from "../lib/api";

export default function LoginPage() {
  const router = useRouter();

  // Step 1: Main Auth (Google & Email), Step 2: Phone OTP (if requested), Step 3: Address & Profile Setup (Skippable)
  const [step, setStep] = useState(1);

  // Auth Modes & State
  const [authTab, setAuthTab] = useState("signin"); // "signin" | "signup"
  const [showPhoneLogin, setShowPhoneLogin] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Email form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Phone & OTP state
  const [mobile, setMobile] = useState("9622720283");
  const [otpInput, setOtpInput] = useState("");
  const [issuedOtp, setIssuedOtp] = useState("");

  // User Profile & Delivery Details
  const [fullName, setFullName] = useState("Azan Iqbal Mir");
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

    // Safety timeout: on Android WebViews, browser popups cannot postMessage
    // back across separate OS processes. Race against a timeout so the UI never hangs.
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
          // If customer has no mobile on file, ask on Step 3 for delivery scooter rider
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
          // Prompt for delivery phone number & doorstep location
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
  // PHONE OTP HANDLERS
  // --------------------------------------------------------------------------
  const handleSendOtp = async (e) => {
    e.preventDefault();
    if (mobile.length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number");
      return;
    }
    setIsProcessing(true);
    setErrorMessage("");
    const res = await sendOtp(mobile);
    setIsProcessing(false);
    setIssuedOtp(res?.devOtp || "");
    setOtpInput("");
    setStep(2);
  };

  const handleVerifyOtp = async () => {
    setIsProcessing(true);
    setErrorMessage("");
    const res = await verifyOtp(mobile, otpInput);
    setIsProcessing(false);
    if (res.success) {
      if (res.user?.name && res.user?.name !== "Valued Customer") {
        setFullName(res.user.name);
      }
      setStep(3);
    } else {
      setErrorMessage(res?.message || "Incorrect verification code");
    }
  };

  const handleResendOtp = async () => {
    const res = await sendOtp(mobile);
    setIssuedOtp(res?.devOtp || "");
    setOtpInput("");
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
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-50 text-slate-900 font-sans flex flex-col justify-between overflow-x-hidden select-none">
      {/* Top Ambient Marquee & Header */}
      <div className="relative pt-4 pb-2">
        {/* Skip Pill Button */}
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={handleSkipSetup}
            className="bg-white/95 hover:bg-white text-slate-600 hover:text-slate-900 text-xs font-bold px-3.5 py-1.5 rounded-full shadow-sm border border-slate-200/80 transition-all active:scale-95"
          >
            Skip
          </button>
        </div>

        {/* Live Product Stream */}
        <LoginProductMarquee />
      </div>

      {/* Main Elevated Card Container */}
      <div className="w-full max-w-md mx-auto px-4 pb-6">
        <div className="bg-white rounded-[32px] shadow-2xl border border-slate-200/80 p-6 md:p-7 space-y-5 animate-slide-up">
          {/* STEP 1: Minimalist Google, Truecaller & Email Auth */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Brand Wordmark */}
              <div className="text-center space-y-1.5">
                <div className="inline-flex items-center space-x-1.5 bg-[#061838] text-white px-4 py-1.5 rounded-2xl shadow-sm mb-1">
                  <span className="font-logo font-black text-lg tracking-tight text-[#FF5B00]">DASH</span>
                  <span className="font-logo font-black text-lg tracking-tight text-[#0284c7]">it</span>
                  <span className="text-[10px] uppercase font-bold tracking-widest bg-white/10 px-2 py-0.5 rounded-lg text-slate-300 ml-1">
                    10-min
                  </span>
                </div>
                <h1 className="text-xl font-black text-slate-900 tracking-tight">
                  India's last minute app
                </h1>
                <p className="text-xs text-slate-500 font-medium">
                  Fresh groceries & essentials delivered to your door
                </p>
              </div>

              {/* Error Message Pill */}
              {errorMessage && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-3 rounded-2xl flex items-center space-x-2 animate-shake">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* 1-Tap Providers: Truecaller & Google */}
              <div className="space-y-2.5">
                {/* Truecaller 1-Tap Verification */}
                <button
                  type="button"
                  onClick={handleTruecallerLogin}
                  disabled={isProcessing}
                  className="w-full bg-[#0087FF] hover:bg-[#0077e6] text-white font-bold text-xs py-3 px-4 rounded-2xl shadow-sm hover:shadow transition-all active:scale-[0.98] flex items-center justify-center space-x-2.5"
                >
                  <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
                    <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-2.2 2.2a15.05 15.05 0 01-6.59-6.59l2.2-2.21a.96.96 0 00.25-1.01A11.36 11.36 0 018.57 3.9c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.52c0-.55-.45-1-1-1z" />
                  </svg>
                  <span>1-Tap Login with Truecaller</span>
                </button>

                {/* Primary 1-Tap Google Button */}
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isProcessing}
                  className="w-full bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 font-bold text-xs py-3 px-4 rounded-2xl shadow-sm hover:shadow transition-all active:scale-[0.98] flex items-center justify-center space-x-3"
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
                  <span>{isProcessing ? "Connecting to Google..." : "Continue with Google"}</span>
                </button>
              </div>

              {/* Minimal Divider */}
              <div className="relative flex items-center justify-center my-3">
                <div className="border-t border-slate-200 w-full" />
                <span className="bg-white px-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider shrink-0">
                  or with email
                </span>
                <div className="border-t border-slate-200 w-full" />
              </div>

              {/* Email Form with Sign In / Sign Up Toggle */}
              {!showPhoneLogin ? (
                <form onSubmit={handleEmailAuth} className="space-y-3">
                  {/* Subtle Tab Switcher */}
                  <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab("signin");
                        setErrorMessage("");
                      }}
                      className={`flex-1 py-1.5 rounded-lg transition-all ${
                        authTab === "signin"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthTab("signup");
                        setErrorMessage("");
                      }}
                      className={`flex-1 py-1.5 rounded-lg transition-all ${
                        authTab === "signup"
                          ? "bg-white text-slate-900 shadow-sm"
                          : "text-slate-500 hover:text-slate-700"
                      }`}
                    >
                      New Account
                    </button>
                  </div>

                  {/* Name field (for new accounts) */}
                  {authTab === "signup" && (
                    <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 focus-within:bg-white focus-within:border-[#FF5B00] focus-within:ring-2 focus-within:ring-orange-500/20 transition-all">
                      <User className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
                      <input
                        type="text"
                        placeholder="Your full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="bg-transparent text-xs font-semibold text-slate-900 w-full focus:outline-none placeholder-slate-400"
                      />
                    </div>
                  )}

                  {/* Email Input */}
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 focus-within:bg-white focus-within:border-[#FF5B00] focus-within:ring-2 focus-within:ring-orange-500/20 transition-all">
                    <Mail className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
                    <input
                      type="email"
                      placeholder="name@domain.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-transparent text-xs font-semibold text-slate-900 w-full focus:outline-none placeholder-slate-400"
                    />
                  </div>

                  {/* Password Input */}
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 focus-within:bg-white focus-within:border-[#FF5B00] focus-within:ring-2 focus-within:ring-orange-500/20 transition-all">
                    <Lock className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />
                    <input
                      type={showPassword ? "text" : "password"}
                      placeholder={authTab === "signup" ? "Create password (min 6 chars)" : "Enter password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-transparent text-xs font-semibold text-slate-900 w-full focus:outline-none placeholder-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-slate-400 hover:text-slate-600 transition-colors ml-1"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full bg-[#FF5B00] hover:bg-[#E04E00] text-white font-extrabold text-xs py-3 rounded-2xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center space-x-1.5"
                  >
                    <span>{isProcessing ? "Verifying..." : authTab === "signup" ? "Create Account" : "Sign In with Email"}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Phone OTP Switcher */}
                  <div className="pt-1 text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPhoneLogin(true);
                        setErrorMessage("");
                      }}
                      className="text-[11px] font-bold text-slate-500 hover:text-[#FF5B00] transition-colors"
                    >
                      Or sign in with mobile number
                    </button>
                  </div>
                </form>
              ) : (
                /* Alternate Phone Number Form */
                <form onSubmit={handleSendOtp} className="space-y-3">
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl p-2.5 focus-within:bg-white focus-within:border-[#FF5B00] focus-within:ring-2 focus-within:ring-orange-500/20 transition-all">
                    <span className="text-xs font-extrabold text-slate-700 mr-2 border-r border-slate-300 pr-2">+91</span>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="Enter 10-digit mobile"
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="bg-transparent text-xs font-bold text-slate-900 w-full focus:outline-none placeholder-slate-400"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="w-full bg-[#FF5B00] hover:bg-[#E04E00] text-white font-extrabold text-xs py-3 rounded-2xl shadow-md transition-all active:scale-[0.98]"
                  >
                    <span>{isProcessing ? "Sending code..." : "Get OTP Code"}</span>
                  </button>

                  <div className="text-center">
                    <button
                      type="button"
                      onClick={() => {
                        setShowPhoneLogin(false);
                        setErrorMessage("");
                      }}
                      className="text-[11px] font-bold text-slate-500 hover:text-[#FF5B00] transition-colors"
                    >
                      ← Back to email sign in
                    </button>
                  </div>
                </form>
              )}

              {/* Terms footer */}
              <p className="text-[11px] text-center text-slate-400 font-medium pt-1">
                By continuing, you agree to our{" "}
                <a href="#" className="underline text-slate-600 font-bold">
                  Terms
                </a>{" "}
                &{" "}
                <a href="#" className="underline text-slate-600 font-bold">
                  Privacy Policy
                </a>
              </p>
            </div>
          )}

          {/* STEP 2: Phone OTP Verification */}
          {step === 2 && (
            <div className="space-y-4 text-center">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verify Mobile</span>
                <button
                  onClick={() => setStep(1)}
                  className="p-1 text-slate-400 hover:text-slate-700 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div>
                <h3 className="font-extrabold text-base text-slate-900">Enter Verification Code</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Sent to <b className="text-slate-800">+91 {mobile}</b>
                </p>

                {issuedOtp && (
                  <p className="text-[11px] text-[#FF5B00] font-bold mt-2 bg-orange-50 border border-orange-200 py-1.5 px-3 rounded-xl inline-block">
                    Your code: <span className="font-mono tracking-widest">{issuedOtp}</span>
                  </p>
                )}

                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="block text-[11px] font-bold text-slate-500 hover:text-[#FF5B00] mt-2 underline mx-auto"
                >
                  Resend code
                </button>
              </div>

              <div className="flex justify-center">
                <input
                  type="text"
                  maxLength={4}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value)}
                  placeholder="1234"
                  className="w-36 text-center text-xl font-mono font-bold tracking-widest bg-slate-50 border border-slate-300 rounded-2xl p-2.5 focus:bg-white focus:outline-none focus:border-[#FF5B00] focus:ring-2 focus:ring-orange-500/20 transition-all"
                />
              </div>

              <button
                onClick={handleVerifyOtp}
                disabled={isProcessing}
                className="w-full bg-[#FF5B00] hover:bg-[#E04E00] text-white font-extrabold text-xs py-3 rounded-2xl shadow-md transition-all active:scale-[0.98]"
              >
                <span>{isProcessing ? "Verifying..." : "Confirm & Proceed"}</span>
              </button>
            </div>
          )}

          {/* STEP 3: Quick Doorstep Delivery Details (Skippable) */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h3 className="font-black text-sm text-slate-900">Delivery Details</h3>
                  <p className="text-[11px] text-slate-500 font-medium">
                    Where should our scooter rider deliver?
                  </p>
                </div>
                <button
                  onClick={handleSkipSetup}
                  className="text-xs font-extrabold text-slate-400 hover:text-slate-700 underline"
                >
                  Skip
                </button>
              </div>

              <div className="space-y-2.5 text-xs">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Full Name
                  </label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <User className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Azan Iqbal Mir"
                      className="bg-transparent font-semibold text-slate-900 w-full focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Mobile Number (For scooter rider to call you)
                  </label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <span className="text-xs font-bold text-slate-500 mr-2 border-r border-slate-200 pr-2">+91</span>
                    <input
                      type="tel"
                      maxLength={10}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="9622720283"
                      className="bg-transparent font-semibold text-slate-900 w-full focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    House / Flat / Landmark
                  </label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
                    <Home className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
                    <input
                      type="text"
                      value={flatNo}
                      onChange={(e) => setFlatNo(e.target.value)}
                      placeholder="e.g. House #12, Near Petrol Pump"
                      className="bg-transparent font-semibold text-slate-900 w-full focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                      Area / Locality
                    </label>
                    <input
                      type="text"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder="e.g. Nai Basti"
                      className="w-full bg-slate-50 border border-slate-200 font-semibold p-2 rounded-xl focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                      City & Pincode
                    </label>
                    <input
                      type="text"
                      value={`${city} - ${pincode}`}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="Anantnag - 192101"
                      className="w-full bg-slate-50 border border-slate-200 font-semibold p-2 rounded-xl focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex space-x-2">
                <button
                  onClick={handleSkipSetup}
                  className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-2xl transition-all"
                >
                  Skip
                </button>
                <button
                  onClick={handleCompleteSetup}
                  className="w-2/3 bg-[#FF5B00] hover:bg-[#E04E00] text-white font-extrabold text-xs py-3 rounded-2xl shadow-md transition-all active:scale-[0.98] flex items-center justify-center space-x-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Start Shopping</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
