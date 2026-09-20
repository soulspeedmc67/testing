import { useState, useEffect } from "react";
import { goBack } from "../lib/navigation";
import Link from "next/link";
import { useRouter } from "next/router";
import { ChevronLeft, Heart, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import SEO from "../components/SEO";
import { getWishlist, removeFromWishlist } from "../lib/wishlist";
import { hapticLight, hapticCartAdd } from "../lib/haptics";

export default function WishlistPage() {
  const router = useRouter();
  const [wishlist, setWishlist] = useState([]);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const loadData = () => {
      setWishlist(getWishlist());
      try {
        const savedCart = localStorage.getItem("dashit_cart");
        if (savedCart) setCart(JSON.parse(savedCart));
      } catch (e) {}
    };

    loadData();
    window.addEventListener("dashit_wishlist_updated", loadData);
    window.addEventListener("dashit_cart_updated", loadData);
    return () => {
      window.removeEventListener("dashit_wishlist_updated", loadData);
      window.removeEventListener("dashit_cart_updated", loadData);
    };
  }, []);

  const handleAddToCart = (product) => {
    hapticCartAdd();
    const existingIndex = cart.findIndex(
      (item) => String(item.id || item.barcode) === String(product.id || product.barcode)
    );
    let newCart;
    if (existingIndex > -1) {
      newCart = [...cart];
      newCart[existingIndex].qty += 1;
    } else {
      newCart = [...cart, { ...product, qty: 1 }];
    }
    setCart(newCart);
    localStorage.setItem("dashit_cart", JSON.stringify(newCart));
    window.dispatchEvent(new Event("dashit_cart_updated"));
  };

  const handleRemove = (id) => {
    removeFromWishlist(id);
  };

  return (
    <div className="min-h-screen bg-[#F7F8FA] text-slate-900 font-sans pb-dock dark:bg-surface dark:text-content">
      <SEO title="My Wishlist" noindex={true} />
      {/* Top Header */}
      <header className="bg-white px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3 flex items-center justify-between sticky top-0 z-30 border-b border-slate-100 shadow-xs dark:bg-surface dark:border-line-soft">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => goBack(router)}
            className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-700 active:scale-95 transition-transform dark:border-line dark:text-content-secondary"
          >
            <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
          </button>
          <div>
            <h1 className="text-base font-extrabold text-slate-900 dark:text-content">
              Your Wishlist
            </h1>
            <span className="text-[11px] font-semibold text-slate-400 dark:text-content-faint">
              {wishlist.length} {wishlist.length === 1 ? "item" : "items"} saved
            </span>
          </div>
        </div>

        {wishlist.length > 0 && (
          <button
            onClick={() => {
              if (confirm("Clear all items from wishlist?")) {
                localStorage.removeItem("dashit_wishlist");
                setWishlist([]);
                window.dispatchEvent(new Event("dashit_wishlist_updated"));
              }
            }}
            className="text-xs font-bold text-rose-600 hover:text-rose-700"
          >
            Clear All
          </button>
        )}
      </header>

      <main className="max-w-md mx-auto px-4 pt-4">
        {wishlist.length === 0 ? (
          <div className="text-center py-20 px-4 space-y-4">
            <div className="w-20 h-20 rounded-full bg-rose-50 border border-rose-100 flex items-center justify-center mx-auto text-rose-500 shadow-xs">
              <Heart className="w-10 h-10 fill-rose-500 text-rose-500" />
            </div>
            <div className="space-y-1">
              <h2 className="text-base font-extrabold text-slate-900 dark:text-content">
                Your wishlist is empty
              </h2>
              <p className="text-xs text-slate-500 max-w-xs mx-auto dark:text-content-muted">
                Save your favorite daily essentials and snacks so you can add them to your cart in 1 tap anytime!
              </p>
            </div>
            <Link
              href="/shop"
              className="inline-flex items-center space-x-2 bg-[#FF5B00] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-md shadow-orange-700/20 active:scale-95 transition-transform"
            >
              <span>Explore Storefront</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {wishlist.map((item) => (
              <div
                key={item.id || item.barcode}
                className="bg-white rounded-2xl border border-slate-200/90 p-3 flex flex-col justify-between shadow-xs relative group dark:bg-surface-raised dark:border-line/90"
              >
                {/* Remove button */}
                <button
                  type="button"
                  onClick={() => handleRemove(item.id || item.barcode)}
                  className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-100 text-rose-500 hover:bg-rose-50 active:scale-90 transition-all z-10 dark:bg-surface-muted"
                  title="Remove from wishlist"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>

                {/* Product Image */}
                <div className="relative w-full aspect-square bg-slate-50 rounded-xl overflow-hidden flex items-center justify-center p-2 mb-2 dark:bg-surface-raised">
                  <img
                    src={item.img}
                    alt={item.name}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>

                {/* Details */}
                <div className="space-y-1 mb-3">
                  <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider dark:text-content-faint">
                    {item.brand || "Fresh"}
                  </span>
                  <h3 className="font-extrabold text-xs text-slate-900 leading-snug line-clamp-2 dark:text-content">
                    {item.name}
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-500 block dark:text-content-muted">
                    {item.unit || "1 unit"}
                  </span>
                </div>

                {/* Price & Add */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-line-soft">
                  <div>
                    <span className="font-black text-sm text-slate-900 font-mono dark:text-content">
                      ₹{item.price}
                    </span>
                    {item.originalPrice && item.originalPrice > item.price && (
                      <span className="text-[10px] text-slate-400 line-through ml-1 font-mono dark:text-content-faint">
                        ₹{item.originalPrice}
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAddToCart(item)}
                    className="bg-[#FF5B00] hover:bg-[#0b721b] text-white px-3 py-1.5 rounded-xl font-extrabold text-xs shadow-xs active:scale-95 transition-transform"
                  >
                    ADD
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
