export type TypingSpeed = 'slow' | 'normal' | 'fast';

export interface TypeAction {
  type: 'type';
  code: string;
  speed: TypingSpeed | TypingSpeed[];
  language?: string;
}

export interface PauseAction {
  type: 'pause';
  duration: number; // seconds
}

export type Action = TypeAction | PauseAction;

export interface SceneConfig {
  title: string;
  description?: string;
  backgroundColor?: string;
  theme?: 'dark' | 'light';
  actions: Action[];
}

export const CHARS_PER_SECOND: Record<TypingSpeed, number> = {
  slow: 10,   // 1 char every 3 frames at 30fps
  normal: 15, // 1 char every 2 frames at 30fps
  fast: 25,   // 1 char every 1.2 frames at 30fps
};
