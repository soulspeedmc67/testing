import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { ArrowLeft, Search, Tag, Flame, Copy, Check, Sparkles } from "lucide-react";
import SEO from "../components/SEO";
import ProductCard from "../components/ProductCard";
import QuickProductSheet from "../components/QuickProductSheet";
import { ALL_PRODUCTS } from "../data/products";
import { getExclusiveOffers } from "../lib/offers";
import { watchProducts } from "../lib/db";
import { hapticLight, hapticCartAdd } from "../lib/haptics";
import { useStoreDetails } from "../lib/storeStatus";
import { goBack } from "../lib/navigation";
import { stagger, scaleIn, fadeUp } from "../lib/motion";

const discountOf = (p) => {
  const mrp = Number(p.originalPrice) || 0;
  const price = Number(p.price) || 0;
  if (!mrp || !price || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
};

export default function OffersPage() {
  const router = useRouter();
  const { isOpen: isStoreOpen, closeReason } = useStoreDetails();
  const [productsList, setProductsList] = useState(ALL_PRODUCTS);
  const [offers, setOffers] = useState([]);
  const [cart, setCart] = useState([]);
  const [copiedCode, setCopiedCode] = useState(null);
  const [selectedQuickProduct, setSelectedQuickProduct] = useState(null);

  useEffect(() => {
    setOffers(getExclusiveOffers().filter((o) => o.active !== false));
    const reload = () => setOffers(getExclusiveOffers().filter((o) => o.active !== false));
    window.addEventListener("dashit_offers_updated", reload);
    return () => window.removeEventListener("dashit_offers_updated", reload);
  }, []);

  useEffect(() => {
    const syncCart = () => {
      try {
        const saved = localStorage.getItem("dashit_cart");
        if (saved) setCart(JSON.parse(saved));
      } catch (e) {}
    };
    syncCart();
    window.addEventListener("dashit_cart_updated", syncCart);
    return () => window.removeEventListener("dashit_cart_updated", syncCart);
  }, []);

  useEffect(() => {
    const unsub = watchProducts((live) => {
      if (live && live.length > 0) setProductsList(live);
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  /* Everything actually discounted right now, deepest saving first. */
  const dealProducts = useMemo(
    () =>
      productsList
        .map((p) => ({ ...p, _off: discountOf(p) }))
        .filter((p) => p._off > 0)
        .sort((a, b) => b._off - a._off),
    [productsList]
  );

  const topSaving = dealProducts.length > 0 ? dealProducts[0]._off : 0;
  const totalSavings = useMemo(
    () =>
      dealProducts.reduce(
        (sum, p) => sum + Math.max(0, (Number(p.originalPrice) || 0) - (Number(p.price) || 0)),
        0
      ),
    [dealProducts]
  );

  const saveCart = (next) => {
    setCart(next);
    try {
      localStorage.setItem("dashit_cart", JSON.stringify(next));
      window.dispatchEvent(new Event("dashit_cart_updated"));
    } catch (e) {}
  };

  const handleAddToCart = (product) => {
    if (!isStoreOpen) {
      alert(`Store Reopening Schedule: ${closeReason || "We will reopen shortly!"}`);
      return;
    }
    hapticCartAdd();
    const pId = String(product.id || product.barcode);
    const idx = cart.findIndex((i) => String(i.id || i.barcode) === pId);
    if (idx !== -1) {
      const next = [...cart];
      next[idx] = { ...next[idx], qty: (next[idx].qty || 1) + 1 };
      saveCart(next);
    } else {
      saveCart([...cart, { ...product, qty: 1 }]);
    }
  };

  const handleUpdateQty = (id, delta) => {
    const pId = String(id);
    const idx = cart.findIndex((i) => String(i.id || i.barcode) === pId);
    if (idx === -1) return;
    const next = [...cart];
    const newQty = (next[idx].qty || 1) + delta;
    if (newQty <= 0) next.splice(idx, 1);
    else next[idx] = { ...next[idx], qty: newQty };
    saveCart(next);
  };

  const qtyOf = (p) =>
    cart.find((i) => String(i.id || i.barcode) === String(p.id || p.barcode))?.qty || 0;

  const copyCode = (code) => {
    hapticLight();
    try {
      navigator.clipboard?.writeText(code);
    } catch (e) {}
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 1800);
  };

  return (
    /* No overflow-x-hidden here: with overflow-y left visible the CSS spec
       computes it to `auto`, which turns this div into a nested scroll
       container. Framer's whileInView observes the viewport, so every card
       below the fold stayed at its `hidden` variant — an invisible grid. The
       blurred blobs are clipped by their own overflow-hidden wrapper instead. */
    <div className="relative min-h-screen bg-[#FFF1E4]">
      <SEO
        title="Offers & Deals — Save on Daily Essentials"
        description="Today's best grocery offers in Anantnag. Discounts on fresh vegetables, fruits, dairy and daily essentials with fastest delivery across Anantnag."
        canonical="/offers/"
        ogType="website"
        keywords="grocery offers Anantnag, DASHIT deals, discount groceries Kashmir"
      />

      {/* Warm ground.
          Built in layers rather than one flat fill: a vertical amber-to-ivory
          gradient carries the warmth at the top where the hero sits and clears
          to near-white lower down so the white product cards still read
          crisply. The glows stay inside one warm family — amber, peach, rose.
          An earlier violet glow turned the cream grey where it overlapped and
          made the screen look washed out rather than rich. The grain on top is
          what stops a large CSS gradient from looking flat and cheap. */}
      <div aria-hidden className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-[#FFE3C7] via-[#FFF1E4] to-[#FFFCF9]" />

        <motion.div
          animate={{ x: [0, 18, 0], y: [0, -12, 0] }}
          transition={{ duration: 26, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 -left-24 w-[26rem] h-[26rem] rounded-full bg-[#FF8A2B]/35 blur-[110px]"
        />
        <motion.div
          animate={{ x: [0, -16, 0], y: [0, 16, 0] }}
          transition={{ duration: 32, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-16 -right-28 w-[24rem] h-[24rem] rounded-full bg-[#FF5E7A]/22 blur-[120px]"
        />
        <motion.div
          animate={{ x: [0, 14, 0], y: [0, 14, 0] }}
          transition={{ duration: 38, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[30rem] -left-20 w-[22rem] h-[22rem] rounded-full bg-[#FFB627]/18 blur-[120px]"
        />

        {/* A warm highlight right behind the hero, so the eye lands there first */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-[30rem] h-[18rem] rounded-full bg-[#FFD9A8]/40 blur-[90px]" />

        {/* Fine film grain — low opacity, soft-light so it tints rather than greys */}
        <div
          className="absolute inset-0 opacity-[0.05] mix-blend-soft-light"
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E\")",
            backgroundRepeat: "repeat",
          }}
        />
      </div>

      {/* Header */}
      <header className="px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => goBack(router, "/shop")}
            className="w-10 h-10 rounded-full bg-white/70 backdrop-blur-md border border-white/60 flex items-center justify-center text-[#061838] active:scale-95 transition-transform shadow-2xs dark:bg-surface-raised/70 dark:text-content"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <div>
            <h1 className="text-base font-black text-[#061838] leading-tight">Offers</h1>
            <span className="text-[11px] font-semibold text-[#B4460B]">
              {dealProducts.length} deals live right now
            </span>
          </div>
        </div>

        <Link
          href="/search"
          className="w-10 h-10 rounded-full bg-white/70 backdrop-blur-md border border-white/60 flex items-center justify-center text-[#061838] active:scale-95 transition-transform shadow-2xs dark:bg-surface-raised/70 dark:text-content"
        >
          <Search className="w-4 h-4 stroke-[2.5]" />
        </Link>
      </header>

      <main className="px-4 pb-dock max-w-md md:max-w-5xl mx-auto">
        {/* Hero savings statement */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="rounded-[26px] bg-gradient-to-br from-[#FF5B00] via-[#FF3D68] to-[#C026D3] p-5 text-white shadow-[0_12px_32px_-12px_rgba(255,91,0,0.55)] overflow-hidden relative"
        >
          <div aria-hidden className="absolute -right-8 -top-10 w-36 h-36 rounded-full bg-white/15" />
          <div aria-hidden className="absolute -right-2 top-16 w-20 h-20 rounded-full bg-white/10" />

          <div className="relative">
            <div className="inline-flex items-center space-x-1.5 bg-white/20 backdrop-blur-sm rounded-full px-2.5 py-1">
              <Sparkles className="w-3 h-3 stroke-[2.5]" />
              <span className="text-[10px] font-black uppercase tracking-wider">
                Today&apos;s savings
              </span>
            </div>

            <p className="mt-3 text-[34px] leading-none font-black tracking-tight">
              Up to {topSaving}% off
            </p>
            <p className="mt-2 text-[13px] font-medium text-white/85 max-w-[16rem] leading-snug">
              Save ₹{totalSavings} across everything on offer — fresh produce, dairy and
              daily essentials, with fastest delivery across Anantnag.
            </p>
          </div>
        </motion.section>

        {/* Promo codes */}
        {offers.length > 0 && (
          <section className="mt-6">
            <h2 className="text-[15px] font-bold text-[#061838] tracking-tight px-1 mb-3 dark:text-content">
              Coupons for you
            </h2>
            <motion.div
              variants={stagger(0.06)}
              initial="hidden"
              animate="show"
              className="flex space-x-3 overflow-x-auto scrollbar-none pb-1.5 -mx-4 px-4 md:mx-0 md:px-0 md:grid md:grid-cols-3 md:space-x-0 md:gap-4"
            >
              {offers.map((offer) => (
                <motion.div
                  key={offer.id}
                  variants={scaleIn}
                  /* The solid navy is a floor, not decoration. `offer.gradient`
                     is a Tailwind class string stored with the offer, and an
                     offer edited in the admin console can carry arbitrary
                     values that were never in the build — Tailwind then emits
                     no gradient, the card goes transparent, and its white text
                     disappears against this warm background. A background-color
                     underneath survives that: the gradient is a
                     background-image and simply paints over it when present. */
                  className={`w-[248px] md:w-full shrink-0 rounded-[22px] p-4 text-white bg-[#0B1F3A] bg-gradient-to-br ${offer.gradient || ""} shadow-lg relative overflow-hidden`}
                >
                  <span className={`text-[9.5px] font-black uppercase tracking-widest ${offer.accent}`}>
                    {offer.badge}
                  </span>
                  <h3 className="mt-1.5 text-[15px] font-black leading-tight tracking-tight line-clamp-2 min-h-[38px]">
                    {offer.title}
                  </h3>
                  <p className="text-[11px] text-white/60 mt-1">{offer.expiresIn}</p>

                  {offer.promoCode && (
                    <button
                      type="button"
                      onClick={() => copyCode(offer.promoCode)}
                      className="mt-3.5 w-full flex items-center justify-between rounded-xl border border-dashed border-white/35 bg-white/10 px-3 py-2 active:scale-[0.98] transition-transform"
                    >
                      <span className="font-mono font-black text-[12.5px] tracking-wider">
                        {offer.promoCode}
                      </span>
                      {copiedCode === offer.promoCode ? (
                        <span className="flex items-center space-x-1 text-[10px] font-bold text-emerald-300">
                          <Check className="w-3 h-3 stroke-[3]" />
                          <span>Copied</span>
                        </span>
                      ) : (
                        <Copy className="w-3.5 h-3.5 text-white/70" />
                      )}
                    </button>
                  )}
                </motion.div>
              ))}
            </motion.div>
          </section>
        )}

        {/* Discounted products */}
        <section className="mt-7">
          <div className="flex items-center justify-between px-1 mb-3">
            <h2 className="text-[15px] font-bold text-[#061838] tracking-tight flex items-center space-x-1.5 dark:text-content">
              <Flame className="w-4 h-4 text-[#FF5B00]" />
              <span>Biggest savings</span>
            </h2>
            <Link href="/shop" className="text-[12px] font-semibold text-[#FF5B00]">
              Shop all
            </Link>
          </div>

          {dealProducts.length === 0 ? (
            <div className="rounded-2xl bg-white/70 backdrop-blur-md border border-white/60 p-8 text-center dark:bg-surface-raised/70">
              <Tag className="w-6 h-6 text-slate-300 mx-auto mb-2 dark:text-content-faint" />
              <p className="text-sm font-bold text-[#061838] dark:text-content">No offers running right now</p>
              <p className="text-xs text-slate-500 mt-1 dark:text-content-muted">
                New deals go live every morning — check back soon.
              </p>
            </div>
          ) : (
            /* Mount-based, not scroll-based: the catalogue arrives from a
               Firestore snapshot after first paint, which remounts every card.
               With whileInView the replacements came back at their `hidden`
               variant and the whole grid stayed invisible. */
            <motion.div
              key={dealProducts.length}
              variants={stagger(0.04)}
              initial="hidden"
              animate="show"
              className="grid grid-cols-2 md:grid-cols-4 gap-3"
            >
              {dealProducts.map((p) => (
                <motion.div key={p.id || p.barcode} variants={scaleIn}>
                  <ProductCard
                    product={p}
                    qty={qtyOf(p)}
                    onAdd={() => handleAddToCart(p)}
                    onUpdateQty={(id, delta) => handleUpdateQty(id, delta)}
                    onIncrement={() => handleUpdateQty(p.id || p.barcode, 1)}
                    onDecrement={() => handleUpdateQty(p.id || p.barcode, -1)}
                    onQuickView={() => setSelectedQuickProduct(p)}
                    onOpenQuickView={() => setSelectedQuickProduct(p)}
                  />
                </motion.div>
              ))}
            </motion.div>
          )}
        </section>
      </main>

      <QuickProductSheet
        product={selectedQuickProduct}
        isOpen={Boolean(selectedQuickProduct)}
        onClose={() => setSelectedQuickProduct(null)}
        cart={cart}
        onAddToCart={handleAddToCart}
        onUpdateQty={handleUpdateQty}
      />
    </div>
  );
}
