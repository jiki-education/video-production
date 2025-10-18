# TypeScript Integration Plan - code-videos

**Goal**: Integrate TypeScript types generated from Rails API INPUT_SCHEMAS to ensure type safety between frontend and backend.

**Status**: Ready for implementation
**Estimated Time**: 2-3 hours
**Dependencies**: Requires API repo changes (see API_CHANGES.md)

---

## Overview

This plan adds TypeScript type generation from the Rails API, ensuring the `code-videos` frontend stays in sync with backend schemas. Types will be generated during CI and referenced via `file:` dependency to `../api/typescript`.

---

## Changes Required

### 1. Update package.json Dependencies

**File**: `package.json`

Add dependency to API-generated types package:

```json
{
  "dependencies": {
    "@jiki/api-types": "file:../api/typescript"
  }
}
```

**Why**: Uses pnpm's `file:` protocol to symlink to generated types in API repo.

---

### 2. Update TypeScript Node Types

**File**: `lib/nodes/types.ts`

Replace current type definitions with imports from `@jiki/api-types`:

```typescript
/**
 * Type-Safe Node Discriminated Unions
 *
 * These types are auto-generated from Rails API INPUT_SCHEMAS
 * Source of truth: api/lib/video_production/input_schemas.rb
 *
 * To update types:
 * 1. cd ../api
 * 2. bundle exec rake typescript:generate
 * 3. cd ../code-videos
 * 4. pnpm install (if new types added)
 */

import type { NodeStatus, NodeMetadata, NodeOutput, AssetConfig } from "@/lib/types";

// Import generated input types from API
import type {
  AssetInputs,
  TalkingHeadInputs,
  GenerateAnimationInputs,
  GenerateVoiceoverInputs,
  RenderCodeInputs,
  MixAudioInputs,
  MergeVideosInputs,
  ComposeVideoInputs
} from "@jiki/api-types";

// ============================================================================
// Base Node Interface
// ============================================================================

interface BaseNode {
  id: string;
  pipelineId: string;
  title: string;
  status: NodeStatus;
  metadata: NodeMetadata | null;
  output: NodeOutput | null;
}

// ============================================================================
// Specific Node Types (using generated inputs)
// ============================================================================

export interface AssetNode extends BaseNode {
  type: "asset";
  inputs: AssetInputs;
  config: Record<string, unknown>;
  asset: AssetConfig;
}

export interface TalkingHeadNode extends BaseNode {
  type: "talking-head";
  inputs: TalkingHeadInputs;
  config: {
    provider: string;
    avatarId?: string;
    voice?: string;
    [key: string]: unknown;
  };
}

export interface GenerateAnimationNode extends BaseNode {
  type: "generate-animation";
  inputs: GenerateAnimationInputs;
  config: {
    provider: string;
    duration?: number;
    aspectRatio?: string;
    [key: string]: unknown;
  };
}

export interface GenerateVoiceoverNode extends BaseNode {
  type: "generate-voiceover";
  inputs: GenerateVoiceoverInputs;
  config: {
    provider: string;
    voice?: string;
    speed?: number;
    [key: string]: unknown;
  };
}

export interface RenderCodeNode extends BaseNode {
  type: "render-code";
  inputs: RenderCodeInputs;
  config: {
    provider: string;
    compositionId?: string;
    [key: string]: unknown;
  };
}

export interface MixAudioNode extends BaseNode {
  type: "mix-audio";
  inputs: MixAudioInputs;
  config: {
    provider: string;
    mode?: "replace" | "overlay";
    volume?: number;
    [key: string]: unknown;
  };
}

export interface MergeVideosNode extends BaseNode {
  type: "merge-videos";
  inputs: MergeVideosInputs;
  config: {
    provider: string;
    transitions?: string;
    [key: string]: unknown;
  };
}

export interface ComposeVideoNode extends BaseNode {
  type: "compose-video";
  inputs: ComposeVideoInputs;
  config: {
    provider: string;
    position?: string;
    scale?: number;
    [key: string]: unknown;
  };
}

// ============================================================================
// Discriminated Union (unchanged)
// ============================================================================

export type Node =
  | AssetNode
  | TalkingHeadNode
  | GenerateAnimationNode
  | GenerateVoiceoverNode
  | RenderCodeNode
  | MixAudioNode
  | MergeVideosNode
  | ComposeVideoNode;

export type NodeType = Node["type"];

// ============================================================================
// Type Guards (unchanged)
// ============================================================================

export function isAssetNode(node: Node): node is AssetNode {
  return node.type === "asset";
}

export function isTalkingHeadNode(node: Node): node is TalkingHeadNode {
  return node.type === "talking-head";
}

export function isGenerateAnimationNode(node: Node): node is GenerateAnimationNode {
  return node.type === "generate-animation";
}

export function isGenerateVoiceoverNode(node: Node): node is GenerateVoiceoverNode {
  return node.type === "generate-voiceover";
}

export function isRenderCodeNode(node: Node): node is RenderCodeNode {
  return node.type === "render-code";
}

export function isMixAudioNode(node: Node): node is MixAudioNode {
  return node.type === "mix-audio";
}

export function isMergeVideosNode(node: Node): node is MergeVideosNode {
  return node.type === "merge-videos";
}

export function isComposeVideoNode(node: Node): node is ComposeVideoNode {
  return node.type === "compose-video";
}
```

**Key Changes**:

- Import input types from `@jiki/api-types` (generated package)
- Replace hardcoded input type definitions with generated imports
- Keep config types (not auto-generated yet)
- Keep discriminated union and type guards (frontend-specific)

