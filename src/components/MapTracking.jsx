import { useEffect, useRef, useState } from "react";
import { ShieldCheck, Phone, Navigation, Clock, CheckCircle2, Bike } from "lucide-react";
import { fetchRoadRoute } from "../lib/maps";
import { watchOrder, watchOrderTracking } from "../lib/db";

export default function MapTracking({
  orderId = "DASH-98214",
  initialLat = 33.7311,
  initialLng = 75.1487,
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

  // Delivery radius guaranteed within 5km, ETA strictly under 10 mins (e.g. 7 mins)
  const [etaMinutes, setEtaMinutes] = useState(7);
  const [distanceKm, setDistanceKm] = useState(1.7);
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
        // Query real turn-by-turn road coordinates across Anantnag
        const roadRoute = await fetchRoadRoute(initialLat, initialLng, customerLat, customerLng);
        setEtaMinutes(roadRoute.durationMins);
        setDistanceKm(roadRoute.distanceKm);

        // Initialize fancy light map
        const map = L.map(mapContainerRef.current, {
          center: [(initialLat + customerLat) / 2, (initialLng + customerLng) / 2],
          zoom: 15,
          zoomControl: false,
          attributionControl: false
        });

        // Clean OpenStreetMap tiles
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "© OpenStreetMap"
        }).addTo(map);

        // Accurate road-hugging polyline
        const coreLine = L.polyline(roadRoute.points, {
          color: "#FF5B00",
          weight: 4.5,
          opacity: 0.95,
          lineCap: "round",
          lineJoin: "round"
        }).addTo(map);

        try {
          map.fitBounds(coreLine.getBounds(), { padding: [45, 45], maxZoom: 16 });
        } catch (e) {}

        // Minimalist Dashit Rider Marker
        const riderIcon = L.divIcon({
          className: "rider-marker",
          html: `
            <div style="width:38px; height:38px; background:#ffffff; border:2.5px solid #FF5B00; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 6px 18px rgba(6,24,56,0.35); overflow:hidden; padding:5px;">
              <img src="/dashit-mark.png" style="width:100%; height:100%; object-fit:contain;" alt="Dashit" />
            </div>
          `,
          iconSize: [38, 38],
          iconAnchor: [19, 19]
        });

        const riderMarker = L.marker(startPoint, { icon: riderIcon }).addTo(map);

        // Minimalist Customer Destination Marker (Clean SVG)
        const customerIcon = L.divIcon({
          className: "destination-marker",
          html: `
            <div style="width:32px; height:32px; background:#f59e0b; border:2px solid #ffffff; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 8px rgba(0,0,0,0.15);">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff" stroke="#ffffff" stroke-width="2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3" fill="#f59e0b"/></svg>
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16]
        });

        const destMarker = L.marker(endPoint, { icon: customerIcon }).addTo(map);

        // Fit map bounds neatly to encompass route with padding
        const bounds = L.latLngBounds([startPoint, endPoint]);
        map.fitBounds(bounds, { padding: [35, 35] });

        mapInstanceRef.current = map;
        riderMarkerRef.current = riderMarker;
        destinationMarkerRef.current = destMarker;
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

      setRiderLocation({ lat: newLat, lng: newLng });
      if (data.driverName) setRiderName(data.driverName);
      if (data.status) setRiderStatus(data.status);
      else setRiderStatus("Approaching your neighborhood");

      if (riderMarkerRef.current) {
        const prev = riderMarkerRef.current.getLatLng();
        const startLat = prev.lat;
        const startLng = prev.lng;
        const duration = 2500;
        const startTime = performance.now();

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
    <div className="w-full bg-white border border-slate-200/90 rounded-3xl p-3.5 shadow-sm space-y-3">
      {/* Minimalist Map View Area */}
      <div className="relative w-full h-60 rounded-2xl overflow-hidden border border-slate-100 shadow-inner">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Minimalist ETA Pill */}
        <div className="absolute top-3 left-3 z-10 pointer-events-none">
          <div className="bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-sm border border-slate-200/90 flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-[#FF5B00]" />
            <div>
              <span className="text-[11px] font-extrabold text-slate-900 tracking-tight block">
                Arriving in {etaMinutes} mins
              </span>
              <span className="text-[9px] font-semibold text-slate-500">
                {distanceKm} km · 5 km radius
              </span>
            </div>
          </div>
        </div>

        {/* Floating Recenter Button */}
        <div className="absolute top-3 right-3 z-10">
          <button
            onClick={recenterMap}
            className="p-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200/90 text-slate-700 hover:text-slate-950 active:scale-90 transition-transform"
            title="Recenter Map"
          >
            <Navigation className="w-4 h-4 text-[#FF5B00]" />
          </button>
        </div>
      </div>

      {/* Clean Courier Details Row */}
      <div className="bg-slate-50 rounded-2xl p-3 flex items-center justify-between border border-slate-100">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 bg-orange-100 text-[#FF5B00] rounded-2xl flex items-center justify-center font-black text-base shadow-sm">
            <Bike className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h4 className="font-extrabold text-xs text-slate-900">{riderName}</h4>
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="text-[10px] font-medium text-slate-500">{riderStatus}</p>
          </div>
        </div>

        <a
          href="tel:9622720283"
          className="p-2.5 bg-white hover:bg-orange-50 text-[#FF5B00] rounded-xl border border-slate-200 shadow-sm transition-all active:scale-90 flex items-center space-x-1.5 text-xs font-bold"
        >
          <Phone className="w-3.5 h-3.5" />
          <span className="text-[11px]">Call</span>
        </a>
      </div>
    </div>
  );
}

