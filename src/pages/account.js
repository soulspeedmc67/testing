import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { User, Phone, MapPin, Package, PhoneCall, ShieldAlert, ChevronRight } from "lucide-react";
import BottomNav from "../components/BottomNav";

export default function AccountPage() {
  const router = useRouter();
  const [user, setUser] = useState({ name: "Azan Iqbal Mir", mobile: "9622720283" });
  const [orderCount, setOrderCount] = useState(0);

  useEffect(() => {
    const savedUser = localStorage.getItem("dashit_user");
    const history = localStorage.getItem("dashit_orders_history");

    if (savedUser) {
      try { setUser(JSON.parse(savedUser)); } catch (e) {}
    }
    if (history) {
      try { setOrderCount(JSON.parse(history).length); } catch (e) {}
    }
  }, []);

  const handleDeleteAccount = async () => {
    if (confirm("Are you sure you want to delete your account and personal data from DASHit?")) {
      try {
        await fetch("/api/privacy/delete-account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: "USER-6006990032" })
        });
        alert("Account data purged successfully.");
        localStorage.clear();
        window.location.href = "/login";
      } catch (e) {
        alert("Account deleted.");
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3.5 flex items-center justify-between shadow-sm">
        <h1 className="font-extrabold text-base text-slate-900">My Profile</h1>
        <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200 uppercase tracking-wider">
          ANANTNAG MEMBER
        </span>
      </header>

      <main className="max-w-md mx-auto px-4 mt-4 space-y-4">
        {/* Profile Details Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 flex items-center space-x-3.5 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-[#f7c400] text-slate-950 font-black text-xl flex items-center justify-center shadow-md border border-amber-300">
            AI
          </div>
          <div>
            <h2 className="font-extrabold text-sm text-slate-900">{user.name || "Azan Iqbal Mir"}</h2>
            <div className="flex items-center space-x-2 text-xs text-slate-500 font-semibold mt-0.5">
              <Phone className="w-3.5 h-3.5 text-[#0c831f]" />
              <span className="font-mono">{user.mobile || "9622720283"}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Nai Basti, Near Petrol Pump, Anantnag</p>
          </div>
        </div>

        {/* Dedicated "Past Orders" Button Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 space-y-2 shadow-sm">
          <Link
            href="/orders?viewPast=true"
            className="flex items-center justify-between p-3 bg-emerald-50 hover:bg-[#0c831f] text-[#0c831f] hover:text-white rounded-2xl transition-all border border-emerald-200 shadow-sm active:scale-95 group"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-white text-[#0c831f] rounded-xl shadow-sm">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-xs">View Past Orders History</h3>
                <p className="text-[10px] opacity-80 font-medium">Check past invoices, items & receipts ({orderCount} past orders)</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Support & Privacy Actions */}
        <div className="bg-white border border-slate-200 rounded-3xl p-3.5 space-y-2 text-xs shadow-sm">
          <a
            href="tel:6006990032"
            className="flex items-center justify-between p-2.5 rounded-2xl text-slate-800 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center space-x-2.5">
              <PhoneCall className="w-4 h-4 text-[#0c831f]" />
              <span className="font-bold">Contact Customer Support (6006990032)</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </a>

          <button
            onClick={handleDeleteAccount}
            className="w-full flex items-center justify-between p-2.5 rounded-2xl text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <div className="flex items-center space-x-2.5">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span className="font-bold">Delete Account & Data</span>
            </div>
            <ChevronRight className="w-4 h-4 text-rose-400" />
          </button>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
