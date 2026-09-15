/**
 * DASHit Delivery ETA & Distance Calculation Engine
 * Calculates real-world transit time from the Anantnag Central Dark Store Hub
 * with a realistic traffic model, order packing buffer, and a +2-3 minute safety margin.
 */

// Anantnag Central Dark Store Hub (Exact location: https://maps.app.goo.gl/kKouW9fsgyGBJezT7)
export const DARK_STORE_HUB = {
  lat: 33.735832,
  lng: 75.143614,
  name: "Anantnag Store",
  address: "Lal Chowk, Anantnag 192101",
};

/**
 * Calculates straight-line distance in kilometers using the Haversine formula
 */
export function calculateHaversineDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 1.2;
  const R = 6371; // Earth radius in km
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

// Maximum delivery radius strictly enforced from the Central Dark Store
export const MAX_DELIVERY_RADIUS_KM = 5.0;

/**
 * Calculates delivery ETA in minutes from the hub to customer location.
 *
 * Real-world modeling:
 * 1. Delivery restricted strictly within 5.0 km radius.
 * 2. Road distance is ~1.25x straight-line distance in town streets.
 * 3. Courier scooter speed in Anantnag traffic is ~18-20 km/h (~3.3 mins per km).
 * 4. Store bag picking & packing time: 3 mins.
 * 5. Safety buffer: +3 mins (ensures couriers never miss promised ETA).
 * 6. Base floor: 8 mins for close neighborhood drops.
 */
export function calculateDeliveryEta(targetCoords, hubCoords = DARK_STORE_HUB) {
  if (!targetCoords || (!targetCoords.lat && !targetCoords.latitude)) {
    return {
      etaMinutes: 10,
      distanceKm: 1.2,
      distanceFormatted: "1.2 km away",
      displayText: "Fast delivery",
      pillText: "Fast",
      isAccurate: false,
      isDeliverable: true,
      maxRadiusKm: MAX_DELIVERY_RADIUS_KM,
    };
  }

  const tLat = Number(targetCoords.lat || targetCoords.latitude);
  const tLng = Number(targetCoords.lng || targetCoords.longitude);

  const rawDistKm = calculateHaversineDistance(
    hubCoords.lat,
    hubCoords.lng,
    tLat,
    tLng
  );

  // Strictly enforce 5.0 km radius limit
  const isDeliverable = rawDistKm <= MAX_DELIVERY_RADIUS_KM;

  if (!isDeliverable) {
    const formatted = `${rawDistKm.toFixed(1)} km away`;
    return {
      etaMinutes: null,
      distanceKm: parseFloat(rawDistKm.toFixed(1)),
      distanceFormatted: formatted,
      displayText: "Not available here yet",
      pillText: "Beyond 5km",
      isAccurate: true,
      isDeliverable: false,
      maxRadiusKm: MAX_DELIVERY_RADIUS_KM,
      warningText: "Delivery is not available in your area yet. We are expanding soon.",
    };
  }

  // Road factor in town is ~1.25x straight-line
  const roadDistKm = Math.max(0.4, rawDistKm * 1.25);

  // Speed: ~18 km/h -> 1 km takes ~3.33 mins
  const drivingMinutes = (roadDistKm / 18) * 60;
  const packingMinutes = 3;
  const safetyBuffer = 3; // +2-3 extra minutes buffer as requested by user

  const totalMinutes = Math.max(8, Math.round(packingMinutes + drivingMinutes + safetyBuffer));

  const distanceFormatted =
    roadDistKm < 1
      ? `${Math.round(roadDistKm * 1000)} m away`
      : `${roadDistKm.toFixed(1)} km away`;

  return {
    etaMinutes: totalMinutes,
    distanceKm: parseFloat(roadDistKm.toFixed(1)),
    distanceFormatted,
    displayText: `${totalMinutes} minutes`,
    pillText: `${totalMinutes} Mins`,
    isAccurate: true,
    isDeliverable: true,
    maxRadiusKm: MAX_DELIVERY_RADIUS_KM,
  };
}

/**
 * Calculates dynamic delivery ETA from the rider's LIVE position,
 * accounting for queue position, prior stops, and Kashmir street traffic.
 *
 * @param {Object} params
 * @param {{ latitude: number, longitude: number }|{ lat: number, lng: number }} params.driverCoords - Current driver GPS
 * @param {{ lat: number, lng: number }|{ latitude: number, longitude: number }} params.orderCoords - Customer drop location
 * @param {number} [params.queuePosition=0] - 0 if current drop, >0 if stops ahead
 * @param {Array<{ lat: number, lng: number }>} [params.precedingStops=[]] - Preceding drop locations in the driver's queue
 * @param {Function} [params.roadRouteFn] - Optional OSRM road router
 */
