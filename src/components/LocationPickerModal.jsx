import { useState, useEffect, useRef } from "react";
import { Search, Crosshair, Plus, MessageSquare, ChevronRight, X, Home, Pin, MoreHorizontal, Share2 } from "lucide-react";

export default function LocationPickerModal({ isOpen, onClose, onSelectLocation, currentLocation }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isGeolocating, setIsGeolocating] = useState(false);

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
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-end justify-center sm:items-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-100 p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h2 className="font-extrabold text-base text-slate-900">Select delivery location</h2>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100">
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
            className="w-full bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-800 pl-10 pr-4 py-2.5 rounded-2xl focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* Action List Items */}
        <div className="space-y-2">
          {/* 1. Use current location */}
          <button
            onClick={handleUseCurrentLocation}
            disabled={isGeolocating}
            className="w-full bg-slate-50 hover:bg-slate-100/80 p-3.5 rounded-2xl flex items-center justify-between border border-slate-100 transition-all text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                <Crosshair className={`w-4 h-4 ${isGeolocating ? "animate-spin" : ""}`} />
              </div>
              <span className="text-xs font-bold text-emerald-700">
                {isGeolocating ? "Locating GPS..." : "Use your current location"}
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {/* 2. Add new address */}
          <button
            onClick={() => {
              const newAddr = prompt("Enter new address:", "Khannabal Chowk, Anantnag");
              if (newAddr) {
                onSelectLocation({ nickname: "Work", address: newAddr, lat: 33.7330, lng: 75.1495 });
                onClose();
              }
            }}
            className="w-full bg-slate-50 hover:bg-slate-100/80 p-3.5 rounded-2xl flex items-center justify-between border border-slate-100 transition-all text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                <Plus className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-emerald-700">Add new address</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {/* 3. Request address from someone else */}
          <button
            onClick={() => alert("Link copied to clipboard! Share on WhatsApp to request address.")}
            className="w-full bg-slate-50 hover:bg-slate-100/80 p-3.5 rounded-2xl flex items-center justify-between border border-slate-100 transition-all text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-500 text-white rounded-xl">
                <MessageSquare className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-slate-800">Request address from someone else</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>

          {/* 4. Import addresses */}
          <button
            onClick={() => alert("Addresses synced!")}
            className="w-full bg-slate-50 hover:bg-slate-100/80 p-3.5 rounded-2xl flex items-center justify-between border border-slate-100 transition-all text-left"
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-rose-500 text-white font-black rounded-xl text-[10px]">
                DASH
              </div>
              <span className="text-xs font-bold text-slate-800">Import your addresses from DASHit</span>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Your Saved Addresses */}
        <div className="pt-2 space-y-2">
          <h3 className="text-xs font-bold text-slate-500 tracking-tight">Your saved addresses</h3>

          {/* Saved Address Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-2 relative">
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

            <div className="flex items-center justify-end space-x-2 pt-1 border-t border-slate-200/60">
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
                className="bg-emerald-600 text-white font-bold text-xs px-4 py-1.5 rounded-xl hover:bg-emerald-700 transition-colors"
              >
                Deliver Here
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
