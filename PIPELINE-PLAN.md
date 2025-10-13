# Jiki Video Production Pipeline

## Overview

This repository contains a visual pipeline system for generating Jiki's educational programming videos. The system orchestrates multiple AI services and video generation tools to produce approximately **50 lessons** (with potential for multiple languages later), each 10-15 minutes long.

The pipeline is:

- **Graph-based**: Nodes with dependencies that reference each other
- **Visual**: React Flow editor for designing and monitoring pipelines
- **Declarative**: Single JSON file per video defines both the pipeline structure and execution state
- **Composable**: Mix and match different video generation providers

## Architecture

### Core Components

1. **Pipeline JSON Format**: Single source of truth for each video (what to generate + current state)
2. **Visual Editor** (Next.js + React Flow): Design pipelines, edit nodes, monitor progress
3. **Execution Engine**: Scripts that execute nodes based on dependencies
4. **Code Screen Generator** (Remotion): Existing functionality, now a pipeline tool

```
┌──────────────────────────────────────────────────────────────┐
│                     Pipeline JSON File                        │
│  Single file containing: structure, config, state, metadata   │
└──────────────────────────────────────────────────────────────┘
                              ↓
        ┌─────────────────────┴─────────────────────┐
        ↓                                           ↓
┌──────────────────┐                      ┌──────────────────┐
│  Visual Editor   │                      │ Execution Engine │
│  (Next.js App)   │                      │  (CLI Scripts)   │
│                  │                      │                  │
│  • View graph    │                      │  • Read JSON     │
│  • Edit nodes    │                      │  • Execute nodes │
│  • Monitor state │                      │  • Update state  │
└──────────────────┘                      └──────────────────┘
```

---

## Pipeline JSON Format

Each video has a single JSON file (e.g., `lessons/lesson-001/pipeline.json`) that serves as both:

- **Pipeline definition**: What nodes exist, how they connect, what they do
- **Execution state**: Current status, timestamps, costs, output files

### Schema

```json
{
  "version": "1.0",
  "id": "lesson-001-variables",
  "title": "Introduction to Variables",
  "created": "2025-10-13T10:00:00Z",
  "updated": "2025-10-13T14:30:00Z",

  "config": {
    "storage": {
      "bucket": "jiki-videos",
      "prefix": "lessons/lesson-001-variables/"
    },
    "workingDirectory": "./output"
  },

  "nodes": {
    "intro_script": {
      "type": "asset",
      "status": "completed",
      "asset": {
        "source": "./scripts/intro.md",
        "type": "text"
      },
      "output": {
        "type": "text",
        "file": "./scripts/intro.md"
      }
    },

    "heygen_intro": {
      "type": "talking-head",
      "status": "completed",
      "inputs": {
        "script": "intro_script"
      },
      "config": {
        "provider": "heygen",
        "avatarId": "jeremy-avatar-001",
        "duration": 60
      },
      "metadata": {
        "startedAt": "2025-10-13T10:15:00Z",
        "completedAt": "2025-10-13T10:18:00Z",
        "jobId": "heygen_abc123",
        "cost": 1.0,
        "retries": 0
      },
      "output": {
        "type": "video",
        "localFile": "./output/heygen/intro.mp4",
        "s3Key": "lessons/lesson-001-variables/heygen/intro.mp4",
        "duration": 60,
        "size": 12400000
      }
    },

    "code_config": {
      "type": "asset",
      "status": "completed",
      "asset": {
        "source": "./code/segment-1.json",
        "type": "json"
      },
      "output": {
        "type": "json",
        "file": "./code/segment-1.json"
      }
    },

    "code_screen": {
      "type": "render-code",
      "status": "completed",
      "inputs": {
        "config": "code_config"
      },
      "config": {
        "provider": "remotion",
        "compositionId": "code-scene"
      },
      "metadata": {
        "completedAt": "2025-10-13T11:00:00Z",
        "retries": 0
      },
      "output": {
        "type": "video",
        "localFile": "./output/remotion/code-screen.mp4",
        "duration": 240
      }
    },

    "final_video": {
      "type": "merge-videos",
      "status": "in_progress",
      "inputs": {
        "segments": ["heygen_intro", "code_screen"]
      },
      "config": {
        "provider": "ffmpeg",
        "operation": "concatenate"
      },
      "metadata": {
        "startedAt": "2025-10-13T14:25:00Z",
        "retries": 0
      },
      "output": {
        "type": "video"
      }
    }
  },

  "metadata": {
    "totalCost": 5.3,
    "estimatedTotalCost": 91.0,
    "progress": {
      "completed": 3,
      "in_progress": 1,
      "pending": 0,
      "failed": 0,
      "total": 4
    }
  }
}
```

