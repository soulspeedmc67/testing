import { useState, useRef } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, Search, Crosshair, MapPin, Check, Loader2, X } from "lucide-react";
import { reverseGeocodeCoords, searchPlacesAutocomplete } from "../lib/maps";
import { hapticHeavy, hapticLight } from "../lib/haptics";

const MapWithPin = dynamic(() => import("./MapWithPinInner"), { ssr: false });

const HUB_POS = { lat: 33.7311, lng: 75.1487 }; // Nai Basti, Anantnag

export default function InteractiveMapModal({ isOpen, onClose, onConfirmLocation }) {
  const [selectedPos, setSelectedPos] = useState(HUB_POS);
  const [areaTitle, setAreaTitle] = useState("Kurhama");
  const [addressSubtitle, setAddressSubtitle] = useState("Gulshan Mohalla, Safapore 191131. (Kurhama)");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const mapInstanceRef = useRef(null);

  if (!isOpen) return null;

  const handleSearchChange = async (val) => {
    setSearchQuery(val);
    if (val.trim().length >= 2) {
      setIsSearching(true);
      const res = await searchPlacesAutocomplete(val);
      setSearchResults(res);
      setIsSearching(false);
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectSearchResult = (res) => {
    setSearchResults([]);
    setSearchQuery("");
    if (res.lat && res.lng) {
      const newCoords = { lat: res.lat, lng: res.lng };
      setSelectedPos(newCoords);
      setAreaTitle(res.title);
      setAddressSubtitle(res.subtitle);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.setView([res.lat, res.lng], 16, { animate: true });
      }
    }
  };

  const handleConfirm = () => {
    hapticHeavy();
    onConfirmLocation({
      nickname: areaTitle || "Home",
      address: `${areaTitle}, ${addressSubtitle}`,
      lat: selectedPos.lat,
      lng: selectedPos.lng
    });
    onClose();
  };

  const handleRecenterGPS = () => {
    hapticLight();
    if (!navigator.geolocation) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setIsLocating(false);
        const newCoords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setSelectedPos(newCoords);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([newCoords.lat, newCoords.lng], 16, { animate: true });
        }
        const geocoded = await reverseGeocodeCoords(newCoords.lat, newCoords.lng);
        setAreaTitle(geocoded.area);
        setAddressSubtitle(geocoded.address);
      },
      () => {
        setIsLocating(false);
        setSelectedPos(HUB_POS);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([HUB_POS.lat, HUB_POS.lng], 16, { animate: true });
        }
      },
      { enableHighAccuracy: true }
    );
  };

  return (
    <div className="fixed inset-0 z-[300] bg-white overflow-hidden">
      {/* 1. FULLSCREEN MAP UNDERNEATH (Zero gray corner gaps!) */}
      <div className="absolute inset-0 z-0">
        <MapWithPin
          pos={selectedPos}
          onChangePos={async (newPos) => {
            setSelectedPos(newPos);
            const geocoded = await reverseGeocodeCoords(newPos.lat, newPos.lng);
            setAreaTitle(geocoded.area);
            setAddressSubtitle(geocoded.address);
          }}
          onDragStateChange={(dragging) => setIsDragging(dragging)}
          mapRef={mapInstanceRef}
        />
      </div>

      {/* 2. FIXED CENTER ORANGE PIN */}
      <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-20 flex flex-col items-center">
        <div className="absolute -bottom-2 w-16 h-16 rounded-full bg-sky-400/20 animate-pulse pointer-events-none" />

        <div
          className={`transition-transform duration-200 ease-out flex flex-col items-center ${
            isDragging ? "-translate-y-4 scale-110" : "translate-y-0 scale-100"
          }`}
        >
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#f9532d] to-[#FF5B00] shadow-xl flex items-center justify-center border-2 border-white ring-2 ring-orange-400/30">
            <div className="w-3.5 h-3.5 rounded-full bg-white shadow-xs" />
          </div>
          <div className="w-2 h-2.5 bg-[#f9532d] -mt-1 rotate-45 rounded-xs" />
        </div>

        <div
          className={`w-4 h-2 bg-black/35 rounded-full blur-[1px] transition-all duration-200 mt-0.5 ${
            isDragging ? "scale-75 opacity-30" : "scale-100 opacity-80"
          }`}
        />
      </div>

      {/* 3. CURRENT LOCATION FAB (Bottom-Right corner above bottom sheet) */}
      <div className="absolute bottom-[245px] right-4 z-20">
        <button
          type="button"
          onClick={handleRecenterGPS}
          className="flex items-center space-x-2 bg-white/95 backdrop-blur-md px-4 py-2.5 rounded-full shadow-lg border border-slate-200 text-slate-800 active:scale-95 transition-transform"
        >
          <Crosshair className={`w-4 h-4 text-[#f9532d] ${isLocating ? "animate-spin" : ""}`} />
          <span className="text-xs font-black">Current Location</span>
        </button>
      </div>

      {/* 4. TOP FLOATING SEARCH BAR & SUGGESTIONS */}
      <div className="absolute top-0 left-0 right-0 z-[2000] p-4 pt-[max(14px,env(safe-area-inset-top,14px))] flex items-center space-x-3 pointer-events-none">
        <button
          type="button"
          onClick={onClose}
          className="pointer-events-auto w-11 h-11 rounded-full bg-white shadow-md border border-slate-200/80 flex items-center justify-center text-slate-700 active:scale-90 transition-transform shrink-0"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="pointer-events-auto grow relative">
          <input
            type="text"
            placeholder="Search an area or address"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full bg-white text-slate-900 text-xs font-semibold pl-4 pr-10 py-3 rounded-2xl shadow-md border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-[#FF5B00]"
          />
          {searchQuery ? (
            <button
              onClick={() => {
                setSearchQuery("");
                setSearchResults([]);
              }}
              className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          ) : isSearching ? (
            <Loader2 className="absolute right-3.5 top-3.5 w-4 h-4 stroke-[2.5] text-slate-400 animate-spin pointer-events-none" />
          ) : (
            <Search className="absolute right-3.5 top-3.5 w-4 h-4 stroke-[2.5] text-slate-400 pointer-events-none" />
          )}

          {/* Autocomplete Results Dropdown (Top Z-Index 2500) */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-[2500] divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectSearchResult(item)}
                  className="w-full p-3 text-left hover:bg-slate-50 flex items-start space-x-2.5 active:bg-orange-50/50 transition-colors"
                >
                  <MapPin className="w-4 h-4 text-[#f9532d] shrink-0 mt-0.5" />
                  <div className="overflow-hidden">
                    <span className="font-bold text-xs text-slate-900 block truncate">{item.title}</span>
                    <span className="text-[11px] text-slate-500 truncate block">{item.subtitle}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 5. BOTTOM CONFIRMATION SHEET */}
      <div className="absolute bottom-0 left-0 right-0 z-30 bg-white rounded-t-[28px] p-5 pt-4 space-y-3 shadow-[0_-12px_40px_rgba(0,0,0,0.15)] border-t border-slate-100 pb-[max(18px,env(safe-area-inset-bottom,18px))]">
        <p className="text-[11px] font-bold text-slate-400">
          Place the pin at exact delivery location
        </p>

        {/* Selected Area Title & Address */}
        <div className="flex items-start space-x-2.5 pt-0.5">
          <MapPin className="w-4 h-4 text-[#f9532d] shrink-0 mt-0.5" />
          <div className="min-w-0">
            <h3 className="text-sm font-black text-slate-900 tracking-tight leading-tight truncate">
              {areaTitle}
            </h3>
            <p className="text-[11px] font-medium text-slate-500 line-clamp-2 mt-0.5 leading-snug">
              {addressSubtitle}
            </p>
          </div>
        </div>

        {/* Zoom In Notice Pill matching media_1788424288259.png */}
        <div className="bg-rose-50/70 border border-rose-200/80 rounded-2xl p-3 flex items-center justify-between">
          <p className="text-xs font-bold text-rose-700">
            Zoom in to place the pin at exact delivery location
          </p>
          <div className="w-8 h-8 rounded-full bg-white shadow-xs flex items-center justify-center shrink-0 ml-2">
            <MapPin className="w-4 h-4 text-[#f9532d]" />
          </div>
        </div>

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          className="w-full bg-[#061838] hover:bg-slate-900 text-white py-3.5 rounded-2xl font-black text-xs flex items-center justify-center space-x-1.5 shadow-md active:scale-98 transition-all"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Confirm Location & Proceed</span>
        </button>
      </div>
    </div>
  );
}
