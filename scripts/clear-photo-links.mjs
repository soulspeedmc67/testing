#!/usr/bin/env node
/**
 * Takes a photo off the products in a list, or puts those photos back.
 *
 * The list is a JSON file of `[{ id, name, was, why }]`: `was` is the photo
 * link the product has now, `why` the reason it is wrong (a different product,
 * a damaged file). A product whose link is no longer `was` is left alone.
 *
 *   node scripts/clear-photo-links.mjs <list.json>                  (shows what it would do)
 *   node scripts/clear-photo-links.mjs <list.json> --write          (takes the photos off)
 *   node scripts/clear-photo-links.mjs <list.json> --undo --write   (puts them back)
 *
 * Signs in with this computer's Firebase CLI login (`npx firebase-tools login`).
 */
import { readFileSync } from "node:fs";
import { homedir } from "node:os";

const PROJECT = "dashit-1ecba";
// The Firebase CLI's own public OAuth client, as in restore-store-photos.mjs.
const CLIENT_ID = "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
const CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi";
const LIVE_URL = "https://dashit.co.in/catalog/catalog.json";
const BATCH = 300;

const args = process.argv.slice(2);
const listPath = args.find((a) => !a.startsWith("--"));
const WRITE = args.includes("--write");
const UNDO = args.includes("--undo");
if (!listPath) {
  console.error("Usage: node scripts/clear-photo-links.mjs <list.json> [--undo] [--write]");
  process.exit(1);
}

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

const list = JSON.parse(readFileSync(listPath, "utf8"));
const liveRes = await fetch(LIVE_URL, { headers: { Accept: "application/json" } });
if (!liveRes.ok) throw new Error(`Couldn't read the live catalogue (${liveRes.status})`);
const now = new Map(((await liveRes.json()).products || []).map((p) => [p.id, String(p.img || "").trim()]));

// Only products still in the state the list describes.
const changes = list.filter((c) => now.has(c.id) && now.get(c.id) === (UNDO ? "" : c.was));
console.log(`${list.length} in the list, ${changes.length} to ${UNDO ? "get their photo back" : "lose their photo"}, ${list.length - changes.length} already done or changed since.`);

if (!WRITE) {
  console.log("Nothing written. Add --write to save this to the shop.");
  process.exit(0);
}

const token = await accessToken();
const docs = `projects/${PROJECT}/databases/(default)/documents`;
let done = 0;
let failed = 0;
for (let i = 0; i < changes.length; i += BATCH) {
  const writes = changes.slice(i, i + BATCH).map((c) => ({
    update: { name: `${docs}/products/${c.id}`, fields: { img: { stringValue: UNDO ? c.was : "" } } },
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
console.log(`\nSaved ${done}${failed ? `, ${failed} NOT saved` : ""}. The website's catalogue file picks this up within 5 minutes.`);
process.exit(failed ? 1 : 0);
