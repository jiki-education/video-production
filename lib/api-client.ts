/**
 * API Client for Rails Backend
 *
 * This module provides functions to interact with the Rails API.
 * All functions are currently stubbed with TODO comments.
 *
 * In tests, this module can be mocked using vi.mock('@/lib/api-client')
 */

export interface Pipeline {
  id: string;
  version: string;
  title: string;
  created_at: string;
  updated_at: string;
  config: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface Node {
  id: string;
  pipelineId: string;
  title: string;
  type: string;
  inputs: Record<string, unknown>;
  config: Record<string, unknown>;
  asset?: Record<string, unknown>;
  status: string;
  metadata?: Record<string, unknown> | null;
  output?: Record<string, unknown> | null;
}

export interface GetPipelineResponse {
  pipeline: Pipeline;
  nodes: Node[];
}

/**
 * Fetches a single pipeline with its nodes
 *
 * @param id - Pipeline ID
 * @returns Pipeline data with nodes
 *
 * TODO: Implement Rails API call
 * GET /v1/video_production/pipelines/:id
 */
export async function getPipeline(id: string): Promise<GetPipelineResponse> {
  // TEMPORARY: Return mock data for E2E tests
  if (process.env.NODE_ENV === "test" || process.env.USE_MOCK_API === "true") {
    return {
      pipeline: {
        id,
        version: "1.0",
        title: "Test Pipeline",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        config: {},
        metadata: {}
      },
      nodes: getMockNodesForPipeline(id)
    };
  }

  throw new Error(`TODO: Implement Rails API call - GET /v1/video_production/pipelines/${id}`);
}

/**
 * TEMPORARY: Mock node data for E2E tests
 */
function getMockNodesForPipeline(pipelineId: string): Node[] {
  const segment1Id = "segment-1";
  const segment2Id = "segment-2";
  const segment3Id = "segment-3";
  const mergeNodeId = "merge-videos";
  const nodeAId = "script-asset";
  const nodeBId = "talking-head";
  const nodeCId = "render-code";

  // Return different mock data based on pipeline ID pattern
  if (pipelineId.includes("test-pipeline")) {
    return [
      {
        id: segment1Id,
        pipelineId: pipelineId,
        title: "Intro Video",
        type: "talking-head",
        inputs: {},
        config: { provider: "heygen", avatarId: "avatar-1" },
        status: "pending",
        metadata: null,
        output: null
      },
      {
        id: segment2Id,
        pipelineId: pipelineId,
        title: "Main Content",
        type: "talking-head",
        inputs: {},
        config: { provider: "heygen", avatarId: "avatar-1" },
        status: "pending",
        metadata: null,
        output: null
      },
      {
        id: segment3Id,
        pipelineId: pipelineId,
        title: "Outro Video",
        type: "talking-head",
        inputs: {},
        config: { provider: "heygen", avatarId: "avatar-1" },
        status: "pending",
        metadata: null,
        output: null
      },
      {
        id: mergeNodeId,
        pipelineId: pipelineId,
        title: "Final Video",
        type: "merge-videos",
        inputs: { segments: [segment1Id, segment2Id, segment3Id] },
        config: { provider: "ffmpeg" },
        status: "pending",
        metadata: null,
        output: null
      },
      {
        id: nodeAId,
        pipelineId: pipelineId,
        title: "Script Asset",
        type: "asset",
        inputs: {},
        config: {},
        asset: { source: "lessons/test/script.md", type: "text" },
        status: "pending",
        metadata: null,
        output: null
      },
      {
        id: nodeBId,
        pipelineId: pipelineId,
        title: "Talking Head Video",
        type: "talking-head",
        inputs: { script: [nodeAId] },
        config: { provider: "heygen", avatarId: "avatar-1" },
        status: "pending",
        metadata: null,
        output: null
      },
      {
        id: nodeCId,
        pipelineId: pipelineId,
        title: "Code Screen",
        type: "render-code",
        inputs: { config: [] },
        config: { provider: "remotion", compositionId: "test" },
        status: "pending",
        metadata: null,
        output: null
      }
    ];
  }

  return [];
}

/**
 * Lists all pipelines
 *
 * @returns Array of pipelines
 *
 * TODO: Implement Rails API call
 * GET /v1/video_production/pipelines
 */
export async function listPipelines(): Promise<Pipeline[]> {
  throw new Error("TODO: Implement Rails API call - GET /v1/video_production/pipelines");
}

/**
 * Creates a new node in a pipeline
 *
 * @param pipelineId - Pipeline ID
 * @param nodeData - Node data (type, inputs, config, etc.)
 * @returns Created node
 *
 * TODO: Implement Rails API call
 * POST /v1/video_production/pipelines/:pipeline_id/nodes
 */
export async function createNode(
  pipelineId: string,
  _nodeData: {
    id: string;
    type: string;
    title: string;
    inputs: Record<string, unknown>;
    config: Record<string, unknown>;
    asset?: Record<string, unknown>;
  }
): Promise<Node> {
  throw new Error(`TODO: Implement Rails API call - POST /v1/video_production/pipelines/${pipelineId}/nodes`);
}

/**
 * Deletes a node from a pipeline
 *
 * @param pipelineId - Pipeline ID
 * @param nodeId - Node ID to delete
 *
 * TODO: Implement Rails API call
 * DELETE /v1/video_production/pipelines/:pipeline_id/nodes/:node_id
 */
export async function deleteNode(pipelineId: string, nodeId: string): Promise<void> {
  throw new Error(
    `TODO: Implement Rails API call - DELETE /v1/video_production/pipelines/${pipelineId}/nodes/${nodeId}`
  );
}

/**
 * Connects two nodes by adding a dependency
 *
 * @param pipelineId - Pipeline ID
 * @param sourceNodeId - Source node (providing output)
 * @param targetNodeId - Target node (receiving input)
 * @param inputKey - Input key on target node
 *
 * TODO: Implement Rails API call
 * PATCH /v1/video_production/pipelines/:pipeline_id/nodes/:target_id/connect
 */
export async function connectNodes(
  pipelineId: string,
  _sourceNodeId: string,
  targetNodeId: string,
  _inputKey: string
): Promise<void> {
  throw new Error(
    `TODO: Implement Rails API call - PATCH /v1/video_production/pipelines/${pipelineId}/nodes/${targetNodeId}/connect`
  );
}

/**
 * Reorders inputs array for a node
 *
 * @param pipelineId - Pipeline ID
 * @param nodeId - Node ID to update
 * @param inputKey - Input key containing array to reorder
 * @param newOrder - New array of node IDs in desired order
 *
 * TODO: Implement Rails API call
 * PATCH /v1/video_production/pipelines/:pipeline_id/nodes/:node_id/reorder
 */
export async function reorderNodeInputs(
  pipelineId: string,
  nodeId: string,
  _inputKey: string,
  _newOrder: string[]
): Promise<void> {
  throw new Error(
    `TODO: Implement Rails API call - PATCH /v1/video_production/pipelines/${pipelineId}/nodes/${nodeId}/reorder`
  );
}
