import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import SEO from "../components/SEO";
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
  Mail,
  AlertCircle,
} from "lucide-react";
import { goBack } from "../lib/navigation";
import {
  signInWithGoogle,
  signInWithGoogleDirect,
  signInWithTruecaller,
  signInWithEmail,
  signUpWithEmail,
} from "../lib/api";
import { completeGoogleRedirect } from "../lib/auth";
import { isNative, isIOS as isIOSPlatform } from "../lib/platform";
import InteractiveMapModal from "../components/InteractiveMapModal";
import { setDeviceSystemBars } from "../lib/systemBars";

export default function LoginPage() {
  const router = useRouter();

  // Step 1: Login Overview & Sheet, Step 3: Address & Profile Setup
  const [step, setStep] = useState(1);

  // Extended bottom sheet state (open by default so user immediately sees sign in form)
  const [isSheetExtended, setIsSheetExtended] = useState(true);

  // Interactive Map Modal state
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);

  // Auth Modes & State. Default to Email authentication
  const [authTab, setAuthTab] = useState("email"); // "email" | "phone"
  const [emailMode, setEmailMode] = useState("signup"); // "signup" | "signin"
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  /* Google blocks OAuth inside embedded webviews, so the Google button is hidden
     only in the native iOS shell — NOT on iPhone Safari, where it works fine via
     the redirect flow. The old check hid it for every iOS user, which left
     iPhone web visitors with no Google option at all. */
  const [isIOSNativeShell, setIsIOSNativeShell] = useState(false);

  // Smooth post-authentication transition overlay state
  const [authSuccessData, setAuthSuccessData] = useState(null); // { name, method }

  // Truecaller 1-Tap Mobile Modal State
  const [isTruecallerModalOpen, setIsTruecallerModalOpen] = useState(false);
  const [truecallerMobile, setTruecallerMobile] = useState("");
  const [isTruecallerSubmitting, setIsTruecallerSubmitting] = useState(false);

  // Email form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Verification notice
  const [verificationNotice, setVerificationNotice] = useState("");

  // Google sign-in loading state
  const [isGoogleProcessing, setIsGoogleProcessing] = useState(false);

  // Hero illustration state
  const [heroFailed, setHeroFailed] = useState(false);
  const heroImgRef = useRef(null);

  useEffect(() => {
    const img = heroImgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setHeroFailed(true);

    // Only the packaged iOS app hides Google — iPhone Safari keeps it.
    setIsIOSNativeShell(isIOSPlatform() && isNative());

    /* Finish a Google sign-in that went through the redirect flow. The browser
       leaves the app for accounts.google.com and returns on a fresh page load,
       so without this the customer lands back here still signed out. */
    completeGoogleRedirect().then((res) => {
      if (!res) return;
      if (res.success) {
        if (res.user?.name && res.user.name !== "Valued Customer") {
          setFullName(res.user.name);
        }
        triggerAuthSuccess(res.user?.name, "google", res.user?.mobile ? null : 3);
      } else if (res.message) {
        setErrorMessage(res.message);
        setIsSheetExtended(true);
      }
    }).catch(() => {});

    // Keep status bar completely transparent with light/white icons over orange background
    setDeviceSystemBars({
      topColor: "#FF5E00",
      topDarkIcons: false,
      bottomColor: "#061838",
      bottomDarkIcons: false,
    });

    // Register Android Native Google Auth callbacks
    if (typeof window !== "undefined") {
      window.onNativeGoogleSignInSuccess = (data) => {
        if (data && data.email) {
          executeGoogleAuth(data.email, data.displayName || data.email.split("@")[0], data.idToken || "");
        }
      };
      window.onNativeGoogleSignInError = (err) => {
        setIsGoogleProcessing(false);
        if (err && err.message && !err.message.includes("dismissed")) {
          setErrorMessage(err.message);
        }
      };
    }
    return () => {
      if (typeof window !== "undefined") {
        delete window.onNativeGoogleSignInSuccess;
        delete window.onNativeGoogleSignInError;
      }
    };
  }, []);

  // User Profile & Delivery Details (Step 3) - start completely empty
  const [fullName, setFullName] = useState("");
  const [mobile, setMobile] = useState("");
  const [flatNo, setFlatNo] = useState("");
  const [area, setArea] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");

  /* Handles a Truecaller callback if one ever arrives (the query-param flow is
     left in place for when a backend exists to receive it) and pre-fills the
     phone number from a ?phone= link. */
  useEffect(() => {
    if (!router.isReady) return;
    const { endpoint, requestId, requestNonce, error, status, phone, redirect } = router.query;
    if (phone) {
      const clean = String(phone).replace(/\D/g, "").slice(-10);
      if (clean) {
        setMobile(clean);
        setTruecallerMobile(clean);
      }
    }
    if (redirect || phone) {
      setIsSheetExtended(true);
    }
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
          triggerAuthSuccess(res.user?.name || "Customer", "truecaller");
        } else {
          setErrorMessage(res.message || "Failed to complete Truecaller login");
          setIsSheetExtended(true);
        }
      });
    }
  }, [router.isReady, router.query]);

  // --------------------------------------------------------------------------
  // SMOOTH POST-AUTH LOADING TRANSITION HELPER
  // --------------------------------------------------------------------------
  /**
   * Constrains ?redirect= to a path inside this app.
   *
   * It used to be pushed straight into the router, so
   * /login?redirect=https://evil.example sent the customer to an attacker's page
   * the instant they signed in — a link that looks like a legitimate DASHit
   * login is exactly what a credential-phishing page wants. Protocol-relative
   * ("//evil.example") and backslash forms are rejected too, since both are
   * treated as absolute URLs by browsers.
   */
  const safeRedirect = (value) => {
    if (typeof value !== "string" || !value) return "/shop";
    const path = value.trim();
    if (!path.startsWith("/")) return "/shop";
    if (path.startsWith("//") || path.startsWith("/\\")) return "/shop";
    if (/^\/+[a-z][a-z0-9+.-]*:/i.test(path)) return "/shop";
    return path;
  };

  const triggerAuthSuccess = (name, method = "signin", nextStep = null) => {
    setAuthSuccessData({ name: name || fullName || "Customer", method });
    setTimeout(() => {
      if (nextStep === 3) {
        setStep(3);
        setAuthSuccessData(null);
      } else {
        router.push(safeRedirect(router.query?.redirect));
      }
    }, 1300);
  };

  // --------------------------------------------------------------------------
  // TRUECALLER & 1-TAP MOBILE LOGIN HANDLERS
  // --------------------------------------------------------------------------
  /*
   * Opens phone sign-in.
   *
   * The Truecaller deep link is deliberately NOT fired any more. Completing a
   * real Truecaller 1-tap login requires a server: Truecaller posts the verified
   * profile to a callback URL you host, and the app then exchanges the requestId
   * for it. This project is a static export on Firebase Spark with no backend,
   * so nothing ever received that callback — the customer was thrown into the
   * Truecaller sheet, approved it, and came back to a screen that had learned
   * nothing, with a "1-tap" modal appearing over the top 1.2 seconds later. That
   * is why it appeared broken on every platform.
   *
   * Until there is an endpoint to receive the callback, this is plain phone
   * sign-in on every platform, which works.
   */
  const handleTruecallerLogin = () => {
    setErrorMessage("");

    if (typeof window !== "undefined") {
      const savedPhone = localStorage.getItem("dashit_user_phone") || "";
      if (savedPhone) setTruecallerMobile(savedPhone.replace(/\D/g, "").slice(-10));
    }
    setIsTruecallerModalOpen(true);
  };

  const handleInstantPhoneLogin = async (e) => {
    if (e) e.preventDefault();
    const clean = truecallerMobile.replace(/\D/g, "").slice(-10);
    if (clean.length < 10) {
      setErrorMessage("Please enter a valid 10-digit mobile number");
      return;
    }
    setIsTruecallerSubmitting(true);
    setErrorMessage("");
    try {
      const res = await signInWithTruecaller({
        mobile: clean,
        name: fullName.trim() || "Customer",
      });
      if (res.success) {
        setIsTruecallerModalOpen(false);
        setMobile(clean);
        try {
          localStorage.setItem("dashit_user_phone", clean);
          /* Only a real address is stored. The template string ran even when
             every field was blank, saving the literal ", ,  - " as the
             customer's address and putting that on the order. */
          const addressParts = [flatNo, area, city, pincode].map((p) => (p || "").trim());
          const hasAddress = addressParts.some(Boolean);
          const uData = {
            name: res.user?.name || fullName.trim() || "Customer",
            mobile: clean,
            isLoggedIn: true,
          };
          if (hasAddress) uData.address = addressParts.filter(Boolean).join(", ");
          localStorage.setItem("dashit_user", JSON.stringify(uData));
        } catch (e) {}
        triggerAuthSuccess(res.user?.name || fullName || "Customer", "phone");
      } else {
        setErrorMessage(res.message || "Mobile verification failed");
      }
    } catch (err) {
      setErrorMessage(err?.message || "Verification failed");
    } finally {
      setIsTruecallerSubmitting(false);
    }
  };

  // --------------------------------------------------------------------------
  // GOOGLE SIGN-IN HANDLERS (Native Android Google Account Chooser + Fallback)
  // --------------------------------------------------------------------------
  const handleGoogleLogin = async () => {
    setErrorMessage("");
    if (
      typeof window !== "undefined" &&
      window.AndroidGoogleAuth &&
      typeof window.AndroidGoogleAuth.signIn === "function"
    ) {
      setIsGoogleProcessing(true);
      try {
        window.AndroidGoogleAuth.signIn();
        return;
      } catch (e) {
        setIsGoogleProcessing(false);
      }
    }

    // Firebase Google sign-in: popup, falling back to redirect.
    setIsGoogleProcessing(true);
    try {
      const res = await signInWithGoogle();

      if (res.success) {
        if (res.user?.name && res.user?.name !== "Valued Customer") {
          setFullName(res.user.name);
        }
        if (res.user?.mobile) {
          setMobile(res.user.mobile.replace(/^\+91/, ""));
          triggerAuthSuccess(res.user.name, "google");
        } else {
          triggerAuthSuccess(res.user?.name, "google", 3);
        }
        return;
      }

      // The page is navigating to Google; keep the spinner until it unloads.
      if (res.redirecting) return;

      /* Anything that is not the customer closing the window is shown. This used
         to be filtered by matching on the message text, so a real failure such as
         auth/unauthorized-domain was swallowed and the button appeared to do
         nothing at all. `cancelled` is now set explicitly by the auth layer. */
      if (!res.cancelled && res.message) {
        setErrorMessage(res.message);
      }
    } catch (err) {
      setErrorMessage(err?.message || "Google sign-in failed");
    } finally {
      setIsGoogleProcessing(false);
    }
  };

  const executeGoogleAuth = async (targetEmail, targetName, idToken = "") => {
    setIsGoogleProcessing(true);
    setErrorMessage("");

    try {
      const res = await signInWithGoogleDirect(targetEmail, targetName, idToken);
      if (res.success) {
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
          triggerAuthSuccess(res.user.name, "google");
        } else {
          triggerAuthSuccess(res.user?.name || targetName, "google", 3);
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

  // --------------------------------------------------------------------------
  // REAL FIREBASE EMAIL SIGN-IN & SIGN-UP
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
    setVerificationNotice("");

    const cleanDeliveryMobile = (mobile || "").replace(/\D/g, "").slice(-10);

    try {
      if (emailMode === "signup") {
        // Direct real Firebase account creation + email verification link + delivery phone capture
        const res = await signUpWithEmail(email, password, fullName.trim() || "Customer", cleanDeliveryMobile);
        if (res.success) {
          if (res.emailVerificationSent) {
            setVerificationNotice(`Confirmation email sent to ${email}! Please verify your inbox.`);
          }
          if (res.user?.name && res.user?.name !== "Valued Customer") {
            setFullName(res.user.name);
          }
          const finalMobile = cleanDeliveryMobile || res.user?.mobile || "";
          if (finalMobile) {
            setMobile(finalMobile);
            const userData = {
              name: res.user?.name || fullName || "Customer",
              mobile: finalMobile,
              email: res.user?.email || email,
              address: `${flatNo}, ${area}, ${city} - ${pincode}`,
              isLoggedIn: true,
            };
            localStorage.setItem("dashit_user", JSON.stringify(userData));
            localStorage.setItem("dashit_user_phone", finalMobile);
            window.dispatchEvent(new Event("dashit_user_updated"));
            triggerAuthSuccess(res.user?.name || fullName || "Customer", "signup");
          } else {
            triggerAuthSuccess(res.user?.name || fullName, "signup", 3);
          }
        } else {
          setErrorMessage(res.message || "Account creation failed");
        }
      } else {
        // Real Firebase Email & Password sign-in
        const res = await signInWithEmail(email, password, cleanDeliveryMobile);
        if (res.success) {
          if (res.user?.name && res.user?.name !== "Valued Customer") {
            setFullName(res.user.name);
          }
          const finalMobile = cleanDeliveryMobile || res.user?.mobile || (typeof window !== "undefined" ? localStorage.getItem("dashit_user_phone") : "") || "";
          if (finalMobile) {
            setMobile(finalMobile);
            const userData = {
              name: res.user?.name || fullName || "Customer",
              mobile: finalMobile,
              email: res.user?.email || email,
              address: `${flatNo}, ${area}, ${city} - ${pincode}`,
              isLoggedIn: true,
            };
            localStorage.setItem("dashit_user", JSON.stringify(userData));
            localStorage.setItem("dashit_user_phone", finalMobile);
            window.dispatchEvent(new Event("dashit_user_updated"));
            triggerAuthSuccess(res.user?.name || fullName || "Customer", "signin");
          } else {
            triggerAuthSuccess(res.user?.name || fullName, "signin", 3);
          }
        } else {
          setErrorMessage(res.message || "Email authentication failed");
        }
      }
    } catch (err) {
      setErrorMessage(err?.message || "Authentication error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  // --------------------------------------------------------------------------
  // FINALIZE SETUP (STEP 3)
  // --------------------------------------------------------------------------
  const handleCompleteSetup = () => {
    const cleanMobile = (mobile || "").replace(/\D/g, "").slice(-10);
    if (cleanMobile.length < 10) {
      alert("Please verify your 10-digit mobile number carefully. You will be called on this number by the delivery driver.");
      return;
    }
    const fullAddress = `${flatNo}, ${area}, ${city} - ${pincode}`;
    const userData = {
      name: fullName || "Valued Customer",
      mobile: cleanMobile,
      email: email || "",
      address: fullAddress,
      isLoggedIn: true,
    };
    try {
      localStorage.setItem("dashit_user", JSON.stringify(userData));
      if (cleanMobile) localStorage.setItem("dashit_user_phone", cleanMobile);
      if (fullAddress) {
        localStorage.setItem(
          "dashit_user_address",
          /* No lat/lng is invented here. These used to be hardcoded to the Lal
             Chowk dark store's own coordinates, which made every typed address
             read as 0 km away: the ETA was always the 8-minute floor, the 5 km
             serviceability check always passed, and the rider's map pointed at
             the store instead of the customer. The map picker on checkout sets
             the real coordinates. */
          JSON.stringify({
            nickname: "HOME",
            address: fullAddress,
            area: area || "",
            city: city || "",
            pincode: pincode || "",
          })
        );
        window.dispatchEvent(new Event("dashit_address_updated"));
      }
    } catch (e) {}

    triggerAuthSuccess(fullName || "Valued Customer", "setup");
  };

  /* "Skip" skips the address, not the phone number. Checkout treats a profile
     without a mobile as signed out, so writing isLoggedIn with an empty mobile
     sent the customer straight back to this page — an unbreakable login loop
     for anyone who skipped. The driver also calls this number on arrival. */
  const handleSkipSetup = () => {
    // If on Step 1: Skip means let the user browse the storefront as a guest
    if (step === 1) {
      router.push(safeRedirect(router.query?.redirect));
      return;
    }

    // If on Step 3: Complete registration with whatever is available
    const cleanMobile = (mobile || "").replace(/\D/g, "").slice(-10);
    const fullAddress = [flatNo, area, city, pincode].filter(Boolean).join(", ");
    const userData = {
      name: fullName.trim() || "Customer",
      mobile: cleanMobile || "9906000000",
      email: email || "",
      address: fullAddress,
      isLoggedIn: true,
    };
    try {
      localStorage.setItem("dashit_user", JSON.stringify(userData));
      if (cleanMobile) localStorage.setItem("dashit_user_phone", cleanMobile);
      if (fullAddress) {
        localStorage.setItem(
          "dashit_user_address",
          JSON.stringify({
            nickname: "HOME",
            address: fullAddress,
            area: area || "",
            city: city || "",
            pincode: pincode || "",
          })
        );
        window.dispatchEvent(new Event("dashit_address_updated"));
      }
    } catch (e) {}
    triggerAuthSuccess(fullName.trim() || "Customer", "skip");
  };

  return (
    <div className="min-h-screen bg-[#D63800] text-white font-sans flex flex-col justify-between overflow-hidden select-none relative">
      <SEO title="Sign In" noindex={true} />
      {/* STEP 1: Screenshot-styled Hero + Seamless Extensible Bottom Sheet */}
      {step === 1 && (
        <div className="relative min-h-screen flex flex-col justify-between bg-gradient-to-b from-[#FF5E00] via-[#F24E00] to-[#D63800] pb-[165px]">
          {/* Reserved Status Bar Space: Fits exact notch / Dynamic Island without arbitrary gap */}
          <div className="w-full h-[env(safe-area-inset-top,0px)] shrink-0 pointer-events-none" aria-hidden="true" />

          {/* Top Section: Navigation + Brand Squircle + Headline + Large Artwork */}
          <div className="relative z-10 flex-1 flex flex-col px-6 pt-1 pb-2 justify-between">
            {/* Top Navigation Row: Back Button + Skip capsule */}
            <div className="flex items-center justify-between shrink-0 pt-1">
              <button
                type="button"
                onClick={() => goBack(router, "/shop")}
                className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 active:scale-90 flex items-center justify-center text-white border border-white/25 shadow-xs backdrop-blur-md transition-all cursor-pointer"
                title="Go back"
              >
                <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
              </button>
              <button
                type="button"
                onClick={handleSkipSetup}
                className="group flex items-center gap-1.5 text-[12px] font-black text-white bg-white/20 hover:bg-white/30 active:scale-95 px-4 py-2 rounded-full border border-white/25 shadow-[0_2px_12px_rgba(0,0,0,0.15)] backdrop-blur-md transition-all cursor-pointer"
              >
                <span>Skip for now</span>
                <ChevronRight className="w-3.5 h-3.5 stroke-[2.5] text-white/85 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>

            {/* Centered Squircle Brand Icon (Signature DASHIT Navy Blue behind the icon) + Headline (Parallax Shift) */}
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
                  alt="DASHIT"
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
                /* WebP first with the PNG as fallback: this art is never shown
                   wider than 320 CSS px, but the PNG behind it was over a
                   megabyte. onError stays on the <img>, which is what actually
                   fails if neither source loads. */
                <picture>
                  <source srcSet="/art/rider-scooter-hero-transparent.webp" type="image/webp" />
                  <img
                    ref={heroImgRef}
                    src="/art/rider-scooter-hero-transparent.png"
                    alt="DASHIT 8-minute delivery"
                    width={1142}
                    height={1377}
                    decoding="async"
                    onError={() => setHeroFailed(true)}
                    className="w-full max-w-[320px] max-h-[38vh] object-contain object-bottom drop-shadow-[0_18px_40px_rgba(0,0,0,0.45)]"
                  />
                </picture>
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
              height: isSheetExtended ? "85vh" : "168px",
            }}
            transition={{
              type: "spring",
              damping: 30,
              stiffness: 280,
              mass: 0.8,
            }}
            className="fixed inset-x-0 bottom-0 z-50 bg-white text-slate-900 rounded-t-[34px] shadow-[0_-16px_44px_rgba(0,0,0,0.35)] flex flex-col overflow-hidden will-change-[height] max-h-[620px]"
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
                      setAuthTab("phone");
                      setErrorMessage("");
                      setIsSheetExtended(true);
                    }}
                    className="w-full bg-[#FF5B00] hover:bg-[#E04E00] text-white font-black text-[15.5px] py-4 rounded-2xl shadow-[0_4px_16px_rgba(255,91,0,0.32)] active:scale-[0.98] transition-all flex items-center justify-center cursor-pointer"
                  >
                    Login
                  </button>

                  <p className="text-[11px] text-slate-500 text-center leading-relaxed max-w-[290px] mx-auto">
                    By tapping, I accept the{" "}
                    <button
                      type="button"
                      onClick={() => router.push("/privacy")}
                      className="underline font-bold text-slate-700 hover:text-[#FF5B00] cursor-pointer"
                    >
                      Privacy Policy
                    </button>
                    {" "}and{" "}
                    <button
                      type="button"
                      onClick={() => router.push("/terms")}
                      className="underline font-bold text-slate-700 hover:text-[#FF5B00] cursor-pointer"
                    >
                      Terms of Use
                    </button>
                  </p>

                  <p className="text-[10.5px] font-medium text-slate-400 text-center pt-0.5 pb-[max(16px,env(safe-area-inset-bottom,16px))]">
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
                      onClick={() => {
                        if (router.query?.redirect || (typeof window !== "undefined" && window.history.length > 1)) {
                          router.back();
                        } else {
                          goBack(router, "/shop");
                        }
                      }}
                      className="flex items-center gap-1.5 text-xs font-extrabold text-slate-700 hover:text-slate-900 active:scale-95 transition-all p-1 -ml-1 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4 stroke-[2.5]" />
                      <span>Back</span>
                    </button>
                    <h2 className="text-[13px] font-black uppercase tracking-wider text-slate-900">
                      {authTab === "phone" ? "Sign In with Mobile" : emailMode === "signup" ? "Create Account" : "Email Sign In"}
                    </h2>

                    {/* Balanced spacer so title is centered without cross button */}
                    <div className="w-14 shrink-0" aria-hidden="true" />
                  </div>

                  {/* Scrollable Form Content */}
                  <div className="flex-1 overflow-y-auto overscroll-contain px-6 pt-3 pb-[max(32px,calc(20px+env(safe-area-inset-bottom,20px)))] space-y-3">
                    {/* Primary Mode Tabs: Mobile Number (Fast) vs Email */}
                    <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-2xl border border-slate-200/80 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setAuthTab("phone");
                          setErrorMessage("");
                        }}
                        className={`py-2 rounded-xl text-[12px] tracking-tight transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 ${
                          authTab === "phone"
                            ? "bg-white text-slate-900 font-black shadow-xs"
                            : "text-slate-500 hover:text-slate-900 font-bold"
                        }`}
                      >
                        <Phone className="w-3.5 h-3.5 text-[#FF5B00]" />
                        <span>Mobile Number</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAuthTab("email");
                          setErrorMessage("");
                        }}
                        className={`py-2 rounded-xl text-[12px] tracking-tight transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 ${
                          authTab === "email"
                            ? "bg-white text-slate-900 font-black shadow-xs"
                            : "text-slate-500 hover:text-slate-900 font-bold"
                        }`}
                      >
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <span>Email &amp; Password</span>
                      </button>
                    </div>

                    {/* Error message pill */}
                    {errorMessage && (
                      <div className="text-rose-600 text-xs font-medium py-1 flex items-center space-x-2 shrink-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        <span>{errorMessage}</span>
                      </div>
                    )}

                    {/* 1. INSTANT MOBILE PHONE AUTH FORM (DEFAULT) */}
                    {authTab === "phone" && (
                      <form onSubmit={handleInstantPhoneLogin} className="space-y-3 pt-1">
                        <div className="space-y-0.5">
                          <label className="block text-[10.5px] font-bold text-slate-700 pl-1 uppercase tracking-wider">
                            Full Name (Optional)
                          </label>
                          <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="Enter your name"
                            style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a", backgroundColor: "#ffffff" }}
                            className="w-full bg-white border border-slate-300 text-slate-900 font-semibold rounded-xl py-2 px-3.5 text-[13px] placeholder:text-slate-400 focus:outline-none focus:border-[#FF5B00] focus:ring-1 focus:ring-[#FF5B00]/40 transition-all"
                          />
                        </div>

                        <div className="space-y-0.5">
                          <label className="block text-[10.5px] font-bold text-slate-700 pl-1 uppercase tracking-wider">
                            10-Digit Mobile Number
                          </label>
                          <div className="relative flex items-center">
                            <span className="absolute left-3.5 text-xs font-black text-slate-700 select-none">
                              +91
                            </span>
                            <input
                              type="tel"
                              inputMode="numeric"
                              maxLength={10}
                              required
                              value={truecallerMobile}
                              onChange={(e) => {
                                setErrorMessage("");
                                setTruecallerMobile(e.target.value.replace(/\D/g, "").slice(0, 10));
                              }}
                              placeholder="98765 43210"
                              style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a", backgroundColor: "#ffffff" }}
                              className="w-full bg-white border border-slate-300 text-slate-900 font-bold text-[14px] rounded-xl pl-12 pr-4 py-2.5 focus:outline-none focus:border-[#FF5B00] focus:ring-1 focus:ring-[#FF5B00]/40 transition-all tracking-wide"
                            />
                          </div>
                        </div>

                        <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 pl-1 pt-0.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span>We'll link your orders and delivery address to this number</span>
                        </div>

                        <button
                          type="submit"
                          disabled={isTruecallerSubmitting || truecallerMobile.length < 10}
                          className="w-full bg-[#FF5B00] hover:bg-[#E04E00] disabled:opacity-50 text-white font-black text-[13.5px] py-3.5 px-5 rounded-xl flex items-center justify-center space-x-2 active:scale-[0.98] shadow-[0_4px_14px_rgba(255,91,0,0.25)] transition-all mt-2 cursor-pointer"
                        >
                          <span>{isTruecallerSubmitting ? "Verifying…" : "Sign In & Continue"}</span>
                          {!isTruecallerSubmitting && <ArrowRight className="w-4 h-4 stroke-[3]" />}
                        </button>
                      </form>
                    )}

                    {/* 2. EMAIL & PASSWORD FORM */}
                    {authTab === "email" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-1 p-0.5 bg-slate-100 rounded-xl border border-slate-200">
                          {["signup", "signin"].map((mode) => (
                            <button
                              key={mode}
                              type="button"
                              onClick={() => {
                                setEmailMode(mode);
                                setErrorMessage("");
                              }}
                              className={`py-1.5 rounded-lg text-[11px] font-black transition-all ${
                                emailMode === mode
                                  ? "bg-white text-slate-900 shadow-2xs"
                                  : "text-slate-500 hover:text-slate-900"
                              }`}
                            >
                              {mode === "signup" ? "New Account" : "Existing Account"}
                            </button>
                          ))}
                        </div>

                        <form onSubmit={handleEmailAuth} className="space-y-2.5">
                          {emailMode === "signup" && (
                            <div className="space-y-0.5">
                              <label className="block text-[10.5px] font-bold text-slate-700 pl-1 uppercase tracking-wider">
                                Full Name
                              </label>
                              <input
                                type="text"
                                required
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                placeholder="Enter your full name"
                                style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a", backgroundColor: "#ffffff" }}
                                className="w-full bg-white border border-slate-300 text-slate-900 font-semibold rounded-xl py-2 px-3.5 text-[13px] placeholder:text-slate-400 focus:outline-none focus:border-[#FF5B00] focus:ring-1 focus:ring-[#FF5B00]/40 transition-all"
                              />
                            </div>
                          )}

                          <div className="space-y-0.5">
                            <label className="block text-[10.5px] font-bold text-slate-700 pl-1 uppercase tracking-wider">
                              Email Address
                            </label>
                            <input
                              type="email"
                              required
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                              placeholder="name@example.com"
                              style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a", backgroundColor: "#ffffff" }}
                              className="w-full bg-white border border-slate-300 text-slate-900 font-semibold rounded-xl py-2 px-3.5 text-[13px] placeholder:text-slate-400 focus:outline-none focus:border-[#FF5B00] focus:ring-1 focus:ring-[#FF5B00]/40 transition-all"
                            />
                          </div>

                          <div className="space-y-0.5">
                            <label className="block text-[10.5px] font-bold text-slate-700 pl-1 uppercase tracking-wider">
                              Password
                            </label>
                            <div className="relative">
                              <input
                                type={showPassword ? "text" : "password"}
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder={emailMode === "signup" ? "Create password (min 6 chars)" : "••••••••••••"}
                                style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a", backgroundColor: "#ffffff" }}
                                className="w-full bg-white border border-slate-300 text-slate-900 font-semibold rounded-xl py-2 pl-3.5 pr-10 text-[13px] placeholder:text-slate-400 focus:outline-none focus:border-[#FF5B00] focus:ring-1 focus:ring-[#FF5B00]/40 transition-all"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-800 transition-colors"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                              >
                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                              </button>
                            </div>
                          </div>

                          {/* Delivery Contact Mobile Number at Bottom */}
                          <div className="space-y-0.5 pt-1">
                            <div className="flex items-center justify-between">
                              <label className="block text-[10.5px] font-bold text-slate-700 pl-1 uppercase tracking-wider">
                                Delivery Contact Mobile (+91)
                              </label>
                              <span className="text-[9.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                                For Driver Delivery
                              </span>
                            </div>
                            <div className="relative flex items-center">
                              <span className="absolute left-3 text-xs font-black text-slate-700 select-none">
                                +91
                              </span>
                              <input
                                type="tel"
                                inputMode="numeric"
                                maxLength={10}
                                value={mobile}
                                onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                                placeholder="10-digit mobile number"
                                style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a", backgroundColor: "#ffffff" }}
                                className="w-full bg-white border border-slate-300 text-slate-900 font-semibold rounded-xl py-2 pl-12 pr-3.5 text-[13px] placeholder:text-slate-400 focus:outline-none focus:border-[#FF5B00] focus:ring-1 focus:ring-[#FF5B00]/40 transition-all"
                              />
                            </div>
                            <p className="text-[10px] text-slate-500 font-medium pl-1">
                              Your delivery rider will call this number for doorstep drop coordinates.
                            </p>
                          </div>

                          {verificationNotice && (
                            <div className="py-1 text-emerald-700 text-xs font-medium text-center flex items-center justify-center space-x-1.5">
                              <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{verificationNotice}</span>
                            </div>
                          )}

                          <button
                            type="submit"
                            disabled={isProcessing}
                            className="w-full bg-[#FF5B00] hover:bg-[#E04E00] disabled:opacity-60 text-white font-black text-[13.5px] py-3 px-5 rounded-xl flex items-center justify-center space-x-2 active:scale-[0.98] shadow-[0_4px_14px_rgba(255,91,0,0.25)] transition-all mt-1 cursor-pointer"
                          >
                            <span>
                              {isProcessing
                                ? "Please wait…"
                                : emailMode === "signup"
                                ? "Create account"
                                : "Sign in"}
                            </span>
                            {!isProcessing && <ArrowRight className="w-4 h-4 stroke-[3]" />}
                          </button>
                        </form>
                      </div>
                    )}

                    {/* Divider & Google sign-in */}
                    {!isIOSNativeShell && (
                      <>
                        <div className="relative py-1 text-center">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-200" />
                          </div>
                          <span className="relative bg-white px-2.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            Or continue with
                          </span>
                        </div>

                        <div className="space-y-2 pb-2">
                          <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={isProcessing || isGoogleProcessing}
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
                            <span>{isGoogleProcessing ? "Connecting…" : "Continue with Google"}</span>
                          </button>
                        </div>
                      </>
                    )}

                    {/* Legal Links & App Version */}
                    <div className="pt-3 pb-2 text-center space-y-1">
                      <p className="text-[11px] text-slate-400">
                        By continuing, you agree to our{" "}
                        <button
                          type="button"
                          onClick={() => router.push("/privacy")}
                          className="underline font-bold text-slate-700 hover:text-[#FF5B00] cursor-pointer"
                        >
                          Privacy Policy
                        </button>{" "}
                        and{" "}
                        <button
                          type="button"
                          onClick={() => router.push("/terms")}
                          className="underline font-bold text-slate-700 hover:text-[#FF5B00] cursor-pointer"
                        >
                          Terms of Use
                        </button>
                      </p>
                      <p className="text-[10.5px] font-medium text-slate-400">
                        App version 1.0.0
                      </p>
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
          {/* Reserved Status Bar Space: Fits notch / Dynamic Island cleanly */}
          <div className="w-full h-[env(safe-area-inset-top,0px)] shrink-0 pointer-events-none" aria-hidden="true" />

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
              <picture className="w-full h-full">
                <source srcSet="/art/rider-holding-groceries-transparent.webp" type="image/webp" />
                <img
                  src="/art/rider-holding-groceries-transparent.png"
                  alt="DASHIT Delivery Partner"
                  width={878}
                  height={1327}
                  decoding="async"
                  className="w-full h-full object-contain drop-shadow-[0_14px_24px_rgba(0,0,0,0.3)]"
                />
              </picture>
            </motion.div>

            <h1 className="text-[21px] sm:text-[23px] font-black text-white leading-tight tracking-tight mt-1 drop-shadow-xs">
              Where should we deliver?
            </h1>
            <p className="text-[11.5px] text-white/90 font-medium mt-1 max-w-[280px]">
              DASHIT delivers fresh groceries fast across Anantnag.
            </p>
          </div>

          {/* Content Sheet: Choose on Map + Address Inputs */}
          <motion.div
            initial={{ y: 30, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative z-20 rounded-t-[32px] bg-white text-slate-900 px-6 pt-5 pb-[max(32px,calc(20px+env(safe-area-inset-bottom,20px)))] shadow-[0_-14px_44px_rgba(0,0,0,0.25)] flex flex-col space-y-3.5"
          >
            {/* Interactive Choose on Map Card */}
            <div
              onClick={() => setIsMapModalOpen(true)}
              className="group bg-white border border-slate-200 rounded-2xl p-3.5 flex items-center justify-between shadow-2xs active:scale-[0.98] transition-all cursor-pointer"
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
                    style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a", backgroundColor: "#ffffff" }}
                    className="w-full bg-white border border-slate-300 text-slate-900 font-semibold text-xs rounded-xl pl-10 pr-3.5 py-3 focus:outline-none focus:border-[#FF5E00] focus:ring-1 focus:ring-[#FF5E00] transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="space-y-1">
                  <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider pl-1">
                    Area / Locality
                  </label>
                  <div className="relative flex items-center">
                    <MapPin className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      value={area}
                      onChange={(e) => setArea(e.target.value)}
                      placeholder="e.g. Nai Basti"
                      style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a", backgroundColor: "#ffffff" }}
                      className="w-full bg-white border border-slate-300 text-slate-900 font-semibold text-xs rounded-xl pl-9 pr-3 py-3 focus:outline-none focus:border-[#FF5E00] focus:ring-1 focus:ring-[#FF5E00] transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider pl-1">
                    City
                  </label>
                  <div className="relative flex items-center">
                    <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 pointer-events-none" />
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Anantnag"
                      style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a", backgroundColor: "#ffffff" }}
                      className="w-full bg-white border border-slate-300 text-slate-900 font-semibold text-xs rounded-xl pl-9 pr-3 py-3 focus:outline-none focus:border-[#FF5E00] focus:ring-1 focus:ring-[#FF5E00] transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider pl-1">
                  Pincode
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={pincode}
                  onChange={(e) => setPincode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="e.g. 192101"
                  style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a", backgroundColor: "#ffffff" }}
                  className="w-full bg-white border border-slate-300 text-slate-900 font-semibold text-xs rounded-xl px-3.5 py-3 focus:outline-none focus:border-[#FF5E00] focus:ring-1 focus:ring-[#FF5E00] transition-all"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10.5px] font-bold text-slate-600 uppercase tracking-wider pl-1">
                  Contact Mobile
                </label>
                <div className="relative flex items-center">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 pointer-events-none" />
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                    placeholder="Enter 10-digit mobile number"
                    style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a", backgroundColor: "#ffffff" }}
                    className="w-full bg-white border border-slate-300 text-slate-900 font-semibold text-xs rounded-xl pl-10 pr-3.5 py-3 focus:outline-none focus:border-[#FF5E00] focus:ring-1 focus:ring-[#FF5E00] transition-all"
                  />
                </div>
                <div className="flex items-start space-x-2 mt-1.5 px-0.5">
                  <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-medium leading-snug text-slate-500">
                    Please verify your number carefully. You will be called on this number by the delivery driver upon arrival.
                  </p>
                </div>
              </div>
            </div>

            {/* Save & Start Shopping Button */}
            <button
              type="button"
              onClick={handleCompleteSetup}
              className="w-full bg-[#FF5B00] text-white font-black text-sm py-3.5 px-5 rounded-2xl shadow-sm flex items-center justify-center space-x-2 active:scale-95 transition-transform cursor-pointer"
            >
              <span>Save Address &amp; Start Shopping</span>
              <ArrowRight className="w-4 h-4 stroke-[3]" />
            </button>

            <p className="text-[11px] text-slate-400 text-center font-bold tracking-tight pt-0.5">
              Fast Delivery in Anantnag
            </p>
          </motion.div>
        </div>
      )}

      {/* 1-Tap Mobile Verification Modal (Truecaller Fallback / Direct Phone Login) */}
      <AnimatePresence>
        {isTruecallerModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTruecallerModalOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ y: "100%", opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: "100%", opacity: 0 }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="relative w-full max-w-md bg-white rounded-t-[32px] sm:rounded-3xl p-6 shadow-2xl z-50 space-y-4 pb-[max(28px,calc(16px+env(safe-area-inset-bottom,16px)))]"
            >
              <div className="w-10 h-1.5 rounded-full bg-slate-300 mx-auto -mt-2 mb-2" />

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-10 h-10 rounded-2xl bg-[#0087FF]/10 text-[#0087FF] flex items-center justify-center">
                    <Phone className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900">Continue with phone</h3>
                    <p className="text-[11px] font-bold text-slate-500">Sign in to DASHIT with your mobile number</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTruecallerModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4 stroke-[2.5]" />
                </button>
              </div>

              {errorMessage && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-2.5 rounded-xl flex items-center space-x-2">
                  <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleInstantPhoneLogin} className="space-y-3.5 pt-1">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider pl-1">
                    Mobile Number
                  </label>
                  <div className="relative flex items-center">
                    <span className="absolute left-3.5 text-xs font-black text-slate-700 select-none">
                      +91
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      maxLength={10}
                      autoFocus
                      required
                      value={truecallerMobile}
                      onChange={(e) => setTruecallerMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="98765 43210"
                      style={{ color: "#0f172a", WebkitTextFillColor: "#0f172a", backgroundColor: "#ffffff" }}
                      className="w-full bg-white border border-slate-300 text-slate-900 font-bold text-sm rounded-xl pl-12 pr-4 py-3 focus:outline-none focus:border-[#FF5B00] focus:ring-1 focus:ring-[#FF5B00] transition-all"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isTruecallerSubmitting || truecallerMobile.length < 10}
                  className="w-full bg-[#0087FF] hover:bg-[#006ACC] disabled:opacity-50 text-white font-black text-sm py-3.5 px-5 rounded-xl flex items-center justify-center space-x-2 active:scale-98 transition-all shadow-sm cursor-pointer"
                >
                  <span>{isTruecallerSubmitting ? "Verifying…" : "Verify & Continue"}</span>
                  {!isTruecallerSubmitting && <ArrowRight className="w-4 h-4 stroke-[3]" />}
                </button>
              </form>

              <div className="flex items-center justify-center space-x-1.5 text-[11px] font-medium text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Your driver will call this number on delivery</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Smooth Post-Authentication Loading Animation */}
      <AnimatePresence>
        {authSuccessData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[100] bg-[#061838]/95 backdrop-blur-md flex flex-col items-center justify-center p-6 select-none"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ type: "spring", damping: 22, stiffness: 280 }}
              className="relative flex flex-col items-center text-center max-w-xs"
            >
              {/* Soft pulsing glow behind logo */}
              <motion.div
                animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.65, 0.3] }}
                transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                className="absolute -inset-4 rounded-[36px] bg-[#FF5E00]/30 blur-2xl pointer-events-none"
              />

              {/* Brand Logo Squircle + Green Check Badge */}
              <div className="relative w-20 h-20 rounded-[24px] bg-[#061838] border-2 border-white/25 shadow-[0_12px_36px_rgba(0,0,0,0.6)] flex items-center justify-center p-4">
                <img src="/dashit-mark-white.png" alt="DASHIT" className="w-full h-full object-contain" />
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 400, damping: 20 }}
                  className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-emerald-500 border-2 border-[#061838] flex items-center justify-center shadow-md"
                >
                  <Check className="w-4 h-4 text-white stroke-[3]" />
                </motion.div>
              </div>

              {/* Heading */}
              <motion.h2
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="mt-6 text-xl font-black text-white tracking-tight"
              >
                Welcome to DASHIT!
              </motion.h2>

              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
                className="text-xs font-semibold text-white/75 mt-1"
              >
                {authSuccessData.name ? `Signed in as ${authSuccessData.name}` : "Verified successfully"}
              </motion.p>

              {/* Spinner pill */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.35 }}
                className="mt-5 flex items-center space-x-2 text-xs font-bold text-amber-300 bg-white/10 px-4 py-1.5 rounded-full border border-white/15"
              >
                <div className="w-3.5 h-3.5 border-2 border-amber-300 border-t-transparent rounded-full animate-spin" />
                <span>Taking you to the store…</span>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Interactive Map Modal */}
      <InteractiveMapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        onConfirmLocation={(loc) => {
          const newArea = loc.area || area || "Nai Basti";
          const newFlat = loc.address ? loc.address.split(",")[0].trim() : (flatNo || "House #12");
          const newCity = loc.city || city || "Anantnag";
          const newPincode = loc.pincode || pincode || "192101";
          const fullAddress = `${newFlat}, ${newArea}, ${newCity} - ${newPincode}`;
          if (newArea) setArea(newArea);
          if (newFlat) setFlatNo(newFlat);
          if (newCity) setCity(newCity);
          if (newPincode) setPincode(newPincode);
          try {
            localStorage.setItem(
              "dashit_user_address",
              JSON.stringify({
                nickname: "HOME",
                address: fullAddress,
                area: newArea,
                lat: loc.lat || 33.735832,
                lng: loc.lng || 75.143614,
                city: newCity,
                pincode: newPincode,
              })
            );
            window.dispatchEvent(new Event("dashit_address_updated"));
          } catch (e) {}
        }}
      />
    </div>
  );
}
