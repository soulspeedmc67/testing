import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { Tag, ArrowRight } from "lucide-react";
import { hapticLight } from "../lib/haptics";
import { stagger, scaleIn, inViewOnce, SPRING_SNAPPY, TAP_SOFT } from "../lib/motion";

export const SIX_PACK_CATEGORIES = [
  {
    id: "home-care",
    name: "Home Care",
    img: "https://images.unsplash.com/photo-1584813470613-5b1c1cad3d69?w=250&auto=format&fit=crop&q=80",
    cat: "Home Care"
  },
  {
    id: "kitchen-care",
    name: "Kitchen Care",
    img: "https://images.unsplash.com/photo-1615397349754-cfa2066a298e?w=250&auto=format&fit=crop&q=80",
    cat: "Kitchen Care"
  },
  {
    id: "vegetables",
    name: "Vegetables",
    img: "https://images.unsplash.com/photo-1610832958506-aa56368176cf?w=250&auto=format&fit=crop&q=80",
    cat: "Vegetables"
  },
  {
    id: "fresh-fruits",
    name: "Fresh Fruits",
    img: "https://images.unsplash.com/photo-1619566636858-adf3ef46400b?w=250&auto=format&fit=crop&q=80",
    cat: "Fresh Fruits"
  },
  {
    id: "chicken",
    name: "Chicken",
    img: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=250&auto=format&fit=crop&q=80",
    cat: "Chicken"
  },
  {
    id: "dairy",
    name: "Dairy",
    img: "https://images.unsplash.com/photo-1550583724-b2692b85b150?w=250&auto=format&fit=crop&q=80",
    cat: "Dairy"
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
    <motion.div variants={stagger(0.05)} {...inViewOnce} className="space-y-3">
      {/* Offers leads the grid as one wide highlighted card — it is a destination
          rather than a filter, so it reads differently from the six tiles below. */}
      <motion.button
        type="button"
        variants={scaleIn}
        whileTap={TAP_SOFT}
        transition={SPRING_SNAPPY}
        onClick={() => {
          hapticLight();
          router.push("/offers");
        }}
        className="w-full rounded-2xl bg-gradient-to-r from-[#FF5B00] via-[#FF3D68] to-[#C026D3] p-3.5 flex items-center justify-between text-white shadow-[0_8px_22px_-10px_rgba(255,91,0,0.65)] relative overflow-hidden"
      >
        <span aria-hidden className="absolute -right-6 -top-8 w-24 h-24 rounded-full bg-white/15" />
        <span className="flex items-center space-x-3 relative">
          <span className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
            <Tag className="w-4 h-4 stroke-[2.5]" />
          </span>
          <span className="text-left">
            <span className="block text-[13.5px] font-black tracking-tight leading-tight">
              Offers &amp; Deals
            </span>
            <span className="block text-[10.5px] font-medium text-white/80 leading-tight">
              Today&apos;s best savings
            </span>
          </span>
        </span>
        <ArrowRight className="w-4 h-4 stroke-[2.5] relative shrink-0" />
      </motion.button>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 sm:gap-4">
      {SIX_PACK_CATEGORIES.map((item) => (
        <motion.div
          key={item.id}
          variants={scaleIn}
          whileTap={TAP_SOFT}
          transition={SPRING_SNAPPY}
          onClick={() => handleCategoryClick(item)}
          className="bg-white border border-slate-200/80 rounded-2xl p-2.5 flex flex-col cursor-pointer shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
        >
          {/* Imagery leads, a single label reads underneath — nothing else competes */}
          <div className="relative w-full h-[70px] bg-gradient-to-b from-slate-50 to-white rounded-xl overflow-hidden flex items-center justify-center border border-slate-100">
            <img
              src={item.img}
              alt={item.name}
              className="w-full h-full object-cover"
            />
          </div>

          <h4 className="mt-2 text-[11.5px] font-semibold text-[#061838] leading-snug line-clamp-2 tracking-tight">
            {item.name}
          </h4>
        </motion.div>
      ))}
      </div>
    </motion.div>
  );
}
