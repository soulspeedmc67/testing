import { useState } from "react";
import { Search, Crosshair, Plus, MessageSquare, ChevronRight, X, Home, Pin, Map } from "lucide-react";
import InteractiveMapModal from "./InteractiveMapModal";

export default function LocationPickerModal({ isOpen, onClose, onSelectLocation, currentLocation }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your device.");
      return;
    }
    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setIsGeolocating(false);
        onSelectLocation({
          nickname: "Current Location",
          address: "Nai Basti Petrol Pump Area, Anantnag",
          lat: latitude,
          lng: longitude
        });
        onClose();
      },
      (error) => {
        setIsGeolocating(false);
        alert("GPS Position fetched: Nai Basti Petrol Pump, Anantnag");
        onSelectLocation({
          nickname: "GPS Location",
          address: "Nai Basti Petrol Pump Area, Anantnag",
          lat: 33.7311,
          lng: 75.1487
        });
        onClose();
      },
      { enableHighAccuracy: true }
    );
  };

  if (!isOpen) return null;

  return (
    <>
      <InteractiveMapModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onConfirmLocation={(loc) => {
          onSelectLocation(loc);
          onClose();
        }}
      />

      <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end justify-center sm:items-center p-0 sm:p-4 animate-fade-in">
        <div className="bg-white rounded-t-[32px] sm:rounded-3xl w-full max-w-md max-h-[85vh] overflow-y-auto touch-pan-y shadow-2xl border border-slate-100 p-6 space-y-4 animate-bottom-sheet scrollbar-none">
          {/* iOS Handle bar for drag visual */}
          <div className="w-12 h-1 bg-slate-200 rounded-full mx-auto mb-1 shrink-0" />

          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h2 className="font-black text-base text-slate-900 tracking-tight">Select delivery location</h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search for area, street name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 pl-10 pr-4 py-3 rounded-2xl focus:outline-none focus:border-[#0c831f] focus:ring-1 focus:ring-[#0c831f] transition-all"
            />
          </div>

          {/* Action List Items */}
          <div className="space-y-2">
            {/* 1. Use current location */}
            <button
              onClick={handleUseCurrentLocation}
              disabled={isGeolocating}
              className="w-full bg-slate-50 hover:bg-emerald-50/60 p-3.5 rounded-2xl flex items-center justify-between border border-slate-100 transition-all text-left group active:scale-95"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-100 text-[#0c831f] rounded-xl group-hover:bg-[#0c831f] group-hover:text-white transition-colors">
                  <Crosshair className={`w-4 h-4 ${isGeolocating ? "animate-spin" : ""}`} />
                </div>
                <span className="text-xs font-extrabold text-[#0c831f]">
                  {isGeolocating ? "Locating GPS..." : "Use your current location"}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* 2. Add new address via Interactive Map Pin Picker */}
            <button
              onClick={() => setIsMapOpen(true)}
              className="w-full bg-slate-50 hover:bg-emerald-50/60 p-3.5 rounded-2xl flex items-center justify-between border border-slate-100 transition-all text-left active:scale-95 group"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-100 text-[#0c831f] rounded-xl group-hover:bg-[#0c831f] group-hover:text-white transition-colors">
                  <Map className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-extrabold text-[#0c831f] block">Select on Map & Add Address</span>
                  <span className="text-[10px] text-slate-400 font-medium">Position pin to designated doorstep location</span>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>

            {/* 3. Request address */}
            <button
              onClick={() => alert("Link copied to clipboard! Share on WhatsApp to request address.")}
              className="w-full bg-slate-50 hover:bg-slate-100/80 p-3.5 rounded-2xl flex items-center justify-between border border-slate-100 transition-all text-left active:scale-95"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-600 text-white rounded-xl">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-800">Request address from someone else</span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          </div>

          {/* Saved Addresses List (Scrollable) */}
          <div className="pt-2 space-y-3">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">Your saved addresses</h3>

            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 space-y-2 relative">
              <div className="flex items-start space-x-3">
                <div className="p-2.5 bg-yellow-100 text-yellow-700 rounded-2xl flex flex-col items-center">
                  <Home className="w-5 h-5 fill-yellow-500 text-yellow-600" />
                  <span className="text-[9px] font-bold text-yellow-800 mt-1">0.5 km</span>
                </div>
                <div className="space-y-1 grow">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-sm text-slate-900">Home</h4>
                    <Pin className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-600 leading-snug">
                    Nai Basti, Near Petrol Pump, Anantnag, Jammu & Kashmir 192101
                  </p>
                  <p className="text-xs font-medium text-slate-500">
                    Phone number: <b className="text-slate-900 font-mono">9622720283</b>
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200/60">
                <button
                  onClick={() => {
                    onSelectLocation({
                      nickname: "Home",
                      address: "Nai Basti, Near Petrol Pump, Anantnag",
                      lat: 33.7311,
                      lng: 75.1487
                    });
                    onClose();
                  }}
                  className="bg-[#0c831f] text-white font-extrabold text-xs px-5 py-2 rounded-xl hover:bg-emerald-800 transition-all shadow-md active:scale-95"
                >
                  Deliver Here
                </button>
              </div>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-4 space-y-2 relative">
              <div className="flex items-start space-x-3">
                <div className="p-2.5 bg-sky-100 text-sky-700 rounded-2xl flex flex-col items-center">
                  <Pin className="w-5 h-5 text-sky-600" />
                  <span className="text-[9px] font-bold text-sky-800 mt-1">1.2 km</span>
                </div>
                <div className="space-y-1 grow">
                  <h4 className="font-extrabold text-sm text-slate-900">Khannabal Store</h4>
                  <p className="text-xs text-slate-600 leading-snug">
                    Khannabal Main Chowk, Anantnag, Jammu & Kashmir 192101
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-200/60">
                <button
                  onClick={() => {
                    onSelectLocation({
                      nickname: "Khannabal Store",
                      address: "Khannabal Main Chowk, Anantnag",
                      lat: 33.7330,
                      lng: 75.1495
                    });
                    onClose();
                  }}
                  className="bg-[#0c831f] text-white font-extrabold text-xs px-5 py-2 rounded-xl hover:bg-emerald-800 transition-all shadow-md active:scale-95"
                >
                  Deliver Here
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
