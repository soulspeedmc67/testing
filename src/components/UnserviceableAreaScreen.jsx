import { useRouter } from "next/router";
import { ChevronRight, HelpCircle, Info, Instagram, ChevronDown, User } from "lucide-react";
import { hapticLight } from "../lib/haptics";

export default function UnserviceableAreaScreen({
  areaName = "Safa Pora, 191131",
  onChangeLocation
}) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#fff5f5] dark:bg-zinc-950 flex flex-col justify-between text-slate-900 dark:text-white pb-10">
      {/* Top Bar */}
      <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-rose-100 dark:border-rose-950/40">
        <div>
          <h1 className="text-lg font-black text-rose-600 tracking-tight">Unserviceable area</h1>
          <button
            onClick={onChangeLocation}
            className="flex items-center space-x-1 text-xs font-bold text-slate-700 dark:text-zinc-300 mt-0.5"
          >
            <span>{areaName}</span>
            <ChevronDown className="w-3.5 h-3.5 stroke-[2.5]" />
          </button>
        </div>
        <button
          onClick={() => router.push("/account")}
          className="w-9 h-9 rounded-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-300 shadow-2xs"
        >
          <User className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>

      {/* Hero Message & Illustration */}
      <div className="px-6 py-8 text-center flex flex-col items-center">
        <h2 className="text-2xl font-black text-[#6d1323] dark:text-rose-300 mb-1">Hello!</h2>
        <h3 className="text-xl font-black text-[#6d1323] dark:text-rose-300 mb-4">It's not you, it's us.</h3>

        <p className="text-base font-extrabold text-[#7a1b2d] dark:text-rose-200 leading-snug max-w-xs mb-2">
          We are not serving this area at the moment.
        </p>
        <p className="text-base font-extrabold text-[#7a1b2d] dark:text-rose-200">
          Sorry for the inconvenience.
        </p>

        {/* Store Closed Graphic */}
        <div className="relative w-64 h-48 my-8 flex items-center justify-center">
          <div className="w-48 bg-[#d8c3be] dark:bg-zinc-800 rounded-2xl p-4 shadow-sm border border-stone-300 dark:border-zinc-700 flex flex-col items-center">
            {/* Store closed sign */}
            <div className="bg-rose-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-md shadow-xs mb-2">
              Store closed
            </div>
            {/* Store roof awning */}
            <div className="w-full h-3 bg-stone-300 dark:bg-zinc-700 rounded-sm mb-3" />
            <div className="grid grid-cols-2 gap-2 w-full">
              <div className="h-16 bg-stone-200 dark:bg-zinc-900 rounded-md" />
              <div className="h-16 bg-stone-200 dark:bg-zinc-900 rounded-md" />
            </div>
          </div>
        </div>

        <button
          onClick={onChangeLocation}
          className="bg-[#FF5B00] hover:bg-[#0a6f1a] text-white text-xs font-black px-6 py-3 rounded-2xl shadow-md active:scale-95 transition-transform"
        >
          Change to Anantnag Location
        </button>
      </div>

      {/* Action Links */}
      <div className="px-5 space-y-2.5">
        <div
          onClick={() => router.push("/orders?viewPast=true")}
          className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between shadow-2xs cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center justify-center">
              <HelpCircle className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="text-xs font-extrabold text-slate-800 dark:text-zinc-200">
              Need help with your previous orders?
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 dark:text-content-faint" />
        </div>

        <div
          onClick={() => alert("Dashit: Fast grocery delivery in Anantnag, Kashmir.")}
          className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between shadow-2xs cursor-pointer active:scale-[0.99]"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 flex items-center justify-center">
              <Info className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="text-xs font-extrabold text-slate-800 dark:text-zinc-200">
              About us
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 dark:text-content-faint" />
        </div>

        <a
          href="https://instagram.com"
          target="_blank"
          rel="noreferrer"
          className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between shadow-2xs active:scale-[0.99]"
        >
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 flex items-center justify-center">
              <Instagram className="w-4 h-4 stroke-[2.5]" />
            </div>
            <span className="text-xs font-extrabold text-slate-800 dark:text-zinc-200">
              Follow us on Instagram for updates
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 dark:text-content-faint" />
        </a>
      </div>
    </div>
  );
}
