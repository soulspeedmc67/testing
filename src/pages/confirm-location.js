import { useState, useRef, useEffect } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { ChevronLeft, Search, Crosshair, MapPin, Check, MapPinOff } from "lucide-react";

const MapWithPin = dynamic(() => import("../components/MapWithPinInner"), { ssr: false });

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

export default function ConfirmLocationPage() {
  const router = useRouter();
  const [pos, setPos] = useState(DARKSTORE_POS);
  const [address, setAddress] = useState("Nai Basti Central, Near Petrol Pump, Anantnag");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const mapRef = useRef(null);

  const distanceKm = calculateDistanceKm(pos.lat, pos.lng, DARKSTORE_POS.lat, DARKSTORE_POS.lng);
  const isServiceable = distanceKm <= 5.0;

  const handleRecenterGPS = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your device.");
      return;
    }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setIsLocating(false);
        const newCoords = { lat: p.coords.latitude, lng: p.coords.longitude };
        setPos(newCoords);
        if (mapRef.current) {
          mapRef.current.setView([newCoords.lat, newCoords.lng], 16, { animate: true });
        }
      },
      () => {
        setIsLocating(false);
        setPos(DARKSTORE_POS);
        if (mapRef.current) {
          mapRef.current.setView([DARKSTORE_POS.lat, DARKSTORE_POS.lng], 16, { animate: true });
        }
      },
      { enableHighAccuracy: true }
    );
  };

  const handleConfirm = () => {
    const saved = {
      nickname: "HOME",
      address: address || "Pinned Location, Anantnag",
      lat: pos.lat,
      lng: pos.lng
    };
    try {
      localStorage.setItem("dashit_user_address", JSON.stringify(saved));
    } catch (e) {}
    router.push("/");
  };

  return (
    <div className="w-full h-screen h-[100dvh] flex flex-col justify-between overflow-hidden bg-white font-sans">
      <Head>
        <title>Confirm map pin location — Dashit</title>
      </Head>

      {/* 1. TOP HEADER & SEARCH (Fixed height, shrink-0, z-30) */}
      <div className="shrink-0 bg-white/98 backdrop-blur-md border-b border-slate-200/80 px-4 pt-3 pb-3 space-y-2.5 z-30 shadow-xs">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => router.back()}
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

      {/* 2. MAP (flex-1 min-h-0 fills exactly the space between header and bottom sheet) */}
      <div className="relative flex-1 min-h-0 w-full overflow-hidden">
        <MapWithPin
          pos={pos}
          onChangePos={(newPos) => setPos(newPos)}
          onDragStateChange={(dragging) => setIsDragging(dragging)}
          mapRef={mapRef}
        />

        {/* CENTER FIXED PIN MARKER WITH TACTILE BOUNCE matching Screenshot 2 */}
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

        {/* FLOATING "GO TO CURRENT LOCATION" BUTTON matching Screenshot 2 */}
        <div className="absolute bottom-4 left-4 right-4 z-20 flex justify-center pointer-events-none">
          <button
            type="button"
            onClick={handleRecenterGPS}
            className="pointer-events-auto bg-white/98 backdrop-blur-md border border-[#0c831f] text-[#0c831f] font-extrabold text-xs px-4 py-2 rounded-full shadow-lg flex items-center space-x-1.5 active:scale-95 transition-all"
          >
            <Crosshair className={`w-3.5 h-3.5 ${isLocating ? "animate-spin" : ""}`} />
            <span>Go to current location</span>
          </button>
        </div>
      </div>

      {/* 3. BOTTOM SHEET OVERLAY (shrink-0, z-30) */}
      <div className="shrink-0 bg-white rounded-t-[32px] p-5 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] border-t border-slate-100 space-y-3.5 max-w-md mx-auto w-full z-30">
        {!isServiceable ? (
          /* "Oops!" NOT AVAILABLE OVERLAY matching Screenshot 2 */
          <div className="text-center space-y-2.5">
            <div className="w-16 h-16 mx-auto flex items-center justify-center bg-amber-50 rounded-full border border-amber-200/70">
              <MapPinOff className="w-8 h-8 stroke-[2.5] text-amber-600" />
            </div>

            <div>
              <h3 className="font-black text-base text-slate-900">Oops!</h3>
              <p className="text-xs text-slate-600 font-medium max-w-xs mx-auto mt-0.5 leading-relaxed">
                Blinkit is not available at this location at the moment. Please select a different location.
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
                  setPos(DARKSTORE_POS);
                  if (mapRef.current) mapRef.current.setView([DARKSTORE_POS.lat, DARKSTORE_POS.lng], 16);
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
                <p className="text-xs font-semibold text-slate-700 mt-0.5">
                  {address}
                </p>
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
  );
}
