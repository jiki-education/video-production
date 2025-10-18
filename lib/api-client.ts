/**
 * API Client for Rails Backend
 *
 * This module provides functions to interact with the Rails API.
 * For now, all requests include ?user_id=1 to bypass authentication.
 *
 * In tests, this module can be mocked using vi.mock('@/lib/api-client')
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3061";
const API_PREFIX = "/v1/admin/video_production";

// Temporary auth bypass - append ?user_id=1 to all requests
function withAuthBypass(url: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}user_id=1`;
}

export interface Pipeline {
  uuid: string;
  title: string;
  version: string;
  config: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface Node {
  uuid: string;
  pipeline_uuid: string;
  title: string;
  type: string;
  provider: string | null;
  inputs: Record<string, unknown>;
  config: Record<string, unknown>;
  asset: Record<string, unknown> | null;
  status: string;
  metadata: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  is_valid: boolean;
  validation_errors: Record<string, unknown>;
}

export interface GetPipelineResponse {
  pipeline: Pipeline;
  nodes: Node[];
}

/**
 * Fetches a single pipeline with its nodes
 *
 * @param uuid - Pipeline UUID
 * @returns Pipeline data with nodes
 */
export async function getPipeline(uuid: string): Promise<GetPipelineResponse> {
  // TEMPORARY: Return mock data for E2E tests
  if (process.env.NODE_ENV === "test" || process.env.USE_MOCK_API === "true") {
    return {
      pipeline: {
        uuid,
        version: "1.0",
        title: "Test Pipeline",
        config: {},
        metadata: {}
      },
      nodes: getMockNodesForPipeline(uuid)
    };
  }

  // Fetch pipeline and nodes separately
  const pipelineUrl = withAuthBypass(`${API_BASE_URL}${API_PREFIX}/pipelines/${uuid}`);
  const nodesUrl = withAuthBypass(`${API_BASE_URL}${API_PREFIX}/pipelines/${uuid}/nodes`);

  const [pipelineResponse, nodesResponse] = await Promise.all([
    fetch(pipelineUrl, {
      headers: {
        "Content-Type": "application/json"
      }
    }),
    fetch(nodesUrl, {
      headers: {
        "Content-Type": "application/json"
      }
    })
  ]);

  if (!pipelineResponse.ok) {
    const error = await pipelineResponse.text();
    throw new Error(`Failed to fetch pipeline: ${pipelineResponse.statusText} - ${error}`);
  }

  if (!nodesResponse.ok) {
    const error = await nodesResponse.text();
    throw new Error(`Failed to fetch nodes: ${nodesResponse.statusText} - ${error}`);
  }

  const pipelineData = await pipelineResponse.json();
  const nodesData = await nodesResponse.json();

  return {
    pipeline: pipelineData.pipeline,
    nodes: nodesData.nodes ?? []
  };
}

/**
 * TEMPORARY: Mock node data for E2E tests
 */
