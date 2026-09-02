import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { X, MapPin, User as UserIcon, Home, Check } from "lucide-react";
import LoginProductMarquee from "../components/LoginProductMarquee";

export default function LoginPage() {
  const router = useRouter();
  const [mobile, setMobile] = useState("9622720283");
  const [step, setStep] = useState(1); // 1: Mobile, 2: OTP, 3: Address Onboarding
  const [otpInput, setOtpInput] = useState("");

  // Address Onboarding Form State
  const [name, setName] = useState("Azan Iqbal Mir");
  const [houseNo, setHouseNo] = useState("House #42, Nai Basti");
  const [landmark, setLandmark] = useState("Near Petrol Pump");
  const [city, setCity] = useState("Anantnag");

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
      setStep(3); // Proceed to Address Onboarding Setup
    } else {
      alert("Invalid OTP! Use dummy OTP code: 1234");
    }
  };

  const handleCompleteSetup = () => {
    localStorage.setItem("dashit_user", JSON.stringify({
      name: name || "Azan Iqbal Mir",
      mobile: mobile || "9622720283",
      address: `${houseNo}, ${landmark}, ${city}`,
      isLoggedIn: true
    }));
    router.push("/");
  };

  const handleSkipSetup = () => {
    localStorage.setItem("dashit_user", JSON.stringify({
      name: "Azan Iqbal Mir",
      mobile: mobile || "9622720283",
      address: "Nai Basti, Anantnag",
      isLoggedIn: true
    }));
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
            Skip login
          </button>
        </div>

        {/* Infinite Product Marquee */}
        <LoginProductMarquee />
      </div>

      {/* Main Form Sheet */}
      <div className="bg-white rounded-t-[32px] shadow-2xl border-t border-slate-200 p-6 max-w-md mx-auto w-full space-y-5 animate-slide-up">
        {/* Standout Logo */}
        <div className="flex justify-center">
          <div className="bg-[#091b36] text-white font-black px-5 py-2.5 rounded-2xl text-2xl tracking-tight shadow-md flex items-center space-x-1 border border-slate-700">
            <span className="font-logo text-[#ea580c]">DASH</span>
            <span className="font-logo text-[#0284c7]">it</span>
          </div>
        </div>

        {/* STEP 1: Mobile Input */}
        {step === 1 && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <div className="text-center space-y-1">
              <h1 className="text-xl font-black text-slate-900 tracking-tight">India's last minute app</h1>
              <p className="text-xs font-semibold text-slate-500">Log in or sign up</p>
            </div>

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
              className="w-full bg-[#0c831f] hover:bg-emerald-800 text-white font-black text-xs py-3.5 rounded-2xl shadow-lg transition-all active:scale-95"
            >
              Continue
            </button>
          </form>
        )}

        {/* STEP 2: Dummy OTP Verification Modal */}
        {step === 2 && (
          <div className="space-y-4 text-center">
            <div>
              <h3 className="font-extrabold text-base text-slate-900">Enter Verification Code</h3>
              <p className="text-xs text-slate-500 mt-1">Sent via SMS to <b className="text-slate-800">+91 {mobile}</b></p>
              <p className="text-[11px] text-[#0c831f] font-bold mt-1.5 bg-emerald-50 py-1 px-2.5 rounded-lg inline-block">
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
                className="w-36 text-center text-2xl font-mono font-black tracking-widest bg-slate-100 border border-slate-300 rounded-2xl p-3 focus:outline-none focus:border-[#0c831f]"
              />
            </div>

            <button
              onClick={handleVerifyOtp}
              className="w-full bg-[#0c831f] hover:bg-emerald-800 text-white font-extrabold text-xs py-3.5 rounded-2xl shadow-md transition-all active:scale-95"
            >
              Verify & Proceed to Onboarding
            </button>
          </div>
        )}

        {/* STEP 3: Skippable Address Setup Onboarding */}
        {step === 3 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-black text-base text-slate-900">Delivery Address Setup</h3>
                <p className="text-xs text-slate-500">Provide details for instant 10-minute darkstore dispatch</p>
              </div>

              <button
                onClick={handleSkipSetup}
                className="text-xs font-extrabold text-slate-400 hover:text-slate-700 bg-slate-100 px-3 py-1 rounded-full"
              >
                Skip
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-900 focus:outline-none focus:border-[#0c831f]"
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">House / Flat / Building No.</label>
                <input
                  type="text"
                  value={houseNo}
                  onChange={(e) => setHouseNo(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-900 focus:outline-none focus:border-[#0c831f]"
                />
              </div>

              <div>
                <label className="font-extrabold text-slate-700 block mb-1">Landmark / Area</label>
                <input
                  type="text"
                  value={landmark}
                  onChange={(e) => setLandmark(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-semibold text-slate-900 focus:outline-none focus:border-[#0c831f]"
                />
              </div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={handleSkipSetup}
                className="grow bg-slate-100 hover:bg-slate-200 text-slate-700 font-extrabold text-xs py-3 rounded-2xl transition-all"
              >
                Skip for Now
              </button>
              <button
                onClick={handleCompleteSetup}
                className="grow bg-[#0c831f] hover:bg-emerald-800 text-white font-extrabold text-xs py-3 rounded-2xl shadow-md transition-all flex items-center justify-center space-x-1"
              >
                <Check className="w-4 h-4" />
                <span>Save & Continue</span>
              </button>
            </div>
          </div>
        )}

        <p className="text-[11px] text-center text-slate-400 font-medium pt-1">
          By continuing, you agree to our <a href="#" className="underline text-slate-600 font-bold">Terms of Service</a> & <a href="#" className="underline text-slate-600 font-bold">Privacy Policy</a>
        </p>
      </div>
    </div>
  );
}
