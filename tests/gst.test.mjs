import test from "node:test";
import assert from "node:assert/strict";
import {
  getCategoryGstRate,
  computeOrderGst,
  computeAggregatedGstReport,
  generateGstr1CsvString
} from "../src/lib/gst.js";

test("getCategoryGstRate maps standard Indian FMCG categories to correct tax slabs", () => {
  // 0% Nil/Exempt
  assert.equal(getCategoryGstRate("Fresh Fruits & Vegetables", "Fresh Kashmiri Apples"), 0);
  assert.equal(getCategoryGstRate("Dairy", "Fresh Milk 500ml"), 0);
  assert.equal(getCategoryGstRate("Dairy", "Fresh Curd Dahi 400g"), 0);

  // 5% Staples & Packaged Grocery
  assert.equal(getCategoryGstRate("Atta, Rice & Dal", "Aashirvaad Shudh Chakki Atta 5kg"), 5);
  assert.equal(getCategoryGstRate("Masalas & Spices", "Everest Turmeric Powder 100g"), 5);
  assert.equal(getCategoryGstRate("Edible Oils", "Fortune Mustard Oil 1L"), 5);

  // 12% Dairy spreads & Sauces
  assert.equal(getCategoryGstRate("Dairy", "Amul Butter 100g"), 12);
  assert.equal(getCategoryGstRate("Sauces & Spreads", "Kissan Fresh Tomato Ketchup 1kg"), 12);
  assert.equal(getCategoryGstRate("Dairy", "Amul Processed Cheese Blocks 200g"), 12);

  // 18% Personal care, Cleaning, Snacks
  assert.equal(getCategoryGstRate("Personal Care", "Clinic Plus Shampoo 175ml"), 18);
  assert.equal(getCategoryGstRate("Cleaning & Household", "Surf Excel Easy Wash Detergent 1kg"), 18);
  assert.equal(getCategoryGstRate("Cold Drinks & Juices", "Coca Cola 750ml"), 18);
});

test("computeOrderGst calculates taxable base, CGST and SGST accurately", () => {
  const mockOrder = {
    orderId: "DSH-9821K",
    customerName: "Mohammad Irfan",
    customerPhone: "9419123456",
    status: "Delivered",
    deliveryFee: 25,
    discount: 0,
    items: [
      { name: "Fresh Apples 1kg", cat: "Fruits & Vegetables", price: 100, qty: 1 }, // 0%
      { name: "Aashirvaad Atta 5kg", cat: "Staples", price: 210, qty: 1 },          // 5% -> Taxable 200, Tax 10
      { name: "Clinic Plus Shampoo", cat: "Personal Care", price: 118, qty: 1 }      // 18% -> Taxable 100, Tax 18
    ],
    totalAmount: 453 // 100 + 210 + 118 + 25 (deliv)
  };

  const gst = computeOrderGst(mockOrder);
  assert.ok(gst);
  assert.equal(gst.orderId, "DSH-9821K");
  assert.equal(gst.placeOfSupply, "Jammu & Kashmir (01)");

  // 0% slab has 100 taxable and 0 tax
  assert.equal(gst.slabs[0].taxable, 100);
  assert.equal(gst.slabs[0].tax, 0);

  // 5% slab has 200 taxable and 10 tax (CGST 5 + SGST 5)
  assert.equal(gst.slabs[5].taxable, 200);
  assert.equal(gst.slabs[5].cgst, 5);
  assert.equal(gst.slabs[5].sgst, 5);
  assert.equal(gst.slabs[5].tax, 10);

  // Total taxable + total tax = grand total
  assert.ok(gst.totalTaxable > 0);
  assert.ok(gst.totalTax > 0);
  assert.equal(Math.round(gst.totalTaxable + gst.totalTax), 453);
});

test("computeAggregatedGstReport groups sales by period and slabs", () => {
  const orders = [
    {
      orderId: "ORD-1",
      status: "Delivered",
      createdAt: Date.now(),
      items: [{ name: "Milk", cat: "Dairy", price: 60, qty: 1 }],
      total: 60
    },
    {
      orderId: "ORD-2",
      status: "Delivered",
      createdAt: Date.now(),
      items: [{ name: "Soap", cat: "Personal Care", price: 118, qty: 1 }],
      total: 118
    },
    {
      orderId: "ORD-3",
      status: "Cancelled", // should be ignored in delivered filter
      createdAt: Date.now(),
      items: [{ name: "Biscuit", cat: "Snacks", price: 50, qty: 1 }],
      total: 50
    }
  ];

  const report = computeAggregatedGstReport(orders, { period: "all", statusFilter: "delivered" });
  assert.equal(report.orderCount, 2);
  assert.equal(report.totalGross, 178);
  assert.ok(report.totalTaxable > 0);
  assert.ok(report.totalTax > 0);
});

test("generateGstr1CsvString produces valid RFC-4180 CSV with BOM", () => {
  const orders = [
    {
      orderId: "ORD-101",
      status: "Delivered",
      items: [{ name: "Apple", cat: "Fruits", price: 100, qty: 1 }],
      total: 100
    }
  ];

  const report = computeAggregatedGstReport(orders, { period: "all", statusFilter: "all" });
  const csv = generateGstr1CsvString(report.orders);

  assert.ok(csv.startsWith("\uFEFF"));
  assert.ok(csv.includes('"Invoice Number"'));
  assert.ok(csv.includes('"Total Taxable Value (INR)"'));
  assert.ok(csv.includes('"ORD-101"'));
});
