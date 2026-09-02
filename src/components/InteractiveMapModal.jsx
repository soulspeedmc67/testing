import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { X, MapPin, Check, Navigation } from "lucide-react";

// Dynamically import Leaflet Map to prevent SSR window issues
const MapWithPin = dynamic(() => import("./MapWithPinInner"), { ssr: false });

export default function InteractiveMapModal({ isOpen, onClose, onConfirmLocation }) {
  const [selectedPos, setSelectedPos] = useState({ lat: 33.7311, lng: 75.1487 });
  const [addressText, setAddressText] = useState("Nai Basti, Near Petrol Pump, Anantnag");
  const [nickname, setNickname] = useState("Selected Location");

  if (!isOpen) return null;

  const handleConfirm = () => {
    onConfirmLocation({
      nickname: nickname || "Custom Location",
      address: addressText,
      lat: selectedPos.lat,
      lng: selectedPos.lng
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-end justify-center sm:items-center p-0 sm:p-4 animate-fade-in">
      <div className="bg-white rounded-t-[32px] sm:rounded-3xl w-full max-w-md h-[90vh] flex flex-col justify-between overflow-hidden shadow-2xl border border-slate-100 animate-bottom-sheet">
        {/* Map Header */}
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-white z-10">
          <div>
            <h3 className="font-black text-sm text-slate-900">Choose Location on Map</h3>
            <p className="text-[11px] font-semibold text-slate-500">Drag map to position pin at your exact doorstep</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Interactive Map View */}
        <div className="relative grow w-full bg-slate-100 overflow-hidden">
          <MapWithPin
            pos={selectedPos}
            onChangePos={(newPos) => {
              setSelectedPos(newPos);
              setAddressText(`Anantnag Sector Pin (${newPos.lat.toFixed(4)}, ${newPos.lng.toFixed(4)})`);
            }}
          />

          {/* Fixed Pin Overlay in Center */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-20 pb-8">
            <div className="flex flex-col items-center animate-bounce">
              <div className="p-2 bg-[#0c831f] text-white rounded-full shadow-2xl border-2 border-white">
                <MapPin className="w-6 h-6" />
              </div>
              <div className="w-2 h-2 bg-slate-900/60 rounded-full blur-[1px] mt-0.5" />
            </div>
          </div>
        </div>

        {/* Location Confirmation Panel */}
        <div className="p-5 bg-white border-t border-slate-200 space-y-3 z-10">
          <div className="flex items-start space-x-3">
            <div className="p-2.5 bg-emerald-100 text-[#0c831f] rounded-2xl shrink-0 mt-0.5">
              <Navigation className="w-5 h-5" />
            </div>
            <div className="grow">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">SELECTED LOCATION</span>
              <p className="text-xs font-bold text-slate-900 leading-snug">{addressText}</p>
            </div>
          </div>

          <button
            onClick={handleConfirm}
            className="w-full bg-[#0c831f] hover:bg-emerald-800 text-white font-extrabold text-xs py-3.5 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center space-x-2"
          >
            <Check className="w-4 h-4" />
            <span>Confirm & Save Location</span>
          </button>
        </div>
      </div>
    </div>
  );
}
