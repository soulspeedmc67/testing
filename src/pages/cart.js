import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ShoppingBag, ArrowRight, MapPin, Plus, Minus, Trash2, ArrowLeft, Tag, ShieldCheck } from "lucide-react";
import BottomNav from "../components/BottomNav";
import LocationPickerModal from "../components/LocationPickerModal";

export default function CartPage() {
  const router = useRouter();
  const [cart, setCart] = useState([]);
  const [couponCode, setCouponCode] = useState("");
  const [discount, setDiscount] = useState(0);

  const [location, setLocation] = useState({
    nickname: "Home",
    address: "Nai Basti, Near Petrol Pump, Anantnag",
    lat: 33.7311,
    lng: 75.1487
  });
  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);

  useEffect(() => {
    const savedCart = localStorage.getItem("dashit_cart");
    if (savedCart) {
      try {
        setCart(JSON.parse(savedCart));
      } catch (e) {}
    }
  }, []);

  const updateQty = (id, delta) => {
    const updated = cart
      .map((item) => (item.id === id ? { ...item, qty: item.qty + delta } : item))
      .filter((item) => item.qty > 0);
    setCart(updated);
    localStorage.setItem("dashit_cart", JSON.stringify(updated));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const originalSubtotal = cart.reduce((sum, item) => sum + item.originalPrice * item.qty, 0);
  const deliveryFee = subtotal >= 200 || subtotal === 0 ? 0 : 25;
  const handlingFee = subtotal > 0 ? 5 : 0;
  const totalSavings = (originalSubtotal - subtotal) + discount;
  const grandTotal = Math.max(0, subtotal + deliveryFee + handlingFee - discount);

  const applyCoupon = () => {
    if (couponCode.toUpperCase() === "ANANTNAG10") {
      setDiscount(20);
      alert("Coupon ANANTNAG10 Applied! ₹20 Discount.");
    } else {
      alert("Invalid Code! Try ANANTNAG10");
    }
  };

  const proceedToCheckout = () => {
    if (cart.length === 0) return;
    localStorage.setItem("dashit_checkout_data", JSON.stringify({
      cart,
      subtotal,
      deliveryFee,
      handlingFee,
      discount,
      grandTotal,
      savings: totalSavings,
      location
    }));
    router.push("/checkout");
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans antialiased pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#09090b]/90 backdrop-blur-xl border-b border-zinc-800/80 px-4 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link href="/" className="p-1 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-bold text-base text-zinc-100">My Cart ({cart.reduce((s, i) => s + i.qty, 0)})</h1>
        </div>
        <button
          onClick={() => setIsLocationModalOpen(true)}
          className="flex items-center space-x-1 text-xs text-orange-400 bg-zinc-900 px-2.5 py-1.5 rounded-xl border border-zinc-800"
        >
          <MapPin className="w-3.5 h-3.5" />
          <span className="font-semibold">{location.nickname}</span>
        </button>
      </header>

      <main className="max-w-md mx-auto px-4 mt-4 space-y-4">
        {/* Location Picker Modal */}
        <LocationPickerModal
          isOpen={isLocationModalOpen}
          onClose={() => setIsLocationModalOpen(false)}
          onSelectLocation={(loc) => setLocation(loc)}
          currentLocation={location}
        />

        {cart.length === 0 ? (
          <div className="text-center py-16 space-y-3 bg-zinc-900/60 border border-zinc-800/80 rounded-2xl p-6">
            <ShoppingBag className="w-12 h-12 text-zinc-600 mx-auto" />
            <h3 className="font-bold text-sm text-zinc-300">Your cart is empty</h3>
            <p className="text-xs text-zinc-500">Explore products and add items to your cart</p>
            <Link
              href="/"
              className="inline-block bg-orange-500 text-zinc-950 font-bold text-xs px-5 py-2.5 rounded-xl mt-2 hover:bg-orange-400 transition-colors"
            >
              Browse Storefront
            </Link>
          </div>
        ) : (
          <>
            {/* Delivery Address Card */}
            <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-3.5 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-500/10 rounded-xl text-orange-400">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-bold text-zinc-200">Deliver to {location.nickname}</span>
                  <p className="text-[11px] text-zinc-400 truncate max-w-[200px]">{location.address}</p>
                </div>
              </div>
              <button
                onClick={() => setIsLocationModalOpen(true)}
                className="text-[11px] font-bold text-orange-400 hover:underline"
              >
                Change
              </button>
            </div>

            {/* Cart Items List */}
            <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-4 space-y-3 divide-y divide-zinc-800/60">
              <h3 className="font-bold text-xs text-zinc-300 uppercase tracking-wider pb-1">Selected Items</h3>
              {cart.map((item) => (
                <div key={item.id} className="pt-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{item.emoji}</span>
                    <div>
                      <h4 className="font-semibold text-xs text-zinc-100">{item.name}</h4>
                      <p className="text-[11px] text-zinc-400 font-mono">₹{item.price} x {item.qty}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 bg-zinc-800 rounded-xl px-2 py-1 border border-zinc-700/60">
                    <button onClick={() => updateQty(item.id, -1)} className="text-zinc-300 hover:text-white p-0.5">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-bold text-orange-400 px-1">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="text-zinc-300 hover:text-white p-0.5">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Coupon Code Section */}
            <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-3 flex space-x-2">
              <div className="flex items-center pl-2 text-zinc-500">
                <Tag className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Enter Promo Code (e.g. ANANTNAG10)..."
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="bg-transparent text-xs text-zinc-100 grow focus:outline-none placeholder-zinc-500"
              />
              <button
                onClick={applyCoupon}
                className="bg-orange-500/10 text-orange-400 text-xs font-bold px-3 py-1.5 rounded-xl border border-orange-500/30 hover:bg-orange-500 hover:text-zinc-950 transition-all"
              >
                APPLY
              </button>
            </div>

            {/* Bill Summary */}
            <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-4 space-y-2.5 text-xs">
              <h3 className="font-bold text-xs text-zinc-300 uppercase tracking-wider mb-2">Bill Details</h3>
              <div className="flex justify-between text-zinc-400">
                <span>Item Subtotal</span>
                <span className="text-zinc-200 font-mono">₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Delivery Fee (Anantnag Darkstore)</span>
                <span className="text-emerald-400 font-mono">{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Handling & Store Charge</span>
                <span className="text-zinc-200 font-mono">₹{handlingFee}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-orange-400 font-semibold">
                  <span>Coupon Discount</span>
                  <span className="font-mono">-₹{discount}</span>
                </div>
              )}
              <div className="pt-2 border-t border-zinc-800 flex justify-between font-bold text-sm text-zinc-100">
                <span>To Pay</span>
                <span className="text-orange-500 font-mono">₹{grandTotal}</span>
              </div>
              <div className="bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold px-3 py-1.5 rounded-xl text-center border border-emerald-500/20">
                🎉 You are saving ₹{totalSavings} on this order!
              </div>
            </div>

            {/* Security Badge */}
            <div className="flex items-center justify-center space-x-1.5 text-[11px] text-zinc-500 py-1">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>100% Safe & Contactless Delivery</span>
            </div>

            {/* Proceed to Payment CTA */}
            <button
              onClick={proceedToCheckout}
              className="w-full bg-orange-500 hover:bg-orange-400 text-zinc-950 font-bold text-sm py-3.5 rounded-xl shadow-xl transition-all flex items-center justify-center space-x-2"
            >
              <span>Proceed to Payment (₹{grandTotal})</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </>
        )}
      </main>

      <BottomNav cartCount={cart.reduce((s, i) => s + i.qty, 0)} />
    </div>
  );
}
