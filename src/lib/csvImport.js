/**
 * DASHit Client-Side CSV Import & Validation Engine
 * Features:
 * - Robust client-side RFC 4180 CSV parser (supports quotes, commas, UTF-8 BOM).
 * - Fuzzy column mapping from common distributor/wholesaler headers.
 * - Row validation (Valid, Warning, Error) with inline editable data structure.
 * - Firestore writeBatch committer with localStorage fallback and progress callbacks.
 * - Sample template generator with authentic Kashmiri FMCG products.
 */

import { getDb } from "./firebase";
import { doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { get4KPhotoSuggestions } from "./barcodeCatalog";

/**
 * Standard column mapping alias dictionary
 */
const HEADER_MAPPINGS = {
  name: ["name", "product_name", "product", "item_name", "item", "title", "product_title", "description"],
  price: ["price", "selling_price", "sp", "rate", "our_price", "retail_price", "sale_price", "cost"],
  originalPrice: ["originalprice", "mrp", "list_price", "marked_price", "regular_price", "maximum_retail_price"],
  cat: ["cat", "category", "dept", "department", "section", "group", "product_category"],
  unit: ["unit", "pack", "size", "weight", "volume", "pack_size", "qty_unit", "packaging"],
  stock: ["stock", "qty", "quantity", "inventory", "count", "units", "available_stock"],
  barcode: ["barcode", "sku", "code", "upc", "ean", "item_code", "product_code"],
  brand: ["brand", "company", "manufacturer", "make"],
  img: ["img", "image", "photo", "image_url", "picture", "img_url", "thumbnail"],
  badge: ["badge", "tag", "label", "offer_tag"],
};

/**
 * Picks the separator by counting candidates outside quotes on the header line.
 * Falls back to a comma when the header has none of them.
 */
function detectDelimiter(text) {
  const headerLine = text.split(/\r?\n/, 1)[0] || "";
  const candidates = [",", "\t", ";", "|"];
  let best = ",";
  let bestCount = 0;

  for (const candidate of candidates) {
    let count = 0;
    let inQuotes = false;
    for (let i = 0; i < headerLine.length; i += 1) {
      const ch = headerLine[i];
      if (ch === '"') {
        // A doubled quote inside a quoted field is an escaped quote, not a toggle.
        if (inQuotes && headerLine[i + 1] === '"') i += 1;
        else inQuotes = !inQuotes;
      } else if (!inQuotes && ch === candidate) {
        count += 1;
      }
    }
    if (count > bestCount) {
      bestCount = count;
      best = candidate;
    }
  }
  return best;
}

/**
 * Robust RFC 4180 CSV text parser
 */
export function parseCsvText(csvText) {
  if (!csvText || typeof csvText !== "string") return { headers: [], rows: [] };

  // Strip UTF-8 BOM if present
  let cleanText = csvText.replace(/^\uFEFF/, "").trim();
  if (!cleanText) return { headers: [], rows: [] };

  /*
   * The delimiter is decided once, from the header line.
   *
   * Every one of ",", tab and ";" used to be treated as a separator at the same
   * time, so a comma-separated file with a semicolon inside an unquoted product
   * name was silently torn into an extra column:
   *
   *   Shampoo 200ml; Anti-Dandruff,145,8
   *     -> ["Shampoo 200ml", "Anti-Dandruff", "145", "8"]
   *
   * Every field after it then shifted, so the price column ended up holding
   * "Anti-Dandruff" and the stock column held the price. Nothing warned about
   * it. Now whichever separator appears most often outside quotes in the header
   * wins, and the rest are ordinary characters.
   */
  const delimiter = detectDelimiter(cleanText);

  const lines = [];
  let currentRow = [];
  let currentField = "";
  let insideQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (insideQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // Skip escaped quote
        } else {
          insideQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        insideQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentField.trim());
        currentField = "";
      } else if (char === "\r" || char === "\n") {
        currentRow.push(currentField.trim());
        if (currentRow.some((field) => field.length > 0)) {
          lines.push(currentRow);
        }
        currentRow = [];
        currentField = "";
        if (char === "\r" && nextChar === "\n") i++; // Handle CRLF
      } else {
        currentField += char;
      }
    }
  }

  // Push final field if any
  if (currentField || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.some((field) => field.length > 0)) {
      lines.push(currentRow);
    }
  }

  if (lines.length === 0) return { headers: [], rows: [] };

  const rawHeaders = lines[0].map((h) => h.trim());
  const rawRows = lines.slice(1);

  return { headers: rawHeaders, rows: rawRows };
}

