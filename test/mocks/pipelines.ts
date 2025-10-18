/**
 * Pipeline Mock Factories
 *
 * Provides helper functions to create mock pipelines for testing.
 */

import type { Pipeline } from "@/lib/types";

/**
 * Creates a mock Pipeline
 *
 * @param overrides - Partial properties to override defaults
 * @returns Complete Pipeline for testing
 *
 * Example:
 *   const pipeline = createMockPipeline({
 *     id: 'my-test-pipeline',
 *     title: 'My Test Pipeline'
 *   });
 */
export function createMockPipeline(overrides?: Partial<Pipeline>): Pipeline {
  return {
    uuid: "test-pipeline",
    version: "1.0",
    title: "Test Pipeline",
    created_at: new Date(),
    updated_at: new Date(),
    config: {
      storage: {
        bucket: "test-bucket",
        prefix: "test/"
      },
      workingDirectory: "./test/output"
    },
    metadata: {
      totalCost: 0,
      estimatedTotalCost: 0,
      progress: {
        completed: 0,
        in_progress: 0,
        pending: 0,
        failed: 0,
        total: 0
      }
    },
    ...overrides
  };
}
