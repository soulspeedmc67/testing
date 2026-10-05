import dynamic from "next/dynamic";
import { ORDER_STATUS } from "../../lib/db";

// Leaflet needs the browser; the same map the customer's tracking page uses.
const MapTracking = dynamic(() => import("../MapTracking"), { ssr: false });

/**
 * Every order that is out for delivery, each with a live map of its rider.
 * The rider's phone writes its position to the order; staff may read it.
 */
export default function LiveDeliveriesPanel({ orders = [], darkMode = false }) {
  const onRoad = (orders || []).filter((o) => o && o.status === ORDER_STATUS.OUT_FOR_DELIVERY);
  const card = darkMode ? "bg-[#14161E] border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-900";

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${card}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black">Deliveries on the road</h2>
        <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">{onRoad.length} now</span>
      </div>

      {onRoad.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-zinc-400 py-4 text-center">
          No order is out for delivery right now. A map appears here as soon as a rider leaves with one.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {onRoad.map((o) => {
            const id = o.orderId || o.id;
            const lat = Number(o.location?.lat ?? o.deliveryAddress?.latitude);
            const lng = Number(o.location?.lng ?? o.deliveryAddress?.longitude);
            const place = o.location?.area || o.location?.address || "Customer";
            return (
              <div key={id} className="rounded-xl border border-slate-200 dark:border-zinc-800 overflow-hidden">
                <div className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
                  <span className="font-black truncate">
                    #{id} · {o.driverName || "Rider not named"}
                  </span>
                  <span className="text-slate-500 dark:text-zinc-400 truncate">
                    To {o.customerName || "customer"}, {place}
                  </span>
                </div>
                <div className="h-64">
                  <MapTracking
                    orderId={id}
                    fullScreen
                    destinationName={place}
                    {...(Number.isFinite(lat) && Number.isFinite(lng) ? { customerLat: lat, customerLng: lng } : {})}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
