/**
 * Puts the small product photos into the website export (out/products/thumbs),
 * so every website zip carries them.
 *
 * Product photos are files on the website host. The apps and the website all
 * load the small copy first (products/thumbs/...). A zip without them leaves
 * the host with no photos whenever the site folder is replaced, and every
 * product then shows a letter tile in the website and both apps.
 *
 * The photos live in data/photo-thumbs (not in git). Without that folder this
 * does nothing, so a build on another machine still works.
 */
import { cpSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const from = "data/photo-thumbs/products/thumbs";
const to = "out/products/thumbs";

function count(dir) {
  let n = 0;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    n += statSync(path).isDirectory() ? count(path) : 1;
  }
  return n;
}

if (!existsSync(from)) {
  console.warn(`No product photos added: ${from} is not on this machine.`);
} else if (!existsSync("out")) {
  console.warn("No product photos added: build the website first (out/ is missing).");
} else {
  cpSync(from, to, { recursive: true });
  console.log(`Product photos added to the export: ${count(to)} files in ${to}`);
}
