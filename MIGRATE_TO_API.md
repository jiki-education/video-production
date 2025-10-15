# Migration Plan: Move Execution to Rails API

## Overview

This document outlines the plan to migrate from the current Next.js-only architecture to a Rails API-orchestrated architecture for video production pipeline execution.

### Current Architecture (Before Migration)

```
┌────────────────────────────────────────────────┐
│        Next.js App (code-videos repo)          │
│                                                │
│  • Visual pipeline editor (React Flow)         │
│  • Server Components (read DB)                 │
│  • Server Actions (write DB)                   │
│  • Execution engine (pipeline/ directory)      │
│  • Direct DB updates for status/metadata       │
└────────────────┬───────────────────────────────┘
                 │
                 ↓
        ┌────────────────┐
        │   PostgreSQL   │
        └────────────────┘
```

### Target Architecture (After Migration)

```
┌────────────────────────────────────────────────┐
│        Next.js App (code-videos repo)          │
│                                                │
│  • Visual pipeline editor (React Flow)         │
│  • Server Components (read DB)                 │
│  • Server Actions (ONLY structure updates)     │
│  • Calls Rails API for execution               │
└────────────────┬───────────────────────────────┘
                 │
                 │ POST /v1/video_production/.../execute
                 │ GET  /v1/video_production/.../status
                 ↓
        ┌────────────────┐
        │   Rails API    │
        │   (../api)     │
        │                │
        │  • Sidekiq jobs│
        │  • Lambda      │
        │  • External APIs│
        └────────┬───────┘
                 │
                 ↓
        ┌────────────────┐
        │   PostgreSQL   │
        │   (shared)     │
        └────────────────┘
```

---

## What Stays in This Repo

### Keep (No Changes)

1. **Next.js Visual Editor** (`app/pipelines/[id]/`)
   - React Flow pipeline designer
   - EditorPanel for node configuration
   - FlowCanvas for visual graph
   - All UI components

2. **Remotion Code Generator** (`src/`)
   - AnimatedCode component
   - Timing calculations
   - Scene configurations
   - Rendering scripts (`scripts/render.ts`, `scripts/renderAll.ts`)

3. **Database Read Operations**
   - Server Components reading pipelines and nodes
   - Display of status, metadata, output

4. **Structure Update Server Actions**
   - `createNodeAction()`
   - `deleteNodeAction()`
   - `connectNodesAction()`
   - `reorderInputsAction()`
   - These continue to update `type`, `inputs`, `config`, `asset`, `title`

5. **Database Operations Library** (`lib/db-operations.ts`)
   - Keep for Next.js to update structure
   - Used by Server Actions for CRUD on nodes/pipelines

6. **Testing Infrastructure** (`test/`)
   - Keep all tests for visual editor
   - Update e2e tests to mock Rails API calls instead of local execution

---

## What Moves to Rails API

### Remove from This Repo

1. **Execution Engine** (`pipeline/` directory)
   - `pipeline/scripts/execute-node.ts` → Rails command
   - `pipeline/lib/executors/merge-videos.ts` → Rails executor
   - `pipeline/lib/db-executors.ts` → Rails DB update methods
   - `pipeline/lib/storage/s3.ts` → Rails S3 integration
   - `pipeline/lib/ffmpeg/merge.ts` → Lambda function

2. **Execution-Related Database Operations**
   - `setNodeStarted()` → Rails partial update
   - `setNodeCompleted()` → Rails partial update
   - `setNodeFailed()` → Rails partial update

3. **AWS SDK Dependencies**
   - `@aws-sdk/client-s3`
   - `@aws-sdk/lib-storage`
   - These move to Rails Gemfile

---

## Database Migration Strategy

### Shared Database Approach

**Both apps connect to the same PostgreSQL database:**

```typescript
// Next.js (.env)
DATABASE_URL=postgresql://user:pass@host:5432/jiki_video_pipelines

// Rails (config/database.yml)
production:
  url: <%= ENV['DATABASE_URL'] %>
```

### Column Ownership (Critical!)

| Column                                       | Owner   | Purpose              |
| -------------------------------------------- | ------- | -------------------- |
| `type`, `inputs`, `config`, `asset`, `title` | Next.js | Structure (UI edits) |
| `status`, `metadata`, `output`               | Rails   | Execution state      |

