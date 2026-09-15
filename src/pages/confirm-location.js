import { useState, useEffect, useRef } from "react";
import { goBack } from "../lib/navigation";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import SEO from "../components/SEO";
import { ArrowLeft, Search, Crosshair, MapPin, Check, X } from "lucide-react";
import { reverseGeocodeCoords, searchPlacesAutocomplete } from "../lib/maps";

const MapWithPin = dynamic(() => import("../components/MapWithPinInner"), { ssr: false });

const HUB_POS = { lat: 33.735832, lng: 75.143614 }; // Lal Chowk hub, Anantnag

export default function ConfirmLocationPage() {
  const router = useRouter();
  const [selectedPos, setSelectedPos] = useState(HUB_POS);
  // Empty until reverse geocoding answers; these held a hardcoded sample address.
  const [areaTitle, setAreaTitle] = useState("");
  const [addressSubtitle, setAddressSubtitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("dashit_user_address");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.lat && parsed.lng) {
          setSelectedPos({ lat: parsed.lat, lng: parsed.lng });
          setAreaTitle(parsed.nickname || parsed.address?.split(",")[0] || "Home");
          setAddressSubtitle(parsed.address || "Anantnag, Jammu & Kashmir");
          return;
        }
      }
    } catch (e) {}

    /* No automatic GPS request.

       This used to call getCurrentPosition() straight from the mount effect, so
       the OS permission dialog appeared before the customer had been told what
       the location was for. Google Play requires a prominent in-app disclosure
       *before* the system prompt, and an unexplained prompt on first open is a
       common rejection. The map opens on the store's own area, and location is
       requested only when the customer taps "Use my current location". */
  }, []);

  const handleSearchChange = async (query) => {
    setSearchQuery(query);
    if (query.trim().length >= 2) {
      setIsSearching(true);
      const results = await searchPlacesAutocomplete(query.trim());
      setSearchResults(results);
      setIsSearching(false);
    } else {
      setSearchResults([]);
    }
  };

  const handleSelectSearchResult = async (item) => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedPos({ lat: item.lat, lng: item.lng });
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView([item.lat, item.lng], 16, { animate: true });
    }
    const geocoded = await reverseGeocodeCoords(item.lat, item.lng);
    setAreaTitle(geocoded.area || item.title);
    setAddressSubtitle(geocoded.address || item.subtitle);
  };

  const handleConfirm = () => {
    const locObj = {
      nickname: areaTitle || "Home",
      area: areaTitle || "Anantnag",
      // Same duplication as InteractiveMapModal: the address already has the area.
      address: addressSubtitle || (areaTitle ? `${areaTitle}, Anantnag` : "Anantnag"),
      lat: Number(selectedPos.lat),
      lng: Number(selectedPos.lng),
      city: "Anantnag",
      pincode: "192101",
    };
    try {
      localStorage.setItem("dashit_user_address", JSON.stringify(locObj));
      localStorage.setItem("dashit_selected_location", JSON.stringify(locObj));

      // Save to saved addresses list
      const savedList = JSON.parse(localStorage.getItem("dashit_saved_addresses") || "[]");
      const updatedList = [locObj, ...savedList.filter((s) => s.address !== locObj.address)].slice(0, 5);
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
    goBack(router);
  };

  const handleRecenterGPS = () => {
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
      async () => {
        setIsLocating(false);
        setSelectedPos(HUB_POS);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([HUB_POS.lat, HUB_POS.lng], 16, { animate: true });
        }
        const geocoded = await reverseGeocodeCoords(HUB_POS.lat, HUB_POS.lng);
        setAreaTitle(geocoded.area);
        setAddressSubtitle(geocoded.address);
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-white overflow-hidden">
      <SEO title="Select Delivery Location" noindex={true} />

      {/* 1. FULLSCREEN MAP (Underneath everything, eliminating any gray bottom corner gaps) */}
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

      {/* 2. FIXED PIN (Centered in the upper visible map viewport) */}
      <div className="absolute top-[38%] left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-20 flex flex-col items-center">
        <div className="absolute -bottom-2 w-16 h-16 rounded-full bg-sky-400/20 animate-pulse pointer-events-none" />

        <div
          className={`transition-transform duration-200 ease-out flex flex-col items-center ${
            isDragging ? "-translate-y-4 scale-110" : "translate-y-0 scale-100"
          }`}
        >
          <div className="w-11 h-11 rounded-full bg-[#f9532d] p-1.5 shadow-xl flex items-center justify-center border-2 border-white">
            <div className="w-3.5 h-3.5 rounded-full bg-white" />
          </div>
          <div className="w-2 h-3.5 bg-[#f9532d] -mt-1 rounded-b-full shadow-sm" />
          <div className="w-3.5 h-1.5 bg-black/30 rounded-full blur-[1px] mt-1" />
        </div>
      </div>

      {/* 3. CURRENT LOCATION BUTTON (Clean bottom-right FAB above the sheet) */}
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

      {/* 4. TOP FLOATING SEARCH BAR & AUTOCOMPLETE DROPDOWN */}
      <div className="absolute top-0 left-0 right-0 z-[2000] p-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] flex items-center space-x-3 pointer-events-none">
        <button
          type="button"
          onClick={() => goBack(router)}
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
          ) : (
            <Search className="absolute right-3.5 top-3.5 w-4 h-4 stroke-[2.5] text-slate-400 pointer-events-none" />
          )}

          {/* Autocomplete Dropdown with Highest Z-Index */}
          {searchResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-[2500] divide-y divide-slate-100 max-h-64 overflow-y-auto">
              {searchResults.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelectSearchResult(item)}
                  className="w-full text-left p-3 hover:bg-slate-50 flex items-start space-x-2.5 transition-colors"
                >
                  <MapPin className="w-4 h-4 text-[#f9532d] shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">{item.title}</p>
                    <p className="text-[10px] text-slate-400 truncate">{item.subtitle}</p>
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
        <div className="border border-slate-200 rounded-xl p-3 flex items-center justify-between">
          <p className="text-xs font-medium text-slate-600">
            Zoom in to place the pin at exact delivery location
          </p>
          <div className="w-8 h-8 rounded-full bg-white shadow-xs flex items-center justify-center shrink-0 ml-2">
            <MapPin className="w-4 h-4 text-[#f9532d]" />
          </div>
        </div>

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          className="w-full bg-[#FF5B00] hover:bg-[#0a6f1a] text-white py-3.5 rounded-2xl font-black text-xs flex items-center justify-center space-x-1.5 shadow-md active:scale-98 transition-all"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Confirm Location & Proceed</span>
        </button>
      </div>
    </div>
  );
}
