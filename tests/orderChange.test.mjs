import test from "node:test";
import assert from "node:assert/strict";
import {
  ORDER_CHANGE_WINDOW_SECONDS,
  OrderChangeError,
  timeMs,
  orderChangeDeadlineMs,
  orderChangeSecondsLeft,
  isPaidOnline,
  replacementIdOf,
  mergeAdditions,
  billForChangedOrder,
  buildReplacementOrder,
} from "../src/lib/orderChange.js";

const PLACED_AT = Date.parse("2026-10-05T10:00:00.000Z");

const milk = { id: "101", name: "Milk 500 ml", price: 30, originalPrice: 32, unit: "500 ml", qty: 2 };
const bread = { id: "102", name: "Bread", price: 45, unit: "400 g", qty: 1 };
const rice = { id: "103", name: "Rice 5 kg", price: 420, originalPrice: 480, unit: "5 kg", qty: 1 };

// A cash order past the shopper's first five: ₹105 of items, 40% delivery.
const paidDelivery = {
  orderId: "DSH-11111AAA",
  status: "Placed",
  createdAt: new Date(PLACED_AT).toISOString(),
  items: [milk, bread],
  subtotal: 105,
  deliveryFee: 42,
  handlingFee: 11,
  discount: 0,
  couponCode: null,
  total: 158,
  paymentMethod: "Cash on Delivery",
  otp: "4821",
  location: { address: "Lal Chowk, Anantnag", lat: 33.73, lng: 75.15 },
  customerName: "Test Shopper",
  mobile: "9000000000",
};

test("the window is 30 seconds from when the order was placed", () => {
  assert.equal(ORDER_CHANGE_WINDOW_SECONDS, 30);
  assert.equal(orderChangeDeadlineMs(paidDelivery), PLACED_AT + 30000);
  assert.equal(orderChangeSecondsLeft(paidDelivery, PLACED_AT), 30);
  assert.equal(orderChangeSecondsLeft(paidDelivery, PLACED_AT + 12400), 18);
  assert.equal(orderChangeSecondsLeft(paidDelivery, PLACED_AT + 30000), 0);
  assert.equal(orderChangeSecondsLeft(paidDelivery, PLACED_AT + 90000), 0);
});

test("a device clock behind the server never shows more than 30 seconds", () => {
  assert.equal(orderChangeSecondsLeft(paidDelivery, PLACED_AT - 20000), 30);
});

test("the window is shut once the store has moved the order on", () => {
  for (const status of ["Packed", "Out for Delivery", "Delivered", "Cancelled"]) {
    assert.equal(orderChangeSecondsLeft({ ...paidDelivery, status }, PLACED_AT + 1000), 0);
  }
  assert.equal(orderChangeSecondsLeft(null), 0);
  assert.equal(orderChangeSecondsLeft({ status: "Placed" }), 0);
});

test("an order that replaced another keeps the first order's deadline", () => {
  const replacement = {
    ...paidDelivery,
    createdAt: new Date(PLACED_AT + 20000).toISOString(),
    modifyWindowEndsAt: { seconds: (PLACED_AT + 30000) / 1000, nanoseconds: 0 },
  };
  assert.equal(orderChangeDeadlineMs(replacement), PLACED_AT + 30000);
  assert.equal(orderChangeSecondsLeft(replacement, PLACED_AT + 21000), 9);
  assert.equal(orderChangeSecondsLeft(replacement, PLACED_AT + 31000), 0);
});

test("saved times are read in every shape they arrive in", () => {
  assert.equal(timeMs(PLACED_AT), PLACED_AT);
  assert.equal(timeMs(new Date(PLACED_AT).toISOString()), PLACED_AT);
  assert.equal(timeMs(new Date(PLACED_AT)), PLACED_AT);
  assert.equal(timeMs({ toMillis: () => PLACED_AT }), PLACED_AT);
  assert.equal(timeMs({ seconds: PLACED_AT / 1000, nanoseconds: 0 }), PLACED_AT);
  assert.equal(timeMs(null), 0);
  assert.equal(timeMs("not a date"), 0);
});

test("paid-online orders are recognised the way the rules recognise them", () => {
  assert.equal(isPaidOnline({ paymentMethod: "Cash on Delivery" }), false);
  assert.equal(isPaidOnline({ paymentMethod: "Cash on Delivery", paymentStatus: "pending" }), false);
  assert.equal(isPaidOnline({ paymentMethod: "Paid online", paymentStatus: "paid" }), true);
  assert.equal(isPaidOnline({ paymentMethod: "UPI" }), true);
  assert.equal(isPaidOnline({ paymentMethod: "Cash on Delivery", paymentStatus: "captured" }), true);
  assert.equal(isPaidOnline({}), false);
});