**Both apps must use JSONB partial updates (`jsonb_set()`) to prevent conflicts.**

### Schema Migration

**Option 1: No Migration (Recommended)**

- Tables already exist in PostgreSQL
- Rails creates models that point to existing tables
- No schema changes needed
- Zero downtime

**Option 2: Rename Tables (If Desired)**

- Rename `pipelines` → `video_production_pipelines`
- Rename `nodes` → `video_production_nodes`
- Update Next.js `lib/db.ts` with new table names
- Requires deployment coordination

---

## Next.js Changes Required

### 1. Add Rails API Client

Create an API client for calling Rails:

```typescript
// lib/api-client.ts
const API_BASE_URL = process.env.RAILS_API_URL || "http://localhost:3061";

export async function executeNode(pipelineId: string, nodeId: string) {
  const response = await fetch(`${API_BASE_URL}/v1/video_production/pipelines/${pipelineId}/nodes/${nodeId}/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
      // Add auth token when ready
    }
  });

  if (!response.ok) {
    throw new Error(`Execute failed: ${response.statusText}`);
  }

  return response.json();
}

export async function getNodeStatus(pipelineId: string, nodeId: string) {
  const response = await fetch(`${API_BASE_URL}/v1/video_production/pipelines/${pipelineId}/nodes/${nodeId}/status`, {
    headers: {
      // Add auth token when ready
    }
  });

  if (!response.ok) {
    throw new Error(`Status fetch failed: ${response.statusText}`);
  }

  return response.json();
}
```

### 2. Update Server Actions

Add new execution action:

```typescript
// app/pipelines/[id]/actions.ts
"use server";

import { executeNode as executeNodeAPI } from "@/lib/api-client";
import { revalidatePath } from "next/cache";

/**
 * Triggers node execution via Rails API
 */
export async function executeNodeAction(pipelineId: string, nodeId: string) {
  try {
    const result = await executeNodeAPI(pipelineId, nodeId);

    // Revalidate to show "in_progress" status
    revalidatePath(`/pipelines/${pipelineId}`);

    return { success: true, jobId: result.job_id };
  } catch (error) {
    console.error("Error executing node:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to execute node"
    };
  }
}
```

### 3. Add Play Button UI

Update NodeHeader to show play button:

```typescript
// app/pipelines/[id]/components/nodes/shared/NodeHeader.tsx
interface NodeHeaderProps {
  type: NodeType;
  title: string;
  displayName: string;
  status: string;
  onExecute?: () => void;  // New prop
}

