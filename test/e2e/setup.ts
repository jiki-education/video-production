/**
 * E2E Test Setup (Jest)
 *
 * Sets up database connection and migrations for E2E tests.
 * Each test runs in a transaction that is rolled back after completion.
 */

import { getTestPool, closeTestPool } from "@/test/helpers/db";
import { createSchema } from "@/lib/db-migrations";

// Global setup - runs once before all tests
beforeAll(async () => {
  // Get test pool to initialize connection
  const pool = getTestPool();

  // Run database migrations
  await createSchema(pool);
});

// NOTE: E2E tests do NOT use transactions because the Next.js server
// runs in a separate process and can't see uncommitted transaction data.
// Instead, we use unique IDs per test and clean up after each test.

// Global teardown - runs once after all tests
afterAll(async () => {
  // Close database connections
  await closeTestPool();
});
