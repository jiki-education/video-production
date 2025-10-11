import React from "react";
import { Composition } from "remotion";
import { CodeScene, type CodeSceneProps } from "./compositions/CodeScene";
import { calculateSceneDuration } from "./lib/timing";
import type { SceneConfig } from "./lib/types";
import exampleBasic from "../scenes/example-basic.json";

export const RemotionRoot: React.FC = () => {
  const fps = 30;
  const config = exampleBasic as SceneConfig;

  const defaultProps: CodeSceneProps = {
    config
  };

  return (
    <>
      <Composition
        id="example-basic"
        component={CodeScene}
        durationInFrames={calculateSceneDuration(config.actions, fps)}
        fps={fps}
        width={1920}
        height={1080}
        defaultProps={defaultProps}
      />
    </>
  );
};
