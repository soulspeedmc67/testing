import { useState } from "react";
import { goBack } from "../lib/navigation";
import { useRouter } from "next/router";
import { ChevronLeft, Contact, AlertCircle } from "lucide-react";
import SEO from "../components/SEO";

export default function AddAddressPage() {
  const router = useRouter();
  const [city, setCity] = useState("");
  const [area, setArea] = useState("");
  const [completeAddress, setCompleteAddress] = useState("");
  const [mapsLink, setMapsLink] = useState("");
  const [contactType, setContactType] = useState("Someone else");
  const [receiverName, setReceiverName] = useState("");
  const [phone, setPhone] = useState("");
  const [addressLabel, setAddressLabel] = useState("Home");
  const [submitted, setSubmitted] = useState(false);

  const handleNext = (e) => {
    e.preventDefault();
    if (!completeAddress.trim()) {
      alert("Please enter your complete address");
      return;
    }
    // Save address in localStorage
    const saved = {
      nickname: addressLabel || "Home",
      address: [completeAddress, area, city].filter(Boolean).join(", "),
      lat: 33.735832,
      lng: 75.143614,
      phone: phone || "",
      receiver: receiverName || "Self"
    };
    try {
      localStorage.setItem("dashit_user_address", JSON.stringify(saved));
    } catch (err) {}

    router.push("/shop");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col justify-between dark:bg-surface dark:text-content">
      <SEO title="Add Delivery Address" noindex={true} />

      {/* Top Header */}
      <header className="bg-white border-b border-slate-100 px-4 pt-[calc(env(safe-area-inset-top,0px)+12px)] pb-3 flex items-center sticky top-0 z-30 shadow-xs dark:bg-surface dark:border-line-soft">
        <button
          type="button"
          onClick={() => goBack(router)}
          className="w-10 h-10 rounded-full border border-slate-200/90 flex items-center justify-center text-slate-700 active:scale-95 transition-transform dark:border-line/90 dark:text-content-secondary"
        >
          <ChevronLeft className="w-5 h-5 stroke-[2.5]" />
        </button>
        <h1 className="text-base font-extrabold text-slate-900 mx-auto -translate-x-5 dark:text-content">
          Add address details
        </h1>
      </header>

      {/* Main Content Form */}
      <main className="max-w-md mx-auto w-full px-4 py-4 space-y-4 grow">
        {/* Card 1: Address Details */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-4 shadow-xs space-y-3.5 dark:bg-surface-raised dark:border-line/90">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-content">Address details</h2>

          {/* Select a City */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-200/70 rounded-2xl dark:bg-surface-muted/60 dark:border-line/70">
            <div>
              <span className="text-xs font-bold text-slate-800 block dark:text-content">Select a city</span>
              <span className="text-[11px] font-semibold text-orange-700 dark:text-orange-400">{city}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                const c = prompt("Enter your city:", city);
                if (c) setCity(c);
              }}
              className="bg-white border border-slate-200 text-orange-700 font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-xs active:scale-95 dark:bg-surface-raised dark:border-line dark:text-orange-400 cursor-pointer"
            >
              Select
            </button>
          </div>

          {/* Select Area / Street */}
          <div className="flex items-center justify-between p-3.5 bg-slate-50/70 border border-slate-200/70 rounded-2xl dark:bg-surface-muted/60 dark:border-line/70">
            <div>
              <span className="text-xs font-bold text-slate-800 block dark:text-content">Select an area, street</span>
              <span className="text-[11px] font-semibold text-orange-700 dark:text-orange-400">{area}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                const a = prompt("Enter your area/street:", area);
                if (a) setArea(a);
              }}
              className="bg-white border border-slate-200 text-orange-700 font-extrabold text-xs px-3 py-1.5 rounded-xl shadow-xs active:scale-95 dark:bg-surface-raised dark:border-line dark:text-orange-400 cursor-pointer"
            >
              Select
            </button>
          </div>

          {/* Enter Complete Address */}
          <div>
            <div className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-3 focus-within:border-[#FF5B00] focus-within:bg-white transition-all dark:bg-surface-muted/60 dark:border-line/90 dark:focus-within:bg-surface-overlay">
              <input
                type="text"
                placeholder="Enter complete address*"
                value={completeAddress}
                onChange={(e) => setCompleteAddress(e.target.value)}
                className="w-full bg-transparent text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none dark:text-content dark:placeholder-content-faint"
              />
            </div>
            <p className="text-[10px] text-slate-400 font-medium mt-1 ml-2 dark:text-content-faint">
              Example: A-504, Shanti Heights, Near Bus Stand
            </p>
          </div>

          {/* Google Maps Link (optional) */}
          <div className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-3 focus-within:border-[#FF5B00] focus-within:bg-white transition-all dark:bg-surface-muted/60 dark:border-line/90 dark:focus-within:bg-surface-overlay">
            <input
              type="text"
              placeholder="Add google maps link (optional)"
              value={mapsLink}
              onChange={(e) => setMapsLink(e.target.value)}
              className="w-full bg-transparent text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none dark:text-content dark:placeholder-content-faint"
            />
          </div>
        </div>

        {/* Card 2: Contact Details */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-4 shadow-xs space-y-3.5 dark:bg-surface-raised dark:border-line/90">
          <h2 className="text-sm font-extrabold text-slate-900 dark:text-content">Contact details</h2>

          {/* Radio toggle: Myself vs Someone else */}
          <div className="flex items-center space-x-6 px-1">
            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="radio"
                name="contactType"
                checked={contactType === "Myself"}
                onChange={() => setContactType("Myself")}
                className="w-4 h-4 text-[#FF5B00] focus:ring-[#FF5B00]"
              />
              <span className="text-xs font-bold text-slate-700 dark:text-content-secondary">Myself</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="radio"
                name="contactType"
                checked={contactType === "Someone else"}
                onChange={() => setContactType("Someone else")}
                className="w-4 h-4 text-[#FF5B00] focus:ring-[#FF5B00]"
              />
              <span className="text-xs font-bold text-slate-700 dark:text-content-secondary">Someone else</span>
            </label>
          </div>

          {/* Receiver Name */}
          <div className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-3 focus-within:border-[#FF5B00] focus-within:bg-white transition-all dark:bg-surface-muted/60 dark:border-line/90 dark:focus-within:bg-surface-overlay">
            <input
              type="text"
              placeholder="Receiver's name*"
              value={receiverName}
              onChange={(e) => setReceiverName(e.target.value)}
              className="w-full bg-transparent text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none dark:text-content dark:placeholder-content-faint"
            />
          </div>

          {/* Receiver Phone Number with +91 prefix and contact book icon */}
          <div className="flex items-center bg-slate-50/70 border border-slate-200/90 rounded-2xl px-3 py-2.5 focus-within:border-[#FF5B00] focus-within:bg-white transition-all dark:bg-surface-muted/60 dark:border-line/90 dark:focus-within:bg-surface-overlay">
            <span className="text-xs font-black text-slate-700 mr-2 dark:text-content">+91</span>
            <input
              type="tel"
              inputMode="numeric"
              maxLength={10}
              placeholder="Receiver's phone number*"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))}
              className="w-full bg-transparent text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none font-mono dark:text-content dark:placeholder-content-faint"
            />
            <Contact className="w-5 h-5 text-slate-500 shrink-0 ml-2 dark:text-content-muted" />
          </div>
          <div className="flex items-start space-x-2 px-0.5">
            <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5 dark:text-content-faint" />
            <p className="text-[11px] font-medium leading-snug text-slate-500 dark:text-content-muted">
              Please verify your number carefully. Our delivery driver will call this number upon arrival.
            </p>
          </div>

          {/* Save as Address (optional) */}
          <div className="bg-slate-50/70 border border-slate-200/90 rounded-2xl p-3 focus-within:border-[#FF5B00] focus-within:bg-white transition-all dark:bg-surface-muted/60 dark:border-line/90 dark:focus-within:bg-surface-overlay">
            <input
              type="text"
              placeholder="Save as address (optional, e.g. Home, Work)"
              value={addressLabel}
              onChange={(e) => setAddressLabel(e.target.value)}
              className="w-full bg-transparent text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none dark:text-content dark:placeholder-content-faint"
            />
          </div>
        </div>
      </main>

      {/* Sticky Bottom Next Button with safe area padding */}
      <footer className="sticky bottom-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 py-3 pb-[max(16px,calc(12px+env(safe-area-inset-bottom,16px)))] max-w-md mx-auto w-full dark:bg-surface/95 dark:border-line">
        <button
          type="button"
          onClick={handleNext}
          className="w-full bg-[#FF5B00] hover:bg-[#E04E00] text-white font-extrabold text-sm py-3.5 rounded-2xl shadow-lg shadow-orange-700/20 active:scale-[0.98] transition-all"
        >
          Next
        </button>
      </footer>
    </div>
  );
}
