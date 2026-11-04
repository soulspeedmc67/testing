/**
 * The spotlight: one special, highlighted tab in the home screen's category
 * strip ("Festive Specials", "Winter Picks"…). Picking it turns the home
 * screen gold and shows the owner's own groups ("Bedsheets & Towels",
 * "Diyas & Décor"…), each with a photo tile and its items.
 *
 * It is one document, `config/spotlight` (anyone reads `config`, only admins
 * write it: no rules change). The website (src/pages/shop.js), the iPhone app
 * (Spotlight.swift) and the Android app (Spotlight.kt) read the same fields:
 *
 *   enabled    boolean   off = no tab anywhere
 *   tabLabel   string    the tab's word in the strip (≤ 14 letters)
 *   title      string    the big gold heading
 *   subtitle   string    one line under it
 *   sections   [{ id, name, img, items: [{ id, name, img, price, mrp, unit }] }]
 *
 * Every item is a real product (`id` = products/{id}), so stock, price,
 * checkout and the stock count work as for any item. The copy kept on the
 * item (name, photo, price) shows until the shop's product file has it (the
 * file is rebuilt every 5 minutes), and if it ever goes missing.
 */

export const SPOTLIGHT_DOC = "spotlight";

export const SPOTLIGHT_DEFAULTS = Object.freeze({
  enabled: false,
  tabLabel: "Specials",
  title: "Festive Specials",
  subtitle: "Handpicked for the season",
  sections: [],
});

export const LIMITS = Object.freeze({ tabLabel: 14, title: 40, subtitle: 80, sectionName: 32, sections: 12, items: 40 });

const text = (v, max) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const money = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : 0;
};
const hasPhoto = (url) => /^https?:\/\/\S+$/i.test(String(url || "").trim());

/** One item, as kept on the spotlight. */
export function cleanItem(raw) {
  if (!raw || !raw.id) return null;
  const price = money(raw.price);
  const mrp = money(raw.mrp ?? raw.originalPrice);
  return {
    id: String(raw.id),
    name: text(raw.name, 90),
    img: String(raw.img || raw.image || "").trim(),
    price,
    mrp: mrp > price ? mrp : 0,
    unit: text(raw.unit, 24),
  };
}

/** The copy of a shop product an item keeps. */
export function itemFromProduct(product) {
  return cleanItem({
    id: product?.id || product?.barcode,
    name: product?.name,
    img: product?.img || product?.image,
    price: product?.price,
    mrp: product?.originalPrice || product?.mrp,
    unit: product?.unit,
  });
}

/** The saved document with every field present and tidy. */
export function normalizeSpotlight(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const sections = (Array.isArray(src.sections) ? src.sections : [])
    .filter((s) => s && s.id)
    .slice(0, LIMITS.sections)
    .map((s) => {
      const seen = new Set();
      const items = (Array.isArray(s.items) ? s.items : [])
        .map(cleanItem)
        .filter((item) => item && !seen.has(item.id) && seen.add(item.id))
        .slice(0, LIMITS.items);
      return { id: String(s.id), name: text(s.name, LIMITS.sectionName), img: String(s.img || "").trim(), items };
    });
  return {
    enabled: src.enabled === true,
    tabLabel: text(src.tabLabel, LIMITS.tabLabel) || SPOTLIGHT_DEFAULTS.tabLabel,
    title: text(src.title, LIMITS.title) || SPOTLIGHT_DEFAULTS.title,
    subtitle: text(src.subtitle, LIMITS.subtitle),
    sections,
  };
}

/** What's wrong before it can be saved, in plain words; empty = fine. */
export function spotlightProblems(spot) {
  const problems = [];
  if (!text(spot?.tabLabel, LIMITS.tabLabel)) problems.push("Give the tab a name.");
  if (!text(spot?.title, LIMITS.title)) problems.push("Give the page a heading.");
  for (const s of spot?.sections || []) {
    const name = text(s.name, LIMITS.sectionName);
    if (!name) problems.push("Every group needs a name.");
    if (!hasPhoto(s.img)) problems.push(`"${name || "A group"}" needs a photo.`);
    for (const item of s.items || []) {
      if (!hasPhoto(item.img)) problems.push(`"${item.name || "An item"}" in "${name}" needs a photo.`);
    }
  }
  if (spot?.enabled && !(spot.sections || []).some((s) => (s.items || []).length > 0)) {
    problems.push("Add at least one item before switching it on.");
  }
  return [...new Set(problems)];
}

/** A group's problems alone (the "Add group" sheet). */
export function sectionProblems({ name, img }) {
  const problems = [];
  if (!text(name, LIMITS.sectionName)) problems.push("Give the group a name.");
  if (!hasPhoto(img)) problems.push("Add a photo for the group.");
  return problems;
}

/** A new item's problems (the "New item" sheet). */
export function newItemProblems({ name, price, mrp, img, unit }) {
  const problems = [];
  if (!text(name, 90)) problems.push("Give the item a name.");
  if (!money(price)) problems.push("Put the selling price.");
  if (money(mrp) && money(mrp) < money(price)) problems.push("The MRP can't be below the price.");
  if (!text(unit, 24)) problems.push("Put the pack size (1 set, 500 ml…).");
  if (!hasPhoto(img)) problems.push("Add a photo of the item.");
  return problems;
}

/** The products/{id} document for a brand-new item. */
export function productFromNewItem({ name, price, mrp, unit, img, stock, cat }, now = Date.now()) {
  const id = `SPOT-${now.toString(36).toUpperCase()}`;
  const count = Math.max(0, Math.floor(Number(stock) || 0));
  const doc = {
    id,
    barcode: id,
    name: text(name, 90),
    price: money(price),
    unit: text(unit, 24),
    img: String(img).trim(),
    cat: text(cat, 40) || "Home & Kitchen",
    distributor: "Myself",
    stock: count,
    inStock: count > 0,
    active: true,
  };
  if (money(mrp) > money(price)) doc.originalPrice = money(mrp);
  return doc;
}

export const newSectionId = (now = Date.now()) => `g${now.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`;

/** Moves the entry at `from` to `to` (a copy). */
export function moveEntry(list, from, to) {
  if (to < 0 || to >= list.length || from === to) return list;
  const next = [...list];
  const [picked] = next.splice(from, 1);
  next.splice(to, 0, picked);
  return next;
}

/**
 * What shoppers see: the groups that have items, each item as the shop's live
 * product (price, stock) or, while the product file hasn't caught up, its copy.
 * `null` when the tab is off or has nothing to show.
 */
export function shopperSpotlight(raw, products = []) {
  const spot = normalizeSpotlight(raw);
  if (!spot.enabled) return null;
  const byId = new Map();
  for (const p of products || []) byId.set(String(p.id || p.barcode), p);
  const sections = spot.sections
    .map((s) => ({
      ...s,
      products: s.items
        .map((item) => {
          const live = byId.get(item.id);
          if (live) return live;
          return {
            id: item.id,
            barcode: item.id,
            name: item.name,
            img: item.img,
            price: item.price,
            originalPrice: item.mrp || undefined,
            unit: item.unit,
            cat: s.name,
            inStock: true,
          };
        })
        .filter((p) => p && p.name && p.active !== false),
    }))
    .filter((s) => s.products.length > 0);
  if (sections.length === 0) return null;
  return { ...spot, sections };
}
