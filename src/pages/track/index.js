import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import dynamic from "next/dynamic";
import SEO from "../../components/SEO";
import {
  Bike,
  Package,
  Check,
  CheckCircle2,
  ArrowLeft,
  Shield,
  ChevronDown,
  ChevronUp,
  MapPin,
  Clock,
  Plus,
  Home,
  Receipt,
  XCircle,
  Share2,
  Printer
} from "lucide-react";
import {
  watchOrder,
  watchOrderTracking,
  ORDER_CHANGE_WINDOW_SECONDS,
  cancelPlacedOrder,
  addItemsToOrder,
  adoptReplacementOrder
} from "../../lib/db";
import { orderChangeSecondsLeft, isPaidOnline, replacementIdOf } from "../../lib/orderChange";
import { watchShopProducts } from "../../lib/catalogueFile";
import { watchActiveCoupons } from "../../lib/coupons";
import { browseable } from "../../lib/tobacco";
import { hapticLight, hapticMedium, hapticSuccess } from "../../lib/haptics";
import ModifyOrderModal from "../../components/ModifyOrderModal";
import { useShopRules } from "../../lib/useShopRules";
import CancelOrderModal from "../../components/CancelOrderModal";
import { productImageUrl } from "../../components/ProductImage";
import { deliveryFeeParts } from "../../lib/nightCharge";

const MapTracking = dynamic(() => import("../../components/MapTracking"), { ssr: false });

