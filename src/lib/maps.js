/**
 * DASHit Geocoding & Routing Engine
 * Built-in anti-rate-limit protection:
 * 1. In-memory LRU caching for autocomplete, reverse geocoding, and road routes.
 * 2. Minimum 1000ms request queue throttle to strictly respect OpenStreetMap / Nominatim usage policies.
 * 3. Local Anantnag POI database fallback for instant 0ms offline search and 429 resiliency.
 */

// Local Anantnag database for instant search and offline fallback
export const ANANTNAG_LOCALITIES = [
  { name: "Lal Chowk", area: "Lal Chowk", lat: 33.735832, lng: 75.143614, aliases: ["lal chowk", "clock tower", "center"] },
  { name: "Nai Basti (Near Petrol Pump)", area: "Nai Basti", lat: 33.7311, lng: 75.1487, aliases: ["nai basti", "naibasti", "petrol pump"] },
  { name: "KP Road (Khanabal-Pahalgam Road)", area: "KP Road", lat: 33.7290, lng: 75.1550, aliases: ["kp road", "khanabal pahalgam road", "kp"] },
  { name: "Khanabal Junction & Degree College", area: "Khanabal", lat: 33.7440, lng: 75.1320, aliases: ["khanabal", "khannabal", "degree college", "khanabal bridge"] },
  { name: "Janglat Mandi (Hospital Road)", area: "Janglat Mandi", lat: 33.7265, lng: 75.1585, aliases: ["janglat mandi", "janglat", "mandi", "hospital road"] },
  { name: "Ashajipora", area: "Ashajipora", lat: 33.7230, lng: 75.1610, aliases: ["ashajipora", "ashaji pora"] },
  { name: "Lazibal", area: "Lazibal", lat: 33.7410, lng: 75.1410, aliases: ["lazibal", "lazbal"] },
  { name: "Anchidora", area: "Anchidora", lat: 33.7390, lng: 75.1490, aliases: ["anchidora", "anchi dora"] },
  { name: "Tikbag Khanabal", area: "Tikbag", lat: 33.7470, lng: 75.1350, aliases: ["tikbag", "tik bag", "tikbagh"] },
  { name: "Mattan / Martand", area: "Mattan", lat: 33.7660, lng: 75.2080, aliases: ["mattan", "martand", "mattan temple"] },
  { name: "Dialgam", area: "Dialgam", lat: 33.7120, lng: 75.1750, aliases: ["dialgam", "dailgam"] },
  { name: "Sherbagh", area: "Sherbagh", lat: 33.7320, lng: 75.1510, aliases: ["sherbagh", "sher bagh"] },
  { name: "Reshi Bazar", area: "Reshi Bazar", lat: 33.7340, lng: 75.1490, aliases: ["reshi bazar", "rishi bazar"] },
  { name: "Brakpora", area: "Brakpora", lat: 33.7180, lng: 75.1680, aliases: ["brakpora", "brak pora"] },
  { name: "Achabal Adda", area: "Achabal Adda", lat: 33.7285, lng: 75.1520, aliases: ["achabal adda", "achabal bus stand"] },
  { name: "Chee Anantnag", area: "Chee", lat: 33.7380, lng: 75.1380, aliases: ["chee", "che"] },
  { name: "Harnag", area: "Harnag", lat: 33.7490, lng: 75.1280, aliases: ["harnag", "railway station"] },
  { name: "Mirbazar", area: "Mirbazar", lat: 33.7050, lng: 75.1200, aliases: ["mirbazar", "mir bazar"] }
];

// Helper: Calculate distance in km
function calculateDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// Find closest locality in Anantnag
export function findNearestAnantnagLocality(lat, lng) {
  let closest = ANANTNAG_LOCALITIES[0];
  let minD = Infinity;
  for (const loc of ANANTNAG_LOCALITIES) {
    const d = calculateDistanceKm(lat, lng, loc.lat, loc.lng);
    if (d < minD) {
      minD = d;
      closest = loc;
    }
  }
  return { ...closest, distanceKm: minD.toFixed(1) };
}

// In-Memory Caches
const autocompleteCache = new Map();
const reverseGeocodeCache = new Map();
const roadRouteCache = new Map();

