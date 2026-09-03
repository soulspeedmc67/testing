import { useState } from "react";
import { useRouter } from "next/router";
import { Search, Crosshair, ChevronRight, Plus, MessageCircle, Share2, MoreHorizontal, Home, Pin, Check, MapPin } from "lucide-react";
import InteractiveMapModal from "./InteractiveMapModal";
import VaulDrawer from "./ui/VaulDrawer";

export default function LocationPickerModal({ isOpen, onClose, onSelectLocation, currentLocation }) {
  const router = useRouter();
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
      () => {
        setIsGeolocating(false);
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

  const handleAddAddress = () => {
    onClose();
    router.push("/add-address");
  };

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
        description="Choose or search your delivery address in Anantnag"
      >
        <div className="space-y-4 pt-1 pb-4">
          {/* Search Input Box matching Screenshot 1 */}
          <div className="relative">
            <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search for area, street name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 text-xs font-semibold text-slate-800 pl-10 pr-4 py-3 rounded-2xl focus:outline-none focus:border-[#0c831f] shadow-xs transition-all"
            />
          </div>

          {/* Action List Items matching Screenshot 1 */}
          <div className="bg-white border border-slate-100 rounded-3xl divide-y divide-slate-100 shadow-xs overflow-hidden">
            {/* 1. Use Current Location */}
            <button
              onClick={handleUseCurrentLocation}
              disabled={isGeolocating}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left group"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-emerald-50 text-[#0c831f]">
                  <Crosshair className={`w-4 h-4 ${isGeolocating ? "animate-spin" : ""}`} />
                </div>
                <span className="text-xs font-bold text-slate-800 group-hover:text-[#0c831f] transition-colors">
                  {isGeolocating ? "Locating GPS..." : "Use your current location"}
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* 2. Add New Address */}
            <button
              onClick={handleAddAddress}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left group"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-emerald-50 text-[#0c831f]">
                  <Plus className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 group-hover:text-[#0c831f] transition-colors">
                  Add new address
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* 2b. Set Location Pin on Map */}
            <button
              onClick={() => {
                onClose();
                router.push("/confirm-location");
              }}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left group"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-emerald-50 text-[#0c831f]">
                  <MapPin className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 group-hover:text-[#0c831f] transition-colors">
                  Set location pin on map
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* 3. Request address from someone else */}
            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: "Dashit Address Request", text: "Please share your delivery address with me for Dashit 10-minute delivery!" });
                } else {
                  alert("Share link copied to clipboard!");
                }
              }}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left group"
            >
              <div className="flex items-center space-x-3">
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <span className="text-xs font-bold text-slate-800 group-hover:text-emerald-700 transition-colors">
                  Request address from someone else
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {/* 4. Import from Zomato */}
            <button
              onClick={() => alert("Addresses already synced with Zomato network!")}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left group"
            >
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-xl bg-red-500 text-white font-black text-[10px] flex items-center justify-center shadow-xs">
                  Z
                </div>
                <span className="text-xs font-bold text-slate-800 group-hover:text-red-600 transition-colors">
                  Import your addresses from Zomato
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* Saved Addresses Section */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider px-1">
              Your saved addresses
            </h3>

            {/* Address Card matching Screenshot 1 */}
            <div className="bg-white border-2 border-emerald-500/20 rounded-3xl p-4 shadow-sm space-y-3 relative">
              <div className="flex items-start space-x-3">
                {/* House Icon with Active Check badge & distance tag */}
                <div className="relative">
                  <div className="w-11 h-11 bg-emerald-50 rounded-2xl flex flex-col items-center justify-center border border-emerald-100">
                    <Home className="w-5 h-5 text-emerald-700" />
                    <span className="text-[7.5px] font-extrabold text-emerald-800 mt-0.5">0.5 km</span>
                  </div>
                  {/* Selected check badge */}
                  <div className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-[#0c831f] text-white rounded-full flex items-center justify-center ring-2 ring-white">
                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                  </div>
                </div>

                <div className="grow space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-extrabold text-sm text-slate-900">Home</h4>
                    <Pin className="w-3.5 h-3.5 text-slate-400" />
                  </div>
                  <p className="text-xs text-slate-600 leading-snug font-medium">
                    b-3,jamia appqrtment,flat no 207,okhla, Abul Fazal Enclave Part 1, near ramjani masjid, Anantnag
                  </p>
                  <p className="text-xs text-slate-500 font-medium">
                    Phone number: <span className="text-slate-900 font-mono font-bold">9622720283</span>
                  </p>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                <div className="flex items-center space-x-2">
                  <button className="p-1.5 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50">
                    <MoreHorizontal className="w-3.5 h-3.5" />
                  </button>
                  <button className="p-1.5 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50">
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <button
                  onClick={() => {
                    onSelectLocation({
                      nickname: "Home",
                      address: "b-3,jamia appqrtment, Anantnag",
                      lat: 33.7311,
                      lng: 75.1487
                    });
                    onClose();
                  }}
                  className="bg-[#0c831f] text-white font-black text-xs px-5 py-2 rounded-xl hover:bg-emerald-800 transition-all shadow-sm active:scale-95"
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
