import { useState, useEffect, useMemo } from "react";
import Head from "next/head";
import Link from "next/link";
import { useRouter } from "next/router";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Heart,
  Star,
  ShieldCheck,
  Tag,
  Clock,
  Check,
  Truck,
  RotateCcw,
  Sparkles,
  Share2,
  Package,
  ChevronRight,
  Zap,
} from "lucide-react";
import ProductCardStepper from "../../components/ProductCardStepper";
import ProductCard from "../../components/ProductCard";
import SEO from "../../components/SEO";
import { ProductJsonLd, BreadcrumbJsonLd } from "../../components/JsonLd";
import { ALL_PRODUCTS } from "../../data/products";
import { isItemInWishlist, toggleWishlistItem } from "../../lib/wishlist";
import { hapticLight, hapticMedium, hapticCartAdd } from "../../lib/haptics";
import { goBack } from "../../lib/navigation";
import { useStoreDetails } from "../../lib/storeStatus";
import { watchProducts } from "../../lib/db";

export default function ProductDetailPage({ initialProduct }) {
  const router = useRouter();
  const { isOpen: isStoreOpen, closeReason } = useStoreDetails();
  const { id } = router.query;

  const [productsList, setProductsList] = useState(ALL_PRODUCTS);
  const [cart, setCart] = useState([]);
  const [isFav, setIsFav] = useState(false);
  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0);
  const [copiedLink, setCopiedLink] = useState(false);

  // Sync products list from custom storage and Firestore
  useEffect(() => {
    try {
      const custom = JSON.parse(localStorage.getItem("dashit_custom_products") || "[]");
      if (custom.length > 0) {
        const customIds = new Set(custom.map((c) => String(c.id || c.barcode)));
        setProductsList([...custom, ...ALL_PRODUCTS.filter((p) => !customIds.has(String(p.id || p.barcode)))]);
      }
    } catch (e) {}

    const unsub = watchProducts((liveList) => {
      if (liveList && liveList.length > 0) {
        setProductsList(liveList);
      }
    });
    return () => {
      if (typeof unsub === "function") unsub();
    };
  }, []);

  // Sync cart from localStorage
  useEffect(() => {
    const syncCart = () => {
      try {
        const saved = localStorage.getItem("dashit_cart");
        if (saved) setCart(JSON.parse(saved));
        else setCart([]);
      } catch (e) {
        setCart([]);
      }
    };
    syncCart();
    window.addEventListener("dashit_cart_updated", syncCart);
    return () => window.removeEventListener("dashit_cart_updated", syncCart);
  }, []);

  // Find product by id or barcode
  const product = useMemo(() => {
    if (initialProduct && (!id || String(id) === String(initialProduct.id))) {
      return initialProduct;
    }
    if (!id) return initialProduct || productsList[0] || ALL_PRODUCTS[0];
    const found = productsList.find(
      (p) => String(p.id) === String(id) || String(p.barcode) === String(id)
    );
    return (
      found ||
      ALL_PRODUCTS.find(
        (p) => String(p.id) === String(id) || String(p.barcode) === String(id)
      ) ||
      initialProduct ||
      ALL_PRODUCTS[0]
    );
  }, [id, productsList, initialProduct]);

  // Sync wishlist status
  useEffect(() => {
    if (product) {
      setIsFav(isItemInWishlist(product.id || product.barcode));
    }
  }, [product]);

  // Derive variants: use product.variants if defined, or generate smart realistic variants
  const variants = useMemo(() => {
    if (product?.variants && product.variants.length > 0) {
      return product.variants;
    }
    // Synthesize pack/type variants for single-unit items
    const basePrice = product?.price || 50;
    const baseOriginal = product?.originalPrice || Math.round(basePrice * 1.15);
    const baseUnit = product?.unit || "1 unit";

    return [
      {
        id: `${product.id}-std`,
        unit: baseUnit,
        price: basePrice,
        originalPrice: baseOriginal,
        type: "Standard Pack",
      },
      {
        id: `${product.id}-duo`,
        unit: `Pack of 2 (${baseUnit})`,
        price: Math.round(basePrice * 1.9),
        originalPrice: baseOriginal * 2,
        type: "Value Duo (Save 5%)",
      },
      {
        id: `${product.id}-bulk`,
        unit: `Pack of 4 (${baseUnit})`,
        price: Math.round(basePrice * 3.65),
        originalPrice: baseOriginal * 4,
        type: "Mega Saver (Save 10%)",
      },
    ];
  }, [product]);

  // Selected active variant
  const activeVariant = variants[selectedVariantIndex] || variants[0];

  // Similar products in same category
  const similarProducts = useMemo(() => {
    return ALL_PRODUCTS.filter(
      (p) =>
        p.id !== product.id &&
        (p.cat === product.cat || p.cat === "Dairy" || p.cat === "Snacks")
    ).slice(0, 4);
  }, [product]);

  // Unique cart item identifier for selected variant
  const cartItem = cart.find(
    (i) =>
      String(i.id) === String(product.id) &&
      (i.variantId === activeVariant.id || i.unit === activeVariant.unit)
  ) || cart.find((i) => String(i.id) === String(product.id));

  const currentQty = cartItem ? cartItem.qty : 0;

  const saveCart = (newCart) => {
    setCart(newCart);
    try {
      localStorage.setItem("dashit_cart", JSON.stringify(newCart));
      window.dispatchEvent(new Event("dashit_cart_updated"));
    } catch (e) {}
  };

  const handleAddToCart = () => {
    if (!isStoreOpen) {
      alert(`Store will be available: ${closeReason || "We will reopen shortly!"}`);
      return;
    }
    hapticCartAdd();
    const itemToAdd = {
      ...product,
      unit: activeVariant.unit,
      price: activeVariant.price,
      originalPrice: activeVariant.originalPrice,
      variantId: activeVariant.id,
      qty: 1,
    };

    const existingIdx = cart.findIndex(
      (i) =>
        String(i.id) === String(product.id) &&
        (i.variantId === activeVariant.id || i.unit === activeVariant.unit)
    );

    let updated;
    if (existingIdx > -1) {
      updated = [...cart];
      updated[existingIdx].qty += 1;
    } else {
      updated = [...cart, itemToAdd];
    }
    saveCart(updated);
  };

  const handleUpdateQty = (pId, delta) => {
    const existingIdx = cart.findIndex(
      (i) =>
        String(i.id) === String(product.id) &&
        (i.variantId === activeVariant.id || i.unit === activeVariant.unit)
    );

    if (existingIdx === -1) {
      if (delta > 0) handleAddToCart();
      return;
    }

    const newQty = cart[existingIdx].qty + delta;
    let updated;
    if (newQty <= 0) {
      updated = cart.filter((_, idx) => idx !== existingIdx);
    } else {
      updated = [...cart];
      updated[existingIdx].qty = newQty;
    }
    saveCart(updated);
  };

  const handleToggleFav = () => {
    const next = toggleWishlistItem(product);
    setIsFav(next);
  };

  const handleShare = async () => {
    hapticLight();
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: product.name,
          text: `Buy ${product.name} on DASHIT — fast grocery delivery in Anantnag!`,
          url: window.location.href,
        });
        return;
      } catch (e) {}
    }
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const discountPercent =
    activeVariant.originalPrice > activeVariant.price
      ? Math.round(
          ((activeVariant.originalPrice - activeVariant.price) /
            activeVariant.originalPrice) *
            100
        )
      : null;

  // Description copy customized per category
  const productDescription = useMemo(() => {
    switch (product.cat) {
      case "Dairy":
        return `Fresh and wholesome ${product.name}, sourced daily from trusted local dairies in Jammu & Kashmir. Pasteurized under strict hygiene standards to retain optimal calcium, protein, and rich creamy flavor. Perfect for daily family nutrition.`;
      case "Snacks":
        return `Crispy, flavorful, and freshly packed ${product.name}. Carefully prepared with premium quality ingredients and signature seasonings to give you that irresistible crunch in every bite. Ideal for tea time, parties, or movie nights.`;
      case "Grocery":
        return `Selected premium grade ${product.name} with consistent grain texture, rich aroma, and pure nutrition. Verified 100% genuine and packaged in tamper-proof seals to preserve natural freshness and authentic flavor.`;
      case "Bakery":
        return `Oven-fresh ${product.name} baked fresh each morning. Soft, aromatic, and made with finest flour and traditional recipes. Great paired with morning Kahwa, Kashmiri tea, or breakfast spreads.`;
      case "Drinks":
        return `Refreshing and invigorating ${product.name}. Served chilled from our temperature-controlled Anantnag fulfillment store to quench your thirst anytime of the day.`;
      default:
        return `High-quality ${product.name} selected and verified by DASHIT quality team. Delivered fresh to your doorstep across Anantnag.`;
    }
  }, [product]);

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-900 font-sans pb-36">
      <SEO
        title={`${product.name} — Buy Online in Anantnag`}
        description={`Order fresh ${product.name} (${product.unit}) online in Anantnag, Kashmir. Fastest 8-minute delivery from DASHIT. 100% genuine quality assured.`}
        canonical={`/product/${product.id}/`}
        ogImage={product.img}
        ogType="product"
        keywords={`${product.name}, buy ${product.name} online Anantnag, ${product.cat} delivery Kashmir, DASHIT 192101`}
      />
      <ProductJsonLd
        product={{ ...product, description: productDescription }}
        url={`https://dashit.co.in/product/${product.id}/`}
      />
      <BreadcrumbJsonLd
        items={[
          { name: "Home", url: "/" },
          { name: "Shop", url: "/shop/" },
          {
            name: product.cat || "Grocery",
            url: `/shop/?cat=${encodeURIComponent(product.cat || "All")}`,
          },
          { name: product.name, url: `/product/${product.id}/` },
        ]}
      />

      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-2.5 flex items-center justify-between shadow-2xs">
        <button
          type="button"
          onClick={() => goBack(router, "/shop")}
          className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-700 active:scale-90 transition-transform cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
        </button>

        <div className="text-center px-2">
          <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-slate-400 block">
            {product.cat || "Grocery"}
          </span>
          <h1 className="text-xs font-black text-slate-800 truncate max-w-[180px]">
            {product.name}
          </h1>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={handleShare}
            className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 active:scale-90 transition-all cursor-pointer relative"
          >
            <Share2 className="w-4 h-4 stroke-[2.3]" />
            {copiedLink && (
              <span className="absolute -bottom-6 right-0 bg-slate-900 text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                Copied!
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={handleToggleFav}
            className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 active:scale-90 transition-all cursor-pointer"
          >
            <Heart
              className={`w-4 h-4 ${
                isFav
                  ? "fill-rose-500 text-rose-500"
                  : "stroke-[2.3] text-slate-600"
              }`}
            />
          </button>
        </div>
      </header>

      <main className="max-w-md md:max-w-3xl mx-auto px-4 mt-3 space-y-3.5">
        {/* Product Image Stage */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs relative">
          <div className="relative w-full aspect-square max-h-72 flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-slate-50/70 to-white">
            <motion.img
              key={activeVariant.id || product.id}
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.25 }}
              src={product.img}
              alt={product.name}
              className="max-h-64 max-w-full object-contain drop-shadow-sm"
            />

            {/* Out of Stock overlay */}
            {product.stock !== undefined && Number(product.stock) <= 0 && (
              <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] flex items-center justify-center">
                <span className="bg-rose-600 text-white font-black text-xs uppercase tracking-wider px-3.5 py-1.5 rounded-xl shadow-md">
                  Currently Out of Stock
                </span>
              </div>
            )}

            {/* Low stock alert */}
            {product.stock !== undefined && Number(product.stock) > 0 && Number(product.stock) <= 5 && (
              <span className="absolute bottom-3 left-3 bg-amber-500 text-slate-950 font-black text-[10.5px] px-2.5 py-1 rounded-xl shadow-sm flex items-center space-x-1">
                <Zap className="w-3 h-3 fill-slate-950 text-slate-950 shrink-0" />
                <span>Only {product.stock} left in stock!</span>
              </span>
            )}

            {/* Discount pill */}
            {discountPercent && (!product.stock || Number(product.stock) > 0) && (
              <span className="absolute top-3 left-3 bg-[#FF5B00] text-white font-black text-xs px-2.5 py-1 rounded-xl shadow-xs">
                {discountPercent}% OFF
              </span>
            )}

            {/* Badge pill */}
            {product.badge && (
              <span className="absolute top-3 right-3 bg-[#061838] text-white font-black text-[10px] px-2.5 py-1 rounded-xl shadow-xs uppercase tracking-wider">
                {product.badge}
              </span>
            )}
          </div>

          {/* Delivery Promise Strip */}
          <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center space-x-2 text-[#061838]">
              <div className="w-7 h-7 rounded-full bg-orange-100/70 flex items-center justify-center text-[#FF5B00]">
                <Clock className="w-3.5 h-3.5 stroke-[2.8]" />
              </div>
              <div>
                <span className="text-xs font-black text-slate-900 block leading-tight">
                  Fast Delivery
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  Delivered from Anantnag Central Hub
                </span>
              </div>
            </div>

            <div className="flex items-center space-x-1 text-amber-500 bg-amber-50/80 border border-amber-200/70 px-2 py-1 rounded-xl">
              <Star className="w-3.5 h-3.5 fill-amber-400 stroke-amber-400" />
              <span className="text-xs font-black text-slate-900">
                {product.rating || "4.8"}
              </span>
              <span className="text-[10px] font-medium text-slate-400">
                ({product.ratingCount || "2.4k"})
              </span>
            </div>
          </div>
        </div>

        {/* Product Title & Active Price Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-2">
          <div className="space-y-1">
            <span className="text-[10.5px] font-extrabold text-[#FF5B00] uppercase tracking-wider">
              {product.cat}
            </span>
            <h2 className="text-lg font-black text-slate-900 leading-snug tracking-tight">
              {product.name}
            </h2>
          </div>

          {/* Active Price Display */}
          <div className="pt-1 flex items-baseline space-x-2.5">
            <span className="text-2xl font-black text-slate-900 font-mono tracking-tight">
              ₹{activeVariant.price}
            </span>
            {activeVariant.originalPrice > activeVariant.price && (
              <span className="text-sm font-semibold text-slate-400 line-through font-mono">
                MRP ₹{activeVariant.originalPrice}
              </span>
            )}
            {discountPercent && (
              <span className="text-xs font-extrabold text-[#FF5B00] bg-orange-50 border border-orange-200/70 px-2 py-0.5 rounded-lg">
                Save ₹{activeVariant.originalPrice - activeVariant.price}
              </span>
            )}
          </div>
          <p className="text-[10.5px] text-slate-400 font-medium">
            (Inclusive of all taxes)
          </p>
        </div>

        {/* VARIANT / TYPE SELECTOR (Price Variations) */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
              Select Size &amp; Pack
            </h3>
            <span className="text-[11px] font-bold text-[#FF5B00]">
              {variants.length} options available
            </span>
          </div>

          {/* Variant Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {variants.map((v, idx) => {
              const isSelected = selectedVariantIndex === idx;
              const vDiscount =
                v.originalPrice > v.price
                  ? Math.round(((v.originalPrice - v.price) / v.originalPrice) * 100)
                  : null;

              return (
                <button
                  key={v.id || idx}
                  type="button"
                  onClick={() => {
                    hapticLight();
                    setSelectedVariantIndex(idx);
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all relative flex flex-col justify-between cursor-pointer ${
                    isSelected
                      ? "bg-orange-50/50 border-[#FF5B00] ring-2 ring-[#FF5B00]/30 shadow-xs"
                      : "bg-slate-50/60 border-slate-200 hover:border-slate-300 hover:bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-slate-900">
                      {v.unit}
                    </span>
                    {isSelected ? (
                      <div className="w-5 h-5 rounded-full bg-[#FF5B00] text-white flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-full border border-slate-300 shrink-0" />
                    )}
                  </div>

                  {v.type && (
                    <span className="text-[10px] font-semibold text-slate-500 mt-0.5">
                      {v.type}
                    </span>
                  )}

                  <div className="mt-2 flex items-baseline space-x-1.5">
                    <span className="text-sm font-black text-slate-900 font-mono">
                      ₹{v.price}
                    </span>
                    {v.originalPrice > v.price && (
                      <span className="text-[11px] text-slate-400 line-through font-mono">
                        ₹{v.originalPrice}
                      </span>
                    )}
                    {vDiscount && (
                      <span className="text-[9.5px] font-black text-emerald-600 bg-emerald-50 px-1 py-0.2 rounded">
                        {vDiscount}% OFF
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Details & Specifications */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/90 shadow-2xs space-y-4">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">
            Product Information
          </h3>

          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-800">Description</h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              {productDescription}
            </p>
          </div>

          {/* Specifications Table */}
          <div className="pt-2 border-t border-slate-100 divide-y divide-slate-100 text-xs">
            <div className="py-2 flex justify-between">
              <span className="text-slate-400 font-semibold">Category</span>
              <span className="text-slate-900 font-bold">{product.cat}</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-slate-400 font-semibold">Selected Pack</span>
              <span className="text-slate-900 font-bold">{activeVariant.unit}</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-slate-400 font-semibold">Origin</span>
              <span className="text-slate-900 font-bold">Kashmir, India</span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-slate-400 font-semibold">Shelf Life</span>
              <span className="text-slate-900 font-bold">
                {product.cat === "Dairy" || product.cat === "Bakery"
                  ? "Fresh (Best within 3-5 days)"
                  : "6 Months from packaging"}
              </span>
            </div>
            <div className="py-2 flex justify-between">
              <span className="text-slate-400 font-semibold">FSSAI Certified</span>
              <span className="text-emerald-700 font-bold flex items-center space-x-1">
                <ShieldCheck className="w-3.5 h-3.5 inline" />
                <span>100% Quality Assured</span>
              </span>
            </div>
          </div>
        </div>

        {/* Why Buy From DASHIT Assurance */}
        <div className="bg-white rounded-3xl p-4.5 border border-orange-200/80 shadow-2xs space-y-3">
          <div className="flex items-center space-x-2 text-[#FF5B00]">
            <Sparkles className="w-4 h-4" />
            <span className="text-xs font-black uppercase tracking-wider text-orange-950">
              Why shop with DASHIT
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2 bg-white/80 rounded-2xl border border-orange-100">
              <Truck className="w-5 h-5 text-[#FF5B00] mx-auto mb-1" />
              <span className="text-[10px] font-black text-slate-800 block">Fast Delivery</span>
              <span className="text-[9px] text-slate-500 block">Express dispatch</span>
            </div>

            <div className="p-2 bg-white/80 rounded-2xl border border-orange-100">
              <ShieldCheck className="w-5 h-5 text-emerald-600 mx-auto mb-1" />
              <span className="text-[10px] font-black text-slate-800 block">100% Original</span>
              <span className="text-[9px] text-slate-500 block">Verified stocks</span>
            </div>

            <div className="p-2 bg-white/80 rounded-2xl border border-orange-100">
              <RotateCcw className="w-5 h-5 text-blue-600 mx-auto mb-1" />
              <span className="text-[10px] font-black text-slate-800 block">Instant Return</span>
              <span className="text-[9px] text-slate-500 block">Doorstep pickup</span>
            </div>
          </div>
        </div>

        {/* Similar Products */}
        {similarProducts.length > 0 && (
          <div className="pt-2 space-y-3">
            <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider px-1">
              You Might Also Need
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {similarProducts.map((sp) => (
                <ProductCard
                  key={sp.id}
                  product={sp}
                  qty={cart.find((i) => String(i.id) === String(sp.id))?.qty || 0}
                  onAdd={() => {
                    hapticCartAdd();
                    saveCart([...cart, { ...sp, qty: 1 }]);
                  }}
                  onIncrement={() => {
                    const idx = cart.findIndex((i) => String(i.id) === String(sp.id));
                    if (idx > -1) {
                      const updated = [...cart];
                      updated[idx].qty += 1;
                      saveCart(updated);
                    }
                  }}
                  onDecrement={() => {
                    const idx = cart.findIndex((i) => String(i.id) === String(sp.id));
                    if (idx > -1) {
                      const newQty = cart[idx].qty - 1;
                      if (newQty <= 0) {
                        saveCart(cart.filter((_, i) => i !== idx));
                      } else {
                        const updated = [...cart];
                        updated[idx].qty = newQty;
                        saveCart(updated);
                      }
                    }
                  }}
                />
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Sticky Bottom Purchase Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 p-4 pb-[max(16px,calc(env(safe-area-inset-bottom,0px)+12px))] shadow-[0_-8px_24px_rgba(0,0,0,0.06)] z-40">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="min-w-0 pr-3">
            <span className="text-[10px] font-bold text-slate-400 block truncate">
              {activeVariant.unit}
            </span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-lg font-black text-slate-900 font-mono">
                ₹{activeVariant.price}
              </span>
              {activeVariant.originalPrice > activeVariant.price && (
                <span className="text-xs text-slate-400 line-through font-mono">
                  ₹{activeVariant.originalPrice}
                </span>
              )}
            </div>
          </div>

          {/* Stepper with selected variant */}
          <div className="w-36 shrink-0">
            <ProductCardStepper
              product={{
                ...product,
                unit: activeVariant.unit,
                price: activeVariant.price,
                originalPrice: activeVariant.originalPrice,
              }}
              qty={currentQty}
              onAdd={handleAddToCart}
              onUpdateQty={handleUpdateQty}
              onIncrement={() => handleUpdateQty(product.id, 1)}
              onDecrement={() => handleUpdateQty(product.id, -1)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export async function getStaticPaths() {
  const paths = ALL_PRODUCTS.map((prod) => ({
    params: { id: String(prod.id) },
  }));

  return {
    paths,
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const targetId = String(params?.id || "");
  const product =
    ALL_PRODUCTS.find(
      (p) => String(p.id) === targetId || String(p.barcode) === targetId
    ) || ALL_PRODUCTS[0];

  return {
    props: {
      initialProduct: product || null,
    },
  };
}

