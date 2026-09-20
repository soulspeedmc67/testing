import { useState, useEffect, useMemo } from "react";
import { goBack } from "../lib/navigation";
import Link from "next/link";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import SEO from "../components/SEO";
import {
  Package,
  Clock,
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  X,
  RotateCcw,
  MapPin,
  Sparkles,
  Plus,
  Minus,
  Check,
  Truck,
  KeyRound,
  Zap
} from "lucide-react";
import BottomNav from "../components/BottomNav";

import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Card, CardContent } from "../components/ui/card";
import DraggableSheet from "../components/ui/DraggableSheet";
import { motion, AnimatePresence } from "framer-motion";
import { showOrderLiveNotification, clearOrderLiveNotification } from "../lib/notifications";
import DashitAnimatedLogo, { DashitProgressBadge } from "../components/DashitAnimatedLogo";
import { watchOrder, watchOrderTracking, updateOrderStatus, retireFinishedOrder, watchProducts, ORDER_STATUS } from "../lib/db";
import { ALL_PRODUCTS } from "../data/products";
import { hapticLight, hapticCartAdd } from "../lib/haptics";
import { calculateDeliveryEta } from "../lib/deliveryEta";

const MapTracking = dynamic(() => import("../components/MapTracking"), { ssr: false });

/**
 * Milliseconds for an order's creation time, whatever shape it arrives in:
 * a Firestore Timestamp, a Date, an epoch number, or an ISO string.
 */
export function orderTimestampMs(order) {
  const ts = order?.createdAt ?? order?.timestamp;
  if (!ts) return 0;
  if (typeof ts === "number") return ts;
  if (typeof ts === "string") {
    const parsed = Date.parse(ts);
    return Number.isNaN(parsed) ? 0 : parsed;
  }
  if (typeof ts.toMillis === "function") return ts.toMillis();
  if (typeof ts.seconds === "number") return ts.seconds * 1000;
  if (ts instanceof Date) return ts.getTime();
  return 0;
}

function getRemainingCancellationSeconds(order) {
  if (!order) return 0;
  const status = String(order.status || "").toLowerCase();
  if (status && status !== "placed") return 0;

  /* createdAt arrives as a Firestore Timestamp ({seconds, nanoseconds}) for any
     order read back from the server, and as an ISO string only for the local
     copy. `new Date(timestampObject)` is Invalid Date, so the 60-second cancel
     window silently never opened for real orders. */
  const orderTime = orderTimestampMs(order);
  if (!orderTime) return 0;

  const elapsedSec = Math.floor((Date.now() - orderTime) / 1000);
  return Math.max(0, 60 - elapsedSec);
}

