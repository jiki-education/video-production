/**
 * Unit Tests: Database Operations
 *
 * Tests for atomic database operations in lib/db-operations.ts
 * Each test runs in an isolated transaction that is automatically rolled back.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createNode, deleteNode, connectNodes, reorderNodeInputs } from "@/lib/db-operations";
import { createPipeline, createMergeVideosNode } from "@/test/factories";
import { testTransaction } from "@/test/helpers/db";
import { getPool } from "@/lib/db";

describe("createNode", () => {
  beforeEach(testTransaction.start);
  afterEach(testTransaction.rollback);

  it("creates a node with valid input", async () => {
    const pipeline = await createPipeline();

    const node = await createNode(pipeline.id, {
      id: "test-node",
      type: "asset",
      inputs: {},
      config: { source: "test.txt" },
      asset: { source: "test.txt", type: "text" }
    });

    expect(node.id).toBe("test-node");
    expect(node.pipeline_id).toBe(pipeline.id);
    expect(node.type).toBe("asset");
    expect(node.status).toBe("pending");
  });

  it("throws error when pipeline does not exist", async () => {
    await expect(
      createNode("non-existent-pipeline", {
        id: "test-node",
        type: "asset",
        inputs: {},
        config: {}
      })
    ).rejects.toThrow("Pipeline not found: non-existent-pipeline");
  });

  it("throws error when node ID already exists", async () => {
    const pipeline = await createPipeline();

    await createNode(pipeline.id, {
      id: "duplicate-node",
      type: "asset",
      inputs: {},
      config: {}
    });

    await expect(
      createNode(pipeline.id, {
        id: "duplicate-node",
        type: "asset",
        inputs: {},
        config: {}
      })
    ).rejects.toThrow(`Node already exists: ${pipeline.id}/duplicate-node`);
  });

  it("updates pipeline timestamp", async () => {
    const pipeline = await createPipeline();

    const pool = getPool();

    // Set timestamp to a known past value
    await pool.query("UPDATE pipelines SET updated_at = '2020-01-01 00:00:00' WHERE id = $1", [pipeline.id]);

    await createNode(pipeline.id, {
      id: "test-node",
      type: "asset",
      inputs: {},
      config: {}
    });

    // Verify timestamp was updated (should be much later than 2020)
    const afterResult = await pool.query("SELECT updated_at FROM pipelines WHERE id = $1", [pipeline.id]);
    const timestampAfter = new Date(afterResult.rows[0].updated_at);
    const pastDate = new Date("2020-01-01");

    expect(timestampAfter.getTime()).toBeGreaterThan(pastDate.getTime());
  });
});

describe("deleteNode", () => {
  beforeEach(testTransaction.start);
  afterEach(testTransaction.rollback);

  it("deletes a node", async () => {
    const pipeline = await createPipeline();
    const node = await createNode(pipeline.id, {
      id: "delete-me",
      type: "asset",
      inputs: {},
      config: {}
    });

    await deleteNode(pipeline.id, node.id);

    const pool = getPool();
    const result = await pool.query("SELECT * FROM nodes WHERE pipeline_id = $1 AND id = $2", [pipeline.id, node.id]);

    expect(result.rows).toHaveLength(0);
  });

  it("throws error when node does not exist", async () => {
    const pipeline = await createPipeline();

    await expect(deleteNode(pipeline.id, "non-existent-node")).rejects.toThrow(
      `Node not found: ${pipeline.id}/non-existent-node`
    );
  });

  it("cleans up references in other nodes (array inputs)", async () => {
    const pipeline = await createPipeline();

    // Create three video nodes
    const video1 = await createNode(pipeline.id, {
      id: "video1",
      type: "render-code",
      inputs: {},
      config: { provider: "remotion" }
    });

    const video2 = await createNode(pipeline.id, {
      id: "video2",
      type: "render-code",
      inputs: {},
      config: { provider: "remotion" }
    });

    const video3 = await createNode(pipeline.id, {
      id: "video3",
      type: "render-code",
      inputs: {},
      config: { provider: "remotion" }
    });

    // Create merge node that references all three
    const mergeNode = await createNode(pipeline.id, {
      id: "merge",
      type: "merge-videos",
      inputs: { segments: [] },
      config: { provider: "ffmpeg" }
    });

    // Connect all videos to merge node
    await connectNodes(pipeline.id, video1.id, mergeNode.id, "segments");
    await connectNodes(pipeline.id, video2.id, mergeNode.id, "segments");
    await connectNodes(pipeline.id, video3.id, mergeNode.id, "segments");

    // Verify connections exist
    const pool = getPool();
    let result = await pool.query("SELECT inputs FROM nodes WHERE pipeline_id = $1 AND id = $2", [
      pipeline.id,
      mergeNode.id
    ]);
    expect(result.rows[0].inputs.segments).toEqual([video1.id, video2.id, video3.id]);

    // Delete video2
    await deleteNode(pipeline.id, video2.id);

    // Verify video2 is removed from segments array
    result = await pool.query("SELECT inputs FROM nodes WHERE pipeline_id = $1 AND id = $2", [
      pipeline.id,
      mergeNode.id
    ]);
    expect(result.rows[0].inputs.segments).toEqual([video1.id, video3.id]);
    expect(result.rows[0].inputs.segments).not.toContain(video2.id);
  });

  it("updates pipeline timestamp", async () => {
    const pipeline = await createPipeline();
    const node = await createNode(pipeline.id, {
      id: "delete-me",
      type: "asset",
      inputs: {},
      config: {}
    });

    const pool = getPool();

    // Set timestamp to a known past value
    await pool.query("UPDATE pipelines SET updated_at = '2020-01-01 00:00:00' WHERE id = $1", [pipeline.id]);

    await deleteNode(pipeline.id, node.id);

    // Verify timestamp was updated (should be much later than 2020)
    const afterResult = await pool.query("SELECT updated_at FROM pipelines WHERE id = $1", [pipeline.id]);
    const timestampAfter = new Date(afterResult.rows[0].updated_at);
    const pastDate = new Date("2020-01-01");

    expect(timestampAfter.getTime()).toBeGreaterThan(pastDate.getTime());
  });
});

describe("connectNodes", () => {
  beforeEach(testTransaction.start);
  afterEach(testTransaction.rollback);

  it("connects two nodes by appending to input array", async () => {
    const pipeline = await createPipeline();

    const sourceNode = await createNode(pipeline.id, {
      id: "source",
      type: "asset",
      inputs: {},
      config: {}
    });

    const targetNode = await createNode(pipeline.id, {
      id: "target",
      type: "render-code",
      inputs: {},
      config: { provider: "remotion" }
    });

    await connectNodes(pipeline.id, sourceNode.id, targetNode.id, "config");

    const pool = getPool();
    const result = await pool.query("SELECT inputs FROM nodes WHERE pipeline_id = $1 AND id = $2", [
      pipeline.id,
      targetNode.id
    ]);

    expect(result.rows[0].inputs.config).toEqual([sourceNode.id]);
  });

  it("appends to existing input array", async () => {
    const pipeline = await createPipeline();

    const video1 = await createNode(pipeline.id, {
      id: "video1",
      type: "render-code",
      inputs: {},
      config: { provider: "remotion" }
    });

    const video2 = await createNode(pipeline.id, {
      id: "video2",
      type: "render-code",
      inputs: {},
      config: { provider: "remotion" }
    });

    const mergeNode = await createMergeVideosNode({
      pipelineId: pipeline.id,
      id: "merge"
    });

    await connectNodes(pipeline.id, video1.id, mergeNode.id, "segments");
    await connectNodes(pipeline.id, video2.id, mergeNode.id, "segments");

    const pool = getPool();
    const result = await pool.query("SELECT inputs FROM nodes WHERE pipeline_id = $1 AND id = $2", [
      pipeline.id,
      mergeNode.id
    ]);

    expect(result.rows[0].inputs.segments).toEqual([video1.id, video2.id]);
  });

  it("prevents duplicate connections", async () => {
    const pipeline = await createPipeline();

    const sourceNode = await createNode(pipeline.id, {
      id: "source",
      type: "asset",
      inputs: {},
      config: {}
    });

    const targetNode = await createNode(pipeline.id, {
      id: "target",
      type: "render-code",
      inputs: {},
      config: { provider: "remotion" }
    });

    await connectNodes(pipeline.id, sourceNode.id, targetNode.id, "config");
    await connectNodes(pipeline.id, sourceNode.id, targetNode.id, "config"); // Duplicate

    const pool = getPool();
    const result = await pool.query("SELECT inputs FROM nodes WHERE pipeline_id = $1 AND id = $2", [
      pipeline.id,
      targetNode.id
    ]);

    // Should only have one entry, not two
    expect(result.rows[0].inputs.config).toEqual([sourceNode.id]);
  });

  it("throws error when source node does not exist", async () => {
    const pipeline = await createPipeline();

    const targetNode = await createNode(pipeline.id, {
      id: "target",
      type: "render-code",
      inputs: {},
      config: { provider: "remotion" }
    });

    await expect(connectNodes(pipeline.id, "non-existent", targetNode.id, "config")).rejects.toThrow(
      `Source node not found: ${pipeline.id}/non-existent`
    );
  });

  it("throws error when target node does not exist", async () => {
    const pipeline = await createPipeline();

    const sourceNode = await createNode(pipeline.id, {
      id: "source",
      type: "asset",
      inputs: {},
      config: {}
    });

    await expect(connectNodes(pipeline.id, sourceNode.id, "non-existent", "config")).rejects.toThrow(
      `Target node not found: ${pipeline.id}/non-existent`
    );
  });

  it("updates pipeline timestamp", async () => {
    const pipeline = await createPipeline();

    const sourceNode = await createNode(pipeline.id, {
      id: "source",
      type: "asset",
      inputs: {},
      config: {}
    });

    const targetNode = await createNode(pipeline.id, {
      id: "target",
      type: "render-code",
      inputs: {},
      config: { provider: "remotion" }
    });

    const pool = getPool();

    // Set timestamp to a known past value
    await pool.query("UPDATE pipelines SET updated_at = '2020-01-01 00:00:00' WHERE id = $1", [pipeline.id]);

    await connectNodes(pipeline.id, sourceNode.id, targetNode.id, "config");

    // Verify timestamp was updated (should be much later than 2020)
    const afterResult = await pool.query("SELECT updated_at FROM pipelines WHERE id = $1", [pipeline.id]);
    const timestampAfter = new Date(afterResult.rows[0].updated_at);
    const pastDate = new Date("2020-01-01");

    expect(timestampAfter.getTime()).toBeGreaterThan(pastDate.getTime());
  });
});

describe("reorderNodeInputs", () => {
  beforeEach(testTransaction.start);
  afterEach(testTransaction.rollback);

  it("reorders input array", async () => {
    const pipeline = await createPipeline();

    // Create three video nodes
    const video1 = await createNode(pipeline.id, {
      id: "video1",
      type: "render-code",
      inputs: {},
      config: { provider: "remotion" }
    });

    const video2 = await createNode(pipeline.id, {
      id: "video2",
      type: "render-code",
      inputs: {},
      config: { provider: "remotion" }
    });

    const video3 = await createNode(pipeline.id, {
      id: "video3",
      type: "render-code",
      inputs: {},
      config: { provider: "remotion" }
    });

    // Create merge node
    const mergeNode = await createMergeVideosNode({
      pipelineId: pipeline.id,
      id: "merge"
    });

    // Connect in order: video1, video2, video3
    await connectNodes(pipeline.id, video1.id, mergeNode.id, "segments");
    await connectNodes(pipeline.id, video2.id, mergeNode.id, "segments");
    await connectNodes(pipeline.id, video3.id, mergeNode.id, "segments");

    // Reorder to: video3, video1, video2
    await reorderNodeInputs(pipeline.id, mergeNode.id, "segments", [video3.id, video1.id, video2.id]);

    const pool = getPool();
    const result = await pool.query("SELECT inputs FROM nodes WHERE pipeline_id = $1 AND id = $2", [
      pipeline.id,
      mergeNode.id
    ]);

    expect(result.rows[0].inputs.segments).toEqual([video3.id, video1.id, video2.id]);
  });

  it("sets node status to pending after reordering", async () => {
    const pipeline = await createPipeline();

    const video1 = await createNode(pipeline.id, {
      id: "video1",
      type: "render-code",
      inputs: {},
      config: { provider: "remotion" }
    });

    const video2 = await createNode(pipeline.id, {
      id: "video2",
      type: "render-code",
      inputs: {},
      config: { provider: "remotion" }
    });

    const mergeNode = await createMergeVideosNode({
      pipelineId: pipeline.id,
      id: "merge"
    });

    await connectNodes(pipeline.id, video1.id, mergeNode.id, "segments");
    await connectNodes(pipeline.id, video2.id, mergeNode.id, "segments");

    // Manually set status to completed
    const pool = getPool();
    await pool.query("UPDATE nodes SET status = 'completed' WHERE pipeline_id = $1 AND id = $2", [
      pipeline.id,
      mergeNode.id
    ]);

    // Verify status is completed
    let result = await pool.query("SELECT status FROM nodes WHERE pipeline_id = $1 AND id = $2", [
      pipeline.id,
      mergeNode.id
    ]);
    expect(result.rows[0].status).toBe("completed");

    // Reorder
    await reorderNodeInputs(pipeline.id, mergeNode.id, "segments", [video2.id, video1.id]);

    // Verify status is now pending
    result = await pool.query("SELECT status FROM nodes WHERE pipeline_id = $1 AND id = $2", [
      pipeline.id,
      mergeNode.id
    ]);
    expect(result.rows[0].status).toBe("pending");
  });

  it("throws error when node does not exist", async () => {
    const pipeline = await createPipeline();

    await expect(reorderNodeInputs(pipeline.id, "non-existent", "segments", ["a", "b"])).rejects.toThrow(
      `Node not found: ${pipeline.id}/non-existent`
    );
  });

  it("throws error when input key is not an array", async () => {
    const pipeline = await createPipeline();

    const node = await createNode(pipeline.id, {
      id: "test-node",
      type: "render-code",
      inputs: {},
      config: { provider: "remotion" }
    });

    await expect(reorderNodeInputs(pipeline.id, node.id, "config", ["a", "b"])).rejects.toThrow(
      `Input key "config" is not an array for node: ${pipeline.id}/${node.id}`
    );
  });

  it("throws error when new order contains different node IDs", async () => {
    const pipeline = await createPipeline();

    const video1 = await createNode(pipeline.id, {
      id: "video1",
      type: "render-code",
      inputs: {},
      config: { provider: "remotion" }
    });

    const video2 = await createNode(pipeline.id, {
      id: "video2",
      type: "render-code",
      inputs: {},
      config: { provider: "remotion" }
    });

    const mergeNode = await createMergeVideosNode({
      pipelineId: pipeline.id,
      id: "merge"
    });

    await connectNodes(pipeline.id, video1.id, mergeNode.id, "segments");
    await connectNodes(pipeline.id, video2.id, mergeNode.id, "segments");

    // Try to reorder with different node IDs
    await expect(reorderNodeInputs(pipeline.id, mergeNode.id, "segments", ["video1", "video3"])).rejects.toThrow(
      /New order must contain the same node IDs/
    );
  });

  it("throws error when new order has different length", async () => {
    const pipeline = await createPipeline();

    const video1 = await createNode(pipeline.id, {
      id: "video1",
      type: "render-code",
      inputs: {},
      config: { provider: "remotion" }
    });

    const video2 = await createNode(pipeline.id, {
      id: "video2",
      type: "render-code",
      inputs: {},
      config: { provider: "remotion" }
    });

    const mergeNode = await createMergeVideosNode({
      pipelineId: pipeline.id,
      id: "merge"
    });

    await connectNodes(pipeline.id, video1.id, mergeNode.id, "segments");
    await connectNodes(pipeline.id, video2.id, mergeNode.id, "segments");

    // Try to reorder with only one node
    await expect(reorderNodeInputs(pipeline.id, mergeNode.id, "segments", ["video1"])).rejects.toThrow(
      /New order must contain the same node IDs/
    );
  });

  it("updates pipeline timestamp", async () => {
    const pipeline = await createPipeline();

    const video1 = await createNode(pipeline.id, {
      id: "video1",
      type: "render-code",
      inputs: {},
      config: { provider: "remotion" }
    });

    const video2 = await createNode(pipeline.id, {
      id: "video2",
      type: "render-code",
      inputs: {},
      config: { provider: "remotion" }
    });

    const mergeNode = await createMergeVideosNode({
      pipelineId: pipeline.id,
      id: "merge"
    });

    await connectNodes(pipeline.id, video1.id, mergeNode.id, "segments");
    await connectNodes(pipeline.id, video2.id, mergeNode.id, "segments");

    const pool = getPool();

    // Set timestamp to a known past value
    await pool.query("UPDATE pipelines SET updated_at = '2020-01-01 00:00:00' WHERE id = $1", [pipeline.id]);

    await reorderNodeInputs(pipeline.id, mergeNode.id, "segments", [video2.id, video1.id]);

    // Verify timestamp was updated (should be much later than 2020)
    const afterResult = await pool.query("SELECT updated_at FROM pipelines WHERE id = $1", [pipeline.id]);
    const timestampAfter = new Date(afterResult.rows[0].updated_at);
    const pastDate = new Date("2020-01-01");

    expect(timestampAfter.getTime()).toBeGreaterThan(pastDate.getTime());
  });
});
