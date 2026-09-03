import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowLeft, Heart, Star, ShieldCheck, Tag, ChevronRight } from "lucide-react";
import ProductCardStepper from "../../components/ProductCardStepper";
import FloatingCartBar from "../../components/FloatingCartBar";

const PRODUCT_IMAGES = [
  "https://images.unsplash.com/photo-1590658268037-6bf12165a8df?w=500&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=500&auto=format&fit=crop&q=80",
  "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&auto=format&fit=crop&q=80"
];

export default function ProductDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isFav, setIsFav] = useState(false);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem("dashit_cart");
    if (saved) {
      try { setCart(JSON.parse(saved)); } catch (e) {}
    }
  }, []);

  const saveCart = (newCart) => {
    setCart(newCart);
    localStorage.setItem("dashit_cart", JSON.stringify(newCart));
  };

  const productObj = {
    id: Number(id) || 301,
    name: "Portronics Conch Theta C Type C Wired Earphones (White)",
    unit: "1 unit",
    price: 303,
    originalPrice: 799,
    img: PRODUCT_IMAGES[0],
    time: "10 mins",
    cat: "Electronics"
  };

  const cartItem = cart.find((i) => i.id === productObj.id);
  const currentQty = cartItem ? cartItem.qty : 0;

  const handleAddToCart = () => {
    const updated = [...cart, { ...productObj, qty: 1 }];
    saveCart(updated);
  };

  const handleUpdateQty = (prodId, delta) => {
    const updated = cart
      .map((i) => (i.id === prodId ? { ...i, qty: i.qty + delta } : i))
      .filter((i) => i.qty > 0);
    saveCart(updated);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-32">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3.5 flex items-center justify-between shadow-sm">
        <Link href="/" className="p-1.5 rounded-full text-slate-600 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="font-extrabold text-xs text-slate-500 uppercase tracking-wider">Product Details</h1>
        <button onClick={() => setIsFav(!isFav)} className="p-1.5 rounded-full text-slate-400 hover:text-rose-500">
          <Heart className={`w-5 h-5 ${isFav ? "fill-rose-500 text-rose-500" : ""}`} />
        </button>
      </header>

      <main className="max-w-md mx-auto px-4 mt-4 space-y-4">
        {/* Product Image Swipable Carousel */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative space-y-4">
          <div className="relative h-56 flex items-center justify-center">
            <img
              src={PRODUCT_IMAGES[activeImageIndex]}
              alt="Product"
              className="h-52 w-52 object-contain transition-all duration-300 transform hover:scale-105"
            />
          </div>

          {/* Carousel Pagination Dots */}
          <div className="flex justify-center space-x-1.5">
            {PRODUCT_IMAGES.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImageIndex(idx)}
                className={`h-1.5 rounded-full transition-all ${
                  activeImageIndex === idx ? "w-6 bg-slate-900" : "w-1.5 bg-slate-300"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Product Title & Info Card */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center space-x-1 text-amber-500 text-xs font-extrabold">
            <Star className="w-4 h-4 fill-amber-400" />
            <Star className="w-4 h-4 fill-amber-400" />
            <Star className="w-4 h-4 fill-amber-400" />
            <Star className="w-4 h-4 fill-amber-400" />
            <Star className="w-4 h-4 fill-amber-400 text-slate-200" />
            <span className="text-slate-700 font-extrabold ml-1">4.8</span>
            <span className="text-slate-400 font-medium">(32,110 reviews)</span>
          </div>

          <h2 className="font-extrabold text-base text-slate-900 leading-snug">
            {productObj.name}
          </h2>

          <div className="flex items-center space-x-2">
            <span className="bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-slate-200">
              IPX5 Water Resistant
            </span>
            <span className="bg-slate-100 text-slate-700 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-slate-200">
              Type-C Digital Audio
            </span>
          </div>

          <div className="pt-2 flex items-baseline space-x-2">
            <span className="text-xl font-black text-slate-900 font-mono">₹{productObj.price}</span>
            <span className="text-xs text-slate-400 line-through font-medium">MRP ₹{productObj.originalPrice}</span>
            <span className="text-xs font-extrabold text-[#0c831f] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              62% OFF
            </span>
          </div>
        </div>

        {/* Promotional Code Banner */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-3xl p-4 flex items-center justify-between shadow-sm">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-[#0c831f] text-white rounded-2xl">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-slate-900">Buy at ₹288</h4>
              <p className="text-[11px] font-bold text-emerald-800">Apply Code: <b className="font-mono">AUCC30</b></p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-[#0c831f]" />
        </div>

        {/* Seller Info Card */}
        <div className="bg-white rounded-3xl p-4 border border-slate-200 shadow-sm flex items-center space-x-3">
          <ShieldCheck className="w-6 h-6 text-[#061838]" />
          <div>
            <h4 className="font-extrabold text-xs text-slate-900">Guaranteed Original Product</h4>
            <p className="text-[11px] text-slate-500 font-medium">Sold by Anantnag Central Hub</p>
          </div>
        </div>
      </main>

      {/* Persistent Bottom Purchase Bar with Morphing Stepper */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 shadow-xl z-50">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400">1 unit</span>
            <div className="flex items-baseline space-x-1.5">
              <span className="text-base font-black text-slate-900 font-mono">₹{productObj.price}</span>
              <span className="text-xs text-slate-400 line-through">₹{productObj.originalPrice}</span>
            </div>
          </div>

          <div className="w-36">
            <ProductCardStepper
              product={productObj}
              qty={currentQty}
              onAdd={handleAddToCart}
              onUpdateQty={handleUpdateQty}
            />
          </div>
        </div>
      </div>

      <FloatingCartBar cart={cart} />
    </div>
  );
}
