import React from 'react';

export const CinematicOverlay: React.FC = () => {
  return (
    <>
      {/* Top subtle gradient for contrast */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 180,
          background: 'linear-gradient(to bottom, rgba(10, 14, 26, 0.7) 0%, rgba(10, 14, 26, 0) 100%)',
          pointerEvents: 'none',
          zIndex: 20,
        }}
      />

      {/* Bottom gradient for captions contrast */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 260,
          background: 'linear-gradient(to top, rgba(10, 14, 26, 0.85) 0%, rgba(10, 14, 26, 0.3) 60%, rgba(10, 14, 26, 0) 100%)',
          pointerEvents: 'none',
          zIndex: 20,
        }}
      />
    </>
  );
};
