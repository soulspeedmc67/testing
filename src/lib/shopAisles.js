import {
  Milk, Croissant, Carrot, Apple, Popcorn, Cookie, CupSoda, Wheat, Soup, Candy, IceCreamCone,
  Nut, Flame, Droplets, Sparkles, SprayCan, Utensils, Baby, HeartPulse, PawPrint, Pencil, Plug,
  Gamepad2, Package, Shirt,
} from "lucide-react";
import { isSoldOut } from "./catalogueFile";
import { isPlaceholderImage } from "./productPhotoMatch";

/**
 * The web shop's aisles, in the order a grocery run goes: fresh food first,
 * then the pantry, then the household. Built from the shelves products are
 * actually on, so an aisle only shows when it has something in it.
 */
const AISLES = [
  { cat: "Dairy", label: "Dairy", icon: Milk },
  { cat: "Chicken", label: "Chicken & fish", icon: Utensils },
  { cat: "Chicken & Fish", label: "Chicken & fish", icon: Utensils },
  { cat: "Meat & Fish", label: "Chicken & fish", icon: Utensils },
  { cat: "Bakery", label: "Bread & bakery", icon: Croissant },
  { cat: "Fruits", label: "Fruits", icon: Apple },
  { cat: "Snacks", label: "Snacks", icon: Popcorn },
  { cat: "Chips", label: "Chips", icon: Popcorn },
  { cat: "Biscuits", label: "Biscuits", icon: Cookie },
  { cat: "Beverages", label: "Drinks", icon: CupSoda },
  { cat: "Staples", label: "Atta, rice & dal", icon: Wheat },
  { cat: "Instant Food", label: "Instant food", icon: Soup },
  { cat: "Sweets & Chocolates", label: "Sweets & chocolates", icon: Candy },
  { cat: "Ice Cream", label: "Ice cream", icon: IceCreamCone },
  { cat: "Dry Fruits", label: "Dry fruits", icon: Nut },
  { cat: "Spices", label: "Spices", icon: Flame },
  { cat: "Sauces & Spreads", label: "Sauces & spreads", icon: Droplets },
  { cat: "Personal Care", label: "Personal care", icon: Sparkles },
  { cat: "Home Care", label: "Cleaning", icon: SprayCan },
  { cat: "Kitchen Care", label: "Kitchen", icon: Utensils },
  { cat: "Baby Care", label: "Baby care", icon: Baby },
  { cat: "Health & Wellness", label: "Health", icon: HeartPulse },
  { cat: "Pet Care", label: "Pet care", icon: PawPrint },
  { cat: "Stationery", label: "Stationery", icon: Pencil },
  { cat: "Electronics", label: "Electronics", icon: Plug },
  { cat: "Toys & Games", label: "Toys & games", icon: Gamepad2 },
  { cat: "Clothing", label: "Clothing", icon: Shirt },
  { cat: "Vegetables", label: "Vegetables", icon: Carrot },
];

