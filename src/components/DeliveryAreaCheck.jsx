import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/router";
import { MapPin, Navigation } from "lucide-react";
import VaulDrawer from "./ui/VaulDrawer";
import { useStoredJson } from "../lib/useStoredJson";
import { calculateDeliveryEta, MAX_DELIVERY_RADIUS_KM } from "../lib/deliveryEta";
import { measureRoadKm, pointKey } from "../lib/roadDistance";
import { reverseGeocodeCoords } from "../lib/maps";

const ASKED_KEY = "dashit_location_asked";
const TOLD_KEY = "dashit_outside_area_told";

function saveAddress(loc) {
  try {
    localStorage.setItem("dashit_user_address", JSON.stringify(loc));
    localStorage.setItem("dashit_selected_location", JSON.stringify(loc));
    window.dispatchEvent(new CustomEvent("dashit_address_updated", { detail: loc }));
  } catch (e) {}
}

/**
 * Tells a shopper early whether we deliver to them.
 *
 *  - No address yet: a sheet explains why we want their location (we deliver
 *    within 5 km of the store), and only then asks the browser for it. The
 *    browser prompt never appears unexplained.
 *  - Any address: its distance from the store by road is measured once and
 *    saved on the address, which is what every "do we deliver here" check
 *    reads (calculateDeliveryEta).
 *  - Further than 5 km by road: a sheet says so, once per address.
 */
export default function DeliveryAreaCheck() {
  const router = useRouter();
  const address = useStoredJson("dashit_user_address", { events: ["dashit_address_updated"] });
  const [askOpen, setAskOpen] = useState(false);
  const [outsideOpen, setOutsideOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const measuring = useRef("");

  const hasPoint = Boolean(address && Number(address.lat) && Number(address.lng));

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

  // Measure the road distance for an address that doesn't have it yet.
  useEffect(() => {
    if (!hasPoint) return;
    const key = pointKey(address);
    if (address.roadFor === key || measuring.current === key) return;
    measuring.current = key;
    measureRoadKm(address.lat, address.lng).then((roadKm) => {
      measuring.current = "";
      if (roadKm === null) return;
      saveAddress({ ...address, roadKm, roadFor: key });
    });
  }, [hasPoint, address]);

  // Say it plainly, once per address, when it is too far.
  useEffect(() => {
    if (!hasPoint) return;
    if (calculateDeliveryEta(address).isDeliverable) return;
    const key = pointKey(address);
    try {
      if (sessionStorage.getItem(TOLD_KEY) === key) return;
      sessionStorage.setItem(TOLD_KEY, key);
    } catch (e) {}
    setAskOpen(false);
    setOutsideOpen(true);
  }, [hasPoint, address]);

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
        const [place, roadKm] = await Promise.all([reverseGeocodeCoords(lat, lng), measureRoadKm(lat, lng)]);
        const loc = {
          nickname: "Current location",
          address: place?.address || place?.area || "Current location",
          lat,
          lng,
        };
        if (roadKm !== null) {
          loc.roadKm = roadKm;
          loc.roadFor = pointKey(loc);
        }
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

  const eta = hasPoint ? calculateDeliveryEta(address) : null;

  return (
    <>
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

      <VaulDrawer
        open={outsideOpen}
        onOpenChange={setOutsideOpen}
        title="We can't deliver to this address yet"
        description={
          eta && !eta.isDeliverable
            ? `It is ${eta.distanceKm} km from our store by road. We deliver up to ${MAX_DELIVERY_RADIUS_KM} km for now.`
            : ""
        }
      >
        <div className="space-y-2.5 pt-2 pb-[env(safe-area-inset-bottom,0px)]">
          <button
            type="button"
            onClick={() => {
              setOutsideOpen(false);
              router.push("/add-address");
            }}
            className="w-full h-12 rounded-xl bg-[#FF5B00] hover:bg-[#E04E00] text-white text-[15px] font-bold"
          >
            Choose another address
          </button>
          <button
            type="button"
            onClick={() => setOutsideOpen(false)}
            className="w-full h-10 text-[13.5px] font-semibold text-slate-500 dark:text-content-muted"
          >
            Keep browsing
          </button>
        </div>
      </VaulDrawer>
    </>
  );
}
