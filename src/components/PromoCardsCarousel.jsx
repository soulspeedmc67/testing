const PROMO_CARDS = [
  {
    id: 1,
    title: "Earbuds & Headsets",
    subtitle: "Up to 60% OFF",
    bg: "from-purple-900 to-indigo-900",
    badge: "FEATURED",
    img: "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=300&auto=format&fit=crop&q=80"
  },
  {
    id: 2,
    title: "Power Banks & Chargers",
    subtitle: "Fast Charging 20W",
    bg: "from-sky-900 to-slate-900",
    badge: "BESTSELLER",
    img: "https://images.unsplash.com/photo-1609592424109-dd9892f1b177?w=300&auto=format&fit=crop&q=80"
  },
  {
    id: 3,
    title: "Decorative Lamps",
    subtitle: "Ganeshotsav Festive",
    bg: "from-amber-900 to-orange-950",
    badge: "FESTIVE",
    img: "https://images.unsplash.com/photo-1507652313519-d4e9174996dd?w=300&auto=format&fit=crop&q=80"
  }
];

export default function PromoCardsCarousel() {
  return (
    <div className="space-y-2">
      <div className="flex space-x-3 overflow-x-auto scrollbar-none pr-6">
        {PROMO_CARDS.map((card) => (
          <div
            key={card.id}
            className={`w-[240px] shrink-0 h-36 bg-gradient-to-br ${card.bg} rounded-3xl p-4 flex justify-between relative overflow-hidden shadow-lg border border-white/10 active:scale-95 transition-transform cursor-pointer`}
          >
            <div className="z-10 flex flex-col justify-between space-y-1 max-w-[120px]">
              {card.badge && (
                <span className="bg-white/20 backdrop-blur text-white text-[9px] font-black px-2 py-0.5 rounded-full w-max uppercase tracking-wider">
                  {card.badge}
                </span>
              )}
              <div>
                <h3 className="font-extrabold text-sm text-white leading-tight">{card.title}</h3>
                <p className="text-[11px] font-semibold text-amber-300 mt-0.5">{card.subtitle}</p>
              </div>
            </div>

            <img
              src={card.img}
              alt={card.title}
              className="absolute right-[-10px] bottom-[-10px] w-28 h-28 object-contain rounded-2xl transform rotate-6 opacity-90 drop-shadow-xl"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
