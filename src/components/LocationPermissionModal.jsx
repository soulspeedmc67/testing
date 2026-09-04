import { useState, useEffect } from "react";
import { useBodyScrollLock } from "../lib/useBodyScrollLock";
import { MapPin, Navigation, ShieldCheck, X } from "lucide-react";

export default function LocationPermissionModal({ isOpen, onGrantLocation, onSetManually, onClose }) {
  /* Locks background scroll while open (see src/lib/useBodyScrollLock.js). */
  useBodyScrollLock(Boolean(isOpen));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl p-6 w-full max-w-sm space-y-4 text-center shadow-2xl border border-slate-100 animate-modal-pop">
        <div className="w-14 h-14 bg-blue-100 text-[#061838] rounded-3xl flex items-center justify-center mx-auto shadow-sm">
          <Navigation className="w-7 h-7 animate-bounce" />
        </div>

        <div className="space-y-1.5">
          <h3 className="font-extrabold text-base text-slate-900">Allow Location Access</h3>
          <p className="text-xs text-slate-500 font-medium leading-relaxed">
            DASHit needs your location to check instant delivery availability in Anantnag & enable guaranteed 10-minute doorstep delivery.
          </p>
        </div>

        <div className="space-y-2 pt-2">
          <button
            onClick={onGrantLocation}
            className="w-full bg-[#061838] hover:bg-[#0c2552] text-white font-extrabold text-xs py-3.5 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center space-x-2"
          >
            <MapPin className="w-4 h-4" />
            <span>Allow Location Access</span>
          </button>

          <button
            onClick={onSetManually}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-3 rounded-2xl transition-all"
          >
            Set Location Manually
          </button>
        </div>

        <div className="flex items-center justify-center space-x-1 text-[11px] text-slate-400 pt-1">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Your location is private & encrypted</span>
        </div>
      </div>
    </div>
  );
}