/** Words that make a good cover photo for an aisle (its first product may not be typical). */
const COVER_HINTS = {
  "Dairy": /\b(milk|curd|dahi|paneer|butter|cheese)\b/i,
  "Chicken": /\b(chicken|fish|curry|breast|kebab)\b/i,
  "Chicken & Fish": /\b(chicken|fish|curry|breast|kebab)\b/i,
  "Meat & Fish": /\b(chicken|fish|curry|breast|kebab)\b/i,
  "Bakery": /\b(bread|bun|rusk|pav|cake|toast)\b/i,
  "Vegetables": /\b(onion|potato|tomato|carrot|cabbage)\b/i,
  "Fruits": /\b(apple|banana|orange|grapes|mango)\b/i,
  "Snacks": /\b(namkeen|bhujia|chips|kurkure|popcorn)\b/i,
  "Chips": /\b(chips|lays)\b/i,
  "Biscuits": /\b(biscuits?|cookies?|parle|oreo|marie)\b/i,
  "Beverages": /\b(cola|juice|drink|pepsi|coca|sprite|frooti)\b/i,
  "Staples": /\b(atta|rice|dal|oil|sugar|salt)\b/i,
  "Instant Food": /\b(noodles?|maggi|pasta|soup|oats)\b/i,
  "Sweets & Chocolates": /\b(chocolate|dairy milk|kitkat|5 star|munch)\b/i,
  "Ice Cream": /\b(ice ?cream|cone|kulfi|cornetto)\b/i,
  "Dry Fruits": /\b(almonds?|cashew|kaju|badam|raisins?|walnuts?)\b/i,
  "Spices": /\b(masala|haldi|turmeric|chilli|jeera|cumin)\b/i,
  "Sauces & Spreads": /\b(ketchup|sauce|jam|spread|mayonnaise)\b/i,
  "Personal Care": /\b(shampoo|soap|toothpaste|face ?wash|cream)\b/i,
  "Home Care": /\b(detergent|surf|cleaner|harpic|lizol|phenyl)\b/i,
  "Kitchen Care": /\b(foil|scrub|dish|scrubber|wrap)\b/i,
  "Baby Care": /\b(diapers?|baby|pampers|wipes)\b/i,
  "Health & Wellness": /\b(vitamin|chyawanprash|horlicks|honey|bournvita)\b/i,
  "Pet Care": /\b(dog|cat|pedigree|whiskas|drools)\b/i,
  "Stationery": /\b(pens?|pencils?|notebook|eraser|classmate)\b/i,
  "Electronics": /\b(bulb|battery|batteries|charger|cable|led)\b/i,
  "Toys & Games": /\b(toy|ball|game|puzzle|cards)\b/i,
};
const OTHER = { label: "Everything else", icon: Package };
const RAIL_SIZE = 12;

/**
 * The few departments the aisles sit under. A shopper picks one of five, then
 * one of the handful of aisles inside it, instead of facing every aisle at
 * once. An aisle not named here (a new shelf, or "Everything else") goes under
 * the last one.
 */
const GROUPS = [
  { id: "fresh", label: "Fresh & daily", icon: Milk, cats: ["Dairy", "Bakery", "Fruits", "Vegetables", "Chicken", "Chicken & Fish", "Meat & Fish"] },
  { id: "snacks", label: "Snacks & drinks", icon: Popcorn, cats: ["Snacks", "Chips", "Biscuits", "Beverages", "Sweets & Chocolates", "Ice Cream"] },
  { id: "cooking", label: "Cooking & pantry", icon: Wheat, cats: ["Staples", "Spices", "Sauces & Spreads", "Instant Food", "Dry Fruits"] },
  { id: "care", label: "Personal & baby care", icon: Sparkles, cats: ["Personal Care", "Baby Care", "Health & Wellness"] },
  { id: "home", label: "Home & more", icon: SprayCan, cats: ["Home Care", "Kitchen Care", "Pet Care", "Stationery", "Electronics", "Toys & Games", "Clothing"] },
];

export const DEFAULT_CATEGORY_COVERS = {
  "Dairy": "/products/enriched/1.webp",
  "Fresh Fruits": "/products/enriched/4.webp",
  "Fruits": "/products/enriched/4.webp",
  "Snacks": "/products/enriched/5.webp",
  "Chips": "/products/enriched/5.webp",
  "Sweets & Chocolates": "/products/enriched/6.webp",
  "Bakery": "/products/enriched/7.webp",
  "Staples": "/products/enriched/8.webp",
  "Biscuits": "/products/enriched/14.webp",
  "Beverages": "/products/enriched/20.webp",
  "Home Care": "/products/enriched/30.webp",
  "Kitchen Care": "/products/enriched/35.webp",
  "Vegetables": "/products/enriched/40.webp",
  "Chicken": "/products/enriched/50.webp",
  "Chicken & Fish": "/products/enriched/50.webp",
  "Meat & Fish": "/products/enriched/50.webp",
  "Dry Fruits": "/products/enriched/14.webp",
  "Personal Care": "/products/enriched/30.webp",
  "Baby Care": "/products/enriched/1.webp",
  "Ice Cream": "/products/enriched/6.webp",
  "Spices": "/products/enriched/8.webp",
  "Instant Food": "/products/enriched/13.webp",
  "Sauces & Spreads": "/products/enriched/8.webp",
};

