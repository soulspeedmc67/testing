import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, Search, Crosshair, MapPin, Check, X, MapPinOff } from "lucide-react";

// Dynamically import Leaflet Map to prevent SSR window issues
const MapWithPin = dynamic(() => import("./MapWithPinInner"), { ssr: false });

const DARKSTORE_POS = { lat: 33.7311, lng: 75.1487 }; // Nai Basti Central, Anantnag

function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

export default function InteractiveMapModal({ isOpen, onClose, onConfirmLocation }) {
  const [selectedPos, setSelectedPos] = useState(DARKSTORE_POS);
  const [addressText, setAddressText] = useState("Nai Basti Central, Near Petrol Pump, Anantnag");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const mapInstanceRef = useRef(null);

  if (!isOpen) return null;

  const distanceKm = calculateDistanceKm(
    selectedPos.lat,
    selectedPos.lng,
    DARKSTORE_POS.lat,
    DARKSTORE_POS.lng
  );
  const isServiceable = distanceKm <= 5.0;

  const handleConfirm = () => {
    onConfirmLocation({
      nickname: "HOME",
      address: addressText,
      lat: selectedPos.lat,
      lng: selectedPos.lng
    });
    onClose();
  };

  const handleRecenterGPS = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not available on this device.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsLocating(false);
        const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setSelectedPos(newCoords);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([newCoords.lat, newCoords.lng], 16, { animate: true });
        }
      },
      () => {
        setIsLocating(false);
        setSelectedPos(DARKSTORE_POS);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([DARKSTORE_POS.lat, DARKSTORE_POS.lng], 16, { animate: true });
        }
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="fixed inset-0 z-[65] bg-slate-950/70 backdrop-blur-md flex items-end justify-center sm:items-center p-0 sm:p-4">
      <div className="bg-white rounded-t-[32px] sm:rounded-3xl w-full max-w-md h-[92vh] flex flex-col justify-between overflow-hidden shadow-2xl border border-slate-100 relative">
        {/* Top Header & Search Bar matching Screenshot 2 */}
        <div className="p-4 border-b border-slate-200/80 bg-white/98 backdrop-blur-md z-30 space-y-2.5">
          <div className="flex items-center">
            <button
              type="button"
              onClick={onClose}
              className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-700 active:scale-95 transition-transform"
            >
              <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
            <h1 className="text-sm font-extrabold text-slate-900 mx-auto -translate-x-5">
              Confirm map pin location
            </h1>
          </div>

          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search for area, street name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 pl-10 pr-4 py-2.5 rounded-2xl focus:outline-none focus:border-[#0c831f]"
            />
          </div>
        </div>

        {/* Map View Area */}
        <div className="relative grow w-full bg-slate-100 overflow-hidden">
          <MapWithPin
            pos={selectedPos}
            onChangePos={(newPos) => {
              setSelectedPos(newPos);
            }}
            onDragStateChange={(dragging) => setIsDragging(dragging)}
            mapRef={mapInstanceRef}
          />

          {/* Stationary Center Pin with iOS Physics matching Screenshot 2 */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-20 flex flex-col items-center">
            <div
              className={`transition-transform duration-200 ease-out ${
                isDragging ? "-translate-y-3 scale-110" : "translate-y-0 scale-100"
              }`}
            >
              <div className="w-9 h-9 rounded-full bg-slate-900 border-2 border-white shadow-xl flex items-center justify-center">
                <div className="w-3.5 h-3.5 rounded-full bg-sky-400" />
              </div>
              <div className="w-1 h-3 bg-slate-900 mx-auto rounded-b-full shadow-sm" />
            </div>
            <div
              className={`w-3 h-1.5 bg-black/30 rounded-full transition-all duration-200 ${
                isDragging ? "scale-75 opacity-40" : "scale-100 opacity-80"
              }`}
            />
          </div>

          {/* Floating "Go to current location" Button matching Screenshot 2 */}
          <div className="absolute bottom-5 left-4 right-4 z-20 flex justify-center pointer-events-none">
            <button
              type="button"
              onClick={handleRecenterGPS}
              className="pointer-events-auto bg-white/95 backdrop-blur-md border border-[#0c831f] text-[#0c831f] font-extrabold text-xs px-4 py-2 rounded-full shadow-lg flex items-center space-x-1.5 active:scale-95 transition-all"
            >
              <Crosshair className={`w-3.5 h-3.5 ${isLocating ? "animate-spin" : ""}`} />
              <span>Go to current location</span>
            </button>
          </div>
        </div>

        {/* Bottom Sheet matching Screenshot 2 */}
        <div className="p-5 bg-white border-t border-slate-100 space-y-3 z-30 shadow-[0_-8px_30px_rgba(0,0,0,0.12)]">
          {!isServiceable ? (
            /* "Oops!" NOT AVAILABLE OVERLAY */
            <div className="text-center space-y-2.5">
              <div className="w-16 h-16 mx-auto flex items-center justify-center bg-amber-50 rounded-full border border-amber-200/70">
                <MapPinOff className="w-8 h-8 stroke-[2.5] text-amber-600" />
              </div>
              <div>
                <h3 className="font-black text-base text-slate-900">Oops!</h3>
                <p className="text-xs text-slate-600 font-medium max-w-xs mx-auto mt-0.5 leading-relaxed">
                  Dashit is not available at this location at the moment. Please select a different location within 5 km.
                </p>
              </div>
              <div className="space-y-1.5 pt-1">
                <button
                  type="button"
                  onClick={handleRecenterGPS}
                  className="w-full bg-[#0c831f] hover:bg-emerald-800 text-white font-extrabold text-xs py-3.5 rounded-2xl shadow-md active:scale-95 transition-all"
                >
                  Go to current location
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPos(DARKSTORE_POS);
                    if (mapInstanceRef.current) {
                      mapInstanceRef.current.setView([DARKSTORE_POS.lat, DARKSTORE_POS.lng], 16);
                    }
                  }}
                  className="w-full text-xs font-bold text-[#0c831f] py-1.5 hover:underline"
                >
                  Select location manually
                </button>
              </div>
            </div>
          ) : (
            /* SERVICEABLE CONFIRMATION */
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-[#0c831f] flex items-center justify-center shrink-0 border border-emerald-100">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="grow">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black text-slate-900">Delivering in 8-10 mins</span>
                    <span className="bg-emerald-100 text-emerald-800 text-[9px] font-black px-2 py-0.5 rounded-full">
                      {distanceKm.toFixed(1)} km away
                    </span>
                  </div>
                  <p className="text-xs font-semibold text-slate-700 mt-0.5">{addressText}</p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleConfirm}
                className="w-full bg-[#0c831f] hover:bg-emerald-800 text-white font-extrabold text-xs py-3.5 rounded-2xl shadow-md active:scale-95 transition-all flex items-center justify-center space-x-1.5"
              >
                <Check className="w-4 h-4 stroke-[3]" />
                <span>Confirm & Deliver Here</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
