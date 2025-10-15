# Front-End Migration Guide: Rails API Integration

## Executive Summary

**Goal:** Replace local Node.js execution with Rails API calls while keeping the visual editor unchanged.

**What You're Doing:**

- Add API client to call Rails backend for node execution
- Add "Execute" button UI to trigger execution
- Update status polling to show real-time progress
- Remove local execution code after migration is complete

**What Stays the Same:**

- Visual pipeline editor (React Flow)
- Node configuration UI
- Database read operations (Server Components)
- Structure updates (creating/deleting/connecting nodes)

---

## Quick Start

### 1. API Endpoints You'll Use

The Rails API provides these endpoints (all under `/admin/video_production/`):

```
# Pipelines
GET  /admin/video_production/pipelines
GET  /admin/video_production/pipelines/:uuid

# Nodes
GET  /admin/video_production/pipelines/:pipeline_uuid/nodes
GET  /admin/video_production/pipelines/:pipeline_uuid/nodes/:uuid
POST /admin/video_production/pipelines/:pipeline_uuid/nodes/:uuid/execute
GET  /admin/video_production/pipelines/:pipeline_uuid/nodes/:uuid/status
```

**Important:** The API uses `uuid` (not `id`) as the primary key for pipelines and nodes.

### 2. Environment Setup

```bash
# .env.local (development)
RAILS_API_URL=http://localhost:3061

# .env.production
RAILS_API_URL=https://api.jiki.io
```

### 3. Files You'll Create/Modify

**New Files:**

- `lib/api-client.ts` - API client for Rails backend
- `app/pipelines/[id]/components/StatusPoller.tsx` - Real-time status updates

**Modified Files:**

- `app/pipelines/[id]/actions.ts` - Add `executeNodeAction()`
- `app/pipelines/[id]/components/nodes/shared/NodeHeader.tsx` - Add execute button
- All node components - Wire up execute handler

**Files to Delete (after migration):**

- `pipeline/` entire directory (execution engine)
- AWS SDK dependencies from `package.json`

---

## Implementation Steps

### Step 1: Create API Client

Create a new file for all Rails API calls:

```typescript
// lib/api-client.ts
const API_BASE_URL = process.env.RAILS_API_URL || "http://localhost:3061";

interface ExecuteResponse {
  status: "queued" | "error";
  job_id?: string;
  error?: string;
}

interface StatusResponse {
  uuid: string;
  status: "pending" | "in_progress" | "completed" | "failed";
  metadata: {
    startedAt?: string;
    completedAt?: string;
    jobId?: string;
    cost?: number;
    error?: string;
  };
  output?: {
    s3Key?: string;
    duration?: number;
    size?: number;
  };
}

/**
 * Execute a node via Rails API (queues background job)
 */
export async function executeNode(pipelineUuid: string, nodeUuid: string): Promise<ExecuteResponse> {
  const response = await fetch(
    `${API_BASE_URL}/admin/video_production/pipelines/${pipelineUuid}/nodes/${nodeUuid}/execute`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
        // TODO: Add auth token when ready
      }
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Execute failed: ${response.statusText} - ${error}`);
  }

  return response.json();
}

/**
 * Get current status of a node
 */
export async function getNodeStatus(pipelineUuid: string, nodeUuid: string): Promise<StatusResponse> {
  const response = await fetch(
    `${API_BASE_URL}/admin/video_production/pipelines/${pipelineUuid}/nodes/${nodeUuid}/status`,
    {
      headers: {
        // TODO: Add auth token when ready
      }
    }
  );

  if (!response.ok) {
    throw new Error(`Status fetch failed: ${response.statusText}`);
  }

  return response.json();
}
```

### Step 2: Add Execute Server Action

Add a new Server Action to trigger execution:

```typescript
// app/pipelines/[id]/actions.ts
"use server";

import { executeNode as executeNodeAPI } from "@/lib/api-client";
import { revalidatePath } from "next/cache";

/**
 * Triggers node execution via Rails API
 * Returns job ID or error
 */
