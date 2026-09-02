import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { X, MapPin, User, Phone, Home, Check } from "lucide-react";
import LoginProductMarquee from "../components/LoginProductMarquee";

export default function LoginPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Mobile & Login, 2: OTP, 3: Address & Profile Setup (Skippable)
  const [mobile, setMobile] = useState("9622720283");
  const [otpInput, setOtpInput] = useState("");

  // User details state
  const [fullName, setFullName] = useState("Azan Iqbal Mir");
  const [flatNo, setFlatNo] = useState("House #12, Near Petrol Pump");
  const [area, setArea] = useState("Nai Basti");
  const [city, setCity] = useState("Anantnag");
  const [pincode, setPincode] = useState("192101");

  const handleSendOtp = (e) => {
    e.preventDefault();
    if (mobile.length < 10) {
      alert("Please enter a valid 10-digit mobile number");
      return;
    }
    setStep(2);
  };

  const handleVerifyOtp = () => {
    if (otpInput === "1234" || otpInput.length === 4) {
      // Advance to skippable address setup step
      setStep(3);
    } else {
      alert("Invalid OTP! Use dummy OTP code: 1234");
    }
  };

  const handleCompleteSetup = () => {
    const userData = {
      name: fullName || "Azan Iqbal Mir",
      mobile: mobile || "9622720283",
      address: `${flatNo}, ${area}, ${city} - ${pincode}`,
      isLoggedIn: true
    };
    localStorage.setItem("dashit_user", JSON.stringify(userData));
    router.push("/");
  };

  const handleSkipSetup = () => {
    const userData = {
      name: "Guest User",
      mobile: mobile || "9622720283",
      address: "Nai Basti, Near Petrol Pump, Anantnag",
      isLoggedIn: true
    };
    localStorage.setItem("dashit_user", JSON.stringify(userData));
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between overflow-hidden">
      {/* Top Section with Continuous Product Conveyor */}
      <div className="relative pt-4 pb-2">
        {/* Skip Login Pill Button */}
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={handleSkipSetup}
            className="bg-white/90 hover:bg-white text-slate-700 text-xs font-extrabold px-4 py-1.5 rounded-full shadow-sm border border-slate-200 transition-all active:scale-95"
          >
            Skip for now
          </button>
        </div>

        {/* Infinite Product Marquee */}
        <LoginProductMarquee />
      </div>

      {/* Main Login / Signup Form Sheet */}
      <div className="bg-white rounded-t-[32px] shadow-2xl border-t border-slate-200 p-6 max-w-md mx-auto w-full space-y-5 animate-slide-up">
        {/* Step 1: Phone Login */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="flex justify-center">
              <div className="bg-[#061838] text-white font-black px-5 py-2 rounded-2xl text-xl tracking-tight shadow-md flex items-center space-x-1">
                <span className="font-logo text-[#ea580c]">DASH</span>
                <span className="font-logo text-[#0284c7]">it</span>
              </div>
            </div>

            <div className="text-center space-y-1">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">India's last minute app</h1>
              <p className="text-xs font-semibold text-slate-500">Log in or sign up</p>
            </div>

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
        )}

        {/* Step 2: OTP Verification */}
        {step === 2 && (
          <div className="space-y-4 text-center">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Verify Mobile</span>
              <button onClick={() => setStep(1)} className="p-1 text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="font-extrabold text-base text-slate-900">Enter OTP Code</h3>
              <p className="text-xs text-slate-500 mt-1">Sent via SMS to <b className="text-slate-800">+91 {mobile}</b></p>
              <p className="text-[11px] text-[#0c831f] font-bold mt-1 bg-emerald-50 py-1 px-2 rounded-lg inline-block">
                Dummy OTP Code: 1234
              </p>
            </div>

            <div className="flex justify-center">
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
              Verify OTP
            </button>
          </div>
        )}

        {/* Step 3: Skippable Sign-Up Profile & Address Setup */}
        {step === 3 && (
          <div className="space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div>
                <h3 className="font-black text-sm text-slate-900">Complete Profile & Address</h3>
                <p className="text-[11px] font-semibold text-slate-500">Quick setup for 10-minute doorstep delivery</p>
              </div>
              <button
                onClick={handleSkipSetup}
                className="text-xs font-extrabold text-slate-400 hover:text-slate-700 underline"
              >
                Skip
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Full Name</label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Azan Iqbal Mir"
                  className="w-full bg-slate-50 border border-slate-200 font-semibold p-2.5 rounded-xl focus:outline-none focus:border-[#0c831f]"
                />
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">House / Flat / Street Address</label>
                <input
                  type="text"
                  value={flatNo}
                  onChange={(e) => setFlatNo(e.target.value)}
                  placeholder="e.g. House #12, Near Petrol Pump"
                  className="w-full bg-slate-50 border border-slate-200 font-semibold p-2.5 rounded-xl focus:outline-none focus:border-[#0c831f]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Area / Locality</label>
                  <input
                    type="text"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    placeholder="e.g. Nai Basti"
                    className="w-full bg-slate-50 border border-slate-200 font-semibold p-2.5 rounded-xl focus:outline-none focus:border-[#0c831f]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">City & Pincode</label>
                  <input
                    type="text"
                    value={`${city} - ${pincode}`}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Anantnag - 192101"
                    className="w-full bg-slate-50 border border-slate-200 font-semibold p-2.5 rounded-xl focus:outline-none focus:border-[#0c831f]"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 flex space-x-2">
              <button
                onClick={handleSkipSetup}
                className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs py-3 rounded-2xl transition-all"
              >
                Skip
              </button>
              <button
                onClick={handleCompleteSetup}
                className="w-2/3 bg-[#0c831f] hover:bg-emerald-800 text-white font-extrabold text-xs py-3 rounded-2xl shadow-md transition-all active:scale-95 flex items-center justify-center space-x-1"
              >
                <Check className="w-4 h-4" />
                <span>Save Profile</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
