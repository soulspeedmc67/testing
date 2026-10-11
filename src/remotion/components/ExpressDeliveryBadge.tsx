import React from 'react';
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

export const ExpressDeliveryBadge: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterSpring = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const pulse = Math.sin(frame / 6) * 0.05 + 1;
  const translateY = interpolate(enterSpring, [0, 1], [60, 0]);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 185,
        left: '50%',
        transform: `translateX(-50%) translateY(${translateY}px) scale(${enterSpring * pulse})`,
        transformOrigin: 'bottom center',
        zIndex: 48,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        background: 'linear-gradient(135deg, rgba(20, 24, 40, 0.96) 0%, rgba(10, 14, 28, 0.98) 100%)',
        border: '2px solid #FF6B00',
        borderRadius: 28,
        padding: '12px 28px 12px 20px',
        boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(255, 107, 0, 0.4)',
        backdropFilter: 'blur(20px)',
      }}
    >
      <div
        style={{
          width: 54,
          height: 54,
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #FF6B00 0%, #FF8A00 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 16px rgba(255, 107, 0, 0.6)',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        <Img
          src={staticFile('remotion-assets/rider.png')}
          style={{ width: '85%', height: '85%', objectFit: 'contain' }}
        />
      </div>

      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: 22,
              fontWeight: 900,
              color: '#FFFFFF',
              letterSpacing: '-0.3px',
            }}
          >
            10-15 Min Express Delivery
          </span>
          <span
            style={{
              background: '#FF6B00',
              color: '#FFFFFF',
              fontSize: 11,
              fontWeight: 800,
              padding: '2px 8px',
              borderRadius: 6,
              textTransform: 'uppercase',
            }}
          >
            Instant
          </span>
        </div>

        <span
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: 14,
            fontWeight: 600,
            color: '#94A3B8',
          }}
        >
          Doorstep delivery across Anantnag · Download DASHit
        </span>
      </div>
    </div>
  );
};
