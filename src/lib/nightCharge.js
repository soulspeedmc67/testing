/**
 * Night delivery charge and the rider's petrol cost.
 *
 * Both are worked out from how far the address is from the store: the
 * straight-line `distanceKm` that checkout saves on every order (deliveryEta).
 * The settings live on `config/store`, so the shop changes them from the staff
 * console without a new build.
 *
 * The same rules are in `android-compose/.../data/NightCharge.kt` and
 * `ios-swift/DASHit/Core/Utils/NightCharge.swift`: keep the three in step.
 */

import { extraChargeLabel } from "./deliveryCharges.js";

// The charge runs from 8 pm to 6 am, India time, every day.
export const NIGHT_START_HOUR = 20;
export const NIGHT_END_HOUR = 6;

/* "auto": on during the night hours above. "on": on now, whatever the time,
   until the shop changes it. "off": never. */
export const NIGHT_CHARGE_MODES = ["auto", "on", "off"];

/* ₹6 for each km from the store is what the round trip costs the rider in
   petrol: 1 km in a straight line is about 2.5 km of road there and back, at
   about ₹2.40 a km (see FUEL_DEFAULTS). */
export const NIGHT_CHARGE_DEFAULTS = { mode: "auto", perKm: 6, minFee: 10 };

/* Petrol in Anantnag was ₹106 to ₹108 a litre on 5 Oct 2026 (mypetrolprice.com,
   shriramfinance.in). A 110cc scooter does 45 to 50 km a litre in town
   (bikewale.com, autocarindia.com); 45 is the low end, for a loaded rider. */
export const FUEL_DEFAULTS = { petrolPrice: 107, mileage: 45 };

// Streets run about 1.25x the straight line (same figure as deliveryEta).
export const ROAD_FACTOR = 1.25;

const positive = (value, fallback) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
};

const zeroOrMore = (value, fallback) => {
  const n = Number(value);
  return value !== null && value !== undefined && value !== "" && Number.isFinite(n) && n >= 0 ? n : fallback;
};

/** The night charge settings on `config/store`, with the defaults filled in. */
export function nightChargeSettings(cfg) {
  return {
    mode: NIGHT_CHARGE_MODES.includes(cfg?.nightChargeMode) ? cfg.nightChargeMode : NIGHT_CHARGE_DEFAULTS.mode,
    perKm: zeroOrMore(cfg?.nightChargePerKm, NIGHT_CHARGE_DEFAULTS.perKm),
    minFee: zeroOrMore(cfg?.nightChargeMin, NIGHT_CHARGE_DEFAULTS.minFee),
  };
}

/** Hour of the day in India (UTC+5:30, no daylight saving), whatever the device's zone. */
export function istHour(date = new Date()) {
  return new Date(date.getTime() + 330 * 60 * 1000).getUTCHours();
}

export function isNightHours(date = new Date()) {
  const hour = istHour(date);
  return hour >= NIGHT_START_HOUR || hour < NIGHT_END_HOUR;
}

/** Whether the charge applies to an order placed at `date`. */
export function isNightChargeOn(cfg, date = new Date()) {
  const { mode } = nightChargeSettings(cfg);
  return mode === "on" || (mode === "auto" && isNightHours(date));
}

/** The charge in whole rupees for an address `distanceKm` from the store; 0 when it doesn't apply. */
export function nightChargeFor(distanceKm, cfg, date = new Date()) {
  const km = Number(distanceKm);
  if (!Number.isFinite(km) || km <= 0 || !isNightChargeOn(cfg, date)) return 0;
  const { perKm, minFee } = nightChargeSettings(cfg);
  if (perKm <= 0) return 0;
  return Math.max(minFee, Math.round(km * perKm));
}

/**
 * An order's delivery fee as the bill showed it: the normal fee, and the two
 * charges saved inside it. `night` is the distance charge (`nightDeliveryFee`);
 * `extra` is the charge for rain, snow or a rush (`extraDeliveryFee`), under
 * the name the customer saw (`extraLabel`).
 */
export function deliveryFeeParts(order) {
  const total = Math.max(0, Number(order?.deliveryFee) || 0);
  const night = Math.min(total, Math.max(0, Number(order?.nightDeliveryFee) || 0));
  const extra = Math.min(total - night, Math.max(0, Number(order?.extraDeliveryFee) || 0));
  return { base: total - night - extra, night, extra, extraLabel: extraChargeLabel(order?.extraDeliveryLabel) };
}

/** Petrol price (₹ a litre) and the bike's mileage (km a litre), with the defaults filled in. */
export function fuelSettings(cfg) {
  return {
    petrolPrice: positive(cfg?.petrolPrice, FUEL_DEFAULTS.petrolPrice),
    mileage: positive(cfg?.bikeMileage, FUEL_DEFAULTS.mileage),
  };
}

/**
 * What one delivery costs the rider in petrol: store to the door and back.
 * Null when the order has no distance.
 */
export function fuelCostFor(distanceKm, cfg) {
  const km = Number(distanceKm);
  if (!Number.isFinite(km) || km <= 0) return null;
  const { petrolPrice, mileage } = fuelSettings(cfg);
  const roundTripKm = km * ROAD_FACTOR * 2;
  const litres = roundTripKm / mileage;
  return {
    roundTripKm: Math.round(roundTripKm * 10) / 10,
    litres: Math.round(litres * 100) / 100,
    cost: Math.round(litres * petrolPrice),
    perKm: Math.round((petrolPrice / mileage) * 100) / 100,
  };
}
