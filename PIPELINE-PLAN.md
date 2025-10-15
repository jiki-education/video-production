# Jiki Video Production Pipeline

## Overview

This repository contains a visual pipeline system for generating Jiki's educational programming videos. The system orchestrates multiple AI services and video generation tools to produce approximately **50 lessons** (with potential for multiple languages later), each 10-15 minutes long.

The pipeline is:

- **Graph-based**: Nodes with dependencies that reference each other
- **Visual**: React Flow editor for designing and monitoring pipelines
- **PostgreSQL-backed**: Database storage with JSONB support for concurrent access and real-time updates
- **Composable**: Mix and match different video generation providers

## Architecture

### Core Components

1. **PostgreSQL Database**: Single source of truth for pipeline structure and execution state
2. **Visual Editor** (Next.js + React Flow): Design pipelines, edit nodes, monitor progress
3. **Execution Engine**: Scripts that execute nodes based on dependencies
4. **Code Screen Generator** (Remotion): Existing functionality, now a pipeline tool

```
┌────────────────────────────────────────────────────────────────┐
│                   PostgreSQL Database                           │
│  Tables: pipelines, nodes (with JSONB columns)                 │
│  - Structure: type, inputs, config (UI writes)                 │
│  - State: status, metadata, output (Executor writes)           │
└────────────────────────────────────────────────────────────────┘
                              ↕
        ┌─────────────────────┴─────────────────────┐
        ↓                                           ↓
┌──────────────────┐                      ┌──────────────────┐
│  Next.js App     │                      │ Execution Engine │
│                  │                      │  (CLI Scripts)   │
│  Server Comp:    │                      │                  │
│  • Read DB       │                      │  • Read DB       │
│  • Pass to UI    │                      │  • Execute nodes │
│                  │                      │  • Update status │
│  Server Actions: │                      └──────────────────┘
│  • createNode()  │
│  • connectNodes()│
│  • updateNode()  │
└──────────────────┘
```

---

## Data Storage: PostgreSQL

### Why PostgreSQL?

- ✅ **JSONB Support**: Native JSON columns with partial updates and indexing
- ✅ **Concurrency**: ACID transactions with MVCC handle simultaneous reads/writes
- ✅ **No conflicts**: UI edits structure, Executor edits state - different columns
- ✅ **Fast queries**: Indexed access on JSONB fields for status polling
- ✅ **Transactions**: Atomic multi-node updates
- ✅ **Scalable**: Connection pooling for concurrent Next.js requests

### Database Schema

```sql
-- Pipelines table
CREATE TABLE pipelines (
  id TEXT PRIMARY KEY,
  version TEXT NOT NULL DEFAULT '1.0',
  title TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  config JSONB NOT NULL,      -- { storage: {...}, workingDirectory: "..." }
  metadata JSONB NOT NULL     -- { totalCost, estimatedTotalCost, progress: {...} }
);

-- Nodes table
CREATE TABLE nodes (
  id TEXT NOT NULL,
  pipeline_id TEXT NOT NULL,

  -- Structure (editable by UI)
  type TEXT NOT NULL,        -- 'asset', 'render-code', 'talking-head', etc.
  inputs JSONB NOT NULL,     -- { "config": "code_config", "segments": ["a", "b"] }
  config JSONB NOT NULL,     -- { provider: "remotion", compositionId: "..." }
  asset JSONB,               -- For asset nodes: { source: "...", type: "..." }

  -- Execution state (editable by Executor only)
  status TEXT NOT NULL DEFAULT 'pending',  -- 'pending'|'in_progress'|'completed'|'failed'
  metadata JSONB,            -- { startedAt, completedAt, jobId, cost, retries }
  output JSONB,              -- { type, localFile, s3Key, duration, size }

  PRIMARY KEY (pipeline_id, id),
  FOREIGN KEY (pipeline_id) REFERENCES pipelines(id) ON DELETE CASCADE
);

CREATE INDEX idx_nodes_status ON nodes(pipeline_id, status);
CREATE INDEX idx_pipelines_updated ON pipelines(updated_at DESC);
```

### Data Example

