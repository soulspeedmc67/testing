import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import SEO from "../components/SEO";
import ProductImage from "../components/ProductImage";
import { watchShopProducts } from "../lib/catalogueFile";
import { buildAisles } from "../lib/shopAisles";
import { browseable } from "../lib/tobacco";
import { goBack } from "../lib/navigation";
import { useRouter } from "next/router";

/** Every aisle in the shop, from the shelves products are really on. */
export default function CategoriesPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);

  useEffect(() => watchShopProducts(setProducts), []);

  const aisles = useMemo(() => buildAisles(browseable(products)), [products]);

  return (
    <div className="min-h-screen bg-[#FFFDF5] pb-dock dark:bg-surface">
      <SEO
        title="All categories"
        description="Every aisle at DASHIT, Anantnag: dairy, bakery, snacks, drinks, staples, personal care, cleaning and more."
        canonical="/categories/"
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
          <h1 className="text-[17px] font-bold tracking-tight text-[#061838] dark:text-content">All categories</h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 pt-5">
        {aisles.length === 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3" aria-hidden="true">
            {[...Array(12)].map((_, i) => (
              <div key={i} className="aspect-[4/5] rounded-2xl bg-slate-100 dark:bg-surface-raised animate-pulse" />
            ))}
          </div>
        ) : (
          <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {aisles.map((aisle) => {
              const Icon = aisle.icon;
              return (
                <li key={aisle.cat}>
                  <Link
                    href={`/shop/?cat=${encodeURIComponent(aisle.cat)}`}
                    className="group flex flex-col items-center text-center rounded-2xl p-2 transition-colors hover:bg-white dark:hover:bg-surface-raised"
                  >
                    {aisle.cover ? (
                      <ProductImage
                        src={aisle.cover}
                        name={aisle.label}
                        className="rounded-2xl border border-slate-200/80 bg-white shadow-2xs dark:border-line"
                        imgClassName="p-[10%] object-contain transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <span className="w-full aspect-square rounded-2xl border border-slate-200/80 bg-white flex items-center justify-center text-[#061838] dark:bg-surface-raised dark:border-line dark:text-content">
                        <Icon className="w-7 h-7" />
                      </span>
                    )}
                    <span className="mt-2 text-[12.5px] font-semibold leading-tight text-[#061838] dark:text-content line-clamp-2">
                      {aisle.label}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-content-faint">{aisle.count} items</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
