import { ORDER_STATUS } from "./db";

export const DEFAULT_DRIVERS = [
  { id: "DOf5enic8SXBZTupGJbxDrNdrOt2", name: "Rider M4K (m4k3ditz)", phone: "9876543210", email: "m4k3ditz@gmail.com" },
  { id: "driver_tariq", name: "Tariq", phone: "9876543210" },
  { id: "driver_bilal", name: "Bilal", phone: "9876543211" },
  { id: "driver_aamir", name: "Aamir", phone: "9876543212" },
];

const ROSTER_KEY = "dashit_driver_roster";

/**
 * Reads the driver roster from localStorage with fallback to default team.
 */
export function getDriverRoster() {
  if (typeof window === "undefined") return DEFAULT_DRIVERS;
  try {
    const saved = localStorage.getItem(ROSTER_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn("Failed reading driver roster from storage:", e);
  }
  return DEFAULT_DRIVERS;
}

/**
 * Saves driver roster to localStorage and broadcasts the update.
 */
export function saveDriverRoster(roster) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ROSTER_KEY, JSON.stringify(roster));
    window.dispatchEvent(
      new CustomEvent("dashit_driver_roster_updated", { detail: roster })
    );
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    console.warn("Failed saving driver roster:", e);
  }
}

/**
 * Adds a new driver to the roster.
 */
export function addDriverToRoster({ name, phone = "", vehicle = "Scooter" }) {
  const cleanName = String(name || "").trim();
  if (!cleanName) return null;
  const cleanPhone = String(phone || "").replace(/\D/g, "").slice(0, 10);
  const newDriver = {
    id: `driver_${Date.now()}`,
    name: cleanName,
    phone: cleanPhone,
    vehicle: vehicle || "Scooter",
  };

  const currentRoster = getDriverRoster();
  const nextRoster = [...currentRoster, newDriver];
  saveDriverRoster(nextRoster);
  return newDriver;
}

/**
 * Updates an existing driver in the roster.
 */
export function updateDriverInRoster({ id, name, phone = "", vehicle = "Scooter" }) {
  if (!id) return null;
  const cleanName = String(name || "").trim();
  if (!cleanName) return null;
  const cleanPhone = String(phone || "").replace(/\D/g, "").slice(0, 10);

  const currentRoster = getDriverRoster();
  const nextRoster = currentRoster.map((d) =>
    d.id === id
      ? {
          ...d,
          name: cleanName,
          phone: cleanPhone,
          vehicle: vehicle || d.vehicle || "Scooter",
        }
      : d
  );
  saveDriverRoster(nextRoster);
  return nextRoster.find((d) => d.id === id) || null;
}

/**
 * Removes a driver from the roster by ID.
 */
export function removeDriverFromRoster(driverId) {
  const currentRoster = getDriverRoster();
  const nextRoster = currentRoster.filter((d) => d.id !== driverId);
  saveDriverRoster(nextRoster);
  return nextRoster;
}

/**
 * Calculates how many active out-for-delivery orders each driver currently has.
 * Returns a map of driverId/driverName (lowercase) -> activeCount.
 */
export function getDriverActiveOrderCounts(orders = []) {
  const counts = {};
  orders.forEach((ord) => {
    if (ord.status === ORDER_STATUS.OUT_FOR_DELIVERY) {
      const dId = ord.driverId ? String(ord.driverId) : null;
      const dName = ord.driverName ? String(ord.driverName).toLowerCase().trim() : null;
      if (dId) {
        counts[dId] = (counts[dId] || 0) + 1;
      }
      if (dName) {
        counts[dName] = (counts[dName] || 0) + 1;
      }
    }
  });
  return counts;
}
