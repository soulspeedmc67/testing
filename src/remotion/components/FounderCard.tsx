import React from 'react';
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

export const FounderCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterSpring = spring({
    frame,
    fps,
    config: { damping: 13, stiffness: 100, mass: 0.8 },
  });

  const durationFrames = fps * 6.8;
  const exitProgress = interpolate(
    frame,
    [durationFrames - 15, durationFrames],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const scale = enterSpring * (1 - exitProgress);
  const translateX = interpolate(enterSpring, [0, 1], [60, 0]);

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 200,
        right: 60,
        transform: `translateX(${translateX}px) scale(${scale})`,
        transformOrigin: 'bottom right',
        zIndex: 45,
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.94) 0%, rgba(26, 32, 53, 0.92) 100%)',
          borderRadius: 24,
          padding: '18px 24px',
          border: '2px solid rgba(255, 107, 0, 0.5)',
          boxShadow: '0 20px 45px rgba(0, 0, 0, 0.5), 0 0 25px rgba(255, 107, 0, 0.3)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          alignItems: 'center',
          gap: 18,
          maxWidth: 420,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 18,
            background: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(0,0,0,0.2)',
            padding: 6,
            flexShrink: 0,
          }}
        >
          <Img
            src={staticFile('remotion-assets/dashit-mark.png')}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                background: 'rgba(255, 107, 0, 0.2)',
                color: '#FF8A00',
                fontSize: 12,
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: 6,
                letterSpacing: '1px',
                textTransform: 'uppercase',
              }}
            >
              Guest Speaker
            </span>
          </div>

          <h2
            style={{
              margin: 0,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: 28,
              fontWeight: 800,
              color: '#FFFFFF',
              letterSpacing: '-0.5px',
            }}
          >
            Azan Iqbal
          </h2>

          <p
            style={{
              margin: 0,
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: 16,
              fontWeight: 600,
              color: '#94A3B8',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            Founder & CEO, <span style={{ color: '#FF8A00', fontWeight: 700 }}>DASHit</span>
          </p>
        </div>
      </div>
    </div>
  );
};
