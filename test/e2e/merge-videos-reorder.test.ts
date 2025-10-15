/**
 * E2E Test: Merge Videos Node Segment Reordering
 *
 * Tests that reordering segments in a merge-videos node works correctly:
 * - Segments are displayed in the correct order in the RHS panel
 * - Drag-and-drop reordering updates the UI
 * - Changes are persisted to the database
 * - Node status is set to 'pending' after reorder
 */

import { createPipeline, createTalkingHeadNode, createMergeVideosNode } from "@/test/factories";
import { connectNodes } from "@/lib/db-operations";
import { getPool } from "@/lib/db";

describe("Merge Videos Node Segment Reordering E2E", () => {
  let pipelineId: string;
  let segment1Id: string;
  let segment2Id: string;
  let segment3Id: string;
  let mergeNodeId: string;

  beforeEach(async () => {
    // Generate unique ID for this test run
    const testId = `test-pipeline-${Date.now()}`;

    // Create a pipeline
    const pipeline = await createPipeline({ id: testId });
    pipelineId = pipeline.id;

    // Create 3 video segment nodes
    const segment1 = await createTalkingHeadNode({
      id: "segment-1",
      pipelineId: pipelineId,
      title: "Intro Video",
      config: {
        provider: "heygen",
        avatarId: "avatar-1"
      }
    });
    segment1Id = segment1.id;

    const segment2 = await createTalkingHeadNode({
      id: "segment-2",
      pipelineId: pipelineId,
      title: "Main Content",
      config: {
        provider: "heygen",
        avatarId: "avatar-1"
      }
    });
    segment2Id = segment2.id;

    const segment3 = await createTalkingHeadNode({
      id: "segment-3",
      pipelineId: pipelineId,
      title: "Outro Video",
      config: {
        provider: "heygen",
        avatarId: "avatar-1"
      }
    });
    segment3Id = segment3.id;

    // Create merge-videos node
    const mergeNode = await createMergeVideosNode({
      id: "merge-videos",
      pipelineId: pipelineId,
      title: "Final Video",
      config: {
        provider: "ffmpeg"
      }
    });
    mergeNodeId = mergeNode.id;

    // Connect segments to merge node in specific order
    await connectNodes(pipelineId, segment1Id, mergeNodeId, "segments");
    await connectNodes(pipelineId, segment2Id, mergeNodeId, "segments");
    await connectNodes(pipelineId, segment3Id, mergeNodeId, "segments");
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

  it("should reorder segments via drag-and-drop and persist to database", async () => {
    // Navigate to the pipeline page
    await page.goto(`http://localhost:4000/pipelines/${pipelineId}`, {
      waitUntil: "domcontentloaded"
    });

    // Wait for React Flow to render
    await page.waitForSelector(".react-flow", { timeout: 1000 });

    // Wait for all nodes to be rendered in React Flow (should be 4 nodes total)
    await page.waitForFunction(() => document.querySelectorAll(".react-flow__node").length === 4, { timeout: 1000 });

    // ========================================================================
    // SELECT MERGE-VIDEOS NODE TO OPEN RHS PANEL
    // ========================================================================

    // Click on merge-videos node to select it and open RHS panel
    await page.click(`[data-id="${mergeNodeId}"]`);

    // Wait a moment for the RHS panel to update
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Wait for segment items to be rendered (should be 3 segments)
    await page.waitForFunction(() => document.querySelectorAll(".flex.items-center.gap-3.bg-gray-50").length === 3, {
      timeout: 1000
    });

    // ========================================================================
    // VERIFY INITIAL ORDER IN RHS
    // ========================================================================

    const pool = getPool();

    // Verify database initial state
    const initialDbState = await pool.query("SELECT inputs FROM nodes WHERE pipeline_id = $1 AND id = $2", [
      pipelineId,
      mergeNodeId
    ]);
    const initialSegments = initialDbState.rows[0].inputs.segments;
    expect(initialSegments).toEqual([segment1Id, segment2Id, segment3Id]);

    // Verify RHS shows 3 segments
    const segmentItems = await page.$$(".flex.items-center.gap-3.bg-gray-50");
    expect(segmentItems.length).toBe(3);

    // Verify segment numbers show correct positions (1, 2, 3)
    const segmentNumbers = await page.$$eval(".bg-blue-100.text-blue-700", (els) =>
      els.map((el) => el.textContent?.trim())
    );
    expect(segmentNumbers).toEqual(["1", "2", "3"]);

    // ========================================================================
    // PERFORM DRAG-AND-DROP: Move segment 3 to position 1
    // ========================================================================

    // Get bounding boxes of segments
    const segment1Box = await segmentItems[0].boundingBox();
    const segment3Box = await segmentItems[2].boundingBox();

    if (!segment1Box || !segment3Box) {
      throw new Error("Could not get segment bounding boxes");
    }

    // Calculate drag positions (center of each segment)
    const segment3CenterX = segment3Box.x + segment3Box.width / 2;
    const segment3CenterY = segment3Box.y + segment3Box.height / 2;
    const segment1CenterX = segment1Box.x + segment1Box.width / 2;
    const segment1CenterY = segment1Box.y + segment1Box.height / 2;

    // Perform drag: segment 3 -> segment 1 position
    await page.mouse.move(segment3CenterX, segment3CenterY);
    await page.mouse.down();
    await page.mouse.move(segment1CenterX, segment1CenterY, { steps: 10 });
    await page.mouse.up();

    // Wait for reorder animation and database update to complete
    await new Promise((resolve) => setTimeout(resolve, 500));

    // ========================================================================
    // VERIFY RHS SHOWS NEW ORDER
    // ========================================================================

    // Verify segments are still displayed (3 total)
    const reorderedSegmentItems = await page.$$(".flex.items-center.gap-3.bg-gray-50");
    expect(reorderedSegmentItems.length).toBe(3);

    // Verify segment numbers still show correct positions after reorder (1, 2, 3)
    const newSegmentNumbers = await page.$$eval(".bg-blue-100.text-blue-700", (els) =>
      els.map((el) => el.textContent?.trim())
    );
    expect(newSegmentNumbers).toEqual(["1", "2", "3"]);

    // ========================================================================
    // VERIFY DATABASE PERSISTED THE CHANGES
    // ========================================================================

    // Query database to verify new order
    const finalDbState = await pool.query("SELECT inputs, status FROM nodes WHERE pipeline_id = $1 AND id = $2", [
      pipelineId,
      mergeNodeId
    ]);
    const finalSegments = finalDbState.rows[0].inputs.segments;
    const finalStatus = finalDbState.rows[0].status;

    // Verify segments array in database matches new order
    expect(finalSegments).toEqual([segment3Id, segment1Id, segment2Id]);

    // Verify status was set to 'pending' after reorder
    expect(finalStatus).toBe("pending");
  });

  it("should handle reordering multiple times", async () => {
    // Navigate to the pipeline page
    await page.goto(`http://localhost:4000/pipelines/${pipelineId}`, {
      waitUntil: "domcontentloaded"
    });

    // Wait for React Flow to render
    await page.waitForSelector(".react-flow", { timeout: 1000 });

    // Wait for all nodes to be rendered in React Flow (should be 4 nodes total)
    await page.waitForFunction(() => document.querySelectorAll(".react-flow__node").length === 4, { timeout: 1000 });

    // Add a small delay to ensure everything is hydrated
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Click on merge-videos node to select it
    await page.click(`[data-id="${mergeNodeId}"]`);

    // Wait a moment for the RHS panel to update
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Wait for segment items to be rendered (should be 3 segments)
    await page.waitForFunction(() => document.querySelectorAll(".flex.items-center.gap-3.bg-gray-50").length === 3, {
      timeout: 1000
    });

    // ========================================================================
    // FIRST REORDER: Move segment 2 to position 1
    // ========================================================================

    let segmentItems = await page.$$(".flex.items-center.gap-3.bg-gray-50");

    const firstReorderSource = await segmentItems[1].boundingBox();
    const firstReorderTarget = await segmentItems[0].boundingBox();

    if (!firstReorderSource || !firstReorderTarget) {
      throw new Error("Could not get segment bounding boxes for first reorder");
    }

    // Drag segment 2 to position 1
    await page.mouse.move(
      firstReorderSource.x + firstReorderSource.width / 2,
      firstReorderSource.y + firstReorderSource.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(
      firstReorderTarget.x + firstReorderTarget.width / 2,
      firstReorderTarget.y + firstReorderTarget.height / 2,
      { steps: 10 }
    );
    await page.mouse.up();

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify first reorder in database
    const pool = getPool();
    let dbState = await pool.query("SELECT inputs FROM nodes WHERE pipeline_id = $1 AND id = $2", [
      pipelineId,
      mergeNodeId
    ]);
    expect(dbState.rows[0].inputs.segments).toEqual([segment2Id, segment1Id, segment3Id]);

    // ========================================================================
    // SECOND REORDER: Move segment 3 to position 1
    // ========================================================================

    segmentItems = await page.$$(".flex.items-center.gap-3.bg-gray-50");

    const secondReorderSource = await segmentItems[2].boundingBox();
    const secondReorderTarget = await segmentItems[0].boundingBox();

    if (!secondReorderSource || !secondReorderTarget) {
      throw new Error("Could not get segment bounding boxes for second reorder");
    }

    // Drag segment 3 to position 1
    await page.mouse.move(
      secondReorderSource.x + secondReorderSource.width / 2,
      secondReorderSource.y + secondReorderSource.height / 2
    );
    await page.mouse.down();
    await page.mouse.move(
      secondReorderTarget.x + secondReorderTarget.width / 2,
      secondReorderTarget.y + secondReorderTarget.height / 2,
      { steps: 10 }
    );
    await page.mouse.up();

    await new Promise((resolve) => setTimeout(resolve, 500));

    // Verify final order in database
    dbState = await pool.query("SELECT inputs FROM nodes WHERE pipeline_id = $1 AND id = $2", [
      pipelineId,
      mergeNodeId
    ]);
    expect(dbState.rows[0].inputs.segments).toEqual([segment3Id, segment2Id, segment1Id]);
  });
});
