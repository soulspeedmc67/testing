/**
 * The shop's order rules: the minimum order, the delivery fee by order size,
 * the handling charge, the free-delivery welcome offer and the extra charge
 * for rain, snow or a rush.
 *
 * The shop changes them from the staff console or the iOS admin. They are saved
 * on `config/store`, which the website and both apps already listen to, so a
 * change reaches every customer at once with no new build.
 *
 * The numbers below are what applies until the settings arrive, and for any
 * field the shop hasn't set. The same rules and defaults are in
 * `android-compose/.../data/ShopRules.kt` and
 * `ios-swift/DASHit/Core/Utils/ShopRules.swift`: keep the three in step.
 * Each key is also the field's name on `config/store`.
 */
export const SHOP_RULE_DEFAULTS = Object.freeze({
  // The smallest items total we deliver. Fees and offers don't count towards it.
  minOrderValue: 100,
  // On every order, whatever its size.
  handlingFee: 11,
  // Orders under `deliverySmallBelow` pay `deliverySmallPercent` of the items total.
  deliverySmallBelow: 180,
  deliverySmallPercent: 40,
  // From `deliverySmallBelow` up to `deliveryLowFrom`.
  deliveryMidFee: 35,
  // From here up the fee is at its lowest.
  deliveryLowFrom: 300,
  deliveryLowFee: 25,
  // A customer's first orders are delivered free (website and iPhone). 0 ends the offer.
  freeDeliveryOrders: 5,
  /* The extra charge for rain, snow or a rush. While it is on, every order
     pays `extraChargeAmount` on top of the bill, free delivery included.
     `extraChargeLabel` is its name on the bill; blank means EXTRA_CHARGE_LABEL. */
  extraChargeOn: false,
  extraChargeAmount: 20,
  extraChargeLabel: "",
});

export const EXTRA_CHARGE_LABEL = "Extra delivery charge";
export const EXTRA_CHARGE_MAX = 500;
const EXTRA_LABEL_MAX_LENGTH = 40;

// Kept for older imports: the built-in values, not the shop's live settings.
export const HANDLING_FEE = SHOP_RULE_DEFAULTS.handlingFee;
export const FREE_DELIVERY_THRESHOLD = SHOP_RULE_DEFAULTS.deliveryLowFrom;
export const DELIVERY_FEE = SHOP_RULE_DEFAULTS.deliveryLowFee;
export const MIN_ORDER_VALUE = SHOP_RULE_DEFAULTS.minOrderValue;

const zeroOrMore = (value, fallback) => {
  const n = Number(value);
  return value !== null && value !== undefined && value !== "" && Number.isFinite(n) && n >= 0 ? n : fallback;
};

/** The rules on `config/store`, with the defaults filled in. */
export function shopRules(cfg) {
  const d = SHOP_RULE_DEFAULTS;
  return {
    minOrderValue: zeroOrMore(cfg?.minOrderValue, d.minOrderValue),
    handlingFee: zeroOrMore(cfg?.handlingFee, d.handlingFee),
    deliverySmallBelow: zeroOrMore(cfg?.deliverySmallBelow, d.deliverySmallBelow),
    deliverySmallPercent: Math.min(100, zeroOrMore(cfg?.deliverySmallPercent, d.deliverySmallPercent)),
    deliveryMidFee: zeroOrMore(cfg?.deliveryMidFee, d.deliveryMidFee),
    deliveryLowFrom: zeroOrMore(cfg?.deliveryLowFrom, d.deliveryLowFrom),
    deliveryLowFee: zeroOrMore(cfg?.deliveryLowFee, d.deliveryLowFee),
    freeDeliveryOrders: Math.floor(zeroOrMore(cfg?.freeDeliveryOrders, d.freeDeliveryOrders)),
    extraChargeOn: cfg?.extraChargeOn === true,
    extraChargeAmount: Math.min(EXTRA_CHARGE_MAX, Math.round(zeroOrMore(cfg?.extraChargeAmount, d.extraChargeAmount))),
    extraChargeLabel: cleanExtraLabel(cfg?.extraChargeLabel),
  };
}

function cleanExtraLabel(text) {
  return typeof text === "string" ? text.trim().slice(0, EXTRA_LABEL_MAX_LENGTH) : "";
}

/** The extra charge on an order placed now, in whole rupees; 0 while it is off. */
export function extraChargeFor(rules = SHOP_RULE_DEFAULTS) {
  return rules?.extraChargeOn ? Math.max(0, Number(rules.extraChargeAmount) || 0) : 0;
}

/** The extra charge's name on the bill: what the shop called it, or "Extra delivery charge". */
export function extraChargeLabel(text) {
  return cleanExtraLabel(text) || EXTRA_CHARGE_LABEL;
}

export function sameShopRules(a, b) {
  return Object.keys(SHOP_RULE_DEFAULTS).every((key) => a?.[key] === b?.[key]);
}

/** "₹25 delivery", or "free delivery" when the shop has set that fee to 0. */
export function deliveryFeeWords(fee) {
  return fee > 0 ? `₹${fee} delivery` : "free delivery";
}

/** What an order with this items total pays for delivery with no offer and no code. */
export function standardDeliveryFee(subtotal, rules = SHOP_RULE_DEFAULTS) {
  if (subtotal < rules.deliverySmallBelow) {
    return {
      fee: Math.round(subtotal * (rules.deliverySmallPercent / 100)),
      tierLabel: `${rules.deliverySmallPercent}% delivery charge (orders under ₹${rules.deliverySmallBelow})`,
    };
  }
  if (subtotal < rules.deliveryLowFrom) {
    return {
      fee: rules.deliveryMidFee,
      tierLabel: `₹${rules.deliveryMidFee} delivery charge (orders ₹${rules.deliverySmallBelow} - ₹${rules.deliveryLowFrom - 1})`,
    };
  }
  return {
    fee: rules.deliveryLowFee,
    tierLabel: `₹${rules.deliveryLowFee} delivery charge (orders above ₹${rules.deliveryLowFrom - 1})`,
  };
}

/**
 * The delivery fee for a cart, from the customer's order history, the items
 * total and the shop's `rules`:
 * 1. A code that waives delivery: free.
 * 2. The customer's first `freeDeliveryOrders` orders: free.
 * 3. Otherwise the fee for the order's size (`standardDeliveryFee`).
 * The handling charge is separate and on every order, and so is the extra
 * charge (`extraChargeFor`) while the shop has it on.
 */
export function calculateDeliveryCharges(subtotal, orderCount = 0, coupon = null, rules = SHOP_RULE_DEFAULTS) {
  if (coupon?.waivesDelivery || coupon?.code === "FREEDEL") {
    return {
      fee: 0,
      standardFee: 0,
      isFree: true,
      reason: "Coupon discount",
    };
  }

  const { fee: standardFee, tierLabel } = standardDeliveryFee(subtotal, rules);

  if (orderCount < rules.freeDeliveryOrders) {
    return {
      fee: 0,
      standardFee,
      isFree: true,
      isFirstFivePromo: true,
      orderNumber: orderCount + 1,
      freeOrders: rules.freeDeliveryOrders,
      ordersRemaining: rules.freeDeliveryOrders - orderCount,
      tierLabel,
      reason: `Free delivery on first ${rules.freeDeliveryOrders} orders (Order ${orderCount + 1} of ${rules.freeDeliveryOrders})`,
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
