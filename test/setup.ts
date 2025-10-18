/**
 * Global Vitest Setup
 *
 * This file runs once before all tests.
 * Tests now use mocked API responses instead of database.
 */

import { beforeAll, afterAll } from "vitest";

beforeAll(async () => {
  console.log("✓ Test environment initialized");
});

afterAll(async () => {
  console.log("✓ Tests completed");
});
