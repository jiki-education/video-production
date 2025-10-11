import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { TypeAction, TypingSpeed } from '../lib/types';
import { getCharsPerSecond } from '../lib/timing';
import { KeypressSounds } from '../lib/audio.tsx';

interface AnimatedCodeProps {
  action: TypeAction;
  startFrame: number;
  theme?: 'dark' | 'light';
}

export const AnimatedCode: React.FC<AnimatedCodeProps> = ({
  action,
  startFrame,
  theme = 'dark',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const relativeFrame = frame - startFrame;

  if (relativeFrame < 0) {
    return null;
  }

  const lines = action.code.split('\n');
  const speeds = Array.isArray(action.speed)
    ? action.speed
    : Array(lines.length).fill(action.speed);

  // Pre-calculate all keypress frames
  const allKeypressFrames: number[] = [];
  let calculatedFrames = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const speed = speeds[i] as TypingSpeed || 'normal';
    const charsPerSec = getCharsPerSecond(speed);
    const framesPerChar = fps / charsPerSec;

    for (let j = 0; j < line.length; j++) {
      allKeypressFrames.push(startFrame + Math.floor(calculatedFrames));
      calculatedFrames += framesPerChar;
    }

    // Add frame for newline if not last line
    if (i < lines.length - 1) {
      calculatedFrames += framesPerChar;
    }
  }

  let visibleCode = '';
  let elapsedFrames = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const speed = speeds[i] as TypingSpeed || 'normal';
    const charsPerSec = getCharsPerSecond(speed);
    const framesPerChar = fps / charsPerSec;

    for (let j = 0; j < line.length; j++) {
      const charFrame = Math.floor(elapsedFrames);

      if (relativeFrame >= charFrame) {
        visibleCode += line[j];
      } else {
        // Haven't reached this character yet
        return (
          <>
            <KeypressSounds frames={allKeypressFrames} />
            <SyntaxHighlighter
              language={action.language || 'javascript'}
              style={theme === 'dark' ? vscDarkPlus : undefined}
              customStyle={{
                fontSize: 32,
                padding: 40,
                borderRadius: 8,
                margin: 0,
                backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
              }}
              showLineNumbers
            >
              {visibleCode}
            </SyntaxHighlighter>
          </>
        );
      }

      elapsedFrames += framesPerChar;
    }

    // Add newline if not last line
    if (i < lines.length - 1) {
      visibleCode += '\n';
      // Newline also takes a frame
      elapsedFrames += framesPerChar;
    }
  }

  // All code visible
  return (
    <>
      <KeypressSounds frames={allKeypressFrames} />
      <SyntaxHighlighter
        language={action.language || 'javascript'}
        style={theme === 'dark' ? vscDarkPlus : undefined}
        customStyle={{
          fontSize: 32,
          padding: 40,
          borderRadius: 8,
          margin: 0,
          backgroundColor: theme === 'dark' ? '#1e1e1e' : '#ffffff',
        }}
        showLineNumbers
      >
        {visibleCode}
      </SyntaxHighlighter>
    </>
  );
};
