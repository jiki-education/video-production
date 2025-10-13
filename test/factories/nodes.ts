/**
 * Node Database Factories
 *
 * FactoryBot-style factories for creating Node records in the database.
 * Each factory function creates a specific node type with sensible defaults.
 *
 * Usage:
 *   const node = await createTalkingHeadNode({
 *     pipelineId: pipeline.id,
 *     config: { provider: "heygen" }
 *   });
 */

import { query } from "@/test/helpers/db";
import { createPipeline } from "./pipelines";
import type {
  AssetNode,
  TalkingHeadNode,
  RenderCodeNode,
  GenerateAnimationNode,
  GenerateVoiceoverNode,
  MixAudioNode,
  MergeVideosNode,
  ComposeVideoNode
} from "@/lib/nodes/types";

let factoryCounter = 0;

/**
 * Generates a unique node ID for testing
 */
function generateNodeId(type: string): string {
  return `test-${type}-${Date.now()}-${++factoryCounter}`;
}

/**
 * Inserts a node into the database
 * Helper function used by all node factories
 */
async function insertNode(
  node:
    | AssetNode
    | TalkingHeadNode
    | RenderCodeNode
    | GenerateAnimationNode
    | GenerateVoiceoverNode
    | MixAudioNode
    | MergeVideosNode
    | ComposeVideoNode
): Promise<void> {
  await query(
    `INSERT INTO nodes (id, pipeline_id, type, inputs, config, asset, status, metadata, output)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      node.id,
      node.pipelineId,
      node.type,
      node.inputs,
      node.config,
      node.type === "asset" ? node.asset : null,
      node.status,
      node.metadata,
      node.output
    ]
  );
}

// ============================================================================
// Asset Node Factory
// ============================================================================

export async function createAssetNode(overrides: Partial<AssetNode> = {}): Promise<AssetNode> {
  // Auto-create pipeline if not provided
  if (overrides.pipelineId === undefined || overrides.pipelineId === null) {
    const pipeline = await createPipeline();
    overrides.pipelineId = pipeline.id;
  }

  const node: AssetNode = {
    id: overrides.id ?? generateNodeId("asset"),
    pipelineId: overrides.pipelineId,
    type: "asset",
    inputs: {},
    config: overrides.config ?? {},
    asset: overrides.asset ?? { source: "./test.txt", type: "text" },
    status: overrides.status ?? "pending",
    metadata: overrides.metadata ?? null,
    output: overrides.output ?? null
  };

  await insertNode(node);
  return node;
}

// ============================================================================
// Talking Head Node Factory
// ============================================================================

export async function createTalkingHeadNode(overrides: Partial<TalkingHeadNode> = {}): Promise<TalkingHeadNode> {
  if (overrides.pipelineId === undefined || overrides.pipelineId === null) {
    const pipeline = await createPipeline();
    overrides.pipelineId = pipeline.id;
  }

  const node: TalkingHeadNode = {
    id: overrides.id ?? generateNodeId("talking-head"),
    pipelineId: overrides.pipelineId,
    type: "talking-head",
    inputs: overrides.inputs ?? {},
    config: overrides.config ?? { provider: "heygen", avatarId: "avatar-1" },
    status: overrides.status ?? "pending",
    metadata: overrides.metadata ?? null,
    output: overrides.output ?? null
  };

  await insertNode(node);
  return node;
}

// ============================================================================
// Render Code Node Factory
// ============================================================================

export async function createRenderCodeNode(overrides: Partial<RenderCodeNode> = {}): Promise<RenderCodeNode> {
  if (overrides.pipelineId === undefined || overrides.pipelineId === null) {
    const pipeline = await createPipeline();
    overrides.pipelineId = pipeline.id;
  }

  const node: RenderCodeNode = {
    id: overrides.id ?? generateNodeId("render-code"),
    pipelineId: overrides.pipelineId,
    type: "render-code",
    inputs: overrides.inputs ?? {},
    config: overrides.config ?? { provider: "remotion", compositionId: "code-scene" },
    status: overrides.status ?? "pending",
    metadata: overrides.metadata ?? null,
    output: overrides.output ?? null
  };

  await insertNode(node);
  return node;
}

// ============================================================================
// Generate Animation Node Factory
// ============================================================================

export async function createGenerateAnimationNode(
  overrides: Partial<GenerateAnimationNode> = {}
): Promise<GenerateAnimationNode> {
  if (overrides.pipelineId === undefined || overrides.pipelineId === null) {
    const pipeline = await createPipeline();
    overrides.pipelineId = pipeline.id;
  }

  const node: GenerateAnimationNode = {
    id: overrides.id ?? generateNodeId("animation"),
    pipelineId: overrides.pipelineId,
    type: "generate-animation",
    inputs: overrides.inputs ?? {},
    config: overrides.config ?? { provider: "veo3", duration: 5 },
    status: overrides.status ?? "pending",
    metadata: overrides.metadata ?? null,
    output: overrides.output ?? null
  };

  await insertNode(node);
  return node;
}

// ============================================================================
// Generate Voiceover Node Factory
// ============================================================================

export async function createGenerateVoiceoverNode(
  overrides: Partial<GenerateVoiceoverNode> = {}
): Promise<GenerateVoiceoverNode> {
  if (overrides.pipelineId === undefined || overrides.pipelineId === null) {
    const pipeline = await createPipeline();
    overrides.pipelineId = pipeline.id;
  }

  const node: GenerateVoiceoverNode = {
    id: overrides.id ?? generateNodeId("voiceover"),
    pipelineId: overrides.pipelineId,
    type: "generate-voiceover",
    inputs: overrides.inputs ?? {},
    config: overrides.config ?? { provider: "elevenlabs", voice: "adam" },
    status: overrides.status ?? "pending",
    metadata: overrides.metadata ?? null,
    output: overrides.output ?? null
  };

  await insertNode(node);
  return node;
}

// ============================================================================
// Mix Audio Node Factory
// ============================================================================

export async function createMixAudioNode(overrides: Partial<MixAudioNode> = {}): Promise<MixAudioNode> {
  if (overrides.pipelineId === undefined || overrides.pipelineId === null) {
    const pipeline = await createPipeline();
    overrides.pipelineId = pipeline.id;
  }

  const node: MixAudioNode = {
    id: overrides.id ?? generateNodeId("mix-audio"),
    pipelineId: overrides.pipelineId,
    type: "mix-audio",
    inputs: overrides.inputs ?? {},
    config: overrides.config ?? { provider: "ffmpeg", mode: "replace" },
    status: overrides.status ?? "pending",
    metadata: overrides.metadata ?? null,
    output: overrides.output ?? null
  };

  await insertNode(node);
  return node;
}

// ============================================================================
// Merge Videos Node Factory
// ============================================================================

export async function createMergeVideosNode(overrides: Partial<MergeVideosNode> = {}): Promise<MergeVideosNode> {
  if (overrides.pipelineId === undefined || overrides.pipelineId === null) {
    const pipeline = await createPipeline();
    overrides.pipelineId = pipeline.id;
  }

  const node: MergeVideosNode = {
    id: overrides.id ?? generateNodeId("merge-videos"),
    pipelineId: overrides.pipelineId,
    type: "merge-videos",
    inputs: overrides.inputs ?? {},
    config: overrides.config ?? { provider: "ffmpeg" },
    status: overrides.status ?? "pending",
    metadata: overrides.metadata ?? null,
    output: overrides.output ?? null
  };

  await insertNode(node);
  return node;
}

// ============================================================================
// Compose Video Node Factory
// ============================================================================

export async function createComposeVideoNode(overrides: Partial<ComposeVideoNode> = {}): Promise<ComposeVideoNode> {
  if (overrides.pipelineId === undefined || overrides.pipelineId === null) {
    const pipeline = await createPipeline();
    overrides.pipelineId = pipeline.id;
  }

  const node: ComposeVideoNode = {
    id: overrides.id ?? generateNodeId("compose-video"),
    pipelineId: overrides.pipelineId,
    type: "compose-video",
    inputs: overrides.inputs ?? {},
    config: overrides.config ?? { provider: "ffmpeg", position: "bottom-right", scale: 0.3 },
    status: overrides.status ?? "pending",
    metadata: overrides.metadata ?? null,
    output: overrides.output ?? null
  };

  await insertNode(node);
  return node;
}
