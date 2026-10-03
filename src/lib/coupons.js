/**
 * The offer codes the shop honours, the same three as the Android and iPhone
 * apps (Android CartItem.kt, iOS Cart.swift). Checkout re-checks the minimum
 * on every change; the offers page lists exactly these.
 */
export const AVAILABLE_COUPONS = [
  {
    code: "GET30",
    title: "Up to ₹30 Off on orders of ₹199 or more",
    discount: 30,
    minOrder: 199,
    description: "Valid on all grocery and fresh items in Anantnag",
    condition: "Add non discounted item(s) to unlock"
  },
  {
    code: "DASHIT50",
    title: "Flat ₹50 Off on orders above ₹299",
    discount: 50,
    minOrder: 299,
    description: "Special launch discount for Anantnag Dashit customers",
    condition: "Cart value must be ₹299+"
  },
  {
    code: "FREEDEL",
    // The saving is the waived ₹25 delivery fee, applied by the checkout's
    // deliveryFee rule. Carrying a `discount` here as well subtracted ₹25 from
    // the subtotal *and* waived the fee — the coupon paid out twice.
    title: "100% Free Delivery on your order",
    discount: 0,
    waivesDelivery: true,
    minOrder: 99,
    description: "Zero delivery fee applied",
    condition: "No minimum required"
  }
];