### Key Concepts

**Node Structure:**

- `type`: Function the node performs (e.g., `talking-head`, `merge-videos`, `render-code`)
- `status`: Current state (`pending`, `in_progress`, `completed`, `failed`)
- `inputs`: References to other nodes by ID (defines the dependency graph)
- `config`: Node-specific configuration including `provider` (implementation details)
- `metadata`: Execution tracking (timestamps, costs, retries, errors)
- `output`: Results of execution with standardized `type` field (video, audio, image, text, json)

**Node Types:**

| Type                 | Description                  | Example Providers  |
| -------------------- | ---------------------------- | ------------------ |
| `asset`              | Static file reference        | local filesystem   |
| `talking-head`       | Human presenter video        | heygen             |
| `generate-animation` | Animated character scenes    | veo3, runway       |
| `generate-voiceover` | Text-to-speech audio         | elevenlabs, heygen |
| `render-code`        | Animated code screens        | remotion           |
| `mix-audio`          | Replace/overlay audio tracks | ffmpeg             |
| `merge-videos`       | Concatenate video segments   | ffmpeg             |
| `compose-video`      | Picture-in-picture, overlays | ffmpeg             |

---

## Visual Editor (Next.js + React Flow)

### Purpose

A web-based visual editor for:

- Designing video pipelines by connecting nodes
- Editing node configurations
- Monitoring execution progress in real-time
- Triggering pipeline execution

### Tech Stack

- **Next.js 14+** (App Router)
- **React Flow 11+** (visual graph editor)
- **TypeScript** (type safety)
- **Tailwind CSS** (styling)
- **Zustand** (state management)
- **dagre** (auto-layout algorithm for left-to-right graphs)
- **zod** (JSON schema validation)

### Layout

```
┌─────────────────────────────────────────┬──────────────────┐
│                                         │                  │
│         React Flow Canvas              │   Node Editor    │
│         (Left-to-right flow)            │   Panel          │
│                                         │                  │
│  ┌──────┐      ┌──────┐      ┌──────┐  │   [Node ID]      │
│  │Asset │─────>│Heygen│─────>│Merge │  │   [Type]         │
│  └──────┘      └──────┘      └──────┘  │   [Inputs]       │
│                                         │   [Config]       │
│  ┌──────┐      ┌──────┐           │    │   [Metadata]     │
│  │Asset │─────>│Veo3  │───────────┘    │   [Output]       │
│  └──────┘      └──────┘                 │                  │
│                                         │   [Actions]      │
│  Controls: [▶️ Run] [⏸️ Pause] [🔍]     │                  │
└─────────────────────────────────────────┴──────────────────┘
```

### Features

**Node Visualization:**

- Custom components per node type with status-based styling
- Color-coded status indicators:
  - Pending: Gray
  - In Progress: Blue (animated pulse)
  - Completed: Green with checkmark
  - Failed: Red with error icon
- Display key info: provider, duration, cost
- Connection handles showing data flow

**Editor Panel:**

- Opens when clicking a node
- Dynamic forms based on node type
- Edit inputs, config, metadata
- View output details
- Actions: Save, Delete, Duplicate, Run Node

