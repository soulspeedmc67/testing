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
