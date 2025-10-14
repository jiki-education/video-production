/**
 * Database Seeding Script
 *
 * Loads pipeline configurations from JSON files in lessons/ directory
 * and inserts them into the PostgreSQL database.
 *
 * Usage:
 *   pnpm db:seed              # Seed all lessons
 *   pnpm db:seed lesson-001   # Seed specific lesson
 */

import "dotenv/config";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { getPool, closePool } from "../lib/db";

interface PipelineJSON {
  id: string;
  title: string;
  version?: string;
  config: Record<string, unknown>;
  nodes: Array<{
    id: string;
    title: string;
    type: string;
    inputs?: Record<string, string | string[]>;
    config?: Record<string, unknown>;
    asset?: { source: string; type: string };
  }>;
}

async function seedPipeline(pipelineData: PipelineJSON) {
  const pool = getPool();

  console.log(`\n📦 Seeding pipeline: ${pipelineData.id}`);

  try {
    // Begin transaction
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Insert or update pipeline
      await client.query(
        `
        INSERT INTO pipelines (id, version, title, created_at, updated_at, config, metadata)
        VALUES ($1, $2, $3, NOW(), NOW(), $4, $5)
        ON CONFLICT (id) DO UPDATE
        SET
          version = EXCLUDED.version,
          title = EXCLUDED.title,
          updated_at = NOW(),
          config = EXCLUDED.config
      `,
        [
          pipelineData.id,
          pipelineData.version !== undefined && pipelineData.version !== "" ? pipelineData.version : "1.0",
          pipelineData.title,
          pipelineData.config,
          {
            totalCost: 0,
            estimatedTotalCost: 0,
            progress: {
              completed: 0,
              in_progress: 0,
              pending: pipelineData.nodes.length,
              failed: 0,
              total: pipelineData.nodes.length
            }
          }
        ]
      );

      console.log(`  ✓ Pipeline: ${pipelineData.title}`);

      // Delete existing nodes for this pipeline (clean slate)
      await client.query("DELETE FROM nodes WHERE pipeline_id = $1", [pipelineData.id]);

      // Insert nodes
      for (const node of pipelineData.nodes) {
        // Assets are immediately available, other nodes need execution
        const status = node.type === "asset" ? "completed" : "pending";

        await client.query(
          `
          INSERT INTO nodes (id, pipeline_id, title, type, inputs, config, asset, status, metadata, output)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `,
          [
            node.id,
            pipelineData.id,
            node.title,
            node.type,
            node.inputs || {},
            node.config || {},
            node.asset || null,
            status,
            null,
            null
          ]
        );
      }

      console.log(`  ✓ Nodes: ${pipelineData.nodes.length}`);

      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`  ✗ Failed to seed ${pipelineData.id}:`, error);
    throw error;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const specificLesson = args[0];

  console.log("🌱 Seeding database from lessons/\n");

  try {
    const lessonsDir = join(process.cwd(), "lessons");

    // Get all lesson directories
    let lessons: string[];
    if (specificLesson) {
      lessons = [specificLesson];
      console.log(`Seeding specific lesson: ${specificLesson}\n`);
    } else {
      const entries = await readdir(lessonsDir, { withFileTypes: true });
      lessons = entries
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .filter((name): name is string => name !== undefined);
      console.log(`Found ${lessons.length} lessons\n`);
    }

    let seeded = 0;
    let failed = 0;

    for (const lesson of lessons) {
      const pipelineFile = join(lessonsDir, lesson, "pipeline.json");

      try {
        const fileContent = await readFile(pipelineFile, "utf-8");
        const pipelineData: PipelineJSON = JSON.parse(fileContent);

        await seedPipeline(pipelineData);
        seeded++;
      } catch (error) {
        failed++;
        if ((error as NodeJS.ErrnoException).code === "ENOENT") {
          console.log(`\n⊘ Skipping ${lesson}: no pipeline.json found`);
        } else {
          console.error(`\n✗ Error seeding ${lesson}:`, error);
        }
      }
    }

    console.log(`\n${"=".repeat(50)}`);
    console.log(`✓ Seeding complete!`);
    console.log(`  Seeded: ${seeded}`);
    if (failed > 0) {
      console.log(`  Failed: ${failed}`);
    }
    console.log(`${"=".repeat(50)}\n`);

    await closePool();
  } catch (error) {
    console.error("\n✗ Seeding failed:", error);
    process.exit(1);
  }
}

void main();
