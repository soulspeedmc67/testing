import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";

export default function PromoBanner({ onSelectPromo }) {
  return (
    <div className="w-full bg-gradient-to-b from-[#FFFDF5] to-[#F0FDFA] rounded-3xl p-3.5 border border-teal-100/80 shadow-sm space-y-3">
      {/* Sponsor/Branding Row */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center space-x-1 text-[10px] font-black uppercase tracking-wider text-teal-800">
          <Sparkles className="w-3 h-3 stroke-[2.5] text-teal-600" />
          <span>Snacks & Munchies Hub · Powered by Darkstore</span>
        </div>
        <span className="text-[10px] font-extrabold text-teal-700 bg-teal-100/70 px-2 py-0.5 rounded-full">
          Up to 40% OFF
        </span>
      </div>

      {/* Multi-Tile Grid */}
      <div className="grid grid-cols-3 gap-2">
        {/* Large Featured Left Card */}
        <div
          onClick={() => onSelectPromo && onSelectPromo("Snacks")}
          className="col-span-1 bg-gradient-to-b from-sky-200 to-sky-400 rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer hover:shadow-md transition-all active:scale-[0.98] text-white relative overflow-hidden"
        >
          <div>
            <h3 className="font-black text-xs leading-tight drop-shadow-sm">
              Chips & Crisps
            </h3>
            <div className="mt-1 inline-flex items-center space-x-1 bg-amber-400 text-slate-950 font-black text-[10px] px-1.5 py-0.5 rounded-md shadow-sm">
              <span>₹40</span>
              <span className="text-[8px] line-through text-slate-700">₹60</span>
            </div>
            <p className="text-[9px] font-bold text-sky-100 mt-1 line-clamp-1">
              Snack Break
            </p>
          </div>

          <div className="mt-2 w-full h-24 flex items-center justify-center">
            <img
              src="https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=200&auto=format&fit=crop&q=80"
              alt="Chips & Namkeen"
              className="max-h-full max-w-full object-contain drop-shadow-md rounded-lg"
            />
          </div>
        </div>

        {/* 4 Small Sub-Tiles */}
        <div className="col-span-2 grid grid-cols-2 gap-2">
          {/* Tile 1 */}
          <div
            onClick={() => onSelectPromo && onSelectPromo("Snacks")}
            className="bg-gradient-to-br from-amber-100 to-amber-200 rounded-2xl p-2 flex flex-col justify-between cursor-pointer active:scale-[0.98] transition-all"
          >
            <h4 className="font-extrabold text-[11px] text-amber-950 leading-tight">
              Namkeen & Sev
            </h4>
            <div className="h-14 flex items-center justify-center mt-1">
              <img
                src="https://images.unsplash.com/photo-1599785209707-a456fc1337bb?w=150&auto=format&fit=crop&q=80"
                alt="Namkeen"
                className="max-h-full max-w-full object-contain rounded-md"
              />
            </div>
          </div>

          {/* Tile 2 */}
          <div
            onClick={() => onSelectPromo && onSelectPromo("Bakery")}
            className="bg-gradient-to-br from-blue-100 to-sky-200 rounded-2xl p-2 flex flex-col justify-between cursor-pointer active:scale-[0.98] transition-all"
          >
            <h4 className="font-extrabold text-[11px] text-sky-950 leading-tight">
              Cookies & Toast
            </h4>
            <div className="h-14 flex items-center justify-center mt-1">
              <img
                src="https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=150&auto=format&fit=crop&q=80"
                alt="Cookies"
                className="max-h-full max-w-full object-contain rounded-md"
              />
            </div>
          </div>

          {/* Tile 3 */}
          <div
            onClick={() => onSelectPromo && onSelectPromo("Snacks")}
            className="bg-gradient-to-br from-rose-100 to-pink-200 rounded-2xl p-2 flex flex-col justify-between cursor-pointer active:scale-[0.98] transition-all"
          >
            <h4 className="font-extrabold text-[11px] text-pink-950 leading-tight">
              Chocolates
            </h4>
            <div className="h-14 flex items-center justify-center mt-1">
              <img
                src="https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=150&auto=format&fit=crop&q=80"
                alt="Chocolates"
                className="max-h-full max-w-full object-contain rounded-md"
              />
            </div>
          </div>

          {/* Tile 4 */}
          <div
            onClick={() => onSelectPromo && onSelectPromo("Drinks")}
            className="bg-gradient-to-br from-emerald-100 to-teal-200 rounded-2xl p-2 flex flex-col justify-between cursor-pointer active:scale-[0.98] transition-all"
          >
            <h4 className="font-extrabold text-[11px] text-teal-950 leading-tight">
              Cold Soda & Juice
            </h4>
            <div className="h-14 flex items-center justify-center mt-1">
              <img
                src="https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=150&auto=format&fit=crop&q=80"
                alt="Drinks"
                className="max-h-full max-w-full object-contain rounded-md"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
