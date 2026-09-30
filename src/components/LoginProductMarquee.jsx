import { productImageUrl } from "./ProductImage";

const ROW1 = [
  { img: "/products/catalog/dairy_breakfast/dsh_3452dfc18e6f.webp", bg: "bg-sky-100/70" },
  { img: "/products/catalog/munchies/dsh_064717045ec8.webp", bg: "bg-orange-100/70" },
  { img: "/products/catalog/sweet_tooth/dsh_40fb79d7a4ed.webp", bg: "bg-amber-100/70" },
  { img: "/products/catalog/vegetables_fruits/dsh_30b889a20ff7.webp", bg: "bg-rose-100/70" },
];

const ROW2 = [
  { img: "/products/catalog/cold_drinks_juices/dsh_56ad109de49a.webp", bg: "bg-yellow-100/70" },
  { img: "/products/catalog/munchies/dsh_ecf9c2f21047.webp", bg: "bg-purple-100/70" },
  { img: "/products/catalog/bakery_biscuits/dsh_253f1bbc3708.webp", bg: "bg-orange-100/70" },
  { img: "/products/catalog/dairy_breakfast/dsh_c937440a65c6.webp", bg: "bg-[#fef3c7]" },
];

export default function LoginProductMarquee() {
  return (
    <div className="relative py-4 overflow-hidden space-y-3 opacity-95">
      {/* Row 1: Left Drifting Marquee */}
      <div className="flex space-x-3 w-[200%] animate-marquee-left">
        {[...ROW1, ...ROW1, ...ROW1].map((item, idx) => (
          <div
            key={idx}
            className={`${item.bg} h-20 w-20 shrink-0 rounded-3xl p-3 flex items-center justify-center border border-white shadow-sm`}
          >
            <img src={productImageUrl(item.img)} alt="Product" className="h-14 w-14 object-contain rounded-xl" />
          </div>
        ))}
      </div>

      {/* Row 2: Right Drifting Marquee */}
      <div className="flex space-x-3 w-[200%] animate-marquee-right">
        {[...ROW2, ...ROW2, ...ROW2].map((item, idx) => (
          <div
            key={idx}
            className={`${item.bg} h-20 w-20 shrink-0 rounded-3xl p-3 flex items-center justify-center border border-white shadow-sm`}
          >
            <img src={productImageUrl(item.img)} alt="Product" className="h-14 w-14 object-contain rounded-xl" />
          </div>
        ))}
      </div>
    </div>
  );
}
