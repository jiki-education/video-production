# Jiki Video Production Pipeline - Agent Documentation

## Overview

This repository is the **frontend visual editor** for Jiki's video production pipeline system. It provides a React Flow-based graph editor for designing video generation workflows and displays execution status from the Rails API backend.

The system has two main parts:

1. **Visual Pipeline Editor** (Next.js + React Flow)
   - Graph-based pipeline designer for orchestrating video generation
   - Supports multiple node types: talking heads (HeyGen), animations (Veo 3), code screens (Remotion), audio mixing, video merging
   - Real-time execution monitoring via Rails API polling
   - Reads pipeline data from Rails API

2. **Code Screen Generator** (Remotion)
   - Animated code typing with syntax highlighting and keypress sounds
   - Character-by-character animations at 30fps
   - JSON-driven configuration for rapid iteration

## Repository Purpose

This frontend application provides the **visual interface** for the video production workflow:

- **Design pipelines** visually with drag-and-drop nodes
- **View execution status** from Rails API backend
- **Monitor progress** with real-time API polling
- **Generate code screen videos** using Remotion

## Tech Stack

### Pipeline Editor

- **Next.js 15** with App Router and Turbopack - Server-side rendering
- **React Flow 11+** - Visual graph editor for pipeline design
- **Rails API Client** - Fetches pipeline data and execution status from backend
- **Tailwind CSS 4** - Styling

### Code Screen Generator

- **Remotion 4.0** - React-based programmatic video generation
- **React 19** + **TypeScript 5.9** - UI framework and type safety
- **react-syntax-highlighter** - Code syntax highlighting with VSCode Dark+ theme

### Shared

- **pnpm** - Package manager
- **tsx** - TypeScript execution for scripts

## Project Structure

```
code-videos/
├── CLAUDE.md -> AGENTS.md     # Symlink to agent documentation
├── AGENTS.md                  # Agent guidance (this file)
├── README.md                  # User-facing documentation
├── PLAN.md                    # Future enhancements
│
├── app/                       # Next.js visual pipeline editor
│   ├── page.tsx               # Index: list all pipelines
│   └── pipelines/[id]/
│       ├── page.tsx           # Pipeline editor (Server Component)
│       └── components/        # React Flow UI components
│
├── lib/                       # API client and utilities
│   ├── api-client.ts          # Rails API client
│   ├── types.ts               # Type definitions
│   └── nodes/
│       └── types.ts           # Type-safe node discriminated unions
│
├── test/                      # Test infrastructure
│   ├── setup.ts               # Global test setup
│   ├── e2e/                   # End-to-end tests (Jest + Puppeteer)
│   └── mocks/                 # In-memory mock factories
│       ├── pipelines.ts       # Mock pipelines
│       └── nodes.ts           # Mock nodes
│
├── src/                       # Remotion code screen generator
│   ├── components/
│   │   └── AnimatedCode.tsx   # Character-by-character typing
│   ├── compositions/
│   │   └── CodeScene.tsx      # Main scene composition
│   ├── lib/
│   │   ├── types.ts           # Remotion scene types
│   │   ├── timing.ts          # Frame calculations
│   │   └── audio.tsx          # Keypress sound management
│   └── assets/sounds/
│
├── scenes/                    # Remotion JSON configurations
├── scripts/                   # Rendering scripts
│   ├── render.ts              # Render code screens
│   └── renderAll.ts           # Render all scenes
│
└── lessons/                   # Lesson assets and pipeline configs
    └── lesson-001/
        ├── pipeline.json      # Pipeline definition
        ├── scripts/           # Scripts for talking heads
        └── code/              # Code screen configurations
```

## Key Concepts

### Visual Pipeline Editor

The pipeline editor allows designing video generation workflows as graphs with nodes and edges:

**Node Types:**

- `asset` - Static files (scripts, images, configs)
- `talking-head` - Generate talking head videos (HeyGen)
- `generate-animation` - AI-generated animations (Veo 3, Runway)
- `generate-voiceover` - Text-to-speech (ElevenLabs)
- `render-code` - Code screen animations (Remotion)
- `mix-audio` - Audio track replacement/overlay (FFmpeg)
- `merge-videos` - Concatenate video segments (FFmpeg)
- `compose-video` - Picture-in-picture, overlays (FFmpeg)