```sql
-- Pipeline
INSERT INTO pipelines (id, version, title, config, metadata) VALUES (
  'example-pipeline',
  '1.0',
  'Example Pipeline',
  '{"storage":{"bucket":"jiki-videos","prefix":"lessons/example-pipeline/"},"workingDirectory":"./output"}'::jsonb,
  '{"totalCost":0,"estimatedTotalCost":0,"progress":{"completed":2,"in_progress":0,"pending":1,"failed":0,"total":3}}'::jsonb
);

-- Node
INSERT INTO nodes (id, pipeline_id, type, inputs, config, status) VALUES (
  'code_screen',
  'example-pipeline',
  'render-code',
  '{"config":"code_config"}'::jsonb,
  '{"provider":"remotion","compositionId":"code-scene"}'::jsonb,
  'pending'
);
```

---

## Atomic Database Operations

All UI interactions map to specific, granular database functions. These functions are defined in `lib/db-operations.ts` and wrapped by Server Actions in `app/pipelines/[id]/actions.ts`.

### Node Operations

**Create Node**

```typescript
createNode(pipelineId: string, node: {
  id: string;
  type: string;
  inputs: Record<string, string | string[]>;
  config: Record<string, unknown>;
  asset?: { source: string; type: string };
})
```

- Inserts a new node with `status: 'pending'`
- Updates pipeline timestamp
- Used when: User adds node via UI

**Update Node Config**

```typescript
updateNodeConfig(pipelineId: string, nodeId: string, configUpdates: Record<string, unknown>)
```

- Updates only changed keys in `config` JSONB using chained `jsonb_set()` calls
- **Partial update**: Only modifies specified config keys, preserves other config fields
- Preserves inputs, type, status columns entirely
- Used when: User edits node settings in EditorPanel

**Update Node Type**

```typescript
updateNodeType(pipelineId: string, nodeId: string, type: string)
```

- Changes node type (e.g., "heygen" → "elevenlabs")
- Used when: User changes provider dropdown

**Delete Node**

```typescript
deleteNode(pipelineId: string, nodeId: string)
```

- Removes node from database
- Cleans up references in other nodes' `inputs`
- Used when: User presses delete in React Flow

**Duplicate Node**

```typescript
duplicateNode(pipelineId: string, sourceNodeId: string, newNodeId: string)
```

- Copies node with new ID
- Preserves config but starts with `status: 'pending'`
- Used when: User duplicates node via context menu

### Edge Operations (Dependencies)

**Connect Nodes**

```typescript
connectNodes(
  pipelineId: string,
  sourceNodeId: string,
  targetNodeId: string,
  inputKey: string
)
```

- Sets `targetNode.inputs[inputKey] = sourceNodeId` using `jsonb_set(inputs, '{inputKey}', ...)`
- **Partial update**: Only updates the specified input key, preserves other inputs
- Used when: User drags edge from source to target in React Flow

**Connect to Array Input**

```typescript
connectNodesToArray(
  pipelineId: string,
  sourceNodeId: string,
  targetNodeId: string,
  inputKey: string
)
```

- Appends to `targetNode.inputs[inputKey][]` array using `jsonb_set(inputs, '{inputKey,-1}', ...)`
- **Partial update**: Only modifies the array, preserves other inputs
- Used for multi-input nodes (e.g., `merge-videos.segments[]`)
- Used when: User connects to "array" input handle

**Disconnect Nodes**

```typescript
disconnectNodes(pipelineId: string, targetNodeId: string, inputKey: string)
```

- Removes `targetNode.inputs[inputKey]` using `inputs - 'inputKey'` operator
- **Partial update**: Only removes the specified key, preserves other inputs
- Used when: User deletes edge in React Flow

### Pipeline Operations

**Update Pipeline Title**

```typescript
updatePipelineTitle(pipelineId: string, title: string)
```

- Updates pipeline name
- Used when: User edits title in header

**Update Pipeline Config**

```typescript
updatePipelineConfig(pipelineId: string, configUpdates: Record<string, unknown>)
```

- Updates only changed keys in `config` JSONB using chained `jsonb_set()` calls
- **Partial update**: Only modifies specified config keys (e.g., storage.bucket), preserves other config fields
- Used when: User edits pipeline settings

### Read Operations

**Get Pipeline**

```typescript
getPipeline(pipelineId: string): Pipeline
```

- Returns full pipeline row
- Used in: Server Component page load

**Get Nodes**

```typescript
getNodes(pipelineId: string): Node[]
```

- Returns all nodes for pipeline
- Used in: Server Component page load

**Get Node Statuses**

