import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { setDeviceSystemBars } from "../lib/systemBars";

/**
 * Premium Branded Opening Screen for DASHit
 *
 * Design Language:
 * - Pristine white background (or dark surface in dark mode)
 * - Scattered, minimal monoline vector illustrations related to grocery & Kashmiri quick commerce:
 *   Apples, Dairy/Milk Cartons, Kashmiri Lavas Bread, Shopping Bags, Delivery Scooter,
 *   Kehwa Teacup with Steam, Cheese Wedge, Honey Jar, Bell Pepper, Croissant, Grocery Basket.
 * - Delicate, thin strokes with subtle contrast against the background
 * - Subtle accent elements: tiny sky-blue and brand-orange dots, 4-point sparkle diamonds, hollow rings
 * - Dedicated focal breathing space around the center logo
 * - Center DASHit logo gently scales in (95% -> 100%) and fades in
 */

// Dash slot measured off the master lockup, expressed as a share of the mark box
const DASH_SLOT = {
  left: "-0.682%",
  top: "41.912%",
  width: "47.727%",
  height: "16.667%",
};

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1];
const EASE_IN_OUT = [0.65, 0, 0.35, 1];

export default function PremiumSplashScreen({ onComplete, onExitStart }) {
  const [isVisible, setIsVisible] = useState(true);
  const [isExiting, setIsExiting] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    if (typeof document !== "undefined") {
      return document.documentElement.classList.contains("dark");
    }
    return false;
  });

  // Callbacks arrive as inline arrows, so hold them in refs and let the
  // sequence below run exactly once instead of restarting on every re-render
  const onCompleteRef = useRef(onComplete);
  const onExitStartRef = useRef(onExitStart);
  onCompleteRef.current = onComplete;
  onExitStartRef.current = onExitStart;

  useEffect(() => {
    // Set system status bar to transparent with dark icons during splash
    const dark = typeof document !== "undefined"
      && document.documentElement.classList.contains("dark");
    setIsDark(dark);
    setDeviceSystemBars({
      topColor: "#00000000",
      topDarkIcons: !dark,
      bottomColor: dark ? "#14171F" : "#FFFFFF",
      bottomDarkIcons: !dark,
    });

    // Timing sequence:
    // 0ms - 1350ms: Logo scales in and holds composition
    // 1350ms - 1800ms: Smooth fade-out (450ms)
    // 1800ms: Unmount and signal completion
    const exitTimer = setTimeout(() => {
      setIsExiting(true);
      if (onExitStartRef.current) onExitStartRef.current();
    }, 1350);

    const completeTimer = setTimeout(() => {
      setIsVisible(false);
      if (onCompleteRef.current) onCompleteRef.current();
    }, 1800);

    return () => {
      clearTimeout(exitTimer);
      clearTimeout(completeTimer);
    };
  }, []);

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="dashit-splash-screen"
        initial={{ opacity: 1 }}
        animate={{ opacity: isExiting ? 0 : 1 }}
        transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
        className={`fixed inset-0 z-[99999] bg-white dark:bg-[#14171F] flex items-center justify-center select-none overflow-hidden ${
          isExiting ? "pointer-events-none" : "pointer-events-auto"
        }`}
        style={{
          paddingTop: "var(--safe-top, 0px)",
          paddingBottom: "var(--safe-bottom, 0px)",
        }}
      >
        {/* Full-bleed Scattered Monoline Doodle Pattern */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          initial={{ opacity: 0, scale: 1.02 }}
          animate={{
            opacity: isExiting ? 0 : 1,
            scale: isExiting ? 1.06 : 1,
          }}
          transition={
            isExiting
              ? { duration: 0.45, ease: EASE_IN_OUT }
              : { duration: 0.8, ease: EASE_OUT_EXPO }
          }
          style={{ willChange: "transform, opacity", backfaceVisibility: "hidden" }}
        >
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
          viewBox="0 0 420 900"
          preserveAspectRatio="xMidYMid slice"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <style>{`
              .doodle-stroke {
                stroke: ${isDark ? "#28303F" : "#CBD5E1"};
                stroke-width: 1.35;
                stroke-linecap: round;
                stroke-linejoin: round;
                fill: none;
              }
              .doodle-faint {
                stroke: ${isDark ? "#1E2430" : "#CBD5E1"};
                stroke-width: 1.1;
                stroke-linecap: round;
                stroke-linejoin: round;
                fill: none;
                opacity: 0.7;
              }
              .accent-dot-blue {
                fill: #38BDF8;
                opacity: ${isDark ? "0.45" : "0.65"};
              }
              .accent-dot-orange {
                fill: #FB923C;
                opacity: ${isDark ? "0.4" : "0.6"};
              }
              .accent-ring {
                stroke: ${isDark ? "#28303F" : "#CBD5E1"};
                stroke-width: 1.2;
                fill: none;
              }
              .accent-sparkle {
                stroke: ${isDark ? "#28303F" : "#CBD5E1"};
                stroke-width: 1.2;
                fill: none;
                stroke-linecap: round;
                stroke-linejoin: round;
              }
            `}</style>

            {/* 1. Kashmiri Apple / Fruit */}
            <g id="sp-apple">
              <path className="doodle-stroke" d="M 24,12 C 16,12 8,17 8,27 C 8,37 16,44 24,44 C 32,44 40,37 40,27 C 40,17 32,12 24,12 Z" />
              <path className="doodle-stroke" d="M 24,12 C 24,8 26,5 29,4" />
              <path className="doodle-stroke" d="M 25,9 C 29,7 34,8 35,10 C 33,12 29,13 25,9 Z" />
              <path className="doodle-faint" d="M 13,22 C 12,26 13,31 15,35" />
            </g>

            {/* 2. Milk Carton */}
            <g id="sp-milk">
              <path className="doodle-stroke" d="M 10,22 L 10,50 C 10,51 11,52 12,52 L 34,52 C 35,52 36,51 36,50 L 36,22 Z" />
              <path className="doodle-stroke" d="M 10,22 L 16,14 L 30,14 L 36,22 Z" />
              <path className="doodle-stroke" d="M 16,14 L 16,8 L 30,8 L 30,14 Z" />
              <path className="doodle-faint" d="M 16,14 L 23,22 L 30,14" />
              <path className="doodle-faint" d="M 23,32 C 20,35 20,39 23,41 C 26,39 26,35 23,32 Z" />
            </g>

            {/* 3. Kashmiri Lavas / Bread */}
            <g id="sp-bread">
              <path className="doodle-stroke" d="M 8,24 C 8,14 16,10 32,10 C 48,10 56,14 56,24 C 56,34 48,38 32,38 C 16,38 8,34 8,24 Z" />
              <path className="doodle-stroke" d="M 20,15 L 24,33" />
              <path className="doodle-stroke" d="M 28,14 L 32,34" />
              <path className="doodle-stroke" d="M 36,14 L 40,34" />
              <path className="doodle-stroke" d="M 44,15 L 48,33" />
            </g>

            {/* 4. Grocery Shopping Bag */}
            <g id="sp-bag">
              <path className="doodle-stroke" d="M 10,18 L 13,46 C 13,47.5 14.5,49 16,49 L 36,49 C 37.5,49 39,47.5 39,46 L 42,18 Z" />
              <path className="doodle-stroke" d="M 18,18 C 18,9 21,7 26,7 C 31,7 34,9 34,18" />
              <path className="doodle-faint" d="M 13,26 L 39,26" />
              <path className="doodle-faint" d="M 23,33 L 29,33" />
            </g>

            {/* 5. Delivery Scooter */}
            <g id="sp-scooter">
              <circle className="doodle-stroke" cx="14" cy="38" r="7" />
              <circle className="doodle-stroke" cx="48" cy="38" r="7" />
              <path className="doodle-stroke" d="M 14,38 L 22,38 L 30,36 L 40,38 L 48,38" />
              <path className="doodle-stroke" d="M 48,38 L 43,18 L 40,16 M 43,18 L 46,16" />
              <path className="doodle-faint" d="M 45,20 L 49,20" />
              <rect className="doodle-stroke" x="8" y="18" width="14" height="14" rx="2" />
              <path className="doodle-faint" d="M 12,25 L 18,25" />
              <path className="doodle-stroke" d="M 22,26 C 24,24 28,24 31,26" />
            </g>

            {/* 6. Kashmiri Kehwa / Tea Cup */}
            <g id="sp-tea">
              <path className="doodle-stroke" d="M 12,18 L 14,34 C 14,38 18,41 24,41 C 30,41 34,38 34,34 L 36,18 Z" />
              <path className="doodle-stroke" d="M 35,21 C 39,21 42,24 42,27 C 42,30 39,33 34,33" />
              <path className="doodle-stroke" d="M 8,43 C 14,46 34,46 40,43" />
              <path className="doodle-faint" d="M 20,13 C 21,11 20,9 21,7" />
              <path className="doodle-faint" d="M 26,14 C 27,12 26,10 27,8" />
            </g>

            {/* 7. Cheese Wedge */}
            <g id="sp-cheese">
              <path className="doodle-stroke" d="M 8,36 L 42,36 L 36,16 L 8,36 Z" />
              <path className="doodle-stroke" d="M 42,36 L 46,30 L 40,12 L 36,16" />
              <path className="doodle-stroke" d="M 8,36 L 12,30 L 40,12" />
              <circle className="doodle-faint" cx="22" cy="28" r="3" />
              <circle className="doodle-faint" cx="32" cy="30" r="2" />
              <circle className="doodle-faint" cx="24" cy="20" r="1.5" />
            </g>

            {/* 8. Honey / Jam Jar */}
            <g id="sp-jar">
              <rect className="doodle-stroke" x="12" y="16" width="24" height="28" rx="4" />
              <path className="doodle-stroke" d="M 14,16 L 14,11 L 34,11 L 34,16" />
              <line className="doodle-stroke" x1="11" y1="11" x2="37" y2="11" />
              <rect className="doodle-faint" x="16" y="23" width="16" height="14" rx="1.5" />
              <line className="doodle-faint" x1="19" y1="30" x2="29" y2="30" />
            </g>

            {/* 9. Bell Pepper */}
            <g id="sp-pepper">
              <path className="doodle-stroke" d="M 16,16 C 10,18 9,28 10,34 C 11,40 18,44 24,44 C 30,44 37,40 38,34 C 39,28 38,18 32,16 C 28,14 20,14 16,16 Z" />
              <path className="doodle-faint" d="M 24,17 L 24,43" />
              <path className="doodle-stroke" d="M 24,15 C 24,10 27,8 28,6" />
              <path className="doodle-faint" d="M 20,15 L 24,17 L 28,15" />
            </g>

            {/* 10. Croissant */}
            <g id="sp-croissant">
              <path className="doodle-stroke" d="M 6,34 C 12,18 36,18 42,34 C 36,36 32,32 24,32 C 16,32 12,36 6,34 Z" />
              <path className="doodle-stroke" d="M 15,25 C 19,23 29,23 33,25" />
              <path className="doodle-stroke" d="M 20,19 C 22,17 26,17 28,19" />
            </g>

            {/* 11. Grocery Basket */}
            <g id="sp-basket">
              <path className="doodle-stroke" d="M 10,22 L 14,44 C 14.5,45.5 16,46 18,46 L 36,46 C 38,46 39.5,45.5 40,44 L 44,22 Z" />
              <line className="doodle-stroke" x1="8" y1="22" x2="46" y2="22" />
              <path className="doodle-stroke" d="M 16,22 C 16,10 38,10 38,22" />
              <line className="doodle-faint" x1="18" y1="27" x2="20" y2="41" />
              <line className="doodle-faint" x1="27" y1="27" x2="27" y2="41" />
              <line className="doodle-faint" x1="36" y1="27" x2="34" y2="41" />
            </g>

            {/* 12. Sparkle */}
            <g id="sp-sparkle">
              <path className="accent-sparkle" d="M 0,-7 Q 0,0 7,0 Q 0,0 0,7 Q 0,0 -7,0 Q 0,0 0,-7 Z" />
            </g>
          </defs>

          {/* ORGANIC SCATTERED COMPOSITION */}

          {/* TOP SECTION */}
          <use href="#sp-bag" x="35" y="45" transform="rotate(-12 55 65) scale(0.95)" />
          <use href="#sp-tea" x="195" y="32" transform="rotate(8 215 52) scale(0.9)" />
          <use href="#sp-bread" x="305" y="55" transform="rotate(24 335 70) scale(0.92)" />
          <use href="#sp-apple" x="75" y="145" transform="rotate(15 95 165) scale(0.95)" />
          <use href="#sp-milk" x="325" y="155" transform="rotate(-16 345 175) scale(0.95)" />
          <use href="#sp-scooter" x="190" y="170" transform="rotate(-6 215 190) scale(0.9)" />
          <use href="#sp-cheese" x="25" y="245" transform="rotate(-20 45 265) scale(0.9)" />
          <use href="#sp-pepper" x="340" y="265" transform="rotate(18 360 285) scale(0.95)" />

          {/* MID PERIMETER (FLANKING SIDES, LEAVING CENTER CLEAR) */}
          <use href="#sp-croissant" x="18" y="375" transform="rotate(14 38 395) scale(0.9)" />
          <use href="#sp-jar" x="345" y="385" transform="rotate(-12 365 405) scale(0.95)" />
          <use href="#sp-basket" x="15" y="495" transform="rotate(-15 35 515) scale(0.9)" />
          <use href="#sp-apple" x="350" y="505" transform="rotate(24 370 525) scale(0.95)" />

          {/* LOWER SECTION */}
          <use href="#sp-scooter" x="25" y="625" transform="rotate(10 50 645) scale(0.95)" />
          <use href="#sp-tea" x="330" y="630" transform="rotate(-14 350 650) scale(0.95)" />
          <use href="#sp-bread" x="165" y="685" transform="rotate(-18 195 705) scale(0.9)" />
          <use href="#sp-milk" x="55" y="740" transform="rotate(16 75 760) scale(0.95)" />
          <use href="#sp-cheese" x="310" y="745" transform="rotate(-18 330 765) scale(0.9)" />
          <use href="#sp-bag" x="190" y="795" transform="rotate(8 210 815) scale(0.95)" />
          <use href="#sp-croissant" x="335" y="825" transform="rotate(-10 355 845) scale(0.85)" />
          <use href="#sp-pepper" x="30" y="835" transform="rotate(22 50 855) scale(0.9)" />

          {/* SUBTLE ACCENT ELEMENTS (TINY DOTS, RINGS, SPARKLES) */}
          {/* Top Accents */}
          <circle className="accent-dot-blue" cx="135" cy="55" r="3" />
          <circle className="accent-dot-orange" cx="280" cy="45" r="2.5" />
          <circle className="accent-ring" cx="130" cy="120" r="3.5" />
          <circle className="accent-dot-blue" cx="295" cy="125" r="2.5" />
          <use href="#sp-sparkle" x="385" y="115" />
          <use href="#sp-sparkle" x="48" y="200" />

          {/* Mid Accents (outer margin) */}
          <circle className="accent-dot-orange" cx="115" cy="285" r="2.5" />
          <circle className="accent-ring" cx="300" cy="265" r="4" />
          <circle className="accent-dot-blue" cx="80" cy="355" r="3" />
          <circle className="accent-dot-blue" cx="320" cy="360" r="2.5" />
          <use href="#sp-sparkle" x="90" y="460" />
          <use href="#sp-sparkle" x="325" y="465" />
          <circle className="accent-dot-orange" cx="85" cy="565" r="2.5" />
          <circle className="accent-ring" cx="330" cy="575" r="3.5" />
          <circle className="accent-dot-blue" cx="305" cy="515" r="3" />

          {/* Bottom Accents */}
          <circle className="accent-dot-blue" cx="125" cy="650" r="2.5" />
          <circle className="accent-dot-orange" cx="280" cy="660" r="3" />
          <use href="#sp-sparkle" x="115" y="760" />
          <use href="#sp-sparkle" x="275" y="770" />
          <circle className="accent-ring" cx="140" cy="835" r="3.5" />
          <circle className="accent-dot-blue" cx="275" cy="850" r="2.5" />
          <circle className="accent-dot-orange" cx="385" cy="770" r="2.5" />
        </svg>
        </motion.div>

        {/* Center Logo: Signature Mark, Animated Streaking Orange Dash & Wordmark */}
        <motion.div
          animate={{
            scale: isExiting ? 1.28 : 1,
            opacity: isExiting ? 0 : 1,
          }}
          transition={
            isExiting
              ? { duration: 0.45, ease: EASE_IN_OUT }
              : { duration: 0 }
          }
          className="relative z-10 flex flex-col items-center justify-center pointer-events-none"
          style={{ willChange: "transform, opacity", backfaceVisibility: "hidden" }}
        >
          {/* Mark — navy shapes settle first, then the orange dash streaks into its slot */}
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.55, ease: EASE_OUT_EXPO }}
            className="relative w-[108px]"
            style={{
              aspectRatio: "440 / 408",
              willChange: "transform, opacity",
              backfaceVisibility: "hidden",
            }}
          >
            {/* Signature D mark: Navy in light mode, crisp pure white in dark mode */}
            <img
              src="/dashit-splash-mark.png"
              alt="DASHit"
              className="absolute inset-0 w-full h-full object-contain dark:hidden"
            />
            <img
              src="/dashit-splash-mark-white.png"
              alt="DASHit"
              className="absolute inset-0 w-full h-full object-contain hidden dark:block"
            />

            <motion.img
              src="/dashit-splash-dash.png"
              alt=""
              aria-hidden="true"
              initial={{ opacity: 0, x: "-620%", scaleX: 2.4 }}
              animate={{
                opacity: 1,
                x: ["-620%", "16%", "-4%", "0%"],
                scaleX: [2.4, 1.06, 0.98, 1],
              }}
              transition={{
                delay: 0.28,
                duration: 0.72,
                times: [0, 0.52, 0.78, 1],
                ease: [
                  [0.05, 0.7, 0.25, 1], // hurtle in, decelerating into the overshoot
                  [0.45, 0, 0.55, 1],   // swing back through the resting point
                  [0.33, 0, 0.25, 1],   // final settle
                ],
                opacity: { delay: 0.28, duration: 0.12, ease: "linear" },
              }}
              className="absolute object-contain drop-shadow-[0_0_8px_rgba(255,91,0,0.45)]"
              style={{
                ...DASH_SLOT,
                transformOrigin: "left center",
                willChange: "transform, opacity",
                backfaceVisibility: "hidden",
              }}
            />
          </motion.div>

          {/* Wordmark rises underneath once the mark has resolved */}
          <motion.img
            src="/dashit-wordmark.png"
            alt="dashit"
            aria-hidden="true"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.6, ease: EASE_OUT_EXPO }}
            className="w-[96px] mt-3.5 object-contain dark:hidden"
            style={{ willChange: "transform, opacity", backfaceVisibility: "hidden" }}
          />
          <motion.img
            src="/dashit-wordmark-white.png"
            alt="dashit"
            aria-hidden="true"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.6, ease: EASE_OUT_EXPO }}
            className="w-[96px] mt-3.5 object-contain hidden dark:block"
            style={{ willChange: "transform, opacity", backfaceVisibility: "hidden" }}
          />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
