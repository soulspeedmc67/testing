import { useState, useEffect } from "react";
import { useRouter } from "next/router";
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

const TOP_FAVICONS = [
  // Floating cleanly in the white header flanking the heading
  { emoji: "🥑", top: "46%", left: "7%", size: "text-2xl", rotate: "-rotate-12", opacity: "opacity-45" },
  { emoji: "🥐", top: "46%", right: "7%", size: "text-2xl", rotate: "rotate-12", opacity: "opacity-45" },
];

const BOTTOM_FAVICONS = [
  // Flanking 'or Sign In with'
  { emoji: "🍎", top: "51%", left: "10%", size: "text-xl", rotate: "rotate-6", opacity: "opacity-35" },
  { emoji: "🥕", top: "51%", right: "10%", size: "text-2xl", rotate: "-rotate-12", opacity: "opacity-35" },
  // Flanking Google & Truecaller buttons
  { emoji: "🍿", top: "62%", left: "10%", size: "text-2xl", rotate: "rotate-6", opacity: "opacity-35" },
  { emoji: "🍟", top: "62%", right: "10%", size: "text-2xl", rotate: "-rotate-12", opacity: "opacity-35" },
  // Lower scattered snacks & vegetables
  { emoji: "🍕", top: "73%", left: "18%", size: "text-2xl", rotate: "rotate-12", opacity: "opacity-35" },
  { emoji: "🧀", top: "74%", right: "18%", size: "text-2xl", rotate: "rotate-12", opacity: "opacity-35" },
  { emoji: "🍫", top: "82%", left: "10%", size: "text-2xl", rotate: "-rotate-12", opacity: "opacity-35" },
  { emoji: "🥦", top: "82%", right: "12%", size: "text-2xl", rotate: "rotate-6", opacity: "opacity-35" },
  { emoji: "🥤", top: "90%", left: "8%", size: "text-xl", rotate: "rotate-12", opacity: "opacity-30" },
  { emoji: "🍇", top: "90%", right: "8%", size: "text-xl", rotate: "-rotate-6", opacity: "opacity-30" },
];