```typescript
getNodeStatuses(pipelineId: string): Array<{ id, status, metadata, output }>
```

- Returns only execution state (not structure)
- Used in: Status refresh during execution

**Get All Pipelines**

```typescript
getAllPipelines(): Pipeline[]
```

- Returns all pipelines sorted by `updated_at`
- Used in: Index page listing

### Design Principles

1. **Single Responsibility**: Each function does one thing
2. **Atomic**: All operations are transactional (PostgreSQL ACID)
3. **Preserves State**: Structure updates never touch execution state
4. **Partial Updates Only**: Use `jsonb_set()` to update only changed keys, never replace entire JSONB columns
5. **Clear Intent**: Function name describes exact operation
6. **Type Safe**: All parameters strongly typed

---

## JSONB Partial Update Strategy

All database operations use PostgreSQL's `jsonb_set()` to update **only the specific keys that changed**, never replacing entire JSONB columns. This is critical for concurrency safety and performance.

### Why Partial Updates Matter

**Concurrency**: Multiple processes can update different keys in the same JSONB column without conflicts.

**Performance**: Smaller updates = less data transfer, faster queries, smaller WAL (Write-Ahead Log).

**Data Integrity**: Preserves unchanged nested data that other processes may have written.

### jsonb_set() Syntax

```sql
jsonb_set(
  target JSONB,           -- The JSONB column to update
  path TEXT[],            -- JSON path as array: '{key}' or '{nested,key}'
  new_value JSONB,        -- New value (must be valid JSON)
  create_if_missing BOOL  -- Default true
)
```

### Common Update Patterns

**Update Single Top-Level Key:**

```sql
-- Update config.provider
UPDATE nodes
SET config = jsonb_set(config, '{provider}', '"heygen"')
WHERE pipeline_id = $1 AND id = $2;
```

**Update Nested Key:**

```sql
-- Update metadata.progress.completed
UPDATE pipelines
SET metadata = jsonb_set(metadata, '{progress,completed}', '5')
WHERE id = $1;
```

**Update Multiple Keys (Chain jsonb_set):**

```sql
-- Update metadata.startedAt AND metadata.jobId
UPDATE nodes
SET metadata = jsonb_set(
  jsonb_set(metadata, '{startedAt}', '"2025-10-13T10:00:00Z"'),
  '{jobId}', '"job_12345"'
)
WHERE pipeline_id = $1 AND id = $2;
```

**Append to Array:**

```sql
-- Add node ID to inputs.segments array
UPDATE nodes
SET inputs = jsonb_set(
  inputs,
  '{segments,-1}',  -- -1 means "after last element"
  '"new_node_id"'
)
WHERE pipeline_id = $1 AND id = $2;
```

**Remove Key (Use jsonb_set with NULL, then filter):**

```sql
-- Remove input key (for disconnecting nodes)
UPDATE nodes
SET inputs = inputs - 'scriptId'  -- PostgreSQL operator for key removal
WHERE pipeline_id = $1 AND id = $2;
```

**Conditional Update (Using COALESCE for defaults):**

```sql
-- Increment cost, default to 0 if null
UPDATE pipelines
SET metadata = jsonb_set(
  metadata,
  '{totalCost}',
  to_jsonb(COALESCE((metadata->>'totalCost')::numeric, 0) + 50)
)
WHERE id = $1;
```

### Implementation Examples

**connectNodes() - Update single input key:**

```typescript
export async function connectNodes(pipelineId: string, sourceNodeId: string, targetNodeId: string, inputKey: string) {
  await pool.query(
    `
    UPDATE nodes
    SET inputs = jsonb_set(inputs, $1, to_jsonb($2::text))
    WHERE pipeline_id = $3 AND id = $4
  `,
    [
      `{${inputKey}}`, // Path as string (pg driver converts to array)
      sourceNodeId,
      pipelineId,
      targetNodeId
    ]
  );
}
```

**updateNodeConfig() - Update only changed config keys:**

```typescript
export async function updateNodeConfig(pipelineId: string, nodeId: string, configUpdates: Record<string, unknown>) {
  // Build chained jsonb_set calls for each key
  const keys = Object.keys(configUpdates);
  let setClause = "config";

  keys.forEach((key, index) => {
    setClause = `jsonb_set(${setClause}, '{${key}}', $${index + 3})`;
  });

  const values = keys.map((key) => JSON.stringify(configUpdates[key]));

  await pool.query(
    `
    UPDATE nodes
    SET config = ${setClause}
    WHERE pipeline_id = $1 AND id = $2
  `,
    [pipelineId, nodeId, ...values]
  );
}
```

