import React, { createContext, useContext, useState, useEffect, useRef } from "react";

const ScrollChromeContext = createContext({
  isChromeVisible: true,
  isHeaderVisible: true,
  isNavVisible: true,
  scrollY: 0,
});

export function ScrollChromeProvider({ children }) {
  const [isChromeVisible, setIsChromeVisible] = useState(true);
  const [scrollY, setScrollY] = useState(0);
  const lastScrollY = useRef(0);
  const accumulatedDelta = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY.current;

      setScrollY(currentScrollY);

      // If near top, always show chrome
      if (currentScrollY < 40) {
        setIsChromeVisible(true);
        accumulatedDelta.current = 0;
        lastScrollY.current = currentScrollY;
        return;
      }

      // Check direction change
      if ((delta > 0 && accumulatedDelta.current < 0) || (delta < 0 && accumulatedDelta.current > 0)) {
        accumulatedDelta.current = 0;
      }

      accumulatedDelta.current += delta;

      // Threshold of 12px prevents jitter on minor finger wobbles
      if (accumulatedDelta.current > 12) {
        // Scrolling DOWN -> Hide chrome
        setIsChromeVisible(false);
      } else if (accumulatedDelta.current < -12) {
        // Scrolling UP -> Show chrome
        setIsChromeVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <ScrollChromeContext.Provider
      value={{
        isChromeVisible,
        isHeaderVisible: isChromeVisible,
        isNavVisible: isChromeVisible,
        scrollY,
      }}
    >
      {children}
    </ScrollChromeContext.Provider>
  );
}

export function useScrollChrome() {
  return useContext(ScrollChromeContext);
}
