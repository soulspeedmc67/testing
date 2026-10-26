import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { MapPin, Search, Crosshair, Loader2, Trash2, Check, Home, Store, Plus } from "lucide-react";
import { storeLocationOf, storePresetsOf, calculateHaversineDistance, DEFAULT_STORE_HUB } from "../../lib/deliveryEta";
import { searchPlacesAutocomplete, reverseGeocodeCoords } from "../../lib/maps";

const MapWithPin = dynamic(() => import("../MapWithPinInner"), { ssr: false });

const km = (a, b) => calculateHaversineDistance(a.lat, a.lng, b.lat, b.lng);
const round6 = (n) => Math.round(Number(n) * 1e6) / 1e6;

/**
 * Where orders are delivered from. The shop picks the spot on the map (or
 * searches, or uses this phone's location), names it, and switches the store
 * to it. Everything that depends on the distance from the store follows the
 * new spot straight away on the website and both apps: the delivery time, the
 * delivery area, the distance charge and the rider's map. Places that are used
 * often ("Home", "Dark store") are saved to switch between with one tap.
 * Saved on config/store: storeLat, storeLng, storeLabel, storePresets.
 */
export default function StoreLocationSettings({ storeConfig = null, onSave, darkMode = false }) {
  const active = storeLocationOf(storeConfig) || { lat: DEFAULT_STORE_HUB.lat, lng: DEFAULT_STORE_HUB.lng, label: "" };
  const presets = storePresetsOf(storeConfig);
  const activeLabel = active.label || (storeLocationOf(storeConfig) ? "Store" : DEFAULT_STORE_HUB.name);

  const [pos, setPos] = useState({ lat: active.lat, lng: active.lng });
  const [name, setName] = useState(active.label || "");
  const [address, setAddress] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [busy, setBusy] = useState("");
  const mapRef = useRef(null);
  const debounce = useRef(null);
  const geocodeTimer = useRef(null);

  // Another device may move the store while this screen is open.
  const activeKey = `${active.lat},${active.lng}`;
  useEffect(() => {
    setPos({ lat: active.lat, lng: active.lng });
    setName(active.label || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  // Name the spot under the pin once it has stopped moving.
  useEffect(() => {
    clearTimeout(geocodeTimer.current);
    geocodeTimer.current = setTimeout(async () => {
      try {
        const found = await reverseGeocodeCoords(pos.lat, pos.lng);
        setAddress(found?.address || found?.area || "");
      } catch (e) {
        setAddress("");
      }
    }, 700);
    return () => clearTimeout(geocodeTimer.current);
  }, [pos.lat, pos.lng]);

  const moveTo = (next) => {
    setPos({ lat: next.lat, lng: next.lng });
    if (mapRef.current) mapRef.current.setView([next.lat, next.lng], Math.max(mapRef.current.getZoom(), 16), { animate: true });
  };

  const onQuery = (value) => {
    setQuery(value);
    clearTimeout(debounce.current);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    debounce.current = setTimeout(async () => {
      try {
        setResults(await searchPlacesAutocomplete(value));
      } catch (e) {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 450);
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return alert("This device can't share its location.");
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        moveTo({ lat: p.coords.latitude, lng: p.coords.longitude });
      },
      () => {
        setLocating(false);
        alert("Couldn't get your location. Allow location for this page, or move the pin by hand.");
      },
      { enableHighAccuracy: true, timeout: 12000 }
    );
  };

  const save = async (key, patch, message) => {
    if (!onSave || busy) return;
    setBusy(key);
    try {
      await onSave(patch, message);
    } catch (e) {
      // The console shows why.
    } finally {
      setBusy("");
    }
  };

  const spot = { lat: round6(pos.lat), lng: round6(pos.lng) };
  const label = name.trim().slice(0, 60);
  const movedKm = km(spot, active);
  const isActive = movedKm < 0.005;

  const switchStore = (target, targetName) => {
    const far = km(target, active);
    const title = targetName || "this place";
    if (
      far > 0.005 &&
      !window.confirm(
        `Deliver from ${title}?\n\nThe delivery time, the delivery area and the distance charge for every order will be worked out from there${
          far >= 1 ? ` (${far.toFixed(1)} km from where the store is now)` : ""
        }. The website and both apps follow straight away.`
      )
    ) {
      return;
    }
    save(
      "switch",
      { storeLat: round6(target.lat), storeLng: round6(target.lng), storeLabel: (targetName || "").slice(0, 60) },
      `Done. Orders are now delivered from ${title}.`
    );
  };

  const savePreset = () => {
    if (!label) return alert("Give this place a name first, like Home.");
    if (presets.length >= 20) return alert("You can save up to 20 places. Remove one first.");
    const existing = presets.find((p) => p.name.toLowerCase() === label.toLowerCase());
    const next = existing
      ? presets.map((p) => (p.id === existing.id ? { ...p, lat: spot.lat, lng: spot.lng, address } : p))
      : [...presets, { id: `place-${Date.now()}`, name: label, address, lat: spot.lat, lng: spot.lng }];
    save("preset", { storePresets: next }, `Saved "${label}" to your places.`);
  };

  const removePreset = (p) => {
    if (!window.confirm(`Remove "${p.name}" from your saved places?`)) return;
    save("preset", { storePresets: presets.filter((x) => x.id !== p.id) }, `Removed "${p.name}".`);
  };

  const card = `rounded-2xl border p-5 space-y-4 transition-colors ${
    darkMode ? "bg-[#14161E] border-zinc-800" : "bg-white border-slate-200 shadow-xs"
  }`;
  const input = `w-full text-xs font-bold px-3 py-2 rounded-xl border outline-none ${
    darkMode
      ? "bg-[#1A1D26] border-zinc-700 text-white focus:border-[#FF5B00]"
      : "bg-slate-50 border-slate-200 text-slate-900 focus:border-[#FF5B00]"
  }`;
  const hint = "text-[11px] text-slate-500 dark:text-zinc-400";
  const button =
    "inline-flex items-center justify-center gap-1.5 text-xs font-bold px-4 py-2 rounded-xl transition-all active:scale-95 disabled:opacity-50 cursor-pointer";
  const primary = `${button} bg-[#FF5B00] hover:bg-[#E04E00] text-white shadow-xs`;
  const quiet = `${button} border ${darkMode ? "border-zinc-700 text-zinc-200 hover:bg-zinc-800" : "border-slate-200 text-slate-700 hover:bg-slate-50"}`;

  return (
    <div className={card}>
      <div className="flex items-center space-x-2">
        <Store className="w-5 h-5 text-[#FF5B00]" />
        <h3 className="font-black text-sm text-slate-900 dark:text-white">Where orders are delivered from</h3>
      </div>

      <div className={`rounded-xl px-3 py-2.5 flex items-center gap-2.5 ${darkMode ? "bg-emerald-950/30" : "bg-emerald-50"}`}>
        <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
        <p className="text-xs text-slate-700 dark:text-zinc-200">
          <span className="font-black">Now: {activeLabel}.</span>{" "}
          <span className="text-slate-500 dark:text-zinc-400 tabular-nums">
            {active.lat.toFixed(4)}, {active.lng.toFixed(4)}
          </span>
        </p>
      </div>

      {presets.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">My places</p>
          <div className="space-y-2">
            {presets.map((p) => {
              const here = km(p, active) < 0.005;
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 ${
                    here ? "border-emerald-500/60" : darkMode ? "border-zinc-800" : "border-slate-200"
                  }`}
                >
                  <span className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-zinc-800 flex items-center justify-center shrink-0">
                    {/home/i.test(p.name) ? <Home className="w-4 h-4 text-slate-600 dark:text-zinc-300" /> : <Store className="w-4 h-4 text-slate-600 dark:text-zinc-300" />}
                  </span>
                  <div className="min-w-0 grow">
                    <p className="text-xs font-black text-slate-900 dark:text-white truncate">{p.name}</p>
                    <p className={`${hint} truncate`}>{p.address || `${p.lat.toFixed(4)}, ${p.lng.toFixed(4)}`}</p>
                  </div>
                  {here ? (
                    <span className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-600">
                      <Check className="w-3.5 h-3.5" /> In use
                    </span>
                  ) : (
                    <>
                      <button type="button" disabled={Boolean(busy)} onClick={() => switchStore(p, p.name)} className={primary}>
                        Use
                      </button>
                      <button
                        type="button"
                        disabled={Boolean(busy)}
                        onClick={() => removePreset(p)}
                        aria-label={`Remove ${p.name}`}
                        className="p-2 rounded-lg text-slate-400 hover:text-red-500 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="space-y-3 pt-1">
        <p className="text-[11px] font-black uppercase tracking-wider text-slate-400">Pick a new place</p>

        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search a place or area"
            className={`${input} pl-9`}
            aria-label="Search a place"
          />
          {searching && <Loader2 className="w-4 h-4 animate-spin text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />}
        </div>
        {results.length > 0 && (
          <ul className={`rounded-xl border divide-y overflow-hidden ${darkMode ? "border-zinc-800 divide-zinc-800" : "border-slate-200 divide-slate-100"}`}>
            {results.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => {
                    moveTo(r);
                    setQuery("");
                    setResults([]);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 dark:hover:bg-zinc-800 cursor-pointer"
                >
                  <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{r.title}</p>
                  <p className={`${hint} truncate`}>{r.subtitle}</p>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="relative h-64 rounded-xl overflow-hidden border border-slate-200 dark:border-zinc-800">
          <MapWithPin pos={pos} onChangePos={setPos} mapRef={mapRef} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full pointer-events-none z-[500]">
            <svg width="32" height="42" viewBox="0 0 24 30" fill="none">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 8.5 12 18 12 18s12-9.5 12-18c0-6.63-5.37-12-12-12z" fill="#EA4335" />
              <circle cx="12" cy="11" r="4.5" fill="#ffffff" />
            </svg>
          </div>
          <button
            type="button"
            onClick={useMyLocation}
            aria-label="Use my location"
            className="absolute bottom-3 right-3 z-[500] w-10 h-10 rounded-full bg-white shadow-md flex items-center justify-center text-slate-700 active:scale-95 cursor-pointer"
          >
            {locating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Crosshair className="w-4 h-4" />}
          </button>
        </div>
        <p className={hint}>
          Drag the map so the pin is on the spot, or tap it. {address ? <span className="font-semibold">{address}</span> : null}
        </p>

        <div>
          <label htmlFor="store-place-name" className="block text-[11px] font-bold text-slate-600 dark:text-zinc-400 mb-1">
            Name of this place
          </label>
          <input
            id="store-place-name"
            type="text"
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Home, Dark store, Shop 2…"
            className={input}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={Boolean(busy) || isActive}
            onClick={() => switchStore(spot, label || "this place")}
            className={primary}
          >
            {busy === "switch" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <MapPin className="w-3.5 h-3.5" />}
            {isActive ? "This is where the store is" : "Deliver from here"}
          </button>
          <button type="button" disabled={Boolean(busy)} onClick={savePreset} className={quiet}>
            {busy === "preset" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Save to my places
          </button>
        </div>
        <p className={hint}>
          The delivery time, the delivery area (the distance you set under Minimum order and fees), the distance charge and the
          rider's map all follow the place you choose, on every order from then on. Apps installed before this setting existed
          keep using the old spot.
        </p>
      </div>
    </div>
  );
}
