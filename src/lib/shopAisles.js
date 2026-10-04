import {
  Milk, Croissant, Carrot, Apple, Popcorn, Cookie, CupSoda, Wheat, Soup, Candy, IceCreamCone,
  Nut, Flame, Droplets, Sparkles, SprayCan, Utensils, Baby, HeartPulse, PawPrint, Pencil, Plug,
  Gamepad2, Package,
} from "lucide-react";
import { isSoldOut } from "./catalogueFile";

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
  { cat: "Vegetables", label: "Vegetables", icon: Carrot },
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

function photoOf(p) {
  return p && typeof p.img === "string" && p.img.trim() ? p.img : "";
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
    .filter((a) => byCat.has(a.cat))
    .map((a) => {
      const items = byCat.get(a.cat);
      const stocked = items.filter((p) => photoOf(p) && !isSoldOut(p));
      const rail = stocked.slice(0, RAIL_SIZE);
      // A typical item for the cover, on the shop's own white packshots if there is one.
      const hint = COVER_HINTS[a.cat];
      const typical = hint ? stocked.filter((p) => hint.test(p.name || "")) : [];
      const pick =
        typical.find((p) => photoOf(p).includes("/products/catalog/")) || typical[0] || rail[0];
      return { ...a, count: items.length, cover: pick ? photoOf(pick) : "", rail };
    });
}

/** The aisle a shelf name belongs to, for the label and icon. */
export function aisleFor(cat) {
  return AISLES.find((a) => a.cat === cat) || (cat === "Others" ? { cat, ...OTHER } : { cat, label: cat, icon: Package });
}