**Executor - Update metadata fields:**

```typescript
export async function setNodeExecutionStart(pipelineId: string, nodeId: string, jobId: string) {
  await pool.query(
    `
    UPDATE nodes
    SET
      status = 'in_progress',
      metadata = jsonb_set(
        jsonb_set(metadata, '{startedAt}', to_jsonb(NOW())),
        '{jobId}', to_jsonb($3::text)
      )
    WHERE pipeline_id = $1 AND id = $2
  `,
    [pipelineId, nodeId, jobId]
  );
}
```

### Safety Checklist

✅ **DO:**

- Use `jsonb_set()` for all JSONB column updates
- Chain multiple `jsonb_set()` calls for multiple keys
- Use `to_jsonb()` to convert values to JSON
- Use `-` operator to remove keys
- Test that unchanged keys are preserved

❌ **DON'T:**

- Never: `SET config = '{"provider": "heygen"}'::jsonb` (replaces entire object)
- Never: `SET metadata = to_jsonb($1)` with full object (loses other keys)
- Never: Read-modify-write without transaction for same column

### Performance Notes

- `jsonb_set()` is fast: O(log n) for nested access
- Indexes work with partial updates (GIN indexes on JSONB paths)
- Multiple chained `jsonb_set()` calls are still more efficient than full replacement
- PostgreSQL's MVCC handles concurrent partial updates to different keys seamlessly

---

## Concurrency Strategy

### Field-Level Separation

**UI Edits (Structure):**

- `type`, `inputs`, `config`, `asset`
- Never touches: `status`, `metadata`, `output`

**Executor Edits (State):**

- `status`, `metadata`, `output`
- Never touches: `type`, `inputs`, `config`, `asset`

### Update Operations

All JSONB column updates use **partial updates** via `jsonb_set()` to preserve unchanged keys:

```sql
-- UI Update (structure only) - Update single input key
UPDATE nodes
SET inputs = jsonb_set(inputs, '{scriptId}', '"new_script_node"')
WHERE pipeline_id = $1 AND id = $2;

-- UI Update - Update nested config value
UPDATE nodes
SET config = jsonb_set(config, '{provider}', '"heygen"')
WHERE pipeline_id = $1 AND id = $2;

-- Executor Update (state only) - Update nested metadata
UPDATE nodes
SET metadata = jsonb_set(
  jsonb_set(metadata, '{startedAt}', '"2025-10-13T10:00:00Z"'),
  '{jobId}', '"job_12345"'
)
WHERE pipeline_id = $1 AND id = $2;

-- Executor Update - Update nested progress counter
UPDATE pipelines
SET metadata = jsonb_set(metadata, '{progress,completed}', '5')
WHERE id = $1;
```

**Safety Rules:**

- ❌ Never: `SET config = '{"provider": "heygen"}'` (replaces entire object)
- ✅ Always: `SET config = jsonb_set(config, '{provider}', '"heygen"')` (updates single key)
- This prevents race conditions and preserves unchanged nested data

### Real-time Updates

The UI refreshes status changes using Next.js router refresh:

```typescript
// Client Component
"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function StatusPoller() {
  const router = useRouter();

  useEffect(() => {
    // Refresh every 2 seconds while pipeline is running
    const interval = setInterval(() => {
      router.refresh(); // Re-runs Server Component, fetches latest from DB
    }, 2000);

    return () => clearInterval(interval);
  }, [router]);

  return null;
}
```

The Server Component re-fetches on each refresh:

```typescript
// Server Component (page.tsx)
export default async function PipelinePage({ params }) {
  const { id } = await params;

  // Fresh data on every render
  const pipeline = db.getPipeline(id);
  const nodes = db.getNodes(id);

  return <PipelineEditor pipeline={pipeline} nodes={nodes} />;
}
```

---

## Visual Editor (Next.js + React Flow)

### Tech Stack

- **Next.js 15** with Turbopack (App Router)
- **React Flow 11+** (visual graph editor)
- **TypeScript** (type safety)
- **Tailwind CSS 4** (styling)
- **PostgreSQL** (database with JSONB support)
- **pg** (PostgreSQL client with connection pooling)
- **dagre** (auto-layout algorithm for left-to-right graphs)

