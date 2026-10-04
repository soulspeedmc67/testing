import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/router";
import { ArrowLeft, Copy, Check } from "lucide-react";
import SEO from "../components/SEO";
import ProductCard from "../components/ProductCard";
import QuickProductSheet from "../components/QuickProductSheet";
import { watchShopProducts, isSoldOut } from "../lib/catalogueFile";
import { DEFAULT_COUPONS, watchActiveCoupons } from "../lib/coupons";
import { browseable } from "../lib/tobacco";
import { hapticLight, hapticCartAdd } from "../lib/haptics";
import { goBack } from "../lib/navigation";

const PAGE_SIZE = 40;

const discountOf = (p) => {
  const mrp = Number(p.originalPrice || p.mrp) || 0;
  const price = Number(p.price) || 0;
  if (!mrp || !price || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
};

/** The real offer codes, and everything sold below its MRP right now. */
export default function OffersPage() {
  const router = useRouter();
  const [coupons, setCoupons] = useState(DEFAULT_COUPONS);
  const [productsList, setProductsList] = useState([]);
  const [cart, setCart] = useState([]);
  const [copiedCode, setCopiedCode] = useState(null);
  const [selectedQuickProduct, setSelectedQuickProduct] = useState(null);
  const [visible, setVisible] = useState(PAGE_SIZE);
  const moreRef = useRef(null);

  useEffect(() => watchShopProducts(setProductsList), []);

  useEffect(() => {
    const unsub = watchActiveCoupons((activeList) => {
      if (Array.isArray(activeList)) setCoupons(activeList);
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  useEffect(() => {
    const syncCart = () => {
      try {
        setCart(JSON.parse(localStorage.getItem("dashit_cart") || "[]"));
      } catch (e) {}
    };
    syncCart();
    window.addEventListener("dashit_cart_updated", syncCart);
    return () => window.removeEventListener("dashit_cart_updated", syncCart);
  }, []);

  /* Deepest saving first; only in-stock items are shown. */
  const deals = useMemo(() => {
    const list = browseable(productsList)
      .map((p) => ({ p, off: discountOf(p) }))
      .filter((d) => d.off > 0 && !isSoldOut(d.p))
      .sort((a, b) => b.off - a.off);
    return list.map((d) => d.p);
  }, [productsList]);

  useEffect(() => {
    const el = moreRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((e) => e.some((x) => x.isIntersecting) && setVisible((n) => n + PAGE_SIZE), {
      rootMargin: "800px 0px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, [deals.length, visible]);

  const saveCart = (next) => {
    setCart(next);
    try {
      localStorage.setItem("dashit_cart", JSON.stringify(next));
      window.dispatchEvent(new Event("dashit_cart_updated"));
    } catch (e) {}
  };

  const addToCart = (product) => {
    hapticCartAdd();
    const pId = String(product.id || product.barcode);
    const idx = cart.findIndex((i) => String(i.id || i.barcode) === pId);
    if (idx !== -1) {
      const next = [...cart];
      next[idx] = { ...next[idx], qty: (next[idx].qty || 1) + 1 };
      saveCart(next);
    } else {
      saveCart([...cart, { ...product, id: pId, qty: 1 }]);
    }
  };

  const updateQty = (id, delta) => {
    const pId = String(id);
    const idx = cart.findIndex((i) => String(i.id || i.barcode) === pId);
    if (idx === -1) return;
    const next = [...cart];
    const qty = (next[idx].qty || 1) + delta;
    if (qty <= 0) next.splice(idx, 1);
    else next[idx] = { ...next[idx], qty };
    saveCart(next);
  };

  const qtyOf = (p) => cart.find((i) => String(i.id || i.barcode) === String(p.id || p.barcode))?.qty || 0;

  const copyCode = (code) => {
    hapticLight();
    try {
      navigator.clipboard?.writeText(code);
    } catch (e) {}
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  return (
    <div className="min-h-screen bg-[#FFFDF5] pb-dock dark:bg-surface">
      <SEO
        title="Offers — Coupons and Discounts"
        description="DASHIT offer codes and everything on discount today, delivered across Anantnag."
        canonical="/offers/"
      />
      <header className="sticky top-0 z-30 bg-[#FFFDF5]/95 backdrop-blur-md border-b border-slate-200/70 pt-[env(safe-area-inset-top,0px)] dark:bg-surface/95 dark:border-line">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => goBack(router, "/shop")}
            aria-label="Back"
            className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center text-[#061838] hover:bg-slate-100 dark:text-content dark:hover:bg-surface-raised"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[17px] font-bold tracking-tight text-[#061838] dark:text-content">Offers</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-5 space-y-8">
        <section>
          <h2 className="px-1 text-[16px] font-bold tracking-tight text-[#061838] dark:text-content">Offer codes</h2>
          <p className="px-1 mt-1 text-[13px] text-slate-500 dark:text-content-muted">Apply one at checkout.</p>
          <ul className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
            {coupons.length === 0 ? (
              <li className="col-span-full py-8 text-center text-[13px] text-slate-500 dark:text-content-muted">
                No active coupon codes right now. Check back soon.
              </li>
            ) : (
              coupons.map((c) => (
                <li
                  key={c.code}
                  className="rounded-2xl border border-slate-200 bg-white p-4 flex items-start justify-between gap-3 dark:bg-surface-raised dark:border-line"
                >
                  <div className="min-w-0">
                    <p className="font-mono text-[15px] font-bold tracking-wider text-[#C24400] dark:text-[#FF8A4C]">{c.code}</p>
                    <p className="mt-1 text-[14px] font-semibold text-slate-900 dark:text-content">{c.title}</p>
                    <p className="mt-0.5 text-[12.5px] text-slate-500 dark:text-content-muted">
                      {c.minOrder ? `On orders of ₹${c.minOrder} or more` : "No minimum order"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyCode(c.code)}
                    aria-label={`Copy ${c.code}`}
                    className="shrink-0 h-9 px-3 rounded-lg border border-slate-200 text-[12.5px] font-semibold text-slate-700 flex items-center gap-1.5 hover:bg-slate-50 dark:border-line dark:text-content-secondary dark:hover:bg-surface-muted"
                  >
                    {copiedCode === c.code ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    {copiedCode === c.code ? "Copied" : "Copy"}
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>

        <section>
          <div className="px-1 flex items-baseline justify-between">
            <h2 className="text-[16px] font-bold tracking-tight text-[#061838] dark:text-content">Below MRP today</h2>
            {deals.length > 0 && <span className="text-[12.5px] text-slate-500 dark:text-content-muted">{deals.length} items</span>}
          </div>
          {productsList.length === 0 ? (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3" aria-hidden="true">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="h-60 rounded-2xl bg-slate-100 dark:bg-surface-raised animate-pulse" />
              ))}
            </div>
          ) : deals.length === 0 ? (
            <p className="mt-3 px-1 text-[14px] text-slate-600 dark:text-content-muted">No discounts today. Check back soon.</p>
          ) : (
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {deals.slice(0, visible).map((p) => {
                const pId = String(p.id || p.barcode);
                return (
                  <ProductCard
                    key={pId}
                    product={p}
                    qty={qtyOf(p)}
                    onAdd={() => addToCart(p)}
                    onUpdateQty={(id, delta) => updateQty(id, delta)}
                    onIncrement={() => updateQty(pId, 1)}
                    onDecrement={() => updateQty(pId, -1)}
                    onQuickView={() => setSelectedQuickProduct(p)}
                  />
                );
              })}
            </div>
          )}
          {visible < deals.length && <div ref={moreRef} aria-hidden="true" className="h-10" />}
        </section>
      </main>

      <QuickProductSheet
        product={selectedQuickProduct}
        isOpen={Boolean(selectedQuickProduct)}
        onClose={() => setSelectedQuickProduct(null)}
        cartQty={selectedQuickProduct ? qtyOf(selectedQuickProduct) : 0}
        onAdd={() => selectedQuickProduct && addToCart(selectedQuickProduct)}
        onIncrement={() => selectedQuickProduct && updateQty(selectedQuickProduct.id, 1)}
        onDecrement={() => selectedQuickProduct && updateQty(selectedQuickProduct.id, -1)}
      />
    </div>
  );
}
