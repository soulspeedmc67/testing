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
      try { setCart(JSON.parse(savedCart)); } catch (e) {}
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
  const originalSubtotal = cart.reduce((sum, item) => sum + (item.originalPrice || item.price + 10) * item.qty, 0);
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3.5 flex items-center justify-between shadow-sm">
        <div className="flex items-center space-x-3">
          <Link href="/" className="p-1 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="font-extrabold text-base text-slate-900">My Cart ({cart.reduce((s, i) => s + i.qty, 0)})</h1>
        </div>
        <button
          onClick={() => setIsLocationModalOpen(true)}
          className="flex items-center space-x-1 text-xs text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200 font-bold"
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>{location.nickname}</span>
        </button>
      </header>

      <main className="max-w-md mx-auto px-4 mt-4 space-y-4">
        <LocationPickerModal
          isOpen={isLocationModalOpen}
          onClose={() => setIsLocationModalOpen(false)}
          onSelectLocation={(loc) => setLocation(loc)}
          currentLocation={location}
        />

        {cart.length === 0 ? (
          <div className="text-center py-16 space-y-3 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <ShoppingBag className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="font-extrabold text-sm text-slate-800">Your cart is empty</h3>
            <p className="text-xs text-slate-500">Explore products and add items to your cart</p>
            <Link
              href="/"
              className="inline-block bg-emerald-600 text-white font-bold text-xs px-5 py-2.5 rounded-2xl mt-2 hover:bg-emerald-700 transition-colors shadow-md"
            >
              Browse Storefront
            </Link>
          </div>
        ) : (
          <>
            {/* Delivery Address Card */}
            <div className="bg-white border border-slate-200 rounded-3xl p-4 flex items-center justify-between shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-2xl">
                  <MapPin className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-xs font-extrabold text-slate-900">Deliver to {location.nickname}</span>
                  <p className="text-[11px] font-medium text-slate-500 truncate max-w-[200px]">{location.address}</p>
                </div>
              </div>
              <button
                onClick={() => setIsLocationModalOpen(true)}
                className="text-xs font-bold text-emerald-600 hover:underline"
              >
                Change
              </button>
            </div>

            {/* Cart Items List */}
            <div className="bg-white border border-slate-200 rounded-3xl p-4 space-y-3 shadow-sm divide-y divide-slate-100">
              <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider pb-1">Selected Items</h3>
              {cart.map((item) => (
                <div key={item.id} className="pt-3 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img src={item.img} alt={item.name} className="w-12 h-12 object-contain bg-slate-50 p-1 rounded-xl border border-slate-100" />
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">{item.name}</h4>
                      <p className="text-[11px] font-semibold text-slate-500">₹{item.price} x {item.qty}</p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-2 py-1 font-bold">
                    <button onClick={() => updateQty(item.id, -1)} className="hover:opacity-80">
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-xs font-extrabold px-1">{item.qty}</span>
                    <button onClick={() => updateQty(item.id, 1)} className="hover:opacity-80">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Coupon Code Section */}
            <div className="bg-white border border-slate-200 rounded-3xl p-3 flex space-x-2 shadow-sm">
              <div className="flex items-center pl-2 text-slate-400">
                <Tag className="w-4 h-4" />
              </div>
              <input
                type="text"
                placeholder="Enter Promo Code (e.g. ANANTNAG10)..."
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="bg-transparent text-xs font-semibold text-slate-900 grow focus:outline-none placeholder-slate-400"
              />
              <button
                onClick={applyCoupon}
                className="bg-emerald-50 text-emerald-700 text-xs font-extrabold px-4 py-2 rounded-2xl border border-emerald-200 hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
              >
                APPLY
              </button>
            </div>

            {/* Bill Summary */}
            <div className="bg-white border border-slate-200 rounded-3xl p-4 space-y-2.5 text-xs shadow-sm">
              <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider mb-2">Bill Details</h3>
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Item Subtotal</span>
                <span className="text-slate-900 font-bold font-mono">₹{subtotal}</span>
              </div>
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Delivery Charge (Anantnag Darkstore)</span>
                <span className="text-emerald-600 font-bold font-mono">{deliveryFee === 0 ? "FREE" : `₹${deliveryFee}`}</span>
              </div>
              <div className="flex justify-between text-slate-600 font-medium">
                <span>Handling & Store Charge</span>
                <span className="text-slate-900 font-bold font-mono">₹{handlingFee}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-emerald-600 font-bold">
                  <span>Coupon Discount</span>
                  <span className="font-mono">-₹{discount}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-100 flex justify-between font-extrabold text-sm text-slate-900">
                <span>To Pay</span>
                <span className="text-emerald-700 font-mono text-base">₹{grandTotal}</span>
              </div>
              <div className="bg-emerald-50 text-emerald-700 text-[11px] font-extrabold px-3 py-2 rounded-2xl text-center border border-emerald-200">
                🎉 You are saving ₹{totalSavings} on this order!
              </div>
            </div>

            {/* Security Badge */}
            <div className="flex items-center justify-center space-x-1.5 text-[11px] font-semibold text-slate-500 py-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span>100% Safe & Contactless Delivery</span>
            </div>

            {/* Proceed to Payment CTA */}
            <button
              onClick={proceedToCheckout}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm py-3.5 rounded-2xl shadow-lg transition-all flex items-center justify-center space-x-2"
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
