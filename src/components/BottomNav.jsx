import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { motion } from "framer-motion";
import { Home, ShoppingBag, LayoutGrid, User } from "lucide-react";
import { useScrollChrome } from "../context/ScrollChromeContext";

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

  const shouldHide = !isNavVisible || isKeyboardOpen || forceHide;

  const NAV_ITEMS = [
    { id: "home", label: "Home", icon: Home, path: "/" },
    { id: "order-again", label: "Order Again", icon: ShoppingBag, path: "/order-again" },
    { id: "categories", label: "Categories", icon: LayoutGrid, path: "/categories" },
    { id: "account", label: "Account", icon: User, path: "/account" },
  ];

  return (
    <motion.div
      initial={false}
      animate={{
        y: shouldHide ? 120 : 0,
        opacity: shouldHide ? 0 : 1,
      }}
      transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
      className="floating-pill-nav"
    >
      <nav className="max-w-[340px] mx-auto bg-white/95 backdrop-blur-2xl border border-slate-200/90 rounded-full px-3 py-1.5 shadow-[0_12px_36px_rgba(0,0,0,0.12)] ring-1 ring-black/5 flex items-center justify-around pointer-events-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = currentPath === item.path || (item.id === "home" && currentPath === "/");

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                if (currentPath !== item.path) {
                  router.push(item.path);
                }
              }}
              className={`relative flex flex-col items-center justify-center py-1.5 px-3.5 rounded-full transition-all duration-200 ios-press cursor-pointer select-none ${
                isActive ? "text-[#0c831f] font-black bg-emerald-50/90" : "text-slate-400 hover:text-slate-700"
              }`}
            >
              <Icon className={`w-4 h-4 transition-transform duration-200 ${isActive ? "stroke-[2.5px] scale-110 text-[#0c831f]" : "stroke-2"}`} />
              <span className="text-[9px] mt-0.5 font-extrabold tracking-tight whitespace-nowrap">{item.label}</span>

              {/* Active Indicator */}
              {isActive && (
                <span className="absolute -bottom-0.5 w-2 h-1 bg-[#0c831f] rounded-full shadow-sm" />
              )}
            </button>
          );
        })}
      </nav>
    </motion.div>
  );
}
