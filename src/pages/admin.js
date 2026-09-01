import { useState } from "react";
import { Package, Power, Tag, ShieldAlert, Users, Activity, Plus, Check, Clock } from "lucide-react";

export default function DashItAdminDashboard() {
  const [storeOpen, setStoreOpen] = useState(true);
  const [bakeryModeOnly, setBakeryModeOnly] = useState(false);
  const [coupons, setCoupons] = useState([
    { code: "ANANTNAG10", discount: 20, uses: 14 },
    { code: "INFLUENCER50", discount: 50, uses: 8 }
  ]);
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponDiscount, setNewCouponDiscount] = useState("");

  const [blacklistedUsers, setBlacklistedUsers] = useState([
    { name: "Sample User (No-Show)", phone: "9876543210", reason: "Failed to pick up call on last delivery" }
  ]);
  const [blacklistPhone, setBlacklistPhone] = useState("");

  const [orders, setOrders] = useState([
    { id: "DASH-98214", customer: "Farooq Ahmad", address: "Main Market, Khannabal", items: 3, total: 171, status: "Paid", driver: "Unassigned", time: "10 mins ago" },
    { id: "DASH-98215", customer: "Zahid Hussain", address: "Civil Lines, Anantnag", items: 5, total: 310, status: "Packing", driver: "Tariq Rider" }
  ]);

  const addCoupon = () => {
    if (newCouponCode && newCouponDiscount) {
      setCoupons([...coupons, { code: newCouponCode.toUpperCase(), discount: Number(newCouponDiscount), uses: 0 }]);
      setNewCouponCode("");
      setNewCouponDiscount("");
    }
  };

  const addBlacklistUser = () => {
    if (blacklistPhone) {
      setBlacklistedUsers([...blacklistedUsers, { name: "User (" + blacklistPhone + ")", phone: blacklistPhone, reason: "Manual COD Blacklist by Admin" }]);
      setBlacklistPhone("");
    }
  };

  const updateStatus = (orderId, newStatus) => {
    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 font-sans max-w-4xl mx-auto space-y-6">
      {/* Admin Top Header with DASHit Brand */}
      <header className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-baseline space-x-1 text-2xl font-extrabold">
            <span className="text-orange-500">DASH</span>
            <span className="text-sky-400">it</span>
            <span className="text-xs text-slate-400 font-normal ml-2">Admin Dashboard • Nai Basti Hub</span>
          </div>
          <p className="text-xs text-slate-400">Dark Room Management & Order Control Desk</p>
        </div>

        {/* Manual Store Open / Manual Store Close Toggle */}
        <button
          onClick={() => setStoreOpen(!storeOpen)}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            storeOpen ? "bg-emerald-500 text-slate-950 hover:bg-emerald-400" : "bg-rose-500 text-white hover:bg-rose-600"
          }`}
        >
          <Power className="w-4 h-4" />
          <span>{storeOpen ? "STORE IS OPEN" : "STORE IS CLOSED"}</span>
        </button>
      </header>

      {/* Control Switchers */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-200">Bakery Mode (6-8 AM)</p>
            <p className="text-[10px] text-slate-400">Restrict orders to bakery items only</p>
          </div>
          <button
            onClick={() => setBakeryModeOnly(!bakeryModeOnly)}
            className={`px-3 py-1 rounded text-xs font-bold ${bakeryModeOnly ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-400"}`}
          >
            {bakeryModeOnly ? "ON" : "OFF"}
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-3 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-200">Helpline Number</p>
            <p className="text-[10px] text-orange-400 font-mono">6006990032</p>
          </div>
          <span className="text-xs bg-slate-800 text-slate-300 px-2 py-1 rounded">Active</span>
        </div>
      </div>

      {/* Influencer Coupon Generator */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center space-x-2 text-sky-400 font-bold text-sm">
          <Tag className="w-4 h-4" />
          <span>Influencer Coupon Code Manager</span>
        </div>

        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Coupon Code (e.g. ANANTNAG20)..."
            value={newCouponCode}
            onChange={(e) => setNewCouponCode(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs px-3 py-2 rounded-lg text-white grow"
          />
          <input
            type="number"
            placeholder="Discount ₹..."
            value={newCouponDiscount}
            onChange={(e) => setNewCouponDiscount(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs px-3 py-2 rounded-lg text-white w-28"
          />
          <button onClick={addCoupon} className="bg-orange-500 text-slate-950 font-bold text-xs px-4 py-2 rounded-lg hover:bg-orange-400">
            CREATE
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          {coupons.map((c, i) => (
            <div key={i} className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs flex justify-between">
              <div>
                <span className="font-mono font-bold text-orange-400">{c.code}</span>
                <span className="text-[10px] text-slate-400 block">₹{c.discount} OFF</span>
              </div>
              <span className="text-[10px] bg-slate-800 text-sky-300 px-2 py-1 rounded font-mono">{c.uses} Uses</span>
            </div>
          ))}
        </div>
      </div>

      {/* Honor System / Blacklist Manager (Disables COD for No-Show users) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm">
          <ShieldAlert className="w-4 h-4" />
          <span>Honor System • COD Blacklist Manager</span>
        </div>

        <div className="flex space-x-2">
          <input
            type="text"
            placeholder="Customer Phone to Blacklist COD..."
            value={blacklistPhone}
            onChange={(e) => setBlacklistPhone(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-xs px-3 py-2 rounded-lg text-white grow"
          />
          <button onClick={addBlacklistUser} className="bg-rose-500 text-white font-bold text-xs px-4 py-2 rounded-lg hover:bg-rose-600">
            DISABLE COD
          </button>
        </div>

        <div className="space-y-1.5 pt-1">
          {blacklistedUsers.map((u, i) => (
            <div key={i} className="bg-slate-950 p-2 rounded text-xs flex items-center justify-between border border-slate-800">
              <span className="text-slate-300 font-mono">{u.phone}</span>
              <span className="text-[10px] text-rose-400">{u.reason}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Orders List */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
        <h2 className="font-bold text-sm text-slate-200">Active Anantnag Orders</h2>
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-orange-400">{order.id}</span>
                <span className="bg-slate-800 px-2 py-0.5 rounded text-slate-300">{order.status}</span>
              </div>
              <p><span className="text-slate-500">Customer:</span> {order.customer} ({order.address})</p>
              <p><span className="text-slate-500">Assigned Driver:</span> {order.driver}</p>

              <div className="flex space-x-2 pt-2">
                <button
                  onClick={() => updateStatus(order.id, "Out for Delivery")}
                  className="bg-orange-500 text-slate-950 font-bold px-3 py-1 rounded"
                >
                  Mark Out for Delivery
                </button>
                <button
                  onClick={() => updateStatus(order.id, "Delivered")}
                  className="bg-slate-800 text-emerald-400 px-3 py-1 rounded"
                >
                  Mark Delivered
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
