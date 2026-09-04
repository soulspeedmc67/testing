import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { hapticLight } from "../lib/haptics";
import { stagger, scaleIn, inViewOnce, SPRING_SNAPPY, TAP_SOFT } from "../lib/motion";

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
    <motion.div variants={stagger(0.05)} {...inViewOnce} className="grid grid-cols-3 gap-3">
      {SIX_PACK_CATEGORIES.map((item) => (
        <motion.div
          key={item.id}
          variants={scaleIn}
          whileTap={TAP_SOFT}
          transition={SPRING_SNAPPY}
          onClick={() => handleCategoryClick(item)}
          className="bg-white border border-slate-200/80 rounded-2xl p-3 flex flex-col cursor-pointer shadow-[0_1px_3px_rgba(15,23,42,0.04)] hover:shadow-[0_10px_24px_rgba(15,23,42,0.09)] hover:-translate-y-0.5 hover:border-slate-300/80 transition-all duration-300 group"
        >
          {/* Staged imagery leads, label reads underneath — calmer scan order */}
          <div className="relative w-full h-[72px] bg-gradient-to-b from-slate-50 to-white rounded-xl p-1.5 flex items-center justify-center overflow-hidden border border-slate-100">
            <img
              src={item.img}
              alt={item.name}
              className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-300"
            />
          </div>

          {/* Label — sentence case at a readable size, count as quiet metadata */}
          <div className="mt-2.5 min-h-[34px]">
            <h4 className="font-bold text-[12px] text-[#061838] leading-snug line-clamp-2 tracking-tight">
              {item.name}
            </h4>
            <span className="text-[10px] font-semibold text-slate-400 mt-0.5 block">
              {item.moreCount}
            </span>
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
}