function getMockNodesForPipeline(pipelineUuid: string): Node[] {
  const segment1Uuid = "segment-1";
  const segment2Uuid = "segment-2";
  const segment3Uuid = "segment-3";
  const mergeNodeUuid = "merge-videos";
  const nodeAUuid = "script-asset";
  const nodeBUuid = "talking-head";
  const nodeCUuid = "render-code";

  // Return different mock data based on pipeline UUID pattern
  if (pipelineUuid.includes("test-pipeline")) {
    return [
      {
        uuid: segment1Uuid,
        pipeline_uuid: pipelineUuid,
        title: "Intro Video",
        type: "generate-talking-head",
        provider: "heygen",
        inputs: {},
        config: { avatar_id: "avatar-1", voice_id: "voice-1" },
        asset: null,
        status: "pending",
        metadata: null,
        output: null,
        is_valid: false,
        validation_errors: {}
      },
      {
        uuid: segment2Uuid,
        pipeline_uuid: pipelineUuid,
        title: "Main Content",
        type: "generate-talking-head",
        provider: "heygen",
        inputs: {},
        config: { avatar_id: "avatar-1", voice_id: "voice-1" },
        asset: null,
        status: "pending",
        metadata: null,
        output: null,
        is_valid: false,
        validation_errors: {}
      },
      {
        uuid: segment3Uuid,
        pipeline_uuid: pipelineUuid,
        title: "Outro Video",
        type: "generate-talking-head",
        provider: "heygen",
        inputs: {},
        config: { avatar_id: "avatar-1", voice_id: "voice-1" },
        asset: null,
        status: "pending",
        metadata: null,
        output: null,
        is_valid: false,
        validation_errors: {}
      },
      {
        uuid: mergeNodeUuid,
        pipeline_uuid: pipelineUuid,
        title: "Final Video",
        type: "merge-videos",
        provider: "ffmpeg",
        inputs: { segments: [segment1Uuid, segment2Uuid, segment3Uuid] },
        config: {},
        asset: null,
        status: "pending",
        metadata: null,
        output: null,
        is_valid: false,
        validation_errors: {}
      },
      {
        uuid: nodeAUuid,
        pipeline_uuid: pipelineUuid,
        title: "Script Asset",
        type: "asset",
        provider: "direct",
        inputs: {},
        config: {},
        asset: { source: "lessons/test/script.md", type: "text" },
        status: "completed",
        metadata: null,
        output: null,
        is_valid: true,
        validation_errors: {}
      },
      {
        uuid: nodeBUuid,
        pipeline_uuid: pipelineUuid,
        title: "Talking Head Video",
        type: "generate-talking-head",
        provider: "heygen",
        inputs: { script: [nodeAUuid] },
        config: { avatar_id: "avatar-1", voice_id: "voice-1" },
        asset: null,
        status: "pending",
        metadata: null,
        output: null,
        is_valid: false,
        validation_errors: {}
      },
      {
        uuid: nodeCUuid,
        pipeline_uuid: pipelineUuid,
        title: "Code Screen",
        type: "render-code",
        provider: "remotion",
        inputs: {},
        config: { composition: "test" },
        asset: null,
        status: "pending",
        metadata: null,
        output: null,
        is_valid: false,
        validation_errors: {}
      }
    ];
  }

  return [];
}

/**
 * Lists all pipelines
 *
 * @returns Array of pipelines
 */
export async function listPipelines(): Promise<Pipeline[]> {
  const url = withAuthBypass(`${API_BASE_URL}${API_PREFIX}/pipelines`);
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to list pipelines: ${response.statusText} - ${error}`);
  }

  const data = await response.json();
  // Rails API returns {results: [...], meta: {...}}
  return data.results ?? [];
}

/**
 * Creates a new node in a pipeline
 *
 * @param pipelineUuid - Pipeline UUID
 * @param nodeData - Node data (type, inputs, config, etc.)
 * @returns Created node
 */
export async function createNode(
  pipelineUuid: string,
  nodeData: {
    uuid: string;
    type: string;
    title: string;
    provider?: string;
    inputs: Record<string, unknown>;
    config: Record<string, unknown>;
    asset?: Record<string, unknown>;
  }
): Promise<Node> {
  const url = withAuthBypass(`${API_BASE_URL}${API_PREFIX}/pipelines/${pipelineUuid}/nodes`);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ node: nodeData })
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to create node: ${response.statusText} - ${error}`);
  }

  const data = await response.json();
  return data.node;
}

/**
 * Deletes a node from a pipeline
 *
 * @param pipelineUuid - Pipeline UUID
 * @param nodeUuid - Node UUID to delete
 */
