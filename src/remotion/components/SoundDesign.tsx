import React from 'react';
import { Audio, Sequence, staticFile } from 'remotion';

export const SoundDesign: React.FC = () => {
  return (
    <>
      {/* Subtle modern background music (dipped to 5.5% volume for crisp dialogue clarity) */}
      <Audio
        src={staticFile('remotion-assets/music.mp3')}
        volume={0.055}
      />

      {/* Frame 15 (0.5s): Location Badge Whoosh */}
      <Sequence from={15} durationInFrames={35}>
        <Audio src={staticFile('remotion-assets/sfx/whoosh-short.mp3')} volume={0.35} />
      </Sequence>

      {/* Frame 116 (3.86s): Founder Lower-Third Slide-in + Sparkle */}
      <Sequence from={116} durationInFrames={45}>
        <Audio src={staticFile('remotion-assets/sfx/whoosh.mp3')} volume={0.35} />
        <Audio src={staticFile('remotion-assets/sfx/sparkle.mp3')} volume={0.25} />
      </Sequence>

      {/* Frame 795 (26.5s): Phone Mockup Spring-in */}
      <Sequence from={795} durationInFrames={50}>
        <Audio src={staticFile('remotion-assets/sfx/whoosh-cinematic.mp3')} volume={0.38} />
        <Audio src={staticFile('remotion-assets/sfx/pop.mp3')} volume={0.3} />
      </Sequence>

      {/* Frame 875 (29.2s): App Screen Tap to Checkout */}
      <Sequence from={875} durationInFrames={20}>
        <Audio src={staticFile('remotion-assets/sfx/click.mp3')} volume={0.45} />
      </Sequence>

      {/* Frame 960 (32.0s): Order Placed Notification & Live Tracking */}
      <Sequence from={960} durationInFrames={45}>
        <Audio src={staticFile('remotion-assets/sfx/notification.mp3')} volume={0.4} />
      </Sequence>

      {/* Grocery Items Staggered Pops */}
      {/* Frame 1100 (36.6s): Milk sticker pop */}
      <Sequence from={1100} durationInFrames={25}>
        <Audio src={staticFile('remotion-assets/sfx/pop.mp3')} volume={0.32} />
      </Sequence>

      {/* Frame 1112 (37.0s): Butter sticker pop */}
      <Sequence from={1112} durationInFrames={25}>
        <Audio src={staticFile('remotion-assets/sfx/pop.mp3')} volume={0.32} />
      </Sequence>

      {/* Frame 1124 (37.5s): Chips sticker pop */}
      <Sequence from={1124} durationInFrames={25}>
        <Audio src={staticFile('remotion-assets/sfx/pop.mp3')} volume={0.32} />
      </Sequence>

      {/* Frame 1190 (39.6s): Express Delivery Badge Lock-in */}
      <Sequence from={1190} durationInFrames={45}>
        <Audio src={staticFile('remotion-assets/sfx/whoosh-short.mp3')} volume={0.35} />
        <Audio src={staticFile('remotion-assets/sfx/chime.mp3')} volume={0.3} />
      </Sequence>
    </>
  );
};
