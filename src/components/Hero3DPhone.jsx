import { useRef, useEffect } from "react";
import AppHomeScreenMock from "./AppHomeScreenMock";

/**
 * The device the landing hero puts the app inside.
 *
 * The phone holds one fixed, considered angle — it is a product photograph, not
 * a toy. There is no cursor tracking and no rotation: the only motion is a slow
 * vertical drift of a few pixels with the contact shadow breathing against it,
 * which reads as a held object rather than an interactive widget. Motion is
 * skipped entirely when the visitor asks for reduced motion.
 */

const RESTING_ROT_X = 2.4;
const RESTING_ROT_Y = -9;
const RESTING_ROT_Z = 0.8;

export default function Hero3DPhone() {
  const bodyRef = useRef(null);
  const shadowRef = useRef(null);

  useEffect(() => {
    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    let animId;
    const start = performance.now();

    const tick = (now) => {
      const elapsed = (now - start) / 1000;

      // One slow cycle, a couple of degrees of roll at most.
      const floatY = Math.sin(elapsed * 0.55) * 6;
      const roll = Math.sin(elapsed * 0.4) * 0.35;

      if (bodyRef.current) {
        bodyRef.current.style.transform = `translate3d(0, ${floatY.toFixed(2)}px, 0) rotateX(${RESTING_ROT_X}deg) rotateY(${RESTING_ROT_Y}deg) rotateZ(${(RESTING_ROT_Z + roll).toFixed(2)}deg)`;
      }

      // The shadow tightens as the phone lifts and spreads as it settles.
      if (shadowRef.current) {
        const lift = (floatY + 6) / 12; // 0 at the lowest point, 1 at the highest
        shadowRef.current.style.transform = `scaleX(${(1.04 - lift * 0.12).toFixed(3)})`;
        shadowRef.current.style.opacity = (0.55 - lift * 0.18).toFixed(3);
      }

      animId = requestAnimationFrame(tick);
    };

    animId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div
      className="relative w-full max-w-[340px] sm:max-w-[360px] mx-auto flex items-center justify-center select-none"
      style={{ perspective: "1600px", perspectiveOrigin: "50% 42%" }}
    >
      {/* A single soft halo behind the device, not a colour wash */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[330px] h-[440px] rounded-full bg-[#FF5B00]/[0.07] dark:bg-[#FF5B00]/[0.10] blur-[90px] pointer-events-none -z-10" />

      <div
        ref={bodyRef}
        className="relative w-[286px] sm:w-[306px] h-[600px] sm:h-[642px]"
        style={{
          transformStyle: "preserve-3d",
          willChange: "transform",
          transform: `rotateX(${RESTING_ROT_X}deg) rotateY(${RESTING_ROT_Y}deg) rotateZ(${RESTING_ROT_Z}deg)`,
        }}
      >
        {/* Side hardware */}
        <div
          className="absolute -left-[4px] top-[96px] w-[4px] h-[20px] rounded-l-[2px] bg-[#2A303C] pointer-events-none"
          style={{ transform: "translateZ(5px)" }}
        />
        <div
          className="absolute -left-[4px] top-[130px] w-[4px] h-[42px] rounded-l-[2px] bg-[#2A303C] pointer-events-none"
          style={{ transform: "translateZ(5px)" }}
        />
        <div
          className="absolute -left-[4px] top-[182px] w-[4px] h-[42px] rounded-l-[2px] bg-[#2A303C] pointer-events-none"
          style={{ transform: "translateZ(5px)" }}
        />
        <div
          className="absolute -right-[4px] top-[146px] w-[4px] h-[62px] rounded-r-[2px] bg-[#2A303C] pointer-events-none"
          style={{ transform: "translateZ(5px)" }}
        />

        {/* Chassis */}
        <div
          className="absolute inset-0 rounded-[46px] p-[3px]"
          style={{
            background:
              "linear-gradient(150deg, #5A6474 0%, #232A36 30%, #12161E 55%, #39414F 80%, #1B212B 100%)",
            boxShadow:
              "inset 0 1px 1px rgba(255,255,255,0.30), inset 0 -1px 2px rgba(0,0,0,0.75), 0 34px 60px -24px rgba(6,24,56,0.55), 0 12px 26px -14px rgba(0,0,0,0.45)",
          }}
        >
          {/* Bezel */}
          <div className="w-full h-full rounded-[43px] bg-[#05070B] p-[8px] relative">
            {/* Screen */}
            <div className="w-full h-full rounded-[36px] overflow-hidden relative bg-white">
              <AppHomeScreenMock />

              {/* Dynamic Island sits over the app, as it does on device */}
              <div className="absolute top-[9px] left-1/2 -translate-x-1/2 w-[86px] h-[24px] bg-black rounded-full z-30 flex items-center justify-end pr-2.5">
                <div className="w-[9px] h-[9px] rounded-full bg-[#0B1220] ring-1 ring-white/10 flex items-center justify-center">
                  <div className="w-[3.5px] h-[3.5px] rounded-full bg-[#1B3A6B]" />
                </div>
              </div>

              {/* A fixed, gentle glass highlight — no sweeping sheen */}
              <div
                className="absolute inset-0 z-20 pointer-events-none opacity-[0.16]"
                style={{
                  background:
                    "linear-gradient(118deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0) 32%, rgba(255,255,255,0) 68%, rgba(255,255,255,0.35) 100%)",
                }}
              />

              {/* Inner glass seam */}
              <div className="absolute inset-0 rounded-[36px] shadow-[inset_0_0_10px_rgba(0,0,0,0.35)] z-20 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Body depth */}
        <div
          className="absolute inset-0 rounded-[46px] bg-[#0A0D14] -z-10 pointer-events-none"
          style={{
            transform: "translateZ(-13px)",
            boxShadow: "0 0 0 2px #1A202C, -8px 12px 30px rgba(0,0,0,0.45)",
          }}
        />
      </div>

      {/* Contact shadow */}
      <div
        ref={shadowRef}
        className="absolute -bottom-2 w-56 h-6 rounded-[50%] blur-2xl pointer-events-none -z-10"
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(6,24,56,0.55) 0%, rgba(6,24,56,0.22) 50%, transparent 78%)",
          opacity: 0.5,
        }}
      />
    </div>
  );
}
