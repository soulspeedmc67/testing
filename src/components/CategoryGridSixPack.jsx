import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { Tag, ArrowRight } from "lucide-react";
import { hapticLight } from "../lib/haptics";
import { stagger, scaleIn, inViewOnce, SPRING_SNAPPY, TAP_SOFT } from "../lib/motion";

import ProductImage from "./ProductImage";

export const SIX_PACK_CATEGORIES = [
  {
    id: "home-care",
    name: "Home Care",
    img: "/products/enriched/30.webp",
    cat: "Home Care"
  },
  {
    id: "kitchen-care",
    name: "Kitchen Care",
    img: "/products/enriched/35.webp",
    cat: "Kitchen Care"
  },
  {
    id: "vegetables",
    name: "Vegetables",
    img: "/products/enriched/40.webp",
    cat: "Vegetables"
  },
  {
    id: "fresh-fruits",
    name: "Fresh Fruits",
    img: "/products/enriched/4.webp",
    cat: "Fresh Fruits"
  },
  {
    id: "chicken",
    name: "Chicken & Fish",
    img: "/products/enriched/50.webp",
    cat: "Chicken"
  },
  {
    id: "dairy",
    name: "Dairy",
    img: "/products/enriched/1.webp",
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
          className="bg-white border border-slate-200/80 rounded-2xl p-2.5 flex flex-col cursor-pointer shadow-[0_1px_3px_rgba(15,23,42,0.04)] dark:bg-surface-raised dark:border-line/80"
        >
          {/* Imagery leads on clean white background — never cropped, professional packshots */}
          <div className="relative w-full aspect-square bg-white rounded-xl overflow-hidden flex items-center justify-center border border-slate-100 shadow-2xs dark:border-line-soft">
            <ProductImage
              src={item.img}
              name={item.name}
              fill
              imgClassName="p-2 object-contain"
              letterClassName="text-xl"
            />
          </div>

          <h4 className="mt-2 text-[12px] font-semibold text-center text-[#061838] leading-tight line-clamp-1 tracking-tight dark:text-content">
            {item.name}
          </h4>
        </motion.div>
      ))}
      </div>
    </motion.div>
  );
}
