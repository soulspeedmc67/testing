import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { Home, ShoppingBag, LayoutGrid, User } from "lucide-react";
import { useScrollChrome } from "../context/ScrollChromeContext";
import { hapticLight } from "../lib/haptics";

const STOREFRONT_TABS = ["/shop", "/orders", "/categories"];

const NAV_ITEMS = [
  { id: "home", label: "Home", icon: Home, path: "/shop" },
  { id: "categories", label: "Categories", icon: LayoutGrid, path: "/categories" },
  { id: "orders", label: "Orders", icon: ShoppingBag, path: "/orders" },
];

export default function BottomNav({ forceHide = false }) {
  const router = useRouter();
  const currentPath = router.pathname;
  const { isNavVisible } = useScrollChrome();
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false);
  const [hasActiveOrder, setHasActiveOrder] = useState(false);
  const [isTrackerActive, setIsTrackerActive] = useState(false);

  useEffect(() => {
    const updateTrackerState = () => {
      try {
        const order = localStorage.getItem("dashit_active_order");
        const hasOrder = Boolean(order && JSON.parse(order));
        const isMin = typeof window !== "undefined" && window.__dashit_tracker_minimized !== false;
        setIsTrackerActive(hasOrder && isMin);
        setHasActiveOrder(hasOrder);
      } catch (e) {
        setIsTrackerActive(false);
        setHasActiveOrder(false);
      }
    };
    updateTrackerState();
    const handleTrackerChange = (e) => {
      setIsTrackerActive(Boolean(e.detail?.isMinimized && e.detail?.hasOrder));
    };
    window.addEventListener("dashit_tracker_minimized_changed", handleTrackerChange);
    window.addEventListener("storage", updateTrackerState);
    window.addEventListener("dashit_order_updated", updateTrackerState);
    return () => {
      window.removeEventListener("dashit_tracker_minimized_changed", handleTrackerChange);
      window.removeEventListener("storage", updateTrackerState);
      window.removeEventListener("dashit_order_updated", updateTrackerState);
    };
  }, []);

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
  const [animTick, setAnimTick] = useState({});

  const triggerIconAnimation = (tabId) => {
    setAnimTick((prev) => ({ ...prev, [tabId]: (prev[tabId] || 0) + 1 }));
  };

  useEffect(() => {
    const activeItem = NAV_ITEMS.find(
      (item) => currentPath === item.path || (item.id === "home" && (currentPath === "/shop" || currentPath === "/"))
    );
    if (activeItem) {
      triggerIconAnimation(activeItem.id);
    }
  }, [currentPath]);

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
      aria-hidden={shouldHide}
      className="fixed left-0 right-0 z-50 md:hidden flex justify-center px-4 pointer-events-none"
      style={{
        bottom: "max(12px, calc(8px + env(safe-area-inset-bottom, 8px)))",
      }}
    >
      <nav
        className={`relative ${
          isTrackerActive ? "max-w-[245px]" : "max-w-[288px]"
        } w-full mx-auto h-[52px] bg-white border border-slate-200/80 rounded-full px-2.5 shadow-[0_4px_16px_rgba(0,0,0,0.08)] grid grid-cols-3 items-center select-none dark:bg-[#1C1F2A] dark:border-slate-700/60 transition-all duration-300 ${
          shouldHide ? "pointer-events-none" : "pointer-events-auto"
        }`}
      >
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path || (item.id === "home" && (currentPath === "/shop" || currentPath === "/"));
          const tick = animTick[item.id] || 0;

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
                isActive ? "text-[#061838] dark:text-[#FF5B00]" : "text-slate-400 hover:text-slate-600 dark:text-content-secondary dark:hover:text-white"
              }`}
            >
              <motion.div
                key={`${item.id}-${tick}`}
                className="flex items-center justify-center relative"
                animate={
                  tick > 0
                    ? item.id === "orders"
                      ? { scale: [1, 1.25, 0.92, 1], rotate: [0, -10, 10, 0] }
                      : item.id === "categories"
                      ? { scale: [1, 1.28, 0.92, 1], rotate: [0, -16, 16, -6, 0] }
                      : { scale: [1, 1.3, 0.9, 1.08, 1], y: [0, -5, 2, 0] }
                    : { scale: 1, y: 0, rotate: 0 }
                }
                transition={
                  item.id === "orders"
                    ? { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }
                    : { duration: 0.48, ease: "easeOut" }
                }
              >
                <Icon
                  className={`w-[19px] h-[19px] transition-colors duration-250 ${
                    isActive ? "stroke-[2.4] text-[#061838] dark:text-[#FF5B00]" : "stroke-[1.9] text-slate-400 dark:text-content-secondary"
                  }`}
                />
                {item.id === "orders" && hasActiveOrder && (
                  <span className="absolute -top-1 -right-1.5 flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-[#FF5B00]"></span>
                  </span>
                )}
              </motion.div>

              <span
                className={`text-[9.5px] mt-0.5 tracking-tight whitespace-nowrap transition-colors duration-250 ${
                  isActive ? "font-extrabold text-[#061838] dark:text-[#FF5B00]" : "font-medium text-slate-500 dark:text-content-secondary"
                }`}
              >
                {item.label}
              </span>

              {/* Active Indicator Dot */}
              {isActive && (
                <motion.span
                  layoutId="activeTabIndicator"
                  className="w-1 h-1 rounded-full bg-[#FF5B00] mt-0.5 shadow-[0_1px_4px_rgba(255,91,0,0.4)]"
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 26,
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
