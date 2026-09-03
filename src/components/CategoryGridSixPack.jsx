import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { hapticLight } from "../lib/haptics";

export const SIX_PACK_CATEGORIES = [
  {
    id: "veg-fruits",
    name: "Vegetables & Fruits",
    moreCount: "193+ items",
    img: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=250&auto=format&fit=crop&q=80",
    cat: "Vegetables"
  },
  {
    id: "dairy-bread",
    name: "Dairy, Bread & Eggs",
    moreCount: "30+ items",
    img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=250&auto=format&fit=crop&q=80",
    cat: "Dairy"
  },
  {
    id: "oil-ghee",
    name: "Oil, Ghee & Masala",
    moreCount: "370+ items",
    img: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=250&auto=format&fit=crop&q=80",
    cat: "Grocery"
  },
  {
    id: "chips-namkeen",
    name: "Chips & Namkeen",
    moreCount: "539+ items",
    img: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=250&auto=format&fit=crop&q=80",
    cat: "Snacks"
  },
  {
    id: "bakery-biscuits",
    name: "Bakery & Biscuits",
    moreCount: "263+ items",
    img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=250&auto=format&fit=crop&q=80",
    cat: "Bakery"
  },
  {
    id: "drinks-juices",
    name: "Drinks & Juices",
    moreCount: "274+ items",
    img: "https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=250&auto=format&fit=crop&q=80",
    cat: "Drinks"
  },
];

export default function CategoryGridSixPack({ onSelectCategory }) {
  const router = useRouter();

  const handleCategoryClick = (cat) => {
    hapticLight();
    if (onSelectCategory) {
      onSelectCategory(cat.cat);
    } else {
      router.push(`/categories?cat=${encodeURIComponent(cat.cat)}`);
    }
  };

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {SIX_PACK_CATEGORIES.map((item) => (
        <motion.div
          key={item.id}
          whileTap={{ scale: 0.97 }}
          onClick={() => handleCategoryClick(item)}
          className="bg-white hover:bg-slate-50/60 border border-slate-200/90 rounded-2xl p-2.5 flex flex-col justify-between cursor-pointer transition-all shadow-2xs hover:shadow-xs group"
        >
          {/* Typographic Header: Category Name + Item Count */}
          <div className="mb-2 min-h-[42px] flex flex-col justify-start">
            <h4 className="font-black text-[11px] text-[#061838] leading-tight line-clamp-2 tracking-tight uppercase">
              {item.name}
            </h4>
            <span className="text-[9px] font-bold text-[#FF6B00] mt-0.5">
              {item.moreCount}
            </span>
          </div>

          {/* High Quality Staged Image Container */}
          <div className="relative w-full h-20 bg-gradient-to-b from-slate-50 to-white rounded-xl p-1.5 flex items-center justify-center overflow-hidden border border-slate-100 shadow-inner">
            <img
              src={item.img}
              alt={item.name}
              className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
            />
          </div>
        </motion.div>
      ))}
    </div>
  );
}
