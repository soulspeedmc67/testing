/**
 * The product-name list: ~48k grocery names with the shelf each belongs on and
 * a guessed brand, built by scripts/build-catalog-index.mjs from the scraped
 * Blinkit catalogue into public/catalog/products-v1.json (~0.6 MB gzipped).
 *
 * It holds names only — no photo links. The admin fetches it the first time a
 * screen needs it; nothing here is imported with the data, so no page bundle
 * grows and the storefront never downloads it.
 *
 * Everything but loadCatalog() is plain functions over the prepared list, so
 * the tests and the starter-CSV script run them in Node.
 */

export const CATALOG_URL = "/catalog/products-v1.json";

/** Lower case, accents and apostrophes gone, everything else a single space: "Lay's" → "lays". */
export function normaliseName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const UNIT_NAMES = {
  g: "g", gm: "g", gms: "g", gram: "g", grams: "g",
  kg: "kg", kgs: "kg",
  ml: "ml",
  l: "L", ltr: "L", ltrs: "L", litre: "L", litres: "L", liter: "L", liters: "L",
  pc: "pcs", pcs: "pcs", piece: "pcs", pieces: "pcs",
};

/** The pack size written in a name, as the shop writes it: "Red Bull Drink 250 Ml" → "250 ml". */
export function unitFromName(name) {
  const found = [...String(name || "").matchAll(/(\d+(?:\.\d+)?)\s?([a-z]+)\b/gi)]
    .map(([, amount, unit]) => [amount, UNIT_NAMES[unit.toLowerCase()]])
    .filter(([, unit]) => unit);
  if (found.length === 0) return "";
  const [amount, unit] = found[found.length - 1];
  return `${amount} ${unit}`;
}

/** Turns the downloaded file into the searchable form. */
export function prepareCatalog(raw) {
  const items = Array.isArray(raw?.items) ? raw.items : [];
  const shelves = raw?.shelves || [];
  const aisles = (raw?.aisles || []).map(([label, shelf]) => ({ label, shelf: shelves[shelf] || "" }));
  const brands = raw?.brands || [];
  const images = raw?.images || [];
  const names = new Array(items.length);
  // Padded with spaces so " " + word finds a word start with one includes().
  const keys = new Array(items.length);
  const aisleOf = new Uint16Array(items.length);
  const brandOf = new Uint32Array(items.length);
  const imageOf = new Uint32Array(items.length);
  items.forEach(([name, aisle, brand, img], i) => {
    names[i] = name;
    keys[i] = ` ${normaliseName(name)} `;
    aisleOf[i] = aisle;
    brandOf[i] = brand;
    imageOf[i] = img || 0;
  });
  return { builtAt: raw?.builtAt || "", shelves, aisles, brands, images, names, keys, aisleOf, brandOf, imageOf, size: items.length };
}

/**
 * A list photo as a full link. The list keeps them as paths on the website
 * ("/products/catalog/…"); a product saves the whole address so every app
 * version, including ones already on phones, can load it.
 */
export function catalogPhotoUrl(path) {
  const value = String(path || "");
  return /^\/?products\/catalog\//.test(value) ? `https://dashit.co.in/${value.replace(/^\//, "")}` : value;
}

/** One entry as the screens use it. */
export function catalogItem(catalog, index) {
  const aisle = catalog.aisles[catalog.aisleOf[index]] || { label: "", shelf: "" };
  const name = catalog.names[index];
  const img = catalog.images ? catalog.images[catalog.imageOf?.[index] || 0] : "";
  const res = {
    index,
    name,
    shelf: aisle.shelf,
    aisle: aisle.label,
    brand: catalog.brands[catalog.brandOf[index]] || "",
    unit: unitFromName(name),
  };
  if (img) res.img = img;
  return res;
}

let loading = null;

/** Fetches the list once per page load. A failed fetch can be retried. */
export function loadCatalog() {
  if (!loading) {
    loading = fetch(CATALOG_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`The product list didn't load (${res.status}).`);
        return res.json();
      })
      .then(prepareCatalog)
      .catch((err) => {
        loading = null;
        throw err;
      });
  }
  return loading;
}

