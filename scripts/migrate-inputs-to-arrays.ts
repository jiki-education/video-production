/**
 * Database Migration: Convert Node Inputs to Arrays
 *
 * Migrates all node input values from single strings to arrays.
 * This enables consistent handling of inputs with connection limits.
 *
 * Before: { config: "node-id" }
 * After:  { config: ["node-id"] }
 *
 * Run: pnpm db:migrate-inputs
 */

import "dotenv/config";
import { getPool } from "../lib/db";

async function migrateInputsToArrays() {
  const pool = getPool();

  console.log("🔄 Starting migration: Converting node inputs to arrays...");

  try {
    // Start transaction
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Get all nodes with inputs
      const result = await client.query(`
        SELECT id, pipeline_id, inputs
        FROM nodes
        WHERE jsonb_typeof(inputs) = 'object'
      `);

      console.log(`📊 Found ${result.rows.length} nodes to check`);

      let migratedCount = 0;

      // Process each node
      for (const row of result.rows) {
        const nodeId = row.id;
        const pipelineId = row.pipeline_id;
        const inputs = row.inputs;

        let needsMigration = false;
        const migratedInputs: Record<string, unknown> = {};

        // Check each input
        for (const [key, value] of Object.entries(inputs)) {
          if (typeof value === "string") {
            // Convert string to array
            migratedInputs[key] = [value];
            needsMigration = true;
          } else {
            // Keep as-is (already array or other type)
            migratedInputs[key] = value;
          }
        }

        // Update node if needed
        if (needsMigration) {
          await client.query(
            `
            UPDATE nodes
            SET inputs = $1
            WHERE pipeline_id = $2 AND id = $3
          `,
            [migratedInputs, pipelineId, nodeId]
          );

          migratedCount++;
          console.log(`  ✅ Migrated: ${pipelineId}/${nodeId}`);
        }
      }

      await client.query("COMMIT");

      console.log(`\n✅ Migration complete!`);
      console.log(`   Total nodes checked: ${result.rows.length}`);
      console.log(`   Nodes migrated: ${migratedCount}`);
      console.log(`   No changes needed: ${result.rows.length - migratedCount}`);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run migration
void migrateInputsToArrays();
