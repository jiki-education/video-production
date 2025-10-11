import { CHARS_PER_SECOND, type TypingSpeed, type Action } from "./types";

export function getCharsPerSecond(speed: TypingSpeed): number {
  return CHARS_PER_SECOND[speed];
}

export function calculateActionDuration(action: Action, fps: number): number {
  if (action.type === "pause") {
    return action.duration * fps;
  }

  if (action.type === "type") {
    const lines = action.code.split("\n");
    let totalChars = action.code.length;

    if (Array.isArray(action.speed)) {
      // Different speed per line
      let totalTime = 0;
      lines.forEach((line, index) => {
        const speed = action.speed[index] || "normal";
        const charsPerSec = getCharsPerSecond(speed as TypingSpeed);
        totalTime += line.length / charsPerSec;
      });
      return totalTime * fps;
    }
    // Single speed for all
    const charsPerSec = getCharsPerSecond(action.speed);
    return (totalChars / charsPerSec) * fps;
  }

  return 0;
}

export function calculateSceneDuration(actions: Action[], fps: number): number {
  return actions.reduce((total, action) => total + calculateActionDuration(action, fps), 0);
}

interface ActionTiming {
  action: Action;
  startFrame: number;
  endFrame: number;
}

export function calculateActionTimings(actions: Action[], fps: number): ActionTiming[] {
  let currentFrame = 0;
  const timings: ActionTiming[] = [];

  for (const action of actions) {
    const duration = calculateActionDuration(action, fps);
    timings.push({
      action,
      startFrame: currentFrame,
      endFrame: currentFrame + duration
    });
    currentFrame += duration;
  }

  return timings;
}
