import { useState, useRef, useEffect, useId } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Calendar, IndianRupee, Package, ArrowUpRight } from "lucide-react";
import { animate } from "animejs";

// Mock analytics data for different time horizons
const DATA_TODAY = [
  { label: "6 AM", value: 140, orders: 3 },
  { label: "8 AM", value: 480, orders: 9 },
  { label: "10 AM", value: 1250, orders: 24 },
  { label: "12 PM", value: 1890, orders: 36 },
  { label: "2 PM", value: 1420, orders: 28 },
  { label: "4 PM", value: 2100, orders: 41 },
  { label: "6 PM", value: 2980, orders: 58 },
  { label: "8 PM", value: 3850, orders: 72 },
  { label: "10 PM", value: 4200, orders: 81 },
];

const DATA_WEEK = [
  { label: "Mon", value: 14500, orders: 290 },
  { label: "Tue", value: 16200, orders: 320 },
  { label: "Wed", value: 15100, orders: 305 },
  { label: "Thu", value: 18900, orders: 375 },
  { label: "Fri", value: 22400, orders: 440 },
  { label: "Sat", value: 28600, orders: 560 },
  { label: "Sun", value: 31200, orders: 610 },
];

const DATA_MONTH = [
  { label: "Week 1", value: 98000, orders: 1950 },
  { label: "Week 2", value: 112000, orders: 2210 },
  { label: "Week 3", value: 128500, orders: 2540 },
  { label: "Week 4", value: 149000, orders: 2930 },
];

