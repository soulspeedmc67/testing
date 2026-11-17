/**
 * A partner shop's stock, in pure functions (no Firebase, so they can be tested
 * on their own): what state an item is in, the totals the dashboards show, and
 * tidying what a partner types before it is saved.
 *
 * The limits here are the ones firestore.rules enforces (partnerProductOk);
 * keep the two in step, or a save the screen allows would be refused.
 */

export const DEFAULT_LOW_AT = 5;

export const LIMITS = Object.freeze({
  name: 120,
  category: 60,
  unit: 30,
  barcode: 40,
  description: 500,
  img: 500,
  price: 10000000,
  stock: 1000000,
  lowStockAt: 100000,
});

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const round2 = (n) => Math.round(n * 100) / 100;

/** "out", "low", "ok", or "hidden" (switched off for customers). */
export function stockState(p) {
  if (!p) return "ok";
  if (p.active === false) return "hidden";
  const stock = num(p.stock);
  if (stock <= 0) return "out";
  const low = p.lowStockAt === undefined || p.lowStockAt === null || p.lowStockAt === "" ? DEFAULT_LOW_AT : num(p.lowStockAt);
  return stock <= low ? "low" : "ok";
}

/** Whole-number percent off the MRP, or 0 when there is no real discount. */
export function discountPercent(p) {
  const price = num(p?.price);
  const mrp = num(p?.mrp);
  return mrp > price && price >= 0 ? Math.round(((mrp - price) / mrp) * 100) : 0;
}

/** The totals a dashboard shows for a list of products. */
export function summarise(products) {
  const out = { items: 0, units: 0, ok: 0, low: 0, out: 0, hidden: 0, stockValue: 0, retailValue: 0, lastUpdated: 0 };
  for (const p of products || []) {
    out.items += 1;
    const stock = Math.max(0, num(p.stock));
    out.units += stock;
    out[stockState(p)] += 1;
    out.stockValue += stock * num(p.price);
    out.retailValue += stock * Math.max(num(p.mrp), num(p.price));
    const t = typeof p.updatedAt?.toMillis === "function" ? p.updatedAt.toMillis() : num(p.updatedAt);
    if (t > out.lastUpdated) out.lastUpdated = t;
  }
  out.units = round2(out.units);
  out.stockValue = round2(out.stockValue);
  out.retailValue = round2(out.retailValue);
  return out;
}

/** "₹1,23,456", with paise only when there are some. */
export function formatINR(n) {
  const v = round2(num(n));
  const whole = Number.isInteger(v);
  return "₹" + v.toLocaleString("en-IN", { minimumFractionDigits: whole ? 0 : 2, maximumFractionDigits: 2 });
}

/** "12 minutes ago", "3 hours ago", "5 Nov", or "never". */
export function timeAgo(ms, now = Date.now()) {
  if (!ms) return "never";
  const s = Math.max(0, Math.round((now - ms) / 1000));
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`;
  if (s < 86400 * 7) return `${Math.floor(s / 86400)} d ago`;
  return new Date(ms).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

const isHttps = (url) => /^https:\/\/\S+$/i.test(String(url || "").trim());
const text = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);

/**
 * What a partner typed, made ready to save: { ok, data, errors }.
 * `data` holds only the fields the rules allow; timestamps are added by the caller.
 */
export function cleanProduct(form) {
  const errors = {};
  const name = text(form?.name, LIMITS.name);
  if (!name) errors.name = "Give the item a name.";

  const priceRaw = String(form?.price ?? "").trim();
  const price = Number(priceRaw);
  if (priceRaw === "" || !Number.isFinite(price) || price < 0) errors.price = "Enter the selling price.";
  else if (price > LIMITS.price) errors.price = "That price is too high.";

  const stockRaw = String(form?.stock ?? "").trim();
  const stock = Number(stockRaw);
  if (stockRaw === "" || !Number.isFinite(stock) || stock < 0) errors.stock = "Enter how many you have (0 if none).";
  else if (stock > LIMITS.stock) errors.stock = "That is too many.";

  const mrpRaw = String(form?.mrp ?? "").trim();
  let mrp = 0;
  if (mrpRaw !== "") {
    mrp = Number(mrpRaw);
    if (!Number.isFinite(mrp) || mrp < 0) errors.mrp = "Enter the MRP, or leave it empty.";
    else if (mrp > LIMITS.price) errors.mrp = "That MRP is too high.";
    else if (mrp > 0 && Number.isFinite(price) && mrp < price) errors.mrp = "The MRP cannot be lower than the selling price.";
  }

  const lowRaw = String(form?.lowStockAt ?? "").trim();
  let lowStockAt = DEFAULT_LOW_AT;
  if (lowRaw !== "") {
    lowStockAt = Number(lowRaw);
    if (!Number.isFinite(lowStockAt) || lowStockAt < 0 || lowStockAt > LIMITS.lowStockAt) errors.lowStockAt = "Enter a number from 0 up.";
  }

  const img = String(form?.img ?? "").trim();
  if (img !== "" && (!isHttps(img) || img.length > LIMITS.img)) errors.img = "A photo link must start with https://";

  if (Object.keys(errors).length) return { ok: false, data: null, errors };

  const data = {
    name,
    price: round2(price),
    stock: round2(stock),
    lowStockAt: round2(lowStockAt),
    active: form?.active !== false,
  };
  if (mrp > 0) data.mrp = round2(mrp);
  const category = text(form?.category, LIMITS.category);
  const unit = text(form?.unit, LIMITS.unit);
  const barcode = text(form?.barcode, LIMITS.barcode);
  const description = text(form?.description, LIMITS.description);
  if (category) data.category = category;
  if (unit) data.unit = unit;
  if (barcode) data.barcode = barcode;
  if (description) data.description = description;
  if (img) data.img = img;
  return { ok: true, data, errors: {} };
}