### Layout

```
┌─────────────────────────────────────────┬──────────────────┐
│ ← Back          Pipeline Name           │                  │
├─────────────────────────────────────────┼──────────────────┤
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
│                                         │                  │
├─────────────────────────────────────────┴──────────────────┤
│ [▶️ Run Pipeline] [Validate]         Status: Ready         │
└──────────────────────────────────────────────────────────────┘
```

### Features

**Node Visualization:**

- Custom components per node type with status-based styling
- Color-coded borders:
  - Pending: Gray
  - In Progress: Blue (animated pulse)
  - Completed: Green
  - Failed: Red
- Display: node ID, type, provider, duration, cost
- Connection handles (input left, output right)

**Editor Panel:**

- Opens when clicking a node
- Dynamic forms based on node type
- Edit inputs, config
- View metadata, output (read-only)
- Actions: Save, Delete, Duplicate

**Canvas Controls:**

- Drag nodes to reposition
- Drag edges to reconnect
- Zoom/pan with mouse/trackpad
- Auto-layout with dagre (left-to-right)

---

## Project Structure

```
code-videos/
├── PIPELINE-PLAN.md            # This document
├── README.md
├── package.json
├── .env                        # DATABASE_URL (gitignored)
├── remotion.config.ts
├── tailwind.config.js
├── postcss.config.mjs
│
├── src/                        # Existing Remotion code screen generator
│   ├── Root.tsx
│   ├── compositions/
│   ├── components/
│   ├── lib/
│   └── assets/
│
├── scenes/                     # Remotion example scenes
│
├── scripts/                    # Remotion render scripts + DB utilities
│   ├── render.ts
│   ├── renderAll.ts
│   ├── db-init.ts              # Initialize database schema
│   └── db-seed.ts              # Seed database with JSON lessons
│
├── app/                        # Next.js visual editor
│   ├── layout.tsx
│   ├── globals.css
│   ├── page.tsx                # Index: list all pipelines
│   └── pipelines/
│       └── [id]/
│           ├── page.tsx        # Main editor (Server Component, loads from DB)
│           ├── actions.ts      # Server Actions (wrap db-operations)
│           └── components/
│               ├── PipelineHeader.tsx
│               ├── PipelineFooter.tsx
│               ├── PipelineEditor.tsx  # Client Component (React Flow)
│               └── EditorPanel.tsx
│
├── lib/
│   ├── db.ts                   # PostgreSQL connection pool
│   ├── db-migrations.ts        # Schema creation
│   ├── db-operations.ts        # Atomic DB operations (createNode, connectNodes, etc.)
│   ├── types.ts                # Database type definitions
│   └── nodes/
│       ├── types.ts            # Type-safe node discriminated unions
│       └── factory.ts          # DB ↔ Node conversion functions
│
├── test/                       # Test infrastructure
│   ├── setup.ts                # Global test setup with transaction support
│   ├── helpers/
│   │   └── db.ts               # Test database helpers
│   ├── factories/              # FactoryBot-style database factories
│   │   ├── pipelines.ts        # Pipeline factories
│   │   └── nodes.ts            # Node factories (all 8 types)
│   ├── mocks/                  # In-memory mock factories
│   │   ├── pipelines.ts        # Mock pipelines
│   │   └── nodes.ts            # Mock nodes
│   └── lib/
│       └── nodes/
│           └── factory.test.ts # Node factory tests
│
├── pipeline/                   # Execution engine (future)
│   ├── types/
│   │   └── pipeline.ts
│   ├── scripts/
│   │   ├── run-pipeline.ts
│   │   └── run-node.ts
│   ├── lib/
│   │   ├── executors/
│   │   ├── providers/
│   │   └── state.ts            # DB update functions
│   └── config/
│
├── lessons/                    # Asset storage only
│   └── lesson-001/
│       ├── scripts/
│       ├── prompts/
│       ├── code/
│       └── output/
│
└── shared/
    └── assets/
```

---

## Node Types & Input System

### Node Types Overview

