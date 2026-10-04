import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ChevronDown } from "lucide-react";
import SEO from "../components/SEO";
import ProductImage from "../components/ProductImage";
import { watchShopProducts } from "../lib/catalogueFile";
import { buildAisles, buildAisleGroups } from "../lib/shopAisles";
import { browseable } from "../lib/tobacco";
import { goBack } from "../lib/navigation";
import { useRouter } from "next/router";

/**
 * The shop's categories, a few at a time: five departments, each opening to
 * the handful of aisles inside it. (This page used to be one grid of every
 * aisle, which is a lot to take in on a phone.)
 */
export default function CategoriesPage() {
  const router = useRouter();
  const [products, setProducts] = useState([]);
  /* Which department is open. `undefined` until the shopper picks, so the
     first one starts open; `null` once they close everything. */
  const [openId, setOpenId] = useState(undefined);

  useEffect(() => watchShopProducts(setProducts), []);

  const groups = useMemo(() => buildAisleGroups(buildAisles(browseable(products))), [products]);
  const openGroup = openId === undefined ? groups[0]?.id : openId;

  return (
    <div className="min-h-screen bg-[#FFFDF5] pb-dock dark:bg-surface">
      <SEO
        title="All categories"
        description="Every aisle at DASHIT, Anantnag: dairy, bakery, snacks, drinks, staples, personal care, cleaning and more."
        canonical="/categories/"
      />
      <header className="sticky top-0 z-30 bg-[#FFFDF5]/95 backdrop-blur-md border-b border-slate-200/70 pt-[env(safe-area-inset-top,0px)] dark:bg-surface/95 dark:border-line">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => goBack(router, "/shop")}
            aria-label="Back"
            className="w-9 h-9 -ml-1 rounded-full flex items-center justify-center text-[#061838] hover:bg-slate-100 dark:text-content dark:hover:bg-surface-raised"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-[17px] font-bold tracking-tight text-[#061838] dark:text-content">Categories</h1>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 pt-4">
        {/* Until the products arrive there is only the always-present
            Vegetables shelf to group, so wait for them. */}
        {products.length === 0 || groups.length === 0 ? (
          <div className="space-y-3" aria-hidden="true">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-[72px] rounded-2xl bg-slate-100 dark:bg-surface-raised animate-pulse" />
            ))}
          </div>
        ) : (
          <ul className="space-y-3">
            {groups.map((group) => {
              const Icon = group.icon;
              const isOpen = openGroup === group.id;
              const panelId = `category-${group.id}`;
              return (
                <li
                  key={group.id}
                  className="rounded-2xl bg-white border border-slate-200/80 overflow-hidden dark:bg-surface-raised dark:border-line"
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenId(isOpen ? null : group.id)}
                    className="w-full min-h-[72px] flex items-center gap-3 px-3.5 py-3 text-left cursor-pointer focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#FF5B00]"
                  >
                    <span className="w-11 h-11 shrink-0 rounded-xl bg-slate-100 flex items-center justify-center text-[#061838] dark:bg-surface-muted dark:text-content">
                      <Icon className="w-5 h-5 stroke-[2]" />
                    </span>
                    <span className="min-w-0 grow">
                      <span className="block text-[15px] font-bold leading-tight text-[#061838] dark:text-content">
                        {group.label}
                      </span>
                      <span className="block mt-0.5 text-[12px] leading-snug text-slate-500 truncate dark:text-content-muted">
                        {group.aisles.map((a) => a.label).join(", ")}
                      </span>
                    </span>
                    <ChevronDown
                      className={`w-5 h-5 shrink-0 text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>

                  {isOpen && (
                    <ul
                      id={panelId}
                      className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 px-2.5 pb-3 pt-2.5 border-t border-slate-100 dark:border-line-soft"
                    >
                      {group.aisles.map((aisle) => {
                        const AisleIcon = aisle.icon;
                        return (
                          <li key={aisle.cat}>
                            <Link
                              href={`/shop/?cat=${encodeURIComponent(aisle.cat)}`}
                              className="group flex flex-col items-center text-center rounded-xl p-1.5 transition-colors hover:bg-slate-50 dark:hover:bg-surface-muted"
                            >
                              {aisle.cover ? (
                                <ProductImage
                                  src={aisle.cover}
                                  name={aisle.label}
                                  className="rounded-xl border border-slate-200/80 dark:border-line"
                                  imgClassName="p-[12%] object-contain transition-transform duration-300 group-hover:scale-105"
                                />
                              ) : (
                                <span className="w-full aspect-square rounded-xl border border-slate-200/80 bg-white flex items-center justify-center text-[#061838] dark:bg-surface-raised dark:border-line dark:text-content">
                                  <AisleIcon className="w-6 h-6 stroke-[1.8]" />
                                </span>
                              )}
                              <span className="mt-1.5 text-[12px] font-semibold leading-tight text-[#061838] dark:text-content line-clamp-2">
                                {aisle.label}
                              </span>
                              <span className="text-[11px] text-slate-500 dark:text-content-faint">
                                {aisle.count > 0 ? `${aisle.count} ${aisle.count === 1 ? "item" : "items"}` : "Arriving soon"}
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
