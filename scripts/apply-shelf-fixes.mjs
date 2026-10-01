#!/usr/bin/env node
/**
 * Moves products to the shelves in public/catalog/shelf-fixes-v1.json, using
 * the Firebase CLI login on this machine (npx firebase-tools login).
 *
 *   node scripts/apply-shelf-fixes.mjs                     # move them
 *   node scripts/apply-shelf-fixes.mjs public/catalog/shelf-fixes-v2.json
 *   node scripts/apply-shelf-fixes.mjs --undo data/shelf-moves-<date>.json
 *
 * Only `cat` (and `updatedAt`, so the apps fetch it) changes. The old shelves are saved to data/shelf-moves-<date>.json
 * first, and --undo with that file puts them back.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";

const PROJECT = "dashit-1ecba";
// The Firebase CLI's own public OAuth client, the one its login token belongs to.
const CLIENT_ID = "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
const CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi";

async function accessToken() {
  const cli = JSON.parse(readFileSync(`${homedir()}/.config/configstore/firebase-tools.json`, "utf8"));
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    body: new URLSearchParams({
      grant_type: "refresh_token", refresh_token: cli.tokens.refresh_token,
      client_id: CLIENT_ID, client_secret: CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`login token refused (${res.status}); run npx firebase-tools login`);
  return (await res.json()).access_token;
}

const undoAt = process.argv.indexOf("--undo");
const moves = undoAt > 0
  ? JSON.parse(readFileSync(process.argv[undoAt + 1], "utf8")).map((m) => ({ id: m.id, to: m.from }))
  : JSON.parse(readFileSync(process.argv[2] || "public/catalog/shelf-fixes-v1.json", "utf8")).moves;
if (undoAt < 0) {
  const list = (process.argv[2] || "shelf-fixes-v1").split("/").pop().replace(".json", "");
  const file = `data/shelf-moves-${new Date().toISOString().slice(0, 10)}-${list}.json`;
  writeFileSync(file, JSON.stringify(moves));
  console.log(`old shelves saved to ${file}`);
}

const token = await accessToken();
const docs = `projects/${PROJECT}/databases/(default)/documents`;
let done = 0;
for (let i = 0; i < moves.length; i += 400) {
  const writes = moves.slice(i, i + 400).map((m) => ({
    update: { name: `${docs}/products/${m.id}`, fields: { cat: { stringValue: m.to } } },
    updateMask: { fieldPaths: ["cat"] },
    // The apps only fetch products changed since their last visit, by updatedAt.
    updateTransforms: [{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }],
    currentDocument: { exists: true },
  }));
  const res = await fetch(`https://firestore.googleapis.com/v1/${docs}:commit`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ writes }),
  });
  if (!res.ok) throw new Error(`Firestore answered ${res.status}: ${(await res.text()).slice(0, 300)}`);
  done += writes.length;
}
console.log(`moved ${done} items`);
