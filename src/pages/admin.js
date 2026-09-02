import { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, Power, Package, Truck, CheckCircle2, RefreshCw, ShieldAlert, Tag, Clock, IndianRupee, Users, ArrowUpRight } from "lucide-react";

export default function EasyAdminDashboard() {
  const [isStoreOpen, setIsStoreOpen] = useState(true);
  const [orders, setOrders] = useState([]);
  const [codBlacklist, setCodBlacklist] = useState(["9876543210"]);
  const [newBlacklistNumber, setNewBlacklistNumber] = useState("");
  const [customCoupon, setCustomCoupon] = useState("");

  useEffect(() => {
    const history = localStorage.getItem("dashit_orders_history");
    const active = localStorage.getItem("dashit_active_order");
    let combined = [];
    if (active) {
      try { combined.push(JSON.parse(active)); } catch (e) {}
    }
    if (history) {
      try {
        const hist = JSON.parse(history);
        combined = [...combined, ...hist];
      } catch (e) {}
    }
    if (combined.length === 0) {
      combined = [
        {
          orderId: "DASH-511421",
          date: "Today, 6:24 PM",
          items: [{ name: "Kashmiri Lavas Bread (4 pcs)", qty: 2, price: 30 }, { name: "Amul Milk 1L", qty: 1, price: 66 }],
          totalAmount: 126,
          paymentMethod: "upi",
          status: "Packing",
          otp: "4152",
          customerName: "Azan Iqbal Mir",
          mobile: "9622720283",
          address: "Nai Basti, Near Petrol Pump, Anantnag"
        }
      ];
    }
    setOrders(combined);
  }, []);

  const updateOrderStatus = (orderId, newStatus) => {
    const updated = orders.map((o) => (o.orderId === orderId ? { ...o, status: newStatus } : o));
    setOrders(updated);

    const targetOrder = updated.find((o) => o.orderId === orderId);
    if (targetOrder) {
      localStorage.setItem("dashit_active_order", JSON.stringify(targetOrder));
    }
    alert(`Order #${orderId} status updated to: ${newStatus}`);
  };

  const handleAddBlacklist = (e) => {
    e.preventDefault();
    if (newBlacklistNumber.length === 10) {
      setCodBlacklist([...codBlacklist, newBlacklistNumber]);
      setNewBlacklistNumber("");
      alert(`Mobile number ${newBlacklistNumber} added to COD Blacklist!`);
    }
  };

  const totalRevenue = orders.reduce((s, o) => s + (o.totalAmount || 0), 0);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 font-sans p-4 sm:p-6">
      <div className="max-w-3xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between bg-white p-4 rounded-3xl shadow-sm border border-slate-200">
          <div className="flex items-center space-x-3">
            <Link href="/" className="p-2 bg-slate-100 rounded-2xl text-slate-700 hover:bg-slate-200">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="font-black text-lg text-slate-900 tracking-tight">DASHit Darkstore Admin Desk</h1>
              <p className="text-xs text-slate-500 font-medium">Anantnag Store #01 Manager</p>
            </div>
          </div>

          {/* Master Store Power Switch */}
          <button
            onClick={() => setIsStoreOpen(!isStoreOpen)}
            className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl font-black text-xs shadow-md transition-all ${
              isStoreOpen ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
            }`}
          >
            <Power className="w-4 h-4" />
            <span>{isStoreOpen ? "STORE OPEN" : "STORE CLOSED"}</span>
          </button>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase">Today's Orders</span>
            <div className="text-2xl font-black text-slate-900 font-mono">{orders.length}</div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase">Total Revenue</span>
            <div className="text-2xl font-black text-emerald-700 font-mono">₹{totalRevenue}</div>
          </div>

          <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-1">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase">Riders Online</span>
            <div className="text-2xl font-black text-sky-700 font-mono">4 Riders</div>
          </div>
        </div>

        {/* Live Order Queue & Dispatch Desk */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="font-black text-sm text-slate-900 tracking-tight flex items-center space-x-2">
              <Package className="w-4 h-4 text-emerald-600" />
              <span>Live Order Dispatch Desk</span>
            </h2>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-3 py-1 rounded-full">
              AUTO-SYNCED
            </span>
          </div>

          <div className="space-y-4">
            {orders.map((ord) => (
              <div key={ord.orderId} className="bg-slate-50 border border-slate-200 rounded-3xl p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-sm text-slate-900">{ord.orderId}</span>
                      <span className="bg-amber-200 text-amber-950 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full font-mono">
                        OTP: {ord.otp}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 font-medium mt-0.5">
                      Customer: <b className="text-slate-900">{ord.customerName || "Azan Iqbal Mir"}</b> ({ord.mobile || "9622720283"})
                    </p>
                    <p className="text-[11px] text-slate-500">{ord.address || "Nai Basti, Anantnag"}</p>
                  </div>

                  <span className={`text-xs font-black px-3 py-1 rounded-full ${
                    ord.status === "Delivered" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900 animate-pulse"
                  }`}>
                    STATUS: {ord.status.toUpperCase()}
                  </span>
                </div>

                {/* Items Summary */}
                <div className="bg-white p-3 rounded-2xl border border-slate-200 text-xs space-y-1 font-medium">
                  {ord.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-slate-700">
                      <span>• {item.name} x {item.qty}</span>
                      <span className="font-mono font-bold">₹{item.price * item.qty}</span>
                    </div>
                  ))}
                  <div className="pt-1.5 border-t border-slate-100 flex justify-between font-black text-slate-900">
                    <span>Total Amount</span>
                    <span className="text-emerald-700 font-mono">₹{ord.totalAmount}</span>
                  </div>
                </div>

                {/* Dispatch Action Buttons */}
                <div className="grid grid-cols-3 gap-2 pt-1">
                  <button
                    onClick={() => updateOrderStatus(ord.orderId, "Packing")}
                    className={`py-2.5 text-xs font-extrabold rounded-2xl border transition-all ${
                      ord.status === "Packing" ? "bg-amber-500 text-slate-950 border-amber-600 shadow-md" : "bg-white text-slate-700 border-slate-200 hover:bg-amber-50"
                    }`}
                  >
                    1. Packing
                  </button>

                  <button
                    onClick={() => updateOrderStatus(ord.orderId, "Out for Delivery")}
                    className={`py-2.5 text-xs font-extrabold rounded-2xl border transition-all ${
                      ord.status === "Out for Delivery" ? "bg-sky-600 text-white border-sky-700 shadow-md" : "bg-white text-slate-700 border-slate-200 hover:bg-sky-50"
                    }`}
                  >
                    2. Dispatch (Out)
                  </button>

                  <button
                    onClick={() => updateOrderStatus(ord.orderId, "Delivered")}
                    className={`py-2.5 text-xs font-extrabold rounded-2xl border transition-all ${
                      ord.status === "Delivered" ? "bg-emerald-600 text-white border-emerald-700 shadow-md" : "bg-white text-slate-700 border-slate-200 hover:bg-emerald-50"
                    }`}
                  >
                    3. Delivered
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Admin Tools: COD Blacklist & Coupon Generator */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* COD Blacklist Manager */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-black text-xs text-slate-900 flex items-center space-x-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>COD Blacklist Manager</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">Prevent fake COD orders by blocking habitual fake customer numbers.</p>

            <form onSubmit={handleAddBlacklist} className="flex space-x-2">
              <input
                type="tel"
                maxLength={10}
                placeholder="Mobile number..."
                value={newBlacklistNumber}
                onChange={(e) => setNewBlacklistNumber(e.target.value)}
                className="bg-slate-50 border border-slate-300 rounded-2xl px-3 py-2 text-xs font-bold text-slate-900 grow focus:outline-none focus:border-rose-500"
              />
              <button type="submit" className="bg-rose-600 text-white font-extrabold text-xs px-3 py-2 rounded-2xl hover:bg-rose-700">
                Block
              </button>
            </form>

            <div className="space-y-1 pt-1">
              {codBlacklist.map((num, idx) => (
                <div key={idx} className="bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl flex justify-between items-center text-xs">
                  <span className="font-mono font-bold text-rose-900">+91 {num}</span>
                  <span className="text-[10px] font-bold text-rose-600">COD Blocked</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Promo Coupon Generator */}
          <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="font-black text-xs text-slate-900 flex items-center space-x-1.5">
              <Tag className="w-4 h-4 text-emerald-600" />
              <span>Promo Coupon Generator</span>
            </h3>
            <p className="text-[11px] text-slate-500 font-medium">Create instant discount codes for marketing campaigns.</p>

            <div className="space-y-2">
              <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-2xl text-xs space-y-1">
                <span className="font-black text-emerald-900">ACTIVE CODE: ANANTNAG10</span>
                <p className="text-[11px] text-emerald-700 font-medium">Flat ₹20 OFF on orders above ₹150</p>
              </div>

              <button
                onClick={() => {
                  const code = prompt("Enter new promo code name:", "EID50");
                  if (code) alert(`Promo code ${code.toUpperCase()} activated for customer store!`);
                }}
                className="w-full bg-emerald-600 text-white font-extrabold text-xs py-2.5 rounded-2xl hover:bg-emerald-700 transition-colors"
              >
                + Create New Promo Code
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