// Rate-limiting Request Throttle for Nominatim (ensures minimum 1100ms spacing between external requests)
let lastNominatimCallTime = 0;
async function throttleNominatimRequest() {
  const now = Date.now();
  const timeSinceLast = now - lastNominatimCallTime;
  if (timeSinceLast < 1100) {
    await new Promise((res) => setTimeout(res, 1100 - timeSinceLast));
  }
  lastNominatimCallTime = Date.now();
}

/**
 * Reverse Geocode with Caching & Offline Locality Fallback
 */
export async function reverseGeocodeCoords(lat, lng) {
  /* With no coordinates there is nothing to name. This used to answer
     "Lal Chowk" — the dark store's own address — so a failed lookup silently
     labelled the customer's pin as the shop. */
  if (!lat || !lng) {
    return { area: "", address: "" };
  }

  // Round coordinates to 4 decimal places (~11m accuracy) for cache key
  const cacheKey = `${Number(lat).toFixed(4)},${Number(lng).toFixed(4)}`;
  if (reverseGeocodeCache.has(cacheKey)) {
    return reverseGeocodeCache.get(cacheKey);
  }

  try {
    await throttleNominatimRequest();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      {
        headers: { "User-Agent": "DashitAnantnagDelivery/1.0 (contact@dashit.co.in)" },
        signal: controller.signal
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data && data.address) {
        /* Most specific locality wins.
           `suburb` used to be checked first, and OpenStreetMap tags almost the
           whole of Anantnag town with suburb = "Lal Chowk" — so a pin dropped in
           Batpora Khanabal (which OSM does return, as `village`) still came back
           labelled "Lal Chowk", and every saved address looked identical. The
           narrow fields are now preferred and `suburb` is a late fallback. */
        const area =
          data.address.neighbourhood ||
          data.address.hamlet ||
          data.address.residential ||
          data.address.quarter ||
          data.address.village ||
          data.address.suburb ||
          data.address.town ||
          data.address.city_district ||
          data.address.city ||
          "Anantnag";

        /* The broad suburb is only added when nothing more specific named the
           place, so an address does not read "…, Batpora Khanabal, Lal Chowk, …"
           where "Lal Chowk" is just OSM's name for half the town. */
        const specificLocality =
          data.address.neighbourhood ||
          data.address.hamlet ||
          data.address.residential ||
          data.address.quarter ||
          data.address.village;

        const parts = [
          data.address.road,
          specificLocality,
          specificLocality ? null : data.address.suburb,
          data.address.postcode,
          data.address.county || "Anantnag"
        ].filter(Boolean);

        const uniqueParts = parts.filter((v, i, a) => a.indexOf(v) === i);
        const address = uniqueParts.length > 0 ? uniqueParts.join(", ") : data.display_name;

        /* The area is NOT appended to the address. It used to be tacked on as
           ". (Kurhama)", and callers then prefixed the area again, producing
           addresses like "Lal Chowk, Lal Chowk, Anantnag - 192101". The address
           already contains the locality; the `area` field is for the heading. */
        const result = { area, address };

        // Cache result (capped to 100 entries)
        if (reverseGeocodeCache.size > 100) {
          const firstKey = reverseGeocodeCache.keys().next().value;
          reverseGeocodeCache.delete(firstKey);
        }
        reverseGeocodeCache.set(cacheKey, result);

        return result;
      }
    }
  } catch (e) {
    console.warn("Nominatim reverse geocode rate-limit or network notice, using local database:", e.message);
  }

  /* Fallback: nearest known Anantnag locality. The distance to that landmark is
     an internal detail of the lookup, not part of anyone's address — it used to
     be written into the saved address as "(0.4 km from landmark)" and printed on
     the order. */
  const nearest = findNearestAnantnagLocality(lat, lng);
  const fallbackResult = {
    area: nearest.area,
    address: `${nearest.area}, Anantnag 192101`,
    approximate: true,
  };
  reverseGeocodeCache.set(cacheKey, fallbackResult);
  return fallbackResult;
}

/**
 * Autocomplete Search with Instant Local Anantnag Matching + Cached Nominatim
 */
