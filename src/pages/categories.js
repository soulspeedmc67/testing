import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Search, Utensils, Cookie, GlassWater, Croissant, Sparkles, Package } from "lucide-react";
import BottomNav from "../components/BottomNav";

const ALL_CATEGORIES = [
  { id: "Grocery", name: "Grocery & Kitchen", count: "120+ Items", img: "https://images.unsplash.com/photo-1542838132-92c53300491e?w=200&auto=format&fit=crop&q=80", bg: "bg-emerald-50 border-emerald-200" },
  { id: "Snacks", name: "Snacks & Munchies", count: "85+ Items", img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=200&auto=format&fit=crop&q=80", bg: "bg-amber-50 border-amber-200" },
  { id: "Drinks", name: "Cold Drinks & Juices", count: "64+ Items", img: "https://images.unsplash.com/photo-1527960471264-932f39eb5846?w=200&auto=format&fit=crop&q=80", bg: "bg-sky-50 border-sky-200" },
  { id: "Bakery", name: "Bakery & Biscuits", count: "45+ Items", img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=200&auto=format&fit=crop&q=80", bg: "bg-orange-50 border-orange-200" },
  { id: "Dairy", name: "Dairy, Bread & Eggs", count: "50+ Items", img: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200&auto=format&fit=crop&q=80", bg: "bg-purple-50 border-purple-200" },
  { id: "Chocolates", name: "Sweets & Chocolates", count: "40+ Items", img: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=200&auto=format&fit=crop&q=80", bg: "bg-rose-50 border-rose-200" }
];

export default function CategoriesPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#061838] px-4 py-4 text-white shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link href="/" className="p-1 rounded-full text-slate-300 hover:text-white">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="font-extrabold text-base text-white">All Categories</h1>
          </div>
          <Link href="/search" className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20">
            <Search className="w-4 h-4" />
          </Link>
        </div>
      </header>

      {/* Main Grid */}
      <main className="max-w-md mx-auto px-4 mt-4 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          {ALL_CATEGORIES.map((cat) => (
            <Link
              key={cat.id}
              href={`/?cat=${cat.id}`}
              className={`${cat.bg} border rounded-3xl p-4 flex flex-col justify-between h-40 shadow-sm hover:shadow-md transition-all active:scale-95 group`}
            >
              <div>
                <h3 className="font-black text-sm text-slate-900 group-hover:text-[#0c831f] transition-colors">{cat.name}</h3>
                <span className="text-[10px] font-extrabold text-slate-500">{cat.count}</span>
              </div>
              <img src={cat.img} alt={cat.name} className="w-20 h-20 object-contain mx-auto transform group-hover:scale-110 transition-transform" />
            </Link>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
