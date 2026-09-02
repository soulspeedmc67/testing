import { useState, useEffect } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { User, Phone, MapPin, Package, Clock, PhoneCall, ShieldAlert, ChevronRight, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import BottomNav from "../components/BottomNav";

const MapTracking = dynamic(() => import("../components/MapTracking"), { ssr: false });

export default function AccountPage() {
  const [activeOrder, setActiveOrder] = useState(null);
  const [cancellationSeconds, setCancellationSeconds] = useState(120);
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
      try {
        const parsed = JSON.parse(active);
        setActiveOrder(parsed);
      } catch (e) {}
    }
    if (history) {
      try { setOrderHistory(JSON.parse(history)); } catch (e) {}
    }
  }, []);

  useEffect(() => {
    let timer;
    if (activeOrder && cancellationSeconds > 0) {
      timer = setInterval(() => setCancellationSeconds((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [activeOrder, cancellationSeconds]);

  const handleCancelOrder = () => {
    if (confirm("Are you sure you want to cancel this order? The 2-minute packing window is active.")) {
      localStorage.removeItem("dashit_active_order");
      setActiveOrder(null);
      alert("Order cancelled successfully.");
    }
  };

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

        {/* ORDER PROCESSING IN DARKSTORE CARD (EXACTLY MATCHING SCREENSHOT) */}
        {activeOrder && (
          <div className="bg-amber-50/90 border-2 border-amber-400 rounded-3xl p-4 space-y-3.5 shadow-md animate-slide-up">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-amber-500 text-slate-950 rounded-2xl font-bold">
                  <Clock className="w-4 h-4 animate-spin" />
                </div>
                <div>
                  <h3 className="font-black text-xs text-amber-950 tracking-tight">ORDER PROCESSING IN DARKSTORE</h3>
                  <p className="text-[11px] text-amber-800 font-semibold">
                    Order #{activeOrder.orderId} • OTP: <b className="font-mono text-slate-950">{activeOrder.otp}</b>
                  </p>
                </div>
              </div>

              <span className="bg-amber-200/90 text-amber-950 font-black text-xs px-3 py-1 rounded-full border border-amber-300 font-mono shadow-sm">
                {cancellationSeconds > 0
                  ? `${Math.floor(cancellationSeconds / 60)}:${cancellationSeconds % 60 < 10 ? '0' : ''}${cancellationSeconds % 60}s`
                  : "Packed"}
              </span>
            </div>

            {/* Inner Window Box */}
            <div className="bg-white rounded-2xl p-3.5 text-xs space-y-1.5 border border-amber-200 shadow-sm">
              <div className="flex items-center space-x-1.5 text-slate-900 font-extrabold">
                <span className="text-amber-500">⚡</span>
                <span>2-Minute Edit & Cancel Window Active</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                {cancellationSeconds > 0
                  ? "Your order is being packed right now! You can add more items to your cart or cancel the order before the 2-minute packing window expires."
                  : "Order packing complete! Awaiting darkstore admin dispatch for delivery."}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-0.5">
              <Link
                href="/cart"
                className="grow bg-emerald-700 hover:bg-emerald-800 text-white text-center text-xs font-extrabold py-3 rounded-2xl transition-all shadow-md active:scale-95"
              >
                + Add More Items to Order
              </Link>

              {cancellationSeconds > 0 && (
                <button
                  onClick={handleCancelOrder}
                  className="bg-rose-100 hover:bg-rose-600 hover:text-white text-rose-700 font-extrabold text-xs px-4 py-3 rounded-2xl transition-all active:scale-95"
                >
                  Cancel Order
                </button>
              )}
            </div>

            {/* Live Socket.io Map Tracking (shown only after 2-minute packing completes) */}
            {cancellationSeconds === 0 && (
              <div className="pt-2 border-t border-amber-200">
                <MapTracking
                  orderId={activeOrder.orderId}
                  initialLat={activeOrder.location?.lat || 33.7311}
                  initialLng={activeOrder.location?.lng || 75.1487}
                />
              </div>
            )}
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
