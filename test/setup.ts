/**
 * Global Vitest Setup
 *
 * This file runs once before all tests.
 * It sets up the test database connection and runs migrations.
 */

import { beforeAll, afterAll } from "vitest";
import { getTestPool, closeTestPool, testTransaction } from "./helpers/db";
import { createSchema } from "@/lib/db-migrations";
import dotenv from "dotenv";

// Load test environment variables
dotenv.config({ path: ".env.test" });

beforeAll(async () => {
  // Initialize pg-transactional-tests BEFORE any database connection
  testTransaction.start();

  // Get test pool to initialize connection
  const pool = getTestPool();

  // Run database migrations
  await createSchema(pool);

  console.log("✓ Test database initialized");
});

afterAll(async () => {
  // Close transactional test connections
  await testTransaction.close();

  // Close database connections
  await closeTestPool();
  console.log("✓ Test database connections closed");
});
