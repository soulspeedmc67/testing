/**
 * Where a rider's phone last said it was: drivers/{uid}/telemetry/live, which
 * the rider app writes about every 20 seconds while it is open
 * (pushDriverTelemetryToQueue in db.js). Staff may read it.
 *
 * iOS admin: `RiderPosition` in ios-swift/DASHit/ViewModels/RiderPositions.swift.
 */

/** A position is "live" for this long after the rider's phone sent it. */
export const RIDER_LIVE_MS = 3 * 60 * 1000;

function timeMs(value) {
  if (!value) return null;
  if (typeof value.toMillis === "function") return value.toMillis();
  if (typeof value === "number") return value;
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
}

/** { lat, lng, heading, at } from a telemetry document; null if it holds no position. */
export function riderPositionFrom(data) {
  if (!data) return null;
  const lat = Number(data.latitude ?? data.lat);
  const lng = Number(data.longitude ?? data.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) return null;
  return { lat, lng, heading: Number(data.heading) || 0, at: timeMs(data.updatedAt) };
}

/** Sent in the last three minutes: the rider app is open and reporting. */
export function isRiderLive(position, now = Date.now()) {
  return !!position && position.at != null && now - position.at < RIDER_LIVE_MS;
}

/** "Here now", "Seen 4 min ago", "Last seen at 6:40 pm", "Last seen 12 Oct, 6:40 pm". */
export function riderSeenLabel(position, now = Date.now()) {
  if (!position || position.at == null) return "Last place known";
  const minutes = Math.floor((now - position.at) / 60000);
  if (minutes < 1) return "Here now";
  if (minutes < 60) return `Seen ${minutes} min ago`;
  const zone = { timeZone: "Asia/Kolkata" };
  const day = (ms) => new Date(ms).toLocaleDateString("en-IN", zone);
  const time = new Date(position.at).toLocaleTimeString("en-IN", { ...zone, hour: "numeric", minute: "2-digit" });
  if (day(position.at) === day(now)) return `Last seen at ${time}`;
  return `Last seen ${new Date(position.at).toLocaleDateString("en-IN", { ...zone, day: "numeric", month: "short" })}, ${time}`;
}
