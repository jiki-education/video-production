import React from "react";
import { Audio, Sequence } from "remotion";
import keypressSound from "../assets/sounds/keypress.mp3";

interface KeypressSoundsProps {
  frames: number[];
}

export const KeypressSounds: React.FC<KeypressSoundsProps> = ({ frames }) => {
  return (
    <>
      {frames.map((frame, index) => (
        <Sequence key={`keypress-${index}`} from={frame} durationInFrames={10}>
          <Audio src={keypressSound} volume={0.3} />
        </Sequence>
      ))}
    </>
  );
};
