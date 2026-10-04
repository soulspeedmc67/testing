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
  Check,
  RotateCcw,
  MapPin,
  Sparkles,
  ShoppingBag,
  Bike,
  Shield,
  Plus,
  Minus,
  X,
  XCircle,
  ChevronRight
} from "lucide-react";
import BottomNav from "../components/BottomNav";
import { motion, AnimatePresence } from "framer-motion";
import { showOrderLiveNotification, clearOrderLiveNotification } from "../lib/notifications";
import {
  watchOrder,
  watchOrderTracking,
  updateOrderStatus,
  updateOrderContent,
  retireFinishedOrder,
  ORDER_STATUS,
  ORDER_CHANGE_WINDOW_SECONDS
} from "../lib/db";
import { watchShopProducts as watchProducts } from "../lib/catalogueFile";
import { browseable } from "../lib/tobacco";
import { hapticLight, hapticMedium, hapticCartAdd } from "../lib/haptics";
import { calculateDeliveryEta } from "../lib/deliveryEta";
import ModifyOrderModal from "../components/ModifyOrderModal";
import CancelOrderModal from "../components/CancelOrderModal";
import OrderStageAnimation from "../components/OrderStageAnimation";

const MapTracking = dynamic(() => import("../components/MapTracking"), { ssr: false });
const Rider3DViewer = dynamic(() => import("../components/Rider3DViewer"), { ssr: false });

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

  const orderTime = orderTimestampMs(order);
  if (!orderTime) return 0;

  const elapsedSec = Math.floor((Date.now() - orderTime) / 1000);
  return Math.max(0, ORDER_CHANGE_WINDOW_SECONDS - elapsedSec);
}

