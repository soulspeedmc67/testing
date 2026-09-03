import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
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
  Shield,
  Check,
  X
} from "lucide-react";
import BottomNav from "../components/BottomNav";
import { getWishlist } from "../lib/wishlist";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState({
    name: "Azan Iqbal Mir",
    mobile: "9622720283",
    email: "azan.mir@example.com",
    address: "b-3,jamia appqrtment, Anantnag"
  });
  const [wishlistCount, setWishlistCount] = useState(0);

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("dashit_user");
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {}

    const syncWishlist = () => {
      setWishlistCount(getWishlist().length);
    };
    syncWishlist();
    window.addEventListener("dashit_wishlist_updated", syncWishlist);
    return () => window.removeEventListener("dashit_wishlist_updated", syncWishlist);
  }, []);

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-900 font-sans pb-32">
      {/* 1. TOP PROFILE HEADER matching Screenshot 1 */}
      <header className="bg-white px-4 pt-[max(12px,env(safe-area-inset-top,12px))] pb-3 flex items-center sticky top-0 z-30 border-b border-slate-100">
        <button
          type="button"
          onClick={() => router.back()}
          className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-700 active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
        <h1 className="text-base font-extrabold text-slate-900 mx-auto -translate-x-5">
          Profile
        </h1>
      </header>

      <main className="max-w-md mx-auto px-4 pt-3 space-y-4">
        {/* 2. YOUR ACCOUNT TITLE & PHONE matching Screenshot 1 */}
        <div className="pt-1">
          <h2 className="text-xl font-black text-slate-900 tracking-tight">Your account</h2>
          <div className="flex items-center space-x-1.5 text-xs text-slate-600 font-semibold mt-1">
            <Phone className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-mono font-bold">+91-{user.mobile || "9622720283"}</span>
          </div>
        </div>

        {/* 3. TWO SHORTCUT CARDS (Wallet removed) */}
        <div className="grid grid-cols-2 gap-3">
          <a
            href="tel:6006990032"
            className="bg-white border border-slate-200/90 rounded-2xl p-3.5 flex flex-col items-center justify-center text-center shadow-xs active:scale-95 transition-all"
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 mb-2">
              <Headphones className="w-6 h-6 stroke-[1.8]" />
            </div>
            <span className="text-xs font-bold text-slate-800">Support</span>
          </a>

          <div
            onClick={() => alert("Payments & Saved Cards")}
            className="bg-white border border-slate-200/90 rounded-2xl p-3.5 flex flex-col items-center justify-center text-center cursor-pointer shadow-xs active:scale-95 transition-all"
          >
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-700 mb-2">
              <CreditCard className="w-6 h-6 stroke-[1.8]" />
            </div>
            <span className="text-xs font-bold text-slate-800">Payments</span>
          </div>
        </div>

        {/* 6. YOUR INFORMATION GROUP matching Screenshot 1 */}
        <div className="pt-2">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 block mb-2">
            Your Information
          </span>

          <div className="bg-white border border-slate-200/90 rounded-3xl divide-y divide-slate-100 shadow-xs overflow-hidden">
            {/* Your orders */}
            <Link
              href="/orders?viewPast=true"
              className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors group"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
                  <ShoppingBag className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-800">Your orders</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            {/* Your wishlist */}
            <Link
              href="/wishlist"
              className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors group"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-500">
                  <Heart className="w-4 h-4 fill-rose-500 text-rose-500" />
                </div>
                <div>
                  <span className="text-xs font-bold text-slate-800">Your wishlist</span>
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
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>

            {/* Bookmarked recipes */}
            <div
              onClick={() => alert("No bookmarked recipes yet")}
              className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors cursor-pointer group"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
                  <BookOpen className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-800">Bookmarked recipes</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>

            {/* Your prescriptions */}
            <div
              onClick={() => alert("Upload prescription at checkout")}
              className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors cursor-pointer group"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-800">Your prescriptions</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>

            {/* Address book */}
            <Link
              href="/add-address"
              className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors group"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-800">Address book</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </Link>

            {/* GST details */}
            <div
              onClick={() => alert("GST details management")}
              className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors cursor-pointer group"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
                  <FileText className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-800">GST details</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
