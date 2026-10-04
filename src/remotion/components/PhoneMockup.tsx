import React from 'react';
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

export const PhoneMockup: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Spring entrance
  const enterSpring = spring({
    frame,
    fps,
    config: { damping: 13, stiffness: 90, mass: 0.9 },
  });

  const durationFrames = fps * 8.5; // ~255 frames
  const exitProgress = interpolate(
    frame,
    [durationFrames - 15, durationFrames],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const scale = enterSpring * (1 - exitProgress);
  const translateY = interpolate(enterSpring, [0, 1], [60, 0]) + Math.sin(frame / 20) * 5;

  // Step 1: Browse (0 - 80 frames)
  // Step 2: Checkout / Place Order (80 - 165 frames)
  // Step 3: Live Tracking (165+ frames)
  let currentStep = 1;
  let stepTitle = "1. Browse 1,000+ Items";
  let stepColor = "#FF8A00";
  let screenImage = "remotion-assets/app-step1-browse.png";

  if (frame >= 80 && frame < 165) {
    currentStep = 2;
    stepTitle = "2. 1-Tap Quick Checkout";
    stepColor = "#FACC15";
    screenImage = "remotion-assets/app-step3-checkout.png";
  } else if (frame >= 165) {
    currentStep = 3;
    stepTitle = "3. Live Order Tracking & OTP";
    stepColor = "#4ADE80";
    screenImage = "remotion-assets/app-step4-tracking.png";
  }

  // Flash / pulse when step changes
  const stepTransitionProgress =
    frame < 80
      ? 1
      : frame >= 80 && frame < 95
      ? interpolate(frame, [80, 87, 95], [0.8, 1.05, 1])
      : frame >= 165 && frame < 180
      ? interpolate(frame, [165, 172, 180], [0.8, 1.05, 1])
      : 1;

  return (
    <div
      style={{
        position: 'absolute',
        top: 90,
        left: '50%',
        transform: `translateX(-50%) translateY(${translateY}px) scale(${scale})`,
        transformOrigin: 'bottom center',
        zIndex: 48,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 12,
        pointerEvents: 'none',
      }}
    >
      {/* Animated Step Header Pill */}
      <div
        style={{
          background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.96) 0%, rgba(26, 32, 53, 0.98) 100%)',
          border: `1.5px solid ${stepColor}`,
          borderRadius: 24,
          padding: '6px 18px',
          boxShadow: `0 8px 25px rgba(0, 0, 0, 0.5), 0 0 20px ${stepColor}40`,
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          transform: `scale(${stepTransitionProgress})`,
          transition: 'border-color 0.2s ease',
        }}
      >
        <span style={{ fontSize: 16 }}>
          {currentStep === 1 ? '🛒' : currentStep === 2 ? '⚡' : '🚀'}
        </span>
        <span
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: 14,
            fontWeight: 800,
            color: '#FFFFFF',
            letterSpacing: '0.2px',
          }}
        >
          {stepTitle}
        </span>
      </div>

      {/* Smartphone Frame - Carefully sized (250x510) to sit centered between the two speakers without covering either face */}
      <div
        style={{
          width: 250,
          height: 510,
          background: '#0F172A',
          borderRadius: 38,
          padding: '8px 7px',
          boxShadow: '0 30px 70px rgba(0, 0, 0, 0.75), 0 0 40px rgba(255, 107, 0, 0.25)',
          border: '3.5px solid #334155',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Dynamic Island Notch */}
        <div
          style={{
            position: 'absolute',
            top: 15,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 80,
            height: 20,
            background: '#000000',
            borderRadius: 12,
            zIndex: 10,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: 7,
              height: 7,
              borderRadius: '50%',
              background: '#1E293B',
              marginRight: 6,
            }}
          />
        </div>

        {/* Screen Display */}
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: 30,
            overflow: 'hidden',
            position: 'relative',
            background: '#F8FAFC',
          }}
        >
          <Img
            src={staticFile(screenImage)}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'top center',
              transform: `scale(${stepTransitionProgress})`,
              transition: 'transform 0.15s ease-out',
            }}
          />
        </div>
      </div>
    </div>
  );
};
