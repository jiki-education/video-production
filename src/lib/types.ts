/**
 * Remotion Scene Types
 *
 * Types for code screen animations and scene configuration.
 */

export type TypingSpeed = "slow" | "normal" | "fast";

export const CHARS_PER_SECOND: Record<TypingSpeed, number> = {
  slow: 10,
  normal: 15,
  fast: 25
};

export interface TypeAction {
  type: "type";
  code: string;
  speed: TypingSpeed | TypingSpeed[];
  language?: string;
}

export interface PauseAction {
  type: "pause";
  duration: number;
}

export type Action = TypeAction | PauseAction;

export interface SceneConfig {
  title: string;
  theme?: "dark" | "light";
  backgroundColor?: string;
  actions: Action[];
}
