#!/usr/bin/env node
/**
 * Gives products back the exact photo they had in an earlier catalogue file.
 *
 * Why: re-importing the stock list creates every product under a new id, so
 * the photo links stay behind on the old records. This matches each product in
 * the live catalogue to the product of the same name in the earlier file and
 * writes that product's photo link back. Same name only: nothing is guessed,
 * so a product can only get the photo it already had.
 *
 *   node scripts/restore-photos-from-catalog.mjs <earlier-catalog.json>           (shows what it would do)
 *   node scripts/restore-photos-from-catalog.mjs <earlier-catalog.json> --write   (does it)
 *
 * --replace also puts the earlier photo back where a product now has a
 * different one. A report of every change (with the value before it) is saved
 * in data/photo-matches/, which is what an undo would be built from.
 *
 * Signs in with this computer's Firebase CLI login (`npx firebase-tools login`).
 */
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { homedir } from "node:os";

const PROJECT = "dashit-1ecba";
// The Firebase CLI's own public OAuth client, as in restore-store-photos.mjs.
const CLIENT_ID = "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
const CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi";
const LIVE_URL = "https://dashit.co.in/catalog/catalog.json";
const BATCH = 300;

const args = process.argv.slice(2);
const earlierPath = args.find((a) => !a.startsWith("--"));
const WRITE = args.includes("--write");
const REPLACE = args.includes("--replace");
if (!earlierPath) {
  console.error("Usage: node scripts/restore-photos-from-catalog.mjs <earlier-catalog.json> [--write] [--replace]");
  process.exit(1);
}

const norm = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const photo = (p) => String(p?.img || "").trim();

async function accessToken() {
  const cli = JSON.parse(readFileSync(`${homedir()}/.config/configstore/firebase-tools.json`, "utf8"));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: cli?.tokens?.refresh_token || "",
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`Sign-in refused (${res.status}). Run: npx firebase-tools login`);
  return (await res.json()).access_token;
}

const earlier = JSON.parse(readFileSync(earlierPath, "utf8")).products || [];
const liveRes = await fetch(LIVE_URL, { headers: { Accept: "application/json" } });
if (!liveRes.ok) throw new Error(`Couldn't read the live catalogue (${liveRes.status})`);
const live = (await liveRes.json()).products || [];

// name -> the photos products of that name had (one name can be on two records)
const before = new Map();
for (const p of earlier) {
  if (p.active === false || !p.name) continue;
  const key = norm(p.name);
  if (!before.has(key)) before.set(key, new Set());
  if (photo(p)) before.get(key).add(photo(p));
}

const changes = [];
const tally = { same: 0, restored: 0, replaced: 0, keptDifferent: 0, hadNone: 0, newProduct: 0, unclear: 0 };
for (const p of live) {
  if (p.active === false || !p.name) continue;
  const photos = before.get(norm(p.name));
  if (!photos) { tally.newProduct += 1; continue; }
  if (photos.size === 0) { tally.hadNone += 1; continue; }
  if (photos.size > 1) { tally.unclear += 1; continue; }
  const want = [...photos][0];
  const now = photo(p);
  if (now === want) { tally.same += 1; continue; }
  if (!now) { tally.restored += 1; changes.push({ id: p.id, name: p.name, was: "", img: want }); continue; }
  if (REPLACE) { tally.replaced += 1; changes.push({ id: p.id, name: p.name, was: now, img: want }); }
  else tally.keptDifferent += 1;
}

console.log(`Live products: ${live.filter((p) => p.active !== false && p.name).length}`);
console.log(`  already have their earlier photo:   ${tally.same}`);
console.log(`  missing it, will get it back:       ${tally.restored}`);
console.log(`  have a different photo: ${REPLACE ? `put back ${tally.replaced}` : `left alone ${tally.keptDifferent} (--replace puts the earlier one back)`}`);
console.log(`  had no photo before either:         ${tally.hadNone}`);
console.log(`  not in the earlier file (new):      ${tally.newProduct}`);
console.log(`  same name on records with different photos, skipped: ${tally.unclear}`);

mkdirSync("data/photo-matches", { recursive: true });
const reportPath = `data/photo-matches/photo-restore-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
writeFileSync(reportPath, JSON.stringify({ earlier: earlierPath, written: WRITE, changes }, null, 1));
console.log(`\n${changes.length} changes listed in ${reportPath}`);

if (!WRITE) {
  console.log("Nothing written. Add --write to save these to the shop.");
  process.exit(0);
}

const token = await accessToken();
const docs = `projects/${PROJECT}/databases/(default)/documents`;
let done = 0;
let failed = 0;
for (let i = 0; i < changes.length; i += BATCH) {
  const writes = changes.slice(i, i + BATCH).map((c) => ({
    update: { name: `${docs}/products/${c.id}`, fields: { img: { stringValue: c.img } } },
    updateMask: { fieldPaths: ["img"] },
    // updatedAt is what tells the website's catalogue file that this changed.
    updateTransforms: [{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }],
    currentDocument: { exists: true },
  }));
  const res = await fetch(`https://firestore.googleapis.com/v1/${docs}:commit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ writes }),
  });
  if (res.ok) {
    done += writes.length;
    console.log(`  saved ${done}/${changes.length}`);
  } else {
    failed += writes.length;
    console.error(`  batch at ${i} refused (${res.status}): ${(await res.text()).slice(0, 200)}`);
  }
}
console.log(`\nSaved ${done} photo links${failed ? `, ${failed} NOT saved` : ""}. The website's catalogue file picks them up within 5 minutes.`);
process.exit(failed ? 1 : 0);
