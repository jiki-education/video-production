/**
 * E2E Test: Pipeline API Integration
 *
 * Tests that the pipeline page correctly fetches and displays data from the API client:
 * - Uses mock data from lib/api-client.ts when NODE_ENV=test
 * - Verifies nodes are rendered on the canvas
 * - Verifies node selection works
 */

describe("Pipeline API Integration E2E", () => {
  // Use test-pipeline prefix to trigger mock data in api-client.ts
  const pipelineUuid = "test-pipeline-integration";

  it("should fetch and display pipeline with nodes from API", async () => {
    // Navigate to the example pipeline page
    await page.goto(`http://localhost:4000/pipelines/${pipelineUuid}`, {
      waitUntil: "domcontentloaded"
    });

    // Wait for React Flow to render
    await page.waitForSelector(".react-flow", { timeout: 5000 });

    // Add small delay to ensure React hydration completes
    await new Promise((resolve) => setTimeout(resolve, 500));

    // ========================================================================
    // VERIFY PIPELINE TITLE IS DISPLAYED
    // ========================================================================

    // Check that the pipeline title is displayed in the header
    const headerText = await page.$eval("header h1", (el) => el.textContent);
    expect(headerText).toContain(pipelineUuid);

    // ========================================================================
    // VERIFY NODES ARE RENDERED
    // ========================================================================

    // Wait for nodes to be rendered on the canvas
    // Mock data has 7 nodes: segment-1, segment-2, segment-3, merge-videos, script-asset, talking-head, render-code
    await page.waitForFunction(
      () => {
        const nodes = document.querySelectorAll("[data-id]");
        return nodes.length >= 5; // At least 5 nodes should be visible
      },
      { timeout: 5000 }
    );

    // Count total nodes rendered
    const nodeCount = await page.$$eval("[data-id]", (nodes) => nodes.length);
    console.log(`Found ${nodeCount} nodes on canvas`);
    expect(nodeCount).toBeGreaterThanOrEqual(5);

    // ========================================================================
    // VERIFY SPECIFIC NODES EXIST
    // ========================================================================

    // Check that the merge-videos node exists (from mock data)
    const mergeNodeExists = await page.$('[data-id="merge-videos"]');
    expect(mergeNodeExists).toBeTruthy();

    // Check that some asset nodes exist (from mock data)
    const scriptAssetExists = await page.$('[data-id="script-asset"]');
    expect(scriptAssetExists).toBeTruthy();

    // ========================================================================
    // VERIFY NODE SELECTION WORKS
    // ========================================================================

    // Click on the merge-videos node (from mock data)
    await page.click('[data-id="merge-videos"]');

    // Wait for the RHS editor panel to show node details
    await page.waitForSelector(".w-96.bg-white.border-l", { timeout: 3000 });

    // Verify the node UUID is displayed in the RHS panel
    const nodeUuidText = await page.$eval(".font-mono.font-semibold", (el) => el.textContent);
    expect(nodeUuidText).toBe("merge-videos");

    // Verify some node details are displayed (type shown in header)
    const nodeDetails = await page.$$eval(".text-xs.text-gray-600", (els) => els.map((el) => el.textContent));
    expect(nodeDetails.length).toBeGreaterThan(0);

    // ========================================================================
    // VERIFY MERGE-VIDEOS NODE HAS SEGMENTS
    // ========================================================================

    // The mock merge-videos node has 3 segments: segment-1, segment-2, segment-3
    await page.waitForFunction(() => document.querySelectorAll(".flex.items-center.gap-3.bg-gray-50").length === 3, {
      timeout: 3000
    });

    const segmentCount = await page.$$eval(".flex.items-center.gap-3.bg-gray-50", (segs) => segs.length);
    expect(segmentCount).toBe(3);

    // Verify segment numbers show correct positions (1, 2, 3)
    const segmentNumbers = await page.$$eval(".bg-blue-100.text-blue-700", (els) =>
      els.map((el) => el.textContent?.trim())
    );
    expect(segmentNumbers).toEqual(["1", "2", "3"]);
  });

  it("should handle pipeline with no nodes gracefully", async () => {
    // This test verifies that an empty pipeline doesn't crash the app
    // For pipelines that don't match "test-pipeline", mock returns empty nodes array
    const emptyPipelineId = "empty-pipeline-test";

    await page.goto(`http://localhost:4000/pipelines/${emptyPipelineId}`, {
      waitUntil: "domcontentloaded"
    });

    // Wait for React Flow to render
    await page.waitForSelector(".react-flow", { timeout: 5000 });

    // Should render successfully with no nodes
    const nodeCount = await page.$$eval("[data-id]", (nodes) => nodes.length);
    expect(nodeCount).toBe(0);

    // Verify the canvas is rendered but empty
    const canvasExists = await page.$(".react-flow");
    expect(canvasExists).toBeTruthy();
  });
});
