/**
 * Test Database Helper
 *
 * Provides database access for tests with automatic transaction rollback.
 * Uses pg-transactional-tests to wrap each test in a transaction.
 *
 * Usage in tests:
 *   import { testTransaction } from 'pg-transactional-tests';
 *   import { getTestPool } from '@/test/helpers/db';
 *
 *   beforeEach(testTransaction.start);
 *   afterEach(testTransaction.rollback);
 *
 *   it('creates a node', async () => {
 *     const pool = getTestPool();
 *     await pool.query('INSERT INTO nodes ...');
 *     // Automatically rolled back after test
 *   });
 */

import { Pool } from "pg";
import { testTransaction } from "pg-transactional-tests";

let testPool: Pool | null = null;

/**
 * Gets the test database connection pool
 *
 * Reads from TEST_DATABASE_URL environment variable.
 * Falls back to a default test database if not set.
 *
 * @returns PostgreSQL connection pool for tests
 */
export function getTestPool(): Pool {
  if (testPool === null || testPool === undefined) {
    const databaseUrl = process.env.TEST_DATABASE_URL ?? "postgresql://localhost:5432/jiki_video_pipelines_test";

    testPool = new Pool({
      connectionString: databaseUrl,
      // Test pool configuration
      max: 10, // Maximum pool size (enough for parallel tests)
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    });
  }

  return testPool;
}

/**
 * Closes the test database pool
 *
 * Should be called in globalTeardown or afterAll hooks
 */
export async function closeTestPool(): Promise<void> {
  if (testPool !== null && testPool !== undefined) {
    await testPool.end();
    testPool = null;
  }
}

/**
 * Helper to execute a query on the test database
 *
 * Uses a client from the pool (required for pg-transactional-tests)
 *
 * @param sql - SQL query string
 * @param params - Query parameters
 * @returns Query result
 */
export async function query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]> {
  const pool = getTestPool();
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

/**
 * Helper to create a test pipeline (for foreign key requirements)
 *
 * @param id - Pipeline ID (defaults to 'test-pipeline')
 * @returns Created pipeline ID
 */
export async function createTestPipeline(id: string = "test-pipeline"): Promise<string> {
  await query(`INSERT INTO pipelines (id, title, config, metadata) VALUES ($1, $2, $3, $4)`, [
    id,
    "Test Pipeline",
    {},
    {
      totalCost: 0,
      estimatedTotalCost: 0,
      progress: { completed: 0, in_progress: 0, pending: 0, failed: 0, total: 0 }
    }
  ]);
  return id;
}

/**
 * Re-export testTransaction for convenience
 *
 * Usage:
 *   import { testTransaction } from '@/test/helpers/db';
 *   beforeEach(testTransaction.start);
 *   afterEach(testTransaction.rollback);
 */
export { testTransaction };
