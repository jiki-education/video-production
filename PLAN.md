# Code Videos Rendering App - Implementation Plan

## Context

### Project Overview

Jiki is a programming language learning platform that requires approximately **50 educational videos** to be produced in **10+ languages**, resulting in **500+ total video renders**. Each video is 10-15 minutes long and consists of three main components:

1. **Talking heads** - Instructor (modeled on Jeremy) explaining concepts
2. **Jiki animations** - Pixar-style animated character demonstrating concepts visually
3. **Code screens** - Animated code examples with syntax highlighting

### Current Research Conclusions

From extensive research documented in `video/` directory:

**Talking Heads:** HeyGen ($29-330/mo) - 175+ languages, API-driven, custom avatar creation

**Animations:** Runway Gen-4 Turbo ($450 one-time for all videos) - Industry-leading character consistency for Jiki character

**Code Screens:** Remotion ($100/mo company license) - React-based video generation, perfect fit for Next.js/Bun/TypeScript stack

**Pipeline Orchestration:** Cloudflare Workflows + FFmpeg (~$20-35/mo) - Just GA'd June 2025, serverless, TypeScript-based

### Technical Stack

- **Primary:** Next.js, React, TypeScript, Bun
- **Infrastructure:** Cloudflare (Workers, R2, Workflows)
- **Video Generation:** Remotion (React-based programmatic video)
- **Target:** YouTube educational content at 30fps, 1920x1080

### Code Screen Requirements

- Attractive and themeable
- Animatable (character-by-character typing, line highlighting)
- Scriptable (JSON-driven for 500+ videos)
- Support for JikiScript syntax (JavaScript-like)

### Animation Specifications

- **Frame Rate:** 30fps (YouTube standard for educational content)
- **Typing Speed:**
  - Slow: 10 chars/sec (1 char every 3 frames) - for emphasis
  - Normal: 15 chars/sec (1 char every 2 frames) - default
  - Fast: 25 chars/sec (1 char every 1.2 frames) - for boilerplate
- **Resolution:** 1920x1080 (Full HD)
- **Audio:** Keypress sound on each character typed

---

## Repository Structure

### Location

`/Users/iHiD/Code/jiki/code-videos`

Parallel to the `overview` repository, keeping concerns separated.

### Initial Directory Structure

```
code-videos/
├── package.json
├── tsconfig.json
├── remotion.config.ts
├── .gitignore
├── README.md
│
├── src/
│   ├── Root.tsx                    # Remotion root with all compositions
│   ├── index.ts                    # Entry point
│   │
│   ├── compositions/
│   │   └── CodeScene.tsx           # Main code rendering composition
│   │
│   ├── components/
│   │   ├── AnimatedCode.tsx        # Core animated code component
│   │   └── CodeLine.tsx            # Single line component
│   │
│   ├── lib/
│   │   ├── types.ts                # TypeScript types for config
│   │   ├── audio.ts                # Audio management
│   │   └── timing.ts               # Frame/timing calculations
│   │
│   └── assets/
│       ├── sounds/
│       │   └── keypress.mp3        # Keypress sound effect
│       └── fonts/
│           └── (code fonts)
│
├── scenes/                          # JSON scene configurations
│   ├── example-basic.json
│   ├── example-pause.json
│   └── example-speeds.json
│
├── out/                             # Rendered videos (gitignored)
│
└── scripts/
    ├── render.ts                    # Script to render from JSON
    └── renderAll.ts                 # Batch render multiple scenes
```

---

## Phase 1: MVP Implementation

### Goal

Create a working proof-of-concept that can:

- Render up to 5 lines of JavaScript code
- Animate character-by-character typing
- Play keypress sound on each character
- Be driven by JSON configuration files
- Support multiple typing speeds
- Support pause actions

### JSON Configuration Schema