export async function calculateLiveOrderEta({
  driverCoords,
  orderCoords,
  queuePosition = 0,
  precedingStops = [],
  roadRouteFn = null,
}) {
  const dLat = Number(driverCoords?.latitude ?? driverCoords?.lat);
  const dLng = Number(driverCoords?.longitude ?? driverCoords?.lng);
  const oLat = Number(orderCoords?.lat ?? orderCoords?.latitude);
  const oLng = Number(orderCoords?.lng ?? orderCoords?.longitude);

  if (!dLat || !dLng || !oLat || !oLng) {
    return {
      etaMinutes: 7,
      distanceKm: "1.2",
      distanceFormatted: "1.2 km away",
      statusText: "On the way",
      isDirectDrop: true,
      stopsAhead: 0,
    };
  }

  // Helper to get distance & duration between two points
  const getLeg = async (lat1, lon1, lat2, lon2) => {
    if (typeof roadRouteFn === "function") {
      try {
        const res = await roadRouteFn(lat1, lon1, lat2, lon2);
        if (res && res.durationMins) {
          return {
            distanceKm: parseFloat(res.distanceKm || "1.0"),
            durationMins: res.durationMins,
          };
        }
      } catch (e) {}
    }
    // Fallback: Haversine with 1.25 road winding factor at ~18 km/h
    const straightKm = calculateHaversineDistance(lat1, lon1, lat2, lon2);
    const roadKm = Math.max(0.3, straightKm * 1.25);
    const mins = Math.max(2, Math.ceil((roadKm / 18) * 60));
    return { distanceKm: roadKm, durationMins: mins };
  };

  // 1. Direct Next Drop (Queue Position 0)
  if (queuePosition === 0) {
    const directLeg = await getLeg(dLat, dLng, oLat, oLng);
    const totalMinutes = Math.max(2, directLeg.durationMins + 2); // +2 min final approach buffer
    const distFormatted =
      directLeg.distanceKm < 1
        ? `${Math.round(directLeg.distanceKm * 1000)} m`
        : `${directLeg.distanceKm.toFixed(1)} km`;

    return {
      etaMinutes: totalMinutes,
      distanceKm: directLeg.distanceKm.toFixed(1),
      distanceFormatted: `${distFormatted} away`,
      statusText:
        totalMinutes <= 2
          ? "Arriving at your location now"
          : `Arriving in ~${totalMinutes} mins`,
      isDirectDrop: true,
      stopsAhead: 0,
    };
  }

  // 2. Downstream Drops (Driver has 1+ stops before this customer)
  let cumulativeMins = 0;
  let cumulativeDist = 0;
  let prevLat = dLat;
  let prevLng = dLng;

  // Process all preceding stops
  const stopsToTraverse = Array.isArray(precedingStops) ? precedingStops : [];
  for (const stop of stopsToTraverse) {
    const sLat = Number(stop.lat || stop.latitude);
    const sLng = Number(stop.lng || stop.longitude);
    if (sLat && sLng) {
      const leg = await getLeg(prevLat, prevLng, sLat, sLng);
      cumulativeMins += leg.durationMins + 2.5; // +2.5 min door/OTP handover buffer per stop
      cumulativeDist += leg.distanceKm;
      prevLat = sLat;
      prevLng = sLng;
    }
  }

  // Final leg to customer drop
  const finalLeg = await getLeg(prevLat, prevLng, oLat, oLng);
  cumulativeMins += finalLeg.durationMins;
  cumulativeDist += finalLeg.distanceKm;

  // Add +3 mins DASHit safety buffer
  const finalMinutes = Math.max(5, Math.round(cumulativeMins + 3));
  const distFormatted = `${cumulativeDist.toFixed(1)} km`;

  return {
    etaMinutes: finalMinutes,
    distanceKm: cumulativeDist.toFixed(1),
    distanceFormatted: `${distFormatted} away`,
    statusText:
      stopsToTraverse.length === 1
        ? `Rider is dropping a nearby order first · ~${finalMinutes} mins`
        : `Rider has ${stopsToTraverse.length} stops ahead · ~${finalMinutes} mins`,
    isDirectDrop: false,
    stopsAhead: stopsToTraverse.length,
  };
}

/* --------------------------------------------------------------- progress */

/**
 * Progress floors per order stage. The customer's progress bar is anchored to
 * these so it can never run backwards when a stage advances, and the stretch
 * between "Out for Delivery" and arrival is filled in from how much of the ride
 * is actually left rather than from a timer.
 */
export const ORDER_PROGRESS_FLOOR = {
  Placed: 12,
  Packed: 34,
  "Out for Delivery": 58,
  Delivered: 100,
  Cancelled: 0,
};

/**
 * Real progress of one delivery, 0-100.
 *
 * During the ride the bar is driven by distance covered, not by elapsed time:
 * `baselineKm` is how far the rider was from this drop when they set off, and
 * `remainingKm` is how far they are now, so a rider held up in traffic stalls
 * the bar instead of letting it march on to 100% while they sit still.
 */
export function computeOrderProgress({ status, remainingKm, baselineKm }) {
  if (status === "Delivered") return 100;
  if (status === "Cancelled") return 0;

  const floor = ORDER_PROGRESS_FLOOR[status] ?? ORDER_PROGRESS_FLOOR.Placed;
  if (status !== "Out for Delivery") return floor;

  const remaining = Number(remainingKm);
  const baseline = Number(baselineKm);
  if (!Number.isFinite(remaining) || !Number.isFinite(baseline) || baseline <= 0) {
    return floor;
  }

  // Inside ~120 m the rider is effectively at the door.
  if (remaining <= 0.12) return 97;

  const covered = Math.min(1, Math.max(0, 1 - remaining / baseline));
  const ceiling = 96;
  return Math.round(floor + (ceiling - floor) * covered);
}
