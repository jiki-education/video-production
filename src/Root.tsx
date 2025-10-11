import React from 'react';
import { Composition } from 'remotion';
import { CodeScene } from './compositions/CodeScene';
import { calculateSceneDuration } from './lib/timing';
import exampleBasic from '../scenes/example-basic.json';

export const RemotionRoot: React.FC = () => {
  const fps = 30;

  return (
    <>
      <Composition
        id="example-basic"
        component={CodeScene}
        durationInFrames={calculateSceneDuration(exampleBasic.actions, fps)}
        fps={fps}
        width={1920}
        height={1080}
        defaultProps={{
          config: exampleBasic,
        }}
      />
    </>
  );
};
