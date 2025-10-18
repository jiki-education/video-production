/**
 * Type-Safe Node Discriminated Unions
 *
 * These types represent the domain model for pipeline nodes.
 * Inputs and config types are auto-generated from Rails API schemas.
 *
 * Source of truth: api/typescript/src/nodes.ts
 *
 * To update types:
 * 1. cd ../api
 * 2. bundle exec rake typescript:generate
 * 3. cd ../code-videos
 * 4. pnpm install
 */

import type { NodeStatus, NodeMetadata, NodeOutput, AssetConfig } from "@/lib/types";

// Import generated node types from API
import type {
  AssetNode as ApiAssetNode,
  GenerateTalkingHeadNode as ApiGenerateTalkingHeadNode,
  GenerateAnimationNode as ApiGenerateAnimationNode,
  GenerateVoiceoverNode as ApiGenerateVoiceoverNode,
  RenderCodeNode as ApiRenderCodeNode,
  MixAudioNode as ApiMixAudioNode,
  MergeVideosNode as ApiMergeVideosNode,
  ComposeVideoNode as ApiComposeVideoNode
} from "@jiki/api-types";

// ============================================================================
// Base Node Interface
// ============================================================================

/**
 * Base properties that all nodes have in the frontend.
 * The API types provide inputs/config, we add UI state.
 */
interface BaseNode {
  id: string;
  pipelineId: string;
  title: string; // Display title for the node
  status: NodeStatus;
  metadata: NodeMetadata | null;
  output: NodeOutput | null;
}

// ============================================================================
// Specific Node Types
// ============================================================================

/**
 * Asset Node - Static files (scripts, configs, images)
 * Extends API type and adds frontend-specific asset config
 */
export type AssetNode = BaseNode &
  ApiAssetNode & {
    asset: AssetConfig;
  };

/**
 * Generate Talking Head Node - AI presenter videos (HeyGen)
 * Note: Renamed from "talking-head" to "generate-talking-head" in API
 */
export type GenerateTalkingHeadNode = BaseNode & ApiGenerateTalkingHeadNode;

/**
 * Generate Animation Node - AI video generation (Veo 3, Runway, Stability)
 */
export type GenerateAnimationNode = BaseNode & ApiGenerateAnimationNode;

/**
 * Generate Voiceover Node - Text-to-speech (ElevenLabs)
 */
export type GenerateVoiceoverNode = BaseNode & ApiGenerateVoiceoverNode;

/**
 * Render Code Node - Code screen animations (Remotion)
 */
export type RenderCodeNode = BaseNode & ApiRenderCodeNode;

/**
 * Mix Audio Node - Audio replacement/overlay (FFmpeg)
 */
export type MixAudioNode = BaseNode & ApiMixAudioNode;

/**
 * Merge Videos Node - Concatenate video segments (FFmpeg)
 */
export type MergeVideosNode = BaseNode & ApiMergeVideosNode;

/**
 * Compose Video Node - Picture-in-picture, overlays (FFmpeg)
 */
export type ComposeVideoNode = BaseNode & ApiComposeVideoNode;

// ============================================================================
// Discriminated Union
// ============================================================================

/**
 * Node is a discriminated union of all node types.
 * TypeScript can narrow the type based on the `type` field.
 *
 * Example:
 *   function handleNode(node: Node) {
 *     if (node.type === 'generate-talking-head') {
 *       // TypeScript knows node is GenerateTalkingHeadNode here
 *       console.log(node.config);
 *     }
 *   }
 */
export type Node =
  | AssetNode
  | GenerateTalkingHeadNode
  | GenerateAnimationNode
  | GenerateVoiceoverNode
  | RenderCodeNode
  | MixAudioNode
  | MergeVideosNode
  | ComposeVideoNode;

/**
 * Extract the type field from all node types
 */
export type NodeType = Node["type"];

// ============================================================================
// Type Guards
// ============================================================================

export function isAssetNode(node: Node): node is AssetNode {
  return node.type === "asset";
}

export function isGenerateTalkingHeadNode(node: Node): node is GenerateTalkingHeadNode {
  return node.type === "generate-talking-head";
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
