import { useEffect, useRef } from "react";

/**
 * High-performance Canvas animation reproducing OrderStageIcon.kt (Android)
 * and OrderStageIcon.swift (iOS) frame for frame:
 *
 * Stage 1 (RECEIVED): A receipt drawing itself line by line, followed by
 * an orange badge popping in and a tick mark drawing itself.
 *
 * Stage 2 (PACKING): Two items dropping into a box with physics, flaps folding
 * shut, and an orange tape strip sealing the carton with a gentle hop.
 */

const RECEIVED_PERIOD = 3.2;
const PACKING_PERIOD = 3.6;

function segment(t, start, end) {
  if (t <= start) return 0;
  if (t >= end) return 1;
  return (t - start) / (end - start);
}

function easeOut(x) {
  return 1 - Math.pow(1 - x, 3);
}

function easeInOut(x) {
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

function easeOutBack(x) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

function drawTrimmedLine(ctx, x1, y1, x2, y2, progress) {
  if (progress <= 0) return;
  const curX = x1 + (x2 - x1) * progress;
  const curY = y1 + (y2 - y1) * progress;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(curX, curY);
  ctx.stroke();
}

function drawTrimmedPolyline(ctx, points, progress) {
  if (progress <= 0 || points.length < 2) return;
  let totalLength = 0;
  const segLengths = [];
  for (let i = 0; i < points.length - 1; i++) {
    const dx = points[i + 1].x - points[i].x;
    const dy = points[i + 1].y - points[i].y;
    const len = Math.hypot(dx, dy);
    segLengths.push(len);
    totalLength += len;
  }
  let targetLen = totalLength * progress;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 0; i < segLengths.length; i++) {
    if (targetLen >= segLengths[i]) {
      ctx.lineTo(points[i + 1].x, points[i + 1].y);
      targetLen -= segLengths[i];
    } else {
      const f = targetLen / segLengths[i];
      const curX = points[i].x + (points[i + 1].x - points[i].x) * f;
      const curY = points[i].y + (points[i + 1].y - points[i].y) * f;
      ctx.lineTo(curX, curY);
      break;
    }
  }
  ctx.stroke();
}

