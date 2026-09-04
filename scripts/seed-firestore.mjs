/**
 * Seeds Firestore from the existing JSON backend and the bundled catalogue.
 *
 *   node scripts/seed-firestore.mjs           # products + offers + store config
 *   node scripts/seed-firestore.mjs --orders  # also import server/data/orders.json
 *
 * Uses the Web SDK (not Admin SDK — Spark has no service account flow), so it
 * must run while security rules still permit writes, OR you sign in as an admin
 * first. The simplest path: temporarily allow writes in the console, seed, then
 * redeploy the real rules.
 */

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  doc,
  setDoc,
  writeBatch,
  collection,
} from "firebase/firestore";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "..");

// Load .env.local without adding a dotenv dependency.
async function loadEnv() {
  try {
    const raw = await readFile(path.join(root, ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (match) process.env[match[1]] ??= match[2].replace(/^["']|["']$/g, "");
    }
  } catch (e) {
    console.warn("No .env.local found — relying on existing environment.");
  }
}

const chunk = (arr, size) =>
  arr.reduce((acc, _, i) => (i % size ? acc : [...acc, arr.slice(i, i + size)]), []);

async function readJson(relPath) {
  try {
    return JSON.parse(await readFile(path.join(root, relPath), "utf8"));
  } catch (e) {
    return null;
  }
}

async function main() {
  await loadEnv();

  const config = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  if (!config.apiKey || !config.projectId) {
    console.error("Missing Firebase config. Fill in .env.local first (see .env.local.example).");
    process.exit(1);
  }

  const db = getFirestore(initializeApp(config));

  // ---- products ----------------------------------------------------------
  const serverProducts = await readJson("server/data/products.json");
  const products = Array.isArray(serverProducts)
    ? serverProducts
    : serverProducts?.products || [];

  if (products.length) {
    for (const group of chunk(products, 400)) {
      const batch = writeBatch(db);
      for (const p of group) {
        const id = String(p.id || p.barcode);
        batch.set(
          doc(collection(db, "products"), id),
          {
            name: p.name || "",
            cat: p.cat || "",
            price: Number(p.price) || 0,
            originalPrice: Number(p.originalPrice || p.mrp || p.price) || 0,
            unit: p.unit || "",
            img: p.img || p.image || "",
            barcode: p.barcode || "",
            rating: Number(p.rating) || null,
            badge: p.badge || "",
            variants: p.variants || [],
            stock: Number(p.stock ?? 100),
            active: p.active !== false,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
      await batch.commit();
    }
    console.log(`✓ seeded ${products.length} products`);
  } else {
    console.log("· no products.json found, skipping catalogue");
  }

  // ---- offers ------------------------------------------------------------
  const offersMod = await readJson("server/data/offers.json");
  const fallbackOffers = [
    {
      id: "offer-snacks-01",
      badge: "DASHIT EXCLUSIVE",
      title: "Gourmet Snacks & Chilled Sips",
      subtitle: "Artisanal crisps, premium chocolates & chilled sodas at 8-min dispatch.",
      priceTag: "Starting ₹20",
      category: "Snacks",
      promoCode: "CRISP20",
      discountPercent: 20,
      expiresIn: "Ends in 3 hours",
      img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=600&auto=format&fit=crop&q=80",
      gradient: "from-[#040E22] via-[#061838] to-[#0A2558]",
      accent: "text-amber-400",
      active: true,
    },
    {
      id: "offer-bakery-02",
      badge: "FRESH FROM OVEN",
      title: "Artisan Breads & Morning Bakes",
      subtitle: "Authentic Kashmiri lavas, soft croissants & golden rolls delivered warm.",
      priceTag: "Starting ₹30",
      category: "Bakery",
      promoCode: "BAKE15",
      discountPercent: 15,
      expiresIn: "Ends at 12:00 PM",
      img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=600&auto=format&fit=crop&q=80",
      gradient: "from-[#140C04] via-[#241406] to-[#361E0A]",
      accent: "text-[#FF8A3D]",
      active: true,
    },
    {
      id: "offer-dairy-03",
      badge: "FARM TO DOORSTEP",
      title: "Fresh Milk, Butter & Kashmiri Apples",
      subtitle: "Chilled Amul dairy, creamy butter & crisp valley apples in minutes.",
      priceTag: "Save up to 25%",
      category: "Dairy",
      promoCode: "FRESH25",
      discountPercent: 25,
      expiresIn: "Active Today",
      img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=600&auto=format&fit=crop&q=80",
      gradient: "from-[#041424] via-[#08223C] to-[#0C3256]",
      accent: "text-sky-300",
      active: true,
    }
  ];
  const offers = (Array.isArray(offersMod) ? offersMod : offersMod?.offers) || fallbackOffers;
  if (offers.length) {
    const batch = writeBatch(db);
    for (const o of offers) {
      batch.set(
        doc(collection(db, "offers"), String(o.id || o.promoCode)),
        { ...o, active: o.active !== false },
        { merge: true }
      );
    }
    await batch.commit();
    console.log(`✓ seeded ${offers.length} offers`);
  }

  // ---- store config ------------------------------------------------------
  await setDoc(
    doc(db, "config", "store"),
    { isOpen: true, highDemand: false, updatedAt: new Date().toISOString() },
    { merge: true }
  );
  console.log("✓ store config written");

  // ---- orders (opt-in) ---------------------------------------------------
  if (process.argv.includes("--orders")) {
    const raw = await readJson("server/data/orders.json");
    const orders = Array.isArray(raw) ? raw : raw?.orders || [];
    for (const group of chunk(orders, 400)) {
      const batch = writeBatch(db);
      for (const o of group) {
        const id = String(o.orderId || o.id);
        batch.set(doc(collection(db, "orders"), id), { ...o, orderId: id }, { merge: true });
      }
      await batch.commit();
    }
    console.log(`✓ seeded ${orders.length} historical orders`);
  }

  console.log("\nDone. Remember to redeploy strict rules if you loosened them:");
  console.log("  npx firebase-tools deploy --only firestore:rules");
  process.exit(0);
}

main().catch((e) => {
  console.error("Seed failed:", e);
  process.exit(1);
});
