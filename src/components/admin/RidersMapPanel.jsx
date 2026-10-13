import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ExternalLink } from "lucide-react";
import { ORDER_STATUS, watchDrivers, watchRiderPositions } from "../../lib/db";
import { DARK_STORE_HUB, calculateHaversineDistance } from "../../lib/deliveryEta";
import { isRiderLive, riderSeenLabel } from "../../lib/riderPosition";

// Leaflet needs the browser.
const RidersMap = dynamic(() => import("./RidersMap"), { ssr: false });

const FINISHED = [ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED];

/**
 * Where the riders are: one map with the store and every rider whose phone has
 * said where it is, and a line for each rider under it. It listens only while
 * the Riders screen is open.
 */
export default function RidersMapPanel({ orders = [], darkMode = false }) {
  const [drivers, setDrivers] = useState([]);
  const [positions, setPositions] = useState({});
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => watchDrivers((list) => setDrivers((list || []).filter((d) => d.active))), []);

  // The same riders in another order must not restart the listeners.
  const idsKey = useMemo(() => drivers.map((d) => d.id).sort().join(","), [drivers]);
  useEffect(() => {
    setPositions({});
    if (!idsKey) return undefined;
    return watchRiderPositions(idsKey.split(","), setPositions);
  }, [idsKey]);

  // Counted again every half minute so "Seen 2 min ago" keeps moving.
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const rows = drivers
    .map((driver) => {
      const position = positions[driver.id] || null;
      const carrying = (orders || []).filter(
        (o) => o && String(o.driverId || "") === driver.id && !FINISHED.includes(o.status)
      );
      return { driver, position, carrying, live: isRiderLive(position, now) };
    })
    .sort((a, b) => Number(b.live) - Number(a.live) || Number(!!b.position) - Number(!!a.position) || a.driver.name.localeCompare(b.driver.name));

  const onMap = rows
    .filter((r) => r.position)
    .map((r) => ({ id: r.driver.id, name: r.driver.name, lat: r.position.lat, lng: r.position.lng, live: r.live }));

  const card = darkMode ? "bg-[#14161E] border-zinc-800 text-white" : "bg-white border-slate-200 text-slate-900";

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${card}`}>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black">Where the riders are</h2>
        <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">
          {onMap.length} of {drivers.length} on the map
        </span>
      </div>

      <div className="h-72 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800">
        <RidersMap riders={onMap} />
      </div>

      {drivers.length === 0 ? (
        <p className="text-xs text-slate-500 dark:text-zinc-400 py-2 text-center">No riders yet. Add one below.</p>
      ) : (
        <ul className="divide-y divide-slate-200/70 dark:divide-zinc-800">
          {rows.map(({ driver, position, carrying, live }) => (
            <li key={driver.id} className="py-2 flex items-center justify-between gap-3 text-xs">
              <div className="min-w-0">
                <span className="font-black block truncate">{driver.name}</span>
                <span className="text-slate-500 dark:text-zinc-400 block truncate">
                  {carrying.length > 0
                    ? `Carrying ${carrying.map((o) => "#" + (o.orderId || o.id)).join(", ")}`
                    : "Free"}
                </span>
              </div>
              {position ? (
                <div className="flex items-center gap-3 shrink-0">
                  <span className={"text-right font-semibold " + (live ? "text-violet-600 dark:text-violet-300" : "text-slate-500 dark:text-zinc-400")}>
                    {riderSeenLabel(position, now)}
                    <span className="block font-normal text-slate-500 dark:text-zinc-400">
                      {calculateHaversineDistance(DARK_STORE_HUB.lat, DARK_STORE_HUB.lng, position.lat, position.lng).toFixed(1)} km from the store
                    </span>
                  </span>
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${position.lat},${position.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${driver.name}'s place in Google Maps`}
                    className="p-2 rounded-lg border border-slate-200 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : (
                <span className="text-slate-400 dark:text-zinc-500 shrink-0">Place not known yet</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="text-[11px] text-slate-500 dark:text-zinc-400">
        A rider&apos;s place is sent about every 20 seconds while the rider app is open on their phone. A grey rider
        hasn&apos;t been heard from for a few minutes.
      </p>
    </div>
  );
}
