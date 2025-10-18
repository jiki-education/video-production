/**
 * Sanity Test
 *
 * Basic test to verify the test runner is working correctly.
 */

import { describe, it, expect } from "vitest";

describe("Sanity Check", () => {
  it("should pass", () => {
    expect(true).toBe(true);
  });

  it("should perform basic arithmetic", () => {
    expect(1 + 1).toBe(2);
  });
});
