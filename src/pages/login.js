import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ArrowRight, CheckCircle2, ShieldCheck, X } from "lucide-react";

const HERO_GRID_ITEMS = [
  { img: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=150&auto=format&fit=crop&q=80", bg: "bg-emerald-100/60", label: "Pulses & Dal" },
  { img: "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&auto=format&fit=crop&q=80", bg: "bg-green-100/60", label: "Fresh Vegetables" },
  { img: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=150&auto=format&fit=crop&q=80", bg: "bg-sky-100/60", label: "Fresh Milk" },
  { img: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?w=150&auto=format&fit=crop&q=80", bg: "bg-amber-100/60", label: "Bakery Bread" },
  { img: "https://images.unsplash.com/photo-1621939514649-280e2ee25f60?w=150&auto=format&fit=crop&q=80", bg: "bg-yellow-100/60", label: "Snacks & Chips" },
  { img: "https://images.unsplash.com/photo-1527661591475-527312dd65f5?w=150&auto=format&fit=crop&q=80", bg: "bg-rose-100/60", label: "Beverages" },
  { img: "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=150&auto=format&fit=crop&q=80", bg: "bg-purple-100/60", label: "Essentials" },
  { img: "https://images.unsplash.com/photo-1550989460-0adf9ea622e2?w=150&auto=format&fit=crop&q=80", bg: "bg-orange-100/60", label: "Atta & Oil" },
];

export default function LoginPage() {
  const router = useRouter();
  const [mobile, setMobile] = useState("9622720283");
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpInput, setOtpInput] = useState("");

  const handleSendOtp = (e) => {
    e.preventDefault();
    if (mobile.length < 10) {
      alert("Please enter a valid 10-digit mobile number");
      return;
    }
    setShowOtpModal(true);
  };

  const handleVerifyOtp = () => {
    if (otpInput === "1234" || otpInput.length === 4) {
      localStorage.setItem("dashit_user", JSON.stringify({
        name: "Azan Iqbal Mir",
        mobile: mobile || "9622720283",
        isLoggedIn: true
      }));
      router.push("/");
    } else {
      alert("Invalid OTP! Use dummy OTP code: 1234");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between">
      {/* Top Banner with Product Grid */}
      <div className="relative pt-4 pb-6 overflow-hidden">
        {/* Skip Login Pill Button */}
        <div className="absolute top-4 right-4 z-20">
          <Link
            href="/"
            className="bg-slate-200/80 hover:bg-slate-300 backdrop-blur text-slate-700 text-xs font-bold px-4 py-1.5 rounded-full transition-all active:scale-95"
          >
            Skip login
          </Link>
        </div>

        {/* Product Grid Collage */}
        <div className="grid grid-cols-4 gap-3 px-4 pt-8 max-w-md mx-auto opacity-90">
          {HERO_GRID_ITEMS.map((item, idx) => (
            <div
              key={idx}
              className={`${item.bg} p-2 rounded-2xl flex items-center justify-center h-20 shadow-sm border border-white/80 transform hover:scale-105 transition-transform`}
            >
              <img src={item.img} alt={item.label} className="h-14 w-14 object-contain rounded-lg" />
            </div>
          ))}
        </div>
      </div>

      {/* Main Login Form Sheet */}
      <div className="bg-white rounded-t-3xl shadow-2xl border-t border-slate-100 p-6 max-w-md mx-auto w-full space-y-5 animate-slide-up">
        {/* Blinkit-style Logo with DASH Orangish + it Bluish + Bold Shadow */}
        <div className="flex justify-center">
          <div className="bg-[#f7c400] text-slate-950 font-black px-5 py-2.5 rounded-2xl text-2xl tracking-tight shadow-md flex items-center space-x-0.5 border border-amber-300">
            <span className="text-[#ea580c] logo-shadow">DASH</span>
            <span className="text-[#0284c7] logo-shadow">it</span>
          </div>
        </div>

        {/* Heading */}
        <div className="text-center space-y-1">
          <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">India's last minute app</h1>
          <p className="text-xs font-medium text-slate-500">Log in or sign up</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div className="flex items-center bg-slate-50 border border-slate-300 rounded-2xl p-3 focus-within:border-emerald-600 focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
            <span className="text-sm font-bold text-slate-700 mr-2 border-r border-slate-300 pr-2">+91</span>
            <input
              type="tel"
              maxLength={10}
              placeholder="Enter mobile number"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className="bg-transparent text-sm font-bold text-slate-900 w-full focus:outline-none placeholder-slate-400"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-[#0c831f] hover:bg-emerald-800 text-white font-extrabold text-sm py-3.5 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center space-x-2"
          >
            <span>Continue</span>
          </button>
        </form>

        <p className="text-[11px] text-center text-slate-400 font-medium">
          By continuing, you agree to our <a href="#" className="underline text-slate-600">Terms of Service</a> & <a href="#" className="underline text-slate-600">Privacy Policy</a>
        </p>
      </div>

      {/* Dummy OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 w-full max-w-xs space-y-4 text-center shadow-2xl border border-slate-100 animate-modal-pop">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verify Mobile</span>
              <button onClick={() => setShowOtpModal(false)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="font-extrabold text-base text-slate-900">Enter OTP Code</h3>
              <p className="text-xs text-slate-500 mt-1">Sent via SMS to <b className="text-slate-800">+91 {mobile}</b></p>
              <p className="text-[11px] text-emerald-600 font-bold mt-1 bg-emerald-50 py-1 px-2 rounded-lg inline-block">
                Dummy OTP: 1234
              </p>
            </div>

            <div className="flex justify-center space-x-2">
              <input
                type="text"
                maxLength={4}
                value={otpInput}
                onChange={(e) => setOtpInput(e.target.value)}
                placeholder="1234"
                className="w-36 text-center text-xl font-mono font-bold tracking-widest bg-slate-100 border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:border-emerald-600"
              />
            </div>

            <button
              onClick={handleVerifyOtp}
              className="w-full bg-[#0c831f] hover:bg-emerald-800 text-white font-extrabold text-xs py-3 rounded-xl shadow-md transition-all active:scale-95"
            >
              Verify & Login
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
