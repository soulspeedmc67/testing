import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { ShieldCheck, Navigation, Clock } from "lucide-react";
import { fetchRoadRoute } from "../lib/maps";
import { calculateLiveOrderEta } from "../lib/deliveryEta";
import { watchOrder, watchOrderTracking } from "../lib/db";
import { calculateBearing, getRiderAssetForHeading, RIDER_ASSETS } from "../lib/riderAssets";

// 3D Rider & Marker builders for Leaflet
function create3DRiderIcon(L, assetUrl = "/rider/rider_180.png") {
  return L.divIcon({
    className: "rider-marker-3d",
    html: `
      <div style="position:relative; width:58px; height:58px; display:flex; align-items:center; justify-content:center; pointer-events:none;">
        <img src="${RIDER_ASSETS.effects.ripple}" style="position:absolute; width:56px; height:56px; object-fit:contain; opacity:0.9; animation:pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;" alt="" />
        <img src="${RIDER_ASSETS.effects.shadow}" style="position:absolute; bottom:2px; width:44px; height:18px; object-fit:contain; opacity:0.6;" alt="" />
        <img src="${assetUrl}" style="width:48px; height:48px; object-fit:contain; filter:drop-shadow(0 4px 10px rgba(0,0,0,0.35)); z-index:2; transition:transform 0.3s ease-out;" alt="Delivery Partner" />
      </div>
    `,
    iconSize: [58, 58],
    iconAnchor: [29, 29]
  });
}

function create3DDestinationIcon(L) {
  return L.divIcon({
    className: "destination-marker-3d",
    html: `
      <div style="position:relative; width:38px; height:52px; display:flex; flex-direction:column; align-items:center; filter:drop-shadow(0 6px 12px rgba(0,0,0,0.45));">
        <svg width="38" height="52" viewBox="0 0 38 52" fill="none" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="19" cy="48" rx="9" ry="3" fill="rgba(0,0,0,0.3)"/>
          <path d="M19 0C8.5 0 0 8.5 0 19C0 32.5 19 46 19 46C19 46 38 32.5 38 19C38 8.5 29.5 0 19 0Z" fill="#FF5B00"/>
          <circle cx="19" cy="19" r="14.5" fill="#ffffff"/>
          <circle cx="19" cy="19" r="11.5" fill="#FF5B00"/>
          <path d="M19 12L12.5 17.5V24H16.5V20H21.5V24H25.5V17.5L19 12Z" fill="#ffffff"/>
        </svg>
      </div>
    `,
    iconSize: [38, 52],
    iconAnchor: [19, 48]
  });
}

