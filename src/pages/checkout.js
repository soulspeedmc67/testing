import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowLeft, CheckCircle2, ShieldCheck, CreditCard, Banknote, Zap, MapPin, Clock } from "lucide-react";
import confetti from "canvas-confetti";
import BottomNav from "../components/BottomNav";

export default function CheckoutPage() {
  const router = useRouter();
  const [checkoutData, setCheckoutData] = useState(null);
  const [selectedMethod, setSelectedMethod] = useState("upi");
  const [isProcessing, setIsProcessing] = useState(false);

  const [currentHour] = useState(new Date().getHours());
  const isNightTime = currentHour >= 22 || currentHour < 6;

  useEffect(() => {
    const data = localStorage.getItem("dashit_checkout_data");
    if (data) {
      try { setCheckoutData(JSON.parse(data)); } catch (e) {}
    }
  }, []);

  const handlePlaceOrder = () => {
    if (!checkoutData) return;
    setIsProcessing(true);

    // Trigger Party Confetti Burst!
    try {
      confetti({
        particleCount: 120,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (e) {}

    setTimeout(() => {
      const newOrderId = "DASH-" + Math.floor(100000 + Math.random() * 900000);
      const newOrder = {
        orderId: newOrderId,
        date: new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }),
        items: checkoutData.cart,
        totalAmount: checkoutData.grandTotal,
        savings: checkoutData.savings,
        paymentMethod: selectedMethod,
        location: checkoutData.location,
        otp: Math.floor(1000 + Math.random() * 9000),
        status: "Packing"
      };

      const existingOrders = JSON.parse(localStorage.getItem("dashit_orders_history") || "[]");
      localStorage.setItem("dashit_orders_history", JSON.stringify([newOrder, ...existingOrders]));
      localStorage.setItem("dashit_active_order", JSON.stringify(newOrder));
      localStorage.removeItem("dashit_cart");
      localStorage.removeItem("dashit_checkout_data");

      setIsProcessing(false);
      router.push("/orders");
    }, 1500);
  };

  if (!checkoutData) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900 p-6 flex flex-col items-center justify-center space-y-3">
        <p className="text-xs text-slate-500 font-semibold">No active checkout session found.</p>
        <Link href="/" className="bg-[#0c831f] text-white font-extrabold text-xs px-5 py-2.5 rounded-2xl shadow">
          Return to Storefront
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3.5 flex items-center space-x-3 shadow-sm">
        <Link href="/cart" className="p-1.5 rounded-full text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-extrabold text-base text-slate-900">Select Payment Method</h1>
          <p className="text-[11px] text-slate-500 font-medium">Amount to pay: <b className="text-[#0c831f] font-mono">₹{checkoutData.grandTotal}</b></p>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 mt-4 space-y-4">
        {/* Delivery ETA & Address Banner */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 space-y-2 shadow-sm">
          <div className="flex items-center space-x-2 text-xs font-extrabold text-slate-900">
            <Clock className="w-4 h-4 text-[#0c831f]" />
            <span>Guaranteed 10-Minute Delivery in Anantnag</span>
          </div>
          <div className="flex items-start space-x-2 text-xs text-slate-600 pt-2 border-t border-slate-100">
            <MapPin className="w-4 h-4 text-[#0c831f] shrink-0 mt-0.5" />
            <span>Deliver to <b className="text-slate-900">{checkoutData.location.nickname}</b>: {checkoutData.location.address}</span>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-white border border-slate-200 rounded-3xl p-4 space-y-3 shadow-sm">
          <h3 className="font-extrabold text-xs text-slate-400 uppercase tracking-wider">Payment Options</h3>

          {/* Option 1: Instant UPI */}
          <div
            onClick={() => setSelectedMethod("upi")}
            className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all active:scale-98 ${
              selectedMethod === "upi"
                ? "bg-emerald-50 border-[#0c831f] text-slate-900 shadow-sm"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-[#0c831f] text-white rounded-2xl font-black text-xs">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900">Instant UPI (PhonePe / GPay / Paytm)</h4>
                <p className="text-[11px] text-slate-500 font-medium">Zero extra charges • Fastest checkout</p>
              </div>
            </div>
            {selectedMethod === "upi" && <CheckCircle2 className="w-5 h-5 text-[#0c831f]" />}
          </div>

          {/* Option 2: Cards */}
          <div
            onClick={() => setSelectedMethod("card")}
            className={`p-3.5 rounded-2xl border cursor-pointer flex items-center justify-between transition-all active:scale-98 ${
              selectedMethod === "card"
                ? "bg-emerald-50 border-[#0c831f] text-slate-900 shadow-sm"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-sky-600 text-white rounded-2xl font-black text-xs">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900">Credit / Debit Card</h4>
                <p className="text-[11px] text-slate-500 font-medium">Visa, Mastercard, RuPay supported</p>
              </div>
            </div>
            {selectedMethod === "card" && <CheckCircle2 className="w-5 h-5 text-[#0c831f]" />}
          </div>

          {/* Option 3: Cash on Delivery */}
          <div
            onClick={() => !isNightTime && setSelectedMethod("cod")}
            className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all active:scale-98 ${
              isNightTime ? "opacity-40 cursor-not-allowed bg-slate-100 border-slate-200" : "cursor-pointer"
            } ${
              selectedMethod === "cod"
                ? "bg-emerald-50 border-[#0c831f] text-slate-900 shadow-sm"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="p-2.5 bg-amber-500 text-white rounded-2xl font-black text-xs">
                <Banknote className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-slate-900">Cash on Delivery (COD)</h4>
                <p className="text-[11px] text-slate-500 font-medium">
                  {isNightTime ? "Disabled during Night Hours (10 PM - 6 AM)" : "Pay cash directly to rider upon doorstep delivery"}
                </p>
              </div>
            </div>
            {selectedMethod === "cod" && <CheckCircle2 className="w-5 h-5 text-[#0c831f]" />}
          </div>
        </div>

        {/* Security Info */}
        <div className="flex items-center justify-center space-x-2 text-[11px] text-slate-500 font-medium">
          <ShieldCheck className="w-4 h-4 text-[#0c831f]" />
          <span>Encrypted Razorpay Payment Gateway Protection</span>
        </div>

        {/* Pay & Place Order Button */}
        <button
          onClick={handlePlaceOrder}
          disabled={isProcessing}
          className="w-full bg-[#0c831f] hover:bg-emerald-800 text-white font-extrabold text-sm py-3.5 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center space-x-2"
        >
          {isProcessing ? (
            <span>Processing Order... 🎉</span>
          ) : (
            <span>Pay ₹{checkoutData.grandTotal} & Place Order</span>
          )}
        </button>
      </main>

      <BottomNav />
    </div>
  );
}
