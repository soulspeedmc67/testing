import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { CAPTIONS_DATA } from '../data/captions';

export const Subtitles: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTimeSec = frame / fps;

  // Find the active segment
  const activeSegment = CAPTIONS_DATA.find(
    (seg) => currentTimeSec >= seg.startSec && currentTimeSec < seg.endSec
  );

  if (!activeSegment) return null;

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 90,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '0 30px',
        zIndex: 50,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          background: 'rgba(11, 15, 25, 0.82)',
          backdropFilter: 'blur(16px)',
          border: '1.5px solid rgba(255, 255, 255, 0.18)',
          borderRadius: 22,
          padding: '12px 30px',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.45), 0 0 20px rgba(255, 107, 0, 0.12)',
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '10px 14px',
          maxWidth: '90%',
          textAlign: 'center',
        }}
      >
        {activeSegment.words.map((w, idx) => {
          const isActive = currentTimeSec >= w.startSec && currentTimeSec < w.endSec;
          return (
            <span
              key={idx}
              style={{
                fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                fontSize: 34,
                fontWeight: isActive ? 900 : 700,
                letterSpacing: '-0.5px',
                color: isActive ? '#FF8A00' : '#FFFFFF',
                textShadow: isActive
                  ? '0 0 20px rgba(255, 138, 0, 0.8), 0 2px 4px rgba(0,0,0,0.8)'
                  : '0 2px 4px rgba(0,0,0,0.6)',
                transform: isActive ? 'scale(1.1)' : 'scale(1.0)',
                transition: 'transform 0.08s ease, color 0.08s ease',
                display: 'inline-block',
                margin: '0 5px',
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </div>
  );
};
