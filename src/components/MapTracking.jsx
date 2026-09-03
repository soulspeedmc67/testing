import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";
import { ShieldCheck, Phone, Navigation, Clock, CheckCircle2, Bike } from "lucide-react";

let socket;

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
  const [distanceKm, setDistanceKm] = useState(2.3);
  const [riderLocation, setRiderLocation] = useState({ lat: initialLat, lng: initialLng });
  const [riderName, setRiderName] = useState("Tariq Ahmad");
  const [riderStatus, setRiderStatus] = useState("On the way on Scooter");

  useEffect(() => {
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    import("leaflet").then((L) => {
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      });

      if (!mapInstanceRef.current && mapContainerRef.current) {
        // Calculate intermediate curved route points between rider and customer
        const startPoint = [initialLat, initialLng];
        const endPoint = [customerLat, customerLng];

        // Realistic curved waypoints along Anantnag roads within 5km radius
        const midLat1 = initialLat + (customerLat - initialLat) * 0.35 + 0.0012;
        const midLng1 = initialLng + (customerLng - initialLng) * 0.28 - 0.0008;

        const midLat2 = initialLat + (customerLat - initialLat) * 0.72 - 0.0006;
        const midLng2 = initialLng + (customerLng - initialLng) * 0.78 + 0.0010;

        const routePoints = [
          startPoint,
          [midLat1, midLng1],
          [midLat2, midLng2],
          endPoint
        ];

        // Initialize fancy light map
        const map = L.map(mapContainerRef.current, {
          center: [(initialLat + customerLat) / 2, (initialLng + customerLng) / 2],
          zoom: 15,
          zoomControl: false,
          attributionControl: false
        });

        // CartoDB Voyager clean light tiles for modern iOS/Apple Maps look
        L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
          maxZoom: 19,
          subdomains: "abcd",
          attribution: "© CartoDB"
        }).addTo(map);

        // Clean, minimalist route line
        const coreLine = L.polyline(routePoints, {
          color: "#0c831f",
          weight: 4,
          opacity: 0.9,
          lineCap: "round",
          lineJoin: "round"
        }).addTo(map);

        // Minimalist Scooter Rider Marker (Clean SVG)
        const riderIcon = L.divIcon({
          className: "rider-marker",
          html: `
            <div style="width:36px; height:36px; background:#0c831f; border:2px solid #ffffff; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 8px rgba(0,0,0,0.15);">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
            </div>
          `,
          iconSize: [36, 36],
          iconAnchor: [18, 18]
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

    // Socket.io for live updates
    socket = io();
    socket.emit("join_order_room", orderId);

    let animationFrameId;

    socket.on("driver_location_changed", (data) => {
      const newLat = data.latitude;
      const newLng = data.longitude;
      setRiderLocation({ lat: newLat, lng: newLng });
      if (data.driverName) setRiderName(data.driverName);
      setRiderStatus("Approaching your neighborhood");

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

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (socket) socket.disconnect();
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
            <span className="w-2 h-2 rounded-full bg-[#0c831f]" />
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
            <Navigation className="w-4 h-4 text-[#0c831f]" />
          </button>
        </div>
      </div>

      {/* Clean Courier Details Row */}
      <div className="bg-slate-50 rounded-2xl p-3 flex items-center justify-between border border-slate-100">
        <div className="flex items-center space-x-2.5">
          <div className="w-10 h-10 bg-emerald-100 text-[#0c831f] rounded-2xl flex items-center justify-center font-black text-base shadow-sm">
            <Bike className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h4 className="font-extrabold text-xs text-slate-900">{riderName}</h4>
              <ShieldCheck className="w-3.5 h-3.5 text-[#0c831f]" />
            </div>
            <p className="text-[10px] font-medium text-slate-500">{riderStatus}</p>
          </div>
        </div>

        <a
          href="tel:9622720283"
          className="p-2.5 bg-white hover:bg-emerald-50 text-[#0c831f] rounded-xl border border-slate-200 shadow-sm transition-all active:scale-90 flex items-center space-x-1.5 text-xs font-bold"
        >
          <Phone className="w-3.5 h-3.5" />
          <span className="text-[11px]">Call</span>
        </a>
      </div>
    </div>
  );
}