export default function BklitAreaChart({ className = "" }) {
  const [range, setRange] = useState("today"); // "today" | "week" | "month"
  const [metric, setMetric] = useState("revenue"); // "revenue" | "orders"
  const [hoverIndex, setHoverIndex] = useState(null);
  const pathRef = useRef(null);
  const areaRef = useRef(null);
  const gradientId = useId();

  const currentData =
    range === "today" ? DATA_TODAY : range === "week" ? DATA_WEEK : DATA_MONTH;

  const values = currentData.map((d) => (metric === "revenue" ? d.value : d.orders));
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);

  // SVG Chart Geometry
  const width = 600;
  const height = 180;
  const paddingX = 30;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingTop - paddingBottom;

  const points = currentData.map((d, i) => {
    const x = paddingX + (i / (currentData.length - 1)) * chartWidth;
    const val = metric === "revenue" ? d.value : d.orders;
    const y =
      paddingTop +
      chartHeight -
      ((val - minValue) / (maxValue - minValue || 1)) * chartHeight;
    return { x, y, data: d };
  });

  // Construct smooth cubic Bezier SVG path
  const generateBezierPath = (pts) => {
    if (pts.length < 2) return "";
    let d = `M ${pts[0].x},${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i];
      const p1 = pts[i + 1];
      const cx1 = p0.x + (p1.x - p0.x) / 2;
      const cy1 = p0.y;
      const cx2 = p0.x + (p1.x - p0.x) / 2;
      const cy2 = p1.y;
      d += ` C ${cx1},${cy1} ${cx2},${cy2} ${p1.x},${p1.y}`;
    }
    return d;
  };

  const linePath = generateBezierPath(points);
  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x},${height - paddingBottom} L ${points[0].x},${height - paddingBottom} Z`
      : "";

  // Trigger Anime.js stroke reveal when data or metric changes
  useEffect(() => {
    if (pathRef.current) {
      try {
        const length = pathRef.current.getTotalLength();
        pathRef.current.style.strokeDasharray = `${length}`;
        pathRef.current.style.strokeDashoffset = `${length}`;

        animate(pathRef.current, {
          strokeDashoffset: [length, 0],
          duration: 900,
          ease: "outQuad",
        });
      } catch (e) {}
    }
  }, [range, metric]);

  const activePoint = hoverIndex !== null ? points[hoverIndex] : points[points.length - 1];
  const totalSum = values.reduce((s, v) => s + v, 0);

  return (
    <div
      className={`bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4 ${className} dark:bg-surface-raised dark:border-line`}
    >
      {/* Top Header & Range Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-line-soft">
        <div className="space-y-0.5">
          <div className="flex items-center space-x-2">
            <span className="p-1.5 rounded-xl bg-orange-50 text-[#FF5B00] border border-orange-200">
              <TrendingUp className="w-4 h-4" />
            </span>
            <h3 className="font-black text-sm text-slate-900 tracking-tight dark:text-content">
              Fulfilment & Revenue Trajectory
            </h3>
            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-orange-100 text-[#FF5B00] flex items-center space-x-0.5">
              <span>+18.4%</span>
              <ArrowUpRight className="w-2.5 h-2.5 stroke-[3]" />
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium dark:text-content-muted">
            Real-time live dispatch volume for Anantnag Store #01
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-1.5 self-start sm:self-center flex-wrap gap-1">
          {/* Metric Selector */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold dark:bg-surface-muted dark:border-line">
            <button
              onClick={() => setMetric("revenue")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                metric === "revenue"
                  ? "bg-white text-[#FF5B00] shadow-xs font-black dark:bg-surface-raised"
                  : "text-slate-600 hover:text-slate-900 dark:text-content-secondary dark:hover:text-content"
              }`}
            >
              Revenue
            </button>
            <button
              onClick={() => setMetric("orders")}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                metric === "orders"
                  ? "bg-white text-[#FF5B00] shadow-xs font-black dark:bg-surface-raised"
                  : "text-slate-600 hover:text-slate-900 dark:text-content-secondary dark:hover:text-content"
              }`}
            >
              Orders
            </button>
          </div>

          {/* Horizon Selector */}
          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold dark:bg-surface-muted dark:border-line">
            {["today", "week", "month"].map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-2.5 py-1 rounded-lg uppercase text-[10px] tracking-wider transition-all ${
                  range === r
                    ? "bg-[#FF5B00] text-white shadow-xs font-black"
                    : "text-slate-600 hover:text-slate-900 dark:text-content-secondary dark:hover:text-content"
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Metric Highlight Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100 space-y-0.5 dark:border-line-soft">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
            {metric === "revenue" ? "Period Revenue" : "Total Orders"}
          </span>
          <div className="text-xl font-black text-slate-900 font-mono">
            {metric === "revenue" ? `₹${totalSum.toLocaleString()}` : totalSum}
          </div>
        </div>

        <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100 space-y-0.5 dark:border-line-soft">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
            Peak Velocity
          </span>
          <div className="text-xl font-black text-[#FF5B00] font-mono">
            {metric === "revenue" ? `₹${maxValue.toLocaleString()}` : maxValue}
          </div>
        </div>

        <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100 space-y-0.5 dark:border-line-soft">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
            Avg Order Value
          </span>
          <div className="text-xl font-black text-amber-700 font-mono">₹218</div>
        </div>

        <div className="bg-slate-50/80 p-3 rounded-2xl border border-slate-100 space-y-0.5 dark:border-line-soft">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
            Dispatch SLA
          </span>
          <div className="text-xl font-black text-sky-700 font-mono">7.8 mins</div>
        </div>
      </div>

      {/* SVG Interactive Area Chart */}
      <div className="relative w-full overflow-hidden pt-1">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-44 select-none touch-none overflow-visible"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#FF5B00" stopOpacity="0.32" />
              <stop offset="60%" stopColor="#FF5B00" stopOpacity="0.08" />
              <stop offset="100%" stopColor="#FF5B00" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Background Subtle Grid Lines */}
          {[0.25, 0.5, 0.75, 1].map((ratio) => {
            const y = paddingTop + chartHeight * (1 - ratio);
            return (
              <line
                key={ratio}
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="#E2E8F0"
                strokeDasharray="4 4"
                strokeWidth="1"
              />
            );
          })}

          {/* Area Fill */}
          <motion.path
            ref={areaRef}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            d={areaPath}
            fill={`url(#${gradientId})`}
          />

          {/* Stroke Line */}
          <path
            ref={pathRef}
            d={linePath}
            fill="none"
            stroke="#FF5B00"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points & Interactive Hit Targets */}
          {points.map((pt, idx) => {
            const isHovered = hoverIndex === idx;
            return (
              <g key={idx}>
                {/* Hit Box for easy mobile touch scrubbing */}
                <rect
                  x={pt.x - chartWidth / (points.length * 2)}
                  y={0}
                  width={chartWidth / points.length}
                  height={height}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoverIndex(idx)}
                  onTouchStart={() => setHoverIndex(idx)}
                />

                {/* Point circle */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? 6 : 3.5}
                  fill={isHovered ? "#FF5B00" : "#FF5B00"}
                  stroke="#FFFFFF"
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  className="transition-all duration-150 pointer-events-none"
                />

                {/* X-axis label */}
                <text
                  x={pt.x}
                  y={height - 8}
                  textAnchor="middle"
                  className="text-[10px] font-bold fill-slate-400 font-sans pointer-events-none"
                >
                  {pt.data.label}
                </text>
              </g>
            );
          })}

          {/* Active Hover Guide Line */}
          {activePoint && hoverIndex !== null && (
            <line
              x1={activePoint.x}
              y1={paddingTop}
              x2={activePoint.x}
              y2={height - paddingBottom}
              stroke="#FF5B00"
              strokeWidth="1.5"
              strokeDasharray="3 3"
              className="pointer-events-none"
            />
          )}
        </svg>

        {/* Floating Tooltip Pill */}
        {activePoint && hoverIndex !== null && (
          <div
            className="absolute -top-3 z-10 bg-slate-900 text-white px-3 py-1.5 rounded-xl shadow-lg border border-slate-700 pointer-events-none text-xs transition-transform duration-100 flex items-center space-x-2"
            style={{
              left: `${(activePoint.x / width) * 100}%`,
              transform: "translate(-50%, -100%)",
            }}
          >
            <span className="font-bold text-slate-300 dark:text-content-faint">{activePoint.data.label}:</span>
            <span className="font-mono font-black text-orange-400">
              ₹{activePoint.data.value.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 font-medium dark:text-content-faint">
              ({activePoint.data.orders} orders)
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