```typescript
// src/lib/types.ts

export type TypingSpeed = "slow" | "normal" | "fast";

export interface TypeAction {
  type: "type";
  code: string;
  speed: TypingSpeed | TypingSpeed[]; // Single speed or per-line speeds
  language?: string; // Default: 'javascript'
}

export interface PauseAction {
  type: "pause";
  duration: number; // In seconds
}

export type Action = TypeAction | PauseAction;

export interface SceneConfig {
  title: string;
  description?: string;
  backgroundColor?: string;
  theme?: "dark" | "light"; // Default: 'dark'
  actions: Action[];
}
```

### Example JSON Configurations

**scenes/example-basic.json** - Simple typing at normal speed

```json
{
  "title": "Basic Variable Example",
  "description": "Shows how to declare a variable in JikiScript",
  "theme": "dark",
  "actions": [
    {
      "type": "type",
      "code": "let greeting = \"Hello World\";",
      "speed": "normal",
      "language": "javascript"
    }
  ]
}
```

**scenes/example-pause.json** - Typing with pauses between lines

```json
{
  "title": "Function Definition",
  "actions": [
    {
      "type": "type",
      "code": "function add(a, b) {",
      "speed": "normal"
    },
    {
      "type": "pause",
      "duration": 0.5
    },
    {
      "type": "type",
      "code": "  return a + b;",
      "speed": "normal"
    },
    {
      "type": "pause",
      "duration": 0.5
    },
    {
      "type": "type",
      "code": "}",
      "speed": "normal"
    }
  ]
}
```

**scenes/example-speeds.json** - Different speeds for different lines

```json
{
  "title": "Multiple Speeds Example",
  "description": "Fast boilerplate, slow for important concepts",
  "actions": [
    {
      "type": "type",
      "code": "// Setup code (fast)\nconst numbers = [1, 2, 3];",
      "speed": ["fast", "fast"]
    },
    {
      "type": "pause",
      "duration": 0.3
    },
    {
      "type": "type",
      "code": "// Key concept (slow)\nlet total = 0;",
      "speed": ["normal", "slow"]
    },
    {
      "type": "pause",
      "duration": 0.5
    },
    {
      "type": "type",
      "code": "// Rest of code (normal)\nfor (let num of numbers) {\n  total += num;\n}",
      "speed": "normal"
    }
  ]
}
```

---

## Implementation Details

### Step 1: Repository Setup

**Initialize project:**

```bash
cd /Users/iHiD/Code/jiki
mkdir code-videos
cd code-videos

# Initialize with Bun
bun init

# Install Remotion
bun add remotion @remotion/cli

# Install dependencies
bun add react react-dom
bun add -d @types/react @types/react-dom typescript

# Install syntax highlighting
bun add react-syntax-highlighter
bun add -d @types/react-syntax-highlighter

# Install audio handling
bun add @remotion/media-utils
```

**package.json scripts:**

```json
{
  "name": "jiki-code-videos",
  "version": "0.1.0",
  "scripts": {
    "dev": "remotion preview",
    "build": "remotion bundle",
    "render": "bun run scripts/render.ts",
    "render:all": "bun run scripts/renderAll.ts"
  },
  "dependencies": {
    "remotion": "^4.0.0",
    "@remotion/cli": "^4.0.0",
    "@remotion/media-utils": "^4.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "react-syntax-highlighter": "^15.5.0"
  },
  "devDependencies": {
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "@types/react-syntax-highlighter": "^15.5.0",
    "typescript": "^5.0.0"
  }
}
```

**remotion.config.ts:**

```typescript
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setConcurrency(4);
```

**tsconfig.json:**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "jsx": "react-jsx",
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*", "scripts/**/*"],
  "exclude": ["node_modules"]
}
```

**.gitignore:**

```
node_modules/
out/
.remotion/
dist/
*.log
.DS_Store
```

---

### Step 2: Core Implementation

**src/lib/types.ts** - Type definitions

```typescript
export type TypingSpeed = "slow" | "normal" | "fast";

