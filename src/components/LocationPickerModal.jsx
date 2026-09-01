import { useState, useEffect, useRef } from "react";
import { MapPin, Navigation, Check, X, Search, Crosshair } from "lucide-react";

export default function LocationPickerModal({ isOpen, onClose, onSelectLocation, currentLocation }) {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerInstanceRef = useRef(null);

  const [selectedCoords, setSelectedCoords] = useState({
    lat: currentLocation?.lat || 33.7311,
    lng: currentLocation?.lng || 75.1487
  });
  const [addressInput, setAddressInput] = useState(currentLocation?.address || "Nai Basti, Near Petrol Pump, Anantnag");
  const [nickname, setNickname] = useState("Home");
  const [isGeolocating, setIsGeolocating] = useState(false);

  useEffect(() => {
    if (!isOpen || typeof window === "undefined" || !mapContainerRef.current) return;

    import("leaflet").then((L) => {
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      });

      if (!mapInstanceRef.current && mapContainerRef.current) {
        const map = L.map(mapContainerRef.current, {
          center: [selectedCoords.lat, selectedCoords.lng],
          zoom: 16,
          zoomControl: false,
          attributionControl: false
        });

        L.tileLayer("https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", {
          maxZoom: 19,
          subdomains: "abcd"
        }).addTo(map);

        const pinIcon = L.divIcon({
          className: "custom-delivery-pin",
          html: `<div style="background:#f97316; border:3px solid #ffffff; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 6px 16px rgba(249,115,22,0.5); color:white;">📍</div>`,
          iconSize: [34, 34],
          iconAnchor: [17, 34]
        });

        const marker = L.marker([selectedCoords.lat, selectedCoords.lng], { icon: pinIcon, draggable: true }).addTo(map);

        marker.on("dragend", () => {
          const pos = marker.getLatLng();
          setSelectedCoords({ lat: pos.lat, lng: pos.lng });
          setAddressInput(`Pin at ${pos.lat.toFixed(4)}°N, ${pos.lng.toFixed(4)}°E (Anantnag)`);
        });

        map.on("click", (e) => {
          const { lat, lng } = e.latlng;
          marker.setLatLng([lat, lng]);
          setSelectedCoords({ lat, lng });
          setAddressInput(`Pin at ${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E (Anantnag)`);
        });

        mapInstanceRef.current = map;
        markerInstanceRef.current = marker;
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [isOpen]);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setSelectedCoords({ lat: latitude, lng: longitude });
        setAddressInput("Current Device GPS Location (Anantnag)");
        setIsGeolocating(false);

        if (mapInstanceRef.current && markerInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 17);
          markerInstanceRef.current.setLatLng([latitude, longitude]);
        }
      },
      (error) => {
        setIsGeolocating(false);
        alert("Unable to fetch your current GPS position. Please pick a location manually on the map.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSave = () => {
    onSelectLocation({
      nickname,
      address: addressInput,
      lat: selectedCoords.lat,
      lng: selectedCoords.lng
    });
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-zinc-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-zinc-900 border border-zinc-800/90 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl space-y-0">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800">
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-orange-500" />
            <h3 className="font-bold text-sm text-zinc-100">Select Delivery Location</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Use Current GPS Location Button */}
        <div className="p-3 bg-zinc-900/60 border-b border-zinc-800/60">
          <button
            onClick={handleUseCurrentLocation}
            disabled={isGeolocating}
            className="w-full bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-xl py-2.5 px-3 flex items-center justify-center space-x-2 text-xs font-bold transition-all"
          >
            <Crosshair className={`w-4 h-4 ${isGeolocating ? "animate-spin" : ""}`} />
            <span>{isGeolocating ? "Detecting GPS Position..." : "Use My Current GPS Location"}</span>
          </button>
        </div>

        {/* Interactive OpenStreetMap Pin Picker */}
        <div className="relative w-full h-56 bg-zinc-950">
          <div ref={mapContainerRef} className="w-full h-full z-0" />
          <div className="absolute top-2 right-2 bg-zinc-900/90 backdrop-blur text-[10px] text-zinc-300 px-2 py-1 rounded border border-zinc-700/60 shadow z-10">
            Tap map or drag pin to adjust location
          </div>
        </div>

        {/* Address & Nickname Form */}
        <div className="p-4 space-y-3">
          <div>
            <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Detailed Delivery Address</label>
            <input
              type="text"
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
              placeholder="House/Flat No, Landmark, Road..."
              className="w-full bg-zinc-950 border border-zinc-800 text-xs px-3 py-2 rounded-xl text-zinc-100 focus:outline-none focus:border-orange-500/50"
            />
          </div>

          <div>
            <label className="text-[11px] font-semibold text-zinc-400 block mb-1">Save Address As</label>
            <div className="flex space-x-2">
              {["Home", "Work", "Gym", "Other"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setNickname(tag)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    nickname === tag
                      ? "bg-orange-500 text-zinc-950 font-bold"
                      : "bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200"
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            className="w-full bg-orange-500 hover:bg-orange-400 text-zinc-950 font-bold text-xs py-3 rounded-xl shadow-lg transition-colors flex items-center justify-center space-x-1.5 mt-2"
          >
            <Check className="w-4 h-4" />
            <span>Confirm Delivery Location</span>
          </button>
        </div>
      </div>
    </div>
  );
}