export default function LoginPage() {
  const router = useRouter();

  // Step 1: Main Auth (Email/Password + Google & Truecaller), Step 3: Address & Profile Setup
  const [step, setStep] = useState(1);

  // Auth Modes & State
  const [authTab, setAuthTab] = useState("signin"); // "signin" | "signup"
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Email form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

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
        <div className="flex-1 flex flex-col justify-between relative min-h-screen">
          {/* Top White Curved Header with Wave Transition */}
          <div className="relative bg-white text-slate-900 pt-7 pb-2 px-6 overflow-hidden">
            {/* Subtle Floating Snack & Vegetable Favicons in top section */}
            {TOP_FAVICONS.map((item, idx) => (
              <span
                key={idx}
                className={`absolute ${item.size} ${item.rotate} ${item.opacity} pointer-events-none select-none transition-transform`}
                style={{ top: item.top, left: item.left, right: item.right }}
              >
                {item.emoji}
              </span>
            ))}

            {/* Header Top Bar */}
            <div className="relative z-10 flex items-center justify-between mb-6">
              {/* DASHit Brand Icon Mark */}
              <div className="flex items-center space-x-1.5 bg-[#061838] text-white px-3.5 py-1.5 rounded-2xl shadow-sm">
                <span className="font-logo font-black text-sm tracking-tight text-[#FF5B00]">DASH</span>
                <span className="font-logo font-black text-sm tracking-tight text-[#0284c7]">it</span>
              </div>

              {/* Top-Right: Sign Up / Sign In Toggle + Skip Button */}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthTab(authTab === "signin" ? "signup" : "signin");
                    setErrorMessage("");
                  }}
                  className="flex items-center space-x-1.5 text-xs font-bold text-slate-800 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 px-3.5 py-1.5 rounded-full transition-all active:scale-95"
                >
                  <User className="w-3.5 h-3.5 text-slate-600" />
                  <span>{authTab === "signin" ? "Sign Up" : "Sign In"}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSkipSetup}
                  className="text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-3.5 py-1.5 rounded-full transition-all active:scale-95"
                >
                  Skip
                </button>
              </div>
            </div>

            {/* Hero Main Heading: Sign In / Sign Up */}
            <div className="relative z-10 text-center pb-2 pt-2">
              <h1 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tight">
                {authTab === "signup" ? "Sign Up" : "Sign In"}
              </h1>
              <p className="text-xs text-slate-500 font-semibold mt-1">
                {authTab === "signup"
                  ? "Create your DASHit account in seconds"
                  : "Welcome back! Enter your details to continue"}
              </p>
            </div>
          </div>

          {/* Asymmetrical Organic SVG Wave Transition (dipping on left, rising on right) */}
          <div className="relative w-full overflow-hidden bg-white -mt-[1px]">
            <svg
              viewBox="0 0 500 140"
              preserveAspectRatio="none"
              className="w-full h-18 md:h-22 fill-[#061838] block -mb-[1px]"
            >
              <path d="M 0,50 C 90,115 190,135 280,105 C 370,75 440,45 500,5 L 500,140 L 0,140 Z" />
            </svg>
          </div>

          {/* Lower Midnight Section */}
          <div className="relative flex-1 bg-[#061838] px-6 pt-3 pb-8 flex flex-col justify-between overflow-hidden">
            {/* Floating Snack & Vegetable Favicons in midnight section */}
            {BOTTOM_FAVICONS.map((item, idx) => (
              <span
                key={idx}
                className={`absolute ${item.size} ${item.rotate} ${item.opacity} pointer-events-none select-none`}
                style={{ top: item.top, left: item.left, right: item.right }}
              >
                {item.emoji}
              </span>
            ))}

            <div className="relative z-10 max-w-sm mx-auto w-full space-y-4">
              {/* Error message pill */}
              {errorMessage && (
                <div className="bg-rose-950/80 border border-rose-500/60 text-rose-200 text-xs font-semibold p-3 rounded-2xl flex items-center space-x-2 animate-shake">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Form with Pill Inputs */}
              <form onSubmit={handleEmailAuth} className="space-y-3.5">
                {/* Full Name field (if Sign Up) */}
                {authTab === "signup" && (
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-slate-400 pl-4">
                      Full Name
                    </label>
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Azan Iqbal Mir"
                      className="w-full bg-[#0d2247] border border-slate-700/80 text-white rounded-full py-3.5 px-5 text-sm placeholder:text-slate-500 focus:outline-none focus:border-[#FF5B00] shadow-inner transition-all"
                    />
                  </div>
                )}

                {/* Email Input */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-400 pl-4">
                    Email
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-[#0d2247] border border-slate-700/80 text-white rounded-full py-3.5 px-5 text-sm placeholder:text-slate-500 focus:outline-none focus:border-[#FF5B00] shadow-inner transition-all"
                  />
                </div>

                {/* Password Input */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-400 pl-4">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={authTab === "signup" ? "Create password (min 6 chars)" : "••••••••••••"}
                      className="w-full bg-[#0d2247] border border-slate-700/80 text-white rounded-full py-3.5 pl-5 pr-12 text-sm placeholder:text-slate-500 focus:outline-none focus:border-[#FF5B00] shadow-inner transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Glowing Gradient Border Action Button */}
                <div className="pt-2">
                  <div className="p-[1.5px] rounded-full bg-gradient-to-r from-[#FF5B00] via-[#FF8533] to-[#f7c400] shadow-lg shadow-orange-950/50 hover:shadow-orange-500/20 active:scale-[0.98] transition-all">
                    <button
                      type="submit"
                      disabled={isProcessing}
                      className="w-full bg-[#061838] hover:bg-[#0b2552] text-white font-black text-sm py-3.5 px-6 rounded-full flex items-center justify-center space-x-2 transition-all"
                    >
                      <ArrowRight className="w-4 h-4 text-[#FF5B00]" />
                      <span>
                        {isProcessing
                          ? "Processing..."
                          : authTab === "signup"
                          ? "Sign Up"
                          : "Sign In"}
                      </span>
                    </button>
                  </div>
                </div>
              </form>

              {/* Alternate 1-Tap Login with Google & Truecaller */}
              <div className="pt-3 text-center space-y-3.5">
                <p className="text-xs font-bold text-slate-400">or Sign In with</p>

                <div className="flex items-center justify-center space-x-4">
                  {/* Google Circular Button */}
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    disabled={isProcessing}
                    className="w-14 h-14 rounded-full bg-[#0d2247] border border-slate-700/80 hover:border-slate-500 p-3.5 flex items-center justify-center shadow-lg active:scale-95 transition-all"
                    title="Sign in with Google"
                  >
                    <svg className="w-6 h-6" viewBox="0 0 24 24">
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
                  </button>

                  {/* Truecaller Circular Button */}
                  <button
                    type="button"
                    onClick={handleTruecallerLogin}
                    disabled={isProcessing}
                    className="w-14 h-14 rounded-full bg-[#0087FF] hover:bg-[#0077e6] border border-blue-400/40 p-3.5 flex items-center justify-center shadow-lg shadow-blue-900/50 active:scale-95 transition-all text-white"
                    title="1-Tap Login with Truecaller"
                  >
                    <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24">
                      <path d="M20.01 15.38c-1.23 0-2.42-.2-3.53-.56a.977.977 0 00-1.01.24l-2.2 2.2a15.05 15.05 0 01-6.59-6.59l2.2-2.21a.96.96 0 00.25-1.01A11.36 11.36 0 018.57 3.9c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.52c0-.55-.45-1-1-1z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Terms */}
            <div className="relative z-10 pt-6 text-center">
              <p className="text-[11px] text-slate-500 font-medium">
                By continuing, you agree to our{" "}
                <a href="#" className="underline text-slate-400 font-bold hover:text-white">
                  Terms
                </a>{" "}
                &{" "}
                <a href="#" className="underline text-slate-400 font-bold hover:text-white">
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
          <div className="bg-[#0b2046] border border-slate-700/80 rounded-[32px] p-6 md:p-7 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-700/60 pb-3">
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
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  Full Name
                </label>
                <div className="flex items-center bg-[#061838] border border-slate-700/80 rounded-2xl px-3.5 py-2.5">
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
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  Mobile Number (For scooter rider to call you)
                </label>
                <div className="flex items-center bg-[#061838] border border-slate-700/80 rounded-2xl px-3.5 py-2.5">
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
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                  House / Flat / Landmark
                </label>
                <div className="flex items-center bg-[#061838] border border-slate-700/80 rounded-2xl px-3.5 py-2.5">
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
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                    Area / Locality
                  </label>
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. Nai Basti"
                    className="w-full bg-[#061838] border border-slate-700/80 font-semibold p-2.5 rounded-2xl text-white focus:outline-none"
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
                    className="w-full bg-[#061838] border border-slate-700/80 font-semibold p-2.5 rounded-2xl text-white focus:outline-none"
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