/**
 * Names for the "Item name" box. Every word typed has to start a word in the
 * name, in any order ("gold amul" finds Amul Gold Milk). Names that start with
 * the first word typed come first (people type the brand first), then whole
 * words over partial ones, then shorter names; the list's own order (big
 * brands first) settles the rest.
 */
export function searchCatalog(catalog, query, limit = 8) {
  const typed = normaliseName(query);
  if (!catalog || typed.length < 2) return [];
  const words = [...new Set(typed.split(" "))];
  // Longest word first: it rules out the most names with the first check.
  const checks = [...words].sort((a, b) => b.length - a.length).map((w) => ` ${w}`);
  const first = ` ${words[0]}`;
  const phrase = ` ${typed}`;

  const hits = [];
  const { keys, names } = catalog;
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    let every = true;
    for (let w = 0; w < checks.length; w += 1) {
      if (!key.includes(checks[w])) {
        every = false;
        break;
      }
    }
    if (!every) continue;
    let score = 0;
    if (key.startsWith(first)) score += 4;
    if (key.includes(phrase)) score += 3;
    for (let w = 0; w < checks.length; w += 1) if (key.includes(`${checks[w]} `)) score += 2;
    score -= names[i].length / 40;
    hits.push({ i, score });
  }
  hits.sort((a, b) => b.score - a.score || a.i - b.i);
  return hits.slice(0, limit).map((h) => catalogItem(catalog, h.i));
}

/** Aisles on one shelf with how many names each has, biggest first. */
export function shelfAisles(catalog, shelf) {
  const counts = new Map();
  for (let i = 0; i < catalog.size; i += 1) {
    const aisle = catalog.aisles[catalog.aisleOf[i]];
    if (aisle.shelf === shelf) counts.set(aisle.label, (counts.get(aisle.label) || 0) + 1);
  }
  return [...counts].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count);
}

/** Positions of the names on a shelf (and aisle), well-known brands first, optionally narrowed by typed words. */
export function browseCatalog(catalog, { shelf = "", aisle = "", query = "" } = {}) {
  const checks = normaliseName(query)
    .split(" ")
    .filter(Boolean)
    .map((w) => ` ${w}`);
  const out = [];
  for (let i = 0; i < catalog.size; i += 1) {
    const a = catalog.aisles[catalog.aisleOf[i]];
    if (shelf && a.shelf !== shelf) continue;
    if (aisle && a.label !== aisle) continue;
    if (checks.length && !checks.every((c) => catalog.keys[i].includes(c))) continue;
    out.push(i);
  }
  return out;
}

/* ---------- Guessing the shelf for a name typed by someone else ---------- */

const SIZE_WORDS = new Set([...Object.keys(UNIT_NAMES), "pack", "packet", "pkt", "x", "combo", "pouch", "bottle", "jar", "box"]);

/** The words that describe the product, without pack sizes ("500", "500ml", "1 kg", "pack"). */
function describingWords(normalised) {
  const words = normalised.split(" ").filter(Boolean);
  return words.filter((w, i) => {
    if (/^\d/.test(w)) return false;
    if (SIZE_WORDS.has(w) && (i === 0 || /^\d/.test(words[i - 1]) || w.length > 2)) return false;
    return true;
  });
}

// Plural and singular count as the same word ("biscuits" = "biscuit").
const stem = (w) => (w.length > 3 && w.endsWith("s") ? w.slice(0, -1) : w);

/** A catalogue name's describing words, stemmed — its "700 G" is a size, not the word "g". */
const describedBy = (catalog, i) => new Set(describingWords(catalog.keys[i].trim()).map(stem));

/** word → positions of the names containing it; built the first time a guess is made. */
function wordIndex(catalog) {
  if (catalog._words) return catalog._words;
  const index = new Map();
  for (let i = 0; i < catalog.size; i += 1) {
    for (const w of describedBy(catalog, i)) {
      let list = index.get(w);
      if (!list) index.set(w, (list = []));
      list.push(i);
    }
  }
  catalog._words = index;
  return index;
}

