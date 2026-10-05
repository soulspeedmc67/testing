import { watchCoupons } from "./db";

/**
 * The admin console's starting set of offer codes ("Reset to defaults").
 * Shoppers only ever get the codes the admin has saved and switched on
 * (watchActiveCoupons); these are never applied on their own.
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
 * The offer codes shoppers can use: exactly the ones the shop has switched on
 * in the admin console (Firestore config/coupons).
 *
 * Nothing is assumed. Before the list has arrived, when it can't be read, or
 * when every code in it is switched off, there are no codes. This used to
 * fall back to DEFAULT_COUPONS in all three cases, so turning every code off
 * in the admin switched "50% off above ₹799" and free delivery ON for
 * shoppers, and so did a browser that blocks Firestore.
 */
export function watchActiveCoupons(callback) {
  return watchCoupons((list) => {
    if (!Array.isArray(list)) return callback([]);
    callback(list.filter((c) => c && c.active !== false && c.code !== "GET30" && c.code !== "DASHIT50"));
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

