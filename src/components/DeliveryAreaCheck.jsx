import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { MapPin, Navigation } from "lucide-react";
import VaulDrawer from "./ui/VaulDrawer";
import { useStoredJson } from "../lib/useStoredJson";
import { MAX_DELIVERY_RADIUS_KM } from "../lib/deliveryEta";
import { reverseGeocodeCoords } from "../lib/maps";

const ASKED_KEY = "dashit_location_asked";

function saveAddress(loc) {
  try {
    localStorage.setItem("dashit_user_address", JSON.stringify(loc));
    localStorage.setItem("dashit_selected_location", JSON.stringify(loc));
    window.dispatchEvent(new CustomEvent("dashit_address_updated", { detail: loc }));
  } catch (e) {}
}

/**
 * Explains to a new shopper why we want their location (we deliver within 8 km
 * of our store in Anantnag), and only then asks the browser for it. The browser
 * prompt never appears unexplained.
 */
export default function DeliveryAreaCheck() {
  const router = useRouter();
  const address = useStoredJson("dashit_user_address", { events: ["dashit_address_updated"] });
  const [askOpen, setAskOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // Ask once per visit, on the shop's front page, a moment after it has loaded.
  useEffect(() => {
    if (router.pathname !== "/shop") return undefined;
    const timer = setTimeout(() => {
      let saved = null;
      try {
        saved = localStorage.getItem("dashit_user_address");
        if (saved || sessionStorage.getItem(ASKED_KEY)) return;
        sessionStorage.setItem(ASKED_KEY, "1");
      } catch (e) {
        return;
      }
      setAskOpen(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, [router.pathname]);

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("This browser can't share its location. Please choose your address instead.");
      return;
    }
    setBusy(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const place = await reverseGeocodeCoords(lat, lng);
        const loc = {
          nickname: "Current location",
          address: place?.address || place?.area || "Current location",
          lat,
          lng,
        };
        saveAddress(loc);
        setBusy(false);
        setAskOpen(false);
      },
      () => {
        setBusy(false);
        setError("We couldn't get your location. Please allow it, or choose your address instead.");
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  return (
    <VaulDrawer
      open={askOpen}
      onOpenChange={setAskOpen}
      title="Where should we deliver?"
      description={`We deliver within ${MAX_DELIVERY_RADIUS_KM} km of our store in Anantnag. Share your location and we'll tell you straight away if we reach you.`}
    >
      <div className="space-y-2.5 pt-2 pb-[env(safe-area-inset-bottom,0px)]">
        <button
          type="button"
          onClick={useMyLocation}
          disabled={busy}
          className="w-full h-12 rounded-xl bg-[#FF5B00] hover:bg-[#E04E00] text-white text-[15px] font-bold flex items-center justify-center gap-2 disabled:opacity-70"
        >
          <Navigation className="w-4 h-4" />
          {busy ? "Finding you…" : "Use my current location"}
        </button>
        <button
          type="button"
          onClick={() => {
            setAskOpen(false);
            router.push("/add-address");
          }}
          className="w-full h-12 rounded-xl border border-slate-300 text-[#061838] text-[15px] font-bold flex items-center justify-center gap-2 dark:border-line dark:text-content"
        >
          <MapPin className="w-4 h-4" />
          Choose my address
        </button>
        <button
          type="button"
          onClick={() => setAskOpen(false)}
          className="w-full h-10 text-[13.5px] font-semibold text-slate-500 dark:text-content-muted"
        >
          Not now
        </button>
        {error && <p className="text-[13px] text-red-600 dark:text-red-400">{error}</p>}
      </div>
    </VaulDrawer>
  );
}
