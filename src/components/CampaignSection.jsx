import { useState } from "react";
import Link from "next/link";
import { Heart } from "lucide-react";
import ProductCardStepper from "./ProductCardStepper";

const CAMPAIGN_CATEGORIES = [
  { title: "Flowers, Cards & Mugs", img: "https://images.unsplash.com/photo-1513151233558-d860c5398176?w=200&auto=format&fit=crop&q=80", bg: "bg-rose-100/80" },
  { title: "Pens & Stationery", img: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=200&auto=format&fit=crop&q=80", bg: "bg-amber-100/80" },
  { title: "Chocolates & Cakes", img: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=200&auto=format&fit=crop&q=80", bg: "bg-orange-100/80" },
];

const CAMPAIGN_PRODUCTS = [
  { id: 101, name: "FlowerAura - Yellow Sunflower Mini Bouquet", unit: "1 Stem", price: 199, originalPrice: 499, time: "21 mins", img: "https://images.unsplash.com/photo-1563241527-3004b7be0ffd?w=300&auto=format&fit=crop&q=80" },
  { id: 102, name: "FlowerAura - Blue 5 Orchids Bouquet", unit: "5 Stems", price: 549, originalPrice: 999, time: "21 mins", img: "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?w=300&auto=format&fit=crop&q=80" },
  { id: 103, name: "Classmate Ball Pen Gift Pack for Teacher", unit: "5 pcs", price: 50, originalPrice: 60, time: "21 mins", img: "https://images.unsplash.com/photo-1583485088034-697b5bc54ccd?w=300&auto=format&fit=crop&q=80" },
  { id: 104, name: "Party Propz Coffee Mug - World's Best Teacher", unit: "1 pc", price: 169, originalPrice: 499, time: "21 mins", img: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&auto=format&fit=crop&q=80" }
];

export default function CampaignSection({ onAddToCart, onUpdateQty, cart }) {
  const [favorites, setFavorites] = useState({});

  const toggleFav = (id) => {
    setFavorites((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  return (
    <div className="bg-[#fef3c7]/60 rounded-3xl p-4 space-y-4 border border-amber-200/60 shadow-sm overflow-hidden">
      {/* Campaign Category Cards Grid */}
      <div className="grid grid-cols-3 gap-2.5">
        {CAMPAIGN_CATEGORIES.map((c, idx) => (
          <div
            key={idx}
            className={`${c.bg} p-2.5 rounded-2xl flex flex-col justify-between h-28 border border-white/60 shadow-sm cursor-pointer hover:shadow-md transition-all active:scale-95`}
          >
            <span className="text-[11px] font-extrabold text-slate-900 leading-tight">{c.title}</span>
            <img src={c.img} alt={c.title} className="w-14 h-14 object-contain mx-auto rounded-lg" />
          </div>
        ))}
      </div>

      {/* Organic Handwritten Campaign Heading */}
      <div className="text-center pt-2 pb-1">
        <h2 className="font-handwritten text-3xl text-orange-800 tracking-wide font-bold">
          To Your Teacher, With Love
        </h2>
        <div className="w-16 h-0.5 bg-orange-700/40 rounded-full mx-auto mt-0.5" />
      </div>

      {/* Campaign Horizontal Product Rail */}
      <div className="flex space-x-3 overflow-x-auto scrollbar-none pb-2">
        {CAMPAIGN_PRODUCTS.map((p) => {
          const inCart = cart.find((i) => i.id === p.id);
          const isFav = favorites[p.id];

          return (
            <div
              key={p.id}
              className="w-[145px] shrink-0 bg-white rounded-3xl p-2.5 flex flex-col justify-between border border-slate-200 shadow-sm hover:shadow-md transition-all relative"
            >
              {/* Product Image Box */}
              <div className="relative bg-slate-50 rounded-2xl p-2 flex items-center justify-center h-28 overflow-hidden mb-1">
                <button
                  onClick={() => toggleFav(p.id)}
                  className="absolute top-1.5 right-1.5 p-1 bg-white/90 rounded-full shadow-sm text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <Heart className={`w-3.5 h-3.5 ${isFav ? "fill-rose-500 text-rose-500" : ""}`} />
                </button>

                <img src={p.img} alt={p.name} className="h-20 w-20 object-contain rounded-lg" />

                {/* Pagination Dots */}
                <div className="absolute bottom-1 flex space-x-1">
                  <div className="w-1 h-1 bg-slate-900 rounded-full" />
                  <div className="w-1 h-1 bg-slate-300 rounded-full" />
                  <div className="w-1 h-1 bg-slate-300 rounded-full" />
                </div>
              </div>

              {/* Unit & Title */}
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold text-slate-400">{p.unit}</span>
                <h4 className="font-bold text-[11px] text-slate-900 leading-snug line-clamp-2">{p.name}</h4>
              </div>

              {/* Price & Morphing Stepper */}
              <div className="mt-2 flex items-center justify-between pt-1 border-t border-slate-100">
                <div>
                  <span className="text-xs font-black text-slate-900">₹{p.price}</span>
                  <span className="text-[9px] text-slate-400 line-through block">₹{p.originalPrice}</span>
                </div>

                <div className="w-16">
                  <ProductCardStepper
                    product={p}
                    qty={inCart ? inCart.qty : 0}
                    onAdd={onAddToCart}
                    onUpdateQty={onUpdateQty}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
