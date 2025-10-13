/**
 * Pipeline Database Factories
 *
 * FactoryBot-style factories for creating Pipeline records in the database.
 * Unlike mocks which create in-memory objects, factories insert actual DB records.
 *
 * Usage:
 *   const pipeline = await createPipeline({ title: "My Pipeline" });
 */

import { query } from "@/test/helpers/db";
import type { Pipeline, PipelineConfig, PipelineMetadata } from "@/lib/types";

let factoryCounter = 0;

/**
 * Generates a unique pipeline ID for testing
 */
function generatePipelineId(): string {
  return `test-pipeline-${Date.now()}-${++factoryCounter}`;
}

/**
 * Default pipeline configuration
 */
function defaultPipelineConfig(): PipelineConfig {
  return {
    storage: {
      bucket: "test-bucket",
      prefix: "test/"
    },
    workingDirectory: "./test/output"
  };
}

/**
 * Default pipeline metadata
 */
function defaultPipelineMetadata(): PipelineMetadata {
  return {
    totalCost: 0,
    estimatedTotalCost: 0,
    progress: {
      completed: 0,
      in_progress: 0,
      pending: 0,
      failed: 0,
      total: 0
    }
  };
}

/**
 * Creates a pipeline in the database
 *
 * @param overrides - Partial pipeline properties to override defaults
 * @returns The created pipeline with all fields populated
 *
 * Example:
 *   const pipeline = await createPipeline({
 *     title: "My Test Pipeline",
 *     config: { storage: { bucket: "custom-bucket", prefix: "custom/" } }
 *   });
 */
export async function createPipeline(overrides: Partial<Pipeline> = {}): Promise<Pipeline> {
  const pipeline: Pipeline = {
    id: overrides.id ?? generatePipelineId(),
    version: overrides.version ?? "1.0",
    title: overrides.title ?? "Test Pipeline",
    created_at: overrides.created_at ?? new Date(),
    updated_at: overrides.updated_at ?? new Date(),
    config: overrides.config ?? defaultPipelineConfig(),
    metadata: overrides.metadata ?? defaultPipelineMetadata()
  };

  await query(
    `INSERT INTO pipelines (id, version, title, created_at, updated_at, config, metadata)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      pipeline.id,
      pipeline.version,
      pipeline.title,
      pipeline.created_at,
      pipeline.updated_at,
      pipeline.config,
      pipeline.metadata
    ]
  );

  return pipeline;
}

/**
 * Builds a pipeline object without inserting into the database
 *
 * Useful for testing serialization or when you need a pipeline object
 * but don't need it persisted.
 *
 * @param overrides - Partial pipeline properties to override defaults
 * @returns Pipeline object (not saved to database)
 */
export function buildPipeline(overrides: Partial<Pipeline> = {}): Pipeline {
  return {
    id: overrides.id ?? generatePipelineId(),
    version: overrides.version ?? "1.0",
    title: overrides.title ?? "Test Pipeline",
    created_at: overrides.created_at ?? new Date(),
    updated_at: overrides.updated_at ?? new Date(),
    config: overrides.config ?? defaultPipelineConfig(),
    metadata: overrides.metadata ?? defaultPipelineMetadata()
  };
}