**Architecture:**

- Rails API backend handles all data storage and execution
- Next.js frontend fetches pipeline data from API
- Real-time status updates via API polling
- No direct database access from frontend

---

### Code Screen Generator (Remotion)

### Scene Configuration (JSON)

Scenes are defined as JSON files with an array of **actions**:

```json
{
  "title": "Variable Example",
  "theme": "dark",
  "actions": [
    {
      "type": "type",
      "code": "let greeting = \"Hello World\";",
      "speed": "normal",
      "language": "javascript"
    },
    {
      "type": "pause",
      "duration": 0.5
    }
  ]
}
```

### Action Types

1. **TypeAction**: Types code character-by-character
   - `code`: The code string (can be multi-line with `\n`)
   - `speed`: "slow" (10 chars/sec), "normal" (15 chars/sec), or "fast" (25 chars/sec)
   - Can specify array of speeds for per-line control
   - `language`: Syntax highlighting language (default: "javascript")

2. **PauseAction**: Pauses animation
   - `duration`: Pause length in seconds

### Animation System

**Frame Rate**: 30fps (YouTube standard)

**Timing Calculation** (src/lib/timing.ts):

- Converts character speeds to frames per character
- Pre-calculates all keypress frame positions
- Sequences actions with proper start/end frames

**Audio Sync** (src/lib/audio.tsx):

- One `<Sequence>` component per character
- Each positioned at the exact frame when that character appears
- Contains an `<Audio>` component playing keypress.mp3

**Rendering** (src/components/AnimatedCode.tsx):

- Uses `useCurrentFrame()` to track current render frame
- Calculates which characters are visible based on elapsed frames
- Returns `<SyntaxHighlighter>` with visible code substring
- Font size: 64px (set via `codeTagProps.style.fontSize`)

### Video Output

- **Resolution**: 1920x1080 (Full HD)
- **Frame Rate**: 30fps
- **Codec**: H.264 (MP4)
- **Audio**: AAC stereo @ 48kHz

## Common Tasks

### Adding a New Scene

1. Create JSON file in `scenes/`:

```json
{
  "title": "My Scene",
  "actions": [{ "type": "type", "code": "console.log('Hello');", "speed": "normal" }]
}
```

2. Register in `src/Root.tsx`:

```typescript
import myScene from '../scenes/my-scene.json';

<Composition
  id="my-scene"
  component={CodeScene}
  durationInFrames={calculateSceneDuration(myScene.actions, fps)}
  fps={fps}
  width={1920}
  height={1080}
  defaultProps={{ config: myScene }}
/>
```

3. Render: `pnpm render my-scene`

### Adjusting Font Size

The font size is set in `src/components/AnimatedCode.tsx` using `codeTagProps`:

```typescript
codeTagProps={{
  style: {
    fontSize: '64px',  // Change this value
  }
}}
```

**Why not `customStyle.fontSize`?** The VSCode Dark+ theme overrides `customStyle`, so we use `codeTagProps` to directly style the `<code>` element.

### Changing Syntax Theme

Theme is set in `src/components/AnimatedCode.tsx`:

```typescript
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

<SyntaxHighlighter
  style={theme === 'dark' ? vscDarkPlus : undefined}
  // ...
/>
```

Other themes available from `react-syntax-highlighter/dist/esm/styles/prism`.

### Modifying Typing Speeds

Speeds are defined in `src/lib/types.ts`:

```typescript
export const CHARS_PER_SECOND: Record<TypingSpeed, number> = {
  slow: 10, // 1 char every 3 frames at 30fps
  normal: 15, // 1 char every 2 frames at 30fps
  fast: 25 // 1 char every 1.2 frames at 30fps
};
```

### Replacing Keypress Sound

Replace `src/assets/sounds/keypress.mp3` with your audio file (keep the filename or update import in `src/lib/audio.tsx`).

## Troubleshooting

### Font Size Not Changing

- Use `codeTagProps.style.fontSize` instead of `customStyle.fontSize`
- The syntax highlighter theme overrides `customStyle`

### Audio Not Playing

- Check file exists at `src/assets/sounds/keypress.mp3`
- Verify import in `src/lib/audio.tsx`
- Audio plays at the frame specified in keypress frame calculations

