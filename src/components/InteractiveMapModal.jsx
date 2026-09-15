import { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { ArrowLeft, Search, Crosshair, MapPin, Check, Loader2, X, AlertTriangle, ShieldCheck, Home, Briefcase, Users, Building2 } from "lucide-react";
import { reverseGeocodeCoords, searchPlacesAutocomplete } from "../lib/maps";
import { hapticHeavy, hapticLight } from "../lib/haptics";
import { calculateDeliveryEta, MAX_DELIVERY_RADIUS_KM } from "../lib/deliveryEta";

const MapWithPin = dynamic(() => import("./MapWithPinInner"), { ssr: false });

const HUB_POS = { lat: 33.735832, lng: 75.143614 }; // Lal Chowk hub, Anantnag (https://maps.app.goo.gl/kKouW9fsgyGBJezT7)

const POPULAR_AREAS = [
  { name: "Lal Chowk", lat: 33.735832, lng: 75.143614 },
  { name: "Nai Basti", lat: 33.7311, lng: 75.1487 },
  { name: "KP Road", lat: 33.7290, lng: 75.1550 },
  { name: "Khanabal", lat: 33.7440, lng: 75.1320 },
  { name: "Janglat Mandi", lat: 33.7265, lng: 75.1585 },
  { name: "Mattan", lat: 33.7660, lng: 75.2080 },
  { name: "Dialgam", lat: 33.7120, lng: 75.1750 },
];

const ALIAS_PRESETS = [
  { id: "Home", label: "Home", icon: Home },
  { id: "Work", label: "Work", icon: Briefcase },
  { id: "Parents", label: "Parents", icon: Users },
  { id: "Shop", label: "Shop", icon: Building2 },
  { id: "Other", label: "Other", icon: MapPin },
];

export default function InteractiveMapModal({ isOpen, onClose, onConfirmLocation }) {
  const [selectedPos, setSelectedPos] = useState(HUB_POS);
  /* Empty until a real lookup answers. These were seeded with the dark store's
     own address, so an unfinished or failed geocode left the customer looking at
     "Lal Chowk" as though that were their pin. */
  const [areaTitle, setAreaTitle] = useState("");
  const [addressSubtitle, setAddressSubtitle] = useState("");
  const [selectedAlias, setSelectedAlias] = useState("Home");
  const [customAlias, setCustomAlias] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const mapInstanceRef = useRef(null);
  const searchDebounceRef = useRef(null);
  const dragGeocodeDebounceRef = useRef(null);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
      if (dragGeocodeDebounceRef.current) clearTimeout(dragGeocodeDebounceRef.current);
    };
  }, []);

  // Initialize with currently saved address on open
  useEffect(() => {
    if (!isOpen) return;
    try {
      const saved = localStorage.getItem("dashit_user_address");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lat && parsed.lng) {
          const lat = Number(parsed.lat);
          const lng = Number(parsed.lng);
          setSelectedPos({ lat, lng });
          setAreaTitle(parsed.area || parsed.nickname || "Home");
          setAddressSubtitle(parsed.address || "Anantnag, Jammu & Kashmir");
          if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([lat, lng], 16);
            mapInstanceRef.current.invalidateSize();
          }
        }
      }
    } catch (e) {}
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);

    if (val.trim().length >= 2) {
      setIsSearching(true);
      searchDebounceRef.current = setTimeout(async () => {
        const res = await searchPlacesAutocomplete(val);
        setSearchResults(res);
        setIsSearching(false);
      }, 350);
    } else {
      setSearchResults([]);
      setIsSearching(false);
    }
  };

  const handleMapPosChange = (newPos) => {
    setSelectedPos(newPos);
    if (dragGeocodeDebounceRef.current) clearTimeout(dragGeocodeDebounceRef.current);
    dragGeocodeDebounceRef.current = setTimeout(async () => {
      const geocoded = await reverseGeocodeCoords(newPos.lat, newPos.lng);
      setAreaTitle(geocoded.area);
      setAddressSubtitle(geocoded.address);
    }, 280);
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

  const handleSelectQuickArea = async (area) => {
    hapticLight();
    setSelectedPos({ lat: area.lat, lng: area.lng });
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([area.lat, area.lng], 16, { animate: true });
    }
    const geocoded = await reverseGeocodeCoords(area.lat, area.lng);
    setAreaTitle(geocoded.area || area.name);
    setAddressSubtitle(geocoded.address);
  };

  const handleConfirm = () => {
    hapticHeavy();
    const activeAlias =
      selectedAlias === "Other" && customAlias.trim()
        ? customAlias.trim()
        : selectedAlias || "Home";

    const deliveryData = calculateDeliveryEta(selectedPos, HUB_POS);

    const locObj = {
      id: "addr_" + Date.now(),
      alias: activeAlias,
      nickname: activeAlias,
      area: areaTitle || "Anantnag",
      /* The geocoded address already names the locality. Prefixing areaTitle
         produced "Lal Chowk, Lal Chowk, Anantnag - 192101". */
      address: addressSubtitle || (areaTitle ? `${areaTitle}, Anantnag` : "Anantnag"),
      lat: Number(selectedPos.lat),
      lng: Number(selectedPos.lng),
      city: "Anantnag",
      pincode: "192101",
      distanceKm: deliveryData.distanceKm,
      isDeliverable: deliveryData.isDeliverable,
    };

    try {
      localStorage.setItem("dashit_user_address", JSON.stringify(locObj));
      localStorage.setItem("dashit_selected_location", JSON.stringify(locObj));

      // Save to saved addresses list (up to 10 addresses)
      const savedList = JSON.parse(localStorage.getItem("dashit_saved_addresses") || "[]");
      const filtered = savedList.filter(
        (s) =>
          s.alias !== locObj.alias &&
          Math.hypot((s.lat || 0) - locObj.lat, (s.lng || 0) - locObj.lng) > 0.0005
      );
      const updatedList = [locObj, ...filtered].slice(0, 10);
      localStorage.setItem("dashit_saved_addresses", JSON.stringify(updatedList));

      // Update logged in user profile if exists
      const userStr = localStorage.getItem("dashit_user");
      if (userStr) {
        const u = JSON.parse(userStr);
        u.address = locObj.address;
        u.location = locObj;
        localStorage.setItem("dashit_user", JSON.stringify(u));
      }

      // Update checkout data if active
      const coStr = localStorage.getItem("dashit_checkout_data");
      if (coStr) {
        const co = JSON.parse(coStr);
        co.location = locObj;
        localStorage.setItem("dashit_checkout_data", JSON.stringify(co));
      }

      window.dispatchEvent(new CustomEvent("dashit_address_updated", { detail: locObj }));
      window.dispatchEvent(new Event("storage"));
    } catch (e) {}

    if (onConfirmLocation) {
      onConfirmLocation(locObj);
    }
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
    <div className="fixed inset-0 z-[9999] bg-white overflow-hidden">
      {/* 1. FULLSCREEN MAP UNDERNEATH (Zero gray corner gaps!) */}
      <div className="absolute inset-0 z-0">
        <MapWithPin
          pos={selectedPos}
          onChangePos={handleMapPosChange}
          onDragStateChange={(dragging) => setIsDragging(dragging)}
          mapRef={mapInstanceRef}
        />
      </div>

      {/* 2. FIXED CENTER GOOGLE MAPS STYLE PIN */}
      <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-20 flex flex-col items-center">
        <div className="absolute -bottom-2 w-16 h-16 rounded-full bg-blue-400/20 animate-pulse pointer-events-none" />

        <div
          className={`transition-transform duration-200 ease-out flex flex-col items-center ${
            isDragging ? "-translate-y-4 scale-110" : "translate-y-0 scale-100"
          }`}
        >
          <div className="relative filter drop-shadow-[0_8px_16px_rgba(234,67,53,0.45)]">
            <svg width="36" height="46" viewBox="0 0 24 30" fill="none">
              <path
                d="M12 0C5.37 0 0 5.37 0 12c0 8.5 12 18 12 18s12-9.5 12-18c0-6.63-5.37-12-12-12z"
                fill="#EA4335"
              />
              <circle cx="12" cy="11" r="4.5" fill="#ffffff" />
            </svg>
          </div>
        </div>

        <div
          className={`w-5 h-2 bg-black/35 rounded-full blur-[1.5px] transition-all duration-200 mt-0.5 ${
            isDragging ? "scale-75 opacity-25" : "scale-100 opacity-80"
          }`}
        />
      </div>

      {/* 3. GOOGLE MAPS RECENTER / CURRENT LOCATION FAB */}
      <div className="absolute bottom-[245px] right-4 z-20">
        <button
          type="button"
          onClick={handleRecenterGPS}
          className="w-12 h-12 rounded-full bg-white/95 backdrop-blur-md shadow-[0_4px_12px_rgba(0,0,0,0.18)] border border-slate-200/80 text-[#1A73E8] flex items-center justify-center active:scale-95 transition-transform"
          title="Current Location"
          aria-label="Current Location"
        >
          <Crosshair className={`w-5 h-5 ${isLocating ? "animate-spin text-[#EA4335]" : "text-[#1A73E8]"}`} />
        </button>
      </div>

      {/* 4. TOP FLOATING SEARCH BAR & SUGGESTIONS */}
      <div className="absolute top-0 left-0 right-0 z-[2000] p-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] flex flex-col space-y-2 pointer-events-none">
        <div className="flex items-center space-x-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="pointer-events-auto w-11 h-11 rounded-full bg-white shadow-md border border-slate-200/80 flex items-center justify-center text-slate-700 active:scale-90 transition-transform shrink-0 cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>

          <div className="pointer-events-auto grow relative">
            <input
              type="text"
              placeholder="Search area or address in Anantnag..."
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
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
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
                    className="w-full p-3 text-left hover:bg-slate-50 flex items-start space-x-2.5 active:bg-orange-50/50 transition-colors cursor-pointer"
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

        {/* Quick Anantnag Locality Chips */}
        <div className="pointer-events-auto flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
          {POPULAR_AREAS.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() => handleSelectQuickArea(item)}
              className="shrink-0 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full text-[11px] font-bold text-slate-700 shadow-sm border border-slate-200/80 active:scale-95 hover:bg-orange-50 hover:text-[#FF5B00] hover:border-orange-200 transition-all cursor-pointer flex items-center space-x-1"
            >
              <MapPin className="w-3 h-3 text-[#FF5B00] shrink-0" />
              <span>{item.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 5. BOTTOM CONFIRMATION SHEET */}
      <div className="absolute bottom-0 left-0 right-0 z-30 bg-white rounded-t-[28px] p-5 pt-4 space-y-3 shadow-[0_-12px_40px_rgba(0,0,0,0.15)] border-t border-slate-100 pb-[max(18px,env(safe-area-inset-bottom,18px))]">
        {/* Selected Area Title & Address */}
        <div className="flex items-start space-x-2.5 pt-0.5">
          <MapPin className="w-4 h-4 text-[#FF5B00] shrink-0 mt-0.5" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-black text-slate-900 tracking-tight leading-tight truncate">
              {areaTitle}
            </h3>
            <p className="text-[11px] font-medium text-slate-500 line-clamp-2 mt-0.5 leading-snug">
              {addressSubtitle}
            </p>
          </div>
        </div>

        {/* 5.0 KM STRICT DELIVERY RADIUS BADGE */}
        {(() => {
          const deliveryData = calculateDeliveryEta(selectedPos, HUB_POS);
          if (!deliveryData.isDeliverable) {
            return (
              <div className="border border-slate-200 rounded-xl p-3 flex items-start space-x-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <div className="min-w-0 text-left">
                  <p className="text-[12px] font-semibold leading-snug text-slate-900">
                    Not available in your area yet
                  </p>
                  <p className="text-[11px] text-slate-500 leading-snug mt-0.5">
                    We are expanding across Anantnag and will reach you soon.
                  </p>
                </div>
              </div>
            );
          }

          return (
            <div className="border border-slate-200 rounded-xl px-3 py-2 flex items-center justify-between text-[11px] font-semibold text-slate-600">
              <span className="flex items-center space-x-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Within delivery area</span>
              </span>
              <span className="font-mono text-xs font-semibold text-slate-900">
                ~{deliveryData.etaMinutes} mins ({deliveryData.distanceFormatted})
              </span>
            </div>
          );
        })()}

        {/* ALIAS PICKER CHIPS */}
        <div className="space-y-1.5 pt-0.5">
          <label className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 block">
            Save Address As (Alias)
          </label>
          <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
            {ALIAS_PRESETS.map((preset) => {
              const isSelected = selectedAlias === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setSelectedAlias(preset.id);
                  }}
                  className={`shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 active:scale-95 ${
                    isSelected
                      ? "bg-[#061838] text-white shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/60"
                  }`}
                >
                  {preset.icon && <preset.icon className="w-3.5 h-3.5 shrink-0" />}
                  <span>{preset.label}</span>
                </button>
              );
            })}
          </div>

          {selectedAlias === "Other" && (
            <input
              type="text"
              value={customAlias}
              onChange={(e) => setCustomAlias(e.target.value)}
              placeholder="e.g. Grandma's, Hostel, Studio..."
              maxLength={25}
              className="w-full mt-1.5 px-3 py-2 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:border-[#FF5B00] transition-colors"
            />
          )}
        </div>

        {/* Confirm Button */}
        {(() => {
          const deliveryData = calculateDeliveryEta(selectedPos, HUB_POS);
          const isOutside = !deliveryData.isDeliverable;
          const activeAlias =
            selectedAlias === "Other" && customAlias.trim()
              ? customAlias.trim()
              : selectedAlias || "Home";

          return (
            <button
              onClick={handleConfirm}
              disabled={isOutside}
              className={`w-full py-3.5 rounded-2xl font-black text-xs flex items-center justify-center space-x-1.5 shadow-md active:scale-98 transition-all ${
                isOutside
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-300"
                  : "bg-[#061838] hover:bg-slate-900 text-white"
              }`}
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>
                {isOutside
                  ? `Cannot Deliver Beyond 5 km (${deliveryData.distanceKm} km)`
                  : `Save & Deliver to ${activeAlias}`}
              </span>
            </button>
          );
        })()}
      </div>
    </div>
  );
}
