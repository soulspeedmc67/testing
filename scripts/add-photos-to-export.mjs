/**
 * Gets the website export (out/) ready to zip: puts the small product photos
 * in, and leaves out files nothing on the site uses.
 *
 * Product photos are files on the website host. The apps and the website all
 * load the small copy first (products/thumbs/...). A zip without them leaves
 * the host with no photos whenever the site folder is replaced, and every
 * product then shows a letter tile in the website and both apps.
 *
 * Only the photos the live product list links to go in (about 1,340 of the
 * 3,670 on this machine), which keeps the zip small. If the live list can't
 * be read, every photo goes in instead.
 *
 * The photos live in data/photo-thumbs (not in git). Without that folder the
 * photo step is skipped, so a build on another machine still works.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { dirname, join } from "node:path";

const THUMBS = "data/photo-thumbs/products/thumbs";
const OUT = "out";
const LIVE_LIST = "https://dashit.co.in/catalog/catalog.json";
const MARK = "/products/catalog/";

function files(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? files(path) : [path];
  });
}

/** The photo paths ("sweet_tooth/dsh_….webp") the live product list links to, or null. */
async function linkedPhotos() {
  try {
    const res = await fetch(LIVE_LIST, {
      headers: { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/126 Safari/537.36" },
      signal: AbortSignal.timeout(30000),
    });
    if (!res.ok) return null;
    const body = await res.json();
    const linked = new Set();
    for (const p of body?.products || []) {
      const img = typeof p?.img === "string" ? p.img : "";
      const at = img.indexOf(MARK);
      if (p?.name && at >= 0) linked.add(img.slice(at + MARK.length));
    }
    return linked.size > 0 ? linked : null;
  } catch (e) {
    return null;
  }
}

async function addPhotos() {
  if (!existsSync(THUMBS)) {
    console.warn(`No product photos added: ${THUMBS} is not on this machine.`);
    return;
  }
  const to = join(OUT, "products/thumbs");
  rmSync(to, { recursive: true, force: true });
  const linked = await linkedPhotos();
  if (!linked) {
    cpSync(THUMBS, to, { recursive: true });
    console.warn(`The live product list couldn't be read, so every photo went in: ${files(to).length} files.`);
    return;
  }
  let added = 0;
  const missing = [];
  for (const rel of linked) {
    const from = join(THUMBS, rel);
    if (!existsSync(from)) {
      missing.push(rel);
      continue;
    }
    mkdirSync(dirname(join(to, rel)), { recursive: true });
    cpSync(from, join(to, rel));
    added += 1;
  }
  console.log(`Product photos added to the export: ${added} (the ones the live product list links to).`);
  if (missing.length > 0) {
    console.warn(`${missing.length} linked photos are not on this machine, e.g. ${missing.slice(0, 3).join(", ")}`);
  }
}

/** Leaves out files nothing on the site uses. Only out/ is touched, never public/. */
function leaveOutUnused() {
  // Old sample photos: the pages use a handful by name; the product list links none.
  const source = files("src")
    .filter((f) => /\.(js|jsx|ts|tsx)$/.test(f))
    .map((f) => readFileSync(f, "utf8"))
    .join("\n");
  let dropped = 0;
  for (const file of files(join(OUT, "products/enriched"))) {
    const name = file.split("/").pop();
    if (!source.includes(`products/enriched/${name}`)) {
      rmSync(file);
      dropped += 1;
    }
  }
  // Design drafts that no page shows.
  for (const name of [
    "sticker-pizza.png",
    "sticker-drink.png",
    "preview-app-icon-white.png",
    "preview-app-icon-dark.png",
    "dashit-logo-lockup-white.png",
    "dashit-logo-lockup-navy.png",
    "extracted-mark-white.png",
    "rider-scooter-hero.png",
  ]) {
    const file = join(OUT, "art", name);
    if (existsSync(file) && !source.includes(name)) {
      rmSync(file);
      dropped += 1;
    }
  }
  console.log(`Left out of the export: ${dropped} files no page uses.`);
}

if (!existsSync(OUT)) {
  console.warn("Nothing to do: build the website first (out/ is missing).");
} else {
  await addPhotos();
  leaveOutUnused();
}