/**
 * Best shelf and brand for a product name from a CSV or a typed list, or null
 * when the list has nothing close enough. `{ shelf, brand, name }`:
 * `name` is the closest entry, for showing the owner what it was matched to.
 *
 * The shelf is voted on by the five closest names, so "Amul Taaza 500ml"
 * lands on Dairy even though the list has no product called exactly that.
 */
export function guessFromCatalog(catalog, productName) {
  if (!catalog) return null;
  const words = [...new Set(describingWords(normaliseName(productName)).map(stem))];
  if (words.length === 0) return null;
  const index = wordIndex(catalog);

  const matched = new Map();
  for (const w of words) {
    const list = index.get(w);
    // A word in thousands of names ("masala", "powder") says nothing about which one.
    if (!list || list.length > 4000) continue;
    for (const i of list) matched.set(i, (matched.get(i) || 0) + 1);
  }
  if (matched.size === 0) return null;

  const scored = [];
  for (const [i, hits] of matched) {
    const own = describedBy(catalog, i).size || 1;
    const cover = hits / words.length;
    scored.push({ i, cover, score: cover * 0.7 + (hits / own) * 0.3 });
  }
  scored.sort((a, b) => b.score - a.score || a.i - b.i);
  const top = scored.slice(0, 5);
  const best = top[0];
  // One matching word of a three-word name isn't a match.
  if (best.cover < 0.6 || (words.length > 1 && best.cover * words.length < 2)) return null;

  // Only close names vote; a name sharing one word of three has no say.
  const votes = new Map();
  let total = 0;
  for (const t of top) {
    if (t.cover < 0.6) continue;
    const shelf = catalog.aisles[catalog.aisleOf[t.i]].shelf;
    votes.set(shelf, (votes.get(shelf) || 0) + t.score);
    total += t.score;
  }
  const [shelf, weight] = [...votes].sort((a, b) => b[1] - a[1])[0];
  if (weight / total < 0.5) return null;

  const item = catalogItem(catalog, best.i);
  // The brand only when the name names it too.
  const brandWords = normaliseName(item.brand).split(" ").map(stem);
  const brand = brandWords.every((w) => words.includes(w)) ? item.brand : "";
  const res = { shelf, brand, name: item.name };
  if (item.img) res.img = item.img;
  return res;
}

/* ---------- A photo only for the same product ---------- */

/* Words a list name may add without making it a different product: the
   container it comes in. "Cadbury Dairy Milk Chocolate Bar" is still the
   shop's "CADBURY DAIRY MILK CHOCOLATE"; "… Silk Chocolate" is not. */
const PACKAGING_WORDS = new Set(
  ["bar", "pack", "packet", "pouch", "bottle", "jar", "box", "tin", "can", "sachet", "tub", "carton", "refill", "tetra"].map(stem)
);

/* A word that only says what kind of thing it is, which a list name may add
   once: the shop's "CATCH HING" is the list's "Catch Hing Powder", "FOGG
   NAPOLEON" its "Fogg Napoleon Deodorant". Checked against the shop's own
   names: an extra word outside this list ("gummies", "paneer", "soap",
   "milkshake", "gift") meant a different product. */
const KIND_WORDS = new Set(
  [
    "powder", "masala", "paste", "namkeen", "biscuit", "cookie", "deodorant", "drink", "mix", "juice",
    "soda", "coffee", "candy", "candie", "toffee", "noodle", "freshener", "cleaner", "vinegar", "chip",
    "flavour", "flavor", "flavoured", "flavored", "stick", "bathing", "face", "hair", "shaving",
  ].map(stem)
);

/** Numbers that aren't pack sizes ("1% salicylic", "2 in 1", "3x"): they tell products apart. */
function nameNumbers(normalised) {
  const words = normalised.split(" ").filter(Boolean);
  const numbers = [];
  words.forEach((w, i) => {
    const digits = w.match(/^\d+(?:\.\d+)?/)?.[0];
    if (!digits) return;
    const unit = w.slice(digits.length) || words[i + 1] || "";
    if (UNIT_NAMES[unit] || SIZE_WORDS.has(unit)) return;
    numbers.push(digits);
  });
  return numbers.sort().join(" ");
}

