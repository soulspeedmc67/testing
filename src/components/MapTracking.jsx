import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import { ShieldCheck, Phone, Navigation, Clock, CheckCircle2, Bike, Layers } from "lucide-react";
import { fetchRoadRoute } from "../lib/maps";
import { calculateLiveOrderEta } from "../lib/deliveryEta";
import { watchOrder, watchOrderTracking } from "../lib/db";
import { calculateBearing, getRiderAssetForHeading, RIDER_ASSETS } from "../lib/riderAssets";

// 3D Rider & Marker builders for Leaflet
function create3DRiderIcon(L, assetUrl = RIDER_ASSETS.states.liveMap) {
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
      <div style="position:relative; width:44px; height:52px; display:flex; flex-direction:column; align-items:center; filter:drop-shadow(0 6px 14px rgba(255,91,0,0.45));">
        <img src="${RIDER_ASSETS.pins.front}" style="width:44px; height:52px; object-fit:contain;" alt="Delivery Location" />
      </div>
    `,
    iconSize: [44, 52],
    iconAnchor: [22, 50]
  });
}

export default function MapTracking({
  orderId = "DASH-98214",
  initialLat = 33.735832,
  initialLng = 75.143614,
  customerLat = 33.7385,
  customerLng = 75.1565,
  destinationName = "Your Delivery Location"
}) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const riderMarkerRef = useRef(null);
  const destinationMarkerRef = useRef(null);
  const polylineGlowRef = useRef(null);
  const polylineCoreRef = useRef(null);
  const latestRiderPosRef = useRef(null);

  // Delivery radius is 5 km; the ETA is computed dynamically from real-time driver coordinates
  const [etaMinutes, setEtaMinutes] = useState(7);
  const [distanceKm, setDistanceKm] = useState(1.7);
  const [queuePosition, setQueuePosition] = useState(0);
  const [etaStatusLabel, setEtaStatusLabel] = useState("Shortest road route");
  const [riderLocation, setRiderLocation] = useState({ lat: initialLat, lng: initialLng });
  const [riderName, setRiderName] = useState("Tariq Ahmad");
  const [riderStatus, setRiderStatus] = useState("On the way on Scooter");

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    import("leaflet").then(async (L) => {
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      });

      if (!mapInstanceRef.current && mapContainerRef.current) {
        const startPoint = latestRiderPosRef.current
          ? [latestRiderPosRef.current.lat, latestRiderPosRef.current.lng]
          : [initialLat, initialLng];
        const endPoint = [customerLat, customerLng];

        // Query real turn-by-turn shortest road coordinates across Anantnag
        const roadRoute = await fetchRoadRoute(initialLat, initialLng, customerLat, customerLng);
        setEtaMinutes(roadRoute.durationMins);
        setDistanceKm(roadRoute.distanceKm);

        // Initialize Google Maps styled map container
        const map = L.map(mapContainerRef.current, {
          center: [(initialLat + customerLat) / 2, (initialLng + customerLng) / 2],
          zoom: 15,
          zoomControl: false,
          attributionControl: false
        });

        // Official Google Maps Vector Road Tiles
        L.tileLayer("https://mt{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}", {
          subdomains: ["0", "1", "2", "3"],
          maxZoom: 20,
          attribution: "© Google Maps"
        }).addTo(map);

        // DASHit Turn-by-Turn Road Route: crisp white casing + vibrant orange navigation core
        const casingLine = L.polyline(roadRoute.points, {
          color: "#ffffff",
          weight: 8,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round"
        }).addTo(map);

        const coreLine = L.polyline(roadRoute.points, {
          color: "#FF5B00",
          weight: 5,
          opacity: 1,
          lineCap: "round",
          lineJoin: "round"
        }).addTo(map);

        try {
          map.fitBounds(coreLine.getBounds(), { padding: [45, 45], maxZoom: 16 });
        } catch (e) {}

        // 3D Delivery Rider Scooter Marker
        const riderIcon = create3DRiderIcon(L, RIDER_ASSETS.states.liveMap);
        const riderMarker = L.marker(startPoint, { icon: riderIcon }).addTo(map);

        // 3D Destination Location Pin
        const customerIcon = create3DDestinationIcon(L);
        const destMarker = L.marker(endPoint, { icon: customerIcon }).addTo(map);

        // Fit map bounds neatly to encompass route with padding
        const bounds = L.latLngBounds([startPoint, endPoint]);
        map.fitBounds(bounds, { padding: [35, 35] });

        mapInstanceRef.current = map;
        riderMarkerRef.current = riderMarker;
        destinationMarkerRef.current = destMarker;
        polylineGlowRef.current = casingLine;
        polylineCoreRef.current = coreLine;
      }
    });

    // Realtime Firestore listeners for driver location and order status
    let animationFrameId;

    const unsubTracking = watchOrderTracking(orderId, (data) => {
      if (!data) return;
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
        if (route?.points && polylineCoreRef.current && polylineGlowRef.current) {
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
      if (!ord) return;
      if (ord.driverName) setRiderName(ord.driverName);
      if (ord.status) setRiderStatus(ord.status);
    });

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (typeof unsubTracking === "function") unsubTracking();
      if (typeof unsubOrder === "function") unsubOrder();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [orderId, initialLat, initialLng, customerLat, customerLng]);

  const recenterMap = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([riderLocation.lat, riderLocation.lng], 15, { animate: true });
    }
  };

  return (
    <div className="w-full bg-white border border-slate-200/90 rounded-3xl p-3.5 shadow-sm space-y-3 dark:bg-surface-raised dark:border-line/90">
      {/* Multi-Drop Queue Status Notice if customer is not stop #1 */}
      {queuePosition > 0 && (
        <div className="px-3.5 py-2.5 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-2.5 text-xs text-amber-800">
          <Clock className="w-4 h-4 text-amber-600 shrink-0 animate-pulse" />
          <span className="font-semibold leading-snug">
            {queuePosition === 1
              ? "Rider Tariq is completing a nearby delivery before yours."
              : `Rider Tariq has ${queuePosition} nearby deliveries ahead of yours.`}
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
                {etaMinutes} min ({distanceKm} km)
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

      {/* Clean Courier Details Row with 3D Rider Avatar */}
      <div className="bg-slate-50 rounded-2xl p-3 flex items-center justify-between border border-slate-100 dark:bg-surface-raised dark:border-line-soft">
        <div className="flex items-center space-x-2.5">
          <div className="w-11 h-11 bg-orange-500/10 border border-orange-500/20 rounded-2xl flex items-center justify-center p-1 shadow-sm overflow-hidden dark:bg-orange-500/15">
            <img src={RIDER_ASSETS.directions.south} alt={riderName} className="w-full h-full object-contain filter drop-shadow-sm" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h4 className="font-extrabold text-xs text-slate-900 dark:text-content">{riderName}</h4>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="text-[10px] font-medium text-slate-500 dark:text-content-muted">{riderStatus}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => alert("Calling delivery partner...")}
          className="p-2.5 bg-white hover:bg-orange-50 text-[#FF5B00] rounded-xl border border-slate-200 shadow-sm transition-all active:scale-90 flex items-center space-x-1.5 text-xs font-bold cursor-pointer dark:bg-surface-raised dark:border-line"
        >
          <Phone className="w-3.5 h-3.5" />
          <span className="text-[11px]">Call</span>
        </button>
      </div>
    </div>
  );
}

