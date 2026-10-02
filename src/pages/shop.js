import React, { useEffect, useMemo, useState } from "react";
import InfoPage from "../components/InfoPage";

/*
 * What DASHIT sells, with today's prices: read from the same catalogue file
 * the apps use (/catalog/catalog.json, rebuilt on the server by cron), so the
 * prices here are always the live ones. Shows what can be bought right now;
 * tobacco and other 18+ items are never listed (COTPA, and the terms promise
 * they aren't promoted).
 */

const PER_CATEGORY = 12;
const RESTRICTED = ["tobacco", "smoking", "cigarette"];

function isListed(p) {
  if (!p || p.active === false || p.ageRestricted === true) return false;
  const cat = String(p.cat || p.category || "").toLowerCase();
  if (!cat || RESTRICTED.some((word) => cat.includes(word))) return false;
  const price = Number(p.price);
  if (!(price > 0)) return false;
  const inStock = p.inStock !== false && (p.stock === undefined || p.stock === null || Number(p.stock) > 0);
  return inStock;
}

function photoOf(p) {
  const src = p.img || p.image || p.imageUrl || "";
  return typeof src === "string" ? src : "";
}

function rupees(value) {
  const n = Number(value);
  return Number.isInteger(n) ? `₹${n}` : `₹${n.toFixed(2)}`;
}

function ProductTile({ product }) {
  const mrp = Number(product.mrp || product.originalPrice || 0);
  const price = Number(product.price);
  const photo = photoOf(product);
  return (
    <div className="rounded-2xl border border-slate-200/80 p-3 flex flex-col dark:border-line/80">
      <div className="aspect-square rounded-xl bg-white flex items-center justify-center overflow-hidden">
        {photo ? (
          <img
            src={photo}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-contain"
            onError={(e) => {
              e.currentTarget.style.visibility = "hidden";
            }}
          />
        ) : null}
      </div>
      <p className="mt-2 text-sm font-semibold leading-snug text-slate-800 line-clamp-2 dark:text-content">{product.name}</p>
      {product.unit ? <p className="text-xs text-slate-500 dark:text-content-faint">{product.unit}</p> : null}
      <p className="mt-auto pt-2 text-[15px] font-bold text-[#061838] dark:text-content">
        {rupees(price)}
        {mrp > price ? (
          <span className="ml-2 text-xs font-medium text-slate-400 line-through">{rupees(mrp)}</span>
        ) : null}
      </p>
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch("/catalog/catalog.json", { headers: { Accept: "application/json" } })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((data) => {
        if (alive) setProducts(Array.isArray(data?.products) ? data.products : []);
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, []);

  const shelves = useMemo(() => {
    if (!products) return [];
    const byCat = new Map();
    for (const p of products) {
      if (!isListed(p)) continue;
      const name = String(p.cat || p.category).trim();
      if (!byCat.has(name)) byCat.set(name, []);
      byCat.get(name).push(p);
    }
    return [...byCat.entries()]
      .map(([name, items]) => ({ name, count: items.length, items: items.filter(photoOf).slice(0, PER_CATEGORY) }))
      .filter((shelf) => shelf.items.length > 0)
      .sort((a, b) => b.count - a.count);
  }, [products]);

  const total = shelves.reduce((sum, shelf) => sum + shelf.count, 0);

  return (
    <InfoPage
      title="Our Products"
      seoTitle="Products & Prices — DASHIT Grocery Delivery, Anantnag"
      description="Groceries, fresh produce, dairy, snacks and household essentials delivered in Anantnag by DASHIT, with today's prices."
      path="/shop"
      updated="Prices in Indian Rupees (₹), including taxes. Delivered in Anantnag, Jammu & Kashmir (PIN 192101)."
    >
      <p className="text-[15px] leading-relaxed text-slate-700 dark:text-content-muted">
        DASHIT delivers groceries and everyday essentials in Anantnag. Here is a selection of what you can order today,
        with current prices. The full range is in the DASHIT app, where you can also pay online by UPI, card or net
        banking, or pay cash on delivery.
      </p>

      {failed ? (
        <p className="text-[15px] text-slate-600 dark:text-content-muted">
          The product list couldn&apos;t load just now. Please refresh the page, or browse the full range in the DASHIT app.
        </p>
      ) : products === null ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-56 rounded-2xl bg-slate-100 dark:bg-surface" />
          ))}
        </div>
      ) : (
        <div className="space-y-10">
          <p className="text-sm font-semibold text-slate-500 dark:text-content-faint">
            {total.toLocaleString("en-IN")} products in {shelves.length} categories available right now
          </p>
          {shelves.map((shelf) => (
            <section key={shelf.name} className="space-y-3">
              <h2 className="text-xl font-bold text-[#061838] dark:text-content">
                {shelf.name}
                <span className="ml-2 text-sm font-medium text-slate-400">{shelf.count} items</span>
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {shelf.items.map((p) => (
                  <ProductTile key={p.id} product={p} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </InfoPage>
  );
}
