/**
 * Node Factory Tests
 *
 * Tests the conversion between database rows and type-safe Node objects.
 * Each test runs in an isolated transaction that is automatically rolled back.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { nodeFromDB, nodeToDB, validateNode } from "@/lib/nodes/factory";
import { testTransaction, query } from "@/test/helpers/db";
import { createMockTalkingHeadNode, createMockAssetNode, createMockRenderCodeNode } from "@/test/mocks";
import { createPipeline, createAssetNode, createTalkingHeadNode, createRenderCodeNode } from "@/test/factories";
import type { Node as DBNode } from "@/lib/types";

// Wrap each test in a transaction that rolls back automatically
beforeEach(testTransaction.start);
afterEach(testTransaction.rollback);

describe("nodeFromDB", () => {
  it("converts database row to AssetNode", async () => {
    // Create test pipeline first
    const pipeline = await createPipeline({ id: "test-pipeline" });

    // Create test node using factory
    await createAssetNode({
      id: "test-asset",
      pipelineId: pipeline.id,
      asset: { source: "./test.txt", type: "text" }
    });

    // Retrieve from database
    const [dbRow] = await query<DBNode>("SELECT * FROM nodes WHERE id = $1", ["test-asset"]);

    // Convert to domain model
    const node = nodeFromDB(dbRow);

    // Assertions
    expect(node.type).toBe("asset");
    expect(node.id).toBe("test-asset");
    expect(node.pipelineId).toBe("test-pipeline");
    if (node.type === "asset") {
      expect(node.asset.source).toBe("./test.txt");
      expect(node.asset.type).toBe("text");
    }
  });

  it("converts database row to TalkingHeadNode", async () => {
    // Create test node using factory
    await createTalkingHeadNode({
      id: "test-talking-head",
      inputs: { script: "test-script" },
      config: { provider: "heygen", avatarId: "avatar-1" }
    });

    const [dbRow] = await query<DBNode>("SELECT * FROM nodes WHERE id = $1", ["test-talking-head"]);

    const node = nodeFromDB(dbRow);

    expect(node.type).toBe("talking-head");
    if (node.type === "talking-head") {
      expect(node.inputs.script).toBe("test-script");
      expect(node.config.provider).toBe("heygen");
      expect(node.config.avatarId).toBe("avatar-1");
    }
  });

  it("converts database row to RenderCodeNode", async () => {
    // Create test node using factory
    await createRenderCodeNode({
      id: "test-render-code",
      inputs: { config: "test-config" },
      config: { provider: "remotion", compositionId: "code-scene" }
    });

    const [dbRow] = await query<DBNode>("SELECT * FROM nodes WHERE id = $1", ["test-render-code"]);

    const node = nodeFromDB(dbRow);

    expect(node.type).toBe("render-code");
    if (node.type === "render-code") {
      expect(node.inputs.config).toBe("test-config");
      expect(node.config.provider).toBe("remotion");
      expect(node.config.compositionId).toBe("code-scene");
    }
  });

  it("handles nodes with execution metadata", async () => {
    // Create test node with metadata using factory
    await createTalkingHeadNode({
      id: "test-node",
      config: { provider: "heygen" },
      status: "in_progress",
      metadata: { startedAt: new Date(), jobId: "job-123" }
    });

    const [dbRow] = await query<DBNode>("SELECT * FROM nodes WHERE id = $1", ["test-node"]);

    const node = nodeFromDB(dbRow);

    expect(node.status).toBe("in_progress");
    expect(node.metadata).toBeDefined();
    expect(node.metadata?.jobId).toBe("job-123");
  });
});

describe("nodeToDB", () => {
  it("converts AssetNode to database format", () => {
    const node = createMockAssetNode({
      id: "my-asset",
      pipelineId: "my-pipeline"
    });

    const dbRow = nodeToDB(node);

    expect(dbRow.id).toBe("my-asset");
    expect(dbRow.pipeline_id).toBe("my-pipeline");
    expect(dbRow.type).toBe("asset");
    expect(dbRow.asset).toBeDefined();
  });

  it("converts TalkingHeadNode to database format", () => {
    const node = createMockTalkingHeadNode({
      id: "my-talking-head",
      config: { provider: "heygen", avatarId: "test-avatar" }
    });

    const dbRow = nodeToDB(node);

    expect(dbRow.id).toBe("my-talking-head");
    expect(dbRow.type).toBe("talking-head");
    expect(dbRow.config.provider).toBe("heygen");
  });

  it("preserves JSONB config fields", () => {
    const node = createMockTalkingHeadNode({
      config: {
        provider: "heygen",
        customField: "custom-value",
        nested: { foo: "bar" }
      }
    });

    const dbRow = nodeToDB(node);

    expect(dbRow.config.customField).toBe("custom-value");
    expect(dbRow.config.nested).toEqual({ foo: "bar" });
  });
});

describe("validateNode", () => {
  it("validates AssetNode successfully", () => {
    const node = createMockAssetNode();
    const result = validateNode(node);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("catches missing asset configuration", () => {
    const node = createMockAssetNode();
    // @ts-expect-error - Intentionally removing required field for test
    delete node.asset;

    const result = validateNode(node);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Asset node missing asset configuration");
  });

  it("validates TalkingHeadNode successfully", () => {
    const node = createMockTalkingHeadNode();
    const result = validateNode(node);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("catches missing provider in TalkingHeadNode", () => {
    const node = createMockTalkingHeadNode({
      // @ts-expect-error - Intentionally omitting required provider field for test
      config: {} // Missing provider
    });

    const result = validateNode(node);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Talking head node missing provider");
  });

  it("validates RenderCodeNode successfully", () => {
    const node = createMockRenderCodeNode();
    const result = validateNode(node);

    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("catches missing config input in RenderCodeNode", () => {
    const node = createMockRenderCodeNode({
      inputs: {} // Missing config
    });

    const result = validateNode(node);

    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Render code node missing config input");
  });
});

describe("Database round-trip", () => {
  it("preserves node data through DB insert and retrieval", async () => {
    // Create node with custom config using factory
    const originalNode = await createTalkingHeadNode({
      id: "roundtrip-test",
      config: {
        provider: "heygen",
        avatarId: "avatar-123",
        customSetting: "test-value"
      }
    });

    // Retrieve from DB
    const [retrieved] = await query<DBNode>("SELECT * FROM nodes WHERE id = $1", ["roundtrip-test"]);

    // Convert back to domain model
    const retrievedNode = nodeFromDB(retrieved);

    // Verify data preservation
    expect(retrievedNode.id).toBe(originalNode.id);
    expect(retrievedNode.type).toBe(originalNode.type);
    if (retrievedNode.type === "talking-head") {
      expect(retrievedNode.config.provider).toBe("heygen");
      expect(retrievedNode.config.avatarId).toBe("avatar-123");
      expect(retrievedNode.config.customSetting).toBe("test-value");
    }
  });
});
