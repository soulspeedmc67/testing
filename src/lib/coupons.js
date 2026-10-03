import { watchCoupons } from "./db";

/**
 * Default offer codes honoured if Firestore config/coupons has not been customized yet.
 * Consistent with iOS and Android app defaults.
 */
export const DEFAULT_COUPONS = [
  {
    code: "GET30",
    title: "Up to ₹30 Off on orders of ₹199 or more",
    discount: 30,
    minOrder: 199,
    description: "Valid on all grocery and fresh items in Anantnag",
    condition: "Add non discounted item(s) to unlock",
    active: true
  },
  {
    code: "DASHIT50",
    title: "Flat ₹50 Off on orders above ₹299",
    discount: 50,
    minOrder: 299,
    description: "Special launch discount for Anantnag Dashit customers",
    condition: "Cart value must be ₹299+",
    active: true
  },
  {
    code: "FREEDEL",
    title: "100% Free Delivery on your order",
    discount: 0,
    waivesDelivery: true,
    minOrder: 99,
    description: "Zero delivery fee applied",
    condition: "No minimum required",
    active: true
  }
];

export const AVAILABLE_COUPONS = DEFAULT_COUPONS;

/**
 * Watch active coupons for checkout and the storefront offers page.
 * Falls back to DEFAULT_COUPONS if no dynamic list is configured yet.
 */
export function watchActiveCoupons(callback) {
  return watchCoupons((list) => {
    const raw = Array.isArray(list) ? list : DEFAULT_COUPONS;
    const active = raw.filter((c) => c && c.active !== false);
    callback(active);
  });
}

/**
 * Watch all coupons (both active & inactive) for admin management.
 */
export function watchAllCoupons(callback) {
  return watchCoupons((list) => {
    const raw = Array.isArray(list) ? list : DEFAULT_COUPONS;
    callback(raw);
  });
}
