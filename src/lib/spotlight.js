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
 *   items      [{ id, name, img, price, mrp, unit }]   items on their own, no group needed
 *   sections   [{ id, name, img, items: [same] }]       optional groups, each a photo tile
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
  items: [],
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

/** Items as kept: tidy, each once, at most LIMITS.items. */
function cleanItems(list) {
  const seen = new Set();
  return (Array.isArray(list) ? list : [])
    .map(cleanItem)
    .filter((item) => item && !seen.has(item.id) && seen.add(item.id))
    .slice(0, LIMITS.items);
}

/** The saved document with every field present and tidy. */
export function normalizeSpotlight(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  const sections = (Array.isArray(src.sections) ? src.sections : [])
    .filter((s) => s && s.id)
    .slice(0, LIMITS.sections)
    .map((s) => ({ id: String(s.id), name: text(s.name, LIMITS.sectionName), img: String(s.img || "").trim(), items: cleanItems(s.items) }));
  return {
    enabled: src.enabled === true,
    tabLabel: text(src.tabLabel, LIMITS.tabLabel) || SPOTLIGHT_DEFAULTS.tabLabel,
    title: text(src.title, LIMITS.title) || SPOTLIGHT_DEFAULTS.title,
    subtitle: text(src.subtitle, LIMITS.subtitle),
    items: cleanItems(src.items),
    sections,
  };
}

/** Is there anything for shoppers to see: an item on its own or in a group. */
export function hasAnyItem(spot) {
  return (spot?.items || []).length > 0 || (spot?.sections || []).some((s) => (s.items || []).length > 0);
}

/** What's wrong before it can be saved, in plain words; empty = fine. */
export function spotlightProblems(spot) {
  const problems = [];
  if (!text(spot?.tabLabel, LIMITS.tabLabel)) problems.push("Give the tab a name.");
  if (!text(spot?.title, LIMITS.title)) problems.push("Give the page a heading.");
  for (const item of spot?.items || []) {
    if (!hasPhoto(item.img)) problems.push(`"${item.name || "An item"}" needs a photo.`);
  }
  for (const s of spot?.sections || []) {
    const name = text(s.name, LIMITS.sectionName);
    if (!name) problems.push("Every group needs a name.");
    if (!hasPhoto(s.img)) problems.push(`"${name || "A group"}" needs a photo.`);
    for (const item of s.items || []) {
      if (!hasPhoto(item.img)) problems.push(`"${item.name || "An item"}" in "${name}" needs a photo.`);
    }
  }
  if (spot?.enabled && !hasAnyItem(spot)) {
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
 * What shoppers see: the items on their own (`products`) and the groups that
 * have items (`sections`), each item as the shop's live product (price, stock)
 * or, while the product file hasn't caught up, its copy. `null` when the tab
 * is off or has nothing to show. Groups are optional: with none, the page is
 * the heading and the items.
 */
export function shopperSpotlight(raw, products = []) {
  const spot = normalizeSpotlight(raw);
  if (!spot.enabled) return null;
  const byId = new Map();
  for (const p of products || []) byId.set(String(p.id || p.barcode), p);
  const resolve = (items, cat) =>
    items
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
          cat,
          inStock: true,
        };
      })
      .filter((p) => p && p.name && p.active !== false);
  const sections = spot.sections.map((s) => ({ ...s, products: resolve(s.items, s.name) })).filter((s) => s.products.length > 0);
  const loose = resolve(spot.items, spot.tabLabel);
  if (sections.length === 0 && loose.length === 0) return null;
  return { ...spot, sections, products: loose };
}

/**
 * A ready-made prompt for an AI image tool (ChatGPT, Gemini…) to make a photo
 * that sits well on the gold tiles: the product on plain white, nothing added.
 * `kind` is "item" or "group".
 */
export function photoPrompt(kind, name = "", unit = "") {
  const what = text(name, 90) || (kind === "group" ? "this collection" : "this product");
  if (kind === "group") {
    return `A product photo of 3 to 4 items that together represent "${what}", arranged as a neat group and photographed together, cut out on a plain pure white background, soft natural shadow underneath, bright even studio lighting, warm festive feel, items filling the lower two thirds of the frame, no text, no logos added, no people, portrait 4:5, high resolution.`;
  }
  const size = text(unit, 24);
  return `A studio product photo of ${what}${size ? ` (${size})` : ""}, the whole product centred and fully in frame, on a plain pure white background, soft natural shadow, bright even lighting, true-to-life colours, no text, no extra logos, no props, no hands, square 1:1, high resolution.`;
}
