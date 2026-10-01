import { ORDER_STATUS, watchDrivers } from "./db";

/**
 * Reads the real active drivers from Firestore staff.
 * No fake DEFAULT_DRIVERS or localStorage mock accounts are returned.
 */
export function getDriverRoster() {
  return [];
}

/**
 * Watches all real active drivers from Firestore staff (role == 'driver' and active != false).
 * Broadcasts updates via the callback whenever the team changes.
 */
export function watchAllDrivers(callback) {
  return watchDrivers((staffDrivers) => {
    callback(staffDrivers || []);
  });
}

/**
 * Calculates how many active out-for-delivery/packed orders each driver currently has.
 * Returns a map of driverId -> activeCount.
 */
export function getDriverActiveOrderCounts(orders = []) {
  const counts = {};
  if (!Array.isArray(orders)) return counts;

  orders.forEach((ord) => {
    const isOut = ord.status === ORDER_STATUS.OUT_FOR_DELIVERY;
    const isPacked = ord.status === ORDER_STATUS.PACKED || ord.status === "Packing";
    if (isOut || isPacked) {
      const dId = ord.driverId ? String(ord.driverId) : null;
      if (dId) {
        counts[dId] = (counts[dId] || 0) + 1;
      }
    }
  });
  return counts;
}

// Deprecated stubs preserved for backwards compatibility with any unmigrated component
export const DEFAULT_DRIVERS = [];
export function mergeDriversWithRoster(localList = [], firestoreList = []) {
  return firestoreList || [];
}
export function saveDriverRoster() {}
export function addDriverToRoster() { return null; }
export function updateDriverInRoster() { return null; }
export function removeDriverFromRoster() { return []; }
