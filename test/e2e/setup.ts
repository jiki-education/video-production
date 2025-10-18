/**
 * E2E Test Setup (Jest + Puppeteer)
 *
 * Intercepts API calls in the browser to return mock responses.
 * This allows E2E tests to run without a real Rails API backend.
 */

// Mock API responses by intercepting fetch calls in browser
export async function setupApiMocks() {
  await page.evaluateOnNewDocument(() => {
    const originalFetch = window.fetch;

    window.fetch = async (url: RequestInfo | URL, init?: RequestInit) => {
      const urlString = url.toString();

      // Mock DELETE /nodes/:uuid
      if (init?.method === "DELETE" && urlString.includes("/nodes/")) {
        return new Response(null, { status: 204 });
      }

      // Mock PATCH /nodes/:uuid (for reorderNodeInputs and connectNodes)
      if (init?.method === "PATCH" && urlString.includes("/nodes/")) {
        // Extract node UUID from URL
        const matches = urlString.match(/\/nodes\/([^?]+)/);
        const nodeUuid = matches?.[1];

        // Parse request body
        const body = init.body !== undefined && init.body !== null ? JSON.parse(init.body as string) : {};

        // Return updated node
        return new Response(
          JSON.stringify({
            node: {
              uuid: nodeUuid,
              ...body.node
            }
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      // Mock GET /nodes/:uuid (for connectNodes/reorderNodeInputs fetching current state)
      if (init?.method === "GET" && urlString.includes("/nodes/") && !urlString.endsWith("/nodes")) {
        // Extract node UUID from URL
        const matches = urlString.match(/\/nodes\/([^?]+)/);
        const nodeUuid = matches?.[1];

        // Return minimal node data
        return new Response(
          JSON.stringify({
            node: {
              uuid: nodeUuid,
              inputs: {}
            }
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" }
          }
        );
      }

      // Pass through all other requests to original fetch
      return originalFetch(url, init);
    };
  });
}

// Global setup - runs once before all tests
beforeAll(async () => {
  console.log("✓ E2E test environment initialized with API mocking");
});

// Global teardown - runs once after all tests
afterAll(async () => {
  console.log("✓ E2E tests completed");
});
