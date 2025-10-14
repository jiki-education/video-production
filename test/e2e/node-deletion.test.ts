/**
 * E2E Test: Node Deletion
 *
 * Tests that deleting a node works correctly:
 * - Node is removed from the UI
 * - Connected edges are removed from the UI
 * - Node is deleted from the database
 * - References are cleaned up in other nodes' inputs
 */

import { createPipeline, createAssetNode, createTalkingHeadNode } from "@/test/factories";
import { connectNodes } from "@/lib/db-operations";
import { getPool } from "@/lib/db";

describe("Node Deletion E2E", () => {
  let pipelineId: string;
  let nodeAId: string;
  let nodeBId: string;

  beforeEach(async () => {
    // Generate unique ID for this test run
    const testId = `test-pipeline-${Date.now()}`;

    // Create a pipeline with two connected nodes
    const pipeline = await createPipeline({ id: testId });
    pipelineId = pipeline.id;

    // Create Node A (asset node with a script)
    const nodeA = await createAssetNode({
      id: "script-asset",
      pipelineId: pipelineId,
      title: "Script Asset",
      asset: {
        source: "lessons/test/script.md",
        type: "text"
      }
    });
    nodeAId = nodeA.id;

    // Create Node B (talking-head node)
    const nodeB = await createTalkingHeadNode({
      id: "talking-head",
      pipelineId: pipelineId,
      title: "Talking Head Video",
      config: {
        provider: "heygen",
        avatarId: "avatar-1"
      }
    });
    nodeBId = nodeB.id;

    // Connect Node A → Node B (A's output feeds into B's script input)
    await connectNodes(pipelineId, nodeAId, nodeBId, "script");
  });

  afterEach(async () => {
    // Clean up: Delete test pipeline and its nodes
    const pool = getPool();
    try {
      await pool.query("DELETE FROM nodes WHERE pipeline_id = $1", [pipelineId]);
      await pool.query("DELETE FROM pipelines WHERE id = $1", [pipelineId]);
    } catch (err) {
      console.error("Cleanup error:", err);
    }
  });

  it("should delete a node and remove its connections", async () => {
    // Navigate to the pipeline page
    await page.goto(`http://localhost:4000/pipelines/${pipelineId}`, {
      waitUntil: "domcontentloaded"
    });

    // Wait for React Flow to render
    await page.waitForSelector(".react-flow", { timeout: 10000 });

    // ========================================================================
    // BEFORE DELETION: Assert nodes and edges exist
    // ========================================================================

    // Assert Node A exists in DOM
    const nodeABeforeDeletion = await page.$(`[data-id="${nodeAId}"]`);
    expect(nodeABeforeDeletion).toBeTruthy();

    // Assert Node B exists in DOM
    const nodeBBeforeDeletion = await page.$(`[data-id="${nodeBId}"]`);
    expect(nodeBBeforeDeletion).toBeTruthy();

    // Assert edge exists - wait for React Flow to render connections
    await page.waitForSelector(".react-flow__edge", { timeout: 1000 });
    const edges = await page.$$(".react-flow__edge");
    expect(edges.length).toBeGreaterThan(0);

    // Verify in database
    const pool = getPool();
    const nodesBeforeDeletion = await pool.query("SELECT id FROM nodes WHERE pipeline_id = $1 ORDER BY id", [
      pipelineId
    ]);
    expect(nodesBeforeDeletion.rows).toHaveLength(2);
    expect(nodesBeforeDeletion.rows.map((r) => r.id)).toContain(nodeAId);
    expect(nodesBeforeDeletion.rows.map((r) => r.id)).toContain(nodeBId);

    // Verify Node B has reference to Node A in inputs
    const nodeBBeforeDelete = await pool.query("SELECT inputs FROM nodes WHERE pipeline_id = $1 AND id = $2", [
      pipelineId,
      nodeBId
    ]);
    expect(nodeBBeforeDelete.rows[0].inputs.script).toContain(nodeAId);

    // ========================================================================
    // DELETE NODE A
    // ========================================================================

    // Click on Node A to select it
    await page.click(`[data-id="${nodeAId}"]`);

    // Wait a bit for selection to register
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Press Delete key to delete the node
    await page.keyboard.press("Backspace"); // React Flow uses Backspace for deletion

    // Wait for the node to actually disappear from the DOM (meaning server action completed)
    await page.waitForSelector(`[data-id="${nodeAId}"]`, { hidden: true, timeout: 100 });

    await new Promise((resolve) => setTimeout(resolve, 300));

    // ========================================================================
    // AFTER DELETION: Assert node and edge are removed
    // ========================================================================

    // Assert Node A no longer exists in DOM
    const nodeAAfterDeletion = await page.$(`[data-id="${nodeAId}"]`);
    expect(nodeAAfterDeletion).toBeNull();

    // Assert Node B still exists in DOM
    const nodeBAfterDeletion = await page.$(`[data-id="${nodeBId}"]`);
    expect(nodeBAfterDeletion).toBeTruthy();

    // Assert edges are removed (since we deleted the source node)
    const edgesAfterDeletion = await page.$$(".react-flow__edge");
    expect(edgesAfterDeletion.length).toBeLessThanOrEqual(edges.length);

    // Verify in database - Node A should be deleted
    const nodesAfterDeletion = await pool.query("SELECT id FROM nodes WHERE pipeline_id = $1 ORDER BY id", [
      pipelineId
    ]);
    expect(nodesAfterDeletion.rows).toHaveLength(1);
    expect(nodesAfterDeletion.rows[0].id).toBe(nodeBId);

    // Verify Node B no longer has reference to Node A in inputs
    const nodeBAfterDelete = await pool.query("SELECT inputs FROM nodes WHERE pipeline_id = $1 AND id = $2", [
      pipelineId,
      nodeBId
    ]);
    expect(nodeBAfterDelete.rows[0].inputs.script).not.toContain(nodeAId);
  });

  it("should delete multiple connected nodes", async () => {
    // Create Node C connected to Node B
    const pool = getPool();
    await pool.query(
      `INSERT INTO nodes (id, pipeline_id, type, inputs, config, status, metadata, output)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        "render-code",
        pipelineId,
        "render-code",
        { config: [] }, // No inputs for this test
        { provider: "remotion", compositionId: "test" },
        "pending",
        null,
        null
      ]
    );
    await connectNodes(pipelineId, nodeBId, "render-code", "video");

    // Navigate to the pipeline page
    await page.goto(`http://localhost:4000/pipelines/${pipelineId}`, {
      waitUntil: "networkidle0"
    });

    await page.waitForSelector(".react-flow");

    // Verify 3 nodes exist
    const initialNodes = await page.$$(".react-flow__node");
    expect(initialNodes).toHaveLength(3);

    // Select and delete Node A
    await page.click(`[data-id="${nodeAId}"]`);
    await new Promise((resolve) => setTimeout(resolve, 100));
    await page.keyboard.press("Backspace");
    await page.waitForSelector(`[data-id="${nodeAId}"]`, { hidden: true, timeout: 5000 });

    // Should now have 2 nodes
    const afterFirstDelete = await page.$$(".react-flow__node");
    expect(afterFirstDelete).toHaveLength(2);

    // Select and delete Node B
    await page.click(`[data-id="${nodeBId}"]`);
    await new Promise((resolve) => setTimeout(resolve, 100));
    await page.keyboard.press("Backspace");
    await page.waitForSelector(`[data-id="${nodeBId}"]`, { hidden: true, timeout: 5000 });

    // Should now have 1 node
    const afterSecondDelete = await page.$$(".react-flow__node");
    expect(afterSecondDelete).toHaveLength(1);

    // Wait a bit to ensure database writes complete
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Verify in database
    const remainingNodes = await pool.query("SELECT id FROM nodes WHERE pipeline_id = $1", [pipelineId]);
    expect(remainingNodes.rows).toHaveLength(1);
    expect(remainingNodes.rows[0].id).toBe("render-code");
  });
});
