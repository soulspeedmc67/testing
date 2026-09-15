import { useRef, useEffect, useState, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float } from "@react-three/drei";
import { MathUtils } from "three";
import DashitLogo3D from "./DashitLogo3D";

/**
 * A single quiet 3D moment for the hero.
 *
 * Deliberately has no HDRI environment map and no loaded assets: drei's
 * <Environment> presets fetch a multi-megabyte texture from a CDN, which is the
 * wrong trade for a hero that most people scroll past in two seconds. Three
 * lights get the same soft look for nothing.
 *
 * The canvas is client-only — import it with next/dynamic and `ssr: false`, or
 * `next build` will try to construct a WebGL context during static export.
 */

/** The mark itself: a constant slow spin, independent of the pointer tilt. */
function FloatingShape({ swaySpeed, swayAmount, reducedMotion }) {
  const spin = useRef();

  useFrame((state) => {
    if (reducedMotion || !spin.current) return;
    /* A logo must stay readable. A continuous 360 spin turns the mark edge-on
       twice per revolution — a meaningless sliver — so this sways within a
       narrow arc instead and never shows the back. Driven from elapsed time
       rather than accumulated delta, so a paused tab resumes in phase instead
       of jumping. */
    spin.current.rotation.y = Math.sin(state.clock.elapsedTime * swaySpeed) * swayAmount;
  });

  return (
    <group ref={spin}>
      <DashitLogo3D />
    </group>
  );
}

/** Pointer tilt lives on a parent group so it never fights the spin above. */
function TiltRig({ children, strength, reducedMotion }) {
  const rig = useRef();

  useFrame((state, delta) => {
    if (reducedMotion || !rig.current) return;
    /* Lerp toward the pointer rather than tracking it: the shape should feel
       like it noticed the cursor, not like it is attached to it. */
    const t = 1 - Math.pow(0.001, Math.min(delta, 0.1));
    rig.current.rotation.x = MathUtils.lerp(rig.current.rotation.x, -state.pointer.y * strength, t);
    rig.current.rotation.y = MathUtils.lerp(rig.current.rotation.y, state.pointer.x * strength, t);
  });

  return <group ref={rig}>{children}</group>;
}

/** True when this browser can actually give us a WebGL context. */
function hasWebGL() {
  if (typeof window === "undefined") return false;
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch (e) {
    return false;
  }
}

export default function HeroObject3D({
  fallback = null,
  color = "#D97757",
  className = "",
  swaySpeed = 0.5,
  swayAmount = 0.34,
  tiltStrength = 0.16,
  height = 340,
}) {
  const wrapRef = useRef(null);
  const [running, setRunning] = useState(false);
  const [painted, setPainted] = useState(false);
  const supported = useMemo(hasWebGL, []);

  const reducedMotion = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
  }, []);

  /* Two independent reasons to stop rendering, and both must be true to start:
     a hidden tab, and a hero scrolled off screen. Either one alone would still
     leave a WebGL loop burning battery for nothing. */
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    let visible = !document.hidden;
    let onScreen = false;
    const sync = () => setRunning(visible && onScreen);

    const onVisibility = () => {
      visible = !document.hidden;
      sync();
    };
    document.addEventListener("visibilitychange", onVisibility);

    const io = new IntersectionObserver(
      ([entry]) => {
        onScreen = entry.isIntersecting;
        sync();
      },
      { threshold: 0.05 }
    );
    io.observe(el);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      io.disconnect();
    };
  }, []);

  /* Nothing to swap to on a device without WebGL, so show the flat artwork and
     never build a context. */
  if (!supported) {
    return (
      <div className={className} style={{ width: "100%" }}>
        {fallback}
      </div>
    );
  }

  return (
    <div ref={wrapRef} className={className} style={{ height, width: "100%" }}>
      <Canvas
        /* Paused is "demand", not "never": demand still draws a single frame on
           mount, so a hero that first appears while the tab is backgrounded
           shows the shape sitting still rather than an empty gap that pops in
           when you return. Either way no frames are drawn while paused. */
        frameloop={running ? "always" : "demand"}
        /* The canvas is pointer-events:none so it never swallows a click meant
           for the hero copy behind it — which also means it receives no pointer
           events of its own. eventSource moves that listening up to the wrapper,
           so the shape still reacts to the cursor anywhere over the hero. */
        eventSource={wrapRef}
        /* Capped rather than window.devicePixelRatio: a 3x phone screen would
           otherwise render nine times the pixels for a decorative shape. */
        dpr={[1, 1.75]}
        camera={{ position: [0, 0, 5], fov: 42 }}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        onCreated={() => setPainted(true)}
        /* Faded up on the first frame. Without this the mark appears abruptly
           the moment its chunk finishes parsing, which reads as a glitch. */
        style={{
          pointerEvents: "none",
          background: "transparent",
          opacity: painted ? 1 : 0,
          transition: "opacity 420ms ease-out",
        }}
      >
        {/* The mark is #0E1A2A — nearly black. Flat front lighting turned it into
            a silhouette, so this is a proper three-point rig: a warm key that
            models the faces, a cool fill that keeps the shadow side readable
            as navy rather than black, and a rim behind to draw a bright edge
            that separates the mark from whatever sits behind it. */}
        <ambientLight intensity={0.55} />
        <directionalLight position={[4, 5, 6]} intensity={2.1} color="#FFF6EC" />
        <directionalLight position={[-5, 0, 2]} intensity={0.75} color="#BFD4FF" />
        <directionalLight position={[-1, 2, -5]} intensity={1.4} color="#FFFFFF" />

        <TiltRig strength={tiltStrength} reducedMotion={reducedMotion}>
          <Float speed={1.1} rotationIntensity={0.25} floatIntensity={0.6} enabled={!reducedMotion}>
            <FloatingShape swaySpeed={swaySpeed} swayAmount={swayAmount} reducedMotion={reducedMotion} />
          </Float>
        </TiltRig>
      </Canvas>
    </div>
  );
}
