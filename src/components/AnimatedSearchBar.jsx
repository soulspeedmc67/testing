import { useState, useEffect } from "react";
import { Search, Mic } from "lucide-react";

const SEARCH_PLACEHOLDERS = [
  'Search "lavas bread"',
  'Search "coconut water"',
  'Search "pooja thali"',
  'Search "flower jewellery"',
  'Search "cadbury silk"',
  'Search "amul butter"',
  'Search "maggi noodles"'
];

export default function AnimatedSearchBar({ value, onChange, onFocus, onBlur, isFocused }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (value) return;
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % SEARCH_PLACEHOLDERS.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [value]);

  return (
    <div
      className={`relative flex items-center bg-white rounded-2xl p-3 shadow-md border border-amber-200/80 transition-all duration-300 ${
        isFocused ? "ring-2 ring-[#FF5B00] scale-[1.01]" : ""
      }`}
    >
      <Search className="w-4 h-4 text-slate-400 mr-2.5 shrink-0" />

      <div className="relative w-full flex items-center overflow-hidden h-5">
        <input
          type="text"
          value={value}
          onFocus={onFocus}
          onBlur={onBlur}
          onChange={onChange}
          className="w-full bg-transparent text-xs font-semibold text-slate-900 focus:outline-none z-10"
        />

        {!value && (
          <span
            key={index}
            className="absolute left-0 text-xs font-semibold text-slate-400 pointer-events-none animate-search-text truncate"
          >
            {SEARCH_PLACEHOLDERS[index]}
          </span>
        )}
      </div>

      <Mic className="w-4 h-4 text-slate-500 ml-2 shrink-0 cursor-pointer hover:text-[#FF5B00] transition-colors" />
    </div>
  );
}
