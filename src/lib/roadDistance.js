import { DARK_STORE_HUB } from "./deliveryEta";

/**
 * Shortest road distance calculation via OSRM is disabled per store policy:
 * distance is calculated straight-line (Haversine), and the store admin decides
 * order acceptance directly.
 */
export async function measureRoadKm(lat, lng) {
  return null;
}

/** Which point a saved road distance belongs to. */
export const pointKey = (loc) => `${Number(loc?.lat).toFixed(5)},${Number(loc?.lng).toFixed(5)}`;
