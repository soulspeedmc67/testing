/**
 * DASHit RFC 4180 Compliant CSV Export Engine
 * Features:
 * - Proper escaping of quotes, commas, newlines, and special characters.
 * - Prepends UTF-8 Byte Order Mark (\uFEFF) to guarantee proper rendering in Microsoft Excel.
 * - Handles client-side file download via Blob + temporary link trigger.
 */

import { orderAddress, orderTimeMs } from "./orderReceipt";

/**
 * Serializes an array of objects into an RFC 4180 CSV string.
 * @param {Array<Object>} data - Array of records
 * @param {Array<{ header: string, accessor: string|Function }>} columns - Column definitions
 * @returns {string} Formatted CSV string
 */
export function generateCsvString(data = [], columns = []) {
  if (!Array.isArray(data) || !Array.isArray(columns) || columns.length === 0) {
    return "";
  }

  // 1. Header row
  const headerLine = columns
    .map((col) => `"${String(col.header || "").replace(/"/g, '""')}"`)
    .join(",");

  // 2. Data rows
  const dataLines = data.map((row) => {
    return columns
      .map((col) => {
        let val = "";
        if (typeof col.accessor === "function") {
          val = col.accessor(row);
        } else if (col.accessor) {
          val = row[col.accessor];
        }
        if (val === null || val === undefined) {
          return '""';
        }
        const strVal = String(val).replace(/"/g, '""');
        return `"${strVal}"`;
      })
      .join(",");
  });

  // UTF-8 BOM ensures seamless Unicode display in Excel without mojibake
  return "\uFEFF" + [headerLine, ...dataLines].join("\r\n");
}

/**
 * Triggers a browser download of a CSV file.
 * @param {string} csvString - CSV content
 * @param {string} filename - Desired filename
 */
export function triggerCsvDownload(csvString, filename = "dashit-export.csv") {
  if (!csvString) return;

  const blob = new Blob([csvString], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Standard Column Definitions for DASHit Entities
 */
export const CATALOGUE_CSV_COLUMNS = [
  { header: "Product ID", accessor: (p) => p.id || p.barcode || "" },
  { header: "Barcode / SKU", accessor: (p) => p.barcode || p.id || "" },
  { header: "Product Name", accessor: (p) => p.name || "" },
  { header: "Category", accessor: (p) => p.cat || "" },
  { header: "Brand", accessor: (p) => p.brand || "" },
  { header: "Selling Price (INR)", accessor: (p) => p.price ?? 0 },
  { header: "MRP (INR)", accessor: (p) => p.originalPrice ?? p.price ?? 0 },
  { header: "Discount (%)", accessor: (p) => {
    const orig = Number(p.originalPrice) || Number(p.price) || 0;
    const curr = Number(p.price) || 0;
    return orig > curr ? Math.round(((orig - curr) / orig) * 100) : 0;
  }},
  { header: "Pack Unit", accessor: (p) => p.unit || "1 pack" },
  { header: "Current Stock", accessor: (p) => p.stock ?? 0 },
  { header: "Stock Status", accessor: (p) => {
    const s = Number(p.stock) || 0;
    if (s <= 0) return "Out of Stock";
    if (s <= 10) return "Low Stock";
    return "In Stock";
  }},
  { header: "Image URL", accessor: (p) => p.img || "" },
  { header: "Badge", accessor: (p) => p.badge || "" },
];

export const INVENTORY_CSV_COLUMNS = [
  { header: "SKU / Barcode", accessor: (p) => p.barcode || p.id || "" },
  { header: "Product Name", accessor: (p) => p.name || "" },
  { header: "Category", accessor: (p) => p.cat || "General" },
  { header: "Current Stock", accessor: (p) => p.stock ?? 0 },
  { header: "Stock Status", accessor: (p) => {
    const s = Number(p.stock) || 0;
    if (s <= 0) return "OUT OF STOCK";
    if (s <= 10) return "LOW STOCK";
    return "HEALTHY";
  }},
  { header: "Unit Selling Price (INR)", accessor: (p) => p.price ?? 0 },
  { header: "Estimated Value (INR)", accessor: (p) => (Number(p.price) || 0) * (Number(p.stock) || 0) },
  { header: "Reorder Required", accessor: (p) => (Number(p.stock) || 0) <= 10 ? "YES" : "NO" },
];

export const ORDERS_CSV_COLUMNS = [
  { header: "Order ID", accessor: (o) => o.orderId || o.id || "" },
  { header: "Customer Name", accessor: (o) => o.customerName || "Customer" },
  { header: "Mobile", accessor: (o) => o.mobile || o.customerMobile || o.phone || "" },
  // Uses the shared resolver so legacy userAddress / deliveryAddress shapes
  // export correctly instead of coming out blank.
  { header: "Delivery Address", accessor: (o) => orderAddress(o, "") },
  { header: "Total Amount (INR)", accessor: (o) => o.totalAmount || o.total || 0 },
  { header: "Payment Method", accessor: (o) => o.paymentMethod || "COD" },
  { header: "Status", accessor: (o) => o.status || "placed" },
  { header: "Item Count", accessor: (o) => o.items?.length || 1 },
  { header: "Rider Name", accessor: (o) => o.driverName || "Unassigned" },
  /* createdAt is a Firestore Timestamp for anything read from the server, and
     `new Date({seconds, nanoseconds})` is Invalid Date — so every exported row
     said "Invalid Date". orderTimeMs() normalises all the shapes. */
  {
    header: "Order Date",
    accessor: (o) => {
      const ms = orderTimeMs(o);
      return ms ? new Date(ms).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "";
    },
  },
];
