/**
 * DASHit Indian GST (Goods & Services Tax) Accounting & Sales Billing Engine
 *
 * Designed for Indian FMCG & Quick-Commerce operations:
 * - Computes itemized and order-level taxable values, CGST (Central Tax) and SGST (State Tax).
 * - Categorizes grocery, staples, dairy, personal care, and household items into standard Indian GST slabs (0%, 5%, 12%, 18%).
 * - Generates GSTR-1 compliant sales registers for monthly CA reconciliation and tax filing.
 * - Handles delivery fee GST (18% under SAC 9968) and coupon discount apportioning.
 */

import { orderAddress, orderTimeMs } from "./orderReceipt.js";

export const DEFAULT_BUSINESS_GST_INFO = {
  legalName: "Dashit Quick Commerce Private Limited",
  tradeName: "DASHIT",
  gstin: "01AABCD1234E1Z5", // Standard J&K 01-prefix format
  pan: "AABCD1234E",
  state: "Jammu & Kashmir",
  stateCode: "01",
  address: "Court Road, KP Road Junction, Anantnag, J&K 192101",
  phone: "+91 94190 00000",
  email: "billing@dashit.co.in",
  cin: "U52100JK2025PTC012345",
  fssai: "11025000000000"
};

/**
 * Maps product category and item name to Indian GST tax rate (percentage).
 * Indian FMCG / Grocery standard rate schedule:
 *  - 0% (Nil / Exempt): Fresh fruits, fresh vegetables, fresh milk, curd, fresh eggs, unbranded grains.
 *  - 5%: Packaged staples, atta, dal, rice, edible oils, spices, tea, coffee, baby foods, sugar, bread.
 *  - 12%: Butter, cheese, ghee, fruit juices, ketchup, sauces, condensed milk, pasta.
 *  - 18%: Personal care, cleaning & household, confectionery, chocolates, biscuits, ice cream, aerated drinks, snacks.
 */
export function getCategoryGstRate(category = "", itemName = "") {
  const cat = String(category || "").toLowerCase().trim();
  const name = String(itemName || "").toLowerCase().trim();

  // 1. Check for 0% (Exempt / Nil Rated)
  if (
    cat.includes("fruit") ||
    cat.includes("vegetable") ||
    cat.includes("fresh") ||
    name.includes("fresh milk") ||
    name.includes("curd") ||
    name.includes("dahi") ||
    name.includes("fresh egg") ||
    name.includes("salt") ||
    name.includes("loose")
  ) {
    return 0;
  }

  // 2. Check for 18% (Personal Care, Cleaning, Household, Confectionery, Cold Drinks)
  if (
    cat.includes("personal") ||
    cat.includes("beauty") ||
    cat.includes("skin") ||
    cat.includes("hair") ||
    cat.includes("oral") ||
    cat.includes("bath") ||
    cat.includes("clean") ||
    cat.includes("household") ||
    cat.includes("detergent") ||
    cat.includes("beverage") ||
    cat.includes("drink") ||
    cat.includes("ice cream") ||
    cat.includes("chocolate") ||
    cat.includes("biscuit") ||
    name.includes("shampoo") ||
    name.includes("soap") ||
    name.includes("paste") ||
    name.includes("cream") ||
    name.includes("coca") ||
    name.includes("pepsi") ||
    name.includes("sprite") ||
    name.includes("thums")
  ) {
    return 18;
  }

  // 3. Check for 12% (Butter, Cheese, Ghee, Juices, Sauces)
  if (
    cat.includes("sauce") ||
    cat.includes("spread") ||
    name.includes("butter") ||
    name.includes("cheese") ||
    name.includes("ghee") ||
    name.includes("ketchup") ||
    name.includes("juice") ||
    name.includes("mayo") ||
    name.includes("pasta")
  ) {
    return 12;
  }

  // 4. Default for FMCG packaged grocery, staples, dairy, bakery, snacks is 5%
  return 5;
}

/**
 * Computes GST breakdown for a single order.
 * Sales in Anantnag, J&K are intra-state:
 *  - CGST = GST Rate / 2
 *  - SGST = GST Rate / 2
 *  - IGST = 0
 */