| Type                 | Description                  | Example Providers  | Max Inputs              |
| -------------------- | ---------------------------- | ------------------ | ----------------------- |
| `asset`              | Static file reference        | local filesystem   | 0                       |
| `talking-head`       | Human presenter video        | heygen             | 1 (script)              |
| `generate-animation` | Animated character scenes    | veo3, runway       | 2 (prompt, ref image)   |
| `generate-voiceover` | Text-to-speech audio         | elevenlabs, heygen | 1 (script)              |
| `render-code`        | Animated code screens        | remotion           | 1 (config)              |
| `mix-audio`          | Replace/overlay audio tracks | ffmpeg             | 2 (video, audio)        |
| `merge-videos`       | Concatenate video segments   | ffmpeg             | -1 (unlimited segments) |
| `compose-video`      | Picture-in-picture, overlays | ffmpeg             | 2 (background, overlay) |

### Input System Architecture

**All inputs are arrays** to support multiple connections where allowed:

```typescript
inputs: {
  script?: string[];      // Array, but maxConnections=1
  segments?: string[];    // Array, maxConnections=-1 (unlimited)
}
```

### Input Configuration Metadata

Each node type defines its input specifications:

```typescript
// lib/nodes/metadata.ts
export interface InputConfig {
  maxConnections: number; // -1 = unlimited, 0 = no inputs, 1+ = specific limit
  ordered: boolean; // true = order matters (e.g., video segments)
  label: string; // Display name for the input
  required: boolean; // true = must have at least 1 connection
}

export const NODE_INPUT_CONFIG: Record<NodeType, Record<string, InputConfig>> = {
  asset: {}, // No inputs

  "talking-head": {
    script: {
      maxConnections: 1,
      ordered: false,
      label: "Script",
      required: false
    }
  },

  "render-code": {
    config: {
      maxConnections: 1,
      ordered: false,
      label: "Config",
      required: true
    }
  },

  "mix-audio": {
    video: {
      maxConnections: 1,
      ordered: false,
      label: "Video",
      required: true
    },
    audio: {
      maxConnections: 1,
      ordered: false,
      label: "Audio",
      required: true
    }
  },

  "merge-videos": {
    segments: {
      maxConnections: -1, // Unlimited
      ordered: true, // Order determines sequence
      label: "Video Segments",
      required: true
    }
  }

  // ... etc for all 8 node types
};
```

### Visual Representation

**Single-value inputs** (maxConnections=1):

- Render one connection handle per input
- Handle labeled with input name
- React Flow prevents multiple connections

**Array inputs** (maxConnections=-1):

- Render one connection handle
- Visual indicator (like "+" icon) shows unlimited connections
- Order preserved in array
- EditorPanel shows ordered list with drag-to-reorder (Phase 4)

**Example node rendering:**

```
┌─────────────────┐
│  mix-audio      │
│                 │
│ video  ●────    │  ← Single connection handle
│ audio  ●────    │  ← Single connection handle
│                 │
│         ────● output
└─────────────────┘

┌─────────────────┐
│  merge-videos   │
│                 │
│ segments+ ●───  │  ← Unlimited connections handle
│                 │
│         ────● output
└─────────────────┘
```

### Connection Validation

React Flow's `isValidConnection` callback checks:

1. Does the input exist for this node type?
2. Has the max connection limit been reached?
3. Is the connection creating a cycle? (future enhancement)

### Input Reordering (Phase 4)

For `ordered: true` inputs like `merge-videos.segments`:

- EditorPanel shows ordered list of connected nodes
- Drag-and-drop to reorder
- Server Action `reorderInputsAction()` updates database
- For Phase 3: Order determined by connection order (simple)

---

## Implementation Status

### ✅ Completed

#### Phase 1: Foundation

- [x] Next.js 15 app with App Router and Turbopack
- [x] Tailwind CSS 4 configuration
- [x] Page layout with header, footer, split panels
- [x] Component structure (Header, Footer, FlowCanvas, EditorPanel)
- [x] Index page for listing pipelines
- [x] Pipeline show page with JSON display
- [x] Example pipeline JSON (migrated to DB)

#### Phase 2: PostgreSQL Integration & Type System

- [x] Install `pg` and `@types/pg`
- [x] Create database schema and migrations
- [x] Set up DB connection pool
- [x] Create atomic DB operation functions (createNode, deleteNode, connectNodes)
- [x] Seed script to load JSON lessons into database (for development/testing)
- [x] Create type-safe node discriminated unions (AssetNode, TalkingHeadNode, etc.)
- [x] Implement DB ↔ Node conversion functions (nodeFromDB, nodeToDB)
- [x] Set up comprehensive test infrastructure with Vitest + pg-transactional-tests
- [x] Create FactoryBot-style database factories for testing
- [x] Create in-memory mock factories for unit tests
- [x] Refactor connectNodes() for array-based input system