test("a replaced order names the order that took its place", () => {
  assert.equal(replacementIdOf({ status: "Cancelled", cancelReason: "Replaced by DSH-22222BBB" }), "DSH-22222BBB");
  // The iPhone app adds a note after the id.
  assert.equal(
    replacementIdOf({ status: "Cancelled", cancelReason: "Replaced by DSH-22222BBB: customer added items" }),
    "DSH-22222BBB"
  );
  assert.equal(replacementIdOf({ status: "Cancelled", cancelReason: "Customer cancelled" }), null);
  assert.equal(replacementIdOf({ status: "Cancelled", cancelReason: "Withdrawn: update did not complete" }), null);
  assert.equal(replacementIdOf({ status: "Placed", cancelReason: "Replaced by DSH-22222BBB" }), null);
  assert.equal(replacementIdOf({ status: "Cancelled" }), null);
});

test("additions join the order: new items are appended, repeats raise the quantity", () => {
  const merged = mergeAdditions(paidDelivery.items, [
    { ...rice, qty: 1 },
    { ...milk, qty: 3 },
    { ...bread, qty: 0 },
  ]);
  assert.deepEqual(
    merged.map((i) => [i.id, i.qty]),
    [["101", 5], ["102", 1], ["103", 1]]
  );
  // The order's own items are not touched.
  assert.equal(paidDelivery.items[0].qty, 2);
});

test("ids are matched as text, and an older `quantity` field is kept in step", () => {
  const merged = mergeAdditions([{ id: 101, name: "Milk", price: 30, quantity: 2 }], [{ id: "101", price: 30, qty: 1 }]);
  assert.equal(merged.length, 1);
  assert.equal(merged[0].qty, 3);
  assert.equal(merged[0].quantity, 3);
});

test("the delivery charge is worked out again for the new item total", () => {
  // ₹105 → ₹150: still 40%, so the fee goes up with it.
  const small = billForChangedOrder(paidDelivery, mergeAdditions(paidDelivery.items, [{ ...bread, qty: 1 }]));
  assert.equal(small.subtotal, 150);
  assert.equal(small.deliveryFee, 60);
  assert.equal(small.total, 150 + 60 + 11);

  // ₹105 → ₹195: into the ₹35 band, so the fee comes down.
  const middle = billForChangedOrder(paidDelivery, mergeAdditions(paidDelivery.items, [{ ...bread, qty: 2 }]));
  assert.equal(middle.subtotal, 195);
  assert.equal(middle.deliveryFee, 35);
  assert.equal(middle.total, 195 + 35 + 11);

  // ₹105 → ₹525: above ₹299 it is ₹25.
  const large = billForChangedOrder(paidDelivery, mergeAdditions(paidDelivery.items, [rice]));
  assert.equal(large.subtotal, 525);
  assert.equal(large.deliveryFee, 25);
  assert.equal(large.handlingFee, 11);
  assert.equal(large.total, 525 + 25 + 11);
  // ₹2 off each of 2 milk, ₹60 off the rice.
  assert.equal(large.savings, 64);
});

test("delivery that was free on the original stays free", () => {
  const firstOrders = { ...paidDelivery, deliveryFee: 0, couponCode: "FREEDEL", total: 116 };
  const bill = billForChangedOrder(firstOrders, mergeAdditions(firstOrders.items, [rice]));
  assert.equal(bill.deliveryFee, 0);
  assert.equal(bill.total, 525 + 11);
  // The ₹25 it would have cost counts as saved, as it does at checkout.
  assert.equal(bill.savings, 64 + 25);
});

test("a ₹1 order whose 40% fee rounded to nothing does not unlock free delivery", () => {
  const sachet = { id: "9", name: "Shampoo sachet", price: 1, qty: 1 };
  const tiny = { ...paidDelivery, items: [sachet], subtotal: 1, deliveryFee: 0, total: 12 };
  const bill = billForChangedOrder(tiny, mergeAdditions(tiny.items, [rice]));
  assert.equal(bill.deliveryFee, 25);
});

