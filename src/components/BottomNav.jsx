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
  const [animatingTab, setAnimatingTab] = useState(null);

  const triggerIconAnimation = (tabId) => {
    setAnimatingTab(tabId);
    setTimeout(() => setAnimatingTab(null), 600);
  };

  return (
    <motion.div
      initial={false}
      animate={{
        y: shouldHide ? 110 : 0,
        opacity: shouldHide ? 0 : 1,
      }}
      transition={{
        duration: 0.45,
        ease: [0.16, 1, 0.3, 1],
      }}
      className="fixed left-0 right-0 z-50 flex justify-center pointer-events-auto px-4"
      style={{
        bottom: "max(12px, calc(8px + env(safe-area-inset-bottom, 8px)))",
      }}
    >
      <nav className="relative max-w-[290px] w-full mx-auto bg-white/95 backdrop-blur-md border border-slate-200/90 rounded-full p-1.5 shadow-[0_4px_16px_rgba(0,0,0,0.06)] grid grid-cols-3 items-center select-none">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path || (item.id === "home" && currentPath === "/");
          const isAnimating = animatingTab === item.id || isActive;

          return (
            <motion.button
              key={item.id}
              type="button"
              whileTap={{ scale: 0.86 }}
              whileHover={{ scale: 1.03 }}
              transition={{ type: "spring", stiffness: 450, damping: 24 }}
              onClick={() => {
                hapticLight();
                triggerIconAnimation(item.id);
                if (currentPath !== item.path) {
                  router.push(item.path);
                }
              }}
              className={`relative flex flex-col items-center justify-center w-full py-1 rounded-full cursor-pointer touch-manipulation select-none ${
                isActive ? "text-[#061838]" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              <motion.div
                key={`${item.id}-${animatingTab === item.id ? "anim" : "static"}`}
                className="flex items-center justify-center relative"
                animate={
                  isAnimating
                    ? item.id === "order-again"
                      ? { rotate: [0, -180, -360], scale: [1, 1.25, 1] }
                      : item.id === "categories"
                      ? { scale: [1, 1.22, 1], rotate: [0, -8, 6, 0] }
                      : { scale: [1, 1.2, 1], y: [0, -3.5, 0] }
                    : { scale: 1, y: 0, rotate: 0 }
                }
                transition={{
                  type: "spring",
                  stiffness: 350,
                  damping: 20,
                  mass: 0.6,
                }}
              >
                <Icon
                  className={`w-4 h-4 transition-colors duration-250 ${
                    isActive ? "stroke-[2.8] text-[#061838]" : "stroke-[2] text-slate-400"
                  }`}
                />
              </motion.div>

              <motion.span
                animate={{ scale: isActive ? 1.04 : 1 }}
                transition={{ duration: 0.2 }}
                className={`text-[9.5px] mt-0.5 tracking-tight whitespace-nowrap transition-colors duration-250 ${
                  isActive ? "font-black text-[#061838]" : "font-semibold text-slate-500"
                }`}
              >
                {item.label}
              </motion.span>

              {/* Minimal Active Indicator Dot with Smooth Physics */}
              {isActive && (
                <motion.span
                  layoutId="activeTabIndicator"
                  className="w-1.5 h-1.5 rounded-full bg-[#FF6B00] mt-0.5 shadow-[0_1px_4px_rgba(255,107,0,0.4)]"
                  transition={{
                    type: "spring",
                    stiffness: 220,
                    damping: 24,
                    mass: 0.6,
                  }}
                />
              )}
            </motion.button>
          );
        })}
      </nav>
    </motion.div>
  );
}
