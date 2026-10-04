import { watchCoupons } from "./db";

/**
 * Default offer codes honoured if Firestore config/coupons has not been customized yet.
 * Consistent with iOS and Android app defaults.
 */
export const DEFAULT_COUPONS = [
  {
    code: "FREEDEL",
    title: "100% Free Delivery on your order",
    discount: 0,
    waivesDelivery: true,
    minOrder: 0,
    description: "Free delivery auto-applied on your first 5 orders",
    condition: "Valid on first 5 orders across Anantnag",
    active: true
  },
  {
    code: "FLAT50",
    title: "Flat 50% Off on orders above ₹799",
    discount: 50,
    discountType: "percent",
    isPercent: true,
    minOrder: 799,
    description: "Get 50% off on all grocery and daily essentials above ₹799",
    condition: "Cart value must be ₹799+",
    active: true
  }
];

export const AVAILABLE_COUPONS = DEFAULT_COUPONS;

/**
 * Watch active coupons for checkout and the storefront offers page.
 * Falls back to DEFAULT_COUPONS if no dynamic list is configured yet.
 * Strips legacy removed codes (GET30, DASHIT50).
 */
export function watchActiveCoupons(callback) {
  return watchCoupons((list) => {
    const raw = Array.isArray(list) && list.length > 0 ? list : DEFAULT_COUPONS;
    const sanitized = raw.filter((c) => c && c.code !== "GET30" && c.code !== "DASHIT50");
    const active = sanitized.filter((c) => c && c.active !== false);
    callback(active.length > 0 ? active : DEFAULT_COUPONS);
  });
}

/**
 * Watch all coupons (both active & inactive) for admin management.
 */
export function watchAllCoupons(callback) {
  return watchCoupons((list) => {
    const raw = Array.isArray(list) && list.length > 0 ? list : DEFAULT_COUPONS;
    const sanitized = raw.filter((c) => c && c.code !== "GET30" && c.code !== "DASHIT50");
    callback(sanitized.length > 0 ? sanitized : DEFAULT_COUPONS);
  });
}

