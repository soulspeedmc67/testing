import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const LocationBadge: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Duration: 5.5 seconds (165 frames)
  const enterSpring = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 120 },
  });

  const exitOpacity = interpolate(
    frame,
    [fps * 4.8, fps * 5.5],
    [1, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const translateY = interpolate(enterSpring, [0, 1], [-40, 0]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 50,
        left: 50,
        opacity: exitOpacity,
        transform: `translateY(${translateY}px) scale(${enterSpring})`,
        transformOrigin: 'top left',
        zIndex: 40,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: 'linear-gradient(135deg, rgba(20, 24, 38, 0.9) 0%, rgba(10, 14, 26, 0.95) 100%)',
          border: '1.5px solid rgba(255, 107, 0, 0.4)',
          borderRadius: 40,
          padding: '10px 22px 10px 16px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4), 0 0 15px rgba(255, 107, 0, 0.2)',
          backdropFilter: 'blur(16px)',
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #FF6B00 0%, #FF8A00 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            boxShadow: '0 0 10px rgba(255, 107, 0, 0.5)',
          }}
        >
          📍
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: 13,
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '1.5px',
              color: '#FF8A00',
            }}
          >
            Special Feature
          </span>
          <span
            style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: 20,
              fontWeight: 700,
              color: '#FFFFFF',
            }}
          >
            Anantnag, Kashmir
          </span>
        </div>
      </div>
    </div>
  );
};
