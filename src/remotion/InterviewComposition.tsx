import React from 'react';
import { AbsoluteFill, Audio, OffthreadVideo, Sequence, staticFile } from 'remotion';
import { LocationBadge } from './components/LocationBadge';
import { FounderCard } from './components/FounderCard';
import { PhoneMockup } from './components/PhoneMockup';
import { GroceryPopups } from './components/GroceryPopups';
import { ExpressDeliveryBadge } from './components/ExpressDeliveryBadge';
import { Subtitles } from './components/Subtitles';
import { CinematicOverlay } from './components/CinematicOverlay';
import { SoundDesign } from './components/SoundDesign';

export const InterviewComposition: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: '#000000', overflow: 'hidden' }}>
      {/* 1. Underlying Video with Dynamic Studio Background & Audio */}
      <OffthreadVideo
        src={staticFile('remotion-assets/interview_studio.mp4')}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      <Audio src={staticFile('remotion-assets/interview_studio.mp4')} />

      {/* 2. Cinematic Gradient Overlay for Contrast */}
      <CinematicOverlay />

      {/* 3. Timed Sequences & Dynamic Popups */}

      {/* 0.5s - 6.0s: Anantnag Location Pill */}
      <Sequence from={15} durationInFrames={165} name="Location Badge">
        <LocationBadge />
      </Sequence>

      {/* 3.86s - 10.5s: Azan Iqbal Lower-Third Founder Card */}
      <Sequence from={116} durationInFrames={200} name="Founder Card">
        <FounderCard />
      </Sequence>

      {/* 26.5s - 35.0s: Smartphone Mockup Showing DASHit Storefront */}
      <Sequence from={795} durationInFrames={255} name="Phone Mockup">
        <PhoneMockup />
      </Sequence>

      {/* 36.6s - 42.5s: Floating Grocery Items */}
      <Sequence from={1100} durationInFrames={180} name="Grocery Popups">
        <GroceryPopups />
      </Sequence>

      {/* 39.6s - 42.8s: 10-15 Min Express Delivery Banner */}
      <Sequence from={1190} durationInFrames={99} name="Express Delivery Badge">
        <ExpressDeliveryBadge />
      </Sequence>

      {/* 4. Dynamic Subtitles with Active Word Highlight */}
      <Subtitles />

      {/* 5. Sound Design: Synchronized SFX & Background Music */}
      <SoundDesign />
    </AbsoluteFill>
  );
};
