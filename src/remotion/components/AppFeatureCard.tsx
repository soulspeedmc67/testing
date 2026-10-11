import React from 'react';
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

export const AppFeatureCard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const enterSpring = spring({
    frame,
    fps,
    config: { damping: 13, stiffness: 90, mass: 0.9 },
  });

  const durationFrames = fps * 8.0;
  const exitProgress = interpolate(
    frame,
    [durationFrames - 18, durationFrames],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const scale = enterSpring * (1 - exitProgress);
  const translateY = interpolate(enterSpring, [0, 1], [-50, 0]);

  return (
    <div
      style={{
        position: 'absolute',
        top: 60,
        left: '50%',
        transform: `translateX(-50%) translateY(${translateY}px) scale(${scale})`,
        transformOrigin: 'top center',
        zIndex: 45,
        width: 580,
      }}
    >
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.96) 0%, rgba(30, 41, 59, 0.94) 100%)',
          borderRadius: 28,
          padding: '20px 28px',
          border: '2px solid rgba(255, 107, 0, 0.55)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6), 0 0 35px rgba(255, 107, 0, 0.25)',
          backdropFilter: 'blur(20px)',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: '#FFFFFF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 4,
                boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
              }}
            >
              <Img
                src={staticFile('remotion-assets/dashit-mark.png')}
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
              />
            </div>
            <div>
              <span
                style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontSize: 26,
                  fontWeight: 900,
                  color: '#FFFFFF',
                  letterSpacing: '-0.5px',
                }}
              >
                DASH<span style={{ color: '#FF6B00' }}>it</span>
              </span>
              <div
                style={{
                  fontFamily: 'system-ui, -apple-system, sans-serif',
                  fontSize: 13,
                  fontWeight: 700,
                  color: '#FF8A00',
                  textTransform: 'uppercase',
                  letterSpacing: '1px',
                }}
              >
                South Kashmir's 1st Quick Commerce
              </div>
            </div>
          </div>

          <div
            style={{
              background: 'linear-gradient(135deg, #FF6B00 0%, #FF8A00 100%)',
              color: '#FFFFFF',
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: 13,
              fontWeight: 800,
              padding: '6px 14px',
              borderRadius: 20,
              boxShadow: '0 4px 12px rgba(255, 107, 0, 0.4)',
            }}
          >
            ⚡ Live Now
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(255, 255, 255, 0.06)',
            borderRadius: 16,
            padding: '10px 16px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 18 }}>⏱️</span>
            <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, fontWeight: 700, color: '#E2E8F0' }}>
              10-15 Min Delivery
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 18 }}>🥦</span>
            <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, fontWeight: 700, color: '#E2E8F0' }}>
              Fresh Groceries
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 18 }}>📱</span>
            <span style={{ fontFamily: 'system-ui, sans-serif', fontSize: 14, fontWeight: 700, color: '#E2E8F0' }}>
              iOS & Android
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
