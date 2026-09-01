import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowLeft, CheckCircle2, ShieldCheck, CreditCard, Banknote, Zap, MapPin, Clock } from "lucide-react";
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
      try {
        setCheckoutData(JSON.parse(data));
      } catch (e) {}
    }
  }, []);

  const handlePlaceOrder = () => {
    if (!checkoutData) return;
    setIsProcessing(true);

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

      // Save order to history
      const existingOrders = JSON.parse(localStorage.getItem("dashit_orders_history") || "[]");
      localStorage.setItem("dashit_orders_history", JSON.stringify([newOrder, ...existingOrders]));
      localStorage.setItem("dashit_active_order", JSON.stringify(newOrder));
      localStorage.removeItem("dashit_cart");
      localStorage.removeItem("dashit_checkout_data");

      setIsProcessing(false);
      router.push("/account");
    }, 1500);
  };

  if (!checkoutData) {
    return (
      <div className="min-h-screen bg-[#09090b] text-zinc-100 p-6 flex flex-col items-center justify-center space-y-3">
        <p className="text-xs text-zinc-400">No active checkout session found.</p>
        <Link href="/" className="bg-orange-500 text-zinc-950 font-bold text-xs px-4 py-2 rounded-xl">
          Return to Storefront
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 font-sans antialiased pb-28">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[#09090b]/90 backdrop-blur-xl border-b border-zinc-800/80 px-4 py-3.5 flex items-center space-x-3">
        <Link href="/cart" className="p-1 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="font-bold text-base text-zinc-100">Select Payment Method</h1>
          <p className="text-[11px] text-zinc-400">Amount to pay: <b className="text-orange-400 font-mono">₹{checkoutData.grandTotal}</b></p>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 mt-4 space-y-4">
        {/* Delivery ETA & Address Banner */}
        <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-4 space-y-2">
          <div className="flex items-center space-x-2 text-xs font-bold text-zinc-200">
            <Clock className="w-4 h-4 text-orange-500" />
            <span>Guaranteed 10-Minute Delivery (ETA: 13 mins)</span>
          </div>
          <div className="flex items-start space-x-2 text-xs text-zinc-400 pt-1 border-t border-zinc-800/60">
            <MapPin className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
            <span>Deliver to <b className="text-zinc-200">{checkoutData.location.nickname}</b>: {checkoutData.location.address}</span>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="bg-zinc-900/80 border border-zinc-800/90 rounded-2xl p-4 space-y-3">
          <h3 className="font-bold text-xs text-zinc-300 uppercase tracking-wider">Payment Gateway Options</h3>

          {/* Option 1: Instant UPI */}
          <div
            onClick={() => setSelectedMethod("upi")}
            className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
              selectedMethod === "upi"
                ? "bg-orange-500/10 border-orange-500/50 text-zinc-100"
                : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-500 text-zinc-950 rounded-xl font-black text-xs">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-zinc-100">Instant UPI (PhonePe / GPay / Paytm)</h4>
                <p className="text-[11px] text-zinc-400">Zero extra charges • Fastest checkout</p>
              </div>
            </div>
            {selectedMethod === "upi" && <CheckCircle2 className="w-5 h-5 text-orange-500" />}
          </div>

          {/* Option 2: Cards */}
          <div
            onClick={() => setSelectedMethod("card")}
            className={`p-3.5 rounded-xl border cursor-pointer flex items-center justify-between transition-all ${
              selectedMethod === "card"
                ? "bg-orange-500/10 border-orange-500/50 text-zinc-100"
                : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-sky-500 text-zinc-950 rounded-xl font-black text-xs">
                <CreditCard className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-zinc-100">Credit / Debit Card</h4>
                <p className="text-[11px] text-zinc-400">Visa, Mastercard, RuPay supported</p>
              </div>
            </div>
            {selectedMethod === "card" && <CheckCircle2 className="w-5 h-5 text-orange-500" />}
          </div>

          {/* Option 3: Cash on Delivery */}
          <div
            onClick={() => !isNightTime && setSelectedMethod("cod")}
            className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
              isNightTime ? "opacity-40 cursor-not-allowed bg-zinc-950/40 border-zinc-800" : "cursor-pointer"
            } ${
              selectedMethod === "cod"
                ? "bg-orange-500/10 border-orange-500/50 text-zinc-100"
                : "bg-zinc-950/60 border-zinc-800/80 text-zinc-400 hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-500 text-zinc-950 rounded-xl font-black text-xs">
                <Banknote className="w-4 h-4" />
              </div>
              <div>
                <h4 className="font-bold text-xs text-zinc-100">Cash on Delivery (COD)</h4>
                <p className="text-[11px] text-zinc-400">
                  {isNightTime ? "Disabled during Night Hours (10 PM - 6 AM)" : "Pay cash directly to rider upon doorstep delivery"}
                </p>
              </div>
            </div>
            {selectedMethod === "cod" && <CheckCircle2 className="w-5 h-5 text-orange-500" />}
          </div>
        </div>

        {/* Security Info */}
        <div className="flex items-center justify-center space-x-2 text-[11px] text-zinc-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Encrypted Razorpay Payment Gateway Protection</span>
        </div>

        {/* Pay & Place Order Button */}
        <button
          onClick={handlePlaceOrder}
          disabled={isProcessing}
          className="w-full bg-orange-500 hover:bg-orange-400 text-zinc-950 font-bold text-sm py-3.5 rounded-xl shadow-xl transition-all flex items-center justify-center space-x-2"
        >
          {isProcessing ? (
            <span>Processing Order...</span>
          ) : (
            <span>Pay ₹{checkoutData.grandTotal} & Place Order</span>
          )}
        </button>
      </main>

      <BottomNav />
    </div>
  );
}
