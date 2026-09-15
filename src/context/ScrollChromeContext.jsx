import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from "react";

const ScrollChromeContext = createContext({
  isChromeVisible: true,
  isHeaderVisible: true,
  isNavVisible: true,
  scrollY: 0,
});

export function ScrollChromeProvider({ children }) {
  const [isChromeVisible, setIsChromeVisible] = useState(true);
  const lastScrollY = useRef(0);
  const accumulatedDelta = useRef(0);
  const isChromeVisibleRef = useRef(true);
  const rafId = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const onScroll = () => {
      if (rafId.current) return;

      rafId.current = window.requestAnimationFrame(() => {
        rafId.current = null;
        const currentScrollY = window.scrollY;
        const delta = currentScrollY - lastScrollY.current;

        // If near top, always show chrome
        if (currentScrollY < 40) {
          if (!isChromeVisibleRef.current) {
            isChromeVisibleRef.current = true;
            setIsChromeVisible(true);
          }
          accumulatedDelta.current = 0;
          lastScrollY.current = currentScrollY;
          return;
        }

        // Reset accumulator on direction change
        if ((delta > 0 && accumulatedDelta.current < 0) || (delta < 0 && accumulatedDelta.current > 0)) {
          accumulatedDelta.current = 0;
        }

        accumulatedDelta.current += delta;

        // Threshold of 16px prevents jitter on micro-finger adjustments
        if (accumulatedDelta.current > 16) {
          // Scrolling DOWN -> Hide chrome
          if (isChromeVisibleRef.current) {
            isChromeVisibleRef.current = false;
            setIsChromeVisible(false);
          }
        } else if (accumulatedDelta.current < -16) {
          // Scrolling UP -> Show chrome
          if (!isChromeVisibleRef.current) {
            isChromeVisibleRef.current = true;
            setIsChromeVisible(true);
          }
        }

        lastScrollY.current = currentScrollY;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (rafId.current) window.cancelAnimationFrame(rafId.current);
    };
  }, []);

  const value = useMemo(
    () => ({
      isChromeVisible,
      isHeaderVisible: isChromeVisible,
      isNavVisible: isChromeVisible,
      scrollY: 0,
    }),
    [isChromeVisible]
  );

  return (
    <ScrollChromeContext.Provider value={value}>
      {children}
    </ScrollChromeContext.Provider>
  );
}

export function useScrollChrome() {
  return useContext(ScrollChromeContext);
}
