import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

export const DegreeBadge: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterSpring = spring({
    frame,
    fps,
    config: { damping: 14, stiffness: 110 },
  });

  const durationFrames = fps * 5.0;
  const exitProgress = interpolate(
    frame,
    [durationFrames - 15, durationFrames],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const scale = enterSpring * (1 - exitProgress);

  return (
    <div
      style={{
        position: 'absolute',
        top: 380,
        right: 60,
        transform: `scale(${scale})`,
        transformOrigin: 'top right',
        zIndex: 45,
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(30, 41, 59, 0.95) 0%, rgba(15, 23, 42, 0.95) 100%)',
          borderRadius: 20,
          padding: '12px 20px',
          border: '1.5px solid rgba(56, 189, 248, 0.5)',
          boxShadow: '0 12px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(56, 189, 248, 0.25)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'linear-gradient(135deg, #0284C7 0%, #38BDF8 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 22,
          }}
        >
          🎓
        </div>
        <div>
          <div
            style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: 18,
              fontWeight: 800,
              color: '#F8FAFC',
            }}
          >
            Management Graduate
          </div>
          <div
            style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: 14,
              fontWeight: 600,
              color: '#38BDF8',
            }}
          >
            Young Innovator from Kashmir
          </div>
        </div>
      </div>
    </div>
  );
};