**Canvas Controls:**

- Zoom/pan with mouse/trackpad
- Auto-layout with dagre (left-to-right)
- Minimap for navigation
- Export graph to PNG

---

## Project Structure

```
code-videos/
├── PIPELINE-PLAN.md            # This document
├── README.md                   # Quick start guide
├── package.json
├── remotion.config.ts
│
├── remotion/                   # Code screen generator (existing Remotion app)
│   ├── src/
│   │   ├── Root.tsx
│   │   ├── compositions/
│   │   │   └── CodeScene.tsx
│   │   ├── components/
│   │   │   └── AnimatedCode.tsx
│   │   ├── lib/
│   │   │   ├── types.ts
│   │   │   ├── timing.ts
│   │   │   └── audio.ts
│   │   └── assets/
│   │       └── sounds/
│   │           └── keypress.mp3
│   ├── scenes/                 # Example JSON configs for code scenes
│   └── scripts/
│       ├── render.ts           # Render single scene
│       └── renderAll.ts        # Render all scenes
│
├── editor/                     # Visual pipeline editor (NEW)
│   ├── package.json
│   ├── next.config.js
│   ├── tsconfig.json
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Landing: list all pipelines
│   │   ├── pipeline/
│   │   │   └── [id]/
│   │   │       └── page.tsx    # Main editor view
│   │   └── api/
│   │       ├── pipeline/[id]/
│   │       │   └── route.ts    # GET/PUT pipeline JSON
│   │       └── execute/
│   │           └── route.ts    # POST to run pipeline/node
│   ├── components/
│   │   ├── PipelineFlow.tsx    # React Flow canvas
│   │   ├── NodeEditor.tsx      # Right-side editor panel
│   │   ├── nodes/              # Custom node components
│   │   │   ├── AssetNode.tsx
│   │   │   ├── TalkingHeadNode.tsx
│   │   │   ├── AnimationNode.tsx
│   │   │   ├── RenderCodeNode.tsx
│   │   │   └── MergeVideosNode.tsx
│   │   └── editors/            # Node-specific editors
│   │       ├── AssetEditor.tsx
│   │       ├── TalkingHeadEditor.tsx
│   │       └── ...
│   ├── lib/
│   │   ├── pipelineLoader.ts   # Load/save pipeline JSON
│   │   ├── layoutEngine.ts     # Dagre auto-layout
│   │   └── validation.ts       # Validate dependencies
│   └── hooks/
│       ├── usePipeline.ts      # Pipeline state management
│       └── useNodeEditor.ts    # Editor panel state
│
├── pipeline/                   # Execution engine (NEW)
│   ├── types/
│   │   └── pipeline.ts         # TypeScript types for JSON schema
│   │
│   ├── scripts/
│   │   ├── run-pipeline.ts     # Execute entire pipeline
│   │   ├── run-node.ts         # Execute single node
│   │   ├── validate.ts         # Validate pipeline JSON
│   │   └── status.ts           # Show pipeline progress
│   │
│   ├── lib/
│   │   ├── executors/          # Node type executors
│   │   │   ├── asset.ts
│   │   │   ├── talking-head.ts
│   │   │   ├── generate-animation.ts
│   │   │   ├── generate-voiceover.ts
│   │   │   ├── render-code.ts      # Wraps Remotion
│   │   │   ├── mix-audio.ts
│   │   │   ├── merge-videos.ts
│   │   │   └── compose-video.ts
│   │   │
│   │   ├── providers/          # Service integrations
│   │   │   ├── heygen.ts
│   │   │   ├── veo3.ts
│   │   │   ├── elevenlabs.ts
│   │   │   ├── ffmpeg.ts
│   │   │   └── remotion.ts     # Calls existing Remotion renderer
│   │   │
│   │   ├── storage.ts          # S3/R2 upload/download
│   │   ├── state.ts            # JSON read/write with locking
│   │   └── graph.ts            # Dependency resolution
│   │
│   └── config/
│       └── providers.json      # API keys, endpoints, etc.
│
├── lessons/                    # Lesson content
│   ├── lesson-001-variables/
│   │   ├── pipeline.json       # THE single source of truth
│   │   ├── scripts/
│   │   │   ├── intro.md
│   │   │   └── narration-1.md
│   │   ├── prompts/
│   │   │   └── scene-1.md
│   │   ├── code/
│   │   │   └── segment-1.json
│   │   └── output/             # Generated files (gitignored)
│   │       ├── heygen/
│   │       ├── veo3/
│   │       ├── audio/
│   │       ├── remotion/
│   │       └── final/
│   │
│   └── lesson-002-functions/
│       └── ...
│
└── shared/
    └── assets/
        └── jiki-character.png  # Character reference image
```

