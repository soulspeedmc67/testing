import { useState, useRef } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import dynamic from "next/dynamic";
import { ArrowLeft, Search, Crosshair, MapPin, Check } from "lucide-react";
import { reverseGeocodeCoords } from "../lib/maps";

const MapWithPin = dynamic(() => import("../components/MapWithPinInner"), { ssr: false });

const DARKSTORE_POS = { lat: 33.7311, lng: 75.1487 }; // Nai Basti, Anantnag

export default function ConfirmLocationPage() {
  const router = useRouter();
  const [selectedPos, setSelectedPos] = useState(DARKSTORE_POS);
  const [areaTitle, setAreaTitle] = useState("Kurhama");
  const [addressSubtitle, setAddressSubtitle] = useState("Gulshan Mohalla, Safapore 191131. (Kurhama)");
  const [searchQuery, setSearchQuery] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const mapInstanceRef = useRef(null);

  const handleConfirm = () => {
    const loc = {
      nickname: "Home",
      address: `${areaTitle}, ${addressSubtitle}`,
      lat: selectedPos.lat,
      lng: selectedPos.lng
    };
    try {
      localStorage.setItem("dashit_user_address", JSON.stringify(loc));
      window.dispatchEvent(new Event("dashit_address_updated"));
    } catch (e) {}
    router.back();
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
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col justify-between">
      <Head>
        <title>Select Delivery Location — Dashit</title>
      </Head>

      {/* 1. TOP FLOATING BAR matching media_1788424288259.png */}
      <div className="absolute top-0 left-0 right-0 z-[1000] p-4 pt-[max(14px,env(safe-area-inset-top,14px))] flex items-center space-x-3 pointer-events-none">
        <button
          type="button"
          onClick={() => router.back()}
          className="pointer-events-auto w-11 h-11 rounded-full bg-white shadow-md border border-slate-200/80 flex items-center justify-center text-slate-700 active:scale-90 transition-transform shrink-0"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="pointer-events-auto grow relative">
          <input
            type="text"
            placeholder="Search an area or address"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white text-slate-900 text-xs font-semibold pl-4 pr-10 py-3 rounded-2xl shadow-md border border-slate-200/80 focus:outline-none focus:ring-2 focus:ring-[#0c831f]"
          />
          <Search className="absolute right-3.5 top-3.5 w-4 h-4 stroke-[2.5] text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* 2. FULLSCREEN MAP WITH FIXED CENTER PIN */}
      <div className="relative w-full h-full grow bg-slate-100 overflow-hidden">
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

        {/* Fixed Center Orange Pin with Pulse & Shadow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-[1000] flex flex-col items-center">
          <div className="absolute -bottom-2 w-16 h-16 rounded-full bg-sky-400/20 animate-pulse pointer-events-none" />

          <div
            className={`transition-transform duration-200 ease-out flex flex-col items-center ${
              isDragging ? "-translate-y-4 scale-110" : "translate-y-0 scale-100"
            }`}
          >
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-[#f9532d] to-[#ff7a59] shadow-xl flex items-center justify-center border-2 border-white ring-2 ring-orange-400/30">
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

        {/* 3. FLOATING "Current Location" BUTTON */}
        <div className="absolute bottom-4 left-0 right-0 z-[1000] flex justify-center pointer-events-none mb-1">
          <button
            type="button"
            onClick={handleRecenterGPS}
            className="pointer-events-auto bg-white text-slate-800 font-extrabold text-xs px-4 py-2.5 rounded-full shadow-[0_6px_20px_rgba(0,0,0,0.14)] border border-slate-200/80 flex items-center space-x-2 active:scale-95 transition-transform"
          >
            <Crosshair className={`w-4 h-4 text-[#f9532d] stroke-[2.8] ${isLocating ? "animate-spin" : ""}`} />
            <span>Current Location</span>
          </button>
        </div>
      </div>

      {/* 4. BOTTOM SHEET matching media_1788424288259.png */}
      <div className="bg-white rounded-t-[28px] p-5 pt-4 space-y-3 shadow-[0_-12px_40px_rgba(0,0,0,0.15)] border-t border-slate-100 z-30 pb-[max(18px,env(safe-area-inset-bottom,18px))]">
        <span className="text-slate-500 font-bold text-xs block">
          Place the pin at exact delivery location
        </span>

        {/* Location Title & Subtitle */}
        <div className="flex items-start space-x-2.5">
          <div className="mt-0.5 shrink-0 text-[#f9532d]">
            <MapPin className="w-5 h-5 fill-[#f9532d] stroke-white stroke-2" />
          </div>
          <div>
            <h2 className="font-black text-base text-slate-900 leading-tight">
              {areaTitle}
            </h2>
            <p className="text-slate-500 text-xs font-semibold mt-0.5 leading-snug">
              {addressSubtitle}
            </p>
          </div>
        </div>

        {/* Light Red Notice Box matching screenshot */}
        <div className="bg-rose-50/90 border border-rose-200/70 rounded-2xl p-3 flex items-center justify-between">
          <p className="text-rose-600 font-bold text-xs leading-snug pr-2">
            Zoom in to place the pin at exact delivery location
          </p>
          <div className="w-11 h-11 rounded-full bg-white border border-rose-100 flex items-center justify-center shrink-0 shadow-2xs">
            <span className="text-lg">📍</span>
          </div>
        </div>

        {/* Confirm CTA */}
        <button
          type="button"
          onClick={handleConfirm}
          className="w-full bg-[#0c831f] hover:bg-emerald-800 text-white font-extrabold text-sm py-3.5 rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center space-x-2"
        >
          <Check className="w-4 h-4 stroke-[3]" />
          <span>Confirm Location & Proceed</span>
        </button>
      </div>
    </div>
  );
}