export default function NodeHeader({
  type,
  title,
  displayName,
  status,
  onExecute
}: NodeHeaderProps) {
  const icon = NODE_ICONS[type] || "📦";

  return (
    <div className="px-4 py-2 rounded-t-lg bg-white">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xl flex-shrink-0">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-gray-900 truncate" title={title}>
            {title}
          </div>
          <div className="text-xs text-gray-600 truncate">{displayName}</div>
        </div>

        <div className="flex items-center gap-2">
          <StatusBadge status={status} />

          {/* Play button for pending nodes */}
          {status === 'pending' && onExecute && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExecute();
              }}
              className="w-6 h-6 flex items-center justify-center rounded-full bg-green-100 hover:bg-green-200 transition-colors"
              title="Execute node"
            >
              <span className="text-green-700 text-sm">▶</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

### 4. Wire Up Execution in Node Components

Update node components to handle execution:

```typescript
// app/pipelines/[id]/components/nodes/MergeVideosNode.tsx
"use client";

import { useState } from "react";
import { executeNodeAction } from "../../actions";
import type { MergeVideosNode as MergeVideosNodeType } from "@/lib/nodes/types";
import NodeHeader from "./shared/NodeHeader";
// ... other imports

export default function MergeVideosNode({ data, selected }: MergeVideosNodeProps) {
  const { node } = data;
  const [isExecuting, setIsExecuting] = useState(false);

  const handleExecute = async () => {
    setIsExecuting(true);

    const result = await executeNodeAction(node.pipelineId, node.id);

    if (!result.success) {
      alert(`Failed to execute: ${result.error}`);
    }

    setIsExecuting(false);
  };

  return (
    <div onClick={data.onSelect} className="...">
      <NodeHeader
        type={node.type}
        title={node.title}
        displayName={displayName}
        status={node.status}
        onExecute={handleExecute}
      />
      {/* ... rest of component */}
    </div>
  );
}
```

### 5. Update Status Polling

Replace `router.refresh()` with API polling:

```typescript
// app/pipelines/[id]/components/StatusPoller.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getNodeStatus } from "@/lib/api-client";

interface StatusPollerProps {
  pipelineId: string;
  nodeIds: string[]; // IDs of nodes currently in_progress
}

export default function StatusPoller({ pipelineId, nodeIds }: StatusPollerProps) {
  const router = useRouter();
  const [polling, setPolling] = useState(true);

  useEffect(() => {
    if (nodeIds.length === 0) {
      setPolling(false);
      return;
    }

    const interval = setInterval(async () => {
      // Check status of all in_progress nodes
      const updates = await Promise.all(nodeIds.map((nodeId) => getNodeStatus(pipelineId, nodeId)));

      // If any status changed, refresh the page
      const anyChanged = updates.some((update, idx) => update.status !== "in_progress");

      if (anyChanged) {
        router.refresh();
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [pipelineId, nodeIds, router]);

  return null;
}
```

### 6. Environment Variables

```bash
# .env.local
RAILS_API_URL=http://localhost:3061

# .env.production
RAILS_API_URL=https://api.jiki.io
```

---

## Code Removal Checklist

### Files to Delete

- [ ] `pipeline/scripts/execute-node.ts`
- [ ] `pipeline/lib/executors/merge-videos.ts`
- [ ] `pipeline/lib/db-executors.ts`
- [ ] `pipeline/lib/storage/s3.ts`
- [ ] `pipeline/lib/ffmpeg/merge.ts`
- [ ] `pipeline/` entire directory (after verifying all extracted to Rails)

### Dependencies to Remove

```json
// package.json - Remove these:
"@aws-sdk/client-s3": "^3.908.0",
"@aws-sdk/lib-storage": "^3.908.0"
```

Run: `pnpm remove @aws-sdk/client-s3 @aws-sdk/lib-storage`

### Database Operations to Keep

Keep in `lib/db-operations.ts`:

- `createNode()` - Structure updates
- `deleteNode()` - Structure updates
- `connectNodes()` - Structure updates
- `updateNodeConfig()` - Structure updates (config JSONB)
- `reorderNodeInputs()` - Structure updates

Remove from `lib/db-operations.ts`:

- `setNodeStarted()` - Rails handles execution state
- `setNodeCompleted()` - Rails handles execution state
- `setNodeFailed()` - Rails handles execution state

---

## Testing the Migration

### Phase 1: Parallel Operation

Both systems run side-by-side:

1. Keep existing Next.js execution code
2. Add Rails API calls
3. Add feature flag to choose execution method:

```typescript
// lib/feature-flags.ts
export const USE_RAILS_API = process.env.USE_RAILS_API === "true";

// In executeNodeAction:
if (USE_RAILS_API) {
  return await executeViaRailsAPI(pipelineId, nodeId);
} else {
  return await executeLocally(pipelineId, nodeId);
}
```

4. Test Rails API with subset of nodes
5. Compare results (status, metadata, output)
6. Validate JSONB partial updates work correctly

### Phase 2: Cutover

1. Set `USE_RAILS_API=true` in production
2. Monitor for errors
3. If successful after 1 week, remove old code
4. Delete `pipeline/` directory

### Phase 3: Cleanup

1. Remove feature flag
2. Remove old execution code
3. Update tests to mock Rails API
4. Update documentation

---

## Rollback Strategy

If migration fails:

1. Set `USE_RAILS_API=false`
2. Next.js falls back to local execution
3. Investigate Rails API issues
4. Fix and retry

**Important:** Keep old execution code until Rails API proven stable (minimum 1 week in production).

---

## Testing Updates

### Update E2E Tests

Replace local execution with API mocks:

```typescript
// test/e2e/merge-videos-execution.test.ts
import { rest } from "msw";
import { setupServer } from "msw/node";

const server = setupServer(
  rest.post(
    "http://localhost:3061/v1/video_production/pipelines/:pipelineId/nodes/:nodeId/execute",
    (req, res, ctx) => {
      return res(ctx.status(200), ctx.json({ status: "queued", job_id: "test-job-123" }));
    }
  ),

  rest.get("http://localhost:3061/v1/video_production/pipelines/:pipelineId/nodes/:nodeId/status", (req, res, ctx) => {
    return res(
      ctx.status(200),
      ctx.json({
        id: req.params.nodeId,
        status: "completed",
        metadata: { completedAt: new Date().toISOString() },
        output: { s3Key: "test-output.mp4" }
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test("executes merge-videos node via API", async () => {
  // Click play button
  await page.click('[data-testid="execute-button"]');

  // Verify API was called
  await page.waitForSelector('[data-testid="status-in-progress"]');

  // Wait for completion
  await page.waitForSelector('[data-testid="status-completed"]');
});
```

### Update Unit Tests

Mock API client in Server Action tests:

```typescript
// app/pipelines/[id]/actions.test.ts
import { executeNodeAction } from "./actions";
import * as apiClient from "@/lib/api-client";

jest.mock("@/lib/api-client");

test("executeNodeAction calls Rails API", async () => {
  const mockExecute = jest.spyOn(apiClient, "executeNode").mockResolvedValue({ job_id: "test-123" });

  const result = await executeNodeAction("pipeline-1", "node-1");

  expect(result.success).toBe(true);
  expect(mockExecute).toHaveBeenCalledWith("pipeline-1", "node-1");
});
```

---

## CORS Configuration

Rails must allow Next.js to make API calls:

```ruby
# In Rails: config/initializers/cors.rb
Rails.application.config.middleware.insert_before 0, Rack::Cors do
  allow do
    origins(
      'http://localhost:3065',  # Next.js dev
      'https://pipelines.jiki.io'  # Next.js production
    )

    resource '/v1/video_production/*',
      headers: :any,
      methods: [:get, :post, :put, :patch, :delete, :options, :head],
      credentials: true
  end
end
```

---

## Deployment Coordination

### Step-by-Step Deployment

1. **Deploy Rails API** (Week 1)
   - Migrate database schema (if renaming tables)
   - Deploy models, controllers, serializers
   - Test API endpoints with Postman

2. **Deploy Next.js with Feature Flag** (Week 2)
   - Add API client
   - Add `USE_RAILS_API=false` (disabled)
   - Deploy to production
   - Verify no regressions

3. **Enable Rails API for Subset** (Week 3)
   - Enable `USE_RAILS_API=true` for 10% of requests
   - Monitor logs, error rates
   - Compare execution results

4. **Full Cutover** (Week 4)
   - Enable `USE_RAILS_API=true` for 100%
   - Monitor for 1 week
   - If stable, proceed to cleanup

5. **Cleanup** (Week 5)
   - Remove old execution code
   - Remove feature flag
   - Delete `pipeline/` directory
   - Update documentation

---

## Timeline

| Phase                   | Duration | Tasks                                                   |
| ----------------------- | -------- | ------------------------------------------------------- |
| **Preparation**         | Week 1   | Rails API implementation (see VIDEO_PRODUCTION_PLAN.md) |
| **Next.js Updates**     | Week 2   | Add API client, play button, status polling             |
| **Testing**             | Week 2-3 | E2E tests, integration tests, manual QA                 |
| **Parallel Deployment** | Week 3   | Deploy with feature flag, test subset                   |
| **Full Cutover**        | Week 4   | Enable for all, monitor stability                       |
| **Cleanup**             | Week 5   | Remove old code, update docs                            |

**Total: 5 weeks**

---

## Implementation Checklist

### Preparation

- [ ] Review Rails API plan (VIDEO_PRODUCTION_PLAN.md)
- [ ] Set up shared database access for both apps
- [ ] Configure CORS in Rails
- [ ] Test database connection from both apps

### Next.js Changes

- [ ] Create `lib/api-client.ts` with `executeNode()` and `getNodeStatus()`
- [ ] Add `executeNodeAction()` Server Action
- [ ] Update `NodeHeader` component with play button
- [ ] Wire up execution in all 8 node components
- [ ] Add `StatusPoller` component for API polling
- [ ] Add environment variable `RAILS_API_URL`
- [ ] Add feature flag `USE_RAILS_API`

### Testing

- [ ] Write unit tests for API client
- [ ] Update e2e tests to mock Rails API
- [ ] Manual testing: Execute merge-videos node via API
- [ ] Verify JSONB partial updates (no conflicts)
- [ ] Test status polling updates UI correctly

### Deployment

- [ ] Deploy Rails API to staging
- [ ] Deploy Next.js to staging with `USE_RAILS_API=false`
- [ ] Enable `USE_RAILS_API=true` in staging
- [ ] Test end-to-end flow in staging
- [ ] Deploy to production with feature flag
- [ ] Monitor production for 1 week

### Cleanup

- [ ] Remove `pipeline/` directory
- [ ] Remove AWS SDK dependencies
- [ ] Remove execution database operations
- [ ] Remove feature flag code
- [ ] Update documentation (README.md, PIPELINE-PLAN.md)
- [ ] Update CLAUDE.md with new architecture

---

## Monitoring During Migration

### Metrics to Track

1. **API Response Times**
   - Rails API `/execute` endpoint latency
   - Rails API `/status` endpoint latency

2. **Error Rates**
   - Failed executions (status = 'failed')
   - API errors (4xx, 5xx responses)
   - Database conflicts (check logs for race conditions)

3. **Execution Success Rates**
   - Compare old vs. new execution success %
   - Monitor Lambda invocation errors
   - Check S3 upload failures

4. **Database Performance**
   - Query times for JSONB updates
   - Connection pool saturation
   - Lock contention

### Logging

Add detailed logging:

```typescript
// lib/api-client.ts
export async function executeNode(pipelineId: string, nodeId: string) {
  console.log(`[API] Executing node ${nodeId} in pipeline ${pipelineId}`);

  const startTime = Date.now();

  try {
    const result = await fetch(/* ... */);

    const duration = Date.now() - startTime;
    console.log(`[API] Execute succeeded in ${duration}ms`);

    return result.json();
  } catch (error) {
    console.error(`[API] Execute failed:`, error);
    throw error;
  }
}
```

---

## Risks & Mitigations

| Risk                                 | Impact | Mitigation                                      |
| ------------------------------------ | ------ | ----------------------------------------------- |
| Database conflicts (race conditions) | High   | Use JSONB partial updates in both apps          |
| Rails API downtime                   | High   | Feature flag allows rollback to local execution |
| CORS misconfiguration                | Medium | Test in staging first, clear error messages     |
| Authentication issues                | Medium | Start with no auth, add later                   |
| Status polling performance           | Low    | Use efficient queries, add caching if needed    |

---

## Success Criteria

Migration is successful when:

1. ✅ All node types execute via Rails API
2. ✅ Status updates appear in UI within 2 seconds
3. ✅ No database conflicts or race conditions
4. ✅ Error rate < 1% (same as before migration)
5. ✅ Execution time similar to local execution
6. ✅ No manual intervention needed for failures
7. ✅ Sidekiq jobs retry automatically on transient errors
8. ✅ All tests passing (unit, integration, e2e)

---

## Post-Migration Benefits

After migration:

- **Scalability**: Lambda handles heavy FFmpeg work
- **Reliability**: Sidekiq retries, DLQ for failures
- **Monitoring**: Sidekiq Web UI, Rails logs, CloudWatch
- **Cost**: Pay per execution instead of always-on servers
- **Separation**: UI (Next.js) vs. orchestration (Rails)
- **Reusability**: Rails API can be called from other apps

---

## Future Enhancements

Once migration is stable:

1. **Authentication**: Add JWT tokens for API security
2. **Webhooks**: Rails pushes status updates instead of polling
3. **WebSockets**: Real-time status via Action Cable
4. **Batch Execution**: Execute entire pipeline with one API call
5. **Cost Tracking**: Aggregate costs per pipeline
6. **Retry UI**: Manual retry button for failed nodes

---

## Related Documentation

- **Rails API Plan**: `/Users/iHiD/Code/jiki/api/VIDEO_PRODUCTION_PLAN.md`
- **Current Architecture**: `PIPELINE-PLAN.md` in this repo
- **Database Schema**: `lib/db-migrations.ts`
- **Node Types**: `lib/nodes/types.ts`

---

**Next Steps:**

1. Review both plan documents with team
2. Start Rails API implementation (Week 1)
3. Implement Next.js changes in parallel (Week 2)
4. Test in staging environment (Week 3)
5. Deploy to production with feature flag (Week 4)