---

## Workflows

### Creating a New Video

1. Create lesson directory: `lessons/lesson-XXX/`
2. Create `pipeline.json` with nodes
3. Create referenced assets (scripts, prompts, configs)
4. Open in visual editor: `http://localhost:3000/pipeline/lesson-XXX`
5. Edit nodes, adjust connections
6. Run pipeline: Click "▶️ Run" or `pnpm exec:pipeline lesson-XXX`
7. Monitor progress in visual editor (status updates in real-time)
8. Find final video in `lessons/lesson-XXX/output/final/`

### Editing a Pipeline

1. Open in visual editor
2. Click node to edit in right panel
3. Modify config, inputs, etc.
4. Save (writes back to `pipeline.json`)
5. Re-run node or entire pipeline

### Running from CLI

```bash
# Execute entire pipeline
pnpm exec:pipeline lesson-001-variables

# Execute single node
pnpm exec:node lesson-001-variables heygen_intro

# Validate pipeline JSON
pnpm validate lesson-001-variables

# Show pipeline status
pnpm status lesson-001-variables
```

### Code Screen Generation (Remotion)

The existing Remotion functionality is preserved and integrated as the `render-code` node type:

```json
{
  "code_screen": {
    "type": "render-code",
    "inputs": {
      "config": "code_config"
    },
    "config": {
      "provider": "remotion",
      "compositionId": "code-scene"
    }
  }
}
```

The `render-code` executor (`pipeline/lib/executors/render-code.ts`) calls the Remotion renderer (`pipeline/lib/providers/remotion.ts`), which uses the existing `remotion/` codebase.

**Standalone usage still works:**

```bash
# Preview code scenes in Remotion Studio
cd remotion && pnpm dev

# Render individual code scenes
cd remotion && pnpm render example-basic
```

---

## Implementation Phases

### Phase 1: JSON Schema + Types (Week 1)

- [ ] Define complete TypeScript types for pipeline JSON
- [ ] Implement JSON validation with zod
- [ ] Create example pipeline JSON files
- [ ] Document all node types and their config schemas

### Phase 2: Visual Editor Foundation (Week 1-2)

- [ ] Set up Next.js app with App Router
- [ ] Integrate React Flow
- [ ] Implement JSON → React Flow conversion
- [ ] Auto-layout with dagre (left-to-right)
- [ ] Basic node rendering (boxes with labels)
- [ ] Load/display existing pipeline JSON

### Phase 3: Visual Editor - Nodes & Editing (Week 2)

- [ ] Custom node components for each type
- [ ] Status-based styling (colors, animations)
- [ ] Node icons and info display
- [ ] Editor panel with dynamic forms
- [ ] Save changes back to JSON
- [ ] Add/delete nodes
- [ ] Validate dependencies (prevent cycles)

### Phase 4: Execution Engine (Week 2-3)

- [ ] Dependency graph resolver
- [ ] State management (read/write JSON with locking)
- [ ] Base executor framework
- [ ] Implement node executors:
  - [ ] `asset` (file reference)
  - [ ] `render-code` (wrap existing Remotion)
  - [ ] `merge-videos` (FFmpeg concat)
  - [ ] `compose-video` (FFmpeg overlay)
