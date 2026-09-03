import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { Home, RotateCcw, LayoutGrid, User } from "lucide-react";
import { useScrollChrome } from "../context/ScrollChromeContext";
import { hapticLight } from "../lib/haptics";

const STOREFRONT_TABS = ["/", "/order-again", "/categories", "/account", "/orders", "/search"];

const NAV_ITEMS = [
  { id: "home", label: "Home", icon: Home, path: "/" },
  { id: "categories", label: "Categories", icon: LayoutGrid, path: "/categories" },
  { id: "order-again", label: "Order Again", icon: RotateCcw, path: "/order-again" },
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
      className="fixed left-0 right-0 z-40 flex justify-center pointer-events-auto px-4"
      style={{
        bottom: "max(12px, calc(8px + env(safe-area-inset-bottom, 8px)))",
      }}
    >
      <nav className="max-w-[340px] w-full mx-auto bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-slate-200/90 dark:border-zinc-800 rounded-full px-2.5 py-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.12)] ring-1 ring-black/5 dark:ring-white/10 flex items-center justify-around">
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
                isActive ? "text-[#0c831f] dark:text-emerald-400" : "text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300"
              }`}
            >
              {/* Smooth sliding pill background */}
              {isActive && (
                <motion.div
                  layoutId="activeTabPill"
                  className="absolute inset-0 bg-emerald-50/90 dark:bg-emerald-950/50 rounded-full -z-10"
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}

              {/* Unique animated icon container */}
              <motion.div
                animate={
                  isActive
                    ? item.id === "categories"
                      ? { rotate: [0, -18, 14, -8, 0], scale: [1, 1.3, 0.92, 1.1, 1] }
                      : item.id === "order-again"
                      ? { rotate: [0, -180, -360], scale: [1, 1.28, 1] }
                      : item.id === "account"
                      ? { y: [0, -4, 1, 0], scale: [1, 1.25, 0.95, 1] }
                      : { scale: [1, 1.32, 0.9, 1.1, 1], y: [0, -3, 0] }
                    : { scale: 1, rotate: 0, y: 0 }
                }
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="flex items-center justify-center"
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? "stroke-[2.8] text-[#0c831f] dark:text-emerald-400" : "stroke-[2.2]"
                  }`}
                />
              </motion.div>

              <span
                className={`text-[9px] mt-0.5 tracking-tight whitespace-nowrap ${
                  isActive ? "font-black text-[#0c831f] dark:text-emerald-400" : "font-semibold text-slate-500 dark:text-zinc-400"
                }`}
              >
                {item.label}
              </span>

              {/* Active Dot Indicator */}
              {isActive && (
                <motion.span
                  layoutId="activeDot"
                  className="absolute -bottom-0.5 w-1.5 h-1 bg-[#0c831f] dark:bg-emerald-400 rounded-full shadow-2xs"
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
