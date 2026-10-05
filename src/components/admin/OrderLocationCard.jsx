import dynamic from "next/dynamic";
import { MapPin, ExternalLink, XCircle, Fuel, Moon } from "lucide-react";
import { orderCoords } from "../../lib/orderReceipt";
import { DARK_STORE_HUB, MAX_DELIVERY_RADIUS_KM, calculateHaversineDistance } from "../../lib/deliveryEta";
import { fuelCostFor } from "../../lib/nightCharge";

// Leaflet needs the browser.
const OrderLocationMap = dynamic(() => import("./OrderLocationMap"), { ssr: false });

/** Straight-line km from the store: the figure saved at checkout, or worked out from the pin. */
export function orderDistanceKm(order) {
  const saved = Number(order?.distanceKm);
  if (order?.distanceKm != null && Number.isFinite(saved) && saved > 0) return saved;
  const pin = orderCoords(order);
  if (!pin) return null;
  return Math.round(calculateHaversineDistance(DARK_STORE_HUB.lat, DARK_STORE_HUB.lng, pin.lat, pin.lng) * 10) / 10;
}

/**
 * The drop on a map with how far it is and what the trip costs the rider in
 * petrol, so the shop can decide to deliver or reject before packing.
 */
export default function OrderLocationCard({ order, storeConfig = null, darkMode = false, canReject = false, onReject }) {
  const pin = orderCoords(order);
  const km = orderDistanceKm(order);
  const fuel = fuelCostFor(km, storeConfig);
  const isFar = km != null && km > MAX_DELIVERY_RADIUS_KM;
  const nightFee = Number(order?.nightDeliveryFee) || 0;

  const fact = "rounded-xl border px-3 py-2 " + (darkMode ? "border-zinc-800 bg-[#1A1D26]" : "border-slate-200 bg-slate-50");
  const factLabel = "block text-[10.5px] font-bold uppercase tracking-wider text-slate-400";
  const factValue = "block text-sm font-black text-slate-900 dark:text-white tabular-nums";

  return (
    <div className={"rounded-2xl border overflow-hidden " + (darkMode ? "bg-[#161822] border-zinc-800" : "bg-white border-slate-200 shadow-xs")}>
      <div className="px-4 pt-3.5 pb-3 flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2 min-w-0">
          <MapPin className="w-4 h-4 text-[#FF5B00] shrink-0" />
          <span className="font-black text-xs uppercase tracking-wider text-slate-800 dark:text-zinc-100">Where it goes</span>
        </div>
        {km != null && (
          <span
            className={
              "px-2 py-0.5 rounded-full font-bold text-[11px] border shrink-0 " +
              (isFar
                ? "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700"
                : "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-800")
            }
          >
            {km.toFixed(1)} km · {isFar ? "Beyond 8 km" : "Within 8 km"}
          </span>
        )}
      </div>

      {pin ? (
        <div className="h-60 border-y border-slate-200 dark:border-zinc-800">
          <OrderLocationMap lat={pin.lat} lng={pin.lng} />
        </div>
      ) : (
        <p className="mx-4 mb-1 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 px-3 py-6 text-center text-xs text-slate-500 dark:text-zinc-400">
          This order has no map pin. Use the written address below.
        </p>
      )}

      <div className="p-4 space-y-3">
        {km != null && fuel && (
          <div className="grid grid-cols-3 gap-2">
            <div className={fact}>
              <span className={factLabel}>From store</span>
              <span className={factValue}>{km.toFixed(1)} km</span>
            </div>
            <div className={fact}>
              <span className={factLabel}>Road, both ways</span>
              <span className={factValue}>{fuel.roundTripKm.toFixed(1)} km</span>
            </div>
            <div className={fact}>
              <span className={factLabel + " flex items-center gap-1"}>
                <Fuel className="w-3 h-3" /> Rider&apos;s petrol
              </span>
              <span className={factValue}>about ₹{fuel.cost}</span>
            </div>
          </div>
        )}

        {nightFee > 0 && (
          <p className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-300">
            <Moon className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
            The customer paid a ₹{nightFee} distance charge on this order.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          {pin && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&origin=${DARK_STORE_HUB.lat},${DARK_STORE_HUB.lng}&destination=${pin.lat},${pin.lng}&travelmode=two-wheeler`}
              target="_blank"
              rel="noopener noreferrer"
              className={
                "flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl font-black text-xs border transition-colors " +
                (darkMode
                  ? "bg-slate-800 text-slate-300 border-zinc-700 hover:bg-slate-700"
                  : "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200")
              }
            >
              <span>Route in Google Maps</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {canReject && (
            <button
              type="button"
              onClick={onReject}
              className="flex items-center justify-center space-x-1.5 py-2.5 px-3 rounded-xl text-rose-500 hover:bg-rose-500/10 border border-rose-500/30 text-xs font-bold transition-colors cursor-pointer"
            >
              <XCircle className="w-4 h-4" />
              <span>Too far? Reject order</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