/**
 * Detects best match mapping for each target field from the raw CSV headers
 */
export function autoDetectColumnMapping(headers = []) {
  const mapping = {};
  const normalizedHeaders = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));

  Object.keys(HEADER_MAPPINGS).forEach((targetKey) => {
    const aliases = HEADER_MAPPINGS[targetKey];
    for (let i = 0; i < normalizedHeaders.length; i++) {
      const headerNorm = normalizedHeaders[i];
      if (aliases.some((alias) => headerNorm === alias.replace(/[^a-z0-9]/g, "") || headerNorm.includes(alias))) {
        mapping[targetKey] = headers[i];
        break;
      }
    }
  });

  return mapping;
}

/**
 * Validates and converts raw parsed row data into structured product items
 */
export function processRawRows(rawRows, headers, columnMapping) {
  const headerIndexMap = {};
  headers.forEach((h, idx) => {
    headerIndexMap[h] = idx;
  });

  return rawRows.map((row, index) => {
    const getValue = (key) => {
      const headerName = columnMapping[key];
      if (!headerName || headerIndexMap[headerName] === undefined) return "";
      return row[headerIndexMap[headerName]] || "";
    };

    const rawName = getValue("name").trim();
    const rawCat = getValue("cat").trim() || "Snacks";
    const rawPrice = getValue("price").replace(/[^0-9.]/g, "");
    const rawOriginalPrice = getValue("originalPrice").replace(/[^0-9.]/g, "");
    const rawStock = getValue("stock").replace(/[^0-9]/g, "");
    const rawUnit = getValue("unit").trim() || "1 pack";
    const rawBrand = getValue("brand").trim() || "DashIt Retail";
    const rawBarcode = getValue("barcode").trim() || `SKU-${Date.now()}-${index}`;
    const rawImg = getValue("img").trim();
    const rawBadge = getValue("badge").trim();

    const price = parseFloat(rawPrice) || 0;
    const originalPrice = parseFloat(rawOriginalPrice) || price;
    const stock = rawStock ? parseInt(rawStock, 10) : 50;

    const rowId = `import-row-${index}-${Date.now()}`;
    const errors = [];
    const warnings = [];

    // Validation Rules
    if (!rawName) {
      errors.push("Product title is required.");
    }
    if (price <= 0) {
      errors.push("Valid price greater than ₹0 is required.");
    }
    if (stock < 0) {
      errors.push("Stock cannot be negative.");
    }

    // Auto image fallback suggestion
    let finalImg = rawImg;
    if (!finalImg) {
      const suggestions = get4KPhotoSuggestions(rawCat);
      if (suggestions && suggestions.length > 0) {
        finalImg = suggestions[index % suggestions.length];
        warnings.push("Image was missing; high-res category stock photo was assigned.");
      } else {
        warnings.push("No image specified.");
      }
    }

    const status = errors.length > 0 ? "error" : warnings.length > 0 ? "warning" : "valid";

    return {
      _id: rowId,
      _index: index + 1,
      _status: status,
      _errors: errors,
      _warnings: warnings,
      name: rawName,
      cat: rawCat,
      price,
      originalPrice: Math.max(originalPrice, price),
      unit: rawUnit,
      brand: rawBrand,
      stock,
      barcode: rawBarcode,
      img: finalImg,
      badge: rawBadge,
    };
  });
}

/**
 * Publishes validated items into Firestore using batch operations and synchronizes localStorage
 */