function drawReceived(ctx, time) {
  const t = time % RECEIVED_PERIOD;
  const fade = 1 - segment(t, 2.7, 3.1);

  ctx.save();
  ctx.globalAlpha = fade;

  // Receipt Background & Outline
  ctx.fillStyle = "#0B0B0E";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.moveTo(36, 24);
  ctx.quadraticCurveTo(36, 18, 42, 18);
  ctx.lineTo(78, 18);
  ctx.quadraticCurveTo(84, 18, 84, 24);
  const zigzags = [
    [84, 100],
    [77, 95],
    [70, 100],
    [63, 95],
    [56, 100],
    [49, 95],
    [42, 100],
    [36, 95],
  ];
  for (const [x, y] of zigzags) {
    ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Lines on receipt
  const lines = [
    { x1: 46, y: 38, x2: 74, s: 0.15, e: 0.55 },
    { x1: 46, y: 50, x2: 70, s: 0.43, e: 0.83 },
    { x1: 46, y: 62, x2: 62, s: 0.71, e: 1.11 },
  ];

  ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
  for (const l of lines) {
    const progress = easeOut(segment(t, l.s, l.e));
    drawTrimmedLine(ctx, l.x1, l.y, l.x2, l.y, progress);
  }

  // Tick badge pop-in
  const pop = easeOutBack(segment(t, 1.05, 1.45));
  if (pop > 0.001) {
    ctx.save();
    ctx.translate(80, 90);
    ctx.scale(pop, pop);
    ctx.beginPath();
    ctx.arc(0, 0, 15, 0, Math.PI * 2);
    ctx.fillStyle = "#FF5B00";
    ctx.fill();

    // Checkmark inside badge
    const tick = easeOut(segment(t, 1.35, 1.75));
    if (tick > 0.001) {
      ctx.strokeStyle = "#FFFFFF";
      ctx.lineWidth = 3.5;
      drawTrimmedPolyline(
        ctx,
        [
          { x: -8, y: 0 },
          { x: -2.5, y: 5.5 },
          { x: 8, y: -5 },
        ],
        tick
      );
    }
    ctx.restore();
  }

  ctx.restore();
}

function drawPacking(ctx, time) {
  const t = time % PACKING_PERIOD;
  const gone = segment(t, 2.8, 3.2);

  // 1. Items falling in
  const items = [
    { x: 43, w: 16, h: 16, filled: true, start: 0.1 },
    { x: 62, w: 14, h: 19, filled: false, start: 0.6 },
  ];

  for (const it of items) {
    const fall = segment(t, it.start, it.start + 0.75);
    if (fall <= 0) continue;
    const alpha = Math.min(1, fall / 0.15) * (1 - gone);
    const y = 4 + (74 - 4) * fall * fall;

    ctx.save();
    ctx.globalAlpha = alpha;
    if (it.filled) {
      ctx.fillStyle = "#FF5B00";
      roundRect(ctx, it.x, y, it.w, it.h, 4);
      ctx.fill();
    } else {
      ctx.fillStyle = "#0B0B0E";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
      ctx.lineWidth = 3.5;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      roundRect(ctx, it.x, y, it.w, it.h, 4);
      ctx.fill();
      ctx.stroke();
    }
    ctx.restore();
  }

  // 2. Box shutting and little hop once taped
  const shut = easeInOut(segment(t, 1.5, 1.95)) * (1 - easeInOut(segment(t, 2.95, 3.4)));
  const hop = Math.sin(Math.PI * segment(t, 1.95, 2.3));

  ctx.save();
  ctx.translate(0, -4 * hop);

  // Box front
  ctx.fillStyle = "#0B0B0E";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.92)";
  ctx.lineWidth = 4;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  ctx.beginPath();
  ctx.moveTo(28, 56);
  ctx.lineTo(92, 56);
  ctx.lineTo(92, 96);
  ctx.quadraticCurveTo(92, 102, 86, 102);
  ctx.lineTo(34, 102);
  ctx.quadraticCurveTo(28, 102, 28, 96);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Flaps
  const angle = ((1 - shut) * 118 * Math.PI) / 180;
  const length = 26;

  // Left flap
  ctx.beginPath();
  ctx.moveTo(28, 56);
  ctx.lineTo(28 + length * Math.cos(angle), 56 - length * Math.sin(angle));
  ctx.stroke();

  // Right flap
  ctx.beginPath();
  ctx.moveTo(92, 56);
  ctx.lineTo(92 - length * Math.cos(angle), 56 - length * Math.sin(angle));
  ctx.stroke();

  // Tape sealing
  const tape = easeOut(segment(t, 1.95, 2.35));
  if (tape > 0.001) {
    ctx.save();
    ctx.globalAlpha = 1 - segment(t, 2.8, 2.95);
    ctx.strokeStyle = "#FF5B00";
    ctx.lineWidth = 5;
    ctx.lineCap = "round";
    drawTrimmedLine(ctx, 50, 56, 70, 56, tape);
    ctx.restore();
  }

  ctx.restore();
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

export default function OrderStageAnimation({ kind = "RECEIVED", className = "w-40 h-40" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId;
    const startTime = performance.now();

    const render = (now) => {
      const time = (now - startTime) / 1000;
      const dpr = window.devicePixelRatio || 1;
      const size = 120;

      if (canvas.width !== size * dpr || canvas.height !== size * dpr) {
        canvas.width = size * dpr;
        canvas.height = size * dpr;
      }

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.scale(dpr, dpr);

      // Ambient background circle
      ctx.beginPath();
      ctx.arc(60, 60, 56, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
      ctx.fill();

      if (kind === "RECEIVED") {
        drawReceived(ctx, time);
      } else if (kind === "PACKING") {
        drawPacking(ctx, time);
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [kind]);

  return (
    <div className={`relative flex items-center justify-center select-none ${className}`}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "100%" }}
        className="w-full h-full"
      />
    </div>
  );
}
