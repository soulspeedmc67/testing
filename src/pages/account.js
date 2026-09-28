import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import SEO from "../components/SEO";
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  ShoppingBag,
  Heart,
  BookOpen,
  FileText,
  MapPin,
  Phone,
  Check,
  X,
  Sparkles,
  LogOut,
  User,
  Trash2,
  LifeBuoy,
} from "lucide-react";
import BottomNav from "../components/BottomNav";
import AppearanceSetting from "../components/AppearanceSetting";
import { signOut } from "../lib/api";
import { deleteAccount } from "../lib/auth";
import { getWishlist } from "../lib/wishlist";
import { hapticLight } from "../lib/haptics";
import { goBack } from "../lib/navigation";
import { isIOS } from "../lib/platform";
import { SPRING_SNAPPY } from "../lib/motion";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isSignOutConfirmOpen, setIsSignOutConfirmOpen] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [wishlistCount, setWishlistCount] = useState(0);
  /* The iOS-style edge swipe is opt-in per platform: Android already has a
     system back gesture, and running both makes the screen fire back twice. */
  const [edgeSwipeEnabled, setEdgeSwipeEnabled] = useState(false);

  useEffect(() => {
    setEdgeSwipeEnabled(isIOS());
  }, []);

  useEffect(() => {
    const syncUser = () => {
      try {
        const savedUser = localStorage.getItem("dashit_user");
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        } else {
          setUser(null);
        }
      } catch (e) {
        setUser(null);
      }
    };
    syncUser();
    window.addEventListener("storage", syncUser);

    const syncWishlist = () => {
      setWishlistCount(getWishlist().length);
    };
    syncWishlist();
    window.addEventListener("dashit_wishlist_updated", syncWishlist);
    return () => {
      window.removeEventListener("dashit_wishlist_updated", syncWishlist);
      window.removeEventListener("storage", syncUser);
    };
  }, []);

  /* Navigates back, or lands on Home when this screen was opened directly
     (deep link / notification) and there is no history to pop. */
  const handleBack = () => {
    hapticLight();
    goBack(router, "/shop");
  };

  const handleEdgeDragEnd = (event, info) => {
    if (info.offset.x > 70 || info.velocity.x > 320) {
      handleBack();
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-900 font-sans pb-32 relative dark:bg-surface dark:text-content">
      <SEO title="My Account" noindex={true} />
      {/*
        iOS edge-swipe back. Scoped to a 24px strip at the left edge instead of
        the whole page — dragging the entire screen made ordinary vertical
        scrolling drag the page sideways. The page itself is no longer a drag
        target, and the screen transition is left to _app.js so the two do not
        animate against each other.
      */}
      {edgeSwipeEnabled && (
        <motion.div
          drag="x"
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={{ left: 0, right: 0.6 }}
          dragMomentum={false}
          onDragEnd={handleEdgeDragEnd}
          transition={SPRING_SNAPPY}
          className="absolute left-0 top-0 bottom-0 w-6 z-50 touch-pan-y"
          aria-hidden="true"
        />
      )}

      {/* 1. TOP PROFILE HEADER matching Screenshot 1 */}
      <header className="bg-white px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3 flex items-center sticky top-0 z-30 border-b border-slate-100 dark:bg-surface dark:border-line-soft">
        <button
          type="button"
          onClick={handleBack}
          className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-700 active:scale-95 transition-transform cursor-pointer dark:border-line dark:text-content-secondary"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
        <h1 className="text-base font-extrabold text-slate-900 mx-auto -translate-x-5 dark:text-content">
          Profile
        </h1>
      </header>

      <main className="max-w-md mx-auto px-4 pt-3 pb-36 space-y-4">
        {/* 2. USER PROFILE HEADER OR GUEST WELCOME CARD */}
        {user && user.isLoggedIn ? (
          <div className="pt-1">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight dark:text-content">{user.name || "Your account"}</h2>
                <div className="flex items-center space-x-1.5 text-xs text-slate-600 font-semibold mt-1 dark:text-content-secondary">
                  <Phone className="w-3.5 h-3.5 text-slate-500 dark:text-content-muted" />
                  {user.mobile ? (
                    <span className="font-mono font-bold">+91-{user.mobile.replace(/^\+91/, '')}</span>
                  ) : (
                    <span className="text-slate-400 dark:text-content-faint">Not provided</span>
                  )}
                </div>
                {user.email && (
                  <p className="text-[11px] text-slate-400 font-medium mt-0.5 dark:text-content-faint">{user.email}</p>
                )}
              </div>
              <div className="w-12 h-12 rounded-2xl bg-orange-100 border border-orange-200 flex items-center justify-center text-[#FF5B00] font-black text-lg shadow-2xs dark:bg-orange-950/40 dark:border-orange-900/40">
                {(user.name || "U")[0].toUpperCase()}
              </div>
            </div>
          </div>
        ) : (
          <div className="relative overflow-hidden bg-gradient-to-br from-[#FF6A1A] to-[#D63800] rounded-3xl p-5 text-white shadow-sm">
            <div className="pr-28 min-h-[104px]">
              <h2 className="text-lg font-black tracking-tight text-white leading-tight">Welcome to DASHIT</h2>
              <p className="text-xs text-white/90 font-medium mt-1.5 leading-relaxed">
                Log in to order, track deliveries live and reorder in one tap.
              </p>
            </div>
            <picture>
              <source srcSet="/art/rider-scooter-hero-transparent.webp" type="image/webp" />
              <img
                src="/art/rider-scooter-hero-transparent.png"
                alt=""
                aria-hidden="true"
                width={1142}
                height={1377}
                decoding="async"
                className="absolute right-2 top-2 h-[118px] w-auto object-contain pointer-events-none select-none drop-shadow-[0_8px_18px_rgba(0,0,0,0.3)]"
              />
            </picture>
            <div className="relative grid grid-cols-2 gap-2.5 mt-3">
              <button
                type="button"
                onClick={() => router.push("/login?mode=login")}
                className="bg-white text-[#FF5B00] hover:bg-orange-50 font-black text-sm py-3 rounded-xl shadow-xs active:scale-[0.98] transition-all cursor-pointer dark:bg-surface-raised dark:hover:bg-surface-muted"
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => router.push("/login?mode=signup")}
                className="bg-white/15 hover:bg-white/25 border border-white/45 text-white font-black text-sm py-3 rounded-xl active:scale-[0.98] transition-all cursor-pointer"
              >
                Sign up
              </button>
            </div>
          </div>
        )}

        {/* Help */}
        <div className="pt-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 block mb-2 dark:text-content-faint">
            Help
          </span>
          <div className="bg-white border border-slate-200/90 rounded-3xl divide-y divide-slate-100 shadow-xs overflow-hidden dark:bg-surface-raised dark:border-line/90 dark:divide-line-soft">
            <Link href="/help" className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors group dark:hover:bg-surface-muted">
              <div className="flex items-center space-x-3.5">
                <div className="w-8 h-8 rounded-full bg-orange-50 flex items-center justify-center text-[#FF5B00] dark:bg-orange-950/40">
                  <LifeBuoy className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 block dark:text-content">Help &amp; support</span>
                  <span className="text-[10px] font-medium text-slate-400 dark:text-content-faint">Questions, WhatsApp and email</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform dark:text-content-faint" />
            </Link>
          </div>
        </div>

        <AppearanceSetting />

        {/* 6. YOUR INFORMATION GROUP matching Screenshot 1 */}
        <div className="pt-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 block mb-2 dark:text-content-faint">
            Your Information
          </span>

          <div className="bg-white border border-slate-200/90 rounded-3xl divide-y divide-slate-100 shadow-xs overflow-hidden dark:bg-surface-raised dark:border-line/90 dark:divide-line-soft">
            {/* Your orders */}
            <Link
              href="/orders"
              className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors group dark:hover:bg-surface-muted"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 dark:bg-surface-muted dark:text-white">
                  <ShoppingBag className="w-4 h-4 text-slate-700 dark:text-white" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-content">Your orders</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform dark:text-content-faint" />
            </Link>

            {/* Your wishlist */}
            <Link
              href="/wishlist"
              className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors group dark:hover:bg-surface-muted"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500 dark:bg-rose-950/40">
                  <Heart className="w-4 h-4 fill-rose-500 text-rose-500 dark:text-rose-400 dark:fill-rose-400" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-content">Your wishlist</span>
                  {wishlistCount > 0 && (
                    <span className="text-[10px] font-bold text-rose-600 block dark:text-rose-400">
                      {wishlistCount} {wishlistCount === 1 ? "item" : "items"} saved
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-1.5">
                {wishlistCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black flex items-center justify-center dark:bg-rose-950/60 dark:text-rose-300">
                    {wishlistCount}
                  </span>
                )}
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform dark:text-content-faint" />
              </div>
            </Link>

            {/* Address book */}
            <Link
              href="/add-address"
              className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors group border-t border-slate-100 dark:hover:bg-surface-muted dark:border-line-soft"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 dark:bg-surface-muted dark:text-white">
                  <MapPin className="w-4 h-4 text-slate-700 dark:text-white" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-content">Address book</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform dark:text-content-faint" />
            </Link>

            {/* Legal */}
            <button
              type="button"
              onClick={() => router.push("/privacy")}
              className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors group border-t border-slate-100 text-left cursor-pointer dark:hover:bg-surface-muted dark:border-line-soft"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 dark:bg-surface-muted dark:text-white">
                  <FileText className="w-4 h-4 text-slate-700 dark:text-white" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-content">Privacy Policy</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform dark:text-content-faint" />
            </button>

            <button
              type="button"
              onClick={() => router.push("/terms")}
              className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors group border-t border-slate-100 text-left cursor-pointer dark:hover:bg-surface-muted dark:border-line-soft"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 dark:bg-surface-muted dark:text-white">
                  <BookOpen className="w-4 h-4 text-slate-700 dark:text-white" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-content">Terms &amp; Conditions</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform dark:text-content-faint" />
            </button>

            {/* Auth Action: Log Out (if logged in) or Log In (if guest) */}
            {user && user.isLoggedIn ? (
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  setIsSignOutConfirmOpen(true);
                }}
                className="w-full flex items-center justify-between p-3.5 hover:bg-rose-50/60 transition-colors cursor-pointer group border-t border-slate-100 text-left text-rose-600 dark:hover:bg-rose-950/20 dark:border-line-soft"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 dark:bg-rose-950/40">
                    <LogOut className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-rose-600 block">Log out</span>
                    <span className="text-[10px] font-medium text-slate-400 dark:text-content-faint">Sign in with another account</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ) : null}

            {/* Account deletion */}
            {user && user.isLoggedIn ? (
              <button
                type="button"
                disabled={isDeletingAccount}
                onClick={async () => {
                  const confirmed = window.confirm(
                    "Permanently delete your DASHit account?\n\nYour profile, saved addresses and personal details will be erased. Past order records are kept for statutory accounting, as described in our Privacy Policy.\n\nThis cannot be undone."
                  );
                  if (!confirmed) return;
                  setIsDeletingAccount(true);
                  const res = await deleteAccount();
                  setIsDeletingAccount(false);
                  if (!res.success) {
                    alert(res.message || "Could not delete your account. Please try again.");
                  }
                  setUser(null);
                  router.push("/login");
                }}
                className="w-full flex items-center justify-between p-3.5 hover:bg-rose-50/60 transition-colors cursor-pointer group border-t border-slate-100 text-left text-rose-600 disabled:opacity-50 dark:hover:bg-rose-950/20 dark:border-line-soft"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-600 dark:bg-rose-950/40">
                    <Trash2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-rose-600 block">
                      {isDeletingAccount ? "Deleting account…" : "Delete account"}
                    </span>
                    <span className="text-[10px] font-medium text-slate-400 dark:text-content-faint">
                      Permanently erase your profile and personal data
                    </span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-rose-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="w-full flex items-center justify-between p-3.5 hover:bg-orange-50/60 transition-colors cursor-pointer group border-t border-slate-100 text-left text-[#FF5B00] dark:hover:bg-orange-950/20 dark:border-line-soft"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-[#FF5B00] dark:bg-orange-950/40 dark:text-white">
                    <User className="w-4 h-4 text-[#FF5B00] dark:text-white" />
                  </div>
                  <div>
                    <span className="text-xs font-black text-[#FF5B00] block">Log In / Sign Up</span>
                    <span className="text-[10px] font-medium text-slate-400 dark:text-content-faint">Sign in to sync your orders & addresses</span>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-[#FF5B00] group-hover:translate-x-0.5 transition-transform" />
              </button>
            )}
          </div>
        </div>

        {/* Sign out asks first, in a bottom sheet */}
        <AnimatePresence>
          {isSignOutConfirmOpen && (
            <div className="fixed inset-0 z-[120] flex items-end justify-center">
              <motion.div
                className="absolute inset-0 bg-black/50"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !isSigningOut && setIsSignOutConfirmOpen(false)}
              />
              <motion.div
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="signout-title"
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", stiffness: 420, damping: 40 }}
                className="relative w-full max-w-md bg-white rounded-t-3xl px-5 pt-3 pb-[max(20px,calc(12px+env(safe-area-inset-bottom,0px)))] shadow-2xl dark:bg-surface-raised"
              >
                <span className="mx-auto mb-4 block h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
                <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mb-3 dark:bg-rose-950/40">
                  <LogOut className="w-5 h-5" />
                </div>
                <h2 id="signout-title" className="text-lg font-black text-slate-900 dark:text-content">
                  Sign out of DASHIT?
                </h2>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed dark:text-content-muted">
                  You'll need to log in again to order and to see your orders.
                </p>
                <div className="grid grid-cols-2 gap-2.5 mt-5">
                  <button
                    type="button"
                    disabled={isSigningOut}
                    onClick={() => setIsSignOutConfirmOpen(false)}
                    className="py-3 rounded-2xl border border-slate-200 text-sm font-bold text-slate-700 active:scale-[0.98] transition-transform cursor-pointer dark:border-line dark:text-content-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isSigningOut}
                    onClick={async () => {
                      setIsSigningOut(true);
                      try {
                        await signOut();
                      } finally {
                        setIsSigningOut(false);
                        setIsSignOutConfirmOpen(false);
                        setUser(null);
                        router.push("/login");
                      }
                    }}
                    className="py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-black active:scale-[0.98] transition-transform cursor-pointer disabled:opacity-60"
                  >
                    {isSigningOut ? "Signing out…" : "Sign out"}
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* App Version & Branding Footer (above bottom navbar with pb-36 main clearance) */}
        <div className="text-center pt-2 pb-6 space-y-1">
          <p className="text-[11px] font-bold text-slate-400 dark:text-content-faint">DASHIT Quick Commerce • Anantnag</p>
          <p className="text-[10px] font-medium text-slate-400 dark:text-content-faint">App version 1.0.0</p>
        </div>
      </main>
    </div>
  );
}
