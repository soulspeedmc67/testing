import { useRef, useEffect, useState } from "react";
import InteractivePhoneScreen from "./InteractivePhoneScreen";

/**
 * Premium 3D Smartphone Mockup for DASHIT Hero
 *
 * Implements a high-end, realistic 3D smartphone showcase:
 * - Precision titanium chassis with chamfered metallic edges and physical side buttons
 * - Dynamic Island with front-facing camera lens reflection
 * - Moving glass reflection sheen that shifts with cursor movement
 * - Interactive live DASHIT mini-app running directly on the screen
 * - Smooth physics-based floating animation
 * - Gentle mouse-based 3D tilt with damped inertia (lerp)
 * - Breathing soft contact shadow and subtle DASHIT brand aura
 */
export default function Hero3DPhone() {
  const containerRef = useRef(null);
  const cardRef = useRef(null);
  const sheenRef = useRef(null);
  const shadowRef = useRef(null);

  // Track target and current rotation for butter-smooth damping (lerp)
  const rotRef = useRef({
    currentX: 6,
    currentY: -14,
    targetX: 6,
    targetY: -14,
  });

  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    let animId;
    let startTime = performance.now();

    const updateParallax = () => {
      const now = performance.now();
      const elapsed = (now - startTime) / 1000;

      // Subtle float animation
      const floatY = Math.sin(elapsed * 1.6) * 7;
      const floatRoll = Math.cos(elapsed * 1.2) * 0.8;

      // Lerp toward target
      const lerpFactor = 0.08;
      rotRef.current.currentX +=
        (rotRef.current.targetX - rotRef.current.currentX) * lerpFactor;
      rotRef.current.currentY +=
        (rotRef.current.targetY - rotRef.current.currentY) * lerpFactor;

      const finalRotX = rotRef.current.currentX + Math.sin(elapsed * 1.4) * 0.5;
      const finalRotY = rotRef.current.currentY;
      const finalRotZ = floatRoll + 1.2;

      if (cardRef.current) {
        cardRef.current.style.transform = `
          translateY(${floatY}px)
          rotateX(${finalRotX}deg)
          rotateY(${finalRotY}deg)
          rotateZ(${finalRotZ}deg)
        `;
      }

      // Dynamic sheen angle based on Y rotation
      if (sheenRef.current) {
        const sheenOffset = (finalRotY + 14) * 4;
        sheenRef.current.style.transform = `translateX(${sheenOffset}%) rotate(25deg)`;
      }

      // Dynamic ground shadow scaling with float
      if (shadowRef.current) {
        const shadowScale = 1 - floatY * 0.015;
        const shadowOpacity = 0.5 - floatY * 0.01;
        shadowRef.current.style.transform = `scale(${shadowScale})`;
        shadowRef.current.style.opacity = Math.max(0.25, Math.min(0.65, shadowOpacity));
      }

      animId = requestAnimationFrame(updateParallax);
    };

    animId = requestAnimationFrame(updateParallax);

    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width; // 0 to 1
      const y = (e.clientY - rect.top) / rect.height; // 0 to 1

      // Gentle tilt: clamp angles to maintain clean, premium perspective
      const maxTiltY = 16;
      const maxTiltX = 10;
      rotRef.current.targetY = -14 + (x - 0.5) * maxTiltY * 2;
      rotRef.current.targetX = 6 - (y - 0.5) * maxTiltX * 2;
    };

    const handleMouseLeave = () => {
      rotRef.current.targetX = 6;
      rotRef.current.targetY = -14;
      setIsHovered(false);
    };

    const handleMouseEnter = () => {
      setIsHovered(true);
    };

    const container = containerRef.current;
    if (container) {
      window.addEventListener("mousemove", handleMouseMove, { passive: true });
      container.addEventListener("mouseleave", handleMouseLeave);
      container.addEventListener("mouseenter", handleMouseEnter);
    }

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("mousemove", handleMouseMove);
      if (container) {
        container.removeEventListener("mouseleave", handleMouseLeave);
        container.removeEventListener("mouseenter", handleMouseEnter);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full max-w-[360px] sm:max-w-[380px] xl:max-w-[400px] mx-auto py-8 sm:py-10 flex items-center justify-center select-none"
      style={{
        perspective: "1400px",
        perspectiveOrigin: "50% 45%",
      }}
    >
      {/* SUBTLE BRAND BACKDROP AURAS */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-96 bg-gradient-to-tr from-[#FF5B00]/15 via-orange-500/10 to-blue-600/10 blur-3xl rounded-full pointer-events-none -z-10" />
      <div className="absolute top-1/3 left-1/3 w-64 h-64 bg-orange-500/10 dark:bg-orange-500/15 blur-2xl rounded-full pointer-events-none -z-10" />

      {/* 3D SMARTPHONE ASSEMBLY */}
      <div
        ref={cardRef}
        className="relative w-[300px] xs:w-[320px] sm:w-[340px] h-[650px] xs:h-[675px] sm:h-[700px] transition-shadow duration-300"
        style={{
          transformStyle: "preserve-3d",
          willChange: "transform",
        }}
      >
        {/* PHYSICAL HARDWARE: SIDE BUTTONS (LEFT SIDE) */}
        {/* Action Button */}
        <div
          className="absolute -left-[5px] top-[108px] w-[5px] h-[22px] rounded-l-sm bg-gradient-to-r from-[#1E232F] to-[#2E3545] border-l border-y border-white/20 shadow-xs pointer-events-none"
          style={{ transform: "translateZ(6px)" }}
        />
        {/* Volume Up */}
        <div
          className="absolute -left-[5px] top-[146px] w-[5px] h-[46px] rounded-l-sm bg-gradient-to-r from-[#1E232F] to-[#2E3545] border-l border-y border-white/20 shadow-xs pointer-events-none"
          style={{ transform: "translateZ(6px)" }}
        />
        {/* Volume Down */}
        <div
          className="absolute -left-[5px] top-[204px] w-[5px] h-[46px] rounded-l-sm bg-gradient-to-r from-[#1E232F] to-[#2E3545] border-l border-y border-white/20 shadow-xs pointer-events-none"
          style={{ transform: "translateZ(6px)" }}
        />

        {/* PHYSICAL HARDWARE: SIDE BUTTON (RIGHT SIDE - POWER) */}
        <div
          className="absolute -right-[5px] top-[160px] w-[5px] h-[68px] rounded-r-sm bg-gradient-to-l from-[#1E232F] to-[#2E3545] border-r border-y border-white/20 shadow-xs pointer-events-none"
          style={{ transform: "translateZ(6px)" }}
        />

        {/* TITANIUM OUTER CHASSIS / BEVEL FRAME */}
        <div
          className="absolute inset-0 rounded-[50px] p-[3px] shadow-[0_30px_70px_-15px_rgba(0,0,0,0.55),0_15px_30px_-10px_rgba(0,0,0,0.4)] pointer-events-none"
          style={{
            background:
              "linear-gradient(145deg, #4A5568 0%, #1A202C 25%, #0F131A 50%, #2D3748 75%, #1A202C 100%)",
            border: "1px solid rgba(255,255,255,0.18)",
            boxShadow:
              "inset 0 1px 1px rgba(255,255,255,0.35), inset 0 -1px 2px rgba(0,0,0,0.8), 0 25px 60px -12px rgba(6,24,56,0.5)",
          }}
        >
          {/* Inner Matte Bezel */}
          <div className="w-full h-full rounded-[47px] bg-[#07090E] p-[9px] relative overflow-hidden border border-black/80">
            
            {/* EARPIECE MICRO-SPEAKER SLIT */}
            <div className="absolute top-[8px] left-1/2 -translate-x-1/2 w-12 h-1 bg-[#1A1F2B] rounded-full z-40 border border-white/10" />

            {/* SCREEN DISPLAY CONTAINER */}
            <div className="w-full h-full rounded-[40px] overflow-hidden relative bg-[#0E121A] pointer-events-auto">
              {/* LIVE INTERACTIVE DASHIT SCREEN */}
              <InteractivePhoneScreen />

              {/* DYNAMIC MOVING GLASS SHEEN REFLECTION OVERLAY */}
              <div
                ref={sheenRef}
                className="absolute -inset-full w-[300%] h-[300%] pointer-events-none z-30 opacity-25 mix-blend-overlay transition-transform duration-75 ease-out"
                style={{
                  background:
                    "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.5) 48%, rgba(255,255,255,0.8) 50%, rgba(255,255,255,0.4) 52%, transparent 60%)",
                }}
              />

              {/* ULTRA SUBTLE PERIMETER GLASS INSET SHADOW */}
              <div className="absolute inset-0 rounded-[40px] shadow-[inset_0_0_12px_rgba(0,0,0,0.65)] pointer-events-none z-25 border border-white/10" />
            </div>
          </div>
        </div>

        {/* 3D DEPTH EXTENSION (SIMULATING 12MM SMARTPHONE THICKNESS) */}
        <div
          className="absolute inset-0 rounded-[50px] bg-[#0A0D14] -z-10 pointer-events-none"
          style={{
            transform: "translateZ(-14px)",
            boxShadow:
              "0 0 0 2px #1A202C, 0 10px 30px rgba(0,0,0,0.7), -10px 15px 35px rgba(0,0,0,0.5)",
          }}
        />

        {/* FLOATING INTERACTION HINT PILL */}
        <div
          className="absolute -bottom-6 left-1/2 -translate-x-1/2 bg-[#061838]/90 dark:bg-black/90 backdrop-blur-md text-white text-[10px] font-bold px-3 py-1 rounded-full border border-white/15 shadow-xl flex items-center space-x-1.5 whitespace-nowrap pointer-events-none z-40 transition-opacity duration-300"
          style={{
            opacity: isHovered ? 0.95 : 0.85,
            transform: "translateZ(20px)",
          }}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-[#FF5B00] animate-pulse" />
          <span>Interactive 3D Demo • Tap &quot;ADD&quot; to test cart</span>
        </div>
      </div>

      {/* SOFT REALISTIC GROUND CONTACT SHADOW */}
      <div
        ref={shadowRef}
        className="absolute -bottom-6 w-64 sm:w-72 h-8 rounded-full blur-xl pointer-events-none -z-20 transition-all duration-150"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.65) 0%, rgba(6,24,56,0.3) 45%, transparent 75%)",
          transform: "scale(1)",
        }}
      />
    </div>
  );
}
