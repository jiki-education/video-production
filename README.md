# Jiki Video Production Pipeline

Complete video production pipeline system for generating Jiki's educational programming videos.

## Overview

This repository orchestrates the **entire video production workflow** for ~50 educational programming lessons. The system integrates multiple AI services (HeyGen, Veo 3, ElevenLabs) and video generation tools (Remotion, FFmpeg) into a visual, graph-based pipeline editor.

### Two Main Components

**1. Visual Pipeline Editor** (Next.js + React Flow + PostgreSQL)

- Drag-and-drop pipeline designer
- Real-time execution monitoring
- Support for talking heads, animations, code screens, audio mixing, video merging
- PostgreSQL database with JSONB for flexible configuration storage

**2. Code Screen Generator** (Remotion)

- Character-by-character typing animations
- Configurable typing speeds (slow, normal, fast)
- Syntax highlighting with keypress sound effects
- JSON-driven configuration
- 1920x1080 @ 30fps output

## Setup

### Prerequisites

- Node.js 18+
- pnpm
- PostgreSQL 14+ (local or hosted)

### Installation

```bash
# Install dependencies
pnpm install

# Create .env file with DATABASE_URL
echo "DATABASE_URL=postgresql://localhost:5432/jiki_video_pipelines" > .env

# Create database (if not exists)
createdb jiki_video_pipelines

# Initialize database schema
pnpm db:init

# Seed with example pipelines
pnpm db:seed
```

## Usage

### Visual Pipeline Editor

```bash
# Start Next.js development server (port 3065)
pnpm dev

# Open browser
open http://localhost:3065
```

Navigate to a pipeline like `http://localhost:3065/pipelines/lesson-001` to view/edit.

### Code Screen Generator (Remotion)

```bash
# Preview Remotion compositions
pnpm remotion

# Render single code screen
pnpm render example-basic

# Render all code screens
pnpm render:all
```

### Available Scripts

#### Pipeline Editor

- **`pnpm dev`** - Start Next.js dev server (port 3065)
- **`pnpm db:init`** - Initialize database schema
- **`pnpm db:seed`** - Seed pipelines from `lessons/*/pipeline.json`
- **`pnpm db:reset`** - Drop and recreate database

#### Code Screens (Remotion)

- **`pnpm remotion`** - Start Remotion Studio (port 3001)
- **`pnpm render <scene>`** - Render single scene to MP4
- **`pnpm render:all`** - Render all scenes

#### Development

- **`pnpm typecheck`** - Run TypeScript type checking
- **`pnpm lint`** - Run ESLint
- **`pnpm format`** - Format code with Prettier

## Creating Scenes

Scenes are defined as JSON files in the `scenes/` directory. See the examples:

- `scenes/example-basic.json` - Simple single-line typing
- `scenes/example-pause.json` - Multiple lines with pauses
- `scenes/example-speeds.json` - Different typing speeds per line

### Scene Configuration

```json
{
  "title": "Scene Title",
  "description": "Optional description",
  "theme": "dark",
  "backgroundColor": "#1e1e1e",
  "actions": [
    {
      "type": "type",
      "code": "let x = 42;",
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

### Typing Speeds

- `slow`: 10 chars/second - for emphasis on important concepts
- `normal`: 15 chars/second - default speed
- `fast`: 25 chars/second - for boilerplate code

You can specify a single speed for all lines or an array of speeds (one per line).

## Project Structure

```
code-videos/
├── app/                      # Next.js visual pipeline editor
│   ├── page.tsx              # Pipeline list
│   └── pipelines/[id]/       # Pipeline editor page
│
├── lib/                      # Database operations
│   ├── db.ts                 # PostgreSQL connection pool
│   ├── db-operations.ts      # Atomic DB functions
│   └── db-to-flow.ts         # DB → React Flow converter
│
├── src/                      # Remotion code screen generator
│   ├── components/
│   │   └── AnimatedCode.tsx  # Character typing animation
│   ├── compositions/
│   │   └── CodeScene.tsx     # Scene composition
│   └── lib/                  # Timing, types, audio
│
├── scripts/                  # CLI utilities
│   ├── render.ts             # Render code screens
│   ├── db-init.ts            # Initialize database
│   └── db-seed.ts            # Seed from JSON
│
├── lessons/                  # Lesson assets & pipeline configs
│   └── lesson-001/
│       ├── pipeline.json     # Pipeline definition
│       ├── scripts/          # Talking head scripts
│       └── code/             # Code screen configs
│
└── scenes/                   # Remotion example scenes
```

## Tech Stack

### Pipeline System

- **Next.js 15** - App Router, Server Components, Server Actions
- **React Flow 11+** - Visual graph editor
- **PostgreSQL + JSONB** - Flexible configuration storage
- **Tailwind CSS 4** - Styling

### Code Screens

- **Remotion 4.0** - React-based video generation
- **React 19 + TypeScript 5.9** - Type-safe components
- **react-syntax-highlighter** - Code syntax highlighting

## Documentation

- **PIPELINE-PLAN.md** - Complete pipeline architecture and implementation plan
- **CLAUDE.md** - Agent documentation for AI assistance
- **README.md** - This file (user-facing overview)

## Next Steps

1. **For Pipeline Development:**
   - Review PIPELINE-PLAN.md for architecture details
   - Start Next.js dev server: `pnpm dev`
   - View example pipeline: http://localhost:3065/pipelines/lesson-001

2. **For Code Screen Development:**
   - Create scene JSON files in `scenes/`
   - Preview with Remotion Studio: `pnpm remotion`
   - Render: `pnpm render <scene-name>`
