import React from 'react';
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

interface ItemProps {
  image: string;
  name: string;
  price: string;
  delayFrames: number;
  top: number;
  left: number;
  rotation: number;
}

const GroceryItem: React.FC<ItemProps> = ({
  image,
  name,
  price,
  delayFrames,
  top,
  left,
  rotation,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const adjustedFrame = Math.max(0, frame - delayFrames);
  const enterSpring = spring({
    frame: adjustedFrame,
    fps,
    config: { damping: 11, stiffness: 100, mass: 0.8 },
  });

  const floatY = Math.sin((frame + delayFrames * 10) / 14) * 6;

  return (
    <div
      style={{
        position: 'absolute',
        top,
        left,
        transform: `translateY(${floatY}px) scale(${enterSpring}) rotate(${rotation}deg)`,
        transformOrigin: 'center center',
        zIndex: 47,
      }}
    >
      <div
        style={{
          background: 'rgba(15, 23, 42, 0.92)',
          borderRadius: 22,
          padding: '12px 16px',
          border: '2px solid rgba(255, 107, 0, 0.6)',
          boxShadow: '0 16px 36px rgba(0, 0, 0, 0.45), 0 0 20px rgba(255, 107, 0, 0.25)',
          backdropFilter: 'blur(16px)',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          minWidth: 170,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: 14,
            background: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 4,
            boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
          }}
        >
          <Img
            src={staticFile(image)}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: 16,
              fontWeight: 800,
              color: '#FFFFFF',
            }}
          >
            {name}
          </span>
          <span
            style={{
              fontFamily: 'system-ui, -apple-system, sans-serif',
              fontSize: 13,
              fontWeight: 700,
              color: '#FF8A00',
            }}
          >
            {price}
          </span>
        </div>
      </div>
    </div>
  );
};

export const GroceryPopups: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const durationFrames = fps * 7.5;
  const exitProgress = interpolate(
    frame,
    [durationFrames - 15, durationFrames],
    [0, 1],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: 1 - exitProgress,
        pointerEvents: 'none',
        zIndex: 46,
      }}
    >
      {/* Item 1: Fresh Milk */}
      <GroceryItem
        image="remotion-assets/milk.webp"
        name="Amul Milk"
        price="₹34 · In Stock"
        delayFrames={0}
        top={220}
        left={60}
        rotation={-4}
      />

      {/* Item 2: Butter */}
      <GroceryItem
        image="remotion-assets/butter.webp"
        name="Amul Butter"
        price="₹56 · In Stock"
        delayFrames={8}
        top={170}
        left={400}
        rotation={2}
      />

      {/* Item 3: Snacks */}
      <GroceryItem
        image="remotion-assets/lays.webp"
        name="Lay's Chips"
        price="₹20 · In Stock"
        delayFrames={16}
        top={220}
        left={740}
        rotation={-2}
      />
    </div>
  );
};
