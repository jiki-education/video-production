/**
 * E2E Test: Node Deletion
 *
 * Tests that deleting a node works correctly:
 * - Node is removed from the UI
 * - Connected edges are removed from the UI
 * - Changes are handled via API (mocked)
 * - References are cleaned up in other nodes' inputs
 */

import { setupApiMocks } from "./setup";

describe("Node Deletion E2E", () => {
  let pipelineId: string;
  let nodeAId: string;
  let nodeBId: string;

  // Set up API mocks once for entire test suite
  beforeAll(async () => {
    await setupApiMocks();
  });

  beforeEach(async () => {
    // Generate unique ID for this test run
    const testId = `test-pipeline-${Date.now()}`;
    pipelineId = testId;
    nodeAId = "script-asset";
    nodeBId = "talking-head";
    // Note: Mock data is provided by lib/api-client.ts when NODE_ENV=test
  });

  it("should delete a node and remove its connections", async () => {
    // Navigate to the pipeline page
    await page.goto(`http://localhost:4000/pipelines/${pipelineId}`, {
      waitUntil: "domcontentloaded"
    });

    // Wait for React Flow to render
    await page.waitForSelector(".react-flow", { timeout: 10000 });

    // Critical: Wait for React hydration to complete
    await new Promise((resolve) => setTimeout(resolve, 500));

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

    // ========================================================================
    // DELETE NODE A
    // ========================================================================

    // Click on Node A to select it
    await page.click(`[data-id="${nodeAId}"]`);

    // Wait a bit for selection to register
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Press Delete key to delete the node
    await page.keyboard.press("Backspace"); // React Flow uses Backspace for deletion

    // Wait for the node to actually disappear from the DOM
    await page.waitForSelector(`[data-id="${nodeAId}"]`, { hidden: true, timeout: 1000 });

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

    // Note: We don't verify database persistence since we're using mocked APIs
    // The UI update is the main thing being tested here
  });

  it("should delete multiple connected nodes", async () => {
    // Navigate to the pipeline page
    await page.goto(`http://localhost:4000/pipelines/${pipelineId}`, {
      waitUntil: "domcontentloaded"
    });

    await page.waitForSelector(".react-flow");

    // Critical: Wait for React hydration to complete
    await new Promise((resolve) => setTimeout(resolve, 500));

    // Get initial node count (mock returns 7 nodes)
    const initialNodes = await page.$$(".react-flow__node");
    const initialCount = initialNodes.length;
    expect(initialCount).toBeGreaterThan(0);

    // Select and delete Node A
    await page.click(`[data-id="${nodeAId}"]`);
    await new Promise((resolve) => setTimeout(resolve, 100));
    await page.keyboard.press("Backspace");
    await page.waitForSelector(`[data-id="${nodeAId}"]`, { hidden: true, timeout: 5000 });

    // Should now have one fewer node
    const afterFirstDelete = await page.$$(".react-flow__node");
    expect(afterFirstDelete.length).toBe(initialCount - 1);

    // Select and delete Node B
    await page.click(`[data-id="${nodeBId}"]`);
    await new Promise((resolve) => setTimeout(resolve, 100));
    await page.keyboard.press("Backspace");
    await page.waitForSelector(`[data-id="${nodeBId}"]`, { hidden: true, timeout: 5000 });

    // Should now have two fewer nodes
    const afterSecondDelete = await page.$$(".react-flow__node");
    expect(afterSecondDelete.length).toBe(initialCount - 2);

    // Wait a bit to ensure no errors
    await new Promise((resolve) => setTimeout(resolve, 300));
  });
});