function formatDisplayId(id) {
  if (!id) return "";
  const cleaned = String(id).replace(/^DASH-?/i, "").replace(/^#/, "").replace(/^-/, "");
  return cleaned.length > 5 ? cleaned.slice(-5).toUpperCase() : cleaned.toUpperCase();
}

export default function OrderTrackingPage() {
  const router = useRouter();
  const [order, setOrder] = useState(null);
  /* True once this browser's saved orders have been read. Until then the page
     shows only its dark ground, never a guess. */
  const [resolved, setResolved] = useState(false);
  /* Empty until the rider's phone reports. These used to start as a made-up
     rider, ETA and distance, shown as if they were real. */
  const [telemetry, setTelemetry] = useState({
    etaMinutes: null,
    distanceKm: null,
    riderName: "",
    riderStatus: "",
    queuePosition: 0,
  });
  const [isDetailsExpanded, setIsDetailsExpanded] = useState(false);
  const [cancellationSeconds, setCancellationSeconds] = useState(0);
  const [isModifyModalOpen, setIsModifyModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [productsList, setProductsList] = useState([]);
  const [orderCoupon, setOrderCoupon] = useState(null);
  // The shop's current delivery fees, for the bill when items are added.
  const shopRulesNow = useShopRules();
  const [changeNotice, setChangeNotice] = useState("");
  const [cancelError, setCancelError] = useState("");

  // 1. Resolve target order from router query or localStorage
  useEffect(() => {
    const syncOrder = () => {
      try {
        const queryId = router.query.id;
        const activeRaw = localStorage.getItem("dashit_active_order");
        const historyRaw = localStorage.getItem("dashit_orders_history");

        let activeParsed = activeRaw ? JSON.parse(activeRaw) : null;
        let historyParsed = historyRaw ? JSON.parse(historyRaw) : [];

        if (queryId) {
          const match =
            (activeParsed && String(activeParsed.orderId || activeParsed.id) === String(queryId))
              ? activeParsed
              : historyParsed.find((o) => String(o.orderId || o.id) === String(queryId));
          if (match) {
            setOrder(match);
            return;
          }
        }

        if (activeParsed) {
          setOrder(activeParsed);
          return;
        }

        if (historyParsed && historyParsed.length > 0) {
          setOrder(historyParsed[0]);
        }
      } catch (e) {}
    };

    // The id in the address is only there once the router is ready.
    if (!router.isReady) return undefined;
    syncOrder();
    setResolved(true);
    window.addEventListener("dashit_orders_updated", syncOrder);
    window.addEventListener("dashit_order_updated", syncOrder);
    window.addEventListener("storage", syncOrder);

    return () => {
      window.removeEventListener("dashit_orders_updated", syncOrder);
      window.removeEventListener("dashit_order_updated", syncOrder);
      window.removeEventListener("storage", syncOrder);
    };
  }, [router.isReady, router.query.id]);

  const targetOrderId = order?.orderId || order?.id || null;

  // 2. Real-time Firestore sync
  useEffect(() => {
    if (!targetOrderId) return;
    const unsubOrder = watchOrder(targetOrderId, (data) => {
      if (!data) return;
      /* The device's own copy of an order the server hasn't stamped yet has no
         createdAt: keep the time already known, or the countdown reads 0. */
      const fresh = { ...data };
      if (fresh.createdAt == null) delete fresh.createdAt;
      setOrder((prev) => {
        // A late answer for an order this page has already moved on from.
        const shown = prev?.orderId || prev?.id;
        if (shown && String(shown) !== String(targetOrderId)) return prev;
        return { ...(prev || {}), ...fresh };
      });
    });

    const unsubTracking = watchOrderTracking(targetOrderId, (track) => {
      if (track) {
        setTelemetry((prev) => ({
          ...prev,
          etaMinutes: track.etaMinutes ? Number(track.etaMinutes) : prev.etaMinutes,
          distanceKm: track.distanceKm ? Number(track.distanceKm).toFixed(1) : prev.distanceKm,
          riderName: track.driverName || prev.riderName,
          riderStatus: track.status || prev.riderStatus,
          queuePosition: track.queuePosition !== undefined ? Number(track.queuePosition) : prev.queuePosition,
        }));
      }
    });

    return () => {
      if (typeof unsubOrder === "function") unsubOrder();
      if (typeof unsubTracking === "function") unsubTracking();
    };
  }, [targetOrderId]);

  // 3. Countdown timer for cancellation/modification
  useEffect(() => {
    if (!order) return;
    const updateTime = () => setCancellationSeconds(orderChangeSecondsLeft(order));
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [order]);

  /* 4. "Add items": the shop's items, from the catalogue file the shop pages
     use. Only asked for while the order can still be changed. */
  const canChange = cancellationSeconds > 0;
  useEffect(() => {
    if (!canChange && !isModifyModalOpen) return undefined;
    const unsub = watchShopProducts((list) => {
      if (list && list.length > 0) setProductsList(list);
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [canChange, isModifyModalOpen]);
  const addableProducts = useMemo(() => browseable(productsList), [productsList]);

  /* The order's offer code, to work its discount out again for the new item
     total. A code that took nothing off (free delivery) needs no lookup. */
  const couponCode = Number(order?.discount) > 0 ? String(order?.couponCode || "").trim().toLowerCase() : "";
  useEffect(() => {
    if (!couponCode || !canChange) return undefined;
    const unsub = watchActiveCoupons((list) => {
      setOrderCoupon(list.find((c) => String(c.code || "").trim().toLowerCase() === couponCode) || null);
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, [couponCode, canChange]);

  /* 5. Items added from the app or another tab: this order was cancelled as
     "Replaced by <id>". Follow the order that took its place. */
  const replacedById = replacementIdOf(order);
  useEffect(() => {
    if (!replacedById || !targetOrderId) return undefined;
    const unsub = watchOrder(replacedById, (data) => {
      if (!data) return;
      const replacement = JSON.parse(JSON.stringify({ ...data, orderId: data.orderId || data.id }));
      if (adoptReplacementOrder(targetOrderId, replacement)) {
        router.replace(`/track?id=${replacedById}`).catch(() => {});
      }
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [replacedById, targetOrderId]);

  useEffect(() => {
    if (!changeNotice) return undefined;
    const timer = setTimeout(() => setChangeNotice(""), 8000);
    return () => clearTimeout(timer);
  }, [changeNotice]);

  // Normalized order status
  const currentStatus = String(order?.status || "Placed");
  const normStatus = currentStatus.trim().toLowerCase().replace(/_/g, " ");
  const isOutForDelivery = normStatus === "out for delivery";
  const isDelivered = normStatus === "delivered";
  const isCancelled = normStatus === "cancelled";
  const isPacking = normStatus === "packed" || normStatus === "packing";

  // Progress percentage matching Android OrderProgressRail
  const stageProgress = isDelivered ? 1.0 : isOutForDelivery ? 0.75 : isPacking ? 0.45 : 0.18;

  /* The map reports only what it knows; an empty value never wipes one the
     rider's phone already sent. */
  const handleMapTelemetry = useCallback((tel) => {
    setTelemetry((prev) => {
      const next = { ...prev };
      for (const [key, value] of Object.entries(tel || {})) {
        if (value !== null && value !== undefined && value !== "") next[key] = value;
      }
      return next;
    });
  }, []);

  /* The shopper is only told "cancelled" once the store has it. */
  const handleCancelOrder = async ({ restoreCart } = {}) => {
    if (!order || isCancelling) return;
    setIsCancelling(true);
    setCancelError("");
    try {
      await cancelPlacedOrder(targetOrderId);
      if (restoreCart && items.length > 0) {
        localStorage.setItem("dashit_cart", JSON.stringify(items));
        window.dispatchEvent(new Event("dashit_cart_updated"));
      }
      hapticSuccess();
      setIsCancelModalOpen(false);
      router.push("/orders");
    } catch (e) {
      setIsCancelModalOpen(false);
      setCancelError(e?.message || "We couldn't cancel this order. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };

  /* Resolves only once the store has the new order (addItemsToOrder throws an
     OrderChangeError otherwise, which the sheet shows). By then this browser's
     saved orders already point at it. */
  const handleAddItems = async (additions, expectedTotal) => {
    const result = await addItemsToOrder(targetOrderId, additions, { coupon: orderCoupon, expectedTotal, rules: shopRulesNow });
    const total = Number(result.order?.total) || 0;
    setChangeNotice(`Added to your order. Your new total is ₹${total.toFixed(0)}.`);
    router.replace(`/track?id=${result.orderId}`).catch(() => {});
  };

  const handleBack = () => {
    hapticLight();
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/orders");
    }
  };

  const grandTotal = Number(order?.total || order?.grandTotal || order?.amount || 0);
  const items = Array.isArray(order?.items) ? order.items : [];
  const itemCount = items.reduce((sum, it) => sum + (Number(it.qty || it.quantity) || 1), 0);
  // The real PIN or nothing: a made-up one here would be read out to the rider.
  const otpCode = order?.otp ? String(order.otp) : "";
  const paidOnline = isPaidOnline(order);

  if (!order) {
    return (
      <div className="dark fixed inset-0 w-screen h-screen overflow-hidden bg-[#060709] text-white flex flex-col items-center justify-center px-6 text-center">
        <SEO title="Track your order - DASHit" noindex={true} />
        {resolved && (
          <>
            <span className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center">
              <Package className="w-6 h-6 text-white/70" />
            </span>
            <h1 className="mt-4 text-[19px] font-bold">No order to track</h1>
            <p className="mt-1.5 max-w-xs text-[14px] text-white/60">
              Orders you place on this device show up here while they are on the way.
            </p>
            <div className="mt-6 flex items-center gap-3">
              <Link href="/shop" className="h-11 px-5 rounded-xl bg-[#FF5B00] hover:bg-[#E04E00] text-white text-[15px] font-bold flex items-center">
                Go to the shop
              </Link>
              <Link href="/orders" className="h-11 px-5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-[15px] font-bold flex items-center">
                My orders
              </Link>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="dark fixed inset-0 w-screen h-screen overflow-hidden bg-[#060709] text-white select-none">
      <SEO title={`Track Order #${formatDisplayId(targetOrderId)} - DASHit`} noindex={true} />

      {/* =====================================================================
          1. FULL SCREEN MAP BACKGROUND (Fills 100% of viewport edge-to-edge)
          ===================================================================== */}
      <div className="absolute inset-0 w-full h-full z-0">
        <MapTracking
          orderId={targetOrderId}
          initialLat={33.748413}
          initialLng={75.150839}
          customerLat={order?.location?.lat || order?.deliveryAddress?.latitude || 33.7385}
          customerLng={order?.location?.lng || order?.deliveryAddress?.longitude || 75.1565}
          destinationName={order?.location?.address || order?.deliveryAddress?.address || "Your Doorstep"}
          fullScreen={true}
          onTelemetryChange={handleMapTelemetry}
        />
      </div>

      {/* =====================================================================
          2. FLOATING TOP OVERLAY BAR (Back Button + Change Countdown Pill)
          ===================================================================== */}
      <div className="fixed top-0 left-0 right-0 z-30 pt-[calc(env(safe-area-inset-top,0px)+12px)] px-4 pointer-events-none">
        <div className="max-w-md mx-auto flex items-center justify-between">
          {/* Circular Floating Back Button (Black glass, white arrow matching Android) */}
          <button
            type="button"
            onClick={handleBack}
            className="pointer-events-auto w-11 h-11 rounded-full bg-black/75 backdrop-blur-xl border border-white/15 text-white flex items-center justify-center shadow-2xl active:scale-90 transition-transform cursor-pointer"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          {/* Change Window Countdown or Order ID Badge */}
          {cancellationSeconds > 0 ? (
            <div className="pointer-events-auto h-9 px-3.5 rounded-full bg-black/80 backdrop-blur-xl border border-white/15 flex items-center space-x-2 text-white shadow-xl select-none">
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
            <div className="pointer-events-auto px-3.5 py-1.5 rounded-full bg-black/75 backdrop-blur-xl border border-white/15 flex items-center space-x-1.5 text-xs font-bold text-white shadow-xl">
              <span className="font-mono text-xs text-white/80">
                #{formatDisplayId(targetOrderId)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* =====================================================================
          3. SMALL POP-UP CARD AT THE BOTTOM (Exact Android OrderCard Parity)
          ===================================================================== */}
      <div className="fixed bottom-3 left-3 right-3 sm:bottom-6 sm:left-1/2 sm:-translate-x-1/2 sm:w-[440px] z-30 pointer-events-none">
        <div className="pointer-events-auto bg-[#141416]/95 backdrop-blur-2xl border border-white/12 rounded-3xl p-4 sm:p-5 shadow-[0_12px_45px_rgba(0,0,0,0.7)] text-white space-y-3.5 max-h-[82vh] overflow-y-auto scrollbar-none transition-all duration-300">
          
          {/* Header Row: Stage Icon + Headline + ETA Badge */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2.5">
              {isCancelled ? (
                <div className="w-6 h-6 rounded-full bg-rose-500/20 flex items-center justify-center text-rose-500">
                  <XCircle className="w-4 h-4 stroke-[2.5]" />
                </div>
              ) : isDelivered ? (
                <div className="w-6 h-6 rounded-full bg-[#00D26A]/20 flex items-center justify-center text-[#00D26A]">
                  <Check className="w-4 h-4 stroke-[3]" />
                </div>
              ) : isOutForDelivery ? (
                <div className="w-6 h-6 rounded-full bg-[#FF5B00]/20 flex items-center justify-center text-[#FF5B00]">
                  <Bike className="w-4 h-4 animate-pulse stroke-[2.5]" />
                </div>
              ) : (
                <div className="w-6 h-6 rounded-full bg-[#FF5B00]/20 flex items-center justify-center text-[#FF5B00]">
                  <Package className="w-4 h-4 stroke-[2.5]" />
                </div>
              )}
              <h3 className="font-extrabold text-base text-white tracking-tight">
                {isCancelled
                  ? "Order Cancelled"
                  : isDelivered
                  ? "Delivered to Doorstep"
                  : isOutForDelivery
                  ? `${telemetry.riderName || "Your rider"} is on the way`
                  : isPacking
                  ? "Packing your order"
                  : "Order received"}
              </h3>
            </div>

            {/* ETA Tag */}
            {isCancelled && (
              <span className="text-xs font-bold text-rose-400 bg-rose-500/15 border border-rose-500/25 px-2.5 py-1 rounded-full uppercase">
                Cancelled
              </span>
            )}
            {isOutForDelivery && telemetry.etaMinutes != null && (
              <span className="text-sm font-black text-[#00D26A] tracking-wider uppercase drop-shadow-[0_0_8px_rgba(0,210,106,0.35)]">
                ETA {telemetry.etaMinutes} MINS
              </span>
            )}
            {isDelivered && (
              <span className="text-xs font-bold text-[#00D26A] bg-[#00D26A]/15 border border-[#00D26A]/25 px-2.5 py-1 rounded-full uppercase">
                Delivered
              </span>
            )}
            {!isCancelled && !isOutForDelivery && !isDelivered && (
              <span className="text-xs font-bold text-[#FF5B00] bg-[#FF5B00]/15 border border-[#FF5B00]/25 px-2.5 py-1 rounded-full uppercase">
                {isPacking ? "Packing" : "Received"}
              </span>
            )}
          </div>

          {/* Subtitle / Distance Line */}
          {(() => {
            const cancelReason = order?.rejectionReason || order?.cancelReason || order?.cancelledReason || order?.rejectReason;
            return (
              <>
                <p className="text-xs font-medium text-white/70">
                  {isCancelled
                    ? (cancelReason ? `Reason: ${cancelReason}` : "This order was cancelled and won't be delivered.")
                    : isOutForDelivery
                    ? `${telemetry.distanceKm ? telemetry.distanceKm + " km away • " : ""}Arriving at your doorstep`
                    : isPacking
                    ? "Your items are being picked and packed at DASHit Hub"
                    : "Store received your order. Packing starts right after."}
                </p>

                {isCancelled && (
                  <div className="bg-rose-500/15 border border-rose-500/30 rounded-2xl p-3.5 space-y-1">
                    <span className="text-[11px] font-black uppercase tracking-wider text-rose-400 block">
                      Cancellation Reason
                    </span>
                    <p className="text-xs font-semibold text-rose-100 leading-snug">
                      {cancelReason || "This order was cancelled and will not be delivered."}
                    </p>
                  </div>
                )}
              </>
            );
          })()}

          {/* Stage Rail: OrderProgressRail (1:1 Android Implementation) */}
          <div className="space-y-1.5 pt-1">
            <div className="relative h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#FF5B00] to-[#00D26A] rounded-full transition-all duration-700 ease-out"
                style={{ width: `${Math.round(stageProgress * 100)}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-bold text-white/50 px-0.5">
              <span className={stageProgress >= 0.18 ? "text-white" : ""}>Placed</span>
              <span className={stageProgress >= 0.45 ? "text-white" : ""}>Packing</span>
              <span className={stageProgress >= 0.75 ? "text-white" : ""}>On the way</span>
              <span className={stageProgress >= 1.0 ? "text-[#00D26A]" : ""}>Delivered</span>
            </div>
          </div>

          {/* Courier Details Row (Only when out for delivery or rider assigned) */}
          {isOutForDelivery && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-11 h-11 rounded-xl bg-orange-500/15 border border-orange-500/25 p-1 flex items-center justify-center overflow-hidden">
                  <img
                    src="/rider/rider_180.png"
                    alt=""
                    className="w-full h-full object-contain filter drop-shadow"
                  />
                </div>
                <div>
                  <div className="flex items-center space-x-1.5">
                    <h4 className="font-extrabold text-sm text-white">{telemetry.riderName || "Your rider"}</h4>
                    <span className="w-3.5 h-3.5 rounded-full bg-[#00D26A] text-black flex items-center justify-center text-[9px] font-black">✓</span>
                  </div>
                  <p className="text-[11px] font-medium text-white/60">{telemetry.riderStatus || "On the way to you"}</p>
                </div>
              </div>
            </div>
          )}

          {/* Delivery PIN Row (OTP code) */}
          {!isDelivered && otpCode && (
            <div className="bg-white/5 border border-white/10 rounded-2xl px-3.5 py-2.5 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <Shield className="w-4 h-4 text-[#FF5B00]" />
                <div>
                  <span className="text-xs font-bold text-white block leading-tight">Delivery PIN</span>
                  <span className="text-[10px] text-white/60">Share with partner at door</span>
                </div>
              </div>
              <div className="flex items-center space-x-1.5">
                {String(otpCode).split("").map((digit, i) => (
                  <span
                    key={i}
                    className="w-7 h-9 rounded-lg bg-white/10 border border-white/15 font-mono text-base font-extrabold flex items-center justify-center text-white shadow-sm"
                  >
                    {digit}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Change Window Actions (add items / cancel, for 30 seconds) */}
          {cancellationSeconds > 0 && (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-2">
              {paidOnline ? (
                <div className="leading-tight">
                  <span className="text-xs font-semibold text-white block">Paid online</span>
                  <span className="text-[10px] text-white/60">Items can't be added to a paid order</span>
                </div>
              ) : (
                <div className="leading-tight">
                  <span className="text-xs font-semibold text-white block">Forgot something?</span>
                  <span className="text-[10px] text-white/60">Add or cancel before packing</span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCancelModalOpen(true)}
                  className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-rose-400 text-xs font-semibold active:scale-95 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                {!paidOnline && (
                  <button
                    type="button"
                    onClick={() => setIsModifyModalOpen(true)}
                    className="px-3 py-1.5 rounded-full bg-[#FF5B00] hover:bg-[#e04f00] text-white text-xs font-bold flex items-center space-x-1 active:scale-95 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>Add items</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {cancelError && (
            <p role="alert" className="text-xs font-medium text-red-400">{cancelError}</p>
          )}

          {changeNotice && (
            <p role="status" className="flex items-center space-x-2 text-xs font-semibold text-white">
              <Check className="w-3.5 h-3.5 text-[#00D26A] stroke-[3] shrink-0" />
              <span>{changeNotice}</span>
            </p>
          )}

          {/* Divider & Items Summary with Expandable Drawer */}
          <div className="border-t border-white/10 pt-2.5 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-white/70 block">
                {itemCount} {itemCount === 1 ? "item" : "items"} • ₹{grandTotal.toFixed(0)}
              </span>
              <span className="font-mono text-[10px] text-white/40">
                #{formatDisplayId(targetOrderId)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                hapticLight();
                setIsDetailsExpanded(!isDetailsExpanded);
              }}
              className="px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/15 text-white text-xs font-bold flex items-center space-x-1.5 transition-all active:scale-95 cursor-pointer"
            >
              <span>{isDetailsExpanded ? "Hide Details" : "View Items"}</span>
              {isDetailsExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Expandable Order Details Accordion Drawer */}
          {isDetailsExpanded && (
            <div className="pt-2 border-t border-white/10 space-y-3 max-h-60 overflow-y-auto scrollbar-none animate-fadeIn">
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-white/60 uppercase tracking-wider block">
                  Items in this order
                </span>
                {items.map((it, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs py-1 border-b border-white/5 last:border-0">
                    <div className="flex items-center space-x-2">
                      <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center overflow-hidden shrink-0">
                        {it.img || it.image ? (
                          <img src={productImageUrl(it.img || it.image)} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-4 h-4 text-white/40" />
                        )}
                      </div>
                      <div>
                        <span className="font-semibold text-white line-clamp-1">{it.name}</span>
                        <span className="text-[10px] text-white/50">{it.unit || "unit"} × {it.qty || it.quantity || 1}</span>
                      </div>
                    </div>
                    <span className="font-bold text-white shrink-0">
                      ₹{((Number(it.price) || 0) * (Number(it.qty || it.quantity) || 1)).toFixed(0)}
                    </span>
                  </div>
                ))}
              </div>

              {/* The bill: every order carries the ₹11 handling charge */}
              {(() => {
                const sub = Number(order?.subtotal) || items.reduce((s, it) => s + (Number(it.price) || 0) * (Number(it.qty || it.quantity) || 1), 0);
                const delivery = Number(order?.deliveryFee) || 0;
                const fee = deliveryFeeParts(order);
                const off = Number(order?.discount) || 0;
                const handling = Number(order?.handlingFee ?? Math.max(0, grandTotal - sub - delivery + off)) || 0;
                const row = (label, value) => (
                  <div className="flex items-center justify-between text-xs text-white/75">
                    <span>{label}</span>
                    <span className="font-semibold text-white">{value}</span>
                  </div>
                );
                return (
                  <div className="bg-white/5 rounded-xl p-2.5 space-y-1.5">
                    {row("Item total", `₹${sub.toFixed(0)}`)}
                    {fee.night > 0 && fee.base === 0 ? (
                      row("Delivery charge (by distance)", `₹${fee.night.toFixed(0)}`)
                    ) : (
                      <>
                        {row("Delivery charge", fee.base > 0 ? `₹${fee.base.toFixed(0)}` : "Free")}
                        {fee.night > 0 && row("Distance delivery charge", `₹${fee.night.toFixed(0)}`)}
                      </>
                    )}
                    {fee.extra > 0 && row(fee.extraLabel, `₹${fee.extra.toFixed(0)}`)}
                    {handling > 0 && row("Handling charge", `₹${handling.toFixed(0)}`)}
                    {off > 0 && row("Discount", `-₹${off.toFixed(0)}`)}
                    <div className="border-t border-white/10 pt-1.5">{row("Total", `₹${grandTotal.toFixed(0)}`)}</div>
                  </div>
                );
              })()}

              {/* Delivery Address */}
              <div className="bg-white/5 rounded-xl p-2.5 flex items-start space-x-2 text-xs">
                <MapPin className="w-3.5 h-3.5 text-[#FF5B00] shrink-0 mt-0.5" />
                <span className="text-white/80 line-clamp-2">
                  {order?.location?.address || order?.deliveryAddress?.address || "Anantnag, Jammu & Kashmir"}
                </span>
              </div>

              {/* Trust Badge: Packed with Care in Anantnag */}
              <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 border border-orange-500/20 rounded-xl p-2.5 flex items-center space-x-2.5">
                <span className="text-xl">🏔️</span>
                <div className="text-[11px] leading-tight">
                  <span className="font-extrabold text-white block">Packed with Care in Anantnag</span>
                  <span className="text-white/60">100% verified local fulfillment at DASHit Dark Store</span>
                </div>
              </div>

              {/* Action Buttons: WhatsApp Share & Print Bag Slip */}
              <div className="flex items-center space-x-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    const text = encodeURIComponent(`Tracking my DASHit order #${formatDisplayId(targetOrderId)} in Anantnag!${telemetry.etaMinutes ? ` Arriving in ${telemetry.etaMinutes} mins.` : ""}`);
                    window.open(`https://wa.me/?text=${text}`, "_blank");
                  }}
                  className="flex-1 py-2 px-3 rounded-xl bg-[#25D366]/20 hover:bg-[#25D366]/30 border border-[#25D366]/30 text-[#25D366] text-xs font-bold flex items-center justify-center space-x-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share on WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    hapticLight();
                    window.print();
                  }}
                  className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/15 text-white/90 text-xs font-bold flex items-center justify-center space-x-1.5 transition-all active:scale-95 cursor-pointer"
                  title="Print bag slip"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Slip</span>
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* Modals for Modification & Cancellation */}
      {isCancelModalOpen && (
        <CancelOrderModal
          isOpen={isCancelModalOpen}
          order={order}
          isCancelling={isCancelling}
          onConfirmCancel={handleCancelOrder}
          onClose={() => setIsCancelModalOpen(false)}
        />
      )}

      {isModifyModalOpen && (
        <ModifyOrderModal
          isOpen={isModifyModalOpen}
          order={order}
          productsList={addableProducts}
          coupon={orderCoupon}
          rules={shopRulesNow}
          remainingSeconds={cancellationSeconds}
          onSaveOrder={handleAddItems}
          onClose={() => setIsModifyModalOpen(false)}
        />
      )}
    </div>
  );
}