export function computeOrderGst(order) {
  if (!order) return null;

  const orderId = order.orderId || order.id || "DSH-000";
  const items = Array.isArray(order.items) ? order.items : [];
  const rawSubtotal = items.reduce(
    (sum, it) => sum + (Number(it.price) || 0) * (Number(it.qty || it.quantity) || 1),
    0
  );

  const deliveryFee = Number(order.deliveryFee ?? 0);
  const discount = Number(order.discount ?? order.couponDiscount ?? 0);
  const orderTotal = Number(order.totalAmount ?? order.total ?? Math.max(0, rawSubtotal + deliveryFee - discount)) || 0;

  // Discount proration ratio
  const discountRatio = rawSubtotal > 0 ? Math.max(0, (rawSubtotal - discount) / rawSubtotal) : 1;

  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalTax = 0;

  const rateSlabs = {
    0: { rate: 0, taxable: 0, cgst: 0, sgst: 0, tax: 0, gross: 0 },
    5: { rate: 5, taxable: 0, cgst: 0, sgst: 0, tax: 0, gross: 0 },
    12: { rate: 12, taxable: 0, cgst: 0, sgst: 0, tax: 0, gross: 0 },
    18: { rate: 18, taxable: 0, cgst: 0, sgst: 0, tax: 0, gross: 0 },
  };

  const itemDetails = items.map((it) => {
    const qty = Number(it.qty || it.quantity) || 1;
    const unitPrice = Number(it.price) || 0;
    const rawLineGross = unitPrice * qty;
    // Net line gross after coupon discount proration
    const lineGross = Math.round(rawLineGross * discountRatio * 100) / 100;

    const rate = getCategoryGstRate(it.cat || it.category, it.name);
    // Backward calculation: Taxable = Gross / (1 + Rate/100)
    const taxable = Math.round((lineGross / (1 + rate / 100)) * 100) / 100;
    const tax = Math.round((lineGross - taxable) * 100) / 100;
    const cgst = Math.round((tax / 2) * 100) / 100;
    const sgst = Math.round((tax - cgst) * 100) / 100; // avoid 1-paisa rounding gap

    if (!rateSlabs[rate]) {
      rateSlabs[rate] = { rate, taxable: 0, cgst: 0, sgst: 0, tax: 0, gross: 0 };
    }
    rateSlabs[rate].taxable += taxable;
    rateSlabs[rate].cgst += cgst;
    rateSlabs[rate].sgst += sgst;
    rateSlabs[rate].tax += tax;
    rateSlabs[rate].gross += lineGross;

    totalTaxable += taxable;
    totalCgst += cgst;
    totalSgst += sgst;
    totalTax += tax;

    return {
      name: it.name || "Item",
      cat: it.cat || it.category || "Grocery",
      hsn: it.hsn || (rate === 0 ? "0709" : rate === 5 ? "1905" : rate === 12 ? "0405" : "3305"),
      qty,
      unitPrice,
      rawLineGross,
      lineGross,
      gstRate: rate,
      taxable,
      cgst,
      sgst,
      tax
    };
  });

  // Delivery fee tax (18% under SAC 9968)
  if (deliveryFee > 0) {
    const delTaxable = Math.round((deliveryFee / 1.18) * 100) / 100;
    const delTax = Math.round((deliveryFee - delTaxable) * 100) / 100;
    const delCgst = Math.round((delTax / 2) * 100) / 100;
    const delSgst = Math.round((delTax - delCgst) * 100) / 100;

    rateSlabs[18].taxable += delTaxable;
    rateSlabs[18].cgst += delCgst;
    rateSlabs[18].sgst += delSgst;
    rateSlabs[18].tax += delTax;
    rateSlabs[18].gross += deliveryFee;

    totalTaxable += delTaxable;
    totalCgst += delCgst;
    totalSgst += delSgst;
    totalTax += delTax;
  }

  // Round summary figures to 2 decimal places
  totalTaxable = Math.round(totalTaxable * 100) / 100;
  totalCgst = Math.round(totalCgst * 100) / 100;
  totalSgst = Math.round(totalSgst * 100) / 100;
  totalTax = Math.round(totalTax * 100) / 100;

  const orderMs = orderTimeMs(order);
  const formattedDate = orderMs
    ? new Date(orderMs).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })
    : "—";
  const formattedTime = orderMs
    ? new Date(orderMs).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })
    : "—";

  return {
    orderId,
    invoiceNumber: `INV-${orderId.replace(/[^A-Za-z0-9]/g, "").slice(-8)}`,
    date: formattedDate,
    time: formattedTime,
    timestamp: orderMs || Date.now(),
    customerName: order.customerName || order.userAddress?.name || "Customer",
    customerMobile: order.customerPhone || order.mobile || order.userAddress?.phone || "—",
    deliveryAddress: orderAddress(order, "Anantnag, J&K"),
    placeOfSupply: "Jammu & Kashmir (01)",
    paymentMethod: order.paymentMethod || "Cash on Delivery",
    status: order.status || "Placed",
    subtotal: rawSubtotal,
    deliveryFee,
    discount,
    grandTotal: orderTotal,
    totalTaxable,
    totalCgst,
    totalSgst,
    totalTax,
    items: itemDetails,
    slabs: rateSlabs
  };
}