export async function searchPlacesAutocomplete(query) {
  if (!query || query.trim().length < 2) return [];

  const cleanQuery = query.trim().toLowerCase();

  // 1. Instant match from local Anantnag database (0ms latency, zero rate limit)
  const localMatches = ANANTNAG_LOCALITIES.filter((loc) => {
    return (
      loc.name.toLowerCase().includes(cleanQuery) ||
      loc.area.toLowerCase().includes(cleanQuery) ||
      (loc.aliases && loc.aliases.some((al) => al.includes(cleanQuery)))
    );
  }).map((loc) => ({
    id: `local-${loc.area}`,
    title: loc.name,
    subtitle: `${loc.area}, Anantnag, Jammu & Kashmir (192101)`,
    lat: loc.lat,
    lng: loc.lng
  }));

  // Check cache for external results
  if (autocompleteCache.has(cleanQuery)) {
    const cached = autocompleteCache.get(cleanQuery);
    // Combine local matches with cached external matches (deduplicated)
    const combined = [...localMatches];
    cached.forEach((c) => {
      if (!combined.some((m) => Math.hypot(m.lat - c.lat, m.lng - c.lng) < 0.003)) {
        combined.push(c);
      }
    });
    return combined.slice(0, 6);
  }

  try {
    await throttleNominatimRequest();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);

    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        `${cleanQuery}, Anantnag`
      )}&countrycodes=in&limit=5`,
      {
        headers: { "User-Agent": "DashitAnantnagDelivery/1.0 (contact@dashit.co.in)" },
        signal: controller.signal
      }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      const parsedExternal = (data || []).map((item) => ({
        id: String(item.place_id),
        title: item.name || item.display_name.split(",")[0],
        subtitle: item.display_name,
        lat: parseFloat(item.lat),
        lng: parseFloat(item.lon)
      }));

      // Cache the external results
      if (autocompleteCache.size > 150) {
        const firstKey = autocompleteCache.keys().next().value;
        autocompleteCache.delete(firstKey);
      }
      autocompleteCache.set(cleanQuery, parsedExternal);

      const combined = [...localMatches];
      parsedExternal.forEach((c) => {
        if (!combined.some((m) => Math.hypot(m.lat - c.lat, m.lng - c.lng) < 0.003)) {
          combined.push(c);
        }
      });
      return combined.slice(0, 6);
    }
  } catch (e) {
    console.warn("Nominatim search notice (served from local database):", e.message);
  }

  // If external call failed or timed out, return local matches
  return localMatches;
}

/**
 * Real-world turn-by-turn road route calculator with Cache
 */
export async function fetchRoadRoute(startLat, startLng, endLat, endLng) {
  const sLat = Number(startLat || 33.735832);
  const sLng = Number(startLng || 75.143614);
  const eLat = Number(endLat || 33.7385);
  const eLng = Number(endLng || 75.1565);

  const cacheKey = `${sLat.toFixed(3)},${sLng.toFixed(3)}->${eLat.toFixed(3)},${eLng.toFixed(3)}`;
  if (roadRouteCache.has(cacheKey)) {
    return roadRouteCache.get(cacheKey);
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${sLng},${sLat};${eLng},${eLat}?overview=full&geometries=geojson`,
      { signal: controller.signal }
    );
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.code === "Ok" && data.routes && data.routes[0]) {
        const route = data.routes[0];
        const points = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
        const distanceKm = (route.distance / 1000).toFixed(1);
        const durationMins = Math.max(3, Math.ceil(route.duration / 60));
        const result = {
          points,
          distanceKm,
          durationMins
        };

        if (roadRouteCache.size > 100) {
          const firstKey = roadRouteCache.keys().next().value;
          roadRouteCache.delete(firstKey);
        }
        roadRouteCache.set(cacheKey, result);

        return result;
      }
    }
  } catch (e) {
    console.warn("OSRM routing network notice (using straight road interpolation):", e.message);
  }

  // Fallback road geometry with intermediate waypoint
  const fallback = {
    points: [
      [sLat, sLng],
      [sLat + (eLat - sLat) * 0.5, sLng + (eLng - sLng) * 0.5],
      [eLat, eLng]
    ],
    distanceKm: calculateDistanceKm(sLat, sLng, eLat, eLng).toFixed(1) || "1.8",
    durationMins: Math.max(3, Math.ceil(calculateDistanceKm(sLat, sLng, eLat, eLng) * 3))
  };

  roadRouteCache.set(cacheKey, fallback);
  return fallback;
}

export * from "./deliveryEta";