/** One letter wrong, missing or extra ("shampo" = "shampoo", "stepler" = "stapler"). */
function oneEditApart(a, b) {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (a.length > b.length) i += 1;
    else if (b.length > a.length) j += 1;
    else {
      i += 1;
      j += 1;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

/** A shop's word for a list word: the same, a one-letter typo of a long word, or a long word cut short. */
function sameWord(shopWord, listWord) {
  if (shopWord === listWord) return true;
  if (shopWord.length >= 5 && listWord.length >= 5 && oneEditApart(shopWord, listWord)) return true;
  return shopWord.length >= 5 && listWord.startsWith(shopWord);
}

/**
 * The photo of the same product in the list, or null. Much stricter than
 * guessFromCatalog (which only needs the shelf): a wrong photo is worse than
 * none, since shoppers order what they see. A list name counts only when
 *   - it starts with the same brand word,
 *   - every word of the shop's name is in it (a one-letter typo allowed),
 *   - it adds nothing but packaging words ("bar", "pouch") and at most one
 *     word naming the kind of product ("powder", "deodorant"), and
 *   - its numbers that aren't sizes agree ("1%" never gets a "2%" photo).
 * Pack sizes are ignored: sizes of one product share a photo.
 * `{ img, name }`, `name` being the list entry the photo belongs to.
 */
export function photoFromCatalog(catalog, productName) {
  if (!catalog || !catalog.images) return null;
  const normalised = normaliseName(productName);
  const words = [...new Set(describingWords(normalised).map(stem))];
  if (words.length < 2) return null;
  const numbers = nameNumbers(normalised);
  const index = wordIndex(catalog);

  // Candidates: names with the shop's rarest exactly-spelled word.
  let candidates = null;
  for (const w of words) {
    const list = index.get(w);
    if (list && (!candidates || list.length < candidates.length)) candidates = list;
  }
  if (!candidates) return null;

  let best = null;
  for (const i of candidates) {
    const img = catalog.images[catalog.imageOf[i] || 0];
    if (!img) continue;
    const key = catalog.keys[i].trim();
    const listWords = describingWords(key).map(stem);
    if (listWords.length === 0 || !sameWord(words[0], listWords[0])) continue;
    if (!words.every((w) => listWords.some((l) => sameWord(w, l)))) continue;
    const extras = listWords.filter((l) => !words.some((w) => sameWord(w, l)));
    const kinds = extras.filter((l) => !PACKAGING_WORDS.has(l));
    if (kinds.length > 1 || (kinds.length === 1 && !KIND_WORDS.has(kinds[0]))) continue;
    if (nameNumbers(key) !== numbers) continue;
    if (!best || extras.length < best.extras) best = { i, img, extras: extras.length };
  }
  return best ? { img: catalogPhotoUrl(best.img), name: catalog.names[best.i] } : null;
}

/**
 * Import rows that are new to the shop and came without a category get the
 * shelf (and a missing brand) from the product list. Rows that need a photo
 * get one only when the list has the same product (photoFromCatalog).
 */
export function fillFromCatalog(items, catalog) {
  if (!catalog) return items;
  return items.map((item) => {
    const needsCat = item.action === "new" && !item.catFromCsv;
    const needsImg = !item.img;

    if (!needsCat && !needsImg) return item;

    const guess = guessFromCatalog(catalog, item.name) || {};
    const photo = needsImg ? photoFromCatalog(catalog, item.name) : null;

    let changed = false;
    let newCat = item.cat;
    let catFromCatalog = item.catFromCatalog;
    let newBrand = item.brand;
    let newImg = item.img;
    let newImgSource = item.imgSource;

    if (needsCat && guess.shelf) {
      newCat = guess.shelf;
      catFromCatalog = true;
      newBrand = item.brand || guess.brand;
      changed = true;
    }

    if (photo) {
      newImg = photo.img;
      newImgSource = "catalog";
      changed = true;
    }

    if (!changed) return item;

    return {
      ...item,
      cat: newCat,
      catFromCatalog,
      brand: newBrand,
      img: newImg,
      imgSource: newImgSource,
    };
  });
}