export interface TypeAction {
  type: "type";
  code: string;
  speed: TypingSpeed | TypingSpeed[];
  language?: string;
}

export interface PauseAction {
  type: "pause";
  duration: number; // seconds
}

export type Action = TypeAction | PauseAction;

export interface SceneConfig {
  title: string;
  description?: string;
  backgroundColor?: string;
  theme?: "dark" | "light";
  actions: Action[];
}

export const CHARS_PER_SECOND: Record<TypingSpeed, number> = {
  slow: 10, // 1 char every 3 frames at 30fps
  normal: 15, // 1 char every 2 frames at 30fps
  fast: 25 // 1 char every 1.2 frames at 30fps
};
```

**src/lib/timing.ts** - Timing calculations

```typescript
import { CHARS_PER_SECOND, TypingSpeed, Action } from "./types";

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
    } else {
      // Single speed for all
      const charsPerSec = getCharsPerSecond(action.speed);
      return (totalChars / charsPerSec) * fps;
    }
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
```

**src/lib/audio.ts** - Audio management

```typescript
import { Audio, staticFile } from 'remotion';

interface KeypressSoundProps {
  frame: number;
  playAt: number; // Frame number to play at
}

export const KeypressSound: React.FC<KeypressSoundProps> = ({
  frame,
  playAt,
}) => {
  if (frame < playAt || frame > playAt + 3) {
    return null;
  }

  return (
    <Audio
      src={staticFile('sounds/keypress.mp3')}
      startFrom={playAt}
      volume={0.3}
    />
  );
};

export function generateKeypressSounds(
  frames: number[],
  currentFrame: number
): React.ReactNode[] {
  return frames.map((frame, index) => (
    <KeypressSound key={index} frame={currentFrame} playAt={frame} />
  ));
}
```

**src/components/AnimatedCode.tsx** - Main code animation component

```typescript
import React from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { TypeAction, TypingSpeed } from '@/lib/types';
import { getCharsPerSecond } from '@/lib/timing';
import { generateKeypressSounds } from '@/lib/audio';

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

  let visibleCode = '';
  let currentCharIndex = 0;
  let elapsedFrames = 0;
  const keypressFrames: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const speed = speeds[i] as TypingSpeed || 'normal';
    const charsPerSec = getCharsPerSecond(speed);
    const framesPerChar = fps / charsPerSec;

    for (let j = 0; j < line.length; j++) {
      const charFrame = Math.floor(elapsedFrames);

      if (relativeFrame >= charFrame) {
        visibleCode += line[j];
        if (relativeFrame === charFrame) {
          keypressFrames.push(frame);
        }
      } else {
        // Haven't reached this character yet
        return (
          <>
            {generateKeypressSounds(keypressFrames, frame)}
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
      {generateKeypressSounds(keypressFrames, frame)}
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
```

**src/compositions/CodeScene.tsx** - Main scene composition

```typescript
import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { SceneConfig } from '@/lib/types';
import { calculateActionTimings } from '@/lib/timing';
import { AnimatedCode } from '@/components/AnimatedCode';

interface CodeSceneProps {
  config: SceneConfig;
}

export const CodeScene: React.FC<CodeSceneProps> = ({ config }) => {
  const fps = 30;
  const timings = calculateActionTimings(config.actions, fps);

  return (
    <AbsoluteFill
      style={{
        backgroundColor: config.backgroundColor || '#1e1e1e',
        padding: 60,
        fontFamily: 'monospace',
      }}
    >
      {/* Title */}
      {config.title && (
        <div
          style={{
            color: config.theme === 'light' ? '#000000' : '#ffffff',
            fontSize: 40,
            marginBottom: 40,
            fontWeight: 'bold',
          }}
        >
          {config.title}
        </div>
      )}

      {/* Render each action as a sequence */}
      {timings.map((timing, index) => {
        if (timing.action.type === 'pause') {
          // Pause - just hold the current state
          return null;
        }

        if (timing.action.type === 'type') {
          return (
            <Sequence
              key={index}
              from={timing.startFrame}
              durationInFrames={timing.endFrame - timing.startFrame}
            >
              <AnimatedCode
                action={timing.action}
                startFrame={timing.startFrame}
                theme={config.theme}
              />
            </Sequence>
          );
        }

        return null;
      })}
    </AbsoluteFill>
  );
};
```

**src/Root.tsx** - Remotion root

```typescript
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
```

**src/index.ts** - Entry point

```typescript
import { registerRoot } from "remotion";
import { RemotionRoot } from "./Root";

registerRoot(RemotionRoot);
```

---

### Step 3: Audio Asset

**Keypress Sound:**

Option 1: Generate using online tool

- Visit: https://sfxr.me/ or https://www.zapsplat.com/
- Search for "keyboard click" or "keypress"
- Download as MP3
- Place in `src/assets/sounds/keypress.mp3`

Option 2: Use a simple mechanical keyboard sound

- Record a single keypress
- Or find free sound effect online (freesound.org)
- Normalize to consistent volume
- Keep it short (~50-100ms)

**Note:** The audio will be included via `staticFile()` which Remotion will bundle.

---

### Step 4: Rendering Scripts

**scripts/render.ts** - Render a single scene

```typescript
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import { readFile } from "fs/promises";
import { join } from "path";

async function renderScene(sceneName: string) {
  console.log(`📦 Bundling Remotion project...`);

  const bundled = await bundle({
    entryPoint: join(process.cwd(), "src/index.ts")
  });

  console.log(`🎬 Rendering scene: ${sceneName}`);

  const composition = await selectComposition({
    serveUrl: bundled,
    id: sceneName
  });

  const outputPath = join(process.cwd(), "out", `${sceneName}.mp4`);

  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    outputLocation: outputPath,
    verbose: true
  });

  console.log(`✅ Rendered to: ${outputPath}`);
}

// Get scene name from command line args
const sceneName = process.argv[2] || "example-basic";
renderScene(sceneName).catch(console.error);
```

**scripts/renderAll.ts** - Batch render all scenes

```typescript
import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition, getCompositions } from "@remotion/renderer";
import { join } from "path";