export async function deleteNode(pipelineUuid: string, nodeUuid: string): Promise<void> {
  const url = withAuthBypass(`${API_BASE_URL}${API_PREFIX}/pipelines/${pipelineUuid}/nodes/${nodeUuid}`);
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json"
    }
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to delete node: ${response.statusText} - ${error}`);
  }
}

/**
 * Connects two nodes by adding a dependency
 *
 * This updates the target node's inputs to add the source node UUID.
 * If the input key expects an array, it appends to the array.
 * If it expects a single value, it sets the value directly.
 *
 * @param pipelineUuid - Pipeline UUID
 * @param sourceNodeUuid - Source node UUID (providing output)
 * @param targetNodeUuid - Target node UUID (receiving input)
 * @param inputKey - Input key on target node
 */
export async function connectNodes(
  pipelineUuid: string,
  sourceNodeUuid: string,
  targetNodeUuid: string,
  inputKey: string
): Promise<void> {
  // First fetch the target node to get its current inputs
  const nodeUrl = withAuthBypass(`${API_BASE_URL}${API_PREFIX}/pipelines/${pipelineUuid}/nodes/${targetNodeUuid}`);
  const nodeResponse = await fetch(nodeUrl, {
    headers: {
      "Content-Type": "application/json"
    }
  });

  if (!nodeResponse.ok) {
    const error = await nodeResponse.text();
    throw new Error(`Failed to fetch node: ${nodeResponse.statusText} - ${error}`);
  }

  const nodeData = await nodeResponse.json();
  const node = nodeData.node as Node;

  // Update the inputs - check if it's an array or single value
  const currentValue = node.inputs[inputKey];
  let newInputs: Record<string, unknown>;

  if (Array.isArray(currentValue)) {
    // Append to array if not already present
    if (!currentValue.includes(sourceNodeUuid)) {
      newInputs = {
        ...node.inputs,
        [inputKey]: [...currentValue, sourceNodeUuid]
      };
    } else {
      // Already connected
      return;
    }
  } else {
    // Set as single value
    newInputs = {
      ...node.inputs,
      [inputKey]: sourceNodeUuid
    };
  }

  // PATCH the node with updated inputs
  const updateUrl = withAuthBypass(`${API_BASE_URL}${API_PREFIX}/pipelines/${pipelineUuid}/nodes/${targetNodeUuid}`);
  const updateResponse = await fetch(updateUrl, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      node: { inputs: newInputs }
    })
  });

  if (!updateResponse.ok) {
    const error = await updateResponse.text();
    throw new Error(`Failed to connect nodes: ${updateResponse.statusText} - ${error}`);
  }
}

/**
 * Reorders inputs array for a node
 *
 * @param pipelineUuid - Pipeline UUID
 * @param nodeUuid - Node UUID to update
 * @param inputKey - Input key containing array to reorder
 * @param newOrder - New array of node UUIDs in desired order
 */
export async function reorderNodeInputs(
  pipelineUuid: string,
  nodeUuid: string,
  inputKey: string,
  newOrder: string[]
): Promise<void> {
  // First fetch the target node to get its current inputs
  const nodeUrl = withAuthBypass(`${API_BASE_URL}${API_PREFIX}/pipelines/${pipelineUuid}/nodes/${nodeUuid}`);
  const nodeResponse = await fetch(nodeUrl, {
    headers: {
      "Content-Type": "application/json"
    }
  });

  if (!nodeResponse.ok) {
    const error = await nodeResponse.text();
    throw new Error(`Failed to fetch node: ${nodeResponse.statusText} - ${error}`);
  }

  const nodeData = await nodeResponse.json();
  const node = nodeData.node as Node;

  // Update the inputs with new order
  const newInputs = {
    ...node.inputs,
    [inputKey]: newOrder
  };

  // PATCH the node with updated inputs
  const updateUrl = withAuthBypass(`${API_BASE_URL}${API_PREFIX}/pipelines/${pipelineUuid}/nodes/${nodeUuid}`);
  const updateResponse = await fetch(updateUrl, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      node: { inputs: newInputs }
    })
  });

  if (!updateResponse.ok) {
    const error = await updateResponse.text();
    throw new Error(`Failed to reorder inputs: ${updateResponse.statusText} - ${error}`);
  }
}
