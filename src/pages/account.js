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
  Gift,
  Phone,
  Moon,
  Shield,
  Check,
  X
} from "lucide-react";
import BottomNav from "../components/BottomNav";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState({
    name: "Azan Iqbal Mir",
    mobile: "9622720283",
    email: "azan.mir@example.com",
    address: "b-3,jamia appqrtment, Anantnag"
  });
  const [hideSensitive, setHideSensitive] = useState(false);
  const [appearance, setAppearance] = useState("Light");

  useEffect(() => {
    try {
      const savedUser = localStorage.getItem("dashit_user");
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      }
    } catch (e) {}
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

        {/* 4. APPEARANCE CARD matching Screenshot 1 */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-3.5 flex items-center justify-between shadow-xs">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
              <Moon className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-slate-800">Appearance</span>
          </div>

          <div className="bg-slate-100 px-3 py-1.5 rounded-xl flex items-center space-x-1.5 cursor-pointer">
            <span className="text-xs font-extrabold text-slate-700">{appearance}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400 rotate-90" />
          </div>
        </div>

        {/* 5. HIDE SENSITIVE ITEMS CARD matching Screenshot 1 */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs">
          <div className="flex items-start justify-between">
            <div className="pr-4">
              <h3 className="text-xs font-bold text-slate-900">Hide sensitive items</h3>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5 leading-snug">
                Sexual wellness, nicotine products and other sensitive items will be hidden
              </p>
              <button
                type="button"
                onClick={() => alert("Sensitive items filtering enabled across all categories.")}
                className="text-[11px] font-bold text-emerald-700 underline underline-offset-2 mt-1 block"
              >
                Know more
              </button>
            </div>

            {/* Toggle Switch */}
            <button
              type="button"
              onClick={() => setHideSensitive(!hideSensitive)}
              className={`w-11 h-6 rounded-full p-0.5 transition-colors shrink-0 mt-1 ${
                hideSensitive ? "bg-[#0c831f]" : "bg-slate-200"
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                  hideSensitive ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
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
            <div
              onClick={() => alert("Your wishlist is empty")}
              className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors cursor-pointer group"
            >
              <div className="flex items-center space-x-3.5">
                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
                  <Heart className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-800">Your wishlist</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>

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

            {/* E-gift cards with red notification dot matching Screenshot 1 */}
            <div
              onClick={() => alert("E-gift cards store")}
              className="flex items-center justify-between p-3.5 hover:bg-slate-50 transition-colors cursor-pointer group"
            >
              <div className="flex items-center space-x-3.5">
                <div className="relative w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-700">
                  <Gift className="w-4 h-4" />
                  <span className="absolute top-0 right-0 w-2 h-2 rounded-full bg-red-500" />
                </div>
                <span className="text-xs font-bold text-slate-800">E-gift cards</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </div>

            {/* Appearance / Dark Mode */}
            <div className="flex items-center justify-between p-3.5 border-t border-slate-100 dark:border-zinc-800">
              <div className="flex items-center space-x-3.5">
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-700 dark:text-zinc-300">
                  <Moon className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 dark:text-zinc-200">Dark Mode</span>
              </div>
              <div className="flex items-center space-x-1 bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => {
                    setAppearance("Light");
                    localStorage.setItem("dashit_theme", "light");
                    document.documentElement.classList.remove("dark");
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                    appearance === "Light" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500"
                  }`}
                >
                  Off
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAppearance("Dark");
                    localStorage.setItem("dashit_theme", "dark");
                    document.documentElement.classList.add("dark");
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                    appearance === "Dark" ? "bg-[#0c831f] text-white shadow-2xs" : "text-slate-500"
                  }`}
                >
                  On
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
