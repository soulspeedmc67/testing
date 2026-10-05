import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { ArrowLeft, Search, ShieldAlert } from "lucide-react";
import SEO from "../components/SEO";
import ProductCard from "../components/ProductCard";
import QuickProductSheet from "../components/QuickProductSheet";
import { watchShopProducts, isSoldOut } from "../lib/catalogueFile";
import { hasConfirmedAge } from "../lib/ageGate";
import { isTobaccoSectionEnabled, tobaccoCatalogue } from "../lib/tobacco";
import { useAgeGate } from "../context/AgeGateContext";
import { hapticCartAdd } from "../lib/haptics";
import { goBack } from "../lib/navigation";

/**
 * The tobacco section. Reached from the search banner's "View items", only
 * after the declaration sheet — and a deep link here asks for it too. Until
 * the shopper confirms, not one product is rendered.
 */
export default function TobaccoPage() {
  const router = useRouter();
  const { requestTobaccoAccess } = useAgeGate();
  // checking → locked | open | unavailable. Decided after mount: both the
  // declaration (localStorage) and the platform switch are client-only.
  const [access, setAccess] = useState("checking");
  const [productsList, setProductsList] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedQuickProduct, setSelectedQuickProduct] = useState(null);

  const askForDeclaration = () => {
    requestTobaccoAccess(
      () => setAccess("open"),
      () => goBack(router, "/search")
    );
  };

  useEffect(() => {
    if (!isTobaccoSectionEnabled()) {
      setAccess("unavailable");
      return;
    }
    if (hasConfirmedAge()) {
      setAccess("open");
      return;
    }
    setAccess("locked");
    askForDeclaration();
    // Runs once on entry; the sheet itself owns what happens next.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const syncCart = () => {
      try {
        const saved = localStorage.getItem("dashit_cart");
        setCart(saved ? JSON.parse(saved) : []);
      } catch (e) {}
    };
    syncCart();
    window.addEventListener("dashit_cart_updated", syncCart);
    return () => window.removeEventListener("dashit_cart_updated", syncCart);
  }, []);

  // The shop's catalogue file, like every other shop page (no Firestore reads).
  useEffect(() => watchShopProducts(setProductsList), []);

  // In stock first; sold-out items never lead a list.
  const items = useMemo(() => {
    const all = tobaccoCatalogue(productsList);
    return [...all.filter((p) => !isSoldOut(p)), ...all.filter(isSoldOut)];
  }, [productsList]);

  const saveCart = (newCart) => {
    setCart(newCart);
    try {
      localStorage.setItem("dashit_cart", JSON.stringify(newCart));
      window.dispatchEvent(new Event("dashit_cart_updated"));
    } catch (e) {}
  };

  const handleAddToCart = (product) => {
    // A closed store still fills carts; checkout is where ordering waits.
    hapticCartAdd();
    const pId = String(product.id || product.barcode);
    const existing = cart.find((i) => String(i.id || i.barcode) === pId);
    saveCart(
      existing
        ? cart.map((i) => (String(i.id || i.barcode) === pId ? { ...i, qty: i.qty + 1 } : i))
        : [...cart, { ...product, qty: 1 }]
    );
  };

  const handleUpdateQty = (productId, delta) => {
    const pId = String(productId);
    const item = cart.find((i) => String(i.id || i.barcode) === pId);
    if (!item) return;
    const newQty = item.qty + delta;
    saveCart(
      newQty <= 0
        ? cart.filter((i) => String(i.id || i.barcode) !== pId)
        : cart.map((i) => (String(i.id || i.barcode) === pId ? { ...i, qty: newQty } : i))
    );
  };

  const qtyOf = (p) => cart.find((i) => String(i.id || i.barcode) === String(p.id || p.barcode))?.qty || 0;

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-900 font-sans pb-dock dark:bg-surface dark:text-content">
      <SEO
        title="Tobacco"
        description="Age-restricted section. Available only to customers aged 18 and above."
        canonical="/tobacco/"
        noindex={true}
      />

      <header className="sticky top-0 z-30 bg-white px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-2.5 border-b border-slate-200/90 shadow-2xs dark:bg-surface-raised dark:border-line/90">
        <div className="max-w-md md:max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3 min-w-0">
            <button
              type="button"
              onClick={() => goBack(router, "/search")}
              aria-label="Back"
              className="w-10 h-10 shrink-0 rounded-full border border-slate-200 flex items-center justify-center text-slate-700 active:scale-95 transition-transform dark:border-line dark:text-content-secondary"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
            <div className="min-w-0">
              <h1 className="text-base font-black text-slate-900 leading-tight truncate dark:text-content">
                Cigarettes &amp; Tobacco
              </h1>
              <span className="text-[11px] font-semibold text-slate-500 dark:text-content-muted">
                {access === "open" ? `${items.length} items · 18+ only` : "18+ only"}
              </span>
            </div>
          </div>
          <Link
            href="/search"
            aria-label="Search"
            className="w-10 h-10 shrink-0 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 active:scale-95 transition-transform dark:bg-surface-muted dark:text-content-secondary dark:border dark:border-line"
          >
            <Search className="w-4 h-4 stroke-[2.5]" />
          </Link>
        </div>
      </header>

      <main className="max-w-md md:max-w-4xl mx-auto px-4 pt-3 space-y-3">
        {/* Statutory point-of-sale warning (COTPA 2003 §6) */}
        <div className="flex items-start gap-2.5 rounded-2xl bg-red-50 border border-red-100 px-3.5 py-3 dark:bg-red-950/30 dark:border-red-900/40">
          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0 text-red-600 dark:text-red-400" aria-hidden="true" />
          <p className="text-[12px] leading-snug font-semibold text-red-900 dark:text-red-200">
            Tobacco products are injurious to health. Sale to anyone under 18 is a punishable offence, and our rider
            checks photo ID at the door.
          </p>
        </div>

        {access === "open" &&
          (items.length === 0 ? (
            <div className="text-center py-16 px-4">
              <h3 className="font-extrabold text-sm text-slate-800 dark:text-content">Nothing in stock right now</h3>
              <p className="text-xs text-slate-500 mt-1 dark:text-content-muted">Check back shortly.</p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5"
            >
              {items.map((p) => {
                const pId = String(p.id || p.barcode);
                return (
                  <ProductCard
                    key={pId}
                    product={p}
                    qty={qtyOf(p)}
                    onAdd={() => handleAddToCart(p)}
                    onUpdateQty={(id, delta) => handleUpdateQty(id, delta)}
                    onOpenQuickView={() => setSelectedQuickProduct(p)}
                  />
                );
              })}
            </motion.div>
          ))}

        {access === "locked" && (
          <div className="text-center py-14 px-6 space-y-3">
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-content">Confirm to view these products</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto dark:text-content-muted">
              This section is only for customers aged 18 and above.
            </p>
            <button
              type="button"
              onClick={askForDeclaration}
              className="h-11 px-5 rounded-2xl bg-[#FF5B00] text-white font-extrabold text-sm active:scale-95 transition-transform cursor-pointer"
            >
              Review and confirm
            </button>
          </div>
        )}

        {access === "unavailable" && (
          <div className="text-center py-14 px-6 space-y-3">
            <h3 className="font-extrabold text-sm text-slate-800 dark:text-content">Not available in this app</h3>
            <p className="text-xs text-slate-500 max-w-xs mx-auto dark:text-content-muted">
              Tobacco products can&apos;t be ordered here.
            </p>
            <Link
              href="/shop"
              className="inline-flex h-11 px-5 items-center rounded-2xl bg-[#FF5B00] text-white font-extrabold text-sm"
            >
              Back to shop
            </Link>
          </div>
        )}
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
