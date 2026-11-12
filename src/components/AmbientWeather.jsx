import { useEffect, useRef, useState } from "react";
import { useStoreDetails } from "../lib/storeStatus";

/**
 * A faint snowfall or rain behind the shop while the admin has the weather
 * advisory on (`weatherAlert` on `config/store`, type "snow" or "rain").
 * Nothing new to switch: the same control that shows the "orders may be
 * delayed" banner drives this.
 *
 * Kept deliberately quiet: a few dozen soft particles, low opacity, no touch
 * handling, paused when the tab is hidden, and skipped for people who ask their
 * device to reduce motion.
 */

const FADE_SECONDS = 1.6;

function particleCount(width, height, kind) {
  const base = (width * height) / (kind === "snow" ? 16000 : 22000);
  return Math.max(24, Math.min(kind === "snow" ? 70 : 55, Math.round(base)));
}

function makeParticle(kind, width, height, anywhere) {
  const depth = Math.random(); // 0 = far and faint, 1 = near and clearer
  if (kind === "snow") {
    return {
      x: Math.random() * width,
      y: anywhere ? Math.random() * height : -10,
      r: 0.8 + depth * 2.1,
      speed: 14 + depth * 26,
      sway: 6 + Math.random() * 12,
      phase: Math.random() * Math.PI * 2,
      alpha: 0.22 + depth * 0.4,
    };
  }
  return {
    x: Math.random() * (width + 80) - 40,
    y: anywhere ? Math.random() * height : -30,
    len: 9 + depth * 14,
    speed: 520 + depth * 380,
    alpha: 0.1 + depth * 0.16,
    w: 0.6 + depth * 0.5,
  };
}

/** Light backgrounds need a cool grey-blue; white flakes would vanish on them. */
function inkFor(kind) {
  const dark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");
  if (kind === "snow") return dark ? "255,255,255" : "120,146,184";
  return dark ? "174,198,230" : "96,122,160";
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
    const ctx = canvas && canvas.getContext("2d");
    if (!ctx) return undefined;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let particles = [];
    let raf = 0;
    let last = 0;
    let level = 0; // 0..1 fade in / out
    let ink = inkFor(kind);
    let inkCheck = 0;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
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
        for (const p of particles) {
          p.y += p.speed * dt;
          const x = p.x + Math.sin(t * 0.6 + p.phase) * p.sway;
          if (p.y > height + 10) Object.assign(p, makeParticle("snow", width, height, false), { x: Math.random() * width });
          const a = p.alpha * level;
          const g = ctx.createRadialGradient(x, p.y, 0, x, p.y, p.r * 2);
          g.addColorStop(0, `rgba(${ink},${a})`);
          g.addColorStop(1, `rgba(${ink},0)`);
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(x, p.y, p.r * 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else {
        const slant = 0.2; // a gentle lean, not a storm
        ctx.lineCap = "round";
        for (const p of particles) {
          p.y += p.speed * dt;
          p.x += p.speed * slant * dt;
          if (p.y > height + 30 || p.x > width + 40) {
            Object.assign(p, makeParticle("rain", width, height, false), { x: Math.random() * (width + 80) - 40 });
          }
          ctx.strokeStyle = `rgba(${ink},${p.alpha * level})`;
          ctx.lineWidth = p.w;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.len * slant, p.y - p.len);
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
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [kind]);

  if (!kind) return null;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none"
      style={{ width: "100vw", height: "100vh", zIndex: 40 }}
    />
  );
}
