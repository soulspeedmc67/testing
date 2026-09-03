import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { Package, Clock, ArrowLeft, CheckCircle2, ChevronRight, ChevronDown, ChevronUp, ShoppingBag, X, RotateCcw, MapPin } from "lucide-react";
import BottomNav from "../components/BottomNav";

import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import DraggableSheet from "../components/ui/DraggableSheet";
import { motion, AnimatePresence } from "framer-motion";
import { showOrderLiveNotification, clearOrderLiveNotification } from "../lib/notifications";
import io from "socket.io-client";

const MapTracking = dynamic(() => import("../components/MapTracking"), { ssr: false });

export default function OrdersPage() {
  const router = useRouter();
  const [activeOrder, setActiveOrder] = useState(null);
  const [cancellationSeconds, setCancellationSeconds] = useState(60);
  const [orderHistory, setOrderHistory] = useState([]);
  const [showPastOrdersModal, setShowPastOrdersModal] = useState(false);
  const [isItemsExpanded, setIsItemsExpanded] = useState(false);

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

  // Real-time status sync with Admin Dashboard & Driver via WebSockets
  useEffect(() => {
    let socket;
    try {
      const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:5001";
      socket = io(socketUrl);
      if (activeOrder?.orderId) {
        socket.emit("join_order_room", activeOrder.orderId);
      }
      socket.on("order_status_changed", (data) => {
        if (data.orderId === activeOrder?.orderId) {
          setActiveOrder((prev) => {
            const updated = { ...prev, status: data.status };
            try { localStorage.setItem("dashit_active_order", JSON.stringify(updated)); } catch (e) {}
            return updated;
          });
        }
      });
      socket.on("order_status_updated", (data) => {
        if (data.orderId === activeOrder?.orderId) {
          setActiveOrder((prev) => {
            const updated = { ...prev, status: data.status };
            try { localStorage.setItem("dashit_active_order", JSON.stringify(updated)); } catch (e) {}
            return updated;
          });
        }
      });
    } catch (e) {}

    return () => {
      if (socket) socket.disconnect();
    };
  }, [activeOrder?.orderId]);

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
      clearOrderLiveNotification();
      alert("Order cancelled successfully.");
    }
  };

  const handleReorder = (ord) => {
    if (ord && ord.items) {
      localStorage.setItem("dashit_cart", JSON.stringify(ord.items));
      router.push("/cart");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-32">
      {/* Minimalist Top App Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 px-4 pt-[max(12px,env(safe-area-inset-top,12px))] pb-3 shadow-sm">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                if (window.history.length > 1) {
                  router.back();
                } else {
                  router.push("/");
                }
              }}
              className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors active:scale-95"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="font-black text-base text-slate-900 tracking-tight">My Orders</h1>
              <p className="text-[10px] font-semibold text-slate-400">Live order status & receipts</p>
            </div>
          </div>

          <button
            onClick={() => setShowPastOrdersModal(true)}
            className="flex items-center space-x-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full font-bold transition-all active:scale-95"
          >
            <Package className="w-3.5 h-3.5 text-[#0c831f]" />
            <span>Past Orders ({orderHistory.length})</span>
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 mt-4 space-y-4">
        {/* ACTIVE ORDER MINIMALIST CARD */}
        {activeOrder ? (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-4 space-y-4 shadow-sm animate-bottom-sheet">
            {/* Header: Status Pill & OTP */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#0c831f]"></span>
                </span>
                <div>
                  <h2 className="font-extrabold text-xs text-slate-900 tracking-tight">
                    {activeOrder.status === "Out for Delivery" ? "Rider Dispatched" : "Packing at Dashit Central Hub"}
                  </h2>
                  <span className="text-[10px] font-semibold text-slate-400 font-mono">
                    #{activeOrder.orderId}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Delivery OTP</span>
                <span className="font-mono text-xs font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                  {activeOrder.otp || "4821"}
                </span>
              </div>
            </div>

            {/* Minimal Horizontal Step Tracker with Spring Motion */}
            <div className="py-1">
              <div className="grid grid-cols-4 gap-1.5 relative">
                <div className="space-y-1 text-center">
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ type: "spring", stiffness: 80, damping: 15 }} className="h-full bg-[#0c831f] rounded-full" />
                  </div>
                  <span className="text-[9px] font-bold text-[#0c831f] block">Placed</span>
                </div>
                <div className="space-y-1 text-center">
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div initial={{ width: 0 }} animate={{ width: "100%" }} transition={{ type: "spring", stiffness: 80, damping: 15, delay: 0.15 }} className="h-full bg-[#0c831f] rounded-full" />
                  </div>
                  <span className="text-[9px] font-bold text-[#0c831f] block">Packed</span>
                </div>
                <div className="space-y-1 text-center">
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <motion.div
                      animate={{ width: cancellationSeconds === 0 ? "100%" : "35%" }}
                      transition={{ type: "spring", stiffness: 80, damping: 15 }}
                      className="h-full bg-[#0c831f] rounded-full"
                    />
                  </div>
                  <span className={`text-[9px] font-bold ${cancellationSeconds === 0 ? "text-[#0c831f]" : "text-slate-400"} block`}>On Way</span>
                </div>
                <div className="space-y-1 text-center">
                  <div className="h-1.5 w-full bg-slate-200 rounded-full" />
                  <span className="text-[9px] font-bold text-slate-400 block">Delivered</span>
                </div>
              </div>
            </div>

            {/* Clean, Human-Crafted Packing Window Card */}
            {cancellationSeconds > 0 && (
              <div className="bg-gradient-to-r from-amber-50/90 via-orange-50/40 to-white border border-amber-200/80 rounded-2xl p-3.5 space-y-2.5 shadow-xs">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-100/90 text-amber-700 flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-900 block leading-tight">
                        Packing window active
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">
                        Starts in <span className="font-mono font-bold text-amber-800">{cancellationSeconds}s</span>
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleCancelOrder}
                    className="text-[11px] font-black text-rose-600 bg-white hover:bg-rose-50 border border-rose-200/90 px-3 py-1.5 rounded-xl transition-all shadow-2xs active:scale-95"
                  >
                    Cancel Order
                  </button>
                </div>

                {/* Sleek Gradient Countdown Track */}
                <div className="h-1.5 w-full bg-amber-100/80 rounded-full overflow-hidden">
                  <motion.div
                    animate={{ width: `${Math.max(0, Math.min(100, (cancellationSeconds / 60) * 100))}%` }}
                    transition={{ ease: "linear", duration: 0.9 }}
                    className="h-full bg-gradient-to-r from-amber-500 to-[#FF6B00] rounded-full"
                  />
                </div>
              </div>
            )}

            {/* Fulfilment Processing State vs Out for Delivery Map */}
            {activeOrder.status === "Out for Delivery" ? (
              <div className="pt-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Live Delivery Route</span>
                  <Badge variant="success">
                    Rider En Route
                  </Badge>
                </div>
                <MapTracking
                  orderId={activeOrder.orderId}
                  initialLat={33.7311}
                  initialLng={75.1487}
                  customerLat={activeOrder.location?.lat || 33.7385}
                  customerLng={activeOrder.location?.lng || 75.1565}
                  destinationName={activeOrder.location?.address || "Your Doorstep"}
                />
              </div>
            ) : (
              <div className="bg-blue-50/70 border border-blue-200/80 rounded-3xl p-5 space-y-3.5 text-center">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-white shadow-md border border-blue-100 flex items-center justify-center text-[#061838]">
                  <Package className="w-7 h-7 stroke-[2] animate-bounce" />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900">
                    Packing at Dashit Central Hub
                  </h3>
                  <p className="text-xs text-slate-600 font-medium mt-1 max-w-xs mx-auto">
                    Our team at Nai Basti Hub is picking and packing your fresh items.
                  </p>
                </div>

                <div className="bg-white/80 backdrop-blur-xs rounded-2xl p-3 border border-emerald-100 text-left space-y-2">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Order received & confirmed</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>Picking items from shelves & packing</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs font-medium text-slate-400">
                    <span className="w-2 h-2 rounded-full bg-slate-300" />
                    <span>Live GPS map unlocks when rider departs</span>
                  </div>
                </div>
              </div>
            )}

            {/* Minimal Collapsible Items Summary */}
            <div className="bg-slate-50/80 rounded-2xl border border-slate-100 overflow-hidden">
              <button
                onClick={() => setIsItemsExpanded(!isItemsExpanded)}
                className="w-full p-3 flex items-center justify-between text-left"
              >
                <div className="flex items-center space-x-2">
                  <ShoppingBag className="w-4 h-4 text-slate-400" />
                  <span className="text-xs font-bold text-slate-800">
                    Order Items ({activeOrder.items?.length || 1})
                  </span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-mono font-bold text-xs text-slate-900">
                    ₹{activeOrder.totalAmount || activeOrder.items?.reduce((s, i) => s + i.price * i.qty, 0) || 0}
                  </span>
                  {isItemsExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </div>
              </button>

              {isItemsExpanded && (
                <div className="p-3 pt-0 space-y-2 border-t border-slate-100 text-xs">
                  {activeOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-slate-700 py-1">
                      <span className="font-medium text-[11px]">{item.name} <b className="text-slate-400 font-normal">x{item.qty}</b></span>
                      <span className="font-mono font-bold text-[11px] text-slate-900">₹{item.price * item.qty}</span>
                    </div>
                  ))}
                  {activeOrder.location?.address && (
                    <div className="pt-2 border-t border-slate-100 flex items-start space-x-1.5 text-slate-500 text-[10px]">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span>{activeOrder.location.address}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions Row */}
            <div className="flex space-x-2 pt-1">
              <Link
                href="/"
                className="grow bg-[#0c831f] hover:bg-emerald-800 text-white text-center text-xs font-extrabold py-3 rounded-2xl transition-all shadow-sm active:scale-95"
              >
                + Add Items to Cart
              </Link>
            </div>
          </div>
        ) : (
          /* Minimalist Empty Active Orders State */
          <div className="bg-white border border-slate-200/90 rounded-3xl p-8 text-center space-y-3 shadow-sm">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900">No active deliveries</h3>
              <p className="text-xs text-slate-400 mt-0.5 font-medium">
                Your live 10-minute order path and courier ETA will appear here.
              </p>
            </div>
            <Link
              href="/"
              className="inline-block bg-[#0c831f] hover:bg-emerald-800 text-white font-extrabold text-xs px-5 py-2.5 rounded-2xl shadow-sm transition-all active:scale-95"
            >
              Start Shopping
            </Link>
          </div>
        )}

        {/* WELL-ORDERED PAST ORDERS SECTION */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-extrabold text-xs text-slate-900 tracking-tight">Recent Receipts</h3>
            <span className="text-[10px] font-bold text-slate-400">{orderHistory.length} orders placed</span>
          </div>

          {orderHistory.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-5 font-medium">No order history found yet.</p>
          ) : (
            <div className="space-y-2.5 divide-y divide-slate-100">
              {orderHistory.map((ord, idx) => (
                <div key={idx} className="pt-2.5 space-y-1.5 text-xs first:pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-slate-900 font-mono text-[11px]">{ord.orderId}</span>
                      <Badge variant="success">
                        Delivered
                      </Badge>
                    </div>
                    <span className="font-black font-mono text-slate-900 text-xs">₹{ord.totalAmount}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                    <span>{ord.date} • {ord.items?.length || 1} {ord.items?.length === 1 ? "item" : "items"}</span>
                    <button
                      onClick={() => handleReorder(ord)}
                      className="text-[#0c831f] font-extrabold hover:underline flex items-center space-x-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Reorder</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* PAST ORDERS DRAGGABLE SHEET */}
      <DraggableSheet
        isOpen={showPastOrdersModal}
        onClose={() => setShowPastOrdersModal(false)}
        title="Order History"
        subtitle="Your past deliveries & receipts"
      >
        {orderHistory.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6 font-medium">No past orders found.</p>
        ) : (
          <div className="space-y-3 divide-y divide-slate-100">
            {orderHistory.map((ord, idx) => (
              <div key={idx} className="pt-3 space-y-2 text-xs first:pt-0">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-black text-slate-900 font-mono">{ord.orderId}</span>
                    <span className="text-[10px] text-slate-400 block">{ord.date}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black font-mono text-slate-900 block">₹{ord.totalAmount}</span>
                    <span className="text-[9px] font-extrabold text-[#0c831f] bg-emerald-50 px-2 py-0.5 rounded-full">
                      Delivered
                    </span>
                  </div>
                </div>

                {/* Item list */}
                {ord.items && ord.items.length > 0 && (
                  <div className="bg-slate-50 rounded-xl p-2 space-y-1">
                    {ord.items.map((item, itemIdx) => (
                      <div key={itemIdx} className="flex items-center justify-between text-[11px] text-slate-600">
                        <span>{item.name} x{item.qty}</span>
                        <span className="font-mono font-semibold">₹{item.price * item.qty}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div className="pt-1 flex justify-end">
                  <button
                    onClick={() => {
                      handleReorder(ord);
                      setShowPastOrdersModal(false);
                    }}
                    className="bg-emerald-50 hover:bg-emerald-100 text-[#0c831f] font-extrabold text-xs px-3 py-1.5 rounded-xl transition-colors flex items-center space-x-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reorder all items</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </DraggableSheet>
    </div>
  );
}
