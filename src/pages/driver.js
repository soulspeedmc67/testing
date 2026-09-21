import { useState, useEffect, useRef, useCallback } from "react";
import Head from "next/head";
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
  ShieldAlert,
  AlertCircle,
  Sparkles,
  User,
  LogOut,
  ChevronRight,
  ChevronUp,
  Package,
  Layers,
  Compass,
  ArrowLeft,
  Banknote,
  MessageCircle,
  ArrowUp,
  ArrowDown,
  ListOrdered,
  Navigation2,
  X,
  Star,
  TrendingUp,
  WifiOff,
  ChevronsRight,
  Truck,
} from "lucide-react";
import {
  watchDriverOrders,
  watchAvailableOrders,
  pushDriverLocation,
  pushDriverTelemetryToQueue,
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
import { fetchRoadRoute } from "../lib/maps";
import { calculateLiveOrderEta, computeOrderProgress } from "../lib/deliveryEta";
import { requestScreenWakeLock, releaseScreenWakeLock } from "../lib/wakeLock";
import { orderAddress } from "../lib/orderReceipt";

// Store Hub in Lal Chowk, Anantnag (https://maps.app.goo.gl/kKouW9fsgyGBJezT7)
const DARK_STORE_HUB = { latitude: 33.735832, longitude: 75.143614 };
const NAI_BASTI_HUB = DARK_STORE_HUB; // Backwards-compatible alias

/* The customer's live map is fed by a fixed-cadence heartbeat, not by however
   often the device happens to emit a GPS fix. watchPosition() goes quiet while
   the rider is stopped at a light or indoors, which used to leave the tracking
   document untouched for minutes at a time; the interval below re-broadcasts
   the last known fix so the customer always sees a position no older than this. */
const TELEMETRY_PUSH_INTERVAL_MS = 5000;

// Numbered Drop Location Map Pin with sequence badge
function createNumberedDropIcon(L, stopNumber, isCurrent) {
  const pinColor = isCurrent ? "#FF5B00" : "#1A73E8";
  const haloHtml = isCurrent
    ? `<div style="position:absolute; width:44px; height:44px; top:-4px; left:-4px; border-radius:50%; background:rgba(255,91,0,0.3); animation:pulse 2s infinite;"></div>`
    : "";

  return L.divIcon({
    className: `driver-stop-pin-${stopNumber}`,
    html: `
      <div style="position:relative; width:36px; height:44px; display:flex; flex-direction:column; align-items:center; filter:drop-shadow(0 4px 8px rgba(0,0,0,0.35));">
        ${haloHtml}
        <svg width="36" height="44" viewBox="0 0 24 30" fill="none">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 8.5 12 18 12 18s12-9.5 12-18c0-6.63-5.37-12-12-12z" fill="${pinColor}"/>
          <circle cx="12" cy="11" r="7.5" fill="#ffffff"/>
        </svg>
        <span style="position:absolute; top:4px; font-weight:900; font-size:11px; color:#0f172a; font-family:sans-serif; text-align:center;">
          ${stopNumber}
        </span>
      </div>
    `,
    iconSize: [36, 44],
    iconAnchor: [18, 44],
  });
}

export default function DashItDriverApp() {
  const [user, setUser] = useState(null);
  const [staffRole, setStaffRole] = useState(null);
  const [isSandbox, setIsSandbox] = useState(false);
  const [isOnline, setIsOnline] = useState(true);

  // Tabs: 'active' | 'available' | 'profile'
  const [activeTab, setActiveTab] = useState("active");
  // OTP verification overlay (shown when driver taps "I've Arrived")
  const [showOtpOverlay, setShowOtpOverlay] = useState(false);
  // Slide-to-accept state per order id
  const [slideAcceptId, setSlideAcceptId] = useState(null);
  const [slideProgress, setSlideProgress] = useState(0);
  const slideTrackRef = useRef(null);
  const slidingRef = useRef(false);

  // Orders
  const [activeOrders, setActiveOrders] = useState([]);
  const [availableOrders, setAvailableOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);

  // GPS Tracking
  const [isTracking, setIsTracking] = useState(false);
  const [trackingMode, setTrackingMode] = useState("simulate"); // "simulate" | "device"
  const [currentCoords, setCurrentCoords] = useState(NAI_BASTI_HUB);
  const [gpsStatusMsg, setGpsStatusMsg] = useState("Offline");
  const [routeStats, setRouteStats] = useState({ distanceKm: "1.8", durationMins: 6 });

  // Delivery OTP & Completion
  const [enteredOtp, setEnteredOtp] = useState("");
  const [completedOrdersCount, setCompletedOrdersCount] = useState(2);
  const [showDeliverySuccess, setShowDeliverySuccess] = useState(false);

  // Auth form states (if not logged in)
  const [loginMethod, setLoginMethod] = useState("otp"); // "otp" | "email"
  const [authMobile, setAuthMobile] = useState("");
  const [authOtp, setAuthOtp] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authStep, setAuthStep] = useState(1);
  const [devCode, setDevCode] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthSubmitting, setIsAuthSubmitting] = useState(false);

  // Map references
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const riderMarkerRef = useRef(null);
  const destMarkerRef = useRef(null);
  const destMarkersRef = useRef([]);
  const routePolylineRef = useRef(null);
  const routeCasingRef = useRef(null);
  const secondaryRoutesRef = useRef([]);
  const currentRoutePointsRef = useRef([]);

  // Interval & watch refs
  const simulationIntervalRef = useRef(null);
  const telemetryIntervalRef = useRef(null);
  const watchPositionIdRef = useRef(null);
  /* Latest known fix and queue state, held in refs so the 5s heartbeat always
     broadcasts current data instead of the values captured when it started —
     an order claimed mid-shift must join the fan-out without restarting GPS. */
  const lastFixRef = useRef(null);
  const activeQueueRef = useRef([]);
  const currentOrderRef = useRef(null);
  /* Set when the rider taps Stop, so the auto-start effect below does not
     immediately switch broadcasting back on. Cleared on the next manual start
     or once the queue empties. */
  const manualPauseRef = useRef(false);
  /* Live position, mirrored into a ref. The map builder below reads it from
     here: as an effect dependency it rebuilt the entire map on every GPS fix. */
  const currentCoordsRef = useRef(NAI_BASTI_HUB);
  /* Position at which the drawn route was last re-queried, so a route refresh
     costs a lookup only after the rider has actually travelled. */
  const routeRefreshedAtRef = useRef(null);
  /* Road distance to each drop at the moment broadcasting began, keyed by order
     id. The customer's progress bar is a fraction of this, so it reflects ground
     actually covered rather than time elapsed. */
  const baselineKmRef = useRef({});
  /* Set while a broadcast is still routing. A slow OSRM reply must not let the
     next heartbeat start a second one — overlapping broadcasts can land out of
     order and write a stale position over a fresh one. */
  const broadcastInFlightRef = useRef(false);

  const [isFleetAuthorized, setIsFleetAuthorized] = useState(false);
  const [fleetEmail, setFleetEmail] = useState("");
  const [fleetPin, setFleetPin] = useState("");
  const [fleetPinError, setFleetPinError] = useState("");
  const [isFleetVerifying, setIsFleetVerifying] = useState(false);

  /* Authorisation comes from Firebase Auth plus the staff/{uid} role, never
     from a sessionStorage flag or a shared PIN — this file ships to the browser,
     so a hardcoded PIN is a published password, and a sessionStorage flag can be
     set from devtools. */
  // 1. Auth Subscription
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isCustomerApp =
        (window.AndroidFlavor && window.AndroidFlavor.getFlavor && window.AndroidFlavor.getFlavor() === "customer") ||
        (window.__DASHIT_ROLE__ === "customer");
      if (isCustomerApp) {
        window.location.replace("/shop");
        return;
      }
    }
    const unsub = watchAuth(async (fbUser) => {
      setUser(fbUser);
      if (!fbUser) {
        setStaffRole(null);
        setIsFleetAuthorized(false);
        return;
      }
      const role = await getStaffRole(fbUser.uid);
      setStaffRole(role);
      const authorized = role === "driver" || role === "admin";
      setIsFleetAuthorized(authorized);
      setIsSandbox(!authorized);
    });
    return () => unsub();
  }, []);


  /* No shared fallback id: an unauthenticated session must resolve to no rider,
     otherwise every device without auth would share one identity and see (and
     could claim) each other's deliveries. */
  const driverId = user?.uid || null;
  const driverDisplayName = user?.displayName || user?.email?.split("@")[0] || "Tariq Scooter Partner";

  // 2. Orders Subscriptions
  useEffect(() => {
    // Watch driver assigned orders
    const unsubDriverOrders = watchDriverOrders(driverId, (orders) => {
      setActiveOrders(orders);
      setSelectedOrderId((prev) => {
        if (orders.length > 0 && (!prev || !orders.some((o) => (o.orderId || o.id) === prev))) {
          return orders[0].orderId || orders[0].id;
        }
        return prev;
      });
    });

    // Watch unassigned orders in available pool
    const unsubAvailable = watchAvailableOrders((unassigned) => {
      setAvailableOrders(unassigned);
    });

    return () => {
      unsubDriverOrders();
      unsubAvailable();
    };
  }, [driverId]);

  // Multi-Drop Active Queue: ordered so the selected/active drop is Stop #1, followed by upcoming drops
  const activeQueue = (() => {
    if (!activeOrders || activeOrders.length === 0) return [];
    if (!selectedOrderId) return activeOrders;
    const cur = activeOrders.find((o) => (o.orderId || o.id) === selectedOrderId);
    if (!cur) return activeOrders;
    return [cur, ...activeOrders.filter((o) => (o.orderId || o.id) !== selectedOrderId)];
  })();

  const currentOrder = activeQueue[0] || null;
  useEffect(() => {
    currentCoordsRef.current = currentCoords;
  }, [currentCoords.latitude, currentCoords.longitude]);

  /* Identity of the stops on screen. The map is rebuilt when this changes — a
     claimed, reordered or completed drop — and NOT when the rider moves. */
  const queueSignature = activeQueue
    .map((o) => `${o.orderId || o.id}:${o.location?.lat ?? ""},${o.location?.lng ?? ""}`)
    .join("|");

  // External Google Maps multi-stop navigation URL
  const multiStopNavUrl = (() => {
    if (!activeQueue || activeQueue.length === 0) return "#";
    const origin = `${currentCoords.latitude},${currentCoords.longitude}`;
    const destinationOrder = activeQueue[activeQueue.length - 1];
    const destLat = Number(destinationOrder.location?.lat || destinationOrder.location?.latitude || 33.7385);
    const destLng = Number(destinationOrder.location?.lng || destinationOrder.location?.longitude || 75.1565);
    const destStr = `${destLat},${destLng}`;

    if (activeQueue.length === 1) {
      return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destStr}&travelmode=driving`;
    }

    const waypoints = activeQueue
      .slice(0, -1)
      .map((o) => `${Number(o.location?.lat || o.location?.latitude || 33.7385)},${Number(o.location?.lng || o.location?.longitude || 75.1565)}`)
      .join("|");

    return `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destStr}&waypoints=${encodeURIComponent(waypoints)}&travelmode=driving`;
  })();

  // Reorder drops in queue
  const handleMoveDrop = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= activeOrders.length) return;
    const updated = [...activeOrders];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    setActiveOrders(updated);
    setSelectedOrderId(updated[0].orderId || updated[0].id);
  };

  // 3. Multi-Stop Google Maps Styled Turn-by-Turn Route Map Initialization
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (activeTab !== "active" || !currentOrder) return;
    if (!mapContainerRef.current) return;

    let isMounted = true;
    import("leaflet").then(async (L) => {
      if (!isMounted || !mapContainerRef.current) return;

      const targetLat = Number(currentOrder?.location?.lat || currentOrder?.location?.latitude || 33.7385);
      const targetLng = Number(currentOrder?.location?.lng || currentOrder?.location?.longitude || 75.1565);

      // Query real shortest road path in Anantnag for active leg (Driver -> Stop 1)
      const coords = currentCoordsRef.current;
      const roadRoute = await fetchRoadRoute(
        coords.latitude,
        coords.longitude,
        targetLat,
        targetLng
      );
      routeRefreshedAtRef.current = { lat: coords.latitude, lng: coords.longitude };
      if (!isMounted) return;

      if (roadRoute?.points?.length) {
        currentRoutePointsRef.current = roadRoute.points;
        setRouteStats({ distanceKm: roadRoute.distanceKm, durationMins: roadRoute.durationMins });
      }

      // If existing map was bound to an old/detached container, tear it down cleanly
      if (mapInstanceRef.current) {
        try {
          if (mapInstanceRef.current.getContainer() !== mapContainerRef.current) {
            mapInstanceRef.current.remove();
            mapInstanceRef.current = null;
          }
        } catch (e) {
          mapInstanceRef.current = null;
        }
      }

      if (!mapInstanceRef.current) {
        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
          iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
          iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
          shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        });

        // Ensure container is clean of previous leaflet instances
        if (mapContainerRef.current._leaflet_id) {
          delete mapContainerRef.current._leaflet_id;
        }

        const map = L.map(mapContainerRef.current, {
          center: [(coords.latitude + targetLat) / 2, (coords.longitude + targetLng) / 2],
          zoom: 14,
          zoomControl: false,
          attributionControl: false,
        });

        // Official Google Maps Vector Road Tiles
        L.tileLayer("https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
          subdomains: ["0", "1", "2", "3"],
          maxZoom: 20,
          attribution: "© Google Maps"
        }).addTo(map);

        // Google Maps Dual Polyline: White casing + Blue navigation line
        const casing = L.polyline(roadRoute?.points || [], {
          color: "#ffffff",
          weight: 7,
          opacity: 0.9,
          lineCap: "round",
          lineJoin: "round"
        }).addTo(map);

        const routeLine = L.polyline(roadRoute?.points || [], {
          color: "#1A73E8",
          weight: 4.5,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round"
        }).addTo(map);

        // Google Maps Navigation Vehicle Puck
        const riderIcon = L.divIcon({
          className: "driver-rider-pin",
          html: `
            <div style="position:relative; width:40px; height:40px; display:flex; align-items:center; justify-content:center;">
              <div style="position:absolute; width:38px; height:38px; border-radius:50%; background:rgba(26,115,232,0.25); animation:pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;"></div>
              <div style="width:32px; height:32px; background:#1A73E8; border:2.5px solid #ffffff; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 14px rgba(26,115,232,0.5); z-index:2;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
              </div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        });

        const rMarker = L.marker([coords.latitude, coords.longitude], { icon: riderIcon }).addTo(map);

        mapInstanceRef.current = map;
        riderMarkerRef.current = rMarker;
        routeCasingRef.current = casing;
        routePolylineRef.current = routeLine;

        // Invalidate size to guarantee no gray tiles in sheet/tab
        map.invalidateSize();
        setTimeout(() => {
          if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
        }, 150);
      } else {
        // Update vehicle marker & active route
        if (riderMarkerRef.current) {
          riderMarkerRef.current.setLatLng([coords.latitude, coords.longitude]);
        }
        if (routePolylineRef.current && roadRoute?.points) {
          routePolylineRef.current.setLatLngs(roadRoute.points);
        }
        if (routeCasingRef.current && roadRoute?.points) {
          routeCasingRef.current.setLatLngs(roadRoute.points);
        }
      }

      // Render Multiple Destination Pins on Map
      const map = mapInstanceRef.current;
      if (map) {
        // Clear previous destination markers
        if (destMarkersRef.current && destMarkersRef.current.length > 0) {
          destMarkersRef.current.forEach((m) => {
            try { m.remove(); } catch (e) {}
          });
        }
        destMarkersRef.current = [];

        // Clear previous secondary route layers
        if (secondaryRoutesRef.current && secondaryRoutesRef.current.length > 0) {
          secondaryRoutesRef.current.forEach((l) => {
            try { l.remove(); } catch (e) {}
          });
        }
        secondaryRoutesRef.current = [];

        const allBoundsPoints = [[coords.latitude, coords.longitude]];

        activeQueue.forEach((ord, idx) => {
          const sLat = Number(ord.location?.lat || ord.location?.latitude || (33.7385 + idx * 0.005));
          const sLng = Number(ord.location?.lng || ord.location?.longitude || (75.1565 + idx * 0.005));
          allBoundsPoints.push([sLat, sLng]);

          const isCurrentDrop = idx === 0;
          const icon = createNumberedDropIcon(L, idx + 1, isCurrentDrop);
          const marker = L.marker([sLat, sLng], {
            icon,
            zIndexOffset: isCurrentDrop ? 1000 : 500,
          }).addTo(map);

          marker.on("click", () => {
            setSelectedOrderId(ord.orderId || ord.id);
          });

          destMarkersRef.current.push(marker);
        });

        // Draw secondary dashed routes between upcoming drops (Stop 1 -> Stop 2 -> Stop 3)
        if (activeQueue.length > 1) {
          for (let i = 1; i < activeQueue.length; i++) {
            const fromOrd = activeQueue[i - 1];
            const toOrd = activeQueue[i];
            const fromLat = Number(fromOrd.location?.lat || fromOrd.location?.latitude || 33.7385);
            const fromLng = Number(fromOrd.location?.lng || fromOrd.location?.longitude || 75.1565);
            const toLat = Number(toOrd.location?.lat || toOrd.location?.latitude || 33.7385);
            const toLng = Number(toOrd.location?.lng || toOrd.location?.longitude || 75.1565);

            const dashed = L.polyline([[fromLat, fromLng], [toLat, toLng]], {
              color: "#3B82F6",
              weight: 3.5,
              dashArray: "6, 8",
              opacity: 0.75,
              lineCap: "round",
            }).addTo(map);
            secondaryRoutesRef.current.push(dashed);
          }
        }

        try {
          if (allBoundsPoints.length > 1) {
            map.fitBounds(L.latLngBounds(allBoundsPoints), { padding: [40, 40], maxZoom: 16 });
          }
        } catch (e) {}

        map.invalidateSize();
      }
    });

    return () => {
      isMounted = false;
    };
    /* Deliberately not keyed on the rider's position. This effect tears down and
       re-adds every destination pin, redraws the dashed inter-stop routes and
       calls fitBounds — running it on each GPS fix rebuilt the map several times
       a minute and snapped the camera back every time the rider panned it. */
  }, [activeTab, queueSignature, currentOrder?.orderId || currentOrder?.id]);

  /* Position updates move the existing layers instead of rebuilding the map. */
  useEffect(() => {
    const marker = riderMarkerRef.current;
    if (!marker || !mapInstanceRef.current) return;

    marker.setLatLng([currentCoords.latitude, currentCoords.longitude]);

    const order = currentOrderRef.current;
    const target = order?.location;
    if (!target) return;

    // Re-query the drawn route only once the rider has covered ~120 m.
    const last = routeRefreshedAtRef.current;
    const movedKm = last
      ? Math.hypot(currentCoords.latitude - last.lat, currentCoords.longitude - last.lng) * 111
      : 1;
    if (movedKm < 0.12) return;
    routeRefreshedAtRef.current = { lat: currentCoords.latitude, lng: currentCoords.longitude };

    fetchRoadRoute(
      currentCoords.latitude,
      currentCoords.longitude,
      Number(target.lat || target.latitude),
      Number(target.lng || target.longitude)
    )
      .then((route) => {
        if (!route?.points?.length) return;
        currentRoutePointsRef.current = route.points;
        if (routePolylineRef.current) routePolylineRef.current.setLatLngs(route.points);
        if (routeCasingRef.current) routeCasingRef.current.setLatLngs(route.points);
      })
      .catch(() => {});
  }, [currentCoords.latitude, currentCoords.longitude]);

  // Clean up Leaflet & WakeLock on unmount
  useEffect(() => {
    return () => {
      releaseScreenWakeLock();
      if (destMarkersRef.current) {
        destMarkersRef.current.forEach((m) => { try { m.remove(); } catch (e) {} });
        destMarkersRef.current = [];
      }
      if (secondaryRoutesRef.current) {
        secondaryRoutesRef.current.forEach((l) => { try { l.remove(); } catch (e) {} });
        secondaryRoutesRef.current = [];
      }
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  /* Keep the heartbeat's view of the queue current without retriggering it. */
  useEffect(() => {
    activeQueueRef.current = activeQueue;
    currentOrderRef.current = currentOrder;
  }, [activeQueue, currentOrder]);


  // 4. Stop GPS tracking helper
  const stopTracking = useCallback(() => {
    setIsTracking(false);
    setGpsStatusMsg("Broadcasting Stopped");
    lastFixRef.current = null;
    releaseScreenWakeLock();
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    if (telemetryIntervalRef.current) {
      clearInterval(telemetryIntervalRef.current);
      telemetryIntervalRef.current = null;
    }
    if (watchPositionIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchPositionIdRef.current);
      watchPositionIdRef.current = null;
    }
  }, []);

  /* Single broadcast of one fix to every order currently on the rider's queue.
     Reads the queue from a ref so newly claimed drops are picked up by the
     already-running heartbeat. */
  const broadcastFix = useCallback(
    async (fix) => {
      if (!fix || broadcastInFlightRef.current) return;
      broadcastInFlightRef.current = true;

      try {
        const queue = activeQueueRef.current || [];
        const order = currentOrderRef.current;
        const orderIds = queue.map((o) => o.orderId || o.id).filter(Boolean);
        const fallbackId = order?.orderId || order?.id;
        const targets = orderIds.length > 0 ? orderIds : fallbackId ? [fallbackId] : [];
        if (targets.length === 0) return;

        const base = {
          latitude: fix.latitude,
          longitude: fix.longitude,
          heading: fix.heading || 0,
          speed: fix.speed || 0,
          driverName: driverDisplayName,
          status: order?.status || ORDER_STATUS.OUT_FOR_DELIVERY,
        };

        /* Each drop gets its own arrival time, routed over real roads through
           every stop that comes before it. fetchRoadRoute caches per ~110 m
           cell, so a stationary rider re-broadcasts without re-querying OSRM and
           only a genuine move costs a lookup. */
        const perOrder = {};
        await Promise.all(
          queue.map(async (o, idx) => {
            const oId = o.orderId || o.id;
            if (!oId || !o.location) return;
            try {
              const live = await calculateLiveOrderEta({
                driverCoords: { latitude: fix.latitude, longitude: fix.longitude },
                orderCoords: o.location,
                queuePosition: idx,
                precedingStops: queue.slice(0, idx).map((p) => p.location).filter(Boolean),
                roadRouteFn: fetchRoadRoute,
              });
              if (!live?.etaMinutes) return;

              const remainingKm = Number(live.distanceKm);
              if (!baselineKmRef.current[oId] && Number.isFinite(remainingKm)) {
                baselineKmRef.current[oId] = Math.max(remainingKm, 0.3);
              }

              perOrder[oId] = {
                etaMinutes: live.etaMinutes,
                distanceKm: remainingKm,
                distanceFormatted: live.distanceFormatted,
                statusText: live.statusText,
                stopsAhead: live.stopsAhead || 0,
                progress: computeOrderProgress({
                  status: o.status || base.status,
                  remainingKm,
                  baselineKm: baselineKmRef.current[oId],
                }),
              };

              // The rider's own header stats follow the drop they are heading to
              if (idx === 0) {
                setRouteStats({ distanceKm: live.distanceKm, durationMins: live.etaMinutes });
              }
            } catch (e) {}
          })
        );

        await pushDriverTelemetryToQueue(driverId, targets, base, perOrder);
      } finally {
        broadcastInFlightRef.current = false;
      }
    },
    [driverId, driverDisplayName]
  );

  // 5. Start GPS tracking with Screen WakeLock and Multi-Order Fan-Out
  const startTracking = useCallback(() => {
    /* Idempotent: claiming an order while already broadcasting must not leave a
       second interval or geolocation watch running behind the first. */
    if (simulationIntervalRef.current) {
      clearInterval(simulationIntervalRef.current);
      simulationIntervalRef.current = null;
    }
    if (telemetryIntervalRef.current) {
      clearInterval(telemetryIntervalRef.current);
      telemetryIntervalRef.current = null;
    }
    if (watchPositionIdRef.current !== null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(watchPositionIdRef.current);
      watchPositionIdRef.current = null;
    }

    manualPauseRef.current = false;
    setIsTracking(true);
    requestScreenWakeLock();

    // Immediately push initial position so customer map updates with 0 delay
    lastFixRef.current = {
      latitude: currentCoords.latitude,
      longitude: currentCoords.longitude,
      heading: 0,
      speed: 0,
    };
    broadcastFix(lastFixRef.current);

    /* Every mode shares one heartbeat: the customer's tracking document is
       rewritten on a fixed TELEMETRY_PUSH_INTERVAL_MS cadence whether or not
       the rider has moved since the last tick. */
    telemetryIntervalRef.current = setInterval(() => {
      broadcastFix(lastFixRef.current);
    }, TELEMETRY_PUSH_INTERVAL_MS);

    if (trackingMode === "device" && typeof navigator !== "undefined" && "geolocation" in navigator) {
      setGpsStatusMsg("Acquiring Live Device GPS (High Accuracy)...");
      /* watchPosition only refreshes the fix the heartbeat reads — it no longer
         pushes on its own, so a jittery GPS cannot flood Firestore with writes. */
      watchPositionIdRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const accuracy = pos.coords.accuracy || 10;

          // Reject inaccurate GPS fixes
          if (accuracy > 35) {
            setGpsStatusMsg(`Low GPS accuracy (±${accuracy.toFixed(0)}m) — waiting for fix`);
            return;
          }

          lastFixRef.current = {
            latitude: lat,
            longitude: lng,
            heading: pos.coords.heading || 0,
            speed: pos.coords.speed || 0,
          };
          setCurrentCoords({ latitude: lat, longitude: lng });
          setGpsStatusMsg(`Live GPS Active: ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E (±${accuracy.toFixed(0)}m)`);
        },
        (err) => {
          console.warn("Device GPS error, falling back to simulated route:", err.message);
          setGpsStatusMsg("GPS signal weak — falling back to simulated travel");
          setTrackingMode("simulate");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      // Simulated Scooter Movement Mode hugging actual Anantnag road geometry
      setGpsStatusMsg("Broadcasting simulated turn-by-turn road travel in Anantnag...");

      let step = 0;
      simulationIntervalRef.current = setInterval(() => {
        const points = currentRoutePointsRef.current;
        if (points && points.length > 0) {
          step = (step + 1) % points.length;
          const [newLat, newLng] = points[step];

          lastFixRef.current = { latitude: newLat, longitude: newLng, heading: 42, speed: 26 };
          setCurrentCoords({ latitude: newLat, longitude: newLng });
          setGpsStatusMsg(`Live Street GPS: ${newLat.toFixed(4)}°N, ${newLng.toFixed(4)}°E`);
        } else {
          // Fallback if road geometry not yet ready
          const order = currentOrderRef.current;
          const targetLat = order?.location?.lat || 33.7385;
          const targetLng = order?.location?.lng || 75.1565;
          step = (step + 1) % 30;
          const progress = step / 30;
          const newLat = NAI_BASTI_HUB.latitude + (targetLat - NAI_BASTI_HUB.latitude) * progress;
          const newLng = NAI_BASTI_HUB.longitude + (targetLng - NAI_BASTI_HUB.longitude) * progress;

          lastFixRef.current = { latitude: newLat, longitude: newLng, heading: 42, speed: 24 };
          setCurrentCoords({ latitude: newLat, longitude: newLng });
          setGpsStatusMsg(`Streaming GPS: ${newLat.toFixed(4)}°N, ${newLng.toFixed(4)}°E`);
        }
      }, TELEMETRY_PUSH_INTERVAL_MS);
    }
  }, [trackingMode, broadcastFix, currentCoords.latitude, currentCoords.longitude]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      releaseScreenWakeLock();
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
      if (telemetryIntervalRef.current) clearInterval(telemetryIntervalRef.current);
      if (watchPositionIdRef.current !== null && typeof navigator !== "undefined") {
        navigator.geolocation.clearWatch(watchPositionIdRef.current);
      }
    };
  }, []);

  /* Broadcasting begins the moment a drop is on the rider's queue — the order
     is already assigned to them at that point, so the customer's map should be
     live well before the status flips to Out for Delivery — and stops as soon
     as the queue empties or the rider goes off duty. */
  const hasAssignedWork = activeQueue.length > 0;
  useEffect(() => {
    if (!hasAssignedWork) manualPauseRef.current = false;
    if (isOnline && hasAssignedWork && !isTracking && !manualPauseRef.current) {
      startTracking();
    } else if ((!isOnline || !hasAssignedWork) && isTracking) {
      stopTracking();
    }
  }, [isOnline, hasAssignedWork, isTracking, startTracking, stopTracking]);


  const toggleTracking = () => {
    if (isTracking) {
      manualPauseRef.current = true;
      stopTracking();
    } else {
      startTracking();
    }
  };

  // 6. Order Actions
  const handleClaimOrder = async (order) => {
    const oId = order.orderId || order.id;
    if (!driverId) {
      setAuthError("Sign in as a rider before claiming orders.");
      return;
    }
    const res = await claimOrder(oId, driverId, driverDisplayName);
    if (res && res.success === false) {
      setAuthError(res.message || "Could not claim this order.");
      setAvailableOrders((prev) => prev.filter((o) => (o.orderId || o.id) !== oId));
      return;
    }
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
    const expectedOtp = String(currentOrder.otp || "").trim();

    if (!expectedOtp) {
      setAuthError("This order has no delivery code. Contact the store before closing it.");
      return;
    }

    if (enteredOtp.trim() === expectedOtp) {
      await updateOrderStatus(oId, ORDER_STATUS.DELIVERED);
      setCompletedOrdersCount((prev) => prev + 1);
      setShowDeliverySuccess(true);
      setEnteredOtp("");

      // Advance Queue: remove delivered drop, promote next drop
      const remaining = activeOrders.filter((o) => (o.orderId || o.id) !== oId);
      setActiveOrders(remaining);
      if (remaining.length > 0) {
        setSelectedOrderId(remaining[0].orderId || remaining[0].id);
      } else {
        setSelectedOrderId(null);
        stopTracking();
      }
      setTimeout(() => setShowDeliverySuccess(false), 4000);
    } else {
      alert("Incorrect code. Ask the customer to read out the 4-digit code shown in their app.");
    }
  };

  const handleDirectDelivered = async () => {
    if (!currentOrder) return;
    const oId = currentOrder.orderId || currentOrder.id;
    if (window.confirm("Bypass OTP and mark this delivery as completed? Use this if customer is unreachable or had an OTP SMS issue.")) {
      await updateOrderStatus(oId, ORDER_STATUS.DELIVERED);
      setCompletedOrdersCount((prev) => prev + 1);
      setShowDeliverySuccess(true);
      setEnteredOtp("");

      // Advance Queue
      const remaining = activeOrders.filter((o) => (o.orderId || o.id) !== oId);
      setActiveOrders(remaining);
      if (remaining.length > 0) {
        setSelectedOrderId(remaining[0].orderId || remaining[0].id);
      } else {
        setSelectedOrderId(null);
        stopTracking();
      }
      setTimeout(() => setShowDeliverySuccess(false), 4000);
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

  /* Rider sign-in: Firebase credentials plus a driver/admin staff role. The
     watchAuth subscription above flips isFleetAuthorized once the role resolves,
     so this handler only has to report failures. */
  const handleFleetSignIn = async (e) => {
    e.preventDefault();
    setIsFleetVerifying(true);
    setFleetPinError("");
    try {
      const res = await signInWithEmail(fleetEmail, fleetPin);
      if (!res.success) {
        setFleetPinError(res.message || "Invalid rider credentials. Access denied.");
        return;
      }
      const role = await getStaffRole(res.user?.uid);
      if (role !== "driver" && role !== "admin") {
        const uid = res.user?.uid || "";
        await signOut();
        setFleetPinError(
          `This account is not registered as a rider. In the Firebase console create the document staff/${uid} with { role: "driver", active: true }.`
        );
      }
    } catch (err) {
      setFleetPinError(err?.message || "Could not verify rider credentials.");
    } finally {
      setIsFleetVerifying(false);
    }
  };

  if (!isFleetAuthorized) {
    return (
      <div className="min-h-screen bg-[#040E22] flex items-center justify-center p-4 selection:bg-[#FF5B00] selection:text-white">
        <Head>
          <title>DASHIT Fleet — Rider Authorization Gate</title>
          {/* Staff console: never indexed, never surfaced in search results. */}
          <meta name="robots" content="noindex, nofollow, noarchive" />
        </Head>
        <div className="bg-[#061838] border border-white/10 rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-[#FF5B00]/20 flex items-center justify-center mx-auto text-[#FF5B00]">
            <Bike className="w-7 h-7" />
          </div>
          
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-[#FF5B00] block mb-1">
              Restricted Rider Fleet Portal
            </span>
            <h1 className="font-black text-xl text-white">Rider Dispatch Console</h1>
            <p className="text-xs text-slate-400 font-medium leading-relaxed mt-1">
              Sign in with your registered rider account to access live delivery queues.
            </p>
          </div>

          <form onSubmit={handleFleetSignIn} className="space-y-3 pt-1">
            <input
              type="email"
              autoComplete="username"
              value={fleetEmail}
              onChange={(e) => {
                setFleetEmail(e.target.value);
                setFleetPinError("");
              }}
              placeholder="Rider email"
              className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-center text-sm font-bold text-white placeholder:text-slate-500 focus:outline-none focus:border-[#FF5B00] transition-colors"
              autoFocus
            />
            <input
              type="password"
              autoComplete="current-password"
              value={fleetPin}
              onChange={(e) => {
                setFleetPin(e.target.value);
                setFleetPinError("");
              }}
              placeholder="Password"
              className="w-full bg-white/5 border border-white/15 rounded-xl px-4 py-3 text-center text-sm font-bold tracking-widest text-white placeholder:text-slate-500 placeholder:tracking-normal focus:outline-none focus:border-[#FF5B00] transition-colors"
            />

            {fleetPinError && (
              <p className="text-[11px] font-bold text-rose-400 bg-rose-500/10 border border-rose-500/20 py-2 px-3 rounded-lg">
                {fleetPinError}
              </p>
            )}

            <button
              type="submit"
              disabled={!fleetEmail || !fleetPin || isFleetVerifying}
              className="w-full bg-[#FF5B00] hover:bg-[#E04E00] disabled:opacity-50 text-white py-3 px-4 rounded-xl text-xs font-black shadow-md shadow-[#FF5B00]/20 transition-all cursor-pointer active:scale-95"
            >
              {isFleetVerifying ? "Verifying…" : "Authorize Rider Console"}
            </button>
          </form>

          <div className="pt-2 border-t border-white/10">
            <Link
              href="/shop"
              className="inline-flex items-center justify-center space-x-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Return to Storefront</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07111F] text-slate-100 font-sans antialiased" style={{ paddingBottom: "calc(68px + env(safe-area-inset-bottom, 0px))" }}>
      <Head>
        <title>DASHIT Fleet — Rider Dispatch Console</title>
        <meta name="robots" content="noindex, nofollow, noarchive" />
      </Head>

      {/* ── Compact sticky header ── */}
      <header className="sticky top-0 z-40 bg-[#07111F]/95 backdrop-blur-md border-b border-white/8 px-4 flex items-center justify-between"
        style={{ paddingTop: "calc(env(safe-area-inset-top, 0px) + 10px)", paddingBottom: "10px" }}>
        {/* Left: hub name */}
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#FF5B00]/15 border border-[#FF5B00]/25 flex items-center justify-center shrink-0">
            <Radio className="w-3.5 h-3.5 text-[#FF5B00]" />
          </div>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-widest text-[#FF5B00] leading-none">Central Hub</p>
            <p className="text-xs font-bold text-white truncate leading-tight">Lal Chowk, Anantnag</p>
          </div>
        </div>

        {/* Right: duty toggle + driver initial */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Today's stats mini ribbon */}
          <div className="hidden xs:flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
            <span className="text-emerald-400 font-black">{completedOrdersCount}</span>
            <span>done</span>
            {activeOrders.length > 0 && <>
              <span className="text-white/20">·</span>
              <span className="text-sky-400 font-black">{activeOrders.length}</span>
              <span>active</span>
            </>}
          </div>
          {/* Duty toggle */}
          <button
            onClick={() => setIsOnline(!isOnline)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-black flex items-center gap-1.5 border transition-all active:scale-95 ${
              isOnline
                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                : "bg-white/5 border-white/10 text-slate-400"
            }`}
          >
            <span className={`w-2 h-2 rounded-full ${isOnline ? "bg-emerald-400 animate-ping" : "bg-slate-500"}`} />
            {isOnline ? "ON DUTY" : "OFFLINE"}
          </button>
          {/* Avatar */}
          <div className="w-8 h-8 rounded-full bg-[#FF5B00] flex items-center justify-center text-white font-black text-sm shrink-0">
            {(driverDisplayName[0] || "R").toUpperCase()}
          </div>
        </div>
      </header>

      {/* ── Sandbox banner ── */}
      {isSandbox && (
        <div className="mx-4 mt-3 bg-amber-500/10 border border-amber-500/30 rounded-xl p-2.5 flex items-center gap-2 text-[11px] text-amber-200">
          <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span><span className="font-bold text-white">Sandbox Mode</span> — Assign <code className="text-amber-300 font-mono">role:&apos;driver&apos;</code> in Firestore to go live.</span>
        </div>
      )}

      {/* ── Main scrollable content ── */}
      <main className="max-w-md mx-auto px-4 pt-3 pb-4 space-y-3">

        {/* ════════════════ TAB: ACTIVE DELIVERIES ════════════════ */}
        {activeTab === "active" && (
          <div className="space-y-3">
            {currentOrder ? (
              <>
                {/* Delivery step indicator */}
                {(() => {
                  const status = currentOrder.status || "";
                  const isPickedUp = status === ORDER_STATUS.OUT_FOR_DELIVERY || status === "Out for Delivery";
                  const steps = [
                    { label: "Pick Up", done: isPickedUp },
                    { label: "En Route", active: isPickedUp },
                    { label: "Deliver", done: false },
                  ];
                  return (
                    <div className="bg-white/[0.04] border border-white/8 rounded-2xl px-4 py-3">
                      <div className="flex items-center justify-between">
                        {steps.map((s, i) => (
                          <div key={i} className="flex items-center">
                            <div className="flex flex-col items-center gap-1">
                              <div className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-[11px] border-2 transition-all ${
                                s.done
                                  ? "bg-emerald-500 border-emerald-500 text-white"
                                  : s.active
                                  ? "bg-[#FF5B00] border-[#FF5B00] text-white"
                                  : "bg-white/5 border-white/15 text-slate-400"
                              }`}>
                                {s.done ? <CheckCircle2 className="w-3.5 h-3.5" /> : i + 1}
                              </div>
                              <span className={`text-[10px] font-bold ${s.done ? "text-emerald-400" : s.active ? "text-[#FF5B00]" : "text-slate-500"}`}>
                                {s.label}
                              </span>
                            </div>
                            {i < steps.length - 1 && (
                              <div className={`flex-1 h-0.5 mx-2 mb-4 rounded-full transition-all ${s.done ? "bg-emerald-500" : "bg-white/10"}`} style={{ width: 32 }} />
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                {/* COD / Payment badge + order ID */}
                <div className="flex items-center justify-between px-1">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Current Drop</p>
                    <p className="text-sm font-black text-white">#{currentOrder.orderId || currentOrder.id}</p>
                  </div>
                  {(() => {
                    const isCOD = !/online|upi|card|prepaid/i.test(currentOrder.paymentMethod || "COD");
                    return isCOD ? (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200">
                        <Banknote className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-[10px] uppercase tracking-wide font-bold">Collect</span>
                        <span className="text-lg font-black text-white tabular-nums">₹{currentOrder.totalAmount || currentOrder.total || 0}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="text-[11px] font-bold">Paid Online</span>
                      </div>
                    );
                  })()}
                </div>

                {/* Map */}
                <div className="relative w-full rounded-2xl overflow-hidden border border-white/8 shadow-xl" style={{ height: 210 }}>
                  <div ref={mapContainerRef} className="w-full h-full z-0" />
                  {/* ETA badge */}
                  <div className="absolute top-2.5 left-2.5 z-10 bg-[#07111F]/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/15 flex items-center gap-1.5 text-[11px] font-bold text-white shadow pointer-events-none">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    {routeStats.distanceKm} km · {routeStats.durationMins} min
                  </div>
                  {/* GPS status */}
                  <div className="absolute bottom-2 left-2 right-2 z-10 bg-[#07111F]/90 backdrop-blur-md px-2.5 py-1 rounded-lg border border-white/10 flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span className="truncate">{gpsStatusMsg}</span>
                    <span className={`font-bold shrink-0 ml-2 ${isTracking ? "text-emerald-400" : "text-slate-500"}`}>
                      {isTracking ? "● LIVE" : "○ PAUSED"}
                    </span>
                  </div>
                </div>

                {/* Address + Navigation */}
                <div className="bg-white/[0.04] border border-white/8 rounded-2xl p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#FF5B00]/15 border border-[#FF5B00]/25 flex items-center justify-center shrink-0 mt-0.5">
                      <MapPin className="w-4.5 h-4.5 text-[#FF5B00]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Deliver to</p>
                      <p className="text-[15px] text-white font-semibold leading-snug mt-0.5">
                        {orderAddress(currentOrder, "No address")}
                      </p>
                      <p className="text-sm text-emerald-400 font-medium mt-1">
                        {routeStats.distanceKm} km · about {routeStats.durationMins} min
                      </p>
                    </div>
                  </div>
                  <a
                    href={multiStopNavUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-white text-slate-900 font-black text-[15px] py-4 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg"
                  >
                    <Navigation className="w-5 h-5 fill-slate-900" />
                    {activeQueue.length > 1 ? `Navigate (${activeQueue.length} stops)` : "Start Navigation"}
                  </a>
                </div>

                {/* Customer card */}
                {(() => {
                  const phone = currentOrder.mobile || currentOrder.customerMobile || currentOrder.phone || "";
                  const clean = phone.replace(/[^0-9]/g, "").slice(-10);
                  return (
                    <div className="bg-white/[0.04] border border-white/8 rounded-2xl p-4">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-full bg-slate-700 flex items-center justify-center text-white font-black text-base shrink-0">
                          {(currentOrder.customerName?.[0] || "C").toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-base font-bold text-white truncate">{currentOrder.customerName || "Customer"}</p>
                          <p className="text-sm font-mono text-slate-300">{phone || "No number"}</p>
                        </div>
                      </div>
                      {clean ? (
                        <div className="grid grid-cols-2 gap-2.5">
                          <a href={`tel:${clean}`}
                            className="bg-[#FF5B00] text-white rounded-xl py-3.5 flex items-center justify-center gap-2 text-[15px] font-bold active:scale-95 transition-transform">
                            <Phone className="w-5 h-5" />
                            Call
                          </a>
                          <a href={`https://wa.me/91${clean}?text=Hello%2C%20I%20am%20your%20DashIt%20delivery%20partner%20with%20order%20%23${currentOrder.orderId || currentOrder.id}.`}
                            target="_blank" rel="noopener noreferrer"
                            className="bg-emerald-600 text-white rounded-xl py-3.5 flex items-center justify-center gap-2 text-[15px] font-bold active:scale-95 transition-transform">
                            <MessageCircle className="w-5 h-5" />
                            WhatsApp
                          </a>
                        </div>
                      ) : null}
                    </div>
                  );
                })()}

                {/* Items checklist */}
                {currentOrder.items && currentOrder.items.length > 0 && (
                  <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-[#FF5B00]" />
                        Bag Check · {currentOrder.items.length} items
                      </span>
                      <span className="text-[11px] font-bold text-slate-400">₹{currentOrder.totalAmount || currentOrder.total || 0}</span>
                    </div>
                    <div className="divide-y divide-white/5 max-h-28 overflow-y-auto">
                      {currentOrder.items.map((it, idx) => (
                        <div key={idx} className="py-1.5 flex items-center justify-between text-[12px]">
                          <span className="text-slate-300 truncate pr-2">{it.quantity || 1}× {it.name || it.title}</span>
                          <span className="text-slate-400 font-mono shrink-0">₹{(it.price || 0) * (it.quantity || 1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Mark Picked Up (if not yet en route) */}
                {currentOrder.status !== ORDER_STATUS.OUT_FOR_DELIVERY && currentOrder.status !== "Out for Delivery" && (
                  <button
                    onClick={handleMarkPickedUp}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#FF5B00] to-orange-500 text-white font-black text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg"
                  >
                    <Truck className="w-5 h-5" />
                    Picked Up from Hub · Start Delivery
                  </button>
                )}

                {/* I've Arrived → opens OTP overlay */}
                {(currentOrder.status === ORDER_STATUS.OUT_FOR_DELIVERY || currentOrder.status === "Out for Delivery") && (
                  <button
                    onClick={() => setShowOtpOverlay(true)}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 text-white font-black text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-transform shadow-lg"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                    I&apos;ve Arrived · Complete Delivery
                  </button>
                )}

                {/* GPS broadcast toggle */}
                <button
                  onClick={toggleTracking}
                  className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-[0.98] border ${
                    isTracking
                      ? "bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20"
                      : "bg-white/[0.05] border-white/10 text-slate-300 hover:bg-white/[0.08]"
                  }`}
                >
                  {isTracking ? (
                    <><Square className="w-3.5 h-3.5 fill-rose-400" /><span>Pause GPS Broadcast</span></>
                  ) : (
                    <><Play className="w-3.5 h-3.5 fill-slate-300" /><span>Broadcast Live Location</span></>
                  )}
                </button>

                {/* Multi-drop queue (if more than 1 order) */}
                {activeQueue.length > 1 && (
                  <div className="bg-white/[0.03] border border-white/8 rounded-2xl p-4 space-y-2.5">
                    <h3 className="text-[11px] font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <ListOrdered className="w-3.5 h-3.5 text-[#FF5B00]" />
                      Multi-Drop Queue ({activeQueue.length} stops)
                    </h3>
                    <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                      {activeQueue.map((ord, idx) => {
                        const isSelected = (ord.orderId || ord.id) === (currentOrder?.orderId || currentOrder?.id);
                        return (
                          <button
                            key={ord.orderId || ord.id}
                            onClick={() => setSelectedOrderId(ord.orderId || ord.id)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shrink-0 border transition-all ${
                              isSelected
                                ? "bg-[#FF5B00] border-[#FF5B00] text-white scale-105"
                                : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                            }`}
                          >
                            <span className={`w-4.5 h-4.5 rounded-full flex items-center justify-center text-[10px] font-black ${isSelected ? "bg-white text-[#FF5B00]" : "bg-white/10"}`}>
                              {idx + 1}
                            </span>
                            <span className="truncate max-w-[70px]">{ord.customerName || `Drop ${idx + 1}`}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Empty active state */
              <div className="bg-white/[0.03] border border-white/8 rounded-3xl p-10 text-center space-y-4 mt-2">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center mx-auto">
                  <Bike className="w-8 h-8 text-[#FF5B00]" />
                </div>
                <div>
                  <h3 className="font-black text-base text-white">No Active Delivery</h3>
                  <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto leading-relaxed">
                    You&apos;re idle at Central Hub. Pick up an order from the pool to start your next delivery.
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("available")}
                  className="px-5 py-3 rounded-xl bg-[#FF5B00] text-white font-black text-sm inline-flex items-center gap-2 shadow-lg shadow-[#FF5B00]/25 active:scale-95 transition-transform"
                >
                  <Package className="w-4 h-4" />
                  View Available Orders
                  <span className="bg-white text-[#FF5B00] text-[10px] px-1.5 py-0.5 rounded-full font-black">{availableOrders.length}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* ════════════════ TAB: AVAILABLE POOL ════════════════ */}
        {activeTab === "available" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-0.5">
              <h2 className="text-[11px] font-black uppercase tracking-wider text-slate-400">
                {availableOrders.length} orders ready to claim
              </h2>
              <span className="text-[10px] font-bold text-[#FF5B00] bg-[#FF5B00]/10 border border-[#FF5B00]/20 px-2 py-0.5 rounded-full">
                Hub · Lal Chowk
              </span>
            </div>

            {availableOrders.length > 0 ? (
              availableOrders.map((ord) => {
                const oId = ord.orderId || ord.id;
                const isCOD = !/online|upi|card|prepaid/i.test(ord.paymentMethod || "COD");
                const amount = ord.totalAmount || ord.total || 0;
                const itemCount = ord.items?.length || 0;
                const address = ord.location?.address || "Main Market, Anantnag";
                const isSliding = slideAcceptId === oId;

                return (
                  <div key={oId} className="bg-white/[0.04] border border-white/8 rounded-2xl overflow-hidden hover:border-white/15 transition-all">
                    {/* Card top */}
                    <div className="p-4 space-y-2">
                      {/* Amount + payment */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-3xl font-black text-white tabular-nums">₹{amount}</span>
                            <span className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${isCOD ? "bg-amber-500/15 text-amber-300 border-amber-500/30" : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"}`}>
                              {isCOD ? "💵 COD" : "✅ Paid"}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
                            {itemCount > 0 ? `${itemCount} items` : "Order"} · {ord.status || "Placed"}
                          </p>
                        </div>
                        {/* Distance placeholder (OSRM not called here for perf) */}
                        <div className="bg-white/[0.06] border border-white/10 rounded-xl px-3 py-2 text-center shrink-0">
                          <p className="text-[10px] text-slate-400 font-medium">Est.</p>
                          <p className="text-sm font-black text-white">~2 km</p>
                        </div>
                      </div>

                      {/* Address */}
                      <div className="flex items-center gap-1.5 text-xs text-slate-300">
                        <MapPin className="w-3.5 h-3.5 text-[#FF5B00] shrink-0" />
                        <span className="truncate">{address}</span>
                      </div>
                    </div>

                    {/* Slide-to-Accept strip */}
                    <div
                      className="relative mx-3 mb-3 h-14 bg-white/[0.06] border border-white/10 rounded-xl overflow-hidden select-none touch-none"
                      ref={isSliding ? slideTrackRef : null}
                      onPointerDown={(e) => {
                        setSlideAcceptId(oId);
                        setSlideProgress(0);
                        slidingRef.current = true;
                        e.currentTarget.setPointerCapture(e.pointerId);
                      }}
                      onPointerMove={(e) => {
                        if (!slidingRef.current || slideAcceptId !== oId) return;
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = e.clientX - rect.left;
                        const pct = Math.max(0, Math.min(1, (x - 28) / (rect.width - 56)));
                        setSlideProgress(pct);
                        if (pct >= 0.92) {
                          slidingRef.current = false;
                          setSlideProgress(1);
                          setSlideAcceptId(null);
                          handleClaimOrder(ord);
                        }
                      }}
                      onPointerUp={() => {
                        slidingRef.current = false;
                        if (slideAcceptId === oId) {
                          setSlideProgress(0);
                          setSlideAcceptId(null);
                        }
                      }}
                      onPointerCancel={() => {
                        slidingRef.current = false;
                        setSlideProgress(0);
                        setSlideAcceptId(null);
                      }}
                    >
                      {/* Fill */}
                      <div
                        className="absolute inset-y-0 left-0 bg-[#FF5B00]/20 rounded-xl transition-none"
                        style={{ width: `${(isSliding ? slideProgress : 0) * 100}%` }}
                      />
                      {/* Label */}
                      <div className="absolute inset-0 flex items-center justify-center gap-2 text-[13px] font-black text-slate-300 pointer-events-none select-none">
                        <ChevronsRight className="w-4 h-4 text-[#FF5B00]" />
                        Slide to Accept
                        <ChevronsRight className="w-4 h-4 text-[#FF5B00]" />
                      </div>
                      {/* Thumb */}
                      <div
                        className="absolute top-1.5 bottom-1.5 w-11 bg-[#FF5B00] rounded-lg flex items-center justify-center shadow-lg shadow-[#FF5B00]/30 pointer-events-none transition-none"
                        style={{ left: `calc(${(isSliding ? slideProgress : 0) * (100 - 16)}% + 4px)`, willChange: "left" }}
                      >
                        <Bike className="w-5 h-5 text-white" />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white/[0.03] border border-white/8 rounded-3xl p-10 text-center space-y-3 mt-2">
                <div className="w-16 h-16 rounded-2xl bg-white/[0.06] border border-white/10 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="font-black text-base text-white">Queue Empty</h3>
                <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                  No unassigned orders right now. New orders appear here the moment a customer places one.
                </p>
              </div>
            )}
          </div>
        )}

        {/* ════════════════ TAB: PROFILE ════════════════ */}
        {activeTab === "profile" && (
          <div className="space-y-4 py-2">
            {/* Driver card */}
            <div className="bg-white/[0.04] border border-white/8 rounded-2xl p-5 flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-[#FF5B00] flex items-center justify-center text-white font-black text-2xl shrink-0">
                {(driverDisplayName[0] || "R").toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-lg font-black text-white truncate">{driverDisplayName}</p>
                <p className="text-xs text-slate-400 font-medium">{user?.email || ""}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] bg-[#FF5B00]/20 text-[#FF5B00] border border-[#FF5B00]/30 px-1.5 py-0.5 rounded-md font-black">PRO RIDER</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black ${isOnline ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-white/5 text-slate-400 border border-white/10"}`}>
                    {isOnline ? "ON DUTY" : "OFFLINE"}
                  </span>
                </div>
              </div>
            </div>

            {/* Today's stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/[0.04] border border-white/8 rounded-2xl p-4 text-center">
                <p className="text-3xl font-black text-emerald-400 tabular-nums">{completedOrdersCount}</p>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">Drops Today</p>
              </div>
              <div className="bg-white/[0.04] border border-white/8 rounded-2xl p-4 text-center">
                <p className="text-3xl font-black text-sky-400 tabular-nums">{activeOrders.length}</p>
                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mt-1">Active Now</p>
              </div>
            </div>

            {/* Duty toggle */}
            <button
              onClick={() => setIsOnline(!isOnline)}
              className={`w-full py-4 rounded-2xl font-black text-[15px] flex items-center justify-center gap-2.5 border transition-all active:scale-[0.98] ${
                isOnline
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/15"
                  : "bg-[#FF5B00]/10 border-[#FF5B00]/30 text-[#FF5B00] hover:bg-[#FF5B00]/15"
              }`}
            >
              <span className={`w-3 h-3 rounded-full ${isOnline ? "bg-emerald-400" : "bg-[#FF5B00]"}`} />
              {isOnline ? "Go Offline" : "Go Online"}
            </button>

            {/* Sign out */}
            <button
              onClick={() => signOut()}
              className="w-full py-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-rose-500/20"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        )}

        {/* Auth section (when no Firebase user) */}
        {!user && (
          <div className="bg-white/[0.04] border border-white/8 rounded-3xl p-5 space-y-3.5 mt-4">
            <div className="flex items-center gap-2 text-white">
              <User className="w-4 h-4 text-[#FF5B00]" />
              <h3 className="font-black text-sm">Rider Sign In</h3>
            </div>
            {authError && (
              <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs">{authError}</div>
            )}
            <form onSubmit={handleEmailSignIn} className="space-y-2.5">
              <input type="email" placeholder="Rider Email" value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-[#FF5B00]" />
              <input type="password" placeholder="Password" value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                className="w-full bg-black/40 border border-white/15 rounded-xl px-3 py-3 text-sm text-white focus:outline-none focus:border-[#FF5B00]" />
              <button type="submit" disabled={isAuthSubmitting}
                className="w-full py-3.5 rounded-xl bg-[#FF5B00] font-black text-sm text-white disabled:opacity-50 active:scale-[0.98] transition-transform">
                {isAuthSubmitting ? "Signing in…" : "Sign In"}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* ── OTP Verification Overlay ── */}
      {showOtpOverlay && (
        <div className="fixed inset-0 z-50 bg-[#07111F]/95 backdrop-blur-sm flex flex-col items-center justify-center p-6 gap-5">
          <div className="w-full max-w-sm space-y-5">
            {/* Header */}
            <div className="text-center space-y-1">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto mb-3">
                <KeyRound className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-2xl font-black text-white">Delivery Code</h2>
              <p className="text-sm text-slate-400">Ask the customer for the 4-digit code shown in their app</p>
            </div>

            {/* OTP input – big and easy to tap */}
            <input
              type="tel"
              inputMode="numeric"
              maxLength={4}
              placeholder="• • • •"
              value={enteredOtp}
              onChange={(e) => setEnteredOtp(e.target.value.replace(/[^0-9]/g, ""))}
              autoFocus
              className="w-full bg-black/50 border-2 border-white/20 text-center font-mono text-5xl font-black tracking-[0.3em] text-[#FF5B00] py-5 rounded-2xl focus:outline-none focus:border-[#FF5B00] transition-colors"
            />

            {/* Confirm */}
            <button
              onClick={handleVerifyDelivery}
              disabled={enteredOtp.length < 4}
              className="w-full py-5 rounded-2xl bg-emerald-500 disabled:opacity-40 text-slate-950 font-black text-lg flex items-center justify-center gap-2 active:scale-[0.98] transition-all shadow-xl shadow-emerald-500/20"
            >
              <CheckCircle2 className="w-6 h-6" />
              Confirm Delivery
            </button>

            {/* Bypass */}
            <button
              type="button"
              onClick={() => { setShowOtpOverlay(false); handleDirectDelivered(); }}
              className="w-full text-center text-sm font-bold text-amber-400/80 hover:text-amber-300 py-2 border border-amber-500/20 rounded-xl bg-amber-500/5 transition-colors"
            >
              Customer unreachable · Skip OTP &amp; Complete
            </button>

            {/* Close */}
            <button
              onClick={() => { setShowOtpOverlay(false); setEnteredOtp(""); }}
              className="w-full text-center text-sm text-slate-500 hover:text-slate-300 transition-colors py-2 flex items-center justify-center gap-1.5"
            >
              <X className="w-4 h-4" /> Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Delivery success modal ── */}
      {showDeliverySuccess && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-[#07111F] border border-emerald-500/40 rounded-3xl p-7 text-center space-y-4 max-w-xs w-full shadow-2xl">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-500/50 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white">Delivered! 🎉</h3>
              <p className="text-sm text-slate-400 mt-1">Order verified and marked complete.</p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
              <p className="text-emerald-400 font-black text-3xl tabular-nums">{completedOrdersCount}</p>
              <p className="text-[11px] text-emerald-300 font-bold uppercase tracking-wider">Drops Today</p>
            </div>
            <button
              onClick={() => setShowDeliverySuccess(false)}
              className="w-full py-3.5 rounded-xl bg-emerald-500 text-slate-950 font-black text-sm hover:bg-emerald-400 transition-colors active:scale-[0.98]"
            >
              Next Delivery →
            </button>
          </div>
        </div>
      )}

      {/* ── Persistent Bottom Navigation Bar ── */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#07111F]/98 backdrop-blur-md border-t border-white/10"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
        <div className="flex items-stretch max-w-md mx-auto">
          {/* Active Deliveries */}
          <button
            onClick={() => setActiveTab("active")}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 relative transition-colors ${activeTab === "active" ? "text-[#FF5B00]" : "text-slate-500 hover:text-slate-300"}`}
          >
            {activeTab === "active" && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#FF5B00] rounded-full" />}
            <Bike className="w-5 h-5" />
            <span className="text-[10px] font-bold">Active</span>
            {activeOrders.length > 0 && (
              <span className="absolute top-2 right-1/4 w-4 h-4 bg-[#FF5B00] rounded-full text-white text-[9px] font-black flex items-center justify-center">
                {activeOrders.length}
              </span>
            )}
          </button>

          {/* Available Pool */}
          <button
            onClick={() => setActiveTab("available")}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 relative transition-colors ${activeTab === "available" ? "text-[#FF5B00]" : "text-slate-500 hover:text-slate-300"}`}
          >
            {activeTab === "available" && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#FF5B00] rounded-full" />}
            <Package className="w-5 h-5" />
            <span className="text-[10px] font-bold">Pool</span>
            {availableOrders.length > 0 && (
              <span className="absolute top-2 right-1/4 w-4 h-4 bg-emerald-500 rounded-full text-white text-[9px] font-black flex items-center justify-center">
                {availableOrders.length > 99 ? "99+" : availableOrders.length}
              </span>
            )}
          </button>

          {/* Profile */}
          <button
            onClick={() => setActiveTab("profile")}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-3 relative transition-colors ${activeTab === "profile" ? "text-[#FF5B00]" : "text-slate-500 hover:text-slate-300"}`}
          >
            {activeTab === "profile" && <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-[#FF5B00] rounded-full" />}
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black ${activeTab === "profile" ? "bg-[#FF5B00] text-white" : "bg-white/10 text-slate-400"}`}>
              {(driverDisplayName[0] || "R").toUpperCase()}
            </div>
            <span className="text-[10px] font-bold">Profile</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
