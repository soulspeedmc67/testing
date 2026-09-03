import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { Home, RotateCcw, LayoutGrid, User } from "lucide-react";
import { useScrollChrome } from "../context/ScrollChromeContext";
import { hapticLight } from "../lib/haptics";

const STOREFRONT_TABS = ["/", "/order-again", "/categories"];

const NAV_ITEMS = [
  { id: "home", label: "Home", icon: Home, path: "/" },
  { id: "categories", label: "Categories", icon: LayoutGrid, path: "/categories" },
  { id: "order-again", label: "Order Again", icon: RotateCcw, path: "/order-again" },
];

export default function BottomNav({ forceHide = false }) {
  const router = useRouter();
  const currentPath = router.pathname;
  const { isNavVisible } = useScrollChrome();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleViewportResize = () => {
      if (window.visualViewport) {
        const heightDiff = window.innerHeight - window.visualViewport.height;
        setIsKeyboardOpen(heightDiff > 120);
      }
    };

    const handleFocusIn = (e) => {
      const tag = e.target.tagName?.toLowerCase();
      const type = e.target.type?.toLowerCase();
      if (tag === "input" || tag === "textarea") {
        if (type !== "checkbox" && type !== "radio") {
          setIsKeyboardOpen(true);
        }
      }
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        const active = document.activeElement?.tagName?.toLowerCase();
        if (active !== "input" && active !== "textarea") {
          setIsKeyboardOpen(false);
        }
      }, 100);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleViewportResize);
    }
    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleViewportResize);
      }
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  const isStorefront = STOREFRONT_TABS.includes(currentPath);
  const shouldHide = !isNavVisible || isKeyboardOpen || forceHide || !isStorefront;

  return (
    <motion.div
      initial={false}
      animate={{
        y: shouldHide ? 110 : 0,
        opacity: shouldHide ? 0 : 1,
      }}
      transition={{ type: "spring", stiffness: 320, damping: 28 }}
      className="fixed left-0 right-0 z-50 flex justify-center pointer-events-auto px-4"
      style={{
        bottom: "max(12px, calc(8px + env(safe-area-inset-bottom, 8px)))",
      }}
    >
      <nav className="relative max-w-[290px] w-full mx-auto bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-full p-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.06)] grid grid-cols-3 items-center select-none">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path || (item.id === "home" && currentPath === "/");

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                hapticLight();
                if (currentPath !== item.path) {
                  router.push(item.path);
                }
              }}
              className={`relative flex flex-col items-center justify-center w-full py-1 rounded-full transition-colors cursor-pointer touch-manipulation select-none ${
                isActive ? "text-[#061838]" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <div className="flex items-center justify-center">
                <Icon
                  className={`w-4 h-4 transition-transform ${
                    isActive ? "stroke-[2.8] scale-105 text-[#061838]" : "stroke-[2] text-slate-400"
                  }`}
                />
              </div>

              <span
                className={`text-[9.5px] mt-0.5 tracking-tight whitespace-nowrap ${
                  isActive ? "font-black text-[#061838]" : "font-semibold text-slate-500"
                }`}
              >
                {item.label}
              </span>

              {/* Minimal Active Indicator Dot in Dashit Sunset Orange */}
              {isActive && (
                <motion.span
                  layoutId="activeTabIndicator"
                  className="w-1.5 h-1.5 rounded-full bg-[#FF6B00] mt-0.5"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </nav>
    </motion.div>
  );
}
