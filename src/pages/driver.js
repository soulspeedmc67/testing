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
    <div className="min-h-screen bg-[#061838] text-slate-100 font-sans antialiased pb-24">
      <Head>
        <title>DASHIT Fleet — Rider Dispatch Console</title>
        <meta name="robots" content="noindex, nofollow, noarchive" />
      </Head>
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-40 bg-[#040E22]/95 backdrop-blur-md border-b border-white/10 px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3 space-y-2.5">
        {/* Navigation Portal Pills */}
        <div className="flex items-center justify-between text-[11px] bg-white/[0.04] px-3 py-1.5 rounded-xl border border-white/10">
          <span className="text-slate-400 font-medium flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-[#FF5B00] animate-pulse" />
            <span>DASHIT Central Hub: Lal Chowk</span>
          </span>
          <div className="flex items-center space-x-3">
            <Link
              href="/shop"
              className="text-[#FF5B00] font-bold hover:underline flex items-center space-x-1"
            >
              <Home className="w-3 h-3" />
              <span>Storefront</span>
            </Link>
          </div>
        </div>

        {/* Brand & Rider Status Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <img
              src="/dashit-app-icon.png"
              alt="DASHIT"
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

        {/* Shift Stats Bar (Fixed Salary Fleet) */}
        <div className="grid grid-cols-2 gap-2.5">
          <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-3 text-center">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Completed Today
            </p>
            <p className="text-lg font-black text-emerald-400 mt-0.5">
              {completedOrdersCount} drops
            </p>
          </div>
          <div className="bg-white/[0.05] border border-white/10 rounded-2xl p-3 text-center">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
              Assigned Active
            </p>
            <p className="text-lg font-black text-sky-400 mt-0.5">
              {activeOrders.length} orders
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
            {/* Multi-Drop Batch Queue Stepper */}
            {activeQueue.length > 1 && (
              <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-black text-slate-300 flex items-center gap-1.5 uppercase tracking-wider text-[10.5px]">
                    <ListOrdered className="w-3.5 h-3.5 text-[#FF5B00]" />
                    <span>Multi-Drop Delivery Queue ({activeQueue.length} Drops)</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Drop 1 En Route
                  </span>
                </div>

                <div className="flex items-center space-x-2 overflow-x-auto scrollbar-none pb-0.5">
                  {activeQueue.map((ord, idx) => {
                    const isSelected = (ord.orderId || ord.id) === (currentOrder?.orderId || currentOrder?.id);
                    return (
                      <button
                        key={ord.orderId || ord.id}
                        type="button"
                        onClick={() => setSelectedOrderId(ord.orderId || ord.id)}
                        className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer border ${
                          isSelected
                            ? "bg-[#FF5B00] border-[#FF5B00] text-white shadow-md shadow-[#FF5B00]/30 scale-105"
                            : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                            isSelected ? "bg-white text-[#FF5B00]" : "bg-white/10 text-slate-300"
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <span className="truncate max-w-[85px]">{ord.customerName || `Drop #${idx + 1}`}</span>
                        {idx === 0 && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {currentOrder ? (
              <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-4.5 space-y-4 shadow-xl">
                {/* Order Header & Payment Instruction */}
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-[#FF5B00]/20 text-[#FF5B00] border border-[#FF5B00]/30 px-2 py-0.5 rounded-md">
                        {activeQueue.findIndex((o) => (o.orderId || o.id) === (currentOrder.orderId || currentOrder.id)) === 0
                          ? "Stop #1 · Current Drop"
                          : `Stop #${activeQueue.findIndex((o) => (o.orderId || o.id) === (currentOrder.orderId || currentOrder.id)) + 1}`}
                      </span>
                      {activeQueue.length > 1 && (
                        <span className="text-[10px] text-slate-400 font-bold">
                          ({activeQueue.length} drops in batch)
                        </span>
                      )}
                    </div>
                    <h2 className="text-base font-black text-white">
                      Order #{currentOrder.orderId || currentOrder.id}
                    </h2>
                  </div>
                  {(() => {
                    const isCOD = !/online|upi|card|prepaid/i.test(currentOrder.paymentMethod || "COD");
                    return isCOD ? (
                      <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-amber-500/15 border border-amber-500/40 text-amber-200">
                        <Banknote className="w-5 h-5 text-amber-400 shrink-0" />
                        <span className="text-[11px] uppercase tracking-wider">Collect cash</span>
                        <span className="text-xl font-bold text-white">
                          ₹{currentOrder.totalAmount || currentOrder.total || 0}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-200">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                        <span className="text-base font-semibold text-white">Already paid</span>
                        <span className="text-[11px] uppercase tracking-wider">take no cash</span>
                      </div>
                    );
                  })()}
                </div>

                {/* Customer Details & Call / WhatsApp Actions */}
                {(() => {
                  const customerPhone = currentOrder.mobile || currentOrder.customerMobile || currentOrder.phone || "";
                  const cleanPhone = customerPhone.replace(/[^0-9]/g, "").slice(-10);
                  return (
                    <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 space-y-3">
                      <div className="min-w-0">
                        <p className="text-base font-bold text-white truncate">
                          {currentOrder.customerName || "Customer"}
                        </p>
                        <p className="text-lg font-mono text-slate-200 tracking-wide truncate">
                          {customerPhone || "No number"}
                        </p>
                      </div>
                      {cleanPhone ? (
                        <div className="grid grid-cols-2 gap-2.5">
                          <a
                            href={`tel:${cleanPhone}`}
                            className="bg-[#FF5B00] hover:bg-orange-600 text-white rounded-xl py-3.5 flex items-center justify-center gap-2 text-base font-bold transition-transform active:scale-95"
                          >
                            <Phone className="w-5 h-5" />
                            <span>Call</span>
                          </a>
                          <a
                            href={`https://wa.me/91${cleanPhone}?text=Hello%2C%20I%20am%20your%20DashIt%20delivery%20partner%20with%20order%20%23${currentOrder.orderId || currentOrder.id}.`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl py-3.5 flex items-center justify-center gap-2 text-base font-bold transition-transform active:scale-95"
                          >
                            <MessageCircle className="w-5 h-5" />
                            <span>WhatsApp</span>
                          </a>
                        </div>
                      ) : null}
                    </div>
                  );
                })()}

                {/* Delivery Address & Navigation */}
                <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-5 h-5 text-[#FF5B00] shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-widest text-slate-400">
                        Go to
                      </p>
                      <p className="text-base text-white mt-0.5 leading-snug font-medium">
                        {orderAddress(currentOrder, "No address on this order")}
                      </p>
                      <p className="text-sm text-emerald-400 mt-1.5 font-medium">
                        {routeStats.distanceKm} km &middot; about {routeStats.durationMins} min
                      </p>
                    </div>
                  </div>

                  {/* Multi-Stop Google Maps Navigation Button */}
                  <a
                    href={multiStopNavUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full bg-white text-slate-900 font-bold text-base py-3.5 rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-transform cursor-pointer shadow-md"
                  >
                    <Navigation className="w-5 h-5 fill-slate-900" />
                    <span>
                      {activeQueue.length > 1
                        ? `Start Multi-Stop Navigation (${activeQueue.length} Drops)`
                        : "Start Navigation"}
                    </span>
                  </a>
                </div>

                {/* Clean Live Road Map (Multiple Numbered Drop Pins) */}
                <div className="relative w-full h-56 rounded-2xl overflow-hidden border border-white/10 shadow-inner">
                  <div ref={mapContainerRef} className="w-full h-full z-0" />

                  {/* Route ETA Floating Badge */}
                  <div className="absolute top-2.5 left-2.5 z-10 bg-[#061838]/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/15 flex items-center space-x-1.5 text-[10px] font-bold text-white shadow-sm pointer-events-none">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>{routeStats.distanceKm} km · {routeStats.durationMins} mins to drop</span>
                  </div>

                  {/* Status Indicator */}
                  <div className="absolute bottom-2 left-2 right-2 z-10 bg-[#061838]/90 backdrop-blur-md px-2.5 py-1.5 rounded-xl border border-white/15 flex items-center justify-between text-[10px] font-mono text-slate-300">
                    <span className="truncate">{gpsStatusMsg}</span>
                    <span className="text-[#FF5B00] font-bold shrink-0 ml-2">
                      {isTracking ? "Broadcasting Live" : "Tracking Paused"}
                    </span>
                  </div>
                </div>

                {/* GPS Broadcast Control Button */}
                <button
                  onClick={toggleTracking}
                  className={`w-full py-3 rounded-2xl font-black text-xs flex items-center justify-center space-x-2 transition-all shadow-md active:scale-[0.98] ${
                    isTracking
                      ? "bg-rose-600 hover:bg-rose-700 text-white"
                      : "bg-[#FF5B00] hover:bg-orange-600 text-white"
                  }`}
                >
                  {isTracking ? (
                    <>
                      <Square className="w-3.5 h-3.5 fill-white" />
                      <span>PAUSE LIVE GPS BROADCAST</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-white" />
                      <span>BROADCAST LIVE LOCATION TO CUSTOMER</span>
                    </>
                  )}
                </button>

                {/* Bag / Items Overview (if available) */}
                {currentOrder.items && currentOrder.items.length > 0 && (
                  <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-3 space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                      <span className="flex items-center gap-1.5 text-slate-200">
                        <Package className="w-3.5 h-3.5 text-[#FF5B00]" />
                        <span>Delivery Items ({currentOrder.items.length})</span>
                      </span>
                      <span className="text-[11px] text-slate-400">Order Total: ₹{currentOrder.totalAmount || currentOrder.total || 0}</span>
                    </div>
                    <div className="divide-y divide-white/5 max-h-32 overflow-y-auto text-[11px] text-slate-300 pt-1">
                      {currentOrder.items.map((it, idx) => (
                        <div key={idx} className="py-1 flex items-center justify-between">
                          <span className="truncate pr-2">{it.quantity || 1}x {it.name || it.title}</span>
                          <span className="text-slate-400 font-mono shrink-0">₹{(it.price || 0) * (it.quantity || 1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

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
                <div className="bg-white/[0.04] border border-sky-500/30 rounded-2xl p-4 space-y-3 shadow-md">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-sky-300 flex items-center gap-1.5">
                      <KeyRound className="w-4 h-4 text-[#FF5B00]" />
                      <span>Customer Delivery OTP:</span>
                    </label>
                    <span className="text-[10px] text-slate-400 font-medium">4 digits</span>
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      maxLength={4}
                      placeholder="••••"
                      value={enteredOtp}
                      onChange={(e) => setEnteredOtp(e.target.value.replace(/[^0-9]/g, ""))}
                      className="bg-black/50 border border-white/20 text-center font-mono text-xl font-black tracking-widest text-[#FF5B00] py-2.5 rounded-xl grow focus:outline-hidden focus:border-[#FF5B00]"
                    />
                    <button
                      onClick={handleVerifyDelivery}
                      className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-6 rounded-xl shadow-md transition-transform active:scale-95"
                    >
                      DELIVER
                    </button>
                  </div>

                  <p className="text-[10px] text-slate-400 text-center">
                    Ask customer for the 4-digit code shown in their app to complete delivery.
                  </p>

                  {/* Manual Delivered Override if OTP Issue */}
                  <button
                    type="button"
                    onClick={handleDirectDelivered}
                    className="w-full text-center text-[11px] font-bold text-amber-400/90 hover:text-amber-300 py-1.5 border border-amber-500/20 hover:border-amber-500/40 rounded-xl bg-amber-500/5 hover:bg-amber-500/10 transition-colors cursor-pointer flex items-center justify-center space-x-1.5"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                    <span>Customer phone unavailable? Complete Directly</span>
                  </button>
                </div>

                {/* Upcoming Drops in This Queue (if more than 1 order) */}
                {activeQueue.length > 1 && (
                  <div className="bg-white/[0.03] border border-white/10 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                        <ListOrdered className="w-4 h-4 text-[#FF5B00]" />
                        <span>Upcoming Drops in Batch ({activeQueue.length - 1})</span>
                      </h3>
                      <span className="text-[10px] text-slate-400 font-medium">Sequential stops</span>
                    </div>

                    <div className="space-y-2">
                      {activeQueue.slice(1).map((ord, qIdx) => {
                        const actualIdx = qIdx + 1;
                        const oId = ord.orderId || ord.id;
                        const isCOD = !/online|upi|card|prepaid/i.test(ord.paymentMethod || "COD");
                        return (
                          <div
                            key={oId}
                            className="bg-white/[0.04] border border-white/10 rounded-xl p-3 flex items-center justify-between gap-2.5"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 border border-blue-500/30 flex items-center justify-center font-black text-xs shrink-0">
                                {actualIdx + 1}
                              </span>
                              <div className="truncate">
                                <p className="text-xs font-bold text-white truncate">
                                  {ord.customerName || "Customer"} · #{oId}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate">
                                  {orderAddress(ord, "Anantnag")}
                                </p>
                                <p className="text-[10px] font-mono text-emerald-400 mt-0.5">
                                  ₹{ord.totalAmount || ord.total || 0} · {isCOD ? "COD Cash" : "Paid Online"}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center space-x-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => setSelectedOrderId(oId)}
                                className="px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold transition-colors cursor-pointer"
                                title="Make this the current stop"
                              >
                                Select
                              </button>
                              <button
                                type="button"
                                onClick={() => handleMoveDrop(actualIdx, -1)}
                                className="p-1 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors cursor-pointer"
                                title="Move up in queue"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
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
              <span className="text-[10px] font-bold text-[#FF5B00]">Store Hub</span>
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
                      {(() => {
                        const isCOD = !/online|upi|card|prepaid/i.test(ord.paymentMethod || "COD");
                        return (
                          <span
                            className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${
                              isCOD
                                ? "bg-amber-500/15 text-amber-300 border-amber-500/30"
                                : "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                            }`}
                          >
                            ₹{ord.totalAmount || ord.total || 0} · {isCOD ? "Cash on Delivery" : "Paid Online"}
                          </span>
                        );
                      })()}
                    </div>

                    <div className="text-xs text-slate-300 space-y-1">
                      <p className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-[#FF5B00] shrink-0" />
                        <span className="truncate">
                          {ord.location?.address || "Main Market, Anantnag"}
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-400 pl-5">
                        {ord.items?.length || 2} items · ₹{ord.totalAmount || ord.total || 180} · {ord.paymentMethod || "COD"}
                      </p>
                    </div>

                    <button
                      onClick={() => handleClaimOrder(ord)}
                      className="w-full py-2.5 rounded-xl bg-[#FF5B00] hover:bg-orange-600 text-white font-extrabold text-xs flex items-center justify-center gap-1.5 shadow-md transition-transform active:scale-95"
                    >
                      <Bike className="w-3.5 h-3.5" />
                      <span>Accept &amp; Start Delivery</span>
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
                Customer received the order and 4-digit OTP was verified. Order successfully marked as delivered.
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