async function renderAllScenes() {
  console.log(`📦 Bundling Remotion project...`);

  const bundled = await bundle({
    entryPoint: join(process.cwd(), "src/index.ts")
  });

  console.log(`📋 Getting all compositions...`);

  const compositions = await getCompositions(bundled);

  console.log(`Found ${compositions.length} compositions to render`);

  for (const composition of compositions) {
    console.log(`\n🎬 Rendering: ${composition.id}`);

    const outputPath = join(process.cwd(), "out", `${composition.id}.mp4`);

    await renderMedia({
      composition,
      serveUrl: bundled,
      codec: "h264",
      outputLocation: outputPath,
      verbose: false
    });

    console.log(`✅ Rendered: ${composition.id}`);
  }

  console.log(`\n🎉 All scenes rendered successfully!`);
}

renderAllScenes().catch(console.error);
```

---

### Step 5: Testing & Validation

**Manual Testing Steps:**

1. **Preview in browser:**

   ```bash
   bun run dev
   ```

   - Browser opens at http://localhost:3000
   - Select "example-basic" composition
   - Watch code typing animation
   - Verify keypress sounds play
   - Check timing feels right

2. **Render single scene:**

   ```bash
   bun run render example-basic
   ```

   - Check `out/example-basic.mp4` created
   - Open in video player
   - Verify audio and video sync
   - Check quality

3. **Test different speeds:**
   - Add `example-speeds.json` to Root.tsx
   - Preview and verify slow/normal/fast are noticeably different
   - Ensure sounds still sync

4. **Test pause action:**
   - Preview `example-pause.json`
   - Verify pauses occur between lines
   - No sounds during pauses

5. **Batch render:**

   ```bash
   bun run render:all
   ```

   - All scenes render without errors
   - Check output files

---

## Success Criteria

Phase 1 MVP is complete when:

✅ Repository created at `/Users/iHiD/Code/jiki/code-videos`
✅ Can render up to 5 lines of JavaScript code
✅ Character-by-character typing animation works
✅ Keypress sound plays on each character
✅ JSON configuration drives the rendering
✅ Three speed modes (slow, normal, fast) work correctly
✅ Pause action works
✅ Per-line speed control works
✅ Preview mode works in browser
✅ Rendering to MP4 works
✅ Batch rendering works

---

## Phase 2: Future Enhancements

Once MVP is working, consider:

### Additional Actions

- **Highlight** - Highlight specific lines or ranges
- **Delete** - Animate deleting characters/lines
- **Replace** - Replace one section with another
- **Fade** - Fade in entire code block
- **Scroll** - Scroll through longer code

### Advanced Features

- Multiple code blocks on screen simultaneously
- Split screen (code + output)
- Execution visualization (highlight line being "executed")
- Cursor blink animation
- Different syntax themes (selectable via JSON)
- Support for more languages (Python, Rust, etc.)
- Line numbers toggle
- Title animations
- Transitions between scenes

### Integration

- API endpoint to trigger renders
- Webhook notifications when render completes
- Upload rendered videos to R2 automatically
- Integration with Cloudflare Workflows
- Database to track render jobs
- Queue system for parallel renders

### Optimizations

- Remotion Lambda for cloud rendering
- Parallel scene rendering
- Caching for common components
- Pre-rendered audio sprite sheet
- Compressed audio assets

---

## Timeline Estimate

**Phase 1 MVP:** 2-3 days

- Day 1: Setup, core implementation
- Day 2: Audio integration, timing refinement
- Day 3: Testing, bug fixes, documentation

**Phase 2 (if needed):** 1-2 weeks

- Depends on which enhancements are prioritized

---

## Notes

### Keypress Sound Considerations

- Use a subtle, pleasant sound (not loud/annoying)
- Consider different sounds for different keys (optional enhancement)
- Volume should be low (~0.2-0.3) so it doesn't overpower narration
- Ensure sound is short (<100ms) to avoid overlap

### Performance

- Remotion renders frame-by-frame, so complex scenes take time
- For 500+ videos, consider Remotion Lambda (cloud rendering)
- Each 10-second scene at 30fps = 300 frames to render
- Estimated render time: 10-30 seconds per 10-second clip (local)

### JikiScript Syntax

- Start with JavaScript syntax highlighting
- Phase 2: Create custom syntax highlighter for JikiScript
- Or extend existing highlighter with custom rules

### Multilingual Support

- Code typically doesn't change between languages
- Comments might need translation
- Consider separate action: `comment` with i18n key
- Phase 2 enhancement

---

## Getting Started

```bash
# 1. Create repository
cd /Users/iHiD/Code/jiki
mkdir code-videos
cd code-videos

# 2. Initialize project
bun init

# 3. Install dependencies
bun add remotion @remotion/cli @remotion/media-utils react react-dom react-syntax-highlighter
bun add -d @types/react @types/react-dom @types/react-syntax-highlighter typescript

# 4. Copy implementation files from this plan

# 5. Download keypress sound
# Place in public/sounds/keypress.mp3

# 6. Start development
bun run dev

# 7. Render first scene
bun run render example-basic
```

---

## Questions to Answer During Implementation

1. Should keypress sounds be configurable per scene? (volume, enabled/disabled)
2. Do we need a typing cursor? (blinking cursor at end of visible text)
3. Should line numbers be shown by default?
4. What's the best default background color?
5. Should there be padding/margin around code blocks?
6. Do we need title animation (fade in, slide in)?
7. Should final frame hold for X seconds before video ends?

These can be decided during implementation based on what looks/feels best.
