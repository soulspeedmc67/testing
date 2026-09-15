import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import {
  ChevronRight,
  Plus,
  MessageCircle,
  Pin,
  Check,
  Trash2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  MapPin,
  Home,
  Briefcase,
  Users,
  Building2,
} from "lucide-react";
import InteractiveMapModal from "./InteractiveMapModal";
import VaulDrawer from "./ui/VaulDrawer";
import { calculateDeliveryEta } from "../lib/deliveryEta";
import { hapticLight, hapticHeavy } from "../lib/haptics";

function renderAliasIcon(alias) {
  switch (alias) {
    case "Home":
      return <Home className="w-5 h-5 text-[#061838]" />;
    case "Work":
      return <Briefcase className="w-5 h-5 text-[#061838]" />;
    case "Parents":
      return <Users className="w-5 h-5 text-[#061838]" />;
    case "Shop":
      return <Building2 className="w-5 h-5 text-[#061838]" />;
    default:
      return <MapPin className="w-5 h-5 text-[#061838]" />;
  }
}

export default function LocationPickerModal({
  isOpen,
  onClose,
  onSelectLocation,
  currentLocation,
  onOpenMap,
}) {
  const router = useRouter();
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState([]);
  const [activeAddressId, setActiveAddressId] = useState(null);

  const loadSavedAddresses = () => {
    if (typeof window === "undefined") return;
    try {
      const rawList = localStorage.getItem("dashit_saved_addresses");
      let list = rawList ? JSON.parse(rawList) : [];

      const activeRaw = localStorage.getItem("dashit_user_address");
      const activeObj = activeRaw ? JSON.parse(activeRaw) : null;

      if (list.length === 0 && activeObj?.address) {
        list = [activeObj];
      }

      setSavedAddresses(list);
      if (activeObj) {
        setActiveAddressId(activeObj.id || activeObj.address);
      }
    } catch (e) {}
  };

  useEffect(() => {
    if (isOpen) {
      loadSavedAddresses();
    }
  }, [isOpen]);

  const handleOpenMap = () => {
    if (onOpenMap) {
      onOpenMap();
    } else {
      setIsMapOpen(true);
    }
  };

  const handleSelectAddress = (addr) => {
    hapticHeavy();
    try {
      localStorage.setItem("dashit_user_address", JSON.stringify(addr));
      localStorage.setItem("dashit_selected_location", JSON.stringify(addr));

      // Bring selected address to top of list
      const rawList = JSON.parse(localStorage.getItem("dashit_saved_addresses") || "[]");
      const filtered = rawList.filter((s) => (s.id || s.address) !== (addr.id || addr.address));
      const updatedList = [addr, ...filtered];
      localStorage.setItem("dashit_saved_addresses", JSON.stringify(updatedList));

      const userStr = localStorage.getItem("dashit_user");
      if (userStr) {
        const u = JSON.parse(userStr);
        u.address = addr.address;
        u.location = addr;
        localStorage.setItem("dashit_user", JSON.stringify(u));
      }

      window.dispatchEvent(new CustomEvent("dashit_address_updated", { detail: addr }));
      window.dispatchEvent(new Event("storage"));
    } catch (e) {}

    onSelectLocation(addr);
    onClose();
  };

  const handleDeleteAddress = (e, addrToDelete) => {
    e.stopPropagation();
    hapticLight();
    try {
      const targetKey = addrToDelete.id || addrToDelete.address;
      const updatedList = savedAddresses.filter((a) => (a.id || a.address) !== targetKey);
      setSavedAddresses(updatedList);
      localStorage.setItem("dashit_saved_addresses", JSON.stringify(updatedList));

      // If active address was deleted, switch to the next available
      if (activeAddressId === targetKey) {
        if (updatedList.length > 0) {
          handleSelectAddress(updatedList[0]);
        } else {
          localStorage.removeItem("dashit_user_address");
          localStorage.removeItem("dashit_selected_location");
          window.dispatchEvent(new Event("dashit_address_updated"));
        }
      }
    } catch (e) {}
  };

  return (
    <>
      <InteractiveMapModal
        isOpen={isMapOpen}
        onClose={() => setIsMapOpen(false)}
        onConfirmLocation={(loc) => {
          loadSavedAddresses();
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
        hideCloseButton={true}
      >
        <div className="space-y-4 pt-1 pb-6">
          {/* Action List Items: Add Address + Share */}
          <div className="bg-white border border-slate-200/90 rounded-3xl divide-y divide-slate-100 shadow-xs overflow-hidden">
            {/* 1. Add New Address (Opens Pin-Drop Interactive Map) */}
            <button
              type="button"
              onClick={handleOpenMap}
              className="w-full px-4 py-3.5 flex items-center justify-between hover:bg-slate-50 transition-colors text-left group active:bg-orange-50/50"
            >
              <div className="flex items-center space-x-3">
                <Plus className="w-5 h-5 text-[#FF5B00] stroke-[2.8]" />
                <span className="text-xs font-black text-[#FF5B00]">
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
                  navigator.share({
                    title: "Dashit Address Request",
                    text: "Please share your delivery address with me on Dashit!",
                  });
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
          </div>

          {/* Multiple Saved Addresses Section */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-slate-500 tracking-tight">
                Your saved addresses ({savedAddresses.length})
              </h3>
              <span className="text-[10px] font-bold text-[#FF5B00]">Max 5 km radius</span>
            </div>

            {savedAddresses.length > 0 ? (
              <div className="space-y-2.5 max-h-[55vh] overflow-y-auto pr-0.5">
                {savedAddresses.map((addr) => {
                  const addrKey = addr.id || addr.address;
                  const isActive = activeAddressId === addrKey;
                  const alias = addr.alias || addr.nickname || "Home";
                  const deliveryData = calculateDeliveryEta(addr);
                  const isWithin5km = deliveryData.isDeliverable;

                  return (
                    <div
                      key={addrKey}
                      onClick={() => isWithin5km && handleSelectAddress(addr)}
                      className={`bg-white border rounded-3xl p-3.5 space-y-2.5 relative transition-all ${
                        isActive
                          ? "border-[#061838] ring-2 ring-[#061838]/10 shadow-sm"
                          : "border-slate-200/90 hover:border-slate-300"
                      } ${!isWithin5km ? "opacity-75 bg-slate-50/50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-start space-x-3 min-w-0 flex-1">
                          <div className="relative shrink-0 mt-0.5">
                            <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center border border-slate-200 text-base shadow-2xs">
                              {renderAliasIcon(alias)}
                            </div>
                            {isActive && (
                              <div className="absolute -top-1.5 -left-1.5 w-4 h-4 bg-[#061838] text-white rounded-full flex items-center justify-center ring-2 ring-white shadow-xs">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </div>
                            )}
                          </div>

                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="flex items-center space-x-2">
                              <h4 className="font-black text-xs text-slate-900 uppercase tracking-tight">
                                {alias}
                              </h4>
                              {isActive && (
                                <span className="text-[9px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                                  Active
                                </span>
                              )}
                            </div>

                            <p className="text-[11px] text-slate-600 font-medium line-clamp-2 leading-snug">
                              {addr.address}
                            </p>

                            {/* 5 km Deliverability & ETA Badge */}
                            <div className="pt-1">
                              {isWithin5km ? (
                                <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                                  <ShieldCheck className="w-3 h-3 text-emerald-600" />
                                  <span>Within 5 km ({deliveryData.distanceFormatted}) • ~{deliveryData.etaMinutes} mins</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center space-x-1 text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/60">
                                  <AlertTriangle className="w-3 h-3 text-rose-600" />
                                  <span>Beyond 5 km ({deliveryData.distanceKm} km away) • Outside Service Area</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Delete Address Action */}
                        <button
                          type="button"
                          onClick={(e) => handleDeleteAddress(e, addr)}
                          title="Delete saved address"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Deliver Here Action Button */}
                      <div className="flex items-center justify-end pt-1.5 border-t border-slate-100">
                        <button
                          type="button"
                          disabled={!isWithin5km}
                          onClick={() => handleSelectAddress(addr)}
                          className={`font-black text-xs px-4 py-2 rounded-xl transition-all shadow-2xs active:scale-95 ${
                            !isWithin5km
                              ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                              : isActive
                              ? "bg-emerald-600 text-white"
                              : "bg-[#061838] text-white hover:bg-slate-900"
                          }`}
                        >
                          {isActive ? "Delivering Here" : isWithin5km ? "Deliver Here" : "Outside 5km"}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-center">
                <p className="text-xs text-slate-500 font-bold">No saved delivery addresses yet.</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tap "+ Add new address" above to pinpoint your location on the map.
                </p>
              </div>
            )}
          </div>
        </div>
      </VaulDrawer>
    </>
  );
}
