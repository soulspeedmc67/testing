import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { Home, RotateCcw, LayoutGrid, User } from "lucide-react";
import { useScrollChrome } from "../context/ScrollChromeContext";
import { hapticLight } from "../lib/haptics";

const STOREFRONT_TABS = ["/", "/order-again", "/categories", "/account", "/orders", "/search"];

const NAV_ITEMS = [
  { id: "home", label: "Home", icon: Home, path: "/" },
  { id: "order-again", label: "Order Again", icon: RotateCcw, path: "/order-again" },
  { id: "categories", label: "Categories", icon: LayoutGrid, path: "/categories" },
  { id: "account", label: "Account", icon: User, path: "/account" },
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
      className="fixed left-0 right-0 z-40 flex justify-center pointer-events-none px-4"
      style={{
        bottom: "max(12px, calc(8px + env(safe-area-inset-bottom, 8px)))",
      }}
    >
      <nav className="max-w-[340px] w-full mx-auto bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-full px-2.5 py-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.12)] ring-1 ring-black/5 flex items-center justify-around pointer-events-auto">
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
              className={`relative flex flex-col items-center justify-center py-1.5 px-3.5 rounded-full transition-colors cursor-pointer select-none ${
                isActive ? "text-[#0c831f]" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              {/* Smooth sliding pill background */}
              {isActive && (
                <motion.div
                  layoutId="activeTabPill"
                  className="absolute inset-0 bg-emerald-50/90 rounded-full -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}

              <Icon
                className={`w-4 h-4 transition-transform duration-200 ${
                  isActive ? "stroke-[2.8] scale-105 text-[#0c831f]" : "stroke-[2.2]"
                }`}
              />
              <span
                className={`text-[9px] mt-0.5 tracking-tight whitespace-nowrap ${
                  isActive ? "font-black text-[#0c831f]" : "font-semibold text-slate-500"
                }`}
              >
                {item.label}
              </span>

              {/* Active Dot Indicator */}
              {isActive && (
                <motion.span
                  layoutId="activeDot"
                  className="absolute -bottom-0.5 w-1.5 h-1 bg-[#0c831f] rounded-full shadow-2xs"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </nav>
    </motion.div>
  );
}
