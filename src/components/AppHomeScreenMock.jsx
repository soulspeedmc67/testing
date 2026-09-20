import { Search, Mic, Store, ChevronDown, User, ArrowRight, Flame, Tag, Milk, Utensils, Carrot, Home, LayoutGrid, ShoppingBag, MapPin } from "lucide-react";

/**
 * A still, faithful rendering of the DASHit app's own home screen.
 *
 * This is the screen shipped in the app — the same header block, search field,
 * category rail, exclusive banner, everyday-essentials rail, cart dock and
 * bottom navigation — rebuilt as flat markup so the landing hero shows the real
 * product rather than an invented mock-up.
 *
 * It is deliberately inert: nothing here is clickable, nothing animates on its
 * own, and it always renders the app's light theme regardless of the landing
 * page's theme, because that is what a phone on a desk actually shows.
 */

const CATEGORY_RAIL = [
  { label: "All", Icon: Flame, active: true },
  { label: "Offers", Icon: Tag },
  { label: "Dairy & Eggs", Icon: Milk },
  { label: "Instant Food", Icon: Utensils },
  { label: "Vegetables", Icon: Carrot },
];

const ESSENTIAL_RAILS = [
  {
    title: "Fresh Vegetables",
    priceText: "From ₹20",
    img: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=280&auto=format&fit=crop&q=80",
  },
  {
    title: "Milk, Curd & Eggs",
    priceText: "From ₹35",
    img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=280&auto=format&fit=crop&q=80",
  },
  {
    title: "Fresh Fruits",
    priceText: "From ₹45",
    img: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=280&auto=format&fit=crop&q=80",
  },
];