test("the night distance charge is kept as it was", () => {
  const night = { ...paidDelivery, deliveryFee: 42 + 18, nightDeliveryFee: 18, total: 176 };
  const bill = billForChangedOrder(night, mergeAdditions(night.items, [rice]));
  assert.equal(bill.baseDeliveryFee, 25);
  assert.equal(bill.nightDeliveryFee, 18);
  assert.equal(bill.deliveryFee, 43);
  assert.equal(bill.total, 525 + 43 + 11);

  // Free delivery never waived the night charge, and still doesn't.
  const freeNight = { ...paidDelivery, deliveryFee: 18, nightDeliveryFee: 18, couponCode: "FREEDEL" };
  const freeBill = billForChangedOrder(freeNight, mergeAdditions(freeNight.items, [rice]));
  assert.equal(freeBill.baseDeliveryFee, 0);
  assert.equal(freeBill.deliveryFee, 18);
});

test("the order's code is applied to the new item total", () => {
  const half = { code: "FLAT50", discount: 50, discountType: "percent", isPercent: true, minOrder: 799 };
  const big = { ...paidDelivery, items: [{ ...rice, qty: 2 }], subtotal: 840, deliveryFee: 25, discount: 420, couponCode: "FLAT50", total: 456 };
  const bill = billForChangedOrder(big, mergeAdditions(big.items, [{ ...bread, qty: 2 }]), half);
  assert.equal(bill.subtotal, 930);
  assert.equal(bill.discount, 465);
  assert.equal(bill.total, 930 + 25 + 11 - 465);

  const flat = { code: "SAVE40", discount: 40, minOrder: 100 };
  const withFlat = { ...paidDelivery, discount: 40, couponCode: "save40", total: 118 };
  assert.equal(billForChangedOrder(withFlat, mergeAdditions(withFlat.items, [rice]), flat).discount, 40);
});

test("a code the shop no longer lists keeps the discount the order was placed with", () => {
  const order = { ...paidDelivery, discount: 40, couponCode: "OLDCODE", total: 118 };
  const items = mergeAdditions(order.items, [rice]);
  assert.equal(billForChangedOrder(order, items, null).discount, 40);
  // A different code from the list is not this order's code.
  assert.equal(billForChangedOrder(order, items, { code: "OTHER", discount: 500 }).discount, 40);
});

test("the replacement carries who and where, and nothing the store sets", () => {
  const original = {
    ...paidDelivery,
    id: "DSH-11111AAA",
    userId: "uid-1",
    driverId: "rider-7",
    driverName: "Rider",
    statusHistory: [{ status: "Placed", at: "2026-10-05T10:00:00.000Z" }],
    inventoryDeducted: true,
    liveActivityToken: "abc",
    cancelReason: "x",
    receiverContact: { name: "Mum", mobile: "9000000001" },
    distanceKm: 2.4,
    etaMinutes: 12,
  };
  const items = mergeAdditions(original.items, [rice]);
  const bill = billForChangedOrder(original, items);
  const replacement = buildReplacementOrder(original, items, bill, new Date(PLACED_AT + 15000));

  assert.equal(replacement.replacesOrderId, "DSH-11111AAA");
  assert.equal(replacement.platform, "web");
  assert.deepEqual(replacement.location, original.location);
  assert.deepEqual(replacement.receiverContact, original.receiverContact);
  assert.equal(replacement.customerName, "Test Shopper");
  assert.equal(replacement.mobile, "9000000000");
  assert.equal(replacement.paymentMethod, "Cash on Delivery");
  assert.equal(replacement.distanceKm, 2.4);
  assert.equal(replacement.etaMinutes, 12);
  assert.equal(replacement.items.length, 3);

  // firestore.rules: every total an order carries must agree.
  assert.equal(replacement.total, bill.total);
  assert.equal(replacement.totalAmount, bill.total);
  assert.equal(replacement.finalTotal, bill.total);
  assert.equal(replacement.subtotal + replacement.deliveryFee + replacement.handlingFee - replacement.discount, replacement.total);

  for (const key of [
    "orderId", "id", "userId", "status", "driverId", "driverName", "statusHistory", "createdAt",
    "inventoryDeducted", "liveActivityToken", "cancelReason", "otp", "couponCode", "nightDeliveryFee",
  ]) {
    assert.equal(key in replacement, false, `${key} must not be carried by buildReplacementOrder`);
  }
});

test("order-change errors carry the sentence the shopper reads", () => {
  const closed = new OrderChangeError("windowClosed");
  assert.equal(closed.code, "windowClosed");
  assert.match(closed.message, /30 seconds are up/);
  assert.equal(new OrderChangeError("alreadyPaid").code, "alreadyPaid");
  // An unknown reason reads as a connection problem rather than as nothing.
  assert.equal(new OrderChangeError("???").code, "network");
});