export async function publishImportedProducts(validatedProducts = [], onProgress) {
  const readyItems = validatedProducts.filter((p) => p._status !== "error");
  if (readyItems.length === 0) {
    return { success: false, message: "No valid products to publish." };
  }

  const db = getDb();
  const CHUNK_SIZE = 400; // Firestore allows 500 writes per batch.
  let publishedCount = 0;
  let failedCount = 0;
  let lastError = null;

  // Prepare standard product entities
  const cleanProducts = readyItems.map((p) => {
    const prodId = p.barcode || p.id || `PROD-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    return {
      id: prodId,
      barcode: prodId,
      name: p.name,
      cat: p.cat,
      price: Number(p.price) || 0,
      originalPrice: Number(p.originalPrice) || Number(p.price) || 0,
      unit: p.unit || "1 pack",
      brand: p.brand || "DashIt Retail",
      stock: Number(p.stock) || 0,
      img: p.img || "",
      badge: p.badge || "",
      active: true,
    };
  });

  // 1. Commit in chunks to Firestore
  if (db) {
    for (let i = 0; i < cleanProducts.length; i += CHUNK_SIZE) {
      const chunk = cleanProducts.slice(i, i + CHUNK_SIZE);
      try {
        const batch = writeBatch(db);
        chunk.forEach((prod) => {
          const docRef = doc(db, "products", String(prod.id));
          batch.set(docRef, { ...prod, updatedAt: serverTimestamp() }, { merge: true });
        });
        await batch.commit();
        publishedCount += chunk.length;
      } catch (err) {
        /* A rejected chunk is counted as failed, not published.
           This used to log a warning and then add the chunk to publishedCount
           anyway, returning "Successfully published N products" — so an import
           that Firestore refused outright (a missing staff role, a rules denial,
           no connection) told the owner their catalogue was live when nothing
           had reached the server, and they would restock against it. */
        console.warn("Batch write rejected for chunk:", err?.message);
        failedCount += chunk.length;
        lastError = err?.message || "Firestore rejected the write";
      }
      if (onProgress) onProgress(publishedCount + failedCount, cleanProducts.length);
    }
  } else {
    // No Firestore configured at all: local-only demo mode.
    publishedCount = cleanProducts.length;
    if (onProgress) onProgress(publishedCount, cleanProducts.length);
  }

  // 2. Synchronize to localStorage and trigger cross-tab update
  if (typeof window !== "undefined") {
    try {
      const existing = JSON.parse(localStorage.getItem("dashit_custom_products") || "[]");
      const existingMap = new Map(existing.map((item) => [String(item.id || item.barcode), item]));
      cleanProducts.forEach((p) => existingMap.set(String(p.id), p));
      localStorage.setItem("dashit_custom_products", JSON.stringify(Array.from(existingMap.values())));
      window.dispatchEvent(new CustomEvent("dashit_products_updated"));
    } catch (e) {}
  }

  if (failedCount > 0) {
    return {
      success: false,
      count: publishedCount,
      failed: failedCount,
      message:
        publishedCount > 0
          ? `Published ${publishedCount}, but ${failedCount} could not be saved to the store (${lastError}). Please retry those.`
          : `Nothing was published — the store rejected the upload (${lastError}).`,
    };
  }

  return {
    success: true,
    count: publishedCount,
    failed: 0,
    message: `Published ${publishedCount} product${publishedCount === 1 ? "" : "s"} to the live catalogue.`,
  };
}

/**
 * Generates sample CSV template for quick store inventory uploads
 */
export function generateSampleCsvTemplate() {
  return `Barcode,Product Name,Category,Brand,Selling Price,MRP,Pack Unit,Stock Quantity,Badge
8901058852331,Lay's India's Magic Masala Chips,Snacks,Lay's,20,20,50g,100,Bestseller
8901030384102,Amul Taaza Homogenised Toned Milk,Dairy & Bakery,Amul,35,36,500ml,60,Fresh Daily
8906001020304,Kashmiri Shirmal Sweet Bread,Bakery & Breads,Anantnag Bakers,40,45,2 pcs,40,Local Special
8901063142211,Britannia Good Day Butter Cookies,Biscuits & Bakery,Britannia,30,30,100g,80,
8901058850023,Kurkure Masala Munch,Snacks,Kurkure,20,20,75g,120,Crispy
8901012111222,Tata Salt Vacuum Evaporated,Atta, Rice & Dal,Tata,28,30,1kg,90,Purity
8904004400111,Kashmiri Saffron Mongra Grade A,Gourmet & Spices,Pampore Organic,299,350,1g,25,Pure Mongra
8901030010203,Maggi 2-Minute Masala Noodles,Instant Food,Nestle,14,14,70g,150,Fast Snack`;
}
