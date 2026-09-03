import React from "react";
import { motion } from "framer-motion";

/**
 * Premium Animated Dashit Logo Mark
 * Features the signature navy "D" with an animated, glowing orange speed dash.
 */
export default function DashitAnimatedLogo({ size = "md", className = "", showGlow = true }) {
  const dimensions = {
    xs: { w: 22, h: 16 },
    sm: { w: 28, h: 20 },
    md: { w: 38, h: 28 },
    lg: { w: 56, h: 41 },
    xl: { w: 84, h: 62 },
  };

  const dim = dimensions[size] || dimensions.md;

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: dim.w, height: dim.h }}
    >
      {/* 1. Static Signature Navy D Curves */}
      <img
        src="/dashit-mark-navy.png"
        alt="Dashit"
        className="absolute inset-0 w-full h-full object-contain pointer-events-none"
      />

      {/* 2. Animated Pulsing Orange Speed Dash */}
      <motion.div
        className="absolute pointer-events-none"
        style={{
          left: "13.2%",
          top: "43.3%",
          width: "36.6%",
          height: "15%",
        }}
        animate={{
          x: [0, 2.5, 0],
          scaleX: [1, 1.14, 1],
          opacity: [0.92, 1, 0.92],
        }}
        transition={{
          duration: 1.4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        <img
          src="/dashit-dash-orange.png"
          alt="Dash"
          className={`w-full h-full object-contain ${
            showGlow ? "drop-shadow-[0_0_6px_rgba(255,91,0,0.85)]" : ""
          }`}
        />
      </motion.div>
    </div>
  );
}

/**
 * Premium Circular Progress Badge for Live Order Tracking
 * Encapsulates the animated Dashit mark inside a crisp white disc with ring glow
 */
export function DashitProgressBadge({ size = "md", className = "" }) {
  const badgeSizes = {
    sm: "w-7 h-7",
    md: "w-8 h-8",
    lg: "w-10 h-10",
  };

  const logoSizes = {
    sm: "xs",
    md: "sm",
    lg: "md",
  };

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Outer Speed Pulse Aura */}
      <motion.div
        className="absolute inset-0 rounded-full bg-[#FF5B00]/25"
        animate={{
          scale: [1, 1.35, 1],
          opacity: [0.6, 0, 0.6],
        }}
        transition={{
          duration: 1.8,
          repeat: Infinity,
          ease: "easeOut",
        }}
      />

      {/* Pristine Glass/White Disc */}
      <div
        className={`${badgeSizes[size] || badgeSizes.md} rounded-full bg-white shadow-[0_6px_18px_rgba(6,24,56,0.35)] ring-2 ring-[#FF5B00] flex items-center justify-center p-1 relative z-10`}
      >
        <DashitAnimatedLogo size={logoSizes[size] || "sm"} showGlow={true} />
      </div>
    </div>
  );
}
