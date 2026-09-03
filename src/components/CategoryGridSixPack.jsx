import { useRouter } from "next/router";

export const SIX_PACK_CATEGORIES = [
  {
    id: "veg-fruits",
    name: "Vegetables & Fruits",
    moreCount: "+193 more",
    img: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=250&auto=format&fit=crop&q=80",
    cat: "Vegetables"
  },
  {
    id: "dairy-bread",
    name: "Dairy, Bread & Eggs",
    moreCount: "+30 more",
    img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=250&auto=format&fit=crop&q=80",
    cat: "Dairy"
  },
  {
    id: "oil-ghee",
    name: "Oil, Ghee & Masala",
    moreCount: "+370 more",
    img: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=250&auto=format&fit=crop&q=80",
    cat: "Grocery"
  },
  {
    id: "chips-namkeen",
    name: "Chips & Namkeen",
    moreCount: "+539 more",
    img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=250&auto=format&fit=crop&q=80",
    cat: "Snacks"
  },
  {
    id: "bakery-biscuits",
    name: "Bakery & Biscuits",
    moreCount: "+263 more",
    img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=250&auto=format&fit=crop&q=80",
    cat: "Bakery"
  },
  {
    id: "drinks-juices",
    name: "Drinks & Juices",
    moreCount: "+274 more",
    img: "https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=250&auto=format&fit=crop&q=80",
    cat: "Drinks"
  },
];

export default function CategoryGridSixPack({ onSelectCategory }) {
  const router = useRouter();

  const handleCategoryClick = (cat) => {
    if (onSelectCategory) {
      onSelectCategory(cat.cat);
    } else {
      router.push(`/categories?cat=${encodeURIComponent(cat.cat)}`);
    }
  };

  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-3 gap-2.5">
        {SIX_PACK_CATEGORIES.map((item) => (
          <div
            key={item.id}
            onClick={() => handleCategoryClick(item)}
            className="bg-slate-50/80 hover:bg-slate-100/90 border border-slate-200/80 rounded-2xl p-2 flex flex-col justify-between cursor-pointer transition-all active:scale-[0.97] group shadow-sm"
          >
            {/* Natural Image Container with Count Badge */}
            <div className="relative w-full h-20 bg-white rounded-xl p-1 flex items-center justify-center overflow-hidden border border-slate-100 shadow-inner">
              <img
                src={item.img}
                alt={item.name}
                className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
              />
              <span className="absolute bottom-1 bg-slate-900/80 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full backdrop-blur-xs">
                {item.moreCount}
              </span>
            </div>

            {/* Category Name */}
            <h4 className="font-extrabold text-[11px] text-slate-800 text-center leading-tight mt-1.5 line-clamp-2">
              {item.name}
            </h4>
          </div>
        ))}
      </div>
    </div>
  );
}
