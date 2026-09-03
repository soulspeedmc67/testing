/**
 * 100% Free OpenStreetMap & Nominatim Geocoding Engine
 * Zero API keys or billing required.
 */

export async function reverseGeocodeCoords(lat, lng) {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      { headers: { "User-Agent": "DashitDeliveryApp/1.0" } }
    );
    const data = await res.json();
    if (data && data.address) {
      const area =
        data.address.suburb ||
        data.address.village ||
        data.address.neighbourhood ||
        data.address.residential ||
        data.address.town ||
        data.address.city ||
        "Anantnag";

      const parts = [
        data.address.road,
        data.address.village,
        data.address.suburb,
        data.address.postcode,
        data.address.county || "Anantnag"
      ].filter(Boolean);

      // Deduplicate consecutive words
      const uniqueParts = parts.filter((v, i, a) => a.indexOf(v) === i);
      const address = uniqueParts.length > 0 ? uniqueParts.join(", ") : data.display_name;

      return {
        area,
        address: `${address}. (${area})`
      };
    }
  } catch (e) {
    console.warn("Nominatim reverse geocoding fallback error:", e);
  }

  return {
    area: "Anantnag",
    address: `Nai Basti, Anantnag 192101. (Lat: ${lat.toFixed(4)}, Lng: ${lng.toFixed(4)})`
  };
}

export async function searchPlacesAutocomplete(query) {
  if (!query || query.trim().length < 2) return [];

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query
      )}&countrycodes=in&limit=6`,
      { headers: { "User-Agent": "DashitDeliveryApp/1.0" } }
    );
    const data = await res.json();
    return data.map((item) => ({
      id: item.place_id,
      title: item.name || item.display_name.split(",")[0],
      subtitle: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon)
    }));
  } catch (e) {
    console.warn("Nominatim search error:", e);
    return [];
  }
}

/**
 * Real-world turn-by-turn road route calculator using OSRM (100% Free)
 * Returns exact road coordinates that hug actual street geometry in Anantnag.
 */
export async function fetchRoadRoute(startLat, startLng, endLat, endLng) {
  try {
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`
    );
    const data = await res.json();
    if (data.code === "Ok" && data.routes && data.routes[0]) {
      const route = data.routes[0];
      const points = route.geometry.coordinates.map(([lng, lat]) => [lat, lng]);
      const distanceKm = (route.distance / 1000).toFixed(1);
      const durationMins = Math.max(3, Math.ceil(route.duration / 60));
      return {
        points,
        distanceKm,
        durationMins
      };
    }
  } catch (e) {
    console.warn("OSRM routing network error:", e);
  }

  return {
    points: [
      [startLat, startLng],
      [startLat + (endLat - startLat) * 0.5, startLng + (endLng - startLng) * 0.5],
      [endLat, endLng]
    ],
    distanceKm: "1.8",
    durationMins: 6
  };
}
