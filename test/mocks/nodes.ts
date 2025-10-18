/**
 * Node Mock Factories
 *
 * Provides helper functions to create mock nodes for testing.
 * Each function returns a complete node with sensible defaults that can be overridden.
 */

import type {
  AssetNode,
  GenerateTalkingHeadNode,
  RenderCodeNode,
  GenerateAnimationNode,
  GenerateVoiceoverNode,
  MixAudioNode,
  MergeVideosNode,
  ComposeVideoNode
} from "@/lib/nodes/types";

/**
 * Creates a mock Asset node
 *
 * @param overrides - Partial properties to override defaults
 * @returns Complete AssetNode for testing
 *
 * Example:
 *   const scriptNode = createMockAssetNode({
 *     id: 'intro-script',
 *     asset: { source: './intro.md', type: 'text' }
 *   });
 */
export function createMockAssetNode(overrides?: Partial<AssetNode>): AssetNode {
  return {
    id: "test-asset",
    pipelineId: "test-pipeline",
    type: "asset",
    title: "Test Asset",
    inputs: {},
    config: {},
    provider: "direct",
    asset: { source: "./test.txt", type: "text" },
    status: "pending",
    metadata: null,
    output: null,
    ...overrides
  };
}

/**
 * Creates a mock Generate Talking Head node
 *
 * @param overrides - Partial properties to override defaults
 * @returns Complete GenerateTalkingHeadNode for testing
 */
export function createMockGenerateTalkingHeadNode(
  overrides?: Partial<GenerateTalkingHeadNode>
): GenerateTalkingHeadNode {
  return {
    id: "test-generate-talking-head",
    pipelineId: "test-pipeline",
    type: "generate-talking-head",
    title: "Test Talking Head",
    inputs: { script: "test-script" },
    config: { avatar_id: "avatar-1", voice_id: "voice-1" },
    provider: "heygen",
    status: "pending",
    metadata: null,
    output: null,
    ...overrides
  };
}

/**
 * Creates a mock Render Code node
 *
 * @param overrides - Partial properties to override defaults
 * @returns Complete RenderCodeNode for testing
 */
export function createMockRenderCodeNode(overrides?: Partial<RenderCodeNode>): RenderCodeNode {
  return {
    id: "test-render-code",
    pipelineId: "test-pipeline",
    type: "render-code",
    title: "Test Render Code",
    inputs: { config: "test-config" },
    config: { composition: "code-scene" },
    provider: "remotion",
    status: "pending",
    metadata: null,
    output: null,
    ...overrides
  };
}

/**
 * Creates a mock Generate Animation node
 *
 * @param overrides - Partial properties to override defaults
 * @returns Complete GenerateAnimationNode for testing
 */
export function createMockGenerateAnimationNode(overrides?: Partial<GenerateAnimationNode>): GenerateAnimationNode {
  return {
    id: "test-animation",
    pipelineId: "test-pipeline",
    type: "generate-animation",
    title: "Test Animation",
    inputs: { prompt: "test-prompt" },
    config: { model: "standard" },
    provider: "veo3",
    status: "pending",
    metadata: null,
    output: null,
    ...overrides
  } as GenerateAnimationNode;
}

/**
 * Creates a mock Generate Voiceover node
 *
 * @param overrides - Partial properties to override defaults
 * @returns Complete GenerateVoiceoverNode for testing
 */
export function createMockGenerateVoiceoverNode(overrides?: Partial<GenerateVoiceoverNode>): GenerateVoiceoverNode {
  return {
    id: "test-voiceover",
    pipelineId: "test-pipeline",
    type: "generate-voiceover",
    title: "Test Voiceover",
    inputs: { script: "test-script" },
    config: { voice_id: "adam" },
    provider: "elevenlabs",
    status: "pending",
    metadata: null,
    output: null,
    ...overrides
  };
}

/**
 * Creates a mock Mix Audio node
 *
 * @param overrides - Partial properties to override defaults
 * @returns Complete MixAudioNode for testing
 */
export function createMockMixAudioNode(overrides?: Partial<MixAudioNode>): MixAudioNode {
  return {
    id: "test-mix-audio",
    pipelineId: "test-pipeline",
    type: "mix-audio",
    title: "Test Mix Audio",
    inputs: { video: "test-video", audio: "test-audio" },
    config: {},
    provider: "ffmpeg",
    status: "pending",
    metadata: null,
    output: null,
    ...overrides
  };
}

/**
 * Creates a mock Merge Videos node
 *
 * @param overrides - Partial properties to override defaults
 * @returns Complete MergeVideosNode for testing
 */
export function createMockMergeVideosNode(overrides?: Partial<MergeVideosNode>): MergeVideosNode {
  return {
    id: "test-merge-videos",
    pipelineId: "test-pipeline",
    type: "merge-videos",
    title: "Test Merge Videos",
    inputs: { segments: ["video-1", "video-2"] },
    config: {},
    provider: "ffmpeg",
    status: "pending",
    metadata: null,
    output: null,
    ...overrides
  };
}

/**
 * Creates a mock Compose Video node
 *
 * @param overrides - Partial properties to override defaults
 * @returns Complete ComposeVideoNode for testing
 */
export function createMockComposeVideoNode(overrides?: Partial<ComposeVideoNode>): ComposeVideoNode {
  return {
    id: "test-compose-video",
    pipelineId: "test-pipeline",
    type: "compose-video",
    title: "Test Compose Video",
    inputs: { background: "bg-video", overlay: "overlay-video" },
    config: {},
    provider: "ffmpeg",
    status: "pending",
    metadata: null,
    output: null,
    ...overrides
  };
}
