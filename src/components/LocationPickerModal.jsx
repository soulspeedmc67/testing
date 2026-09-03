import { useState } from "react";
import { useRouter } from "next/router";
import { Search, ChevronRight, Plus, MessageCircle, Share2, MoreHorizontal, Home, Pin, Check, X } from "lucide-react";
import InteractiveMapModal from "./InteractiveMapModal";
import VaulDrawer from "./ui/VaulDrawer";

export default function LocationPickerModal({ isOpen, onClose, onSelectLocation, currentLocation }) {
  const router = useRouter();
  const [isMapOpen, setIsMapOpen] = useState(false);

  return (
    <>
      <InteractiveMapModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onConfirmLocation={(loc) => {
          onSelectLocation(loc);
          setIsMapOpen(false);
          onClose();
        }}
      />

      <VaulDrawer
        open={isOpen}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        title="Select delivery location"
        description="Choose your delivery address"
      >
        <div className="space-y-4 pt-1 pb-6">
          {/* Top Floating Close Button matching media_1788424287971.png */}
          <div className="flex justify-center -mt-9 mb-2">
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-[#2d3238] text-white flex items-center justify-center shadow-lg active:scale-90 transition-transform"
            >
              <X className="w-4 h-4 stroke-[3]" />
            </button>
          </div>

          <h2 className="text-base font-black text-slate-900 tracking-tight">
            Select delivery location
          </h2>

          {/* Action List Items matching media_1788424287971.png */}
          <div className="bg-white border border-slate-200/90 rounded-3xl divide-y divide-slate-100 shadow-xs overflow-hidden">
            {/* 1. Add New Address (Opens Pin-Drop Interactive Map) */}
            <button
              type="button"
              onClick={() => setIsMapOpen(true)}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left group active:bg-emerald-50/50"
            >
              <div className="flex items-center space-x-3">
                <Plus className="w-5 h-5 text-[#0c831f] stroke-[2.8]" />
                <span className="text-xs font-black text-[#0c831f]">
                  Add new address
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* 2. Request address from someone else */}
            <button
              type="button"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: "Dashit Address Request", text: "Please share your delivery address with me on Dashit!" });
                } else {
                  alert("Address request link copied!");
                }
              }}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-7 h-7 rounded-xl bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <MessageCircle className="w-4 h-4 fill-white stroke-none" />
                </div>
                <span className="text-xs font-bold text-slate-800">
                  Request address from someone else
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* 3. Import from Zomato */}
            <button
              type="button"
              onClick={() => alert("Addresses synced from Zomato network!")}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-7 h-7 rounded-xl bg-[#E23744] text-white font-black text-[9px] flex items-center justify-center shrink-0 tracking-tight lowercase shadow-xs">
                  zomato
                </div>
                <span className="text-xs font-bold text-slate-800">
                  Import your addresses from Zomato
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Saved Addresses Section */}
          <div className="space-y-2 pt-1">
            <h3 className="text-xs font-bold text-slate-500 tracking-tight px-1">
              Your saved addresses
            </h3>

            {/* Address Card matching Screenshot */}
            <div className="bg-white border border-slate-200/90 rounded-3xl p-4 shadow-xs space-y-3 relative">
              <div className="flex items-start space-x-3">
                {/* House Icon with Active Check badge & distance tag */}
                <div className="relative shrink-0">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex flex-col items-center justify-center border border-emerald-100">
                    <span className="text-lg">🏡</span>
                    <span className="text-[7.5px] font-black text-emerald-800">0.8 km</span>
                  </div>
                  {/* Selected check badge */}
                  <div className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-[#0c831f] text-white rounded-full flex items-center justify-center ring-2 ring-white shadow-xs">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                </div>

                <div className="grow space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-sm text-slate-900">Home</h4>
                    <Pin className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-600 leading-snug font-medium line-clamp-2">
                    b-3,jamia appqrtment,flat no 207,okhla, Abul Fazal Enclave Part 1, Okhla, near ramjani masjid, Anantnag
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    Phone number: <span className="text-slate-900 font-mono font-bold">9622720283</span>
                  </p>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center space-x-2">
                  <button className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 active:scale-95">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                  <button className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50 active:scale-95">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>

                <button
                  onClick={() => {
                    onSelectLocation({
                      nickname: "Home",
                      address: "b-3,jamia appqrtment,flat no 207, Anantnag",
                      lat: 33.7311,
                      lng: 75.1487
                    });
                    onClose();
                  }}
                  className="bg-[#0c831f] text-white font-extrabold text-xs px-5 py-2.5 rounded-xl hover:bg-emerald-800 transition-all shadow-sm active:scale-95"
                >
                  Deliver Here
                </button>
              </div>
            </div>
          </div>
        </div>
      </VaulDrawer>
    </>
  );
}