export async function executeNodeAction(pipelineId: string, nodeId: string) {
  try {
    const result = await executeNodeAPI(pipelineId, nodeId);

    if (result.status === "error") {
      return { success: false, error: result.error };
    }

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

### Step 3: Add Execute Button to Node Header

Update the shared NodeHeader component to show an execute button for pending nodes:

```typescript
// app/pipelines/[id]/components/nodes/shared/NodeHeader.tsx
interface NodeHeaderProps {
  type: NodeType;
  title: string;
  displayName: string;
  status: string;
  onExecute?: () => void;  // New prop
  isExecuting?: boolean;   // New prop
}

export default function NodeHeader({
  type,
  title,
  displayName,
  status,
  onExecute,
  isExecuting = false
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

          {/* Execute button for pending nodes (not asset nodes) */}
          {status === 'pending' && onExecute && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onExecute();
              }}
              disabled={isExecuting}
              className={`w-6 h-6 flex items-center justify-center rounded-full transition-colors ${
                isExecuting
                  ? 'bg-gray-100 cursor-wait'
                  : 'bg-green-100 hover:bg-green-200'
              }`}
              title={isExecuting ? "Executing..." : "Execute node"}
            >
              <span className={`text-sm ${isExecuting ? 'text-gray-400' : 'text-green-700'}`}>
                {isExecuting ? '...' : '▶'}
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

### Step 4: Wire Up Execute Handler in Node Components

Update each node component to handle execution. Example for MergeVideosNode:

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
    if (isExecuting) return;

    setIsExecuting(true);

    try {
      const result = await executeNodeAction(node.pipelineId, node.id);

      if (!result.success) {
        alert(`Failed to execute: ${result.error}`);
      }
      // Success - status poller will handle UI updates
    } catch (error) {
      alert(`Execution error: ${error}`);
    } finally {
      setIsExecuting(false);
    }
  };

  // Only show execute button for non-asset nodes
  const canExecute = node.type !== 'asset';

  return (
    <div onClick={data.onSelect} className="...">
      <NodeHeader
        type={node.type}
        title={node.title}
        displayName={displayName}
        status={node.status}
        onExecute={canExecute ? handleExecute : undefined}
        isExecuting={isExecuting}
      />
      {/* ... rest of component */}
    </div>
  );
}
```

**Repeat for all node types:**

- `TalkingHeadNode`
- `GenerateAnimationNode`
- `GenerateVoiceoverNode`
- `RenderCodeNode`
- `MixAudioNode`
- `ComposeVideoNode`
- `AssetNode` (no execute button needed)

### Step 5: Add Status Polling Component

Create a component that polls the API for status updates:

```typescript
// app/pipelines/[id]/components/StatusPoller.tsx
"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getNodeStatus } from "@/lib/api-client";

interface StatusPollerProps {
  pipelineId: string;
  nodeIds: string[]; // UUIDs of nodes currently in_progress
}

/**
 * Polls Rails API for status updates on in-progress nodes
 * Refreshes the page when any node completes or fails
 */
export default function StatusPoller({ pipelineId, nodeIds }: StatusPollerProps) {
  const router = useRouter();

  useEffect(() => {
    if (nodeIds.length === 0) return;

    const interval = setInterval(async () => {
      try {
        // Check status of all in_progress nodes
        const statuses = await Promise.all(nodeIds.map((nodeId) => getNodeStatus(pipelineId, nodeId)));

        // If any status changed from in_progress, refresh the page
        const anyChanged = statuses.some((status) => status.status !== "in_progress");

        if (anyChanged) {
          router.refresh();
        }
      } catch (error) {
        console.error("Status polling error:", error);
        // Don't throw - keep polling
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(interval);
  }, [pipelineId, nodeIds, router]);

  return null; // No UI
}
```

### Step 6: Add Status Poller to Pipeline Page

Update the main pipeline page to include the status poller:

```typescript
// app/pipelines/[id]/page.tsx
import StatusPoller from "./components/StatusPoller";

export default async function PipelinePage({ params }: { params: { id: string } }) {
  const pipeline = await getPipelineWithNodes(params.id);

  // Get IDs of nodes currently in progress
  const inProgressNodeIds = pipeline.nodes
    .filter((node) => node.status === 'in_progress')
    .map((node) => node.id);

  return (
    <div className="h-screen flex flex-col">
      <PipelineHeader pipeline={pipeline} />

      {/* Poll for status updates */}
      {inProgressNodeIds.length > 0 && (
        <StatusPoller
          pipelineId={pipeline.id}
          nodeIds={inProgressNodeIds}
        />
      )}

      <PipelineEditor pipeline={pipeline} />
    </div>
  );
}
```

---

## Testing the Migration

### Phase 1: Parallel Operation (Week 1-2)

Keep both systems running side-by-side using a feature flag:

```typescript
// lib/feature-flags.ts
export const USE_RAILS_API = process.env.NEXT_PUBLIC_USE_RAILS_API === "true";

// In executeNodeAction:
export async function executeNodeAction(pipelineId: string, nodeId: string) {
  if (USE_RAILS_API) {
    return executeViaRailsAPI(pipelineId, nodeId);
  } else {
    return executeLocally(pipelineId, nodeId); // Keep old code
  }
}
```

**Testing Steps:**

1. Set `NEXT_PUBLIC_USE_RAILS_API=false` initially
2. Verify existing execution still works
3. Set `NEXT_PUBLIC_USE_RAILS_API=true`
4. Test all node types via API
5. Compare results (status, metadata, output)

### Phase 2: Cutover (Week 3)

1. Set `NEXT_PUBLIC_USE_RAILS_API=true` in production
2. Monitor error rates and execution times
3. Check database for race conditions (JSONB conflicts)
4. Verify status polling updates UI correctly

### Phase 3: Cleanup (Week 4)

After 1 week of stable operation:

1. Remove feature flag
2. Delete `pipeline/` directory
3. Remove AWS SDK dependencies: `pnpm remove @aws-sdk/client-s3 @aws-sdk/lib-storage`
4. Remove old execution code
5. Update tests to mock Rails API
6. Update documentation

---

## Code Removal Checklist

### Files to Delete (After Migration)

- [ ] `pipeline/scripts/execute-node.ts`
- [ ] `pipeline/lib/executors/merge-videos.ts`
- [ ] `pipeline/lib/db-executors.ts`
- [ ] `pipeline/lib/storage/s3.ts`
- [ ] `pipeline/lib/ffmpeg/merge.ts`
- [ ] `pipeline/` entire directory

### Dependencies to Remove

```bash
pnpm remove @aws-sdk/client-s3 @aws-sdk/lib-storage
```

### Database Operations to Keep

Keep in `lib/db-operations.ts` (structure updates only):

- `createNode()` - Creating nodes
- `deleteNode()` - Deleting nodes
- `connectNodes()` - Connecting nodes
- `updateNodeConfig()` - Updating config JSONB
- `reorderNodeInputs()` - Reordering inputs

Remove from `lib/db-operations.ts` (Rails handles execution state):

- `setNodeStarted()`
- `setNodeCompleted()`
- `setNodeFailed()`

---

## Updating Tests

### E2E Tests

Mock the Rails API instead of running local execution:

```typescript
// test/e2e/merge-videos-execution.test.ts
import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

const server = setupServer(
  // Mock execute endpoint
  http.post("http://localhost:3061/admin/video_production/pipelines/:pipelineId/nodes/:nodeId/execute", () => {
    return HttpResponse.json({
      status: "queued",
      job_id: "test-job-123"
    });
  }),

  // Mock status endpoint
  http.get("http://localhost:3061/admin/video_production/pipelines/:pipelineId/nodes/:nodeId/status", ({ params }) => {
    return HttpResponse.json({
      uuid: params.nodeId,
      status: "completed",
      metadata: {
        completedAt: new Date().toISOString(),
        cost: 0.05
      },
      output: {
        s3Key: "test-output.mp4",
        duration: 120,
        size: 5242880
      }
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test("executes merge-videos node via API", async () => {
  // Click execute button
  await page.click('[data-testid="execute-button"]');

  // Verify status changes to in_progress
  await page.waitForSelector('[data-testid="status-in-progress"]');

  // Wait for completion (poller will refresh)
  await page.waitForSelector('[data-testid="status-completed"]', { timeout: 5000 });
});
```

### Unit Tests

Mock the API client:

```typescript
// app/pipelines/[id]/actions.test.ts
import { executeNodeAction } from "./actions";
import * as apiClient from "@/lib/api-client";

jest.mock("@/lib/api-client");

test("executeNodeAction calls Rails API", async () => {
  const mockExecute = jest.spyOn(apiClient, "executeNode").mockResolvedValue({ status: "queued", job_id: "test-123" });

  const result = await executeNodeAction("pipeline-uuid", "node-uuid");

  expect(result.success).toBe(true);
  expect(result.jobId).toBe("test-123");
  expect(mockExecute).toHaveBeenCalledWith("pipeline-uuid", "node-uuid");
});
```