#### Phase 3: React Flow Visualization

- [x] Install `reactflow` and `dagre`
- [x] Create Server Actions wrapping atomic DB operations
- [x] Update PipelineEditor with React Flow (Client Component)
- [x] Create custom node components for each node type (8 total: Asset, TalkingHead, RenderCode, GenerateAnimation, GenerateVoiceover, MixAudio, MergeVideos, ComposeVideo)
- [x] Implement auto-layout with dagre
- [x] Add node selection handler
- [x] Update EditorPanel with selected node form
- [x] Wire up React Flow callbacks to Server Actions (onConnect, onNodeDelete, etc.)

#### Phase 3.5: Input System Refactoring

- [x] Migrate all node inputs to array format (string → string[])
- [x] Implement metadata-driven connection validation
- [x] Add dynamic handle generation from metadata
- [x] Prevent duplicate connections
- [x] Visual indicators for unlimited vs limited inputs (darker green for unlimited)
- [x] Create database migration script (pnpm db:migrate-inputs)
- [x] Full TypeScript type safety with discriminated unions
- [x] Update test factories and mocks for array inputs

#### Phase 4: Interactive UI & State Management

- [x] Implement optimistic updates for instant UI feedback
- [x] Add loading states during Server Action calls (saving indicator)
- [x] Add manual refresh button for status updates
- [x] Handle Server Action errors with rollback to previous state

### 🚧 In Progress

#### Phase 4 (Remaining Items)

- [ ] Implement periodic status refresh with router.refresh() (polling)
- [ ] Add toast notifications for successful operations (currently using browser alerts)

### 📋 Planned

#### Phase 5: Execution Engine

- [ ] Dependency graph resolver
- [ ] Base executor framework
- [ ] Node executors (asset, render-code, merge-videos)
- [ ] CLI scripts (run-pipeline, run-node)
- [ ] Status update functions (write to DB)

#### Phase 6: Provider Integrations

- [ ] FFmpeg wrapper
- [ ] Remotion wrapper
- [ ] HeyGen API
- [ ] Veo 3 API
- [ ] ElevenLabs API

---

## Technical Decisions

### Why PostgreSQL?

**JSONB Support**: Native JSON columns allow partial updates (`jsonb_set()`), querying nested fields, and indexing on JSON paths without deserializing.

**Concurrency**: MVCC (Multi-Version Concurrency Control) handles simultaneous UI + Executor writes without conflicts. Connection pooling for parallel Next.js Server Actions.

**Performance**: Fast indexed queries on JSONB fields. GIN indexes on JSON paths for complex queries. Single transaction for multi-node updates.

**Scalability**: Handles thousands of concurrent connections. Suitable for production deployment with managed services (Supabase, Neon, Railway).

### Why Separate Structure and State?

UI edits pipeline **structure** (nodes, edges, config).
Executor edits **execution state** (status, metadata, output).

By separating at the column level, they never conflict. UI updates preserve execution state from DB. Executor updates never touch structure.

### Why React Flow?

Purpose-built for visual graphs with:

- Auto-layout algorithms (dagre)
- Custom node rendering
- Built-in zoom/pan/minimap
- Edge routing
- Node dragging
- Interactive editing

### Why Server Actions (Not API Routes)?

**Direct Database Access**: Server Actions run in Node.js context, allowing async PostgreSQL calls without Edge Runtime restrictions.

**Simplified Architecture**: No API layer needed. Functions colocated with pages that use them in `actions.ts` files.

**Type Safety**: Server Actions share types with client components. Parameters and return values are automatically serialized.

**Better DX**: Client code looks like local function calls. No fetch boilerplate, no manual error handling, no URL construction.

**Automatic Revalidation**: `revalidatePath()` triggers Server Component refresh automatically. No manual cache invalidation.

**Progressive Enhancement**: Forms can work without JavaScript (though React Flow requires JS).

### Why Atomic Operations (Not Converters)?

**Granular Updates**: Each UI action updates only what changed. No need to serialize/deserialize entire graph.

**Clear Intent**: `connectNodes()` is self-documenting. A generic converter obscures the actual operation.