function formatDate(order) {
  const ms = orderTimestampMs(order);
  if (!ms) return order?.date || "Recently";
  const date = new Date(ms);
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function OrdersPage() {
  const router = useRouter();
  const [activeOrder, setActiveOrder] = useState(null);
  const [orderHistory, setOrderHistory] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [viewMode, setViewMode] = useState("tracking"); // "tracking" | "history"
  const [liveEta, setLiveEta] = useState(null);
  const [cancellationSeconds, setCancellationSeconds] = useState(0);
  const [isModifyModalOpen, setIsModifyModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [modifyToast, setModifyToast] = useState(null);
  const [show3DRider, setShow3DRider] = useState(false);
  const [cart, setCart] = useState([]);
  const [selectedCat, setSelectedCat] = useState("All");
  const [productsList, setProductsList] = useState([]);

  // Live Firestore Catalog Sync
  useEffect(() => {
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

  // Local storage synchronization
  useEffect(() => {
    const syncLocal = () => {
      try {
        const active = localStorage.getItem("dashit_active_order");
        const history = localStorage.getItem("dashit_orders_history");

        let parsedActive = null;
        let parsedHistory = [];

        if (active) {
          try {
            parsedActive = JSON.parse(active);
            setActiveOrder(parsedActive);
          } catch (e) {}
        } else {
          setActiveOrder(null);
        }

        if (history) {
          try {
            parsedHistory = JSON.parse(history);
            setOrderHistory(parsedHistory);
          } catch (e) {}
        }

        // URL query parameter routing: ?id= or ?viewPast=true
        if (router.query.viewPast === "true") {
          setViewMode("history");
        } else if (router.query.id) {
          const match =
            (parsedActive && String(parsedActive.orderId || parsedActive.id) === String(router.query.id))
              ? parsedActive
              : parsedHistory.find((o) => String(o.orderId || o.id) === String(router.query.id));
          if (match) {
            setSelectedOrder(match);
            setViewMode("tracking");
          } else if (parsedActive) {
            setSelectedOrder(parsedActive);
            setViewMode("tracking");
          }
        } else if (parsedActive) {
          setSelectedOrder(parsedActive);
          setViewMode("tracking");
        } else {
          setViewMode("history");
        }
      } catch (e) {}
    };

    syncLocal();

    window.addEventListener("dashit_orders_updated", syncLocal);
    window.addEventListener("dashit_order_updated", syncLocal);
    window.addEventListener("storage", syncLocal);

    let bc = null;
    if (typeof window !== "undefined" && window.BroadcastChannel) {
      try {
        bc = new BroadcastChannel("dashit_orders_channel");
        bc.onmessage = (msg) => {
          if (msg?.data?.type === "ORDER_STATUS_UPDATED" || msg?.data?.type === "NEW_ORDER") {
            syncLocal();
          }
        };
      } catch (e) {}
    }

    return () => {
      window.removeEventListener("dashit_orders_updated", syncLocal);
      window.removeEventListener("dashit_order_updated", syncLocal);
      window.removeEventListener("storage", syncLocal);
      if (bc) {
        try { bc.close(); } catch (e) {}
      }
    };
  }, [router.query.id, router.query.viewPast]);

  const displayedOrder = selectedOrder || activeOrder;
  const targetOrderId = displayedOrder?.orderId || displayedOrder?.id;

  // Live rider telemetry
  useEffect(() => {
    if (!targetOrderId) return;
    const unsub = watchOrderTracking(targetOrderId, (data) => {
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
  }, [targetOrderId]);

  // Real-time status sync via Firestore watchOrder
  useEffect(() => {
    if (!targetOrderId) return;
    const unsub = watchOrder(targetOrderId, (data) => {
      if (!data) return;
      if (data.status) {
        setSelectedOrder((prev) => (prev ? { ...prev, ...data } : data));
        if (activeOrder && String(activeOrder.orderId || activeOrder.id) === String(targetOrderId)) {
          setActiveOrder((prev) => {
            const updated = { ...prev, ...data };
            try {
              localStorage.setItem("dashit_active_order", JSON.stringify(updated));
            } catch (e) {}
            return updated;
          });
        }

        try {
          const hist = JSON.parse(localStorage.getItem("dashit_orders_history") || "[]");
          const updatedHist = hist.map((o) =>
            String(o.orderId || o.id) === String(targetOrderId) ? { ...o, ...data } : o
          );
          localStorage.setItem("dashit_orders_history", JSON.stringify(updatedHist));
          setOrderHistory(updatedHist);
        } catch (e) {}

        if (typeof window !== "undefined") {
          window.dispatchEvent(new CustomEvent("dashit_orders_updated", { detail: data }));
        }
      }
    });

    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [targetOrderId, activeOrder]);

  // Change window countdown timer
  useEffect(() => {
    if (!displayedOrder) {
      setCancellationSeconds(0);
      return;
    }
    const initialRem = getRemainingCancellationSeconds(displayedOrder);
    setCancellationSeconds(initialRem);
    if (initialRem <= 0) return;

    const timer = setInterval(() => {
      const rem = getRemainingCancellationSeconds(displayedOrder);
      setCancellationSeconds(rem);
      if (rem <= 0) {
        clearInterval(timer);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [displayedOrder]);

  // Finished delivery timeout
  useEffect(() => {
    const orderId = activeOrder?.orderId || activeOrder?.id;
    const status = String(activeOrder?.status || "").toLowerCase();
    const isFinished = status.includes("deliver") || status.includes("cancel");
    if (!orderId || !isFinished) return undefined;

    const timer = setTimeout(() => {
      if (retireFinishedOrder(orderId, activeOrder.status)) {
        setActiveOrder(null);
        setLiveEta(null);
        try {
          const hist = JSON.parse(localStorage.getItem("dashit_orders_history") || "[]");
          setOrderHistory(hist);
        } catch (e) {}
      }
    }, 6000);
    return () => clearTimeout(timer);
  }, [activeOrder?.orderId, activeOrder?.id, activeOrder?.status]);

  const etaData = useMemo(() => {
    if (liveEta?.etaMinutes !== undefined && liveEta?.etaMinutes !== null) {
      return {
        etaMinutes: liveEta.etaMinutes,
        distanceFormatted: liveEta.distanceFormatted || "En route",
        isLive: true,
      };
    }
    if (!displayedOrder) return { etaMinutes: 8, distanceFormatted: "1.2 km away" };
    const loc = displayedOrder.location || displayedOrder.userAddress || null;
    return calculateDeliveryEta(loc);
  }, [displayedOrder, liveEta]);

  const handleSaveModifiedOrder = async (updatedFields) => {
    if (!displayedOrder) return;
    const orderId = displayedOrder.orderId || displayedOrder.id;
    const res = await updateOrderContent(orderId, updatedFields);
    setSelectedOrder((prev) => ({ ...prev, ...updatedFields }));
    if (activeOrder && String(activeOrder.orderId || activeOrder.id) === String(orderId)) {
      setActiveOrder((prev) => ({ ...prev, ...updatedFields }));
    }
    setModifyToast("Order items updated successfully!");
    setTimeout(() => setModifyToast(null), 3500);
    return res;
  };

  const handleConfirmCancellation = async ({ restoreCart }) => {
    if (!displayedOrder || isCancelling) return;
    const orderId = displayedOrder.orderId || displayedOrder.id;
    setIsCancelling(true);
    try {
      if (restoreCart && displayedOrder.items && displayedOrder.items.length > 0) {
        localStorage.setItem("dashit_cart", JSON.stringify(displayedOrder.items));
        window.dispatchEvent(new Event("dashit_cart_updated"));
      }
      const res = await updateOrderStatus(orderId, ORDER_STATUS.CANCELLED);
      if (res?.firestoreSynced === false) {
        alert("We could not sync the cancellation automatically. Support has been notified at 6006990032.");
        return;
      }
      localStorage.removeItem("dashit_active_order");
      setActiveOrder(null);
      setSelectedOrder(null);
      clearOrderLiveNotification();
      setIsCancelModalOpen(false);
      setViewMode("history");
      setModifyToast("Order cancelled successfully.");
      setTimeout(() => setModifyToast(null), 3500);
    } catch (e) {
      alert("Error cancelling order: " + (e?.message || "Please call store support"));
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

  // Recommendations
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
    browseable(productsList).forEach((p) => {
      const key = String(p.id || p.barcode || p.name);
      if (!combined.some((c) => String(c.id || c.barcode || c.name) === key)) {
        combined.push(p);
      }
    });

    if (selectedCat === "All") return combined.slice(0, 10);
    return combined.filter((p) => (p.cat || "").toLowerCase() === selectedCat.toLowerCase()).slice(0, 8);
  }, [activeOrder, orderHistory, selectedCat, productsList, productsById]);

  // Stage details for tracking
  const currentStatus = String(displayedOrder?.status || "Placed");
  const normStatus = currentStatus.trim().toLowerCase().replace(/_/g, " ");
  const isOutForDelivery = normStatus === "out for delivery";
  const isDelivered = normStatus === "delivered";
  const isCancelled = normStatus === "cancelled";
  const isPacking = normStatus === "packed" || normStatus === "packing";
  const showsMap = displayedOrder && (isOutForDelivery || isDelivered);

  const stageProgress = isDelivered ? 1.0 : isOutForDelivery ? 0.75 : isPacking ? 0.45 : 0.18;

  return (
    <div className={`min-h-screen font-sans ${showsMap || (viewMode === "tracking" && displayedOrder) ? "bg-[#060709] text-white" : "bg-slate-50 text-slate-900 pb-dock dark:bg-surface dark:text-content"}`}>
      <SEO title={viewMode === "tracking" && displayedOrder ? "Live Tracking" : "Order History"} noindex={true} />

      {/* =====================================================================
          VIEW 1: LIVE ORDER TRACKING (PARITY WITH LiveTrackingMapScreen.kt)
          ===================================================================== */}
      {viewMode === "tracking" && displayedOrder ? (
        <div className="min-h-screen flex flex-col justify-between">
          {/* Top Bar */}
          <header className="sticky top-0 z-40 bg-[#060709]/80 backdrop-blur-xl px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3 border-b border-white/10">
            <div className="max-w-md mx-auto flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  hapticLight();
                  if (orderHistory.length > 0) {
                    setViewMode("history");
                  } else {
                    router.push("/shop");
                  }
                }}
                className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all active:scale-95 cursor-pointer"
                aria-label="Back to orders"
              >
                <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
              </button>

              <span className="font-mono text-xs font-semibold text-white/55 tracking-wider">
                Order #{String(targetOrderId || "").slice(-6).toUpperCase()}
              </span>

              {cancellationSeconds > 0 ? (
                <div className="h-9 px-3 rounded-full bg-black/80 border border-white/15 flex items-center space-x-2 select-none">
                  {/* Circular countdown gauge */}
                  <div className="relative w-4 h-4 flex items-center justify-center">
                    <svg className="w-4 h-4 -rotate-90 transform" viewBox="0 0 20 20">
                      <circle cx="10" cy="10" r="8" className="stroke-white/20" strokeWidth="2.5" fill="none" />
                      <circle
                        cx="10"
                        cy="10"
                        r="8"
                        stroke="#FF5B00"
                        strokeWidth="2.5"
                        strokeDasharray={50.2}
                        strokeDashoffset={50.2 * (1 - cancellationSeconds / ORDER_CHANGE_WINDOW_SECONDS)}
                        strokeLinecap="round"
                        fill="none"
                        className="transition-all duration-900 ease-linear"
                      />
                    </svg>
                  </div>
                  <span className="font-mono text-xs font-bold text-white">
                    0:{cancellationSeconds < 10 ? `0${cancellationSeconds}` : cancellationSeconds}
                  </span>
                  <span className="text-[11px] font-semibold text-white/70">to change</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setViewMode("history");
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-bold flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <Package className="w-3.5 h-3.5 text-[#FF5B00]" />
                  <span>All Orders ({orderHistory.length})</span>
                </button>
              )}
            </div>
          </header>

          {/* Body Content */}
          {showsMap ? (
            /* MAP TRACKING (OUT FOR DELIVERY / DELIVERED) */
            <div className="relative flex-1 max-w-md mx-auto w-full flex flex-col justify-between p-4 space-y-4">
              <div className="rounded-3xl overflow-hidden border border-white/10 shadow-2xl">
                <MapTracking
                  orderId={targetOrderId}
                  initialLat={33.748413}
                  initialLng={75.150839}
                  customerLat={displayedOrder.location?.lat || 33.7385}
                  customerLng={displayedOrder.location?.lng || 75.1565}
                  destinationName={displayedOrder.location?.address || "Your Doorstep"}
                />
              </div>

              {/* Obsidian Floating OrderCard */}
              <div className="bg-[#15161A] border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <Bike className="w-5 h-5 text-[#FF5B00] stroke-[2.2]" />
                    <span className="text-base font-bold text-white">
                      {isDelivered ? "Delivered to Doorstep" : "Rider is heading to you"}
                    </span>
                  </div>
                  {isOutForDelivery && (
                    <span className="text-xs font-black text-[#FF5B00] tracking-wider uppercase">
                      ETA {etaData.etaMinutes} MINS
                    </span>
                  )}
                </div>

                {/* Road progress line */}
                <div className="text-xs text-white/75 font-medium">
                  {etaData.distanceFormatted} · {etaData.isLive ? "Live GPS telemetry" : "Central Hub"}
                </div>

                {/* Delivery Progress Rail */}
                <ProgressRail stageProgress={stageProgress} isDelivered={isDelivered} />

                {/* Delivery Verification Code Row */}
                {!isDelivered && displayedOrder.otp && (
                  <DeliveryCodeRow otp={displayedOrder.otp} />
                )}

                {/* 3D Delivery Driver Model Viewer */}
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setShow3DRider((prev) => !prev);
                    }}
                    className="w-full py-2.5 px-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer text-left"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#FF5B00]/20 border border-[#FF5B00]/30 flex items-center justify-center p-0.5 overflow-hidden">
                        <img src="/rider/rider_180.png" alt="3D Rider" className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">3D Delivery Partner</span>
                        <span className="text-[10px] text-white/55">Official DASHit 3D Scooter Model</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#FF5B00] px-2.5 py-1 rounded-full bg-[#FF5B00]/15 border border-[#FF5B00]/30">
                      {show3DRider ? "Hide 3D" : "View 3D"}
                    </span>
                  </button>

                  {show3DRider && (
                    <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-black/70 shadow-2xl">
                      <Rider3DViewer className="w-full h-64" autoRotate={true} />
                    </div>
                  )}
                </div>

                <div className="h-[1px] bg-white/10" />

                {/* Footer items & bill */}
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span>
                    {(displayedOrder.items || []).reduce((s, i) => s + (Number(i.qty) || 1), 0)} items · ₹{displayedOrder.totalAmount || displayedOrder.finalTotal || displayedOrder.total || 0}
                  </span>
                  <span className="font-mono text-white/45">
                    #{String(targetOrderId || "").slice(-6).toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            /* STAGE SCREEN (RECEIVED & PACKING) */
            <main className="flex-1 max-w-md mx-auto w-full px-4 pt-3 pb-20 space-y-6">
              {/* Order Stage Hero */}
              <div className="text-center pt-2 space-y-3">
                <OrderStageAnimation
                  kind={isPacking ? "PACKING" : "RECEIVED"}
                  className="w-40 h-40 mx-auto"
                />

                <div className="space-y-1.5 px-4">
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    {isCancelled
                      ? (displayedOrder.rejectionReason ? "Order rejected by store" : "Order cancelled")
                      : isPacking
                      ? "Packing your order"
                      : "Order received"}
                  </h2>
                  <p className="text-sm font-medium text-white/65 max-w-xs mx-auto leading-snug">
                    {isCancelled
                      ? (displayedOrder.rejectionReason
                          ? `Reason: ${displayedOrder.rejectionReason}`
                          : "This order won't be delivered.")
                      : cancellationSeconds > 0
                      ? "You can still add items or cancel. Packing starts right after."
                      : isPacking
                      ? "Your items are being picked and packed. The map opens as soon as a rider is on the way."
                      : "The store is getting your items ready."}
                  </p>
                </div>
              </div>

              {/* Obsidian OrderCard */}
              <div className="bg-[#15161A] border border-white/10 rounded-3xl p-5 shadow-2xl space-y-4 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    {isCancelled ? (
                      <XCircle className="w-5 h-5 text-rose-500 stroke-[2.2]" />
                    ) : isPacking ? (
                      <Package className="w-5 h-5 text-[#FF5B00] stroke-[2.2]" />
                    ) : (
                      <Clock className="w-5 h-5 text-[#FF5B00] stroke-[2.2]" />
                    )}
                    <span className="text-base font-bold text-white">
                      {isCancelled
                        ? (displayedOrder.rejectionReason ? "Order Rejected" : "Order Cancelled")
                        : isPacking
                        ? "Packing at Central Hub"
                        : "Order placed"}
                    </span>
                  </div>
                </div>

                {/* Rejection Notice Banner */}
                {isCancelled && displayedOrder.rejectionReason && (
                  <div className="bg-rose-500/15 border border-rose-500/30 rounded-2xl p-4 space-y-1">
                    <span className="text-[11px] font-black uppercase tracking-wider text-rose-400 block">
                      Rejection Reason
                    </span>
                    <p className="text-sm font-semibold text-rose-100 leading-snug">
                      {displayedOrder.rejectionReason}
                    </p>
                  </div>
                )}

                {/* Progress Rail */}
                <ProgressRail stageProgress={stageProgress} isDelivered={false} />

                {/* Delivery Verification Code */}
                {displayedOrder.otp && (
                  <DeliveryCodeRow otp={displayedOrder.otp} />
                )}

                {/* 30-Second Change Window Row */}
                {cancellationSeconds > 0 && (
                  <div className="bg-white/[0.06] border border-white/[0.08] rounded-2xl p-3.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <span className="block text-xs font-bold text-white truncate">
                        Forgot something?
                      </span>
                      <span className="block text-[11px] font-medium text-white/60 truncate mt-0.5">
                        Add or cancel before packing
                      </span>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setIsCancelModalOpen(true)}
                        disabled={isCancelling}
                        className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold transition-all active:scale-95 cursor-pointer disabled:opacity-50"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsModifyModalOpen(true)}
                        className="px-3.5 py-1.5 rounded-full bg-[#FF5B00] hover:bg-[#E04E00] text-white text-xs font-bold flex items-center space-x-1 shadow-sm transition-all active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Add items</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 3D Delivery Partner Model Viewer */}
                <div className="pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      hapticLight();
                      setShow3DRider((prev) => !prev);
                    }}
                    className="w-full py-2.5 px-3.5 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-between transition-all active:scale-[0.98] cursor-pointer text-left"
                  >
                    <div className="flex items-center space-x-2.5">
                      <div className="w-8 h-8 rounded-xl bg-[#FF5B00]/20 border border-[#FF5B00]/30 flex items-center justify-center p-0.5 overflow-hidden">
                        <img src="/rider/rider_180.png" alt="3D Rider" className="w-full h-full object-contain" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">Meet Your Delivery Partner</span>
                        <span className="text-[10px] text-white/55">Official DASHit 3D Rider & Scooter Model</span>
                      </div>
                    </div>
                    <span className="text-xs font-bold text-[#FF5B00] px-2.5 py-1 rounded-full bg-[#FF5B00]/15 border border-[#FF5B00]/30">
                      {show3DRider ? "Hide 3D" : "View 3D"}
                    </span>
                  </button>

                  {show3DRider && (
                    <div className="mt-3 overflow-hidden rounded-2xl border border-white/10 bg-black/70 shadow-2xl">
                      <Rider3DViewer className="w-full h-64" autoRotate={true} />
                    </div>
                  )}
                </div>

                <div className="h-[1px] bg-white/10" />

                {/* Footer details */}
                <div className="flex items-center justify-between text-xs text-white/60">
                  <span>
                    {(displayedOrder.items || []).reduce((s, i) => s + (Number(i.qty) || 1), 0)} items · ₹{displayedOrder.totalAmount || displayedOrder.finalTotal || displayedOrder.total || 0}
                  </span>
                  <span className="font-mono text-white/45">
                    #{String(targetOrderId || "").slice(-6).toUpperCase()}
                  </span>
                </div>
              </div>

              {/* OrderItemsCard */}
              <div className="bg-white/[0.06] border border-white/[0.08] rounded-2xl p-4 space-y-3">
                <span className="block text-sm font-bold text-white">
                  {isPacking ? "Being packed" : "Your items"}
                </span>

                <div className="divide-y divide-white/[0.08]">
                  {(displayedOrder.items || []).map((item, idx) => (
                    <div key={idx} className="py-2.5 first:pt-1 last:pb-1 flex items-center justify-between gap-3">
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className="w-11 h-11 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 border border-white/10 overflow-hidden">
                          <img
                            src={item.img || item.image || "/favicon.png"}
                            alt={item.name}
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div className="min-w-0">
                          <span className="block text-xs font-semibold text-white truncate">
                            {item.name}
                          </span>
                          <span className="block text-[11px] text-white/55 mt-0.5">
                            {item.unit || "1 unit"} · ×{item.qty}
                          </span>
                        </div>
                      </div>

                      <span className="font-mono text-xs font-bold text-white shrink-0">
                        ₹{item.price * item.qty}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Address link */}
                {(displayedOrder.location?.address || displayedOrder.userAddress?.address) && (
                  <div className="pt-2 border-t border-white/[0.08] flex items-start space-x-2 text-xs text-white/65">
                    <MapPin className="w-3.5 h-3.5 text-white/50 shrink-0 mt-0.5" />
                    <span className="leading-snug">
                      {displayedOrder.location?.address || displayedOrder.userAddress?.address}
                    </span>
                  </div>
                )}
              </div>
            </main>
          )}
        </div>
      ) : (
        /* =====================================================================
            VIEW 2: ORDER HISTORY ("ORDER AGAIN" - PARITY WITH OrdersScreen.kt)
            ===================================================================== */
        <div className="min-h-screen">
          {/* Top Header */}
          <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3 shadow-xs dark:bg-surface/95 dark:border-line/80">
            <div className="max-w-md mx-auto flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    if (window.history.length > 1) {
                      goBack(router);
                    } else {
                      router.push("/shop");
                    }
                  }}
                  className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors active:scale-95 dark:bg-surface-muted dark:hover:bg-surface-muted dark:text-content"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <h1 className="font-black text-xl text-slate-900 tracking-tight dark:text-content">
                    Order again
                  </h1>
                </div>
              </div>

              {activeOrder && (
                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setSelectedOrder(activeOrder);
                    setViewMode("tracking");
                  }}
                  className="px-3.5 py-1.5 rounded-full bg-[#22C55E]/15 text-[#22C55E] border border-[#22C55E]/30 text-xs font-bold flex items-center space-x-1.5 active:scale-95 cursor-pointer"
                >
                  <span className="w-2 h-2 rounded-full bg-[#22C55E] animate-pulse" />
                  <span>Live Delivery</span>
                </button>
              )}
            </div>
          </header>

          <main className="max-w-md mx-auto px-4 mt-4 space-y-4">
            {/* Active order quick glance if in progress */}
            {activeOrder && (
              <div
                onClick={() => {
                  hapticLight();
                  setSelectedOrder(activeOrder);
                  setViewMode("tracking");
                }}
                className="bg-[#15161A] text-white border border-white/12 rounded-3xl p-4 shadow-md flex items-center justify-between gap-3 cursor-pointer select-none transition-transform active:scale-[0.98]"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-10 h-10 rounded-2xl bg-[#FF5B00]/20 text-[#FF5B00] flex items-center justify-center shrink-0">
                    <Bike className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-white truncate">
                        {activeOrder.status === "Out for Delivery"
                          ? "Rider Dispatched"
                          : activeOrder.status === "Packed"
                          ? "Order Packed"
                          : "Processing at Central Hub"}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                    </div>
                    <span className="text-[11px] text-white/60 block truncate mt-0.5">
                      #{String(activeOrder.orderId || activeOrder.id || "").slice(-6).toUpperCase()} · Tap to track live
                    </span>
                  </div>
                </div>

                <div className="bg-[#22C55E] text-white px-3 py-1.5 rounded-xl font-bold text-xs flex items-center space-x-1 shrink-0 shadow-sm">
                  <span>🛵 Track</span>
                </div>
              </div>
            )}

            {/* Orders List */}
            {orderHistory.length === 0 && !activeOrder ? (
              <div className="bg-white border border-slate-200/90 rounded-3xl p-8 text-center space-y-3 shadow-xs dark:bg-surface-raised dark:border-line/90">
                <div className="w-14 h-14 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto dark:bg-surface-muted dark:text-content-faint">
                  <ShoppingBag className="w-7 h-7 stroke-[1.8]" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-content">No orders yet</h3>
                  <p className="text-xs text-slate-500 font-medium max-w-xs mx-auto dark:text-content-secondary">
                    When you place an order, you can track it live and reorder your favorites from here.
                  </p>
                </div>
                <Link
                  href="/shop"
                  className="inline-block bg-[#FF5B00] hover:bg-[#E04E00] text-white font-extrabold text-xs px-6 py-2.5 rounded-2xl shadow-md transition-all active:scale-95"
                >
                  Start Shopping
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {orderHistory.map((ord, idx) => {
                  const status = ord.status || "Delivered";
                  const isDeliv = String(status).toLowerCase().includes("deliver");
                  const isCanc = String(status).toLowerCase().includes("cancel");
                  const isOut = String(status).toLowerCase().includes("out") || String(status).toLowerCase().includes("way");

                  const statusColor = isDeliv
                    ? "text-[#22C55E]"
                    : isCanc
                    ? "text-rose-500"
                    : isOut
                    ? "text-amber-500"
                    : "text-[#FF5B00]";

                  const statusDotBg = isDeliv
                    ? "bg-[#22C55E]"
                    : isCanc
                    ? "bg-rose-500"
                    : isOut
                    ? "bg-amber-500"
                    : "bg-[#FF5B00]";

                  const ordId = ord.orderId || ord.id || "";
                  const total = ord.totalAmount || ord.finalTotal || ord.total || 0;
                  const itemsCount = (ord.items || []).reduce((s, i) => s + (Number(i.qty) || 1), 0);

                  return (
                    <div
                      key={ordId || idx}
                      className="bg-white border border-slate-200/90 rounded-2xl p-4 space-y-3 shadow-xs dark:bg-surface-raised dark:border-line/90"
                    >
                      {/* Status Row & Date */}
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2">
                          <span className={`w-2 h-2 rounded-full ${statusDotBg}`} />
                          <span className={`font-bold ${statusColor}`}>{status}</span>
                        </div>
                        <span className="text-[11.5px] text-slate-400 font-medium dark:text-content-faint">
                          {formatDate(ord)}
                        </span>
                      </div>

                      {/* Product Packshots Strip */}
                      <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none py-1">
                        {(ord.items || []).map((item, itemIdx) => (
                          <div
                            key={itemIdx}
                            className="w-12 h-12 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 border border-slate-100 shadow-2xs dark:border-line-soft overflow-hidden"
                            title={item.name}
                          >
                            <img
                              src={item.img || item.image || "/favicon.png"}
                              alt={item.name}
                              className="w-full h-full object-contain"
                            />
                          </div>
                        ))}
                      </div>

                      {/* Items Count & Total Bill */}
                      <div className="flex items-center justify-between text-xs pt-1">
                        <span className="text-slate-600 font-medium dark:text-content-secondary">
                          {itemsCount} {itemsCount === 1 ? "item" : "items"}
                        </span>
                        <span className="font-mono text-sm font-black text-slate-900 dark:text-content">
                          ₹{total}
                        </span>
                      </div>

                      {/* Rejection reason notice if cancelled */}
                      {isCanc && ord.rejectionReason && (
                        <div className="bg-rose-50 border border-rose-200/80 rounded-xl px-3.5 py-2 space-y-0.5 dark:bg-rose-950/30 dark:border-rose-800/40">
                          <span className="text-[10px] font-black uppercase text-rose-500 tracking-wider block">
                            Rejected by Store
                          </span>
                          <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                            Reason: {ord.rejectionReason}
                          </p>
                        </div>
                      )}

                      <div className="h-[1px] bg-slate-100 dark:bg-line-soft" />

                      {/* Actions Row */}
                      <div className="flex items-center justify-between pt-0.5">
                        <span className="font-mono text-[11px] font-semibold text-slate-400 dark:text-content-faint">
                          #{String(ordId).slice(-6).toUpperCase()}
                        </span>

                        <div className="flex items-center space-x-2">
                          {/* If active, give live tracking */}
                          {!isDeliv && !isCanc ? (
                            <button
                              type="button"
                              onClick={() => {
                                hapticMedium();
                                setSelectedOrder(ord);
                                setViewMode("tracking");
                              }}
                              className="bg-[#22C55E] hover:bg-[#1eb354] text-white font-bold text-xs px-3.5 py-1.5 rounded-xl shadow-xs transition-all active:scale-95 flex items-center space-x-1.5 cursor-pointer"
                            >
                              <span>🛵 Track Live Delivery</span>
                            </button>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  hapticLight();
                                  setSelectedOrder(ord);
                                  setViewMode("tracking");
                                }}
                                className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs px-3 py-1.5 rounded-xl border border-slate-200/80 transition-all active:scale-95 dark:bg-surface-muted dark:hover:bg-surface-overlay dark:border-line dark:text-content-secondary cursor-pointer"
                              >
                                View Route
                              </button>

                              <button
                                type="button"
                                onClick={() => handleReorder(ord)}
                                className="bg-[#FF5B00]/12 hover:bg-[#FF5B00]/20 text-[#FF5B00] border border-[#FF5B00]/30 font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all active:scale-95 flex items-center space-x-1.5 cursor-pointer"
                              >
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Reorder</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Past Picks & Recommendations */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-4 space-y-3.5 shadow-xs dark:bg-surface-raised dark:border-line/90">
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
                      1-tap quick add from your favorites
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
                        <div className="w-full aspect-square rounded-xl bg-white flex items-center justify-center p-2 mb-2 overflow-hidden border border-slate-100 dark:border-line-soft relative">
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
          </main>
          <BottomNav />
        </div>
      )}

      {/* 30s Order Content Modifier Modal */}
      <ModifyOrderModal
        isOpen={isModifyModalOpen}
        onClose={() => setIsModifyModalOpen(false)}
        order={displayedOrder}
        productsList={browseable(productsList)}
        onSaveOrder={handleSaveModifiedOrder}
        remainingSeconds={cancellationSeconds}
      />

      {/* 30s Frictionless Cancellation Modal */}
      <CancelOrderModal
        isOpen={isCancelModalOpen}
        onClose={() => setIsCancelModalOpen(false)}
        onConfirmCancel={handleConfirmCancellation}
        order={displayedOrder}
        isCancelling={isCancelling}
      />

      {/* Toast Notification */}
      <AnimatePresence>
        {modifyToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[150] bg-[#061838] dark:bg-white text-white dark:text-[#061838] px-4 py-2.5 rounded-2xl shadow-xl text-xs font-black flex items-center space-x-2 border border-slate-700/50"
          >
            <Sparkles className="w-4 h-4 text-[#FF5B00] shrink-0" />
            <span>{modifyToast}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * ProgressRail component matching Android's OrderProgressRail
 */
function ProgressRail({ stageProgress, isDelivered }) {
  return (
    <div className="relative py-1 flex items-center w-full">
      <div className="relative flex-1 flex items-center mr-3 h-7">
        {/* Background dashed track */}
        <div className="absolute inset-x-0 h-[2.5px] border-t-[2.5px] border-dashed border-white/25 top-1/2 -translate-y-1/2" />

        {/* Solid white fill */}
        <motion.div
          className={`absolute left-0 top-1/2 -translate-y-1/2 h-[3.5px] ${isDelivered ? "bg-[#22C55E]" : "bg-white"} rounded-full`}
          initial={{ width: "15%" }}
          animate={{ width: `${Math.round(stageProgress * 100)}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        />

        {/* Stage Marker Avatar */}
        <motion.div
          className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full ${isDelivered ? "bg-[#22C55E] text-white" : "bg-white text-[#060709]"} shadow-md flex items-center justify-center z-10`}
          animate={{ left: `${Math.round(stageProgress * 100)}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          {isDelivered ? (
            <Check className="w-3.5 h-3.5 stroke-[3]" />
          ) : stageProgress >= 0.7 ? (
            <Bike className="w-3.5 h-3.5 stroke-[2.5]" />
          ) : stageProgress >= 0.4 ? (
            <Package className="w-3.5 h-3.5 stroke-[2.5]" />
          ) : (
            <Clock className="w-3.5 h-3.5 stroke-[2.5]" />
          )}
        </motion.div>
      </div>

      {/* Destination Home Marker */}
      <div
        className={`w-6 h-6 rounded-full ${isDelivered ? "bg-[#22C55E] text-white" : "bg-white text-[#060709]"} shadow-md flex items-center justify-center shrink-0 z-10`}
      >
        <Check className="w-3.5 h-3.5 stroke-[3]" />
      </div>
    </div>
  );
}

/**
 * 4-digit Delivery Verification Code Row matching Android DeliveryCodeRow
 */
function DeliveryCodeRow({ otp }) {
  const digits = String(otp || "4821").padStart(4, "0").slice(0, 4).split("");

  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center space-x-2.5">
        <Shield className="w-5 h-5 text-[#FF5B00] stroke-[2.2] shrink-0" />
        <div>
          <span className="block text-xs font-semibold text-white">Delivery code</span>
          <span className="block text-[11px] text-white/60">Share it with your rider at the door</span>
        </div>
      </div>

      <div className="flex items-center space-x-1.5 shrink-0">
        {digits.map((d, i) => (
          <div
            key={i}
            className="w-7 h-9 rounded-lg bg-white/10 border border-white/10 flex items-center justify-center font-mono text-base font-black text-white shadow-inner select-none"
          >
            {d}
          </div>
        ))}
      </div>
    </div>
  );
}
