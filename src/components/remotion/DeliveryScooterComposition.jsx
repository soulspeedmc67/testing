import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";

export const DeliveryScooterComposition = ({ etaMinutes = 7, riderName = "Tariq Ahmad" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Vertical bounce for rider
  const bounce = Math.sin((frame / fps) * Math.PI * 4) * 2;

  // Road dashed lines speed
  const roadOffset = (frame * 10) % 36;

  // Pulse effect
  const pulseScale = interpolate(
    Math.sin((frame / fps) * Math.PI * 2),
    [-1, 1],
    [0.97, 1.03]
  );

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 16px",
        background: "linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%)",
        borderRadius: "20px",
        border: "1px solid rgba(16, 185, 129, 0.3)",
        fontFamily: "system-ui, -apple-system, sans-serif",
        position: "relative",
        overflow: "hidden",
        boxSizing: "border-box"
      }}
    >
      {/* Animated road track at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 8,
          left: 0,
          right: 0,
          height: 3,
          background: "#e2e8f0",
          overflow: "hidden"
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: -roadOffset,
            width: "140%",
            height: "100%",
            backgroundImage: "repeating-linear-gradient(90deg, #10b981 0px, #10b981 12px, transparent 12px, transparent 24px)"
          }}
        />
      </div>

      {/* Scooter & Rider */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", zIndex: 1 }}>
        <div
          style={{
            transform: `translateY(${bounce}px)`,
            filter: "drop-shadow(0 4px 8px rgba(12, 131, 31, 0.25))"
          }}
        >
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0c831f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="18.5" cy="17.5" r="3.5"/><circle cx="5.5" cy="17.5" r="3.5"/><circle cx="15" cy="5" r="1"/><path d="M12 17.5V14l-3-3 4-3 2 3h2"/></svg>
        </div>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", fontWeight: "900", color: "#0f172a" }}>
              {riderName}
            </span>
            <span
              style={{
                fontSize: "9px",
                fontWeight: "800",
                background: "#0c831f",
                color: "#ffffff",
                padding: "1px 6px",
                borderRadius: "6px"
              }}
            >
              LIVE GPS
            </span>
          </div>
          <span style={{ fontSize: "10px", fontWeight: "600", color: "#64748b" }}>
            5 km radius express darkstore delivery
          </span>
        </div>
      </div>

      {/* ETA Badge with spring pulse */}
      <div
        style={{
          transform: `scale(${pulseScale})`,
          background: "#ffffff",
          padding: "6px 12px",
          borderRadius: "14px",
          border: "1px solid rgba(16, 185, 129, 0.4)",
          boxShadow: "0 4px 12px rgba(12, 131, 31, 0.12)",
          textAlign: "right",
          zIndex: 1
        }}
      >
        <div style={{ fontSize: "9px", fontWeight: "800", color: "#0c831f", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Arriving In
        </div>
        <div style={{ fontSize: "13px", fontWeight: "900", color: "#0f172a", fontFamily: "monospace" }}>
          {etaMinutes} Mins
        </div>
      </div>
    </div>
  );
};