- [ ] CLI scripts (run-pipeline, run-node, status)

### Phase 5: Provider Integrations (Week 3-4)

- [ ] FFmpeg wrapper (`mix-audio`, `merge-videos`, `compose-video`)
- [ ] Remotion wrapper (calls existing renderer)
- [ ] HeyGen API wrapper (`talking-head`)
- [ ] Veo 3 API wrapper (`generate-animation`)
- [ ] ElevenLabs API wrapper (`generate-voiceover`)
- [ ] S3/R2 storage integration

### Phase 6: Editor ↔ Engine Integration (Week 4)

- [ ] API routes for executing pipelines/nodes
- [ ] File watching for real-time status updates
- [ ] Progress indicators in visual editor
- [ ] Error display and retry logic
- [ ] Webhook support for async providers

### Phase 7: Production Readiness (Week 5+)

- [ ] Create first complete lesson end-to-end
- [ ] Cost tracking and reporting
- [ ] Cleanup scripts (remove intermediate files)
- [ ] Error recovery and resume
- [ ] Documentation and examples
- [ ] Deploy editor to web (Vercel/Cloud)

---

## Cost Estimates (Per Lesson)

| Service        | Usage                      | Cost        |
| -------------- | -------------------------- | ----------- |
| **HeyGen**     | 2 min talking head         | $10.00      |
| **Veo 3**      | 3 min animations (180 sec) | $72.00      |
| **ElevenLabs** | 3 min voiceover            | $9.00       |
| **Remotion**   | 4 min code screens (local) | $0.00       |
| **S3 Storage** | ~5GB                       | $0.12/month |
| **Total**      | One-time generation        | **~$91.00** |

For 50 lessons: **~$4,550** (one-time) + **~$6/month** (storage)

---

## Technical Decisions

### Why Function-First Node Types?

Node types describe **what** they do (`merge-videos`), not **how** (`ffmpeg`). The implementation provider is in `config.provider`. This allows:

- Swapping providers without changing node type
- Multiple implementations of same function
- Easier visual representation
- More maintainable code

### Why Single JSON File?

- **Version control**: Track pipeline evolution in Git
- **Portability**: One file = one video (easy to share/duplicate)
- **Transparency**: See entire state at a glance
- **Simplicity**: No database, no separate state management

### Why Next.js Over Vite?

- Consistency with existing Next.js usage
- Server-side file operations (reading/writing pipeline JSON)
- API routes for execution triggers
- Future-proofing for web features (auth, collaboration, webhooks)
- Production deployment path (Vercel)

### Why React Flow?

- Purpose-built for visual graphs with dependencies
- Auto-layout algorithms (dagre/elk)
- Custom node rendering
- Built-in zoom/pan/minimap
- Active development and community

---

## Future Enhancements

### Near-term

- Templates for common pipeline patterns
- Node library/marketplace
- Batch operations (run multiple lessons)
- Timeline view (alternative to graph)
- Export/import pipeline snippets

### Long-term

- Multi-language support (one pipeline → multiple languages)
- Collaborative editing (multiple users)
- Cloud execution (run pipelines on remote servers)
- AI-assisted pipeline generation
- Version control integration (diff pipelines)
- Cost optimization suggestions
- A/B testing support (generate variants)

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- FFmpeg (for video operations)

### Setup

```bash
# Install dependencies
pnpm install

# Start visual editor
cd editor && pnpm dev
# Opens http://localhost:3000

# Preview Remotion code screens (optional)
cd remotion && pnpm dev
# Opens http://localhost:3001
```

### Quick Test

```bash
# Validate example pipeline
pnpm validate lesson-001-variables

# Execute example pipeline
pnpm exec:pipeline lesson-001-variables

# Monitor progress
pnpm status lesson-001-variables
```

---

This pipeline system provides a production-ready framework for generating educational videos at scale, with full transparency, visual control, and maintainable architecture.
