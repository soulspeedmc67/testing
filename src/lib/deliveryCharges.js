export const HANDLING_FEE = 11;
export const FREE_DELIVERY_THRESHOLD = 300;
export const DELIVERY_FEE = 25;

/**
 * Calculates delivery fee based on user order history and cart subtotal:
 * 1. First 5 orders of a user: FREE delivery!
 * 2. Orders below ₹180: 40% of subtotal.
 * 3. Orders between ₹180 and ₹299: ₹35 flat.
 * 4. Orders above ₹299: ₹25 flat.
 * 5. ₹11 handling fee across all orders.
 */
export function calculateDeliveryCharges(subtotal, orderCount = 0, coupon = null) {
  if (coupon?.waivesDelivery || coupon?.code === "FREEDEL") {
    return {
      fee: 0,
      standardFee: 0,
      isFree: true,
      reason: "Coupon discount",
    };
  }

  // Standard tier calculation:
  let standardFee = 25;
  let tierLabel = "₹25 delivery on orders above ₹299";
  if (subtotal < 180) {
    standardFee = Math.round(subtotal * 0.40);
    tierLabel = "40% delivery charge (orders under ₹180)";
  } else if (subtotal <= 299) {
    standardFee = 35;
    tierLabel = "₹35 delivery charge (orders ₹180 - ₹299)";
  } else {
    standardFee = 25;
    tierLabel = "₹25 delivery charge (orders above ₹299)";
  }

  // First 5 orders promo:
  if (orderCount < 5) {
    return {
      fee: 0,
      standardFee,
      isFree: true,
      isFirstFivePromo: true,
      orderNumber: orderCount + 1,
      ordersRemaining: 5 - orderCount,
      tierLabel,
      reason: `Free delivery on first 5 orders (Order ${orderCount + 1} of 5)`,
    };
  }

  return {
    fee: standardFee,
    standardFee,
    isFree: false,
    isFirstFivePromo: false,
    tierLabel,
    reason: tierLabel,
  };
}
