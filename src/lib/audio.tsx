import React from 'react';
import { Audio, Sequence, staticFile } from 'remotion';

interface KeypressSoundsProps {
  frames: number[];
}

export const KeypressSounds: React.FC<KeypressSoundsProps> = ({ frames }) => {
  return (
    <>
      {frames.map((frame, index) => (
        <Sequence key={`keypress-${index}`} from={frame} durationInFrames={10}>
          <Audio
            src={staticFile('sounds/keypress.mp3')}
            volume={0.3}
          />
        </Sequence>
      ))}
    </>
  );
};