function photoOf(p) {
  return p && typeof p.img === "string" && p.img.trim() ? p.img : "";
}

function hasValidPhoto(p) {
  const url = photoOf(p);
  return Boolean(url && !isPlaceholderImage(url));
}

/**
 * [{ cat, label, icon, count, cover, rail }] for the aisles that have
 * products. `rail` is what a home-page row shows: in stock, with a photo.
 * Shelves not in the list above go last, under their own name; the
 * unsorted "Others" shelf comes very last.
 */
export function buildAisles(products = []) {
  const byCat = new Map();
  for (const p of products) {
    const cat = String(p.cat || p.category || "Others").trim() || "Others";
    if (!byCat.has(cat)) byCat.set(cat, []);
    byCat.get(cat).push(p);
  }
  const known = new Set(AISLES.map((a) => a.cat));
  const extra = [...byCat.keys()]
    .filter((cat) => !known.has(cat) && cat !== "Others")
    .sort((a, b) => byCat.get(b).length - byCat.get(a).length)
    .map((cat) => ({ cat, label: cat, icon: Package }));
  const order = [...AISLES, ...extra, { cat: "Others", ...OTHER }];

  return order
    // Only aisles that have products (plus Vegetables, shown as "arriving
    // soon"). Listing every aisle that merely has a stock cover put three
    // empty "Chicken & fish" aisles and an empty "Fruits" on the front page.
    .filter((a) => byCat.has(a.cat) || a.cat === "Vegetables")
    .map((a) => {
      const items = byCat.get(a.cat) || [];
      const stocked = items.filter((p) => hasValidPhoto(p) && !isSoldOut(p));
      const rail = stocked.slice(0, RAIL_SIZE);
      const hint = COVER_HINTS[a.cat];
      const typical = hint ? stocked.filter((p) => hint.test(p.name || "")) : [];
      const pick =
        typical.find((p) => hasValidPhoto(p) && photoOf(p).includes("/products/enriched/")) ||
        typical.find((p) => hasValidPhoto(p)) ||
        rail.find((p) => hasValidPhoto(p)) ||
        items.find((p) => hasValidPhoto(p));
      const defaultCover =
        DEFAULT_CATEGORY_COVERS[a.cat] ||
        DEFAULT_CATEGORY_COVERS[a.label] ||
        "/products/enriched/5.webp";
      const cover = pick && hasValidPhoto(pick) ? photoOf(pick) : defaultCover;
      return { ...a, count: items.length, cover, rail };
    });
}

/** The aisle a shelf name belongs to, for the label and icon. */
export function aisleFor(cat) {
  return AISLES.find((a) => a.cat === cat) || (cat === "Others" ? { cat, ...OTHER } : { cat, label: cat, icon: Package });
}

/**
 * The aisles (from buildAisles) sorted into the departments above:
 * [{ id, label, icon, count, aisles }], only the departments that have aisles.
 */
export function buildAisleGroups(aisles = []) {
  const groupOf = new Map();
  GROUPS.forEach((group) => group.cats.forEach((cat) => groupOf.set(cat, group.id)));
  const fallback = GROUPS[GROUPS.length - 1].id;
  return GROUPS.map((group) => {
    const inside = aisles.filter((a) => (groupOf.get(a.cat) || fallback) === group.id);
    return {
      id: group.id,
      label: group.label,
      icon: group.icon,
      aisles: inside,
      count: inside.reduce((sum, a) => sum + (a.count || 0), 0),
    };
  }).filter((group) => group.aisles.length > 0);
}

/**
 * The few aisles the home page leads with: the first well-stocked ones in
 * grocery-run order. Everything else is one tap away under "All categories".
 */
export function featuredAisles(aisles = [], limit = 7) {
  // At least four in-stock items with photos, or its row on the home page is empty.
  return aisles.filter((a) => a.cover && a.rail.length >= 4 && a.cat !== "Others").slice(0, limit);
}

