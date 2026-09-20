import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import SEO from "../components/SEO";
import {
  ChevronLeft,
  ChevronRight,
  Headphones,
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
              <div className="w-12 h-12 rounded-2xl bg-orange-100 border border-orange-200 flex items-center justify-center text-[#FF5B00] font-black text-lg shadow-2xs">
                {(user.name || "U")[0].toUpperCase()}
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#FF5B00] rounded-3xl p-5 text-white shadow-sm space-y-3.5">
            <div className="flex items-center space-x-3.5">
              <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shrink-0">
                <User className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-white leading-tight">Welcome to DASHIT</h2>
                <p className="text-xs text-white/90 font-medium mt-0.5">8-minute groceries in Anantnag</p>
              </div>
            </div>
            <p className="text-xs text-white/85 leading-relaxed font-medium">
              Log in or create an account to view your live orders, saved addresses, and enjoy rapid delivery.
            </p>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="w-full bg-white text-[#FF5B00] hover:bg-orange-50 font-black text-xs py-3 px-4 rounded-xl flex items-center justify-center space-x-2 shadow-xs active:scale-[0.98] transition-all cursor-pointer"
            >
              <span>Log In / Sign Up</span>
              <ChevronRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        )}

        {/* 3. TWO SHORTCUT CARDS (Wallet removed) */}
        {/* Payments tile removed: it opened an alert() and did nothing.
            Both stores treat non-functional placeholder UI as a rejection. */}
        <div className="grid grid-cols-1 gap-3">
          <a
            href="tel:6006990032"
            className="bg-white border border-slate-200/90 rounded-2xl p-3.5 flex flex-col items-center justify-center text-center shadow-xs active:scale-95 transition-all dark:bg-surface-raised dark:border-line/90"
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 mb-2 dark:text-content-secondary">
              <Headphones className="w-6 h-6 stroke-[1.8]" />
            </div>
            <span className="text-xs font-bold text-slate-800 dark:text-content">Support</span>
          </a>

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
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 dark:bg-surface-muted">
                  <ShoppingBag className="w-4 h-4" />
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
                <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
                  <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800 dark:text-content">Your wishlist</span>
                  {wishlistCount > 0 && (
                    <span className="text-[10px] font-bold text-rose-600 block">
                      {wishlistCount} {wishlistCount === 1 ? "item" : "items"} saved
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-1.5">
                {wishlistCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-rose-100 text-rose-700 text-[10px] font-black flex items-center justify-center">
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
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 dark:bg-surface-muted">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-content">Address book</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform dark:text-content-faint" />
            </Link>

            {/* Legal. Both stores require these to be reachable from inside the
                app, and Apple rejects a build where they are unclickable text. */}
            <button
              type="button"
              onClick={() => router.push("/privacy")}
              className="w-full flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors group border-t border-slate-100 text-left cursor-pointer dark:hover:bg-surface-muted dark:border-line-soft"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 dark:bg-surface-muted">
                  <FileText className="w-4 h-4" />
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
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 dark:bg-surface-muted">
                  <BookOpen className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-content">Terms of Service</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform dark:text-content-faint" />
            </button>

            {/* Auth Action: Log Out (if logged in) or Log In (if guest) */}
            {user && user.isLoggedIn ? (
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  setUser(null);
                  router.push("/login");
                }}
                className="w-full flex items-center justify-between p-3.5 hover:bg-rose-50/60 transition-colors cursor-pointer group border-t border-slate-100 text-left text-rose-600 dark:border-line-soft"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
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

            {/* Account deletion — required by Google Play and the App Store.
                The privacy policy previously promised this control and pointed
                at an API route that static export disables, so nothing existed. */}
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
                className="w-full flex items-center justify-between p-3.5 hover:bg-rose-50/60 transition-colors cursor-pointer group border-t border-slate-100 text-left text-rose-600 disabled:opacity-50 dark:border-line-soft"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
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
                className="w-full flex items-center justify-between p-3.5 hover:bg-orange-50/60 transition-colors cursor-pointer group border-t border-slate-100 text-left text-[#FF5B00] dark:border-line-soft"
              >
                <div className="flex items-center space-x-3.5">
                  <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center text-[#FF5B00]">
                    <User className="w-4 h-4" />
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

        {/* App Version & Branding Footer (above bottom navbar with pb-36 main clearance) */}
        <div className="text-center pt-2 pb-6 space-y-1">
          <p className="text-[11px] font-bold text-slate-400 dark:text-content-faint">DASHIT Quick Commerce • Anantnag</p>
          <p className="text-[10px] font-medium text-slate-400 dark:text-content-faint">App version 1.0.0</p>
        </div>
      </main>
    </div>
  );
}
