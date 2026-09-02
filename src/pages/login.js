import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { X } from "lucide-react";
import LoginProductMarquee from "../components/LoginProductMarquee";

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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between overflow-hidden">
      {/* Top Section with Continuous Product Conveyor */}
      <div className="relative pt-4 pb-2">
        {/* Skip Login Pill Button */}
        <div className="absolute top-4 right-4 z-20">
          <Link
            href="/"
            className="bg-white/90 hover:bg-white text-slate-700 text-xs font-extrabold px-4 py-1.5 rounded-full shadow-sm border border-slate-200 transition-all active:scale-95"
          >
            Skip login
          </Link>
        </div>

        {/* Infinite Product Marquee */}
        <LoginProductMarquee />
      </div>

      {/* Main Login Form Sheet */}
      <div className="bg-white rounded-t-[32px] shadow-2xl border-t border-slate-200 p-6 max-w-md mx-auto w-full space-y-5 animate-slide-up">
        {/* Standout Logo */}
        <div className="flex justify-center">
          <div className="bg-[#f7c400] text-slate-950 font-black px-5 py-2.5 rounded-2xl text-2xl tracking-tight shadow-md flex items-center space-x-0.5 border border-amber-300">
            <span className="font-logo text-[#ea580c] logo-shadow">DASH</span>
            <span className="font-logo text-[#0284c7] logo-shadow">it</span>
          </div>
        </div>

        {/* Heading */}
        <div className="text-center space-y-1">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">India's last minute app</h1>
          <p className="text-xs font-semibold text-slate-500">Log in or sign up</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div className="flex items-center bg-slate-50 border border-slate-300 rounded-2xl p-3 focus-within:border-[#0c831f] focus-within:ring-2 focus-within:ring-emerald-500/20 transition-all">
            <span className="text-sm font-extrabold text-slate-700 mr-2 border-r border-slate-300 pr-2">+91</span>
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
            className="w-full bg-[#0c831f] hover:bg-emerald-800 text-white font-black text-xs py-3.5 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center space-x-2"
          >
            <span>Continue</span>
          </button>
        </form>

        <p className="text-[11px] text-center text-slate-400 font-medium">
          By continuing, you agree to our <a href="#" className="underline text-slate-600 font-bold">Terms of Service</a> & <a href="#" className="underline text-slate-600 font-bold">Privacy Policy</a>
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
              <p className="text-[11px] text-[#0c831f] font-bold mt-1 bg-emerald-50 py-1 px-2 rounded-lg inline-block">
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
                className="w-36 text-center text-xl font-mono font-bold tracking-widest bg-slate-100 border border-slate-300 rounded-xl p-2.5 focus:outline-none focus:border-[#0c831f]"
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
