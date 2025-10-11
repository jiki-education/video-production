# Jiki Code Videos - Agent Documentation

## Overview

This repository generates animated code screen videos for Jiki's educational programming language content. It uses **Remotion** (React-based video generation) to create character-by-character typing animations with syntax highlighting and keypress sound effects.

## Purpose

Jiki needs approximately 50 educational videos in 10+ languages (500+ total renders). Each video contains:

1. Talking heads (instructor explanations)
2. Jiki animations (Pixar-style character demonstrations)
3. **Code screens** ← This repo

This app generates the code screen segments programmatically from JSON configurations.

## Tech Stack

- **Remotion 4.0** - React-based programmatic video generation
- **React 19** + **TypeScript 5.9** - UI framework and type safety
- **react-syntax-highlighter** - Code syntax highlighting with VSCode Dark+ theme
- **pnpm** - Package manager
- **tsx** - TypeScript execution for rendering scripts

## Project Structure

```
code-videos/
├── src/
│   ├── lib/
│   │   ├── types.ts          # TypeScript types (Action, SceneConfig, etc.)
│   │   ├── timing.ts         # Frame/timing calculations for animations
│   │   └── audio.tsx         # Keypress sound management
│   ├── components/
│   │   └── AnimatedCode.tsx  # Core component: character-by-character typing
│   ├── compositions/
│   │   └── CodeScene.tsx     # Main scene composition
│   ├── assets/sounds/
│   │   └── keypress.mp3      # Sound effect played per character
│   ├── Root.tsx              # Remotion root (registers compositions)
│   └── index.ts              # Entry point
├── scenes/                    # JSON scene configurations
│   ├── example-basic.json    # Simple single-line example
│   ├── example-pause.json    # Multi-line with pauses
│   └── example-speeds.json   # Variable typing speeds
├── scripts/
│   ├── render.ts             # Render single scene: `pnpm render <name>`
│   └── renderAll.ts          # Batch render: `pnpm render:all`
└── out/                       # Rendered MP4 videos (gitignored)
```

## Key Concepts

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

## Future Enhancements

See `PLAN.md` Phase 2 for:

- Line highlighting
- Code deletion/replacement animations
- Multiple code blocks on screen
- Cursor blink animation
- More languages (Python, Rust, etc.)
- Integration with Cloudflare Workflows for cloud rendering
