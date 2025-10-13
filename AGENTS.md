# Jiki Video Production Pipeline - Agent Documentation

## Overview

This repository is a **complete video production pipeline system** for generating Jiki's educational programming videos. It orchestrates multiple AI services and video generation tools to produce approximately **50 lessons** (with potential for multiple languages later), each 10-15 minutes long.

The system has two main parts:

1. **Visual Pipeline Editor** (Next.js + React Flow + PostgreSQL)
   - Graph-based pipeline designer for orchestrating video generation
   - Supports multiple node types: talking heads (HeyGen), animations (Veo 3), code screens (Remotion), audio mixing, video merging
   - Real-time execution monitoring with status updates
   - PostgreSQL database with JSONB for flexible configuration storage

2. **Code Screen Generator** (Remotion)
   - Animated code typing with syntax highlighting and keypress sounds
   - Character-by-character animations at 30fps
   - JSON-driven configuration for rapid iteration

## Repository Purpose

This single repository handles the **entire video production workflow** from configuration to final render:

- **Design pipelines** visually with drag-and-drop nodes
- **Execute nodes** via integrated AI services (HeyGen, Veo 3, ElevenLabs, Remotion)
- **Monitor progress** with real-time status updates
- **Generate 50+ educational videos** at scale with consistent quality

## Tech Stack

### Pipeline Editor

- **Next.js 15** with App Router and Turbopack - Server-side rendering and Server Actions
- **React Flow 11+** - Visual graph editor for pipeline design
- **PostgreSQL** with **JSONB** - Database with native JSON support for flexible schemas
- **pg** - PostgreSQL client with connection pooling
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
├── PIPELINE-PLAN.md           # Complete pipeline system architecture
├── CLAUDE.md                  # This document (agent guidance)
├── README.md                  # User-facing documentation
│
├── app/                       # Next.js visual pipeline editor
│   ├── page.tsx               # Index: list all pipelines
│   └── pipelines/[id]/
│       ├── page.tsx           # Pipeline editor (Server Component)
│       ├── actions.ts         # Server Actions for DB updates
│       └── components/        # React Flow UI components
│
├── lib/                       # Database and utilities
│   ├── db.ts                  # PostgreSQL connection pool
│   ├── db-operations.ts       # Atomic DB operations (JSONB partial updates)
│   ├── db-migrations.ts       # Schema creation
│   └── db-to-flow.ts          # DB → React Flow converter
│
├── pipeline/                  # Execution engine (future)
│   ├── scripts/               # CLI executors
│   └── lib/                   # Node executors, provider integrations
│
├── src/                       # Remotion code screen generator
│   ├── components/
│   │   └── AnimatedCode.tsx   # Character-by-character typing
│   ├── compositions/
│   │   └── CodeScene.tsx      # Main scene composition
│   ├── lib/
│   │   ├── types.ts           # TypeScript types
│   │   ├── timing.ts          # Frame calculations
│   │   └── audio.tsx          # Keypress sound management
│   └── assets/sounds/
│
├── scenes/                    # Remotion JSON configurations
├── scripts/                   # Rendering and DB scripts
│   ├── render.ts              # Render code screens
│   ├── db-init.ts             # Initialize database
│   └── db-seed.ts             # Seed pipelines from JSON
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

**Database Architecture:**

- PostgreSQL with JSONB columns for flexible configuration
- Server Components read directly from database (no API layer)
- Server Actions handle mutations via atomic operations
- Real-time updates via `router.refresh()` polling

**CRITICAL: JSONB Partial Updates**

**ALL database updates MUST use `jsonb_set()` to update only changed keys. Never replace entire JSONB columns.**

```sql
-- ✅ CORRECT: Update single key
UPDATE nodes
SET config = jsonb_set(config, '{provider}', '"heygen"')
WHERE pipeline_id = $1 AND id = $2;

-- ✅ CORRECT: Update multiple keys (chain jsonb_set)
UPDATE nodes
SET metadata = jsonb_set(
  jsonb_set(metadata, '{startedAt}', to_jsonb(NOW())),
  '{jobId}', to_jsonb($3::text)
)
WHERE pipeline_id = $1 AND id = $2;

-- ❌ WRONG: Replaces entire object, loses other keys
UPDATE nodes
SET config = '{"provider": "heygen"}'::jsonb
WHERE pipeline_id = $1 AND id = $2;
```

**Why:** Multiple processes update different keys concurrently (UI updates `config`, Executor updates `metadata`). Partial updates prevent data loss.

**Reference:** See PIPELINE-PLAN.md "JSONB Partial Update Strategy" section for complete patterns and examples.

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

## Future Enhancements

See `PLAN.md` Phase 2 for:

- Line highlighting
- Code deletion/replacement animations
- Multiple code blocks on screen
- Cursor blink animation
- More languages (Python, Rust, etc.)
- Integration with Cloudflare Workflows for cloud rendering
