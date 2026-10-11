import React from 'react';
import { Composition } from 'remotion';
import { InterviewComposition } from './InterviewComposition';

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="InterviewEdit"
        component={InterviewComposition}
        durationInFrames={1289}
        fps={30}
        width={1080}
        height={1378}
      />
    </>
  );
};
