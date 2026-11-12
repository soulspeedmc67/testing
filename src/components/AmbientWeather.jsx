import { useEffect, useRef, useState } from "react";
import { useStoreDetails } from "../lib/storeStatus";

/**
 * A faint snowfall or rain inside the home header's gradient while the admin
 * has the weather advisory on (`weatherAlert` on `config/store`, type "snow"
 * or "rain"). Put it as the first child of a `relative` header: it fills that
 * box, fades out toward the bottom edge with the gradient, and never takes a
 * touch.
 *
 * Kept deliberately quiet: a handful of soft particles at low opacity, paused
 * when the tab is hidden, and skipped for people who ask their device to
 * reduce motion.
 */

const FADE_SECONDS = 1.6;

function particleCount(width, height, kind) {
  const base = (width * height) / (kind === "snow" ? 1500 : 1800);
  return Math.max(30, Math.min(kind === "snow" ? 110 : 100, Math.round(base)));
}

/* Depth runs 0 (far: tiny, slow, faint) to 1 (near: bigger, quicker, clearer).
   Squaring the random number gives plenty of far particles and a few near
   ones, which is what makes the fall look deep instead of flat. */
function makeParticle(kind, width, height, anywhere) {
  const depth = Math.pow(Math.random(), 1.5);
  if (kind === "snow") {
    return {
      depth,
      x: Math.random() * width,
      y: anywhere ? Math.random() * height : -10,
      r: 0.6 + depth * 2.2,
      speed: 12 + depth * 34,
      sway: 3 + Math.random() * 9,
      swaySpeed: 0.4 + Math.random() * 0.7,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.3 + depth * 0.45,
    };
  }
  return {
    depth,
    x: Math.random() * (width + 60) - 30,
    y: anywhere ? Math.random() * height : -30,
    len: 8 + depth * 18,
    speed: 380 + depth * 520,
    alpha: 0.24 + depth * 0.44,
    w: 0.6 + depth * 0.9,
  };
}

/** Snow is a white core with a soft cool-grey edge: pure white would vanish on the light peach header. */
function inkFor(kind) {
  const dark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  if (kind === "snow") return dark ? "255,255,255" : "104,132,178";
  return dark ? "174,198,230" : "84,108,152";
}

export default function AmbientWeather() {
  const { weatherAlert } = useStoreDetails();
  const wanted =
    weatherAlert && weatherAlert.active && (weatherAlert.type === "snow" || weatherAlert.type === "rain")
      ? weatherAlert.type
      : null;

  // Keep the canvas mounted while it fades out so it never just blinks off.
  const [kind, setKind] = useState(wanted);
  const wantedRef = useRef(wanted);
  const canvasRef = useRef(null);

  useEffect(() => {
    wantedRef.current = wanted;
    if (wanted) setKind(wanted);
  }, [wanted]);

  useEffect(() => {
    if (!kind) return undefined;
    if (typeof window === "undefined") return undefined;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce && reduce.matches) return undefined;

    const canvas = canvasRef.current;
    const box = canvas && canvas.parentElement;
    const ctx = canvas && canvas.getContext("2d");
    if (!ctx || !box) return undefined;

    let width = 0;
    let height = 0;
    let particles = [];
    let raf = 0;
    let last = 0;
    let level = 0; // 0..1 fade in / out
    let ink = inkFor(kind);
    let inkCheck = 0;

    const resize = () => {
      const rect = box.getBoundingClientRect();
      width = Math.max(1, Math.round(rect.width));
      height = Math.max(1, Math.round(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = particleCount(width, height, kind);
      particles = Array.from({ length: count }, () => makeParticle(kind, width, height, true));
    };

    const frame = (now) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min((now - (last || now)) / 1000, 0.05);
      last = now;

      const target = wantedRef.current === kind ? 1 : 0;
      level += Math.sign(target - level) * Math.min(Math.abs(target - level), dt / FADE_SECONDS);
      if (level <= 0 && target === 0) {
        setKind(wantedRef.current);
        return;
      }

      inkCheck += dt;
      if (inkCheck > 2) {
        inkCheck = 0;
        ink = inkFor(kind);
      }

      ctx.clearRect(0, 0, width, height);
      const t = now / 1000;

      if (kind === "snow") {
        // A slow, shifting breeze: near flakes lean into it more than far ones.
        const wind = Math.sin(t * 0.23) * 7 + Math.sin(t * 0.71 + 1.3) * 3;
        for (const p of particles) {
          p.y += p.speed * dt;
          p.x += wind * (0.35 + p.depth) * dt;
          const x = p.x + Math.sin(t * p.swaySpeed + p.phase) * p.sway;
          if (p.y > height + 10 || x < -20 || x > width + 20) {
            Object.assign(p, makeParticle("snow", width, height, false));
          }
          const a = p.alpha * level;
          const reach = p.r * (p.depth > 0.7 ? 2.6 : 2);
          const g = ctx.createRadialGradient(x, p.y, 0, x, p.y, reach);
          // Edge first (cool grey-blue, soft), then the white core on top.
          g.addColorStop(0, `rgba(${ink},${a * 0.62})`);
          g.addColorStop(0.5, `rgba(${ink},${a * 0.42})`);
          g.addColorStop(1, `rgba(${ink},0)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, p.y, reach, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = `rgba(255,255,255,${Math.min(1, a * 1.25)})`;
          ctx.beginPath();
          ctx.arc(x, p.y, p.r * 0.7, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        // The wind eases a little, so the streaks lean slightly differently over time.
        const slant = 0.2 + Math.sin(t * 0.3) * 0.04;
        ctx.lineCap = "round";
        for (const p of particles) {
          p.y += p.speed * dt;
          p.x += p.speed * slant * dt;
          if (p.y > height + 30 || p.x > width + 30) {
            Object.assign(p, makeParticle("rain", width, height, false));
          }
          // Faint tail, brighter head: reads as motion blur, not a hard line.
          const tx = p.x - p.len * slant;
          const ty = p.y - p.len;
          const g = ctx.createLinearGradient(tx, ty, p.x, p.y);
          g.addColorStop(0, `rgba(${ink},0)`);
          g.addColorStop(1, `rgba(${ink},${p.alpha * level})`);
          ctx.strokeStyle = g;
          ctx.lineWidth = p.w;
          ctx.beginPath();
          ctx.moveTo(tx, ty);
          ctx.lineTo(p.x, p.y);
          ctx.stroke();
        }
      }
    };

    const start = () => {
      if (raf || document.hidden) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    resize();
    start();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    if (observer) observer.observe(box);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      if (observer) observer.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [kind]);

  if (!kind) return null;
  const fade = "linear-gradient(to bottom, #000 0%, #000 45%, transparent 100%)";
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ WebkitMaskImage: fade, maskImage: fade }}
    />
  );
}
