import { ORDER_STATUS, watchDrivers, fetchDrivers } from "./db";

export const DEFAULT_DRIVERS = [
  { id: "DOf5enic8SXBZTupGJbxDrNdrOt2", name: "Rider M4K (m4k3ditz)", phone: "9876543210", email: "m4k3ditz@gmail.com", vehicle: "Scooter" },
  { id: "driver_tariq", name: "Tariq", phone: "9876543210", vehicle: "Scooter" },
  { id: "driver_bilal", name: "Bilal", phone: "9876543211", vehicle: "Scooter" },
  { id: "driver_aamir", name: "Aamir", phone: "9876543212", vehicle: "Scooter" },
];

const ROSTER_KEY = "dashit_driver_roster";

/**
 * Merges a list of Firestore staff drivers with a local roster,
 * giving precedence to Firestore data and avoiding duplicates by ID or email/name.
 */
export function mergeDriversWithRoster(localList = [], firestoreList = []) {
  const merged = [];
  const seenIds = new Set();
  const seenEmails = new Set();

  // 1. Add Firestore drivers first (authoritative source)
  firestoreList.forEach((fd) => {
    if (!fd || !fd.id) return;
    seenIds.add(String(fd.id));
    if (fd.email) seenEmails.add(fd.email.toLowerCase().trim());
    merged.push(fd);
  });

  // 2. Add local roster items that do not duplicate Firestore drivers
  localList.forEach((ld) => {
    if (!ld || !ld.id) return;
    const emailKey = ld.email ? ld.email.toLowerCase().trim() : null;
    if (seenIds.has(String(ld.id))) return;
    if (emailKey && seenEmails.has(emailKey)) return;
    seenIds.add(String(ld.id));
    merged.push(ld);
  });

  return merged;
}

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
        return mergeDriversWithRoster(parsed, DEFAULT_DRIVERS);
      }
    }
  } catch (e) {
    console.warn("Failed reading driver roster from storage:", e);
  }
  return DEFAULT_DRIVERS;
}

/**
 * Watches all drivers in real-time by combining Firestore staff drivers with the local roster.
 * Broadcasts updates via the callback whenever either changes.
 */
export function watchAllDrivers(callback) {
  let firestoreDrivers = [];
  let localDrivers = getDriverRoster();

  const emit = () => {
    const combined = mergeDriversWithRoster(localDrivers, firestoreDrivers);
    callback(combined);
  };

  // 1. Immediate emit of initial state
  emit();

  // 2. Subscribe to Firestore drivers
  const unsubFs = watchDrivers((fsList) => {
    firestoreDrivers = fsList || [];
    emit();
  });

  // 3. Subscribe to local window updates
  const handleLocalUpdate = (e) => {
    localDrivers = (e?.detail && Array.isArray(e.detail)) ? e.detail : getDriverRoster();
    emit();
  };

  if (typeof window !== "undefined") {
    window.addEventListener("dashit_driver_roster_updated", handleLocalUpdate);
    window.addEventListener("storage", handleLocalUpdate);
  }

  return () => {
    if (typeof unsubFs === "function") unsubFs();
    if (typeof window !== "undefined") {
      window.removeEventListener("dashit_driver_roster_updated", handleLocalUpdate);
      window.removeEventListener("storage", handleLocalUpdate);
    }
  };
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
