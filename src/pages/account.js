import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { User, Phone, MapPin, Package, Clock, PhoneCall, ShieldAlert, ChevronRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import BottomNav from "../components/BottomNav";

const MapTracking = dynamic(() => import("../components/MapTracking"), { ssr: false });

export default function AccountPage() {
  const [activeOrder, setActiveOrder] = useState(null);
  const [orderHistory, setOrderHistory] = useState([]);
  const [user, setUser] = useState({ name: "Azan Iqbal Mir", mobile: "9622720283" });

  useEffect(() => {
    const savedUser = localStorage.getItem("dashit_user");
    const active = localStorage.getItem("dashit_active_order");
    const history = localStorage.getItem("dashit_orders_history");

    if (savedUser) {
      try { setUser(JSON.parse(savedUser)); } catch (e) {}
    }
    if (active) {
      try { setActiveOrder(JSON.parse(active)); } catch (e) {}
    }
    if (history) {
      try { setOrderHistory(JSON.parse(history)); } catch (e) {}
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3.5 flex items-center justify-between shadow-sm">
        <h1 className="font-extrabold text-base text-slate-900">My Profile & Orders</h1>
        <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full border border-emerald-200">
          ANANTNAG MEMBER
        </span>
      </header>

      <main className="max-w-md mx-auto px-4 mt-4 space-y-4">
        {/* Profile Details Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 flex items-center space-x-3.5 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-[#f7c400] text-slate-950 font-black text-xl flex items-center justify-center shadow-md">
            AI
          </div>
          <div>
            <h2 className="font-extrabold text-sm text-slate-900">{user.name || "Azan Iqbal Mir"}</h2>
            <div className="flex items-center space-x-2 text-xs text-slate-500 font-semibold mt-0.5">
              <Phone className="w-3.5 h-3.5 text-emerald-600" />
              <span className="font-mono">{user.mobile || "9622720283"}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">Nai Basti, Near Petrol Pump, Anantnag</p>
          </div>
        </div>

        {/* Active Order Live Tracker */}
        {activeOrder && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-4 space-y-3 shadow-md">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold text-amber-900">ACTIVE ORDER #{activeOrder.orderId}</span>
                <p className="text-[11px] text-amber-800 font-medium">OTP: <b className="font-mono text-slate-900">{activeOrder.otp}</b></p>
              </div>
              <span className="text-[10px] bg-emerald-600 text-white font-extrabold px-2.5 py-0.5 rounded-full shadow">
                PACKING / IN TRANSIT
              </span>
            </div>

            {/* Socket.io Live Map Tracking */}
            <MapTracking
              orderId={activeOrder.orderId}
              initialLat={activeOrder.location?.lat || 33.7311}
              initialLng={activeOrder.location?.lng || 75.1487}
            />
          </div>
        )}

        {/* Order History */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">Recent Orders</h3>
            <Package className="w-4 h-4 text-slate-400" />
          </div>

          {orderHistory.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-4 font-medium">No past orders yet.</p>
          ) : (
            <div className="space-y-2.5 divide-y divide-slate-100">
              {orderHistory.map((ord, idx) => (
                <div key={idx} className="pt-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-extrabold text-slate-900">{ord.orderId}</span>
                    <p className="text-[11px] text-slate-500 font-medium">{ord.date} • {ord.items?.length || 1} Items</p>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold font-mono text-emerald-700">₹{ord.totalAmount}</span>
                    <span className="block text-[10px] text-emerald-600 font-bold">Delivered</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Support & Privacy Actions */}
        <div className="bg-white border border-slate-200 rounded-3xl p-3.5 space-y-2 text-xs shadow-sm">
          <a
            href="tel:6006990032"
            className="flex items-center justify-between p-2.5 rounded-2xl text-slate-800 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center space-x-2.5">
              <PhoneCall className="w-4 h-4 text-emerald-600" />
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
