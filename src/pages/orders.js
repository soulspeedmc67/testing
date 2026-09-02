import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { Package, Clock, ArrowLeft, CheckCircle2, ChevronRight, PhoneCall, ShoppingBag, X } from "lucide-react";
import confetti from "canvas-confetti";
import BottomNav from "../components/BottomNav";

const MapTracking = dynamic(() => import("../components/MapTracking"), { ssr: false });

export default function OrdersPage() {
  const router = useRouter();
  const [activeOrder, setActiveOrder] = useState(null);
  const [cancellationSeconds, setCancellationSeconds] = useState(60); // 1-minute window
  const [orderHistory, setOrderHistory] = useState([]);
  const [showPastOrdersModal, setShowPastOrdersModal] = useState(false);

  useEffect(() => {
    const active = localStorage.getItem("dashit_active_order");
    const history = localStorage.getItem("dashit_orders_history");

    if (active) {
      try { setActiveOrder(JSON.parse(active)); } catch (e) {}
    }
    if (history) {
      try { setOrderHistory(JSON.parse(history)); } catch (e) {}
    }

    if (router.query.viewPast === "true") {
      setShowPastOrdersModal(true);
    }
  }, [router.query]);

  useEffect(() => {
    let timer;
    if (activeOrder && cancellationSeconds > 0) {
      timer = setInterval(() => setCancellationSeconds((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [activeOrder, cancellationSeconds]);

  const handleCancelOrder = () => {
    if (confirm("Are you sure you want to cancel this order? The 1-minute packing window is active.")) {
      localStorage.removeItem("dashit_active_order");
      setActiveOrder(null);
      alert("Order cancelled successfully.");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <Link href="/" className="p-1 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-extrabold text-base text-slate-900">My Orders</h1>
        </div>

        {/* Dedicated Past Orders Button */}
        <button
          onClick={() => setShowPastOrdersModal(true)}
          className="flex items-center space-x-1 text-xs text-[#0c831f] bg-emerald-50 hover:bg-[#0c831f] hover:text-white px-3 py-1.5 rounded-full border border-emerald-200 font-bold transition-all shadow-sm active:scale-95"
        >
          <Package className="w-3.5 h-3.5" />
          <span>Past Orders ({orderHistory.length})</span>
        </button>
      </header>

      <main className="max-w-md mx-auto px-4 mt-4 space-y-4">
        {/* ACTIVE ORDER PACKING & TRACKING CARD (1-MINUTE WINDOW) */}
        {activeOrder ? (
          <div className="bg-amber-50/90 border-2 border-amber-400 rounded-3xl p-4 space-y-4 shadow-md animate-slide-up">
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
                  ? `${cancellationSeconds}s`
                  : "Packed"}
              </span>
            </div>

            {/* 1-Minute Window Info Box */}
            <div className="bg-white rounded-2xl p-3.5 text-xs space-y-1.5 border border-amber-200 shadow-sm">
              <div className="flex items-center space-x-1.5 text-slate-900 font-extrabold">
                <span className="text-amber-500">⚡</span>
                <span>1-Minute Edit & Cancel Window Active</span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                {cancellationSeconds > 0
                  ? "Your order is being packed right now in the Anantnag darkstore! You can add more items to your cart or cancel before the 1-minute packing window expires."
                  : "Order packing complete! Darkstore admin dispatching runner."}
              </p>
            </div>

            {/* Order Items Breakdown */}
            <div className="bg-white rounded-2xl p-3 text-xs space-y-2 border border-slate-200">
              <h4 className="font-extrabold text-slate-400 text-[10px] uppercase tracking-wider">Order Items ({activeOrder.items?.length || 1})</h4>
              <div className="space-y-1.5 divide-y divide-slate-100">
                {activeOrder.items?.map((item, idx) => (
                  <div key={idx} className="pt-1.5 flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-[11px]">{item.name} x {item.qty}</span>
                    <span className="font-mono text-slate-900 font-bold text-[11px]">₹{item.price * item.qty}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2 pt-0.5">
              <Link
                href="/"
                className="grow bg-[#0c831f] hover:bg-emerald-800 text-white text-center text-xs font-extrabold py-3 rounded-2xl transition-all shadow-md active:scale-95"
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

            {/* Live Socket.io Map Tracking (Shown after 1-minute window) */}
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
        ) : (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-3 shadow-sm">
            <Package className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-extrabold text-sm text-slate-800">No Active Orders</h3>
            <p className="text-xs text-slate-500 font-medium">When you place an order, its live 1-minute darkstore processing status will appear here.</p>
            <Link
              href="/"
              className="inline-block bg-[#0c831f] text-white font-extrabold text-xs px-5 py-2.5 rounded-2xl shadow-md hover:bg-emerald-800 transition-colors"
            >
              Start Shopping
            </Link>
          </div>
        )}
      </main>

      {/* PAST ORDERS MODAL SHEET */}
      {showPastOrdersModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end justify-center sm:items-center p-0 sm:p-4 animate-fade-in">
          <div className="bg-white rounded-t-[32px] sm:rounded-3xl w-full max-w-md max-h-[80vh] overflow-y-auto p-6 space-y-4 shadow-2xl border border-slate-100 animate-bottom-sheet scrollbar-none">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <Package className="w-5 h-5 text-[#0c831f]" />
                <h2 className="font-black text-base text-slate-900">Past Orders History</h2>
              </div>
              <button
                onClick={() => setShowPastOrdersModal(false)}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {orderHistory.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-6 font-medium">No past orders found.</p>
            ) : (
              <div className="space-y-3 divide-y divide-slate-100">
                {orderHistory.map((ord, idx) => (
                  <div key={idx} className="pt-3 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-extrabold text-slate-900">{ord.orderId}</span>
                      <span className="font-black font-mono text-[#0c831f]">₹{ord.totalAmount}</span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-semibold">
                      <span>{ord.date} • {ord.items?.length || 1} Items</span>
                      <span className="text-[#0c831f] font-bold">Delivered</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <BottomNav />
    </div>
  );
}
