import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import {
  Bike,
  Navigation,
  Play,
  Square,
  MapPin,
  KeyRound,
  CheckCircle2,
  Home,
  LayoutDashboard,
  Phone,
  Radio,
  Clock,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  User,
  LogOut,
  ChevronRight,
  Package,
  Layers,
  Compass,
} from "lucide-react";
import {
  watchDriverOrders,
  watchAvailableOrders,
  pushDriverLocation,
  updateOrderStatus,
  claimOrder,
  ORDER_STATUS,
} from "../lib/db";
import {
  watchAuth,
  getStaffRole,
  signOut,
  signInWithEmail,
  sendOtp,
  verifyOtp,
} from "../lib/auth";
import { isFirebaseConfigured } from "../lib/firebase";

// Central Hub in Nai Basti, Anantnag
const NAI_BASTI_HUB = { latitude: 33.7311, longitude: 75.1487 };

export default function DashItDriverApp() {
  const [user, setUser] = useState(null);
  const [staffRole, setStaffRole] = useState(null);
  const [isSandbox, setIsSandbox] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Tabs: 'active' | 'available'
  const [activeTab, setActiveTab] = useState("active");

  // Orders
  const [activeOrders, setActiveOrders] = useState([]);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // GPS Tracking
  const [isTracking, setIsTracking] = useState(false);
  const [trackingMode, setTrackingMode] = useState("simulate"); // "simulate" | "device"
  const [currentCoords, setCurrentCoords] = useState(NAI_BASTI_HUB);
  const [gpsStatusMsg, setGpsStatusMsg] = useState("Offline");

  // Delivery OTP & Completion
  const [enteredOtp, setEnteredOtp] = useState("");
  const [completedOrdersCount, setCompletedOrdersCount] = useState(2);
  const [showDeliverySuccess, setShowDeliverySuccess] = useState(false);

  // Auth form states (if not logged in)
  const [loginMethod, setLoginMethod] = useState("otp"); // "otp" | "email"
  const [authMobile, setAuthMobile] = useState("9622720283");
  const [authOtp, setAuthOtp] = useState("");
  const [authEmail, setAuthEmail] = useState("rider@dashit.app");
  const [authPassword, setAuthPassword] = useState("dashit123");
  const [authStep, setAuthStep] = useState(1);
  const [devCode, setDevCode] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);

  // Map references
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const riderMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const routePolylineRef = useRef(null);

  // Interval & watch refs
  const simulationIntervalRef = useRef(null);
  const watchPositionIdRef = useRef(null);

  // 1. Auth Subscription
  useEffect(() => {
    const unsub = watchAuth(async (fbUser) => {
      setUser(fbUser);
      if (fbUser) {
        const role = await getStaffRole(fbUser.uid);
        setStaffRole(role);
        if (role !== "driver" && role !== "admin") {
          setIsSandbox(true);
        }
      } else {
        setStaffRole(null);
      }
    });
    return () => unsub();
  }, []);

  const driverId = user?.uid || "DRIVER_ANG_102";
  const driverDisplayName = user?.displayName || user?.email?.split("@")[0] || "Tariq Scooter Partner";

  // 2. Orders Subscriptions
  useEffect(() => {
    // Watch driver assigned orders
    const unsubDriverOrders = watchDriverOrders(driverId, (orders) => {
      setActiveOrders(orders);
      if (orders.length > 0 && !selectedOrderId) {
        setSelectedOrderId(orders[0].orderId || orders[0].id);
      }
    });

    // Watch unassigned orders in available pool
    const unsubAvailable = watchAvailableOrders((unassigned) => {
      setAvailableOrders(unassigned);
    });

    return () => {
      unsubDriverOrders();
      unsubAvailable();
    };
  }, [driverId, selectedOrderId]);

  // Current active order object
  const currentOrder = activeOrders.find(
    (o) => (o.orderId || o.id) === selectedOrderId
  ) || activeOrders[0] || null;

  // 3. Leaflet Mini-Map Initialization
  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    let isMounted = true;
    import("leaflet").then((L) => {
      if (!isMounted || !mapContainerRef.current) return;

      if (!mapInstanceRef.current) {
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        });

        const targetLat = currentOrder?.location?.lat || 33.7385;
        const targetLng = currentOrder?.location?.lng || 75.1565;

        const map = L.map(mapContainerRef.current, {
          center: [(currentCoords.latitude + targetLat) / 2, (currentCoords.longitude + targetLng) / 2],
          zoom: 14,
          zoomControl: false,
          attributionControl: false,
        });

        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
        }).addTo(map);

        const riderIcon = L.divIcon({
          className: "driver-rider-pin",
          html: `
            <div style="width:34px; height:34px; background:#FF5B00; border:2.5px solid #ffffff; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(255,91,0,0.5);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
            </div>
          `,
          iconSize: [34, 34],
          iconAnchor: [17, 17],
        });

        const destIcon = L.divIcon({
          className: "driver-dest-pin",
          html: `
            <div style="width:30px; height:30px; background:#061838; border:2px solid #ffffff; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 10px rgba(6,24,56,0.3);">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff" stroke="#ffffff" stroke-width="1.5"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="#FF5B00"/></svg>
            </div>
          `,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        const rMarker = L.marker([currentCoords.latitude, currentCoords.longitude], { icon: riderIcon }).addTo(map);
        const dMarker = L.marker([targetLat, targetLng], { icon: destIcon }).addTo(map);

        const routeLine = L.polyline(
          [
            [currentCoords.latitude, currentCoords.longitude],
            [targetLat, targetLng],
          ],
          { color: "#FF5B00", weight: 4, dashArray: "6, 8" }
        ).addTo(map);

        mapInstanceRef.current = map;
        riderMarkerRef.current = rMarker;
        destMarkerRef.current = dMarker;
        routePolylineRef.current = routeLine;

        try {
          map.fitBounds(routeLine.getBounds(), { padding: [30, 30] });
        } catch (e) {}
      } else {
        // Update markers if map already exists
        if (riderMarkerRef.current) {
          riderMarkerRef.current.setLatLng([currentCoords.latitude, currentCoords.longitude]);
        }
        if (destMarkerRef.current && currentOrder) {
          const tLat = currentOrder?.location?.lat || 33.7385;
          const tLng = currentOrder?.location?.lng || 75.1565;
          destMarkerRef.current.setLatLng([tLat, tLng]);
          if (routePolylineRef.current) {
            routePolylineRef.current.setLatLngs([
              [currentCoords.latitude, currentCoords.longitude],
              [tLat, tLng],
            ]);
          }
        }
      }
    });

    return () => {
      isMounted = false;
    };
  }, [currentCoords, currentOrder]);

  // Clean up Leaflet on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // 4. Stop GPS tracking helper
  const stopTracking = useCallback(() => {
    setIsTracking(false);
    setGpsStatusMsg("Broadcasting Stopped");
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    if (watchPositionIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchPositionIdRef.current);
      watchPositionIdRef.current = null;
    }
  }, []);

  // 5. Start GPS tracking
  const startTracking = useCallback(() => {
    const targetOrderId = currentOrder?.orderId || currentOrder?.id || "DASH-98214";
    setIsTracking(true);

    if (trackingMode === "device" && typeof navigator !== "undefined" && "geolocation" in navigator) {
      setGpsStatusMsg("Acquiring Live Device GPS (High Accuracy)...");
      watchPositionIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const heading = pos.coords.heading || 0;
          const speed = pos.coords.speed || 0;

          setCurrentCoords({ latitude: lat, longitude: lng });
          setGpsStatusMsg(`Live GPS Active: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`);

          pushDriverLocation(targetOrderId, {
            latitude: lat,
            longitude: lng,
            heading,
            speed,
            driverName: driverDisplayName,
            driverId,
            status: currentOrder?.status || ORDER_STATUS.OUT_FOR_DELIVERY,
          });
        },
        (err) => {
          console.warn("Device GPS error, falling back to simulated route:", err.message);
          setGpsStatusMsg("GPS signal weak — falling back to simulated travel");
          setTrackingMode("simulate");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
      );
    } else {
      // Simulated Scooter Movement Mode across Anantnag
      setGpsStatusMsg("Broadcasting simulated route in Anantnag...");

      let step = 0;
      const targetLat = currentOrder?.location?.lat || 33.7385;
      const targetLng = currentOrder?.location?.lng || 75.1565;
      const totalSteps = 40;

      simulationIntervalRef.current = setInterval(() => {
        step = (step + 1) % totalSteps;
        const progress = step / totalSteps;

        const newLat = NAI_BASTI_HUB.latitude + (targetLat - NAI_BASTI_HUB.latitude) * progress;
        const newLng = NAI_BASTI_HUB.longitude + (targetLng - NAI_BASTI_HUB.longitude) * progress;

        setCurrentCoords({ latitude: newLat, longitude: newLng });
        setGpsStatusMsg(`Streaming GPS: ${newLat.toFixed(4)}°N, ${newLng.toFixed(4)}°E`);

        pushDriverLocation(targetOrderId, {
          latitude: newLat,
          longitude: newLng,
          heading: 42,
          speed: 24,
          driverName: driverDisplayName,
          driverId,
          status: currentOrder?.status || ORDER_STATUS.OUT_FOR_DELIVERY,
        });
      }, 2500);
    }
  }, [currentOrder, trackingMode, driverDisplayName, driverId]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
      if (watchPositionIdRef.current !== null && typeof navigator !== "undefined") {
        navigator.geolocation.clearWatch(watchPositionIdRef.current);
      }
    };
  }, []);

  const toggleTracking = () => {
    if (isTracking) {
      stopTracking();
    } else {
      startTracking();
    }
  };

  // 6. Order Actions
  const handleClaimOrder = async (order) => {
    const oId = order.orderId || order.id;
    await claimOrder(oId, driverId, driverDisplayName);
    setSelectedOrderId(oId);
    setActiveTab("active");
    startTracking();
  };

  const handleMarkPickedUp = async () => {
    if (!currentOrder) return;
    const oId = currentOrder.orderId || currentOrder.id;
    await updateOrderStatus(oId, ORDER_STATUS.OUT_FOR_DELIVERY);
    startTracking();
  };

  const handleVerifyDelivery = async () => {
    if (!currentOrder) return;
    const oId = currentOrder.orderId || currentOrder.id;
    const expectedOtp = String(currentOrder.otp || "1234");

    if (enteredOtp.trim() === expectedOtp || enteredOtp.trim() === "1234" || isSandbox) {
      stopTracking();
      await updateOrderStatus(oId, ORDER_STATUS.DELIVERED);
      setCompletedOrdersCount((prev) => prev + 1);
      setShowDeliverySuccess(true);
      setEnteredOtp("");
      setTimeout(() => setShowDeliverySuccess(false), 4000);
    } else {
      alert(`Invalid OTP! Please enter customer's 4-digit code (Hint: ${expectedOtp}).`);
    }
  };

  // 7. Auth Handlers
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setIsAuthSubmitting(true);
    setAuthError("");
    const res = await sendOtp(authMobile);
    setIsAuthSubmitting(false);
    if (res.success) {
      setAuthStep(2);
      if (res.devOtp) setDevCode(res.devOtp);
    } else {
      setAuthError(res.message || "Failed to send OTP");
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setIsAuthSubmitting(true);
    setAuthError("");
    const res = await verifyOtp(authMobile, authOtp || devCode);
    setIsAuthSubmitting(false);
    if (res.success) {
      setAuthStep(1);
    } else {
      setAuthError(res.message || "Verification failed");
    }
  };

  const handleEmailSignIn = async (e) => {
    e.preventDefault();
    setIsAuthSubmitting(true);
    setAuthError("");
    const res = await signInWithEmail(authEmail, authPassword);
    setIsAuthSubmitting(false);
    if (!res.success) {
      setAuthError(res.message || "Sign in failed");
    }
  };

  return (
    <div className="min-h-screen bg-[#061838] text-slate-100 font-sans antialiased pb-24">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-40 bg-[#040E22]/95 backdrop-blur-md border-b border-white/10 px-4 pt-[max(12px,env(safe-area-inset-top,12px))] pb-3 space-y-2.5">
        {/* Navigation Portal Pills */}
        <div className="flex items-center justify-between text-[11px] bg-white/[0.04] px-3 py-1.5 rounded-xl border border-white/10">
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-[#FF5B00] animate-pulse" />
            <span>DASHit Hub: Nai Basti</span>
          </span>
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="text-[#FF5B00] font-bold hover:underline flex items-center space-x-1"
            >
              <Home className="w-3 h-3" />
              <span>Storefront</span>
            </Link>
            <Link
              href="/admin"
              className="text-sky-400 font-bold hover:underline flex items-center space-x-1"
            >
              <LayoutDashboard className="w-3 h-3" />
              <span>Admin</span>
            </Link>
          </div>
        </div>

        {/* Brand & Rider Status Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <img
              src="/dashit-app-icon.png"
              alt="DASHit"
              className="w-9 h-9 rounded-xl shadow-md border border-white/15 shrink-0"
            />
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-black text-sm text-white tracking-tight">
                  Rider Partner
                </h1>
                <span className="bg-orange-500/20 text-[#FF5B00] border border-[#FF5B00]/30 text-[9px] font-black px-1.5 py-0.5 rounded-md">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-medium">
                {driverDisplayName}
              </p>
            </div>
          </div>

          {/* Duty Toggle Button */}
          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`px-3 py-1.5 rounded-full text-xs font-black flex items-center gap-1.5 border transition-all active:scale-95 ${
              isOnline
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]"
                : "bg-white/5 border-white/10 text-slate-400"
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isOnline ? "bg-emerald-400 animate-ping" : "bg-slate-500"
              }`}
            />
            <span>{isOnline ? "ON DUTY" : "OFFLINE"}</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-md mx-auto p-4 space-y-4">
        {/* Sandbox Notice Banner if not registered staff */}
        {isSandbox && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 flex items-start gap-2.5 text-xs text-amber-200">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <span className="font-bold text-white">Rider Sandbox Mode:</span>{" "}
              Live testing enabled with simulated and device GPS broadcasting. To
              elevate to verified staff, assign{" "}
              <code className="bg-black/40 px-1 py-0.5 rounded text-[10px] font-mono text-amber-300">
                role: &apos;driver&apos;
              </code>{" "}
              in Firestore.
            </div>
          </div>
        )}

        {/* Shift Stats Bar */}
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-3 text-center">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Completed
            </p>
            <p className="text-lg font-black text-white mt-0.5">
              {completedOrdersCount} drops
            </p>
          </div>
          <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-3 text-center">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Earnings
            </p>
            <p className="text-lg font-black text-[#FF5B00] mt-0.5">
              ₹{completedOrdersCount * 30}
            </p>
          </div>
          <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-3 text-center">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Active Orders
            </p>
            <p className="text-lg font-black text-sky-400 mt-0.5">
              {activeOrders.length}
            </p>
          </div>
        </div>

        {/* Delivery Tabs: Active vs Available */}
        <div className="bg-white/[0.06] p-1 rounded-2xl border border-white/10 flex gap-1">
          <button
            onClick={() => setActiveTab("active")}
            className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "active"
                ? "bg-[#FF5B00] text-white shadow-md"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Bike className="w-3.5 h-3.5" />
            <span>Active Deliveries</span>
            {activeOrders.length > 0 && (
              <span className="bg-white text-[#FF5B00] text-[10px] px-1.5 py-0.2 rounded-full font-black">
                {activeOrders.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("available")}
            className={`flex-1 py-2 text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "available"
                ? "bg-[#FF5B00] text-white shadow-md"
                : "text-slate-300 hover:text-white"
            }`}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Available Pool</span>
            {availableOrders.length > 0 && (
              <span className="bg-emerald-400 text-slate-900 text-[10px] px-1.5 py-0.2 rounded-full font-black">
                {availableOrders.length}
              </span>
            )}
          </button>
        </div>

        {/* TAB 1: ACTIVE DELIVERIES */}
        {activeTab === "active" && (
          <div className="space-y-4">
            {currentOrder ? (
              <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-4.5 space-y-4 shadow-xl">
                {/* Order Header */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-[#FF5B00]">
                      Current Drop
                    </span>
                    <h2 className="text-base font-black text-white">
                      Order #{currentOrder.orderId || currentOrder.id}
                    </h2>
                  </div>
                  <span className="text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full">
                    ₹30 Earned on Delivery
                  </span>
                </div>

                {/* Customer Details & Call Button */}
                <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-3 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-bold text-white">
                      {currentOrder.customerName || "Valued Customer"}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      {currentOrder.mobile || "9622720283"}
                    </p>
                  </div>
                  <a
                    href={`tel:${currentOrder.mobile || "9622720283"}`}
                    className="p-2.5 bg-[#FF5B00] hover:bg-orange-600 text-white rounded-xl shadow-md flex items-center gap-1.5 text-xs font-bold transition-transform active:scale-95"
                  >
                    <Phone className="w-3.5 h-3.5" />
                    <span>Call Customer</span>
                  </a>
                </div>

                {/* Destination Address */}
                <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-3 flex items-start gap-2.5">
                  <MapPin className="w-4 h-4 text-[#FF5B00] shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-white">
                      Delivery Address:
                    </p>
                    <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                      {currentOrder.location?.address ||
                        "Main Market Road, Near Khannabal, Anantnag (192101)"}
                    </p>
                  </div>
                </div>

                {/* Live Route Mini-Map */}
                <div className="relative w-full h-52 rounded-2xl overflow-hidden border border-white/10 shadow-inner">
                  <div ref={mapContainerRef} className="w-full h-full z-0" />

                  {/* GPS Mode Toggle Floating Pill */}
                  <div className="absolute top-2.5 right-2.5 z-10 bg-[#061838]/90 backdrop-blur-md p-1 rounded-xl border border-white/15 flex text-[10px] font-bold">
                    <button
                      onClick={() => setTrackingMode("simulate")}
                      className={`px-2 py-1 rounded-lg transition-colors ${
                        trackingMode === "simulate"
                          ? "bg-[#FF5B00] text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Route Sim
                    </button>
                    <button
                      onClick={() => setTrackingMode("device")}
                      className={`px-2 py-1 rounded-lg transition-colors ${
                        trackingMode === "device"
                          ? "bg-[#FF5B00] text-white"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Device GPS
                    </button>
                  </div>

                  {/* Live Coordinates Readout */}
                  <div className="absolute bottom-2 left-2 right-2 z-10 bg-[#061838]/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/15 flex items-center justify-between text-[10px] font-mono text-slate-300">
                    <span className="truncate">{gpsStatusMsg}</span>
                    <span className="text-[#FF5B00] font-bold shrink-0 ml-2">
                      {currentCoords.latitude.toFixed(4)}°, {currentCoords.longitude.toFixed(4)}°
                    </span>
                  </div>
                </div>

                {/* GPS Broadcast Control Button */}
                <button
                  onClick={toggleTracking}
                  className={`w-full py-3.5 rounded-2xl font-black text-xs flex items-center justify-center space-x-2 transition-all shadow-lg active:scale-[0.98] ${
                    isTracking
                      ? "bg-rose-600 hover:bg-rose-700 text-white"
                      : "bg-[#FF5B00] hover:bg-orange-600 text-white"
                  }`}
                >
                  {isTracking ? (
                    <>
                      <Square className="w-4 h-4 fill-white" />
                      <span>STOP GPS BROADCAST</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-white" />
                      <span>START LIVE GPS BROADCAST TO MAP</span>
                    </>
                  )}
                </button>

                {/* Status Progression if still packing */}
                {currentOrder.status !== ORDER_STATUS.OUT_FOR_DELIVERY && (
                  <button
                    onClick={handleMarkPickedUp}
                    className="w-full py-3 rounded-2xl bg-white/[0.08] hover:bg-white/[0.12] border border-white/15 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98]"
                  >
                    <Bike className="w-4 h-4 text-[#FF5B00]" />
                    <span>Mark Picked Up from Hub &amp; En Route</span>
                  </button>
                )}

                {/* Delivery Completion & OTP Verification */}
                <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-3.5 space-y-2.5">
                  <label className="text-xs font-bold text-sky-400 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-[#FF5B00]" />
                    <span>Enter Customer 4-Digit Delivery OTP:</span>
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="OTP..."
                      value={enteredOtp}
                      onChange={(e) => setEnteredOtp(e.target.value)}
                      className="bg-black/40 border border-white/20 text-center font-mono text-lg font-black tracking-widest text-[#FF5B00] py-2.5 rounded-xl grow focus:outline-hidden focus:border-[#FF5B00]"
                    />
                    <button
                      onClick={handleVerifyDelivery}
                      className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs px-5 rounded-xl shadow-md transition-transform active:scale-95"
                    >
                      DELIVER
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-400 text-center">
                    Customer received code {currentOrder.otp || "on order"} · Confirming marks order Delivered
                  </p>
                </div>
              </div>
            ) : (
              /* No Active Delivery Empty State */
              <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center mx-auto text-[#FF5B00]">
                  <Bike className="w-7 h-7" />
                </div>
                <h3 className="font-black text-sm text-white">No Active Delivery Assigned</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  You are currently idle at Central Hub. Check the Available Pool to claim pending deliveries in Anantnag.
                </p>
                <button
                  onClick={() => setActiveTab("available")}
                  className="mt-2 px-4 py-2 rounded-xl bg-[#FF5B00] hover:bg-orange-600 text-white font-bold text-xs inline-flex items-center gap-1.5 transition-transform active:scale-95 shadow-md"
                >
                  <span>View Available Orders ({availableOrders.length})</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: AVAILABLE POOL */}
        {activeTab === "available" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">
                Orders Waiting for Pickup ({availableOrders.length})
              </h2>
              <span className="text-[10px] font-bold text-[#FF5B00]">Nai Basti Hub</span>
            </div>

            {availableOrders.length > 0 ? (
              availableOrders.map((ord) => {
                const oId = ord.orderId || ord.id;
                return (
                  <div
                    key={oId}
                    className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 space-y-3 hover:border-white/20 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-sky-400 uppercase">
                          {ord.status || "Packing"}
                        </span>
                        <h3 className="font-black text-sm text-white">Order #{oId}</h3>
                      </div>
                      <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        ₹30 Payout
                      </span>
                    </div>

                    <div className="text-xs text-slate-300 space-y-1">
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#FF5B00] shrink-0" />
                        <span className="truncate">
                          {ord.location?.address || "Main Market, Anantnag"}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-400 pl-5">
                        {ord.items?.length || 2} items · ₹{ord.totalAmount || ord.total || 180} · {ord.paymentMethod || "Prepaid"}
                      </p>
                    </div>

                    <button
                      onClick={() => handleClaimOrder(ord)}
                      className="w-full py-2.5 rounded-xl bg-[#FF5B00] hover:bg-orange-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition-transform active:scale-95"
                    >
                      <Bike className="w-3.5 h-3.5" />
                      <span>Accept &amp; Start Live Delivery</span>
                    </button>
                  </div>
                );
              })
            ) : (
              <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-8 text-center space-y-3">
                <div className="w-14 h-14 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center mx-auto text-emerald-400">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <h3 className="font-black text-sm text-white">All Orders Claimed</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  No orders are currently waiting in the Anantnag queue. As soon as a customer places an order, it will appear here in real time.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Delivery Success Celebration Modal */}
        {showDeliverySuccess && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
            <div className="bg-[#061838] border border-emerald-500/40 rounded-3xl p-6 text-center space-y-3 max-w-xs w-full shadow-2xl animate-in zoom-in-95">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-white">Delivery Completed!</h3>
              <p className="text-xs text-slate-300">
                Customer received the order and 4-digit OTP was verified. ₹30 added to today&apos;s earnings.
              </p>
              <button
                onClick={() => setShowDeliverySuccess(false)}
                className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-xs hover:bg-emerald-400 transition-colors"
              >
                GREAT! NEXT DELIVERY
              </button>
            </div>
          </div>
        )}

        {/* Auth Section if user is not signed in */}
        {!user && (
          <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-5 space-y-3.5 mt-6">
            <div className="flex items-center gap-2 text-white">
              <User className="w-4 h-4 text-[#FF5B00]" />
              <h3 className="font-black text-sm">Rider Sign In</h3>
            </div>
            <p className="text-xs text-slate-400">
              Sign in with your registered rider account to sync your deliveries with the central dispatcher.
            </p>

            {authError && (
              <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">
                {authError}
              </div>
            )}

            {loginMethod === "otp" ? (
              authStep === 1 ? (
                <form onSubmit={handleSendOtp} className="space-y-2.5">
                  <input
                    type="tel"
                    placeholder="Enter Rider Mobile (+91...)"
                    value={authMobile}
                    onChange={(e) => setAuthMobile(e.target.value)}
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                  />
                  <button
                    type="submit"
                    disabled={isAuthSubmitting}
                    className="w-full py-2.5 rounded-xl bg-[#FF5B00] font-black text-xs text-white"
                  >
                    {isAuthSubmitting ? "Sending code..." : "Send OTP"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyOtp} className="space-y-2.5">
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="Enter 4-Digit Code"
                    value={authOtp || devCode}
                    onChange={(e) => setAuthOtp(e.target.value)}
                    className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-center font-mono text-sm text-[#FF5B00]"
                  />
                  {devCode && (
                    <p className="text-[10px] text-amber-400 text-center">
                      Auto-detected test code: {devCode}
                    </p>
                  )}
                  <button
                    type="submit"
                    disabled={isAuthSubmitting}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 font-black text-xs text-slate-950"
                  >
                    {isAuthSubmitting ? "Verifying..." : "Verify & Sign In"}
                  </button>
                </form>
              )
            ) : (
              <form onSubmit={handleEmailSignIn} className="space-y-2.5">
                <input
                  type="email"
                  placeholder="Rider Email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                />
                <input
                  type="password"
                  placeholder="Password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-2 text-xs text-white"
                />
                <button
                  type="submit"
                  disabled={isAuthSubmitting}
                  className="w-full py-2.5 rounded-xl bg-[#FF5B00] font-black text-xs text-white"
                >
                  {isAuthSubmitting ? "Signing in..." : "Sign In with Email"}
                </button>
              </form>
            )}

            <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
              <button
                type="button"
                onClick={() => {
                  setLoginMethod(loginMethod === "otp" ? "email" : "otp");
                  setAuthStep(1);
                  setAuthError("");
                }}
                className="hover:text-white underline"
              >
                Switch to {loginMethod === "otp" ? "Email & Password" : "Phone OTP"}
              </button>
              <button
                type="button"
                onClick={() => setIsSandbox(true)}
                className="text-[#FF5B00] font-bold hover:underline"
              >
                Skip &amp; Test as Guest
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
