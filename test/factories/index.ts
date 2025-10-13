/**
 * Test Factories Index
 *
 * Exports all database factories for convenient importing.
 *
 * Usage:
 *   import { createPipeline, createTalkingHeadNode } from '@/test/factories';
 */

// Pipeline factories
export { createPipeline, buildPipeline } from "./pipelines";

// Node factories
export {
  createAssetNode,
  createTalkingHeadNode,
  createRenderCodeNode,
  createGenerateAnimationNode,
  createGenerateVoiceoverNode,
  createMixAudioNode,
  createMergeVideosNode,
  createComposeVideoNode
} from "./nodes";
