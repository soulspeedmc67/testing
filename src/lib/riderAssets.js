/**
 * 3D Rider & Map Tracking Asset Kit for DASHit
 * High-definition, transparent PNG assets for real-time driver tracking.
 */

export const RIDER_ASSETS = {
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
 * Returns the best 3D rider asset based on current heading bearing and motion state.
 * @param {number|null} bearingDeg - Bearing in degrees (0..360)
 * @param {boolean} isMoving - Whether courier is actively in motion
 * @param {boolean} isBraking - Whether courier is decelerating or stopping at delivery point
 */
export function getRiderAssetForHeading(bearingDeg, isMoving = true, isBraking = false) {
  if (isBraking) {
    return RIDER_ASSETS.states.braking;
  }
  if (!isMoving || bearingDeg == null) {
    return RIDER_ASSETS.states.liveMap;
  }

  // Normalize bearing to 0..360
  const b = (bearingDeg + 360) % 360;

  // 8 cardinal sectors of 45 degrees each:
  // Sector 0: 337.5° - 22.5° -> North (facing away)
  // Sector 1: 22.5° - 67.5°  -> North-East
  // Sector 2: 67.5° - 112.5° -> East
  // Sector 3: 112.5° - 157.5° -> South-East
  // Sector 4: 157.5° - 202.5° -> South (facing viewer)
  // Sector 5: 202.5° - 247.5° -> South-West
  // Sector 6: 247.5° - 292.5° -> West
  // Sector 7: 292.5° - 337.5° -> North-West

  if (b >= 337.5 || b < 22.5) return RIDER_ASSETS.directions.north;
  if (b >= 22.5 && b < 67.5) return RIDER_ASSETS.directions.northEast;
  if (b >= 67.5 && b < 112.5) return RIDER_ASSETS.directions.east;
  if (b >= 112.5 && b < 157.5) return RIDER_ASSETS.directions.southEast;
  if (b >= 157.5 && b < 202.5) return RIDER_ASSETS.directions.south;
  if (b >= 202.5 && b < 247.5) return RIDER_ASSETS.directions.southWest;
  if (b >= 247.5 && b < 292.5) return RIDER_ASSETS.directions.west;
  return RIDER_ASSETS.directions.northWest;
}
