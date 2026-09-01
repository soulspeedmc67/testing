import { useEffect, useRef, useState } from "react";
import io from "socket.io-client";

let socket;

export default function MapTracking({ orderId = "DASH-98214", initialLat = 33.7311, initialLng = 75.1487 }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);

  const [location, setLocation] = useState({ latitude: initialLat, longitude: initialLng });
  const [driverName, setDriverName] = useState("Tariq Scooter Rider (Nai Basti Hub)");
  const [status, setStatus] = useState("Live Driver GPS Active");

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined" || !mapContainerRef.current) return;

    // Dynamically import Leaflet to prevent SSR window errors
    import("leaflet").then((L) => {
      // Fix default Leaflet icon paths
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      });

      // Initialize map instance if not created
      if (!mapInstanceRef.current && mapContainerRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [initialLat, initialLng],
          zoom: 15,
          zoomControl: true,
          attributionControl: false
        });

        // Add OpenStreetMap Dark/Standard Tile Layer
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "© OpenStreetMap"
        }).addTo(map);

        // Add Scooter Rider Marker
        const scooterIcon = L.divIcon({
          className: "custom-leaflet-scooter-marker",
          html: `<div style="background:#f97316; border:2px solid #ffffff; width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 12px rgba(249,115,22,0.6); font-size:18px;">🛵</div>`,
          iconSize: [36, 36],
          iconAnchor: [18, 18]
        });

        const marker = L.marker([initialLat, initialLng], { icon: scooterIcon }).addTo(map);
        marker.bindPopup(`<b>${driverName}</b><br/>Order: ${orderId}`).openPopup();

        mapInstanceRef.current = map;
        markerInstanceRef.current = marker;
      }
    });

    // Socket.io connection for real-time driver tracking
    socket = io();
    socket.emit("join_order_room", orderId);

    socket.on("driver_location_changed", (data) => {
      console.log("Real-time location received:", data);
      const newLat = data.latitude;
      const newLng = data.longitude;

      setLocation({ latitude: newLat, longitude: newLng });
      if (data.driverName) setDriverName(data.driverName);
      setStatus("Driver is moving towards destination");

      if (mapInstanceRef.current && markerInstanceRef.current) {
        markerInstanceRef.current.setLatLng([newLat, newLng]);
        mapInstanceRef.current.panTo([newLat, newLng]);
      }
    });

    return () => {
      if (socket) socket.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [orderId, initialLat, initialLng]);

  return (
    <div className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-3 shadow-lg space-y-2">
      {/* Header Info */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center space-x-2">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-orange-500"></span>
          </span>
          <span className="text-xs font-semibold text-zinc-200">{driverName}</span>
        </div>
        <span className="text-[10px] bg-orange-500/10 text-orange-400 px-2 py-0.5 rounded border border-orange-500/30 font-medium">
          {status}
        </span>
      </div>

      {/* Real Interactive OpenStreetMap Container */}
      <div className="relative w-full h-64 rounded-xl overflow-hidden border border-zinc-800">
        <div ref={mapContainerRef} className="w-full h-full z-0" />
      </div>

      <div className="flex items-center justify-between text-[10px] text-zinc-500 px-1 font-mono">
        <span>GPS: {location.latitude.toFixed(4)}° N, {location.longitude.toFixed(4)}° E</span>
        <span>OpenStreetMap • Zero Fee</span>
      </div>
    </div>
  );
}