**Preserves State**: Partial updates automatically preserve execution state. Converters risk overwriting status/metadata.

**Type Safety**: Each function has specific parameters. Converters require complex union types for all possible changes.

**Debuggability**: Stack traces point to exact operations. Converters hide the actual modification in generic logic.

### Why Discriminated Union Types (Not Loaders/Parsers)?

**Type Safety**: TypeScript can narrow types based on the `type` field, providing compile-time safety for node-specific operations.

**No Runtime Overhead**: Type discrimination happens at compile time. No classes, no instanceof checks, just plain objects.

**Serialization-Friendly**: Plain objects serialize/deserialize trivially to/from JSON and database JSONB columns.

**Immutable Updates**: Spread operators work naturally with plain objects, making React state updates simple and predictable.

**Factory Pattern**: Conversion functions (nodeFromDB/nodeToDB) handle the mapping between database snake_case and domain camelCase, keeping business logic separate from persistence.

**Testing**: Mock factories create in-memory objects instantly. Database factories create actual DB records with sensible defaults (FactoryBot pattern).

### Why Manual Save (Not Auto-save)?

Gives users control over when changes are persisted. Clear "unsaved changes" indicator. Can experiment without committing. Fits deliberate pipeline editing workflow better than rapid typing.

---

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm
- PostgreSQL 14+ (local or hosted)

### Setup

```bash
# Install dependencies
pnpm install

# Create .env file with DATABASE_URL
echo "DATABASE_URL=postgresql://localhost:5432/jiki_video_pipelines" > .env

# Create database (if not exists)
createdb jiki_video_pipelines

# Initialize database schema
pnpm db:init

# Seed with example data
pnpm db:seed

# Start dev server (port 3065)
pnpm dev
```

### Development

```bash
# Visual editor
http://localhost:3065

# List pipelines
http://localhost:3065/

# Edit pipeline
http://localhost:3065/pipelines/example-pipeline
```

### Database Seeding

The seed script (`pnpm db:seed`) loads JSON lesson configurations into the database for development and testing purposes.

**Purpose:**

- Quickly populate database with example pipelines
- Test with realistic lesson data
- Reset database to known state during development
- Prototype new node types and configurations

**Seed Data Location:**

```
lessons/
├── lesson-001/
│   └── pipeline.json         # Pipeline definition with nodes
├── lesson-002/
│   └── pipeline.json
└── ...
```

**JSON Format:**

```json
{
  "id": "lesson-001",
  "title": "Introduction to Variables",
  "version": "1.0",
  "config": {
    "storage": {
      "bucket": "jiki-videos",
      "prefix": "lessons/lesson-001/"
    },
    "workingDirectory": "./lessons/lesson-001/output"
  },
  "nodes": [
    {
      "id": "intro_script",
      "type": "asset",
      "asset": {
        "source": "./lessons/lesson-001/scripts/intro.md",
        "type": "text"
      },
      "config": {}
    },
    {
      "id": "intro_video",
      "type": "talking-head",
      "inputs": {
        "script": "intro_script"
      },
      "config": {
        "provider": "heygen",
        "avatarId": "instructor-1"
      }
    },
    {
      "id": "code_config",
      "type": "asset",
      "asset": {
        "source": "./lessons/lesson-001/code/variables.json",
        "type": "json"
      },
      "config": {}
    },
    {
      "id": "code_screen",
      "type": "render-code",
      "inputs": {
        "config": "code_config"
      },
      "config": {
        "provider": "remotion",
        "compositionId": "code-scene"
      }
    },
    {
      "id": "final_video",
      "type": "merge-videos",
      "inputs": {
        "segments": ["intro_video", "code_screen"]
      },
      "config": {
        "provider": "ffmpeg",
        "transitions": "fade"
      }
    }
  ]
}
```

**Script Behavior:**

1. Scans `lessons/` directory for `pipeline.json` files
2. Validates JSON schema
3. Inserts/updates pipelines in database
4. Creates all nodes with `pending` status
5. Reports success/failures

**Usage:**

```bash
# Seed all lessons
pnpm db:seed

# Seed specific lesson
pnpm db:seed -- lesson-001

# Clear and reseed (development reset)
pnpm db:reset
```

---

This pipeline system provides a production-ready framework for generating educational videos at scale, with concurrent access, real-time updates, and visual control.