export default function OrdersPage() {
  const router = useRouter();
  const [activeOrder, setActiveOrder] = useState(null);
  const [liveEta, setLiveEta] = useState(null);
  const [cancellationSeconds, setCancellationSeconds] = useState(0);
  const [orderHistory, setOrderHistory] = useState([]);
  const [showPastOrdersModal, setShowPastOrdersModal] = useState(false);
  const [isItemsExpanded, setIsItemsExpanded] = useState(false);
  const [cart, setCart] = useState([]);
  const [selectedCat, setSelectedCat] = useState("All");
  const [productsList, setProductsList] = useState(ALL_PRODUCTS);

  // Live Firestore Catalog Sync
  useEffect(() => {
    try {
      const custom = JSON.parse(localStorage.getItem("dashit_custom_products") || "[]");
      if (custom.length > 0) {
        const customIds = new Set(custom.map((c) => String(c.id || c.barcode)));
        setProductsList([...custom, ...ALL_PRODUCTS.filter((p) => !customIds.has(String(p.id || p.barcode)))]);
      }
    } catch (e) {}

    const unsub = watchProducts((liveProducts) => {
      if (liveProducts && liveProducts.length > 0) {
        setProductsList(liveProducts);
      }
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  const productsById = useMemo(() => {
    const map = new Map();
    productsList.forEach((p) => {
      if (p.id) map.set(String(p.id), p);
      if (p.barcode) map.set(String(p.barcode), p);
      if (p.name) map.set(p.name.trim().toLowerCase(), p);
    });
    return map;
  }, [productsList]);

  // Cart sync
  useEffect(() => {
    const syncCart = () => {
      try {
        const saved = localStorage.getItem("dashit_cart");
        if (saved) setCart(JSON.parse(saved));
        else setCart([]);
      } catch (e) {}
    };
    syncCart();
    window.addEventListener("dashit_cart_updated", syncCart);
    window.addEventListener("storage", syncCart);
    return () => {
      window.removeEventListener("dashit_cart_updated", syncCart);
      window.removeEventListener("storage", syncCart);
    };
  }, []);

  const saveCart = (newCart) => {
    setCart(newCart);
    try {
      localStorage.setItem("dashit_cart", JSON.stringify(newCart));
      window.dispatchEvent(new Event("dashit_cart_updated"));
    } catch (e) {}
  };

  const handleAddToCart = (product) => {
    hapticCartAdd();
    const pId = String(product.id || product.barcode);
    const existingIndex = cart.findIndex(
      (item) => String(item.id || item.barcode) === pId
    );
    let newCart;
    if (existingIndex > -1) {
      newCart = cart.map((item, i) =>
        i === existingIndex ? { ...item, qty: item.qty + 1 } : item
      );
    } else {
      newCart = [...cart, { ...product, qty: 1 }];
    }
    saveCart(newCart);
  };

  const handleUpdateQty = (pId, delta) => {
    hapticLight();
    const item = cart.find((i) => String(i.id || i.barcode) === String(pId));
    if (!item) return;
    const newQty = item.qty + delta;
    if (newQty <= 0) {
      saveCart(cart.filter((i) => String(i.id || i.barcode) !== String(pId)));
    } else {
      saveCart(
        cart.map((i) =>
          String(i.id || i.barcode) === String(pId) ? { ...i, qty: newQty } : i
        )
      );
    }
  };

  // Smart recommendations based on past orders and popular items with accurate live stock
  const recommendations = useMemo(() => {
    const pastItemsMap = new Map();
    [activeOrder, ...orderHistory].forEach((ord) => {
      if (ord?.items && Array.isArray(ord.items)) {
        ord.items.forEach((it) => {
          const key = String(it.id || it.barcode || it.name);
          if (!pastItemsMap.has(key)) {
            const matchedLive =
              productsById.get(String(it.id)) ||
              productsById.get(String(it.barcode)) ||
              productsById.get((it.name || "").trim().toLowerCase());
            pastItemsMap.set(key, {
              ...(matchedLive || it),
              isPastOrder: true,
            });
          }
        });
      }
    });

    const combined = Array.from(pastItemsMap.values());
    productsList.forEach((p) => {
      const key = String(p.id || p.barcode || p.name);
      if (!combined.some((c) => String(c.id || c.barcode || c.name) === key)) {
        combined.push(p);
      }
    });

    if (selectedCat === "All") return combined.slice(0, 10);
    return combined.filter((p) => (p.cat || "").toLowerCase() === selectedCat.toLowerCase()).slice(0, 8);
  }, [activeOrder, orderHistory, selectedCat, productsList, productsById]);

  /* Once the rider is broadcasting, their live road-routed ETA replaces the
     static hub-to-address estimate — the header used to keep showing the
     original promise long after the scooter had closed most of the distance. */
  const etaData = useMemo(() => {
    if (liveEta?.etaMinutes !== undefined && liveEta?.etaMinutes !== null) {
      return {
        etaMinutes: liveEta.etaMinutes,
        distanceFormatted: liveEta.distanceFormatted || "En route",
        isLive: true,
      };
    }
    if (!activeOrder) return { etaMinutes: 10, distanceFormatted: "1.2 km away" };
    const loc = activeOrder.location || activeOrder.userAddress || null;
    return calculateDeliveryEta(loc);
  }, [activeOrder, liveEta]);

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

  /* Live rider telemetry: arrival time and remaining distance, rewritten on the
     rider's broadcast cadence while the order is assigned. */
  useEffect(() => {
    if (!activeOrder?.orderId) return;
    const unsub = watchOrderTracking(activeOrder.orderId, (data) => {
      if (!data) return;
      const mins = Number(data.etaMinutes);
      if (!Number.isFinite(mins)) return;
      setLiveEta({
        etaMinutes: mins,
        distanceFormatted:
          data.distanceFormatted ||
          (data.distanceKm ? `${Number(data.distanceKm).toFixed(1)} km away` : ""),
      });
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [activeOrder?.orderId]);

  // Real-time status sync via Firestore watchOrder
  useEffect(() => {
    if (!activeOrder?.orderId) return;
    const unsub = watchOrder(activeOrder.orderId, (data) => {
      if (!data) return;
      if (data.status) {
        setActiveOrder((prev) => {
          if (!prev) return data;
          const updated = { ...prev, ...data };
          try {
            localStorage.setItem("dashit_active_order", JSON.stringify(updated));
          } catch (e) {}
          return updated;
        });
      }
    });

    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [activeOrder?.orderId]);

  useEffect(() => {
    if (!activeOrder) {
      setCancellationSeconds(0);
      return;
    }
    const initialRem = getRemainingCancellationSeconds(activeOrder);
    setCancellationSeconds(initialRem);
    if (initialRem <= 0) return;

    const timer = setInterval(() => {
      const rem = getRemainingCancellationSeconds(activeOrder);
      setCancellationSeconds(rem);
      if (rem <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [activeOrder]);

  /* The orders page is where a finished delivery becomes a receipt: once the
     order reads Delivered, it is held on screen briefly and then moved into
     history, so the page stops presenting a completed order as in-flight. */
  useEffect(() => {
    const orderId = activeOrder?.orderId;
    const status = activeOrder?.status;
    if (!orderId || (status !== "Delivered" && status !== "Cancelled")) return undefined;

    const timer = setTimeout(() => {
      if (retireFinishedOrder(orderId, status)) {
        setActiveOrder(null);
        setLiveEta(null);
        try {
          const hist = JSON.parse(localStorage.getItem("dashit_orders_history") || "[]");
          setOrderHistory(hist);
        } catch (e) {}
      }
    }, 20000);
    return () => clearTimeout(timer);
  }, [activeOrder?.orderId, activeOrder?.status]);

  /* Cancelling has to reach the store. This used to only delete the order from
     the customer's own localStorage and then say "Order cancelled successfully"
     — the order stayed 'Placed' in Firestore, so it was still picked, packed
     and delivered, and the customer had no record of it to complain about. */
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancelOrder = async () => {
    if (!activeOrder || isCancelling) return;
    if (!confirm("Are you sure you want to cancel this order? The 1-minute packing window is active.")) {
      return;
    }

    const orderId = activeOrder.orderId || activeOrder.id;
    setIsCancelling(true);
    try {
      const res = await updateOrderStatus(orderId, ORDER_STATUS.CANCELLED);
      if (res?.firestoreSynced === false) {
        alert(
          "We could not sync the cancellation automatically. Support has been notified at 6006990032 to assist with your cancellation."
        );
        return;
      }
      localStorage.removeItem("dashit_active_order");
      setActiveOrder(null);
      clearOrderLiveNotification();
      alert("Order cancelled successfully.");
    } catch (e) {
      alert(
        "We could not sync the cancellation automatically. Support has been notified at 6006990032 to assist with your cancellation."
      );
    } finally {
      setIsCancelling(false);
    }
  };

  const handleReorder = (ord) => {
    if (ord && ord.items) {
      const validItems = [];
      const outOfStockNames = [];

      ord.items.forEach((item) => {
        const live =
          productsById.get(String(item.id)) ||
          productsById.get(String(item.barcode)) ||
          productsById.get((item.name || "").trim().toLowerCase());
        const isOut = live?.stock !== undefined && Number(live.stock) <= 0;

        if (isOut) {
          outOfStockNames.push(item.name);
        } else {
          validItems.push(item);
        }
      });

      if (outOfStockNames.length > 0 && validItems.length === 0) {
        alert(
          `All items from this past order are currently out of stock:\n• ${outOfStockNames.join(
            "\n• "
          )}\n\nThey will be restocked shortly at the Anantnag hub.`
        );
        return;
      }

      if (outOfStockNames.length > 0) {
        alert(
          `Some items from this past order are currently out of stock and were not re-added:\n• ${outOfStockNames.join(
            "\n• "
          )}`
        );
      }

      localStorage.setItem("dashit_cart", JSON.stringify(validItems));
      window.dispatchEvent(new Event("dashit_cart_updated"));
      router.push("/cart");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-dock dark:bg-surface dark:text-content">
      <SEO title="Order History" noindex={true} />
      {/* Minimalist Top App Bar */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3 shadow-sm dark:bg-surface/95 dark:border-line/80">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                if (window.history.length > 1) {
                  goBack(router);
                } else {
                  router.push("/shop");
                }
              }}
              className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors active:scale-95 dark:bg-surface-muted dark:hover:bg-surface-muted"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <h1 className="font-black text-base text-slate-900 tracking-tight dark:text-content">Orders</h1>
              <p className="text-[10px] font-semibold text-slate-400 dark:text-content-faint">Live order status & receipts</p>
            </div>
          </div>

          <button
            onClick={() => setShowPastOrdersModal(true)}
            className="flex items-center space-x-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-full font-bold transition-all active:scale-95 dark:bg-surface-muted dark:hover:bg-surface-muted dark:text-content cursor-pointer"
          >
            <Package className="w-3.5 h-3.5 text-[#061838] dark:text-[#FF5B00]" />
            <span>Past Orders ({orderHistory.length})</span>
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 mt-4 space-y-4">
        {/* ACTIVE ORDER MINIMALIST CARD */}
        {activeOrder ? (
          <div className="bg-white border border-slate-200/90 rounded-3xl p-4 space-y-4 shadow-sm animate-bottom-sheet dark:bg-surface-raised dark:border-line/90">
            {/* Header: Status Pill & OTP */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-line-soft">
              <div className="flex items-center space-x-2">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#FF5B00]"></span>
                </span>
                <div>
                  <h2 className="font-extrabold text-xs text-slate-900 tracking-tight dark:text-content">
                    {activeOrder.status === "Out for Delivery"
                      ? "Rider Dispatched"
                      : activeOrder.status === "Delivered"
                      ? "Delivered to Doorstep"
                      : "Processing & Packing at Central Hub"}
                  </h2>
                  <span className="text-[10px] font-semibold text-slate-400 font-mono dark:text-content-faint">
                    #{activeOrder.orderId}
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block dark:text-content-faint">Total</span>
                <span className="font-mono text-xs font-black text-slate-900 dark:text-content">
                  ₹{activeOrder.totalAmount || activeOrder.total || activeOrder.finalTotal || 0}
                </span>
                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200/80 block mt-0.5 dark:bg-emerald-950/40 dark:border-emerald-800/60 dark:text-emerald-300">
                  {activeOrder.paymentMethod || "Cash on Delivery"}
                </span>
              </div>
            </div>

            {/* Minimal Horizontal Step Tracker with Spring Motion */}
            <div className="py-1">
              <div className="grid grid-cols-4 gap-1.5 relative">
                {/* 1. Placed */}
                <div className="space-y-1 text-center">
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden dark:bg-surface-muted">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "100%" }}
                      transition={{ type: "spring", stiffness: 80, damping: 15 }}
                      className="h-full bg-[#061838] dark:bg-[#FF5B00] rounded-full"
                    />
                  </div>
                  <span className="text-[9px] font-black text-[#061838] block dark:text-content">Placed</span>
                </div>

                {/* 2. Processing (Active when placed/packing, not jumping to On Way) */}
                <div className="space-y-1 text-center">
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden dark:bg-surface-muted">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{
                        width:
                          activeOrder.status === "Out for Delivery" || activeOrder.status === "Delivered"
                            ? "100%"
                            : "80%",
                      }}
                      transition={{ type: "spring", stiffness: 80, damping: 15, delay: 0.15 }}
                      className={`h-full ${
                        activeOrder.status === "Out for Delivery" || activeOrder.status === "Delivered"
                          ? "bg-[#061838] dark:bg-[#FF5B00]"
                          : "bg-[#FF5B00] animate-pulse"
                      } rounded-full`}
                    />
                  </div>
                  <span
                    className={`text-[9px] font-black ${
                      activeOrder.status === "Out for Delivery" || activeOrder.status === "Delivered"
                        ? "text-[#061838] dark:text-content"
                        : "text-[#FF5B00]"
                    } block`}
                  >
                    Processing
                  </span>
                </div>

                {/* 3. On Way (Only active when dispatched by driver) */}
                <div className="space-y-1 text-center">
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden dark:bg-surface-muted">
                    <motion.div
                      animate={{
                        width:
                          activeOrder.status === "Delivered"
                            ? "100%"
                            : activeOrder.status === "Out for Delivery"
                            ? "70%"
                            : "0%",
                      }}
                      transition={{ type: "spring", stiffness: 80, damping: 15 }}
                      className="h-full bg-[#061838] dark:bg-[#FF5B00] rounded-full"
                    />
                  </div>
                  <span
                    className={`text-[9px] font-black ${
                      activeOrder.status === "Out for Delivery"
                        ? "text-[#FF5B00]"
                        : activeOrder.status === "Delivered"
                        ? "text-[#061838] dark:text-content"
                        : "text-slate-400 dark:text-content-faint"
                    } block`}
                  >
                    On Way
                  </span>
                </div>

                {/* 4. Delivered */}
                <div className="space-y-1 text-center">
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden dark:bg-surface-muted">
                    <motion.div
                      animate={{ width: activeOrder.status === "Delivered" ? "100%" : "0%" }}
                      transition={{ type: "spring", stiffness: 80, damping: 15 }}
                      className="h-full bg-[#061838] dark:bg-[#FF5B00] rounded-full"
                    />
                  </div>
                  <span
                    className={`text-[9px] font-black ${
                      activeOrder.status === "Delivered" ? "text-[#061838] dark:text-content" : "text-slate-400 dark:text-content-faint"
                    } block`}
                  >
                    Delivered
                  </span>
                </div>
              </div>
            </div>

            {/* MINIMALIST DELIVERY VERIFICATION OTP & ARRIVAL TIME CARD */}
            {activeOrder.status !== "Delivered" && (
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-3 shadow-2xs dark:bg-surface-raised dark:border-line/90">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-700 flex items-center justify-center shrink-0 shadow-2xs dark:bg-surface-muted dark:border-line dark:text-content-secondary">
                      <KeyRound className="w-5 h-5 stroke-[2]" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block dark:text-content-faint">
                        Delivery Verification OTP
                      </span>
                      <p className="text-xs font-semibold text-slate-700 mt-0.5 dark:text-content-secondary">
                        Share this code with your driver at delivery
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-300 px-3.5 py-1.5 rounded-xl text-center shadow-2xs shrink-0 dark:bg-surface-muted dark:border-line-strong">
                    <span className="font-mono text-xl font-black tracking-[0.2em] text-slate-900 dark:text-content">
                      {activeOrder.otp || "4821"}
                    </span>
                  </div>
                </div>

                {/* Dynamic Arrival Calculation */}
                <div className="flex items-center justify-between pt-2.5 border-t border-slate-200/80 text-xs font-medium text-slate-600 dark:border-line/80 dark:text-content-secondary">
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500 dark:text-content-muted" />
                    <span>
                      Est. Delivery: <strong className="text-slate-900 font-bold dark:text-content">~{etaData.etaMinutes} mins</strong>
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium dark:text-content-faint">
                    {etaData.distanceFormatted} • {etaData.isLive ? "Live from rider" : "Central Hub"}
                  </span>
                </div>
              </div>
            )}

            {/* Clean, Human-Crafted Packing Window Card */}
            {cancellationSeconds > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl p-3.5 space-y-2.5 shadow-xs dark:bg-surface-raised dark:border-line">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-100/90 text-amber-700 flex items-center justify-center shrink-0 dark:bg-amber-950/40 dark:text-amber-400">
                      <Clock className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div>
                      <span className="text-xs font-black text-slate-900 block leading-tight dark:text-content">
                        Packing window active
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500 dark:text-content-muted">
                        Starts in <span className="font-mono font-bold text-amber-800 dark:text-amber-400">{cancellationSeconds}s</span>
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={handleCancelOrder}
                    disabled={isCancelling}
                    className="text-[11px] font-black text-rose-600 bg-white hover:bg-rose-50 border border-rose-200/90 px-3 py-1.5 rounded-xl transition-all shadow-2xs active:scale-95 disabled:opacity-50 dark:bg-surface-muted dark:border-rose-900/50 dark:text-rose-400 dark:hover:bg-rose-950/30 cursor-pointer"
                  >
                    {isCancelling ? "Cancelling…" : "Cancel Order"}
                  </button>
                </div>

                {/* Sleek Gradient Countdown Track */}
                <div className="h-1.5 w-full bg-amber-100/80 rounded-full overflow-hidden dark:bg-amber-950/40">
                  <motion.div
                    animate={{ width: `${Math.max(0, Math.min(100, (cancellationSeconds / 60) * 100))}%` }}
                    transition={{ ease: "linear", duration: 0.9 }}
                    className="h-full bg-[#FF5B00] rounded-full"
                  />
                </div>
              </div>
            )}

            {/* Fulfilment Processing State vs Out for Delivery Map */}
            {activeOrder.status === "Out for Delivery" ? (
              <div className="pt-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider dark:text-content-faint">Live Delivery Route</span>
                  <Badge variant="success">
                    Rider En Route
                  </Badge>
                </div>
                <MapTracking
                  orderId={activeOrder.orderId}
                  initialLat={33.735832}
                  initialLng={75.143614}
                  customerLat={activeOrder.location?.lat || 33.7385}
                  customerLng={activeOrder.location?.lng || 75.1565}
                  destinationName={activeOrder.location?.address || "Your Doorstep"}
                />
              </div>
            ) : (
              <div className="bg-gradient-to-b from-slate-50 to-blue-50/50 border border-slate-200/80 rounded-3xl p-5 space-y-3.5 text-center shadow-xs dark:from-surface-raised dark:to-surface dark:border-line/80">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-white shadow-[0_8px_24px_rgba(6,24,56,0.1)] border border-slate-200/80 flex items-center justify-center p-2 dark:bg-surface-muted dark:border-line/80">
                  <DashitAnimatedLogo size="md" showGlow={true} />
                </div>
                <div>
                  <h3 className="font-black text-sm text-slate-900 dark:text-content">
                    Packing at Dashit Central Hub
                  </h3>
                  <p className="text-xs text-slate-600 font-medium mt-1 max-w-xs mx-auto dark:text-content-secondary">
                    Our team is picking and packing your fresh items.
                  </p>
                </div>

                <div className="bg-white/80 backdrop-blur-xs rounded-2xl p-3 border border-orange-100 text-left space-y-2 dark:bg-surface-muted/90 dark:border-line-soft">
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 dark:text-content">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    <span>Order received & confirmed</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs font-bold text-slate-800 dark:text-content">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>Picking items from shelves & packing</span>
                  </div>
                  <div className="flex items-center space-x-2 text-xs font-medium text-slate-400 dark:text-content-faint">
                    <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-neutral-600" />
                    <span>Live GPS map unlocks when rider departs</span>
                  </div>
                </div>
              </div>
            )}

            {/* Minimal Collapsible Items Summary */}
            <div className="bg-slate-50/80 rounded-2xl border border-slate-100 overflow-hidden dark:bg-surface-raised dark:border-line-soft">
              <button
                onClick={() => setIsItemsExpanded(!isItemsExpanded)}
                className="w-full p-3 flex items-center justify-between text-left cursor-pointer"
              >
                <div className="flex items-center space-x-2">
                  <ShoppingBag className="w-4 h-4 text-slate-400 dark:text-content-muted" />
                  <span className="text-xs font-bold text-slate-800 dark:text-content">
                    Order Items ({activeOrder.items?.length || 1})
                  </span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-mono font-bold text-xs text-slate-900 dark:text-content">
                    ₹{activeOrder.totalAmount || activeOrder.items?.reduce((s, i) => s + i.price * i.qty, 0) || 0}
                  </span>
                  {isItemsExpanded ? (
                    <ChevronUp className="w-4 h-4 text-slate-400 dark:text-content-faint" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400 dark:text-content-faint" />
                  )}
                </div>
              </button>

              {isItemsExpanded && (
                <div className="p-3 pt-0 space-y-2 border-t border-slate-100 text-xs dark:border-line-soft">
                  {activeOrder.items?.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between text-slate-700 py-1 dark:text-content-secondary">
                      <span className="font-medium text-[11px]">{item.name} <b className="text-slate-400 font-normal dark:text-content-faint">x{item.qty}</b></span>
                      <span className="font-mono font-bold text-[11px] text-slate-900 dark:text-content">₹{item.price * item.qty}</span>
                    </div>
                  ))}
                  {activeOrder.location?.address && (
                    <div className="pt-2 border-t border-slate-100 flex items-start space-x-1.5 text-slate-500 text-[10px] dark:border-line-soft dark:text-content-muted">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5 dark:text-content-faint" />
                      <span>{activeOrder.location.address}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Actions Row */}
            <div className="flex space-x-2 pt-1">
              <Link
                href="/shop"
                className="grow bg-[#061838] hover:bg-slate-900 text-white text-center text-xs font-black py-3 rounded-2xl transition-all shadow-md active:scale-95 dark:bg-[#FF5B00] dark:hover:bg-[#E04F00]"
              >
                + Add Items to Cart
              </Link>
            </div>
          </div>
        ) : (
          /* Minimalist Empty Active Orders State */
          <div className="bg-white border border-slate-200/90 rounded-3xl p-8 text-center space-y-3 shadow-sm dark:bg-surface-raised dark:border-line/90">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto dark:bg-surface-muted dark:text-content-faint">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-slate-900 dark:text-content">No active deliveries</h3>
              <p className="text-xs text-slate-400 mt-0.5 font-medium dark:text-content-faint">
                Your live order path and courier ETA will appear here.
              </p>
            </div>
            <Link
              href="/shop"
              className="inline-block bg-[#061838] hover:bg-slate-900 text-white font-black text-xs px-5 py-2.5 rounded-2xl shadow-md transition-all active:scale-95 dark:bg-[#FF5B00] dark:hover:bg-[#E04F00]"
            >
              Start Shopping
            </Link>
          </div>
        )}

        {/* SMART PAST ORDER RECOMMENDATIONS & FREQUENT PICKS */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-4 space-y-3.5 shadow-sm dark:bg-surface-raised dark:border-line/90">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-line-soft">
            <div className="flex items-center space-x-2">
              <div className="w-6 h-6 rounded-lg bg-orange-100 text-[#FF5B00] flex items-center justify-center dark:bg-orange-950/40">
                <Sparkles className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="font-extrabold text-xs text-slate-900 tracking-tight dark:text-content">
                  Past Picks &amp; Recommendations
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold dark:text-content-faint">
                  1-tap quick add from your favourites
                </p>
              </div>
            </div>
          </div>

          {/* Category Filter Chips */}
          <div className="flex space-x-1.5 overflow-x-auto scrollbar-none py-0.5">
            {["All", "Snacks", "Dairy", "Bakery"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCat(cat)}
                className={`text-[11px] font-bold px-3 py-1 rounded-full transition-all shrink-0 cursor-pointer ${
                  selectedCat === cat
                    ? "bg-[#061838] text-white shadow-xs dark:bg-[#FF5B00]"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600 dark:bg-surface-muted dark:text-content-secondary dark:hover:bg-surface-overlay"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Recommendations Grid */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {recommendations.map((prod) => {
              const pId = String(prod.id || prod.barcode);
              const live = productsById.get(pId) || productsById.get((prod.name || "").trim().toLowerCase()) || prod;
              const isOutOfStock = live.stock !== undefined && Number(live.stock) <= 0;
              const cartItem = cart.find((i) => String(i.id || i.barcode) === pId);
              const qty = cartItem ? cartItem.qty : 0;

              return (
                <div
                  key={pId}
                  className={`bg-slate-50/80 hover:bg-slate-50 border rounded-2xl p-2.5 flex flex-col justify-between transition-all group dark:bg-surface-raised dark:hover:bg-surface-overlay ${
                    isOutOfStock
                      ? "border-slate-200 dark:border-line/60 opacity-80"
                      : "border-slate-200/80 dark:border-line/80"
                  }`}
                >
                  <div className="relative">
                    <div className="w-full aspect-square rounded-xl bg-white flex items-center justify-center p-2 mb-2 overflow-hidden border border-slate-100 dark:bg-surface-muted dark:border-line-soft relative">
                      <img
                        src={prod.img}
                        alt={prod.name}
                        className={`w-full h-full object-contain group-hover:scale-105 transition-transform ${
                          isOutOfStock ? "grayscale-[40%] opacity-60" : ""
                        }`}
                      />
                      {isOutOfStock && (
                        <div className="absolute inset-x-0 bottom-0 bg-rose-600/90 py-0.5 text-center text-[8.5px] font-black uppercase tracking-wider text-white">
                          Out of Stock
                        </div>
                      )}
                    </div>
                    {prod.isPastOrder && !isOutOfStock && (
                      <span className="absolute top-1 left-1 bg-amber-100 text-amber-800 text-[9px] font-black px-1.5 py-0.5 rounded-md dark:bg-amber-950/60 dark:text-amber-300">
                        Past Pick
                      </span>
                    )}
                  </div>

                  <div className="space-y-1">
                    <span className="text-[11px] font-extrabold text-slate-900 line-clamp-2 leading-tight dark:text-content">
                      {prod.name}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-400 block dark:text-content-faint">
                      {prod.unit || "1 unit"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-200/60 dark:border-line/60">
                    <span className="font-mono font-black text-xs text-slate-900 dark:text-content">
                      ₹{prod.price}
                    </span>

                    {isOutOfStock ? (
                      <button
                        type="button"
                        disabled
                        className="bg-slate-100 border border-slate-200 text-slate-400 font-black text-[10px] px-2 py-1 rounded-lg cursor-not-allowed dark:bg-surface-muted dark:border-line dark:text-content-faint"
                      >
                        SOLD OUT
                      </button>
                    ) : qty === 0 ? (
                      <button
                        type="button"
                        onClick={() => handleAddToCart(prod)}
                        className="bg-white hover:bg-orange-50 active:scale-90 border border-[#FF5B00] text-[#FF5B00] font-black text-[11px] px-3 py-1 rounded-lg transition-transform cursor-pointer shadow-2xs dark:bg-surface-muted dark:hover:bg-[#FF5B00]/10"
                      >
                        ADD
                      </button>
                    ) : (
                      <div className="flex items-center bg-[#FF5B00] text-white rounded-lg px-2 py-0.5 space-x-2 font-mono font-bold text-xs shadow-2xs">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(pId, -1)}
                          className="hover:scale-110 active:scale-90 cursor-pointer"
                        >
                          -
                        </button>
                        <span className="text-[11px]">{qty}</span>
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(pId, 1)}
                          className="hover:scale-110 active:scale-90 cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* WELL-ORDERED PAST ORDERS SECTION */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-4 space-y-3 shadow-sm dark:bg-surface-raised dark:border-line/90">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-line-soft">
            <h3 className="font-extrabold text-xs text-slate-900 tracking-tight dark:text-content">Recent Receipts</h3>
            <span className="text-[10px] font-bold text-slate-400 dark:text-content-faint">{orderHistory.length} orders placed</span>
          </div>

          {orderHistory.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-5 font-medium dark:text-content-faint">No order history found yet.</p>
          ) : (
            <div className="space-y-2.5 divide-y divide-slate-100 dark:divide-line-soft">
              {orderHistory.map((ord, idx) => (
                <div key={idx} className="pt-2.5 space-y-1.5 text-xs first:pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-black text-slate-900 font-mono text-[11px] dark:text-content">{ord.orderId}</span>
                      <Badge variant="success">
                        Delivered
                      </Badge>
                    </div>
                    <span className="font-black font-mono text-slate-900 text-xs dark:text-content">₹{ord.totalAmount}</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium dark:text-content-faint">
                    <span>{ord.date} • {ord.items?.length || 1} {ord.items?.length === 1 ? "item" : "items"}</span>
                    <button
                      onClick={() => handleReorder(ord)}
                      className="text-[#061838] font-black hover:underline flex items-center space-x-1 dark:text-[#FF5B00] cursor-pointer"
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
          <p className="text-xs text-slate-400 text-center py-6 font-medium dark:text-content-faint">No past orders found.</p>
        ) : (
          <div className="space-y-3 divide-y divide-slate-100 dark:divide-line-soft">
            {orderHistory.map((ord, idx) => (
              <div key={idx} className="pt-3 space-y-2 text-xs first:pt-0">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="font-black text-slate-900 font-mono dark:text-content">{ord.orderId}</span>
                    <span className="text-[10px] text-slate-400 block dark:text-content-faint">{ord.date}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-black font-mono text-slate-900 block dark:text-content">₹{ord.totalAmount}</span>
                    <span className="text-[9px] font-extrabold text-[#061838] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/50 dark:bg-blue-950/40 dark:border-blue-900/50 dark:text-blue-300">
                      Delivered
                    </span>
                  </div>
                </div>

                {/* Item list */}
                {ord.items && ord.items.length > 0 && (
                  <div className="bg-slate-50 rounded-xl p-2 space-y-1 dark:bg-surface-muted">
                    {ord.items.map((item, itemIdx) => {
                      const pId = item.id || item._id || item.barcode;
                      const liveProd = productsById[pId] || (item.barcode ? productsById[item.barcode] : null);
                      const isItemOutOfStock = liveProd ? (liveProd.stock !== undefined && Number(liveProd.stock) <= 0) : false;
                      return (
                        <div key={itemIdx} className="flex items-center justify-between text-[11px] text-slate-600 dark:text-content-secondary">
                          <div className="flex items-center space-x-1.5">
                            <span>{item.name} x{item.qty}</span>
                            {isItemOutOfStock && (
                              <span className="text-[9px] font-bold text-red-500 bg-red-50 px-1.5 py-0.2 rounded dark:bg-red-950/40 dark:text-red-400">
                                Out of stock
                              </span>
                            )}
                          </div>
                          <span className="font-mono font-semibold dark:text-content">₹{item.price * item.qty}</span>
                        </div>
                      );
                    })}
                  </div>
                )}

                <div className="pt-1 flex justify-end">
                  <button
                    onClick={() => {
                      handleReorder(ord);
                      setShowPastOrdersModal(false);
                    }}
                    className="bg-slate-100 hover:bg-slate-200 text-[#061838] font-black text-xs px-3 py-1.5 rounded-xl transition-colors flex items-center space-x-1 dark:bg-surface-muted dark:hover:bg-surface-raised dark:text-[#FF5B00] cursor-pointer"
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
