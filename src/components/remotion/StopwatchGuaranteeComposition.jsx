import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const StopwatchGuaranteeComposition = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Needle sweep rotation
  const needleRotation = (frame * 6) % 360;

  // Pulse effect
  const glowOpacity = interpolate(
    Math.sin((frame / fps) * Math.PI * 3),
    [-1, 1],
    [0.4, 0.85]
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 14px",
        background: "linear-gradient(90deg, #061838 0%, #0c2b5e 100%)",
        borderRadius: "16px",
        fontFamily: "system-ui, -apple-system, sans-serif",
        color: "#ffffff",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box"
      }}
    >
      {/* Animated Glow Aura */}
      <div
        style={{
          position: "absolute",
          top: -20,
          right: 30,
          width: 80,
          height: 80,
          borderRadius: "50%",
          background: "#f7c400",
          filter: "blur(28px)",
          opacity: glowOpacity,
          pointerEvents: "none"
        }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: "10px", zIndex: 1 }}>
        {/* Animated Stopwatch Dial */}
        <div
          style={{
            position: "relative",
            width: 34,
            height: 34,
            borderRadius: "50%",
            border: "2px solid #f7c400",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.3)"
          }}
        >
          {/* Sweeping hand */}
          <div
            style={{
              position: "absolute",
              top: "4px",
              left: "15px",
              width: "2px",
              height: "13px",
              background: "#ffffff",
              borderRadius: "2px",
              transformOrigin: "bottom center",
              transform: `rotate(${needleRotation}deg)`
            }}
          />
          <div
            style={{
              width: "5px",
              height: "5px",
              background: "#f7c400",
              borderRadius: "50%",
              zIndex: 2
            }}
          />
        </div>

        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
            <span style={{ fontSize: "12px", fontWeight: "900", letterSpacing: "-0.3px", color: "#ffffff" }}>
              Express Delivery
            </span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#f7c400" stroke="#f7c400" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          </div>
          <span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: "600" }}>
            Serving a 5 km Anantnag radius
          </span>
        </div>
      </div>

      <div
        style={{
          background: "rgba(247, 196, 0, 0.15)",
          border: "1px solid rgba(247, 196, 0, 0.4)",
          color: "#f7c400",
          fontSize: "10px",
          fontWeight: "900",
          padding: "3px 8px",
          borderRadius: "8px",
          zIndex: 1,
          fontFamily: "monospace"
        }}
      >
        ACTIVE
      </div>
    </div>
  );
};
