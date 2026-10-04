/**
 * 3D Rider & Map Tracking Asset Kit for DASHit
 * High-definition, transparent PNG assets for real-time driver tracking.
 */

export const RIDER_ASSETS = {
  // Official 3D GLB model
  model3D: "/3d/dashit-rider.glb",
  // 8-directional road heading angles
  directions: {
    north: "/rider/rider_back.png",
    northEast: "/rider/rider_back_right.png",
    east: "/rider/rider_right.png",
    southEast: "/rider/rider_front_right.png",
    south: "/rider/rider_front.png",
    southWest: "/rider/rider_front_left.png",
    west: "/rider/rider_left.png",
    northWest: "/rider/rider_back_left.png",
  },
  // Dynamic action & driving states
  states: {
    idle: "/rider/rider_idle.png",
    moving: "/rider/rider_moving.png",
    braking: "/rider/rider_braking.png",
    headlightOn: "/rider/rider_headlight_on.png",
    liveMap: "/rider/rider_map_live.png",
  },
  // Overhead & tilted views
  overhead: {
    top: "/rider/rider_top.png",
    topLeft: "/rider/rider_top_left.png",
    topRight: "/rider/rider_top_right.png",
    tiltLeft: "/rider/rider_tilt_left.png",
    tiltRight: "/rider/rider_tilt_right.png",
  },
  // Map destination & tracking pins
  pins: {
    front: "/rider/map_pin_front.png",
    whiteBg: "/rider/map_pin_white_bg.png",
    top: "/rider/map_pin_top.png",
    side: "/rider/map_icon_side.png",
    arrow: "/rider/route_arrow.png",
  },
  // Ambient ground effects
  effects: {
    ripple: "/rider/ripple.png",
    shadow: "/rider/shadow.png",
    streaks: "/rider/motion_streaks.png",
    dust1: "/rider/dust_1.png",
    dust2: "/rider/dust_2.png",
    dust3: "/rider/dust_3.png",
  },
  // Live status telemetry dots
  dots: {
    idle: "/rider/dot_idle.png",
    moving: "/rider/dot_moving.png",
    active: "/rider/dot_active.png",
    delivered: "/rider/dot_delivered.png",
  },
};

/**
 * Calculates the forward bearing (in degrees, 0..360) between two coordinates.
 * 0° = North, 90° = East, 180° = South, 270° = West
 */
export function calculateBearing(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return 0;
  if (lat1 === lat2 && lon1 === lon2) return 0;

  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaLambda = toRad(lon2 - lon1);

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  return (toDeg(theta) + 360) % 360;
}

/**
 * Returns the 3D rider sprite rendered from dashit-rider.glb for this heading.
 * Uses the 24 headings (every 15°) matching Android and iOS implementations.
 * @param {number|null} bearingDeg - Bearing in degrees (0..360)
 * @param {boolean} isMoving - Whether courier is actively in motion
 * @param {boolean} isBraking - Whether courier is decelerating or stopping at delivery point
 */
export function getRiderAssetForHeading(bearingDeg, isMoving = true, isBraking = false) {
  if (isBraking) {
    return RIDER_ASSETS.states.braking;
  }
  if (!isMoving || bearingDeg == null) {
    return "/rider/rider_180.png";
  }

  // Normalize bearing to 0..360 and find closest of the 24 frames
  const normalized = ((bearingDeg % 360) + 360) % 360;
  const step = Math.floor((normalized + 7.5) / 15) % 24;
  const deg = String(step * 15).padStart(3, "0");
  return `/rider/rider_${deg}.png`;
}

