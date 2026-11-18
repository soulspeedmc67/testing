import React, { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { Search, Crosshair, Loader2, MapPin } from "lucide-react";
import { DARK_STORE_HUB, getDeliveryRadiusKm } from "../../lib/deliveryEta";

const PartnerAreaMapInner = dynamic(() => import("./PartnerAreaMapInner"), {
  ssr: false,
  loading: () => <div className="h-full w-full flex items-center justify-center text-xs text-slate-400">Loading map…</div>,
});

const PRESETS = [3, 5, 8, 10, 15, 25];

/** Any town or place in India, by name (not tied to the shop's own town). */
async function searchPlaces(q) {
  const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&countrycodes=in&limit=6`);
  if (!res.ok) return [];
  const data = await res.json();
  return (data || []).map((p) => ({
    id: String(p.place_id),
    title: p.name || String(p.display_name).split(",")[0],
    subtitle: p.display_name,
    lat: parseFloat(p.lat),
    lng: parseFloat(p.lon),
  }));
}

/**
 * Where a partner's shop is and how far he may deliver, chosen on a map:
 * search for the place (or use this device's location), pan the map until the
 * pin sits on the shop, and slide the distance. The circle shows exactly the
 * area his customers will be in. `pos` is null until the owner has chosen.
 */
export default function PartnerAreaPicker({ pos, radiusKm, onPos, onRadius, darkMode = false }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [note, setNote] = useState("");
  const debounce = useRef(null);
  const subtle = darkMode ? "text-zinc-400" : "text-slate-500";
  const box = darkMode ? "bg-[#0D0E12] border-zinc-800 text-zinc-100" : "bg-slate-50 border-slate-200 text-slate-900";

  useEffect(() => () => clearTimeout(debounce.current), []);

  const onSearch = (value) => {
    setQ(value);
    setNote("");
    clearTimeout(debounce.current);
    if (value.trim().length < 3) {
      setResults([]);
      return;
    }
    setSearching(true);
    debounce.current = setTimeout(async () => {
      try {
        const found = await searchPlaces(value.trim());
        setResults(found);
        if (!found.length) setNote("No place found. Try another spelling, or pan the map by hand.");
      } catch (e) {
        setResults([]);
        setNote("Search isn't available right now. Pan the map by hand.");
      } finally {
        setSearching(false);
      }
    }, 600);
  };

  const pick = (r) => {
    onPos({ lat: r.lat, lng: r.lng });
    setResults([]);
    setQ(r.title);
  };

  const locate = () => {
    if (!navigator.geolocation) return setNote("This device can't share its location.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { setLocating(false); onPos({ lat: p.coords.latitude, lng: p.coords.longitude }); },
      () => { setLocating(false); setNote("Couldn't get your location. Search for the place instead."); },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const km = Number(radiusKm) || 0;
  const shop = { lat: DARK_STORE_HUB.lat, lng: DARK_STORE_HUB.lng, km: getDeliveryRadiusKm() };

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className={`w-4 h-4 absolute left-3.5 top-3.5 ${subtle}`} />
        <input
          value={q}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="Search the shop's town or area"
          className={`w-full min-h-[44px] rounded-xl border pl-10 pr-24 text-sm outline-none focus:border-emerald-500 ${box}`}
        />
        <button type="button" onClick={locate} className="absolute right-1.5 top-1.5 h-8 px-2.5 rounded-lg text-[11px] font-bold flex items-center gap-1 bg-emerald-500/10 text-emerald-600 cursor-pointer">
          {locating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Crosshair className="w-3.5 h-3.5" />}My location
        </button>
        {(results.length > 0 || searching) && (
          <div className={`absolute z-[600] left-0 right-0 mt-1 rounded-xl border shadow-lg overflow-hidden ${darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200"}`}>
            {searching && <div className={`px-3 py-2.5 text-xs ${subtle}`}>Searching…</div>}
            {results.map((r) => (
              <button key={r.id} type="button" onClick={() => pick(r)} className={`w-full text-left px-3 py-2.5 text-xs flex gap-2 cursor-pointer ${darkMode ? "hover:bg-zinc-900" : "hover:bg-slate-50"}`}>
                <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-500" />
                <span className="min-w-0"><b className="block truncate">{r.title}</b><span className={`block truncate ${subtle}`}>{r.subtitle}</span></span>
              </button>
            ))}
          </div>
        )}
      </div>
      {note && <div className="text-[11px] font-bold text-amber-600">{note}</div>}

      <div className={`relative h-[300px] rounded-2xl overflow-hidden border ${darkMode ? "border-zinc-800" : "border-slate-200"}`}>
        <PartnerAreaMapInner pos={pos} radiusKm={km} onPos={onPos} shop={shop} />
        {/* The pin sits on the middle of the map; pan the map under it. */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 z-[500]" style={{ transform: "translate(-50%, -100%)" }}>
          <svg width="34" height="44" viewBox="0 0 34 44" aria-hidden="true">
            <path d="M17 43C17 43 3 27.5 3 17a14 14 0 1 1 28 0C31 27.5 17 43 17 43Z" fill="#FF5B00" stroke="#fff" strokeWidth="2.5" />
            <circle cx="17" cy="17" r="5.5" fill="#fff" />
          </svg>
        </div>
        {!pos && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 z-[500] flex justify-center">
            <span className="rounded-full bg-[#061838]/85 text-white text-[11px] font-bold px-3 py-1.5">Search, or move the map so the pin is on the shop</span>
          </div>
        )}
        <div className="pointer-events-none absolute left-2 bottom-2 z-[500] flex gap-3 text-[10px] font-bold">
          <span className="rounded bg-white/90 px-1.5 py-0.5 text-[#C2410C]">● His delivery area</span>
          <span className="rounded bg-white/90 px-1.5 py-0.5 text-blue-600">● Your shop's area</span>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-xs font-black">How far he may deliver</span>
          <span className="text-sm font-black tabular-nums">{km} km{km > 0 ? <span className={`ml-2 text-[11px] font-bold ${subtle}`}>about {Math.round(Math.PI * km * km)} km² </span> : null}</span>
        </div>
        <input type="range" min="1" max="50" step="0.5" value={Math.min(50, Math.max(1, km || 1))} onChange={(e) => onRadius(Number(e.target.value))} className="w-full accent-orange-500" aria-label="Delivery distance in kilometres" />
        <div className="flex gap-1.5 flex-wrap">
          {PRESETS.map((p) => (
            <button key={p} type="button" onClick={() => onRadius(p)} className={`px-3 h-8 rounded-full text-[11px] font-bold cursor-pointer ${km === p ? "bg-emerald-500 text-white" : darkMode ? "bg-zinc-900 text-zinc-300" : "bg-slate-100 text-slate-600"}`}>{p} km</button>
          ))}
        </div>
        {pos && <div className={`text-[10px] ${subtle}`}>Pin at {pos.lat.toFixed(5)}, {pos.lng.toFixed(5)}</div>}
      </div>
    </div>
  );
}