---

### 3. Add CI Workflow for Type Generation

**File**: `.github/workflows/ci.yml`

Create new workflow file:

```yaml
name: CI

on:
  push:
    branches: [main, migrate_to_api]
  pull_request:
    branches: [main, migrate_to_api]

jobs:
  typecheck-and-test:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout code-videos
        uses: actions/checkout@v4
        with:
          path: code-videos

      - name: Checkout API repo (main branch)
        uses: actions/checkout@v4
        with:
          repository: jiki-education/jiki
          ref: main
          path: api
          token: ${{ secrets.GITHUB_TOKEN }}

      - name: Setup Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: "3.3"
          bundler-cache: true
          working-directory: api

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: "20"

      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 10

      - name: Generate TypeScript types from API schemas
        run: |
          cd api
          bundle exec rake typescript:generate

      - name: Install dependencies
        run: |
          cd code-videos
          pnpm install

      - name: TypeScript type check
        run: |
          cd code-videos
          pnpm typecheck

      - name: Run unit tests
        run: |
          cd code-videos
          pnpm test:run

      - name: Setup test database
        run: |
          cd code-videos
          pnpm test:setup

      - name: Run E2E tests
        run: |
          cd code-videos
          pnpm test:e2e
```

**Why**:

- Generates types from API `main` branch on every PR
- Catches breaking schema changes early
- Ensures types are always in sync

---

### 4. Update Local Development Documentation

**File**: `README.md`

Add section on TypeScript integration:

````markdown
## TypeScript Type Generation

This project uses TypeScript types auto-generated from the Rails API schemas.

### Prerequisites

You must have the `api` repo checked out as a sibling directory:

```bash
cd ~/Code/jiki
git clone git@github.com:jiki-education/jiki.git api
git clone git@github.com:jiki-education/code-videos.git
```
````

### Initial Setup

```bash
cd code-videos
pnpm install  # Creates symlink to ../api/typescript
```

### When API Schemas Change

If you pull changes from the API repo that modify INPUT_SCHEMAS:

```bash
cd ../api
bundle exec rake typescript:generate

cd ../code-videos
pnpm typecheck  # Verify types still work
```

### Troubleshooting

**Error: Cannot find module '@jiki/api-types'**

1. Ensure API repo exists at `../api`
2. Generate types: `cd ../api && bundle exec rake typescript:generate`
3. Reinstall: `pnpm install`

**Type errors after API schema changes**

This is expected! The API schema is the source of truth. Update your code to match the new types.

````

---

### 5. Add .gitignore Entries

**File**: `.gitignore`

Add entries to ignore symlinked types:

```gitignore
# TypeScript generated types (from API repo)
node_modules/@jiki/api-types
````

**Why**: The types are generated, not committed to this repo.

---

## Testing Plan

### 1. Local Testing

```bash
# Generate types from API
cd ../api
bundle exec rake typescript:generate

# Install dependencies (creates symlink)
cd ../code-videos
pnpm install

# Verify types work
pnpm typecheck

# Run tests
pnpm test:run
pnpm test:e2e
```

### 2. CI Testing

Create a test PR with these changes and verify:

- [ ] CI successfully checks out both repos
- [ ] Types are generated without errors
- [ ] TypeScript compilation succeeds
- [ ] All tests pass
- [ ] No type errors in node components

### 3. Schema Change Testing

Make a breaking change to API INPUT_SCHEMAS and verify:

- [ ] CI fails on code-videos PR
- [ ] Type errors clearly show what changed
- [ ] After fixing types, CI passes

---

## Rollout Plan

### Phase 1: Add Type Generation (Week 1)

1. Merge API changes (see API_CHANGES.md)
2. Test type generation locally
3. Create PR in code-videos with this integration
4. Verify CI works correctly

### Phase 2: Update Node Components (Week 1-2)

1. Review all node components for type compliance
2. Fix any type mismatches revealed by generated types
3. Add tests for input validation
4. Update factories to use correct input types

### Phase 3: Monitor (Week 2-3)

1. Watch for CI failures due to schema drift
2. Document any issues with the integration
3. Improve error messages if needed

---

## Benefits

✅ **Single source of truth**: Rails INPUT_SCHEMAS define all input types
✅ **Type safety**: Frontend can't use wrong input structures
✅ **CI enforcement**: Breaking changes detected immediately
✅ **No manual sync**: Types auto-generate from schemas
✅ **Clear errors**: TypeScript errors show exactly what's wrong

---

## Rollback Plan

If issues arise:

1. Remove `"@jiki/api-types": "file:../api/typescript"` from package.json
2. Restore original `lib/nodes/types.ts` from git
3. Run `pnpm install`
4. Remove CI workflow changes

No data loss - this is purely a type safety enhancement.

---

## Questions & Answers

**Q: What if I don't have the API repo locally?**
A: The app will fail to install. You need the API repo as a sibling directory.

**Q: Can I work offline without the API repo?**
A: No, the types are required. Consider committing a snapshot of generated types for offline work.

**Q: What happens when API schemas change?**
A: You'll see TypeScript errors. This is intentional - it forces you to update the frontend to match the API.

**Q: Can we publish to npm instead?**
A: Yes, but `file:` dependency is simpler for development. We can switch to npm publishing later if needed.

---

## Related Documents

- `API_CHANGES.md` - Changes needed in API repo
- `MIGRATE_TO_API.md` - Overall migration plan
- `lib/nodes/types.ts` - Node type definitions
