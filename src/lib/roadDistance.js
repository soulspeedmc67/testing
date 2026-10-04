import { DARK_STORE_HUB } from "./deliveryEta";

/**
 * The shortest driving distance from the store to a point, in km, from the
 * OSRM road router. null when the router can't be reached: the caller then
 * keeps the straight-line estimate rather than guessing.
 */
export async function measureRoadKm(lat, lng) {
  const toLat = Number(lat);
  const toLng = Number(lng);
  if (!Number.isFinite(toLat) || !Number.isFinite(toLng)) return null;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    const res = await fetch(
      `https://router.project-osrm.org/route/v1/driving/${DARK_STORE_HUB.lng},${DARK_STORE_HUB.lat};${toLng},${toLat}?overview=false`,
      { signal: controller.signal }
    );
    clearTimeout(timer);
    if (!res.ok) return null;
    const data = await res.json();
    const metres = data?.routes?.[0]?.distance;
    return data?.code === "Ok" && Number.isFinite(metres) ? Math.round(metres / 10) / 100 : null;
  } catch (e) {
    return null;
  }
}

/** Which point a saved road distance belongs to. */
export const pointKey = (loc) => `${Number(loc?.lat).toFixed(5)},${Number(loc?.lng).toFixed(5)}`;