function createHubMarkerIcon(L) {
  return L.divIcon({
    className: "hub-marker-tile",
    html: `
      <div style="position:relative; width:38px; height:38px; display:flex; align-items:center; justify-content:center; filter:drop-shadow(0 4px 10px rgba(0,0,0,0.45));">
        <div style="width:34px; height:34px; border-radius:10px; background:#FF5B00; border:2px solid #ffffff; display:flex; align-items:center; justify-content:center; overflow:hidden; box-shadow:0 2px 6px rgba(0,0,0,0.3);">
          <img src="/brand-tile.png" onerror="this.onerror=null; this.src='/icons/icon-192.png';" style="width:100%; height:100%; object-fit:cover;" alt="DASHit Hub" />
        </div>
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19]
  });
}

export default function MapTracking({
  orderId = null,
  initialLat = 33.748413,
  initialLng = 75.150839,
  customerLat = 33.7385,
  customerLng = 75.1565,
  destinationName = "Your Delivery Location",
  fullScreen = false,
  onTelemetryChange = null
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const riderMarkerRef = useRef(null);
  const hubMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const polylineGlowRef = useRef(null);
  const polylineCoreRef = useRef(null);
  const latestRiderPosRef = useRef(null);

  /* Nothing is shown until it is known: these used to start as a made-up
     rider ("Tariq Ahmad"), 7 minutes and 1.7 km, which the page displayed as
     if they were this order's. */
  const [etaMinutes, setEtaMinutes] = useState(null);
  const [distanceKm, setDistanceKm] = useState(null);
  const [queuePosition, setQueuePosition] = useState(0);
  const [etaStatusLabel, setEtaStatusLabel] = useState("Shortest road route");
  const [riderLocation, setRiderLocation] = useState({ lat: initialLat, lng: initialLng });
  const [riderName, setRiderName] = useState("");
  const [riderStatus, setRiderStatus] = useState("");

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;
    /* Set by the cleanup. The map is built after an async import, and this
       effect re-runs when the order arrives; without the flag the first run
       finished late and built a second map on the same element ("Map container
       is already initialized"), or built one with the old coordinates. */
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || mapInstanceRef.current || !mapContainerRef.current) return;

      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      });

      const startPoint = latestRiderPosRef.current
        ? [latestRiderPosRef.current.lat, latestRiderPosRef.current.lng]
        : [initialLat, initialLng];
      const endPoint = [customerLat, customerLng];
      const hubPoint = [initialLat, initialLng];

      /* The map goes up straight away. It used to wait for the road route
         (a public server that can take its whole 4-second timeout), and the
         tracking screen stayed black until that answered. */
      const map = L.map(mapContainerRef.current, {
        center: [(initialLat + customerLat) / 2, (initialLng + customerLng) / 2],
        zoom: 15,
        zoomControl: false,
        attributionControl: false
      });

      L.tileLayer("https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
        subdomains: ["0", "1", "2", "3"],
        maxZoom: 20,
        attribution: "© Google Maps"
      }).addTo(map);

      // Route: white casing under an orange core. Empty until the route arrives.
      const casingLine = L.polyline([], {
        color: "#ffffff",
        weight: 8,
        opacity: 0.95,
        lineCap: "round",
        lineJoin: "round"
      }).addTo(map);

      const coreLine = L.polyline([], {
        color: "#FF5B00",
        weight: 5,
        opacity: 1,
        lineCap: "round",
        lineJoin: "round"
      }).addTo(map);

      const hubMarker = L.marker(hubPoint, { icon: createHubMarkerIcon(L) }).addTo(map);

      const initialBearing = calculateBearing(startPoint[0], startPoint[1], customerLat, customerLng);
      const riderMarker = L.marker(startPoint, {
        icon: create3DRiderIcon(L, getRiderAssetForHeading(initialBearing))
      }).addTo(map);

      const destMarker = L.marker(endPoint, { icon: create3DDestinationIcon(L) }).addTo(map);

      // Leave room for the order card that covers the bottom of the full-screen map.
      const bounds = L.latLngBounds([startPoint, endPoint, hubPoint]);
      const paddingConfig = fullScreen
        ? { paddingBottomRight: [30, 260], paddingTopLeft: [40, 40], maxZoom: 16 }
        : { padding: [35, 35] };
      map.fitBounds(bounds, paddingConfig);

      mapInstanceRef.current = map;
      riderMarkerRef.current = riderMarker;
      hubMarkerRef.current = hubMarker;
      destinationMarkerRef.current = destMarker;
      polylineGlowRef.current = casingLine;
      polylineCoreRef.current = coreLine;

      setTimeout(() => {
        if (!cancelled && mapInstanceRef.current) mapInstanceRef.current.invalidateSize();
      }, 200);

      fetchRoadRoute(startPoint[0], startPoint[1], customerLat, customerLng)
        .then((roadRoute) => {
          if (cancelled || !roadRoute?.points) return;
          setEtaMinutes((prev) => prev ?? roadRoute.durationMins);
          setDistanceKm((prev) => prev ?? roadRoute.distanceKm);
          // A live rider position may already have drawn a fresher route.
          if (polylineCoreRef.current && polylineCoreRef.current.getLatLngs().length === 0) {
            polylineCoreRef.current.setLatLngs(roadRoute.points);
            polylineGlowRef.current?.setLatLngs(roadRoute.points);
          }
        })
        .catch(() => {});
    }).catch((e) => {
      console.warn("Map failed to load:", e?.message);
    });

    // Realtime Firestore listeners for driver location and order status
    let animationFrameId;

    const unsubTracking = watchOrderTracking(orderId, (data) => {
      if (!data || cancelled) return;
      const newLat = data.latitude || data.lat;
      const newLng = data.longitude || data.lng;
      if (!newLat || !newLng) return;

      latestRiderPosRef.current = { lat: newLat, lng: newLng };
      setRiderLocation({ lat: newLat, lng: newLng });
      if (data.driverName) setRiderName(data.driverName);
      if (data.status) setRiderStatus(data.status);
      else setRiderStatus("Approaching your neighborhood");

      if (data.queuePosition !== undefined) {
        setQueuePosition(Number(data.queuePosition) || 0);
      }

      /* The rider's device already routed this drop over real roads and shipped
         the answer with the fix, so use it. The local recompute below is only a
         fallback for telemetry written before that existed, and it now uses the
         same OSRM router the polyline does — the ETA and the drawn route used to
         disagree because this one was a straight-line estimate. */
      if (Number(data.etaMinutes) > 0) {
        setEtaMinutes(Number(data.etaMinutes));
        if (data.distanceKm) setDistanceKm(Number(data.distanceKm).toFixed(1));
        if (data.statusText) setEtaStatusLabel(data.statusText);
      } else {
        calculateLiveOrderEta({
          driverCoords: { latitude: newLat, longitude: newLng },
          orderCoords: { lat: customerLat, lng: customerLng },
          queuePosition: Number(data.queuePosition) || 0,
          roadRouteFn: fetchRoadRoute,
        }).then((live) => {
          if (live?.etaMinutes) setEtaMinutes(live.etaMinutes);
          if (live?.distanceKm) setDistanceKm(live.distanceKm);
          if (live?.statusText) setEtaStatusLabel(live.statusText);
        }).catch(() => {});
      }

      // Dynamically update road route polyline from live rider position
      fetchRoadRoute(newLat, newLng, customerLat, customerLng).then((route) => {
        if (!cancelled && route?.points && polylineCoreRef.current && polylineGlowRef.current) {
          polylineCoreRef.current.setLatLngs(route.points);
          polylineGlowRef.current.setLatLngs(route.points);
        }
      }).catch(() => {});

      if (riderMarkerRef.current) {
        const prev = riderMarkerRef.current.getLatLng();
        const startLat = prev.lat;
        const startLng = prev.lng;
        const duration = 3000;
        const startTime = performance.now();

        // Calculate heading bearing and update 3D directional rider sprite
        const hasMoved = Math.hypot(newLat - startLat, newLng - startLng) > 0.00002;
        const bearing = hasMoved ? calculateBearing(startLat, startLng, newLat, newLng) : null;
        const isBraking = Number(data.distanceKm || 1) <= 0.05 || String(data.status || "").toLowerCase().includes("arrived");
        const nextAsset = getRiderAssetForHeading(bearing, hasMoved, isBraking);

        if (mapInstanceRef.current) {
          import("leaflet").then((L) => {
            if (riderMarkerRef.current) {
              riderMarkerRef.current.setIcon(create3DRiderIcon(L, nextAsset));
            }
          });
        }

        if (animationFrameId) cancelAnimationFrame(animationFrameId);

        const animateStep = (currentTime) => {
          const elapsed = currentTime - startTime;
          const progress = Math.min(elapsed / duration, 1);
          const easeOut = 1 - Math.pow(1 - progress, 3);
          const curLat = startLat + (newLat - startLat) * easeOut;
          const curLng = startLng + (newLng - startLng) * easeOut;
          if (riderMarkerRef.current) {
            riderMarkerRef.current.setLatLng([curLat, curLng]);
          }
          if (progress < 1) {
            animationFrameId = requestAnimationFrame(animateStep);
          }
        };

        animationFrameId = requestAnimationFrame(animateStep);
      }
    });

    const unsubOrder = watchOrder(orderId, (ord) => {
      if (!ord || cancelled) return;
      if (ord.driverName) setRiderName(ord.driverName);
    });

    const handleWindowResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };
    window.addEventListener("resize", handleWindowResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", handleWindowResize);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (typeof unsubTracking === "function") unsubTracking();
      if (typeof unsubOrder === "function") unsubOrder();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
      riderMarkerRef.current = null;
      polylineGlowRef.current = null;
      polylineCoreRef.current = null;
    };
  }, [orderId, initialLat, initialLng, customerLat, customerLng, fullScreen]);

  /* What the page around the map shows. Sent from an effect so it always
     carries the current numbers (it used to be sent from inside a listener
     that only ever saw the first render's placeholders). */
  const telemetryCallbackRef = useRef(onTelemetryChange);
  telemetryCallbackRef.current = onTelemetryChange;
  useEffect(() => {
    telemetryCallbackRef.current?.({ etaMinutes, distanceKm, riderName, riderStatus, queuePosition });
  }, [etaMinutes, distanceKm, riderName, riderStatus, queuePosition]);

  const recenterMap = () => {
    if (mapInstanceRef.current) {
      if (fullScreen) {
        const target = riderLocation.lat ? [riderLocation.lat, riderLocation.lng] : [initialLat, initialLng];
        mapInstanceRef.current.setView(target, 16, { animate: true });
        mapInstanceRef.current.panBy([0, 90], { animate: true });
      } else {
        mapInstanceRef.current.setView([riderLocation.lat, riderLocation.lng], 15, { animate: true });
      }
    }
  };

  // -------------------------------------------------------------
  // FULL SCREEN MODE: Edge-to-edge interactive canvas for /track
  // -------------------------------------------------------------
  if (fullScreen) {
    return (
      <div className="w-full h-full relative select-none">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Floating Recenter FAB on top right below header */}
        <button
          type="button"
          onClick={recenterMap}
          className="absolute top-20 right-4 z-10 w-11 h-11 bg-black/75 backdrop-blur-xl border border-white/15 rounded-full text-white shadow-2xl flex items-center justify-center active:scale-90 transition-transform cursor-pointer"
          title="Recenter Map"
          aria-label="Recenter Map"
        >
          <Navigation className="w-5 h-5 text-[#FF5B00] fill-[#FF5B00]/25" />
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-3xl p-3.5 shadow-sm space-y-3 dark:bg-surface-raised dark:border-line/90">
      {/* Multi-Drop Queue Status Notice if customer is not stop #1 */}
      {queuePosition > 0 && (
        <div className="px-3.5 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5 text-xs text-amber-800">
          <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
          <span className="font-semibold leading-snug">
            {queuePosition === 1
              ? `${riderName || "Your rider"} is completing a nearby delivery before yours.`
              : `${riderName || "Your rider"} has ${queuePosition} nearby deliveries ahead of yours.`}
          </span>
        </div>
      )}

      {/* Minimalist Map View Area */}
      <div className="relative w-full h-60 rounded-2xl overflow-hidden border border-slate-100 shadow-inner dark:border-line-soft">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Google Maps Style Navigation ETA Pill */}
        <div className="absolute top-3 left-3 z-10 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md px-3.5 py-1.5 rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.15)] border border-slate-200/80 flex items-center space-x-2 dark:bg-surface-raised/95 dark:border-line/80">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5B00] animate-pulse" />
            <div>
              <span className="text-[11px] font-black text-slate-900 tracking-tight block leading-tight dark:text-content">
                {etaMinutes ? `${etaMinutes} min${distanceKm ? ` (${distanceKm} km)` : ""}` : "Finding the route…"}
              </span>
              <span className="text-[9px] font-semibold text-emerald-700">
                {etaStatusLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Google Maps Floating Recenter FAB */}
        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={recenterMap}
            className="w-9 h-9 bg-white/95 backdrop-blur-md rounded-full shadow-[0_2px_8px_rgba(0,0,0,0.15)] border border-slate-200/80 text-[#FF5B00] hover:text-[#e04f00] active:scale-90 transition-transform flex items-center justify-center dark:bg-surface-raised/95 dark:border-line/80"
            title="Recenter Map"
            aria-label="Recenter Map"
          >
            <Navigation className="w-4 h-4 fill-[#FF5B00]/20 stroke-[2.5]" />
          </button>
        </div>
      </div>

      {/* Courier Details Row matching native Android & iOS */}
      <div className="bg-slate-50 rounded-2xl p-3 flex items-center justify-between border border-slate-100 dark:bg-surface-raised dark:border-line-soft">
        <div className="flex items-center space-x-2.5">
          <div className="w-11 h-11 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center justify-center p-1 shadow-sm overflow-hidden dark:bg-orange-500/15">
            <img src="/rider/rider_180.png" alt="" className="w-full h-full object-contain filter drop-shadow-sm" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-content">{riderName || "Your rider"}</h4>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="text-[10px] font-medium text-slate-500 dark:text-content-muted">{riderStatus || "On the way to you"}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