### Code Appears Suddenly (Not Typing)

- Check timing calculations in `src/lib/timing.ts`
- Ensure `framesPerChar` is correctly calculated from speed
- Verify `relativeFrame` comparison logic in `AnimatedCode.tsx`

## Development Workflow

```bash
# Preview in browser (hot reload)
pnpm dev

# Render single scene
pnpm render example-basic

# Render all registered scenes
pnpm render:all
```

## Architecture Notes

### Why Remotion?

- **React-based**: Familiar component model
- **Frame-perfect**: Precise control over each frame
- **TypeScript**: Type-safe video generation
- **Rendering**: Exports to MP4 via FFmpeg

### Why Character-by-Character?

- Simulates real coding experience
- Creates engaging educational content
- Allows precise timing control per character
- Syncs perfectly with keypress sounds

### Why JSON Configuration?

- **Scalability**: 500+ videos need data-driven approach
- **Separation**: Content creators don't need code knowledge
- **Version Control**: Easy to track changes
- **Automation**: Can be generated from scripts/databases

## Testing

### Test Framework

- **Jest** - Test framework for E2E tests
- **Puppeteer** - Headless browser automation
- Test files located in `test/e2e/` directory

### Mock Factories (In-Memory)

Use mock factories from `@/test/mocks` for testing with mock data:

```typescript
import { createMockTalkingHeadNode, createMockPipeline } from "@/test/mocks";

const node = createMockTalkingHeadNode({
  id: "my-test-node",
  config: { provider: "heygen", avatarId: "avatar-1" }
});
```

Available factories:

- `createMockPipeline()` - Pipeline records
- `createMockAssetNode()` - Asset nodes
- `createMockTalkingHeadNode()` - Talking head nodes
- `createMockRenderCodeNode()` - Render code nodes
- `createMockGenerateAnimationNode()` - Animation nodes
- `createMockGenerateVoiceoverNode()` - Voiceover nodes
- `createMockMixAudioNode()` - Mix audio nodes
- `createMockMergeVideosNode()` - Merge videos nodes
- `createMockComposeVideoNode()` - Compose video nodes

### Running Tests

```bash
# Run E2E tests (Jest + Puppeteer)
pnpm test:e2e

# Run with visible browser (debugging)
pnpm test:e2e:headful

# Watch mode
pnpm test:e2e:watch
```

### E2E Testing Best Practices

**IMPORTANT Wait Strategy:**

- **DO NOT use `waitUntil: "networkidle0"`** - It's 30% slower and unnecessary
- **USE `waitUntil: "domcontentloaded"`** instead for faster tests
- **ALWAYS add a 500ms delay after page load** to ensure React hydration completes before interacting with the page

**Pattern:**

```typescript
// ✅ CORRECT: Fast and reliable
await page.goto(`http://localhost:4000/pipelines/${id}`, {
  waitUntil: "domcontentloaded" // Fast - DOM is ready
});

await page.waitForSelector(".react-flow", { timeout: 2000 });
await page.waitForSelector(`[data-id="${nodeId}"]`, { timeout: 2000 });

// Critical: Wait for React hydration to attach event handlers
await new Promise((resolve) => setTimeout(resolve, 500));

// Now safe to interact
await page.click(`[data-id="${nodeId}"]`);

// ❌ WRONG: Slow and unnecessary
await page.goto(`http://localhost:4000/pipelines/${id}`, {
  waitUntil: "networkidle0" // Waits for all network requests to settle
});
// No hydration delay - clicks may not work!
await page.click(`[data-id="${nodeId}"]`);
```

**Why the 500ms delay?**

- Next.js uses React hydration - the HTML renders first, then React attaches event handlers
- Without the delay, elements exist in the DOM but clicks don't work yet
- 500ms is the minimum reliable delay for React hydration to complete

### Key Testing Principles

1. **Use mock factories from `@/test/mocks`** for in-memory testing
2. **Mock the Rails API** for E2E tests using test setup
3. **Tests are isolated** - Each test uses fresh mock data

## Future Enhancements

See `PLAN.md` Phase 2 for:

- Line highlighting
- Code deletion/replacement animations
- Multiple code blocks on screen
- Cursor blink animation
- More languages (Python, Rust, etc.)
- Integration with Cloudflare Workflows for cloud rendering
