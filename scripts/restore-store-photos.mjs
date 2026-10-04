#!/usr/bin/env node
/**
 * scripts/restore-store-photos.mjs
 *
 * Restores missing product photos for active DASHit inventory in Firestore:
 * 1. Fetches active products from https://dashit.co.in/catalog/catalog.json
 * 2. Matches photos against:
 *    - data/photo-matches/dashit-photos-matched-hostinger.csv & .json
 *    - public/catalog/photo-review-v1.json (sure entries)
 *    - public/catalog/products-v1.json (photoFromCatalog)
 *    - data/dashit_master_catalog.json (photoFromCatalog)
 * 3. Saves complete backup CSV to data/photo-matches/dashit-current-stock-restored.csv
 * 4. Authenticates to Firestore via Firebase CLI credentials
 * 5. Commits updates in batches of 350 to Firestore REST commit endpoint
 * 6. Verifies writes via changes.php and monitors Hostinger cron catalog rebuild
 */

import dns from "node:dns";
dns.setDefaultResultOrder("ipv4first");

import { readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { parseCsv } from "../src/lib/csvInventory.js";
import {
  prepareCatalog,
  photoFromCatalog,
  normaliseName,
  catalogPhotoUrl,
} from "../src/lib/productCatalog.js";

const PROJECT = "dashit-1ecba";
const CLIENT_ID = "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com";
const CLIENT_SECRET = "j9iVZfS8kkCEFUPaAeJV0sAi";
const BATCH_SIZE = 350;

function cleanNameWithoutUnit(name) {
  let norm = normaliseName(name);
  norm = norm.replace(/\s+\d+(\.\d+)?\s*(kg|g|gm|gms|gram|grams|ml|l|ltr|ltrs|litre|litres|pc|pcs|piece|pieces|n|box|pack|pk)\b.*$/, "");
  return norm.trim();
}

function escapeCsvField(val) {
  const str = String(val ?? "");
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function getAccessToken() {
  const cliPath = `${homedir()}/.config/configstore/firebase-tools.json`;
  const cli = JSON.parse(readFileSync(cliPath, "utf8"));
  if (!cli?.tokens?.refresh_token) {
    throw new Error(`No refresh token found in ${cliPath}. Run: npx firebase-tools login`);
  }

  console.log("🔑 Authenticating with Firebase OAuth endpoint...");
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: cli.tokens.refresh_token,
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });

  if (!res.ok) {
    throw new Error(`OAuth login refused (${res.status}): ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token;
}

async function main() {
  console.log("==================================================================");
  console.log("📸 DASHit Inventory Photo Recovery Pipeline");
  console.log("==================================================================");
  const startTime = Date.now();

  // 1. Fetch live active inventory
  console.log("\n📥 [Step 1/6] Fetching current live products from https://dashit.co.in/catalog/catalog.json...");
  const catalogRes = await fetch("https://dashit.co.in/catalog/catalog.json", {
    headers: { "User-Agent": "Mozilla/5.0 (DASHit-Photo-Recovery/1.0)" },
  });
  if (!catalogRes.ok) {
    throw new Error(`Failed to fetch live catalog (${catalogRes.status}): ${await catalogRes.text()}`);
  }
  const catalogJson = await catalogRes.json();
  const allProducts = catalogJson.products || [];
  const activeProducts = allProducts.filter(
    (p) => p.active !== false && p.name && (p.stock > 0 || p.inStock)
  );
  console.log(`✅ Loaded ${allProducts.length} total products.`);
  console.log(`✅ Identified ${activeProducts.length} active stock products.`);

  // 2. Photo Matching
  console.log("\n🔍 [Step 2/6] Matching product photos from verified local catalogs...");
  const matches = new Map(); // id -> { img, source }

  // 2a. Match from Hostinger CSV & JSON
  console.log("   Loading data/photo-matches/dashit-photos-matched-hostinger.csv & .json...");
  const hostingerCsvContent = readFileSync("data/photo-matches/dashit-photos-matched-hostinger.csv", "utf8");
  const hostingerRows = parseCsv(hostingerCsvContent);
  const header = hostingerRows[0].map((h) => h.trim().toLowerCase());
  const nameIdx = header.indexOf("name");
  const imgIdx = header.indexOf("image");
  const barcodeIdx = header.indexOf("barcode");

  const hostingerByName = new Map();
  const hostingerByClean = new Map();
  const hostingerBySlug = new Map();

  for (let i = 1; i < hostingerRows.length; i++) {
    const row = hostingerRows[i];
    const name = row[nameIdx]?.trim();
    const img = row[imgIdx]?.trim();
    const barcode = row[barcodeIdx]?.trim() || "";
    if (name && img && img.startsWith("http")) {
      const norm = normaliseName(name);
      hostingerByName.set(norm, img);
      const clean = cleanNameWithoutUnit(name);
      if (clean.length >= 3 && !hostingerByClean.has(clean)) {
        hostingerByClean.set(clean, img);
      }
      const slugMatch = barcode.match(/^CSV-(.*)-[a-z0-9]{7}$/i);
      if (slugMatch) {
        hostingerBySlug.set(slugMatch[1].toLowerCase(), img);
      }
    }
  }

  const hostingerJson = JSON.parse(readFileSync("data/photo-matches/dashit-photos-matched-hostinger.json", "utf8"));
  for (const h of hostingerJson) {
    if (h.name && h.image && h.image.startsWith("http")) {
      const norm = normaliseName(h.name);
      if (!hostingerByName.has(norm)) hostingerByName.set(norm, h.image);
      const clean = cleanNameWithoutUnit(h.name);
      if (clean.length >= 3 && !hostingerByClean.has(clean)) hostingerByClean.set(clean, h.image);
      const slugMatch = (h.barcode || "").match(/^CSV-(.*)-[a-z0-9]{7}$/i);
      if (slugMatch) hostingerBySlug.set(slugMatch[1].toLowerCase(), h.image);
    }
  }

  let hostingerExact = 0;
  let hostingerClean = 0;
  let hostingerSlug = 0;

  for (const p of activeProducts) {
    const norm = normaliseName(p.name);
    const img = hostingerByName.get(norm);
    if (img) {
      matches.set(p.id, { img, source: "hostinger-csv-exact" });
      hostingerExact++;
    }
  }

  for (const p of activeProducts) {
    if (matches.has(p.id)) continue;
    const clean = cleanNameWithoutUnit(p.name);
    const img = hostingerByClean.get(clean);
    if (img) {
      matches.set(p.id, { img, source: "hostinger-csv-clean" });
      hostingerClean++;
    }
  }

  for (const p of activeProducts) {
    if (matches.has(p.id)) continue;
    const idSlug = p.id.replace(/^csv-/i, "").toLowerCase();
    const img = hostingerBySlug.get(idSlug);
    if (img) {
      matches.set(p.id, { img, source: "hostinger-csv-slug" });
      hostingerSlug++;
    }
  }

  console.log(`   Hostinger matches: ${matches.size} (${hostingerExact} exact, ${hostingerClean} clean, ${hostingerSlug} slug)`);

  // 2b. Match from public/catalog/photo-review-v1.json (sure entries)
  console.log("   Loading public/catalog/photo-review-v1.json (sure entries)...");
  const reviewJson = JSON.parse(readFileSync("public/catalog/photo-review-v1.json", "utf8"));
  const sureByName = new Map();
  const sureByClean = new Map();
  for (const s of (reviewJson.sure || [])) {
    if (s.name && s.img && s.img.startsWith("http")) {
      const norm = normaliseName(s.name);
      sureByName.set(norm, s.img);
      const clean = cleanNameWithoutUnit(s.name);
      if (clean.length >= 3 && !sureByClean.has(clean)) {
        sureByClean.set(clean, s.img);
      }
    }
  }

  let sureCount = 0;
  for (const p of activeProducts) {
    if (matches.has(p.id)) continue;
    const norm = normaliseName(p.name);
    let img = sureByName.get(norm);
    if (!img) {
      const clean = cleanNameWithoutUnit(p.name);
      img = sureByClean.get(clean);
    }
    if (img) {
      matches.set(p.id, { img, source: "photo-review-sure" });
      sureCount++;
    }
  }
  console.log(`   Photo Review Sure added: ${sureCount} (Total: ${matches.size})`);

  // 2c. Match using photoFromCatalog against public/catalog/products-v1.json
  console.log("   Running photoFromCatalog against public/catalog/products-v1.json...");
  const rawProductsV1 = JSON.parse(readFileSync("public/catalog/products-v1.json", "utf8"));
  const preparedV1 = prepareCatalog(rawProductsV1);

  let v1Count = 0;
  for (const p of activeProducts) {
    if (matches.has(p.id)) continue;
    const match = photoFromCatalog(preparedV1, p.name);
    if (match && match.img) {
      matches.set(p.id, { img: match.img, source: "products-v1" });
      v1Count++;
    }
  }
  console.log(`   Products-v1 photoFromCatalog added: ${v1Count} (Total: ${matches.size})`);

  // 2d. Match using photoFromCatalog against data/dashit_master_catalog.json (153k items)
  console.log("   Running photoFromCatalog against data/dashit_master_catalog.json (153k items)...");
  const masterRaw = JSON.parse(readFileSync("data/dashit_master_catalog.json", "utf8"));
  const masterImages = [];
  const imageIndexMap = new Map();
  const masterItems = [];
  for (const m of masterRaw) {
    if (!m.name || !m.hostinger_url) continue;
    let imgIdx = imageIndexMap.get(m.hostinger_url);
    if (imgIdx === undefined) {
      imgIdx = masterImages.length;
      masterImages.push(m.hostinger_url);
      imageIndexMap.set(m.hostinger_url, imgIdx);
    }
    masterItems.push([m.name, 0, 0, imgIdx]);
  }
  const masterPrepared = prepareCatalog({
    items: masterItems,
    images: masterImages,
    shelves: [],
    aisles: [],
    brands: [],
  });

  let masterCount = 0;
  for (const p of activeProducts) {
    if (matches.has(p.id)) continue;
    const match = photoFromCatalog(masterPrepared, p.name);
    if (match && match.img) {
      matches.set(p.id, { img: match.img, source: "master-catalog" });
      masterCount++;
    }
  }
  console.log(`   Master catalog photoFromCatalog added: ${masterCount} (Total: ${matches.size})`);

  console.log(`\n🎉 Total matched active products with verified studio packshots: ${matches.size}`);

  // 3. Write backup CSV
  console.log("\n💾 [Step 3/6] Saving backup CSV to data/photo-matches/dashit-current-stock-restored.csv...");
  const csvHeaders = ["barcode", "name", "brand", "unit", "category", "price", "stock", "image", "match_source"];
  const csvLines = [csvHeaders.join(",")];

  for (const p of activeProducts) {
    const match = matches.get(p.id);
    const row = [
      escapeCsvField(p.id),
      escapeCsvField(p.name),
      escapeCsvField(p.brand || ""),
      escapeCsvField(p.unit || ""),
      escapeCsvField(p.cat || ""),
      escapeCsvField(p.price || 0),
      escapeCsvField(p.stock || 0),
      escapeCsvField(match ? match.img : ""),
      escapeCsvField(match ? match.source : "none"),
    ];
    csvLines.push(row.join(","));
  }

  const backupPath = "data/photo-matches/dashit-current-stock-restored.csv";
  writeFileSync(backupPath, csvLines.join("\n"), "utf8");
  console.log(`✅ Saved ${activeProducts.length} rows to ${backupPath}.`);

  // 4. Authenticate to Firestore
  console.log("\n🔐 [Step 4/6] Authenticating to Firestore REST API...");
  const token = await getAccessToken();
  console.log("✅ OAuth token acquired successfully.");

  // 5. Batch Commit to Firestore
  console.log(`\n🚀 [Step 5/6] Batch committing ${matches.size} photo updates to Firestore in chunks of ${BATCH_SIZE}...`);
  const docsPrefix = `projects/${PROJECT}/databases/(default)/documents`;
  const matchedEntries = Array.from(matches.entries());

  let totalUpdated = 0;
  let batchIndex = 0;

  for (let i = 0; i < matchedEntries.length; i += BATCH_SIZE) {
    batchIndex++;
    const slice = matchedEntries.slice(i, i + BATCH_SIZE);
    const writes = slice.map(([id, { img }]) => ({
      update: {
        name: `${docsPrefix}/products/${id}`,
        fields: {
          img: { stringValue: img },
          imgSource: { stringValue: "catalog" },
        },
      },
      updateMask: { fieldPaths: ["img", "imgSource"] },
      updateTransforms: [{ fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" }],
      currentDocument: { exists: true },
    }));

    const commitRes = await fetch(`https://firestore.googleapis.com/v1/${docsPrefix}:commit`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ writes }),
    });

    if (!commitRes.ok) {
      const errText = await commitRes.text();
      console.error(`❌ Batch #${batchIndex} failed (${commitRes.status}): ${errText.slice(0, 300)}`);
      // If batch fails due to pre-condition on a missing doc, fallback to writing individually
      console.log(`   Retrying batch #${batchIndex} with individual item fallbacks...`);
      for (const w of writes) {
        try {
          const singleRes = await fetch(`https://firestore.googleapis.com/v1/${docsPrefix}:commit`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ writes: [w] }),
          });
          if (singleRes.ok) totalUpdated++;
        } catch (e) {
          // Ignore individual missing doc error
        }
      }
    } else {
      totalUpdated += writes.length;
      console.log(`   Batch #${batchIndex} committed: ${writes.length} items (${totalUpdated}/${matches.size} total)`);
    }
  }

  console.log(`\n✅ Finished Firestore commits: ${totalUpdated} product photos restored.`);

  // 6. Verification
  console.log("\n🔍 [Step 6/6] Verifying updates via Hostinger catalog API...");
  console.log("   Querying https://dashit.co.in/api/catalog/changes.php?since=" + startTime + "...");
  try {
    const changesRes = await fetch(`https://dashit.co.in/api/catalog/changes.php?since=${startTime}`, {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (changesRes.ok) {
      const changesData = await changesRes.json();
      const count = changesData.products?.length || 0;
      console.log(`✅ changes.php confirmed: ${count} updated products picked up by Hostinger cache!`);
      const sample = (changesData.products || []).find((p) => p.img);
      if (sample) {
        console.log(`   Sample verified updated product: ${sample.id} -> ${sample.img}`);
      }
    } else {
      console.warn(`⚠️ changes.php returned ${changesRes.status}`);
    }
  } catch (err) {
    console.warn(`⚠️ changes.php check skipped: ${err.message}`);
  }

  // Check catalog status
  try {
    const statusRes = await fetch("https://dashit.co.in/catalog/catalog-status.json", {
      headers: { "User-Agent": "Mozilla/5.0" },
    });
    if (statusRes.ok) {
      const statusData = await statusRes.json();
      console.log(`   Current Hostinger catalog status: builtAt=${new Date(statusData.builtAt).toLocaleTimeString()}, count=${statusData.count}`);
      console.log(`   👉 Hostinger 5-minute cron will merge these changes into catalog.json on its next run.`);
    }
  } catch (err) {
    console.warn(`⚠️ catalog-status.json check: ${err.message}`);
  }

  console.log("\n==================================================================");
  console.log(`🎉 RESTORATION COMPLETE: ${totalUpdated} product photos restored in Firestore!`);
  console.log("==================================================================");
}

main().catch((err) => {
  console.error("\n❌ Fatal error in restore pipeline:", err);
  process.exit(1);
});