/**
 * Filter and compute aggregated GST report across all orders.
 */
export function computeAggregatedGstReport(orders = [], filterOptions = {}) {
  const {
    period = "all", // "today" | "this-month" | "last-month" | "this-quarter" | "all" | "custom"
    statusFilter = "delivered", // "delivered" (realized) | "all"
    startDate = null,
    endDate = null
  } = filterOptions;

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999).getTime();

  // Current Financial Quarter (Indian FY: Apr-Jun Q1, Jul-Sep Q2, Oct-Dec Q3, Jan-Mar Q4)
  const currentQuarterMonth = Math.floor(now.getMonth() / 3) * 3;
  const startOfThisQuarter = new Date(now.getFullYear(), currentQuarterMonth, 1).getTime();

  const filteredOrders = orders.filter((o) => {
    // 1. Status Filter
    if (statusFilter === "delivered") {
      const s = String(o.status || "").toLowerCase();
      if (s !== "delivered") return false;
    } else {
      const s = String(o.status || "").toLowerCase();
      if (s === "cancelled") return false;
    }

    // 2. Date Filter
    const time = orderTimeMs(o);
    if (!time) return true; // Keep if undated

    if (period === "today") return time >= startOfToday;
    if (period === "this-month") return time >= startOfThisMonth;
    if (period === "last-month") return time >= startOfLastMonth && time <= endOfLastMonth;
    if (period === "this-quarter") return time >= startOfThisQuarter;
    if (period === "custom") {
      if (startDate && time < new Date(startDate).getTime()) return false;
      if (endDate && time > new Date(endDate).getTime() + 86400000) return false;
    }
    return true;
  });

  const computedOrders = filteredOrders.map(computeOrderGst).filter(Boolean);

  let totalGross = 0;
  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalTax = 0;
  let totalDelivery = 0;
  let totalDiscounts = 0;

  const slabs = {
    0: { rate: 0, label: "0% (Nil / Exempt)", taxable: 0, cgst: 0, sgst: 0, tax: 0, gross: 0 },
    5: { rate: 5, label: "5% (Grocery & Staples)", taxable: 0, cgst: 0, sgst: 0, tax: 0, gross: 0 },
    12: { rate: 12, label: "12% (Dairy & Processed)", taxable: 0, cgst: 0, sgst: 0, tax: 0, gross: 0 },
    18: { rate: 18, label: "18% (Personal & Cleaning)", taxable: 0, cgst: 0, sgst: 0, tax: 0, gross: 0 },
  };

  computedOrders.forEach((co) => {
    totalGross += co.grandTotal;
    totalTaxable += co.totalTaxable;
    totalCgst += co.totalCgst;
    totalSgst += co.totalSgst;
    totalTax += co.totalTax;
    totalDelivery += co.deliveryFee;
    totalDiscounts += co.discount;

    [0, 5, 12, 18].forEach((r) => {
      if (co.slabs[r]) {
        slabs[r].taxable += co.slabs[r].taxable;
        slabs[r].cgst += co.slabs[r].cgst;
        slabs[r].sgst += co.slabs[r].sgst;
        slabs[r].tax += co.slabs[r].tax;
        slabs[r].gross += co.slabs[r].gross;
      }
    });
  });

  // Round slabs
  [0, 5, 12, 18].forEach((r) => {
    slabs[r].taxable = Math.round(slabs[r].taxable * 100) / 100;
    slabs[r].cgst = Math.round(slabs[r].cgst * 100) / 100;
    slabs[r].sgst = Math.round(slabs[r].sgst * 100) / 100;
    slabs[r].tax = Math.round(slabs[r].tax * 100) / 100;
    slabs[r].gross = Math.round(slabs[r].gross * 100) / 100;
  });

  return {
    orderCount: computedOrders.length,
    orders: computedOrders,
    totalGross: Math.round(totalGross * 100) / 100,
    totalTaxable: Math.round(totalTaxable * 100) / 100,
    totalCgst: Math.round(totalCgst * 100) / 100,
    totalSgst: Math.round(totalSgst * 100) / 100,
    totalTax: Math.round(totalTax * 100) / 100,
    totalDelivery: Math.round(totalDelivery * 100) / 100,
    totalDiscounts: Math.round(totalDiscounts * 100) / 100,
    slabs,
    period,
    statusFilter
  };
}