export default function AppHomeScreenMock() {
  return (
    <div
      aria-hidden="true"
      className="relative w-full h-full select-none pointer-events-none overflow-hidden bg-[#FFFDF5] text-slate-900 font-sans text-left flex flex-col"
    >
      {/* ---------------------------------------------------------------- */}
      {/* HEADER — warm gradient block, exactly as the app renders it       */}
      {/* ---------------------------------------------------------------- */}
      <div className="shrink-0 bg-gradient-to-b from-[#FFE8D6] via-[#FFF5EB] to-[#FFFDF5]">
        {/* iOS status bar */}
        <div className="pt-3 px-6 flex items-center justify-between text-slate-900">
          <span className="text-[11px] font-bold tracking-tight">9:41</span>
          <div className="flex items-center space-x-1.5">
            <span className="text-[10px] font-bold">5G</span>
            <svg viewBox="0 0 18 12" className="w-3.5 h-2.5 fill-slate-900">
              <path d="M1 9h2v3H1zM5 6.5h2V12H5zM9 4h2v8H9zM13 1h2v11h-2z" />
            </svg>
            <div className="w-5 h-2.5 rounded-[3px] border border-slate-900/70 p-[1.5px]">
              <div className="w-full h-full bg-slate-900 rounded-[1px]" />
            </div>
          </div>
        </div>

        {/* Delivery promise row */}
        <div className="px-4 pt-2.5 pb-2.5">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-[9px] font-black uppercase tracking-[0.14em] text-slate-500 block leading-none">
                Dashit in
              </span>
              <div className="flex items-center space-x-2 mt-1">
                <span className="text-[24px] font-black tracking-tight text-slate-900 leading-none">
                  8 minutes
                </span>
                <span className="inline-flex items-center space-x-1 bg-sky-50 text-[#061838] text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border border-sky-200">
                  <Store className="w-2.5 h-2.5 stroke-[2.5] shrink-0" />
                  <span>486 m away</span>
                </span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white border border-amber-300/70 flex items-center justify-center shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
              <User className="w-4 h-4 text-slate-700" />
            </div>
          </div>

          {/* Saved address chip */}
          <div className="mt-2.5 inline-flex items-center space-x-1.5 bg-white border border-slate-200 rounded-full pl-2 pr-2.5 py-1 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
            <MapPin className="w-3 h-3 text-[#FF5B00] fill-[#FF5B00]/15" />
            <span className="text-[10px] font-black tracking-tight text-slate-900">WORK</span>
            <ChevronDown className="w-3 h-3 text-slate-500" />
          </div>

          {/* Search field */}
          <div className="mt-2.5 bg-white border border-slate-300 rounded-full h-9 px-3 flex items-center space-x-2 shadow-[0_1px_3px_rgba(15,23,42,0.05)]">
            <Search className="w-3.5 h-3.5 text-slate-500 stroke-[2.5]" />
            <span className="text-[11px] font-bold text-slate-900">Search</span>
            <span className="text-[11px] font-medium text-slate-400 truncate">
              &quot;milk, curd &amp; paneer&quot;
            </span>
            <Mic className="w-3.5 h-3.5 text-[#FF5B00] ml-auto shrink-0" />
          </div>
        </div>

        {/* Category rail */}
        <div className="px-4 pb-3 flex items-start space-x-3.5 overflow-hidden">
          {CATEGORY_RAIL.map(({ label, Icon, active }) => (
            <div key={label} className="flex flex-col items-center shrink-0 w-[52px]">
              <div
                className={`w-11 h-11 rounded-full flex items-center justify-center ${
                  active
                    ? "bg-[#061838] text-white"
                    : "bg-white text-slate-600 border border-slate-200"
                }`}
              >
                <Icon className="w-[18px] h-[18px] stroke-[2]" />
              </div>
              <span
                className={`mt-1.5 text-[8.5px] leading-tight text-center ${
                  active ? "font-black text-slate-900" : "font-semibold text-slate-600"
                }`}
              >
                {label}
              </span>
              {active && <span className="mt-1 w-4 h-[2.5px] rounded-full bg-[#FF5B00]" />}
            </div>
          ))}
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* BODY                                                              */}
      {/* ---------------------------------------------------------------- */}
      <div className="flex-1 px-4 pt-3.5 overflow-hidden">
        {/* Exclusive offer banner */}
        <div className="relative w-full rounded-2xl overflow-hidden text-white bg-[#090D15]">
          <div className="absolute inset-y-0 right-0 w-[42%]">
            <img
              src="https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=400&auto=format&fit=crop&q=80"
              alt=""
              loading="lazy"
              decoding="async"
              className="w-full h-full object-cover"
            />
          </div>
          <div
            className="absolute inset-y-0 right-0 w-[66%]"
            style={{
              background:
                "linear-gradient(90deg,#090D15 0%,#090D15 40%,rgba(9,13,21,0.45) 74%,rgba(9,13,21,0) 100%)",
            }}
          />
          <div className="relative z-10 p-4 pr-[40%] min-h-[132px]">
            <div className="flex items-center space-x-2">
              <span className="w-3.5 h-px bg-[#FF5B00]" />
              <span className="text-[7.5px] font-bold tracking-[0.18em] uppercase text-white/45">
                Dashit Exclusive
              </span>
            </div>

            <h3 className="mt-2.5 text-[14px] font-black tracking-[-0.02em] leading-[1.18]">
              Gourmet Snacks &amp; Chilled Sips
            </h3>

            <div className="mt-2.5 h-px w-7 bg-white/15" />

            <div className="mt-2.5 flex items-baseline gap-x-2">
              <span className="text-[11px] font-black text-amber-300 tracking-tight">
                Starting ₹20
              </span>
              <span className="text-[9px] font-mono font-bold text-white/40">CRISP20</span>
            </div>

            <div className="mt-3 inline-flex items-center space-x-1.5 bg-[#FF5B00] text-white pl-2.5 pr-2 py-1.5 rounded-lg text-[10px] font-black tracking-tight">
              <span>Explore deals</span>
              <ArrowRight className="w-3 h-3 stroke-[3]" />
            </div>

            <div className="flex items-center space-x-1.5 mt-3">
              <span className="h-[2px] w-4 bg-[#FF5B00]" />
              <span className="h-[2px] w-1.5 bg-white/25" />
              <span className="h-[2px] w-1.5 bg-white/25" />
            </div>
          </div>
        </div>

        {/* Everyday essentials rail */}
        <h4 className="mt-4 mb-2.5 px-0.5 text-[13px] font-bold tracking-tight text-[#061838]">
          Everyday essentials
        </h4>

        <div className="flex space-x-2.5">
          {ESSENTIAL_RAILS.map((item) => (
            <div
              key={item.title}
              className="w-[112px] shrink-0 rounded-2xl bg-white border border-slate-200/80 p-2 shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
            >
              <div className="w-full h-[66px] rounded-xl overflow-hidden bg-slate-100">
                <img
                  src={item.img}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover"
                />
              </div>
              <h5 className="mt-2 text-[10.5px] font-semibold text-[#061838] leading-snug tracking-tight">
                {item.title}
              </h5>
              <p className="text-[9px] font-medium text-slate-500 mt-0.5">{item.priceText}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* DOCK — cart pill above the bottom navigation, floating over the   */}
      {/* feed exactly as it does in the app                                */}
      {/* ---------------------------------------------------------------- */}
      <div className="absolute inset-x-0 bottom-0 z-10">
        <div className="px-4 pb-1">
          <div className="mx-auto w-[212px] bg-[#061838] rounded-full h-11 pl-1.5 pr-1.5 flex items-center justify-between shadow-[0_8px_24px_-8px_rgba(6,24,56,0.6)]">
            <div className="flex items-center space-x-2">
              <img
                src="https://images.unsplash.com/photo-1550583724-b2692b85b150?w=80&auto=format&fit=crop&q=80"
                alt=""
                loading="lazy"
                decoding="async"
                className="w-8 h-8 rounded-full object-cover border border-white/20"
              />
              <div className="leading-none">
                <span className="text-[11px] font-black text-white block">View cart</span>
                <span className="text-[8.5px] font-black text-white bg-[#FF5B00] px-1.5 py-[1px] rounded-full inline-block mt-1">
                  1 Item
                </span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-white/15 flex items-center justify-center">
              <ArrowRight className="w-3.5 h-3.5 text-white stroke-[2.5]" />
            </div>
          </div>
        </div>

        <div className="px-5 pb-4 pt-2.5">
          <div className="bg-white border border-slate-200/90 rounded-full h-[54px] px-4 flex items-center justify-around shadow-[0_6px_20px_-10px_rgba(15,23,42,0.25)]">
            <div className="flex flex-col items-center">
              <Home className="w-[18px] h-[18px] text-[#FF5B00] stroke-[2.4]" />
              <span className="text-[8.5px] font-black text-slate-900 mt-0.5">Home</span>
              <span className="w-1 h-1 rounded-full bg-[#FF5B00] mt-0.5" />
            </div>
            <div className="flex flex-col items-center">
              <LayoutGrid className="w-[18px] h-[18px] text-slate-400 stroke-[2]" />
              <span className="text-[8.5px] font-semibold text-slate-400 mt-0.5">Categories</span>
            </div>
            <div className="flex flex-col items-center relative">
              <ShoppingBag className="w-[18px] h-[18px] text-slate-400 stroke-[2]" />
              <span className="absolute -top-0.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#FF5B00]" />
              <span className="text-[8.5px] font-semibold text-slate-400 mt-0.5">Orders</span>
            </div>
          </div>
        </div>

        {/* iOS home indicator */}
        <div className="pb-2 pt-0.5 flex justify-center">
          <div className="w-28 h-1 rounded-full bg-slate-900/25" />
        </div>
      </div>
    </div>
  );
}