/**
 * GSTR-1 Sales Register Columns Definition (for CSV / Excel export)
 */
export const GSTR1_CSV_COLUMNS = [
  { header: "Invoice Number", accessor: (o) => o.invoiceNumber },
  { header: "Order ID", accessor: (o) => o.orderId },
  { header: "Invoice Date", accessor: (o) => o.date },
  { header: "Invoice Time", accessor: (o) => o.time },
  { header: "Customer Name", accessor: (o) => o.customerName },
  { header: "Customer Mobile", accessor: (o) => o.customerMobile },
  { header: "Place of Supply", accessor: (o) => o.placeOfSupply },
  { header: "Supply Type", accessor: () => "Intra-State (B2C Others)" },
  { header: "Reverse Charge", accessor: () => "N" },
  { header: "Applicable % of Tax Rate", accessor: () => "100" },
  { header: "Gross Invoice Value (INR)", accessor: (o) => o.grandTotal },
  { header: "Total Taxable Value (INR)", accessor: (o) => o.totalTaxable },
  { header: "Central Tax CGST (INR)", accessor: (o) => o.totalCgst },
  { header: "State Tax SGST (INR)", accessor: (o) => o.totalSgst },
  { header: "Integrated Tax IGST (INR)", accessor: () => 0 },
  { header: "Cess Amount (INR)", accessor: () => 0 },
  { header: "Delivery Charges (INR)", accessor: (o) => o.deliveryFee },
  { header: "Discounts Deducted (INR)", accessor: (o) => o.discount },
  { header: "Payment Mode", accessor: (o) => o.paymentMethod },
  { header: "Order Status", accessor: (o) => o.status },
  { header: "Delivery Address", accessor: (o) => o.deliveryAddress },
];

/**
 * Generates an RFC-4180 CSV string of the GSTR-1 Sales Register with UTF-8 BOM.
 */
export function generateGstr1CsvString(computedOrders = []) {
  if (!Array.isArray(computedOrders) || computedOrders.length === 0) return "";

  const headerLine = GSTR1_CSV_COLUMNS
    .map((col) => `"${String(col.header).replace(/"/g, '""')}"`)
    .join(",");

  const dataLines = computedOrders.map((row) =>
    GSTR1_CSV_COLUMNS.map((col) => {
      let val = typeof col.accessor === "function" ? col.accessor(row) : row[col.accessor];
      if (val === null || val === undefined) val = "";
      return `"${String(val).replace(/"/g, '""')}"`;
    }).join(",")
  );

  return "\uFEFF" + [headerLine, ...dataLines].join("\r\n");
}
